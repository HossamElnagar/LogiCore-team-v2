/**
 * user.type.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * Canonical user-role and auth-provider enumerations for the LogiCore platform.
 *
 * ## Role Architecture (PLAN.md v1.4)
 *
 * ACTIVE ROLES (use these for all new code):
 *  - OWNER           — Company executive. Sees the escalation hub (escalatedByManager=true only).
 *  - CS_MANAGER      — Global incident queue monitor. Has exclusive "Escalate to Owner" action.
 *  - CS_AGENT        — Live representative. Manages incident decision rooms with dynamic participant injection.
 *  - FINANCE_MANAGER — Approves and oversees EOD settlement.
 *  - ACCOUNTANT      — Day-to-day bulk-ingest and Daily Cash Settlement Grid operator.
 *  - DRIVER_MANAGER  — Fleet Profile Explorer; owns DIRECT/GROUP dispatch channels with drivers.
 *  - DRIVER          — Delivery tasklist; creates ground-ingress incidents with photo + geo-fence.
 * ─────────────────────────────────────────────────────────────────────────────
 */

// ── Active Roles ──────────────────────────────────────────────────────────────
export enum UserRole {
  OWNER = "OWNER",
  FINANCE_MANAGER = "FINANCE_MANAGER",
  ACCOUNTANT = "ACCOUNTANT",
  CS_MANAGER = "CS_MANAGER",
  CS_AGENT = "CS_AGENT",
  DRIVER_MANAGER = "DRIVER_MANAGER",
  DRIVER = "DRIVER",
}

export const SUPER_ROLES: ReadonlySet<UserRole> = new Set([
  UserRole.OWNER,
]);

export const INCIDENT_MANAGER_ROLES: ReadonlySet<UserRole> = new Set([
  UserRole.OWNER,
  UserRole.CS_MANAGER,
  UserRole.CS_AGENT,
  UserRole.DRIVER_MANAGER,
]);

export const FINANCE_ROLES: ReadonlySet<UserRole> = new Set([
  UserRole.OWNER,
  UserRole.ACCOUNTANT,
  UserRole.FINANCE_MANAGER,
]);

export const GROUND_ROLES: ReadonlySet<UserRole> = new Set([
  UserRole.DRIVER,
]);

export enum AuthProvider {
  LOCAL = "LOCAL",
  GOOGLE = "GOOGLE",
}