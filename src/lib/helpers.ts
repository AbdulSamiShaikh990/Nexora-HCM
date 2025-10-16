import { UserRole } from "@/types/auth";

/**
 * Get the appropriate dashboard URL based on user role
 */
export const getDashboardUrl = (role: UserRole): string => {
  switch (role) {
    case "admin":
      return "/admin/dashboard";
    case "employee":
      return "/employee/dashboard";
    default:
      return "/";
  }
};

/**
 * Check if user has required role for accessing a route
 */
export const hasRequiredRole = (userRole: UserRole, requiredRole: UserRole): boolean => {
  if (!requiredRole) return true; // No role required
  return userRole === requiredRole;
};

/**
 * Get user role display name
 */
export const getRoleDisplayName = (role: UserRole): string => {
  switch (role) {
    case "admin":
      return "Administrator";
    case "employee":
      return "Employee";
    default:
      return "User";
  }
};