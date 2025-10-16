// Prisma client type extensions
import type { 
  PrismaClient, 
  Employee, 
  User, 
  AuditLog, 
  Document, 
  Attendance, 
  Leave, 
  Payroll,
  Role 
} from "@prisma/client";

// Export commonly used types
export type {
  Employee,
  User,
  AuditLog,
  Document,
  Attendance,
  Leave,
  Payroll,
  Role,
  PrismaClient
};

// Employee with relations
export type EmployeeWithRelations = Employee & {
  AuditLog: AuditLog[];
  Document: Document[];
  attendance?: Attendance[];
  leaves?: Leave[];
  payrolls?: Payroll[];
};

// User creation input
export interface UserCreateInput {
  email: string;
  password: string;
  name?: string | null;
  role?: Role;
}

// Employee creation input
export interface EmployeeCreateInput {
  firstName: string;
  lastName: string;
  email: string;
  jobTitle: string;
  department: string;
  status?: string;
  joinDate?: Date;
  phone?: string | null;
  location?: string | null;
  performanceRating?: number | null;
  skills?: string[];
  certifications?: string[];
  leaveBalance?: number | null;
  salary?: number | null;
  projects?: string[];
  feedback?: string | null;
}
