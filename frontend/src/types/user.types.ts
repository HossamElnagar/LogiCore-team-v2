export const UserRole = {
  OWNER: "OWNER",
  FINANCE_MANAGER: "FINANCE_MANAGER",
  ACCOUNTANT: "ACCOUNTANT",
  CS_MANAGER: "CS_MANAGER",
  CS_AGENT: "CS_AGENT",
  DRIVER_MANAGER: "DRIVER_MANAGER",
  DRIVER: "DRIVER",
} as const;

export type UserRole = typeof UserRole[keyof typeof UserRole];

export const CANONICAL_ROLES: UserRole[] = [
  UserRole.OWNER,
  UserRole.FINANCE_MANAGER,
  UserRole.ACCOUNTANT,
  UserRole.CS_MANAGER,
  UserRole.CS_AGENT,
  UserRole.DRIVER_MANAGER,
  UserRole.DRIVER,
];
