import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { employeeId } = body;

    // Step 1: Nexora DB se employees fetch karo
    const employees = await prisma.employee.findMany({
      where: employeeId ? { id: employeeId, status: 'Active' } : { status: 'Active' },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        salary: true,
        jobTitle: true,
        department: true,
        joinDate: true,
      }
    });

    console.log(`✅ Found ${employees.length} employee(s) in database${employeeId ? ` (ID: ${employeeId})` : ''}`);

    if (employees.length === 0) {
      return NextResponse.json({
        success: false,
        error: 'No active employees found in database',
        predictions: []
      });
    }

    // Step 2: Performance data fetch karo from PerformanceReview table
    const performanceData = await prisma.performanceReview.findMany({
      where: {
        employeeId: { in: employees.map(e => e.id) },
        status: 'FINALIZED',
        managerRating: { not: null }
      },
      select: {
        employeeId: true,
        managerRating: true,
        createdAt: true
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    // Employee ID ke basis pe performance ratings group karo
    const performanceMap = new Map<number, number>();
    for (const emp of employees) {
      const empReviews = performanceData
        .filter(p => p.employeeId === emp.id)
        .slice(0, 3); // Last 3 reviews
      
      if (empReviews.length > 0) {
        const avgRating = empReviews.reduce((sum, r) => sum + (r.managerRating || 0), 0) / empReviews.length;
        performanceMap.set(emp.id, avgRating);
        console.log(`👤 ${emp.firstName} ${emp.lastName}: Avg rating from ${empReviews.length} reviews = ${avgRating.toFixed(2)}`);
      } else {
        // Fallback: Legacy Performance table check karo
        const legacyPerf = await prisma.performance.findMany({
          where: { employeeId: emp.id },
          orderBy: { createdAt: 'desc' },
          take: 3,
          select: { score: true }
        });
        
        if (legacyPerf.length > 0) {
          const avgScore = legacyPerf.reduce((sum, p) => sum + p.score, 0) / legacyPerf.length;
          const rating = (avgScore / 100) * 5; // Convert 0-100 to 0-5 scale
          performanceMap.set(emp.id, rating);
          console.log(`👤 ${emp.firstName} ${emp.lastName}: Avg rating from legacy ${legacyPerf.length} records = ${rating.toFixed(2)}`);
        } else {
          performanceMap.set(emp.id, 3); // Default neutral rating
          console.log(`👤 ${emp.firstName} ${emp.lastName}: No performance data, using default rating 3.0`);
        }
      }
    }

    console.log(`✅ Performance ratings calculated for ${performanceMap.size} employees`);

    // Step 3: Flask API format mein convert karo (4 fields only)
    const employeeData = employees.map(emp => {
      // Calculate years at company
      const yearsAtCompany = Math.floor(
        (Date.now() - new Date(emp.joinDate || Date.now()).getTime()) / (1000 * 60 * 60 * 24 * 365)
      );

      return {
        employee_id: emp.id.toString(),
        employee_name: `${emp.firstName} ${emp.lastName}`,
        salary: emp.salary || 50000,
        performanceRating: performanceMap.get(emp.id) || 3,
        department: emp.department,
        jobTitle: emp.jobTitle,
      };
    });

    // Step 3: Flask Attrition API ko call karo
    console.log('📤 Sending data to Flask API:', employeeData);
    
    const flaskResponse = await fetch('http://192.168.100.67:5000/api/predict-attrition-batch', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ employees: employeeData })
    });

    console.log('📥 Flask Response Status:', flaskResponse.status);

    if (!flaskResponse.ok) {
      const errorText = await flaskResponse.text();
      console.error('❌ Flask API Error:', errorText);
      throw new Error(`Flask API failed: ${errorText}`);
    }

    const predictions = await flaskResponse.json();
    console.log('✅ Predictions received:', JSON.stringify(predictions, null, 2));

    // Extract predictions array from Flask response
    const predictionsList = predictions.predictions || [];

    // Step 4: Response return karo with predictions array
    return NextResponse.json({
      success: true,
      totalEmployees: employees.length,
      predictions: predictionsList
    });

  } catch (error: any) {
    console.error('Attrition Prediction Error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to predict attrition' },
      { status: 500 }
    );
  }
}
