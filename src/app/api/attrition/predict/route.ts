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

    // Department mapping function - Flask API specific departments
    const mapDepartment = (dept: string): string => {
      const deptLower = (dept || '').toLowerCase();
      
      // Map to Research & Development
      if (deptLower.includes('developer') || deptLower.includes('dev') || 
          deptLower.includes('engineer') || deptLower.includes('it') || 
          deptLower.includes('tech') || deptLower.includes('research')) {
        return 'Research & Development';
      }
      
      // Map to Sales
      if (deptLower.includes('sales') || deptLower.includes('marketing') || 
          deptLower.includes('business')) {
        return 'Sales';
      }
      
      // Map to Human Resources
      if (deptLower.includes('hr') || deptLower.includes('human') || 
          deptLower.includes('admin') || deptLower.includes('operations')) {
        return 'Human Resources';
      }
      
      // Default fallback
      return 'Research & Development';
    };

    // Job title mapping - Flask API supported titles:
    // 'Healthcare Representative', 'Human Resources', 'Laboratory Technician',
    // 'Manager', 'Manufacturing Director', 'Research Director', 
    // 'Research Scientist', 'Sales Executive', 'Sales Representative'
    const mapJobTitle = (title: string, department: string): string => {
      const titleLower = (title || '').toLowerCase();
      
      // Manager/Director level
      if (titleLower.includes('director') || titleLower.includes('head') || titleLower.includes('chief') || titleLower.includes('vp')) {
        if (department === 'Sales') return 'Manufacturing Director';
        if (department === 'Human Resources') return 'Manufacturing Director';
        return 'Research Director';
      }
      if (titleLower.includes('manager') || titleLower.includes('lead') || titleLower.includes('supervisor')) {
        return 'Manager';
      }
      
      // Senior/Developer/Engineer → Research Scientist
      if (titleLower.includes('senior') || titleLower.includes('developer') || 
          titleLower.includes('engineer') || titleLower.includes('architect') ||
          titleLower.includes('scientist')) {
        return 'Research Scientist';
      }
      
      // Junior/Intern/Technician
      if (titleLower.includes('junior') || titleLower.includes('intern') || 
          titleLower.includes('trainee') || titleLower.includes('technician') ||
          titleLower.includes('lab')) {
        return 'Laboratory Technician';
      }
      
      // Sales roles
      if (titleLower.includes('sales') || titleLower.includes('account')) {
        if (titleLower.includes('rep')) return 'Sales Representative';
        return 'Sales Executive';
      }
      
      // HR roles
      if (titleLower.includes('hr') || titleLower.includes('human') || titleLower.includes('recruit')) {
        return 'Human Resources';
      }
      
      // Healthcare
      if (titleLower.includes('health') || titleLower.includes('medical') || titleLower.includes('nurse')) {
        return 'Healthcare Representative';
      }
      
      // Default based on mapped department
      if (department === 'Sales') return 'Sales Executive';
      if (department === 'Human Resources') return 'Human Resources';
      return 'Research Scientist';
    };

    // Step 3: Flask API format mein convert karo (4 fields only)
    const employeeData = employees.map(emp => {
      // Calculate years at company
      const yearsAtCompany = Math.floor(
        (Date.now() - new Date(emp.joinDate || Date.now()).getTime()) / (1000 * 60 * 60 * 24 * 365)
      );

      const mappedDept = mapDepartment(emp.department);
      return {
        employee_id: emp.id.toString(),
        employee_name: `${emp.firstName} ${emp.lastName}`,
        salary: emp.salary || 50000,
        performanceRating: performanceMap.get(emp.id) || 3,
        department: mappedDept,
        jobTitle: mapJobTitle(emp.jobTitle, mappedDept),
      };
    });

    // Step 3: Flask Attrition API ko call karo
    console.log('📤 Sending data to Flask API:', employeeData);
    
    const attritionApiUrl = process.env.ATTRITION_API_URL;
    if (!attritionApiUrl) {
      throw new Error('ATTRITION_API_URL environment variable is not set');
    }
    const flaskResponse = await fetch(`${attritionApiUrl}/api/predict-attrition-batch`, {
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
