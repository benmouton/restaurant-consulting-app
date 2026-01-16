import { useAuth } from "@/hooks/use-auth";
import { USER_ROLES, type UserRole } from "@shared/models/auth";

export const ROLE_HIERARCHY: Record<UserRole, number> = {
  [USER_ROLES.OWNER]: 3,
  [USER_ROLES.GENERAL_MANAGER]: 2,
  [USER_ROLES.MANAGER]: 1,
};

export const ROLE_LABELS: Record<UserRole, string> = {
  [USER_ROLES.OWNER]: "Owner",
  [USER_ROLES.GENERAL_MANAGER]: "General Manager",
  [USER_ROLES.MANAGER]: "Manager",
};

export interface RolePermissions {
  canAccessFinancials: boolean;
  canAccessStrategicPlanning: boolean;
  canAccessTraining: boolean;
  canAccessOperations: boolean;
  canAccessAIConsulting: boolean;
  canManageStaff: boolean;
  canViewPnL: boolean;
  canSendToStaff: boolean;
}

function getPermissionsForRole(role: UserRole): RolePermissions {
  switch (role) {
    case USER_ROLES.OWNER:
      return {
        canAccessFinancials: true,
        canAccessStrategicPlanning: true,
        canAccessTraining: true,
        canAccessOperations: true,
        canAccessAIConsulting: true,
        canManageStaff: true,
        canViewPnL: true,
        canSendToStaff: true,
      };
    case USER_ROLES.GENERAL_MANAGER:
      return {
        canAccessFinancials: false,
        canAccessStrategicPlanning: false,
        canAccessTraining: true,
        canAccessOperations: true,
        canAccessAIConsulting: true,
        canManageStaff: true,
        canViewPnL: false,
        canSendToStaff: true,
      };
    case USER_ROLES.MANAGER:
      return {
        canAccessFinancials: false,
        canAccessStrategicPlanning: false,
        canAccessTraining: true,
        canAccessOperations: true,
        canAccessAIConsulting: true,
        canManageStaff: false,
        canViewPnL: false,
        canSendToStaff: false,
      };
    default:
      return {
        canAccessFinancials: false,
        canAccessStrategicPlanning: false,
        canAccessTraining: false,
        canAccessOperations: false,
        canAccessAIConsulting: false,
        canManageStaff: false,
        canViewPnL: false,
        canSendToStaff: false,
      };
  }
}

export function useRole() {
  const { user, isLoading } = useAuth();
  
  // Security: Default to lowest privilege (MANAGER) when role is missing
  // This prevents privilege escalation if role is null/undefined
  const role = (user?.role as UserRole) || USER_ROLES.MANAGER;
  const roleLabel = ROLE_LABELS[role] || "Manager";
  const permissions = getPermissionsForRole(role);
  
  const hasRoleOrHigher = (requiredRole: UserRole): boolean => {
    if (!user) return false;
    return ROLE_HIERARCHY[role] >= ROLE_HIERARCHY[requiredRole];
  };

  const isOwner = role === USER_ROLES.OWNER;
  const isGeneralManager = role === USER_ROLES.GENERAL_MANAGER;
  const isManager = role === USER_ROLES.MANAGER;

  return {
    role,
    roleLabel,
    isLoading,
    permissions,
    hasRoleOrHigher,
    isOwner,
    isGeneralManager,
    isManager,
  };
}
