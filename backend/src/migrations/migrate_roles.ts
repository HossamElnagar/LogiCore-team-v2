/**
 * migrate_roles.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * One-shot data migration script: renames legacy UserRole values in the
 * `users` MongoDB collection to their plan.md v1.4 canonical equivalents.
 *
 * ## Role Mapping (per architecture decision #1 & #2)
 *
 *  OPERATIONS_MANAGER  →  CS_MANAGER
 *  CUSTOMER_SUPPORT    →  CS_MANAGER
 *  OPERATIONS_AGENT    →  CS_AGENT
 *  WAREHOUSE_MANAGER   →  DRIVER_MANAGER
 *  FLEET_MANAGER       →  DRIVER_MANAGER
 *  FINANCE_AGENT       →  ACCOUNTANT
 *  RIDER               →  DRIVER            (decision #2)
 *
 * ## Safety guarantees
 *  - Idempotent: re-running produces 0 additional changes if already applied.
 *  - Non-destructive: uses `updateMany` with targeted `$in` filters; only the
 *    `role` field is touched. All other user fields remain untouched.
 *  - Dry-run mode: set `DRY_RUN=true` env var to preview counts without writing.
 *  - Rollback: a reverse migration map is provided as a comment below.
 *
 * ## Prerequisites
 *  - Requires `MONGO_URI` environment variable (same as the main application).
 *  - Run from the backend directory:
 *      npx tsx src/migrations/migrate_roles.ts
 *    Or with dotenv:
 *      npx tsx --env-file=../.env src/migrations/migrate_roles.ts
 *
 * ## Post-run checklist
 *  1. Verify the "remaining documents" count printed for each legacy role is 0.
 *  2. Force-invalidate all active JWT sessions (bump tokenVersion or set
 *     short-lived token expiry) so users re-authenticate with new role claims.
 *  3. Remove the deprecated enum entries from `user.type.ts`.
 *  4. Update any route guards still referencing legacy role strings (see PR-11).
 * ─────────────────────────────────────────────────────────────────────────────
 */

import mongoose from "mongoose";
import process from "node:process";

// ── Types ─────────────────────────────────────────────────────────────────────

interface MigrationRule {
  /** Human-readable label for console output */
  label: string;
  /** Legacy role values to match (the $in filter values) */
  from: string[];
  /** Canonical target role value */
  to: string;
}

interface MigrationResult {
  label: string;
  from: string[];
  to: string;
  matchedCount: number;
  modifiedCount: number;
  remainingCount: number;
  skippedDryRun: boolean;
}

// ── Migration Rules ───────────────────────────────────────────────────────────
//
// Order does not matter — each rule targets a disjoint set of `from` values.
// Multiple legacy roles can map to the same canonical target.

const MIGRATION_RULES: MigrationRule[] = [
  {
    label: "OPERATIONS_MANAGER + CUSTOMER_SUPPORT → CS_MANAGER",
    from: ["OPERATIONS_MANAGER", "CUSTOMER_SUPPORT"],
    to: "CS_MANAGER",
  },
  {
    label: "OPERATIONS_AGENT → CS_AGENT",
    from: ["OPERATIONS_AGENT"],
    to: "CS_AGENT",
  },
  {
    label: "WAREHOUSE_MANAGER + FLEET_MANAGER → DRIVER_MANAGER",
    from: ["WAREHOUSE_MANAGER", "FLEET_MANAGER"],
    to: "DRIVER_MANAGER",
  },
  {
    label: "FINANCE_AGENT → ACCOUNTANT",
    from: ["FINANCE_AGENT"],
    to: "ACCOUNTANT",
  },
  {
    label: "RIDER → DRIVER",
    from: ["RIDER"],
    to: "DRIVER",
  },
];

// ── Helpers ───────────────────────────────────────────────────────────────────

function separator(char = "─", length = 72): string {
  return char.repeat(length);
}

function formatTable(results: MigrationResult[]): string {
  const header =
    `${"Rule".padEnd(52)} ${"Matched".padStart(8)} ${"Modified".padStart(9)} ${"Remaining".padStart(10)} ${"DryRun".padStart(7)}`;
  const rows = results.map((r) =>
    `${r.label.padEnd(52)} ${String(r.matchedCount).padStart(8)} ${String(r.modifiedCount).padStart(9)} ${String(r.remainingCount).padStart(10)} ${String(r.skippedDryRun).padStart(7)}`
  );
  return [header, separator("-", header.length), ...rows].join("\n");
}

// ── Core migration logic ──────────────────────────────────────────────────────

async function applyRule(
  collection: mongoose.mongo.Collection,
  rule: MigrationRule,
  isDryRun: boolean
): Promise<MigrationResult> {
  const filter = { role: { $in: rule.from } };

  // Always count first — used both as the "before" count and for dry-run output
  const matchedCount = await collection.countDocuments(filter);

  let modifiedCount = 0;
  let skippedDryRun = false;

  if (isDryRun) {
    // Dry-run: count only, no writes
    skippedDryRun = true;
  } else if (matchedCount > 0) {
    // Only issue the write if there is actually something to update
    const updateResult = await collection.updateMany(filter, {
      $set: { role: rule.to },
    });
    modifiedCount = updateResult.modifiedCount;
  }

  // Post-run verification: count remaining legacy documents
  const remainingCount = isDryRun
    ? matchedCount // dry-run: no change made
    : await collection.countDocuments(filter);

  return {
    label: rule.label,
    from: rule.from,
    to: rule.to,
    matchedCount,
    modifiedCount,
    remainingCount,
    skippedDryRun,
  };
}

// ── Entry point ───────────────────────────────────────────────────────────────

async function main(): Promise<void> {
  const mongoUri = process.env.MONGO_URI;
  if (!mongoUri) {
    console.error(
      "[migrate_roles] ❌  MONGO_URI environment variable is not set.\n" +
        "  Usage: MONGO_URI=mongodb://... npx tsx src/migrations/migrate_roles.ts"
    );
    process.exit(1);
  }

  const isDryRun = process.env.DRY_RUN === "true";

  console.log(separator("═"));
  console.log("  LogiCore — User Role Migration (PLAN.md v1.4)");
  console.log(separator("═"));
  console.log(`  Mode:      ${isDryRun ? "🔍  DRY RUN  (no writes)" : "✏️   LIVE WRITE"}`);
  console.log(`  Timestamp: ${new Date().toISOString()}`);
  console.log(separator());

  // ── Connect ──────────────────────────────────────────────────────────────
  console.log("  Connecting to MongoDB...");
  await mongoose.connect(mongoUri, {
    // Explicit settings to prevent accidental long-lived connections in CI
    serverSelectionTimeoutMS: 10_000,
    connectTimeoutMS: 10_000,
  });
  console.log("  ✅  Connected.\n");

  const db = mongoose.connection.db;
  if (!db) {
    throw new Error("[migrate_roles] Could not obtain a database handle after connecting.");
  }
  const users = db.collection("users");

  // ── Count total affected users before any writes ──────────────────────────
  const allLegacyRoles = MIGRATION_RULES.flatMap((r) => r.from);
  const totalAffected = await users.countDocuments({
    role: { $in: allLegacyRoles },
  });
  console.log(`  Total users with legacy roles: ${totalAffected}`);

  if (totalAffected === 0 && !isDryRun) {
    console.log("\n  ✅  No legacy roles found. Nothing to do — migration is already complete.\n");
    await mongoose.disconnect();
    return;
  }

  console.log(separator());

  // ── Apply each rule sequentially ─────────────────────────────────────────
  // Sequential (not parallel) to avoid any potential write-order ambiguity
  // if a future rule set ever had overlapping `from` values.
  const results: MigrationResult[] = [];
  for (const rule of MIGRATION_RULES) {
    process.stdout.write(`  ► ${rule.label}...`);
    const result = await applyRule(users, rule, isDryRun);
    results.push(result);

    if (result.matchedCount === 0) {
      process.stdout.write(" (nothing to do)\n");
    } else if (isDryRun) {
      process.stdout.write(` would update ${result.matchedCount} document(s)\n`);
    } else {
      process.stdout.write(` updated ${result.modifiedCount} of ${result.matchedCount} document(s)\n`);
    }
  }

  // ── Summary table ─────────────────────────────────────────────────────────
  console.log(`\n${separator()}`);
  console.log("  SUMMARY");
  console.log(separator());
  console.log(formatTable(results));
  console.log(separator());

  // ── Post-migration verification ───────────────────────────────────────────
  if (!isDryRun) {
    const stillLegacy = await users.countDocuments({
      role: { $in: allLegacyRoles },
    });

    if (stillLegacy === 0) {
      console.log("\n  ✅  Verification passed: 0 documents with legacy roles remain.");
    } else {
      console.error(
        `\n  ❌  Verification FAILED: ${stillLegacy} document(s) still carry a legacy role.` +
          "\n      Investigate the collection manually before removing deprecated enum values."
      );
      // Exit with a non-zero code so CI/CD pipelines detect the failure
      await mongoose.disconnect();
      process.exit(1);
    }
  }

  // ── Post-run instructions ─────────────────────────────────────────────────
  if (!isDryRun) {
    console.log(
      "\n  Next steps:\n" +
        "  1. Force-invalidate active JWT sessions (bump tokenVersion or shorten TTL).\n" +
        "  2. Remove the @deprecated entries from `src/types/user.type.ts`.\n" +
        "  3. Update legacy route guards (see PR-11 in the migration plan)."
    );
  }

  console.log(`\n${separator("═")}\n`);

  await mongoose.disconnect();
  console.log("  Disconnected from MongoDB. Done.\n");
}

// ── Rollback reference (informational, not executable) ───────────────────────
//
// If you need to reverse this migration, apply the inverse mapping:
//
//   CS_MANAGER    → OPERATIONS_MANAGER  (for former ops managers)
//                   CUSTOMER_SUPPORT     (for former CS staff)
//   CS_AGENT      → OPERATIONS_AGENT
//   DRIVER_MANAGER→ WAREHOUSE_MANAGER   (for former warehouse managers)
//                   FLEET_MANAGER        (for former fleet managers)
//   ACCOUNTANT    → FINANCE_AGENT
//   DRIVER        → RIDER               (for former riders)
//
// Note: The reverse mapping is ambiguous for roles that merged multiple
// legacy values (e.g., CS_MANAGER ← OPERATIONS_MANAGER + CUSTOMER_SUPPORT).
// A rollback would require knowing the original role per user, which is not
// stored. This is intentional — the migration is considered one-way.

main().catch((err: unknown) => {
  console.error("\n  [migrate_roles] Fatal error:", err);
  process.exit(1);
});
