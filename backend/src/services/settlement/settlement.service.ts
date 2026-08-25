import mongoose from "mongoose";
import { Settlement, SettlementStatus } from "../../models/Settlement.model.js";
import { Shipment } from "../../models/Shipment.model.js";
import { User } from "../../models/User.model.js";
import { ShipmentStatus, PaymentMethod } from "../../types/shipment.type.js";
import { UserRole } from "../../types/user.type.js";

export interface ReconcilePayload {
  driverId: string;
  collectedCash: number;
  notes?: string;
  /** ISO date string YYYY-MM-DD; defaults to today (UTC) if omitted */
  settlementDate?: string;
}

/**
 * Normalise a date-string (or today) to midnight UTC so comparisons are date-only.
 */
function toMidnightUtc(dateStr?: string): Date {
  const d = dateStr ? new Date(dateStr) : new Date();
  d.setUTCHours(0, 0, 0, 0);
  return d;
}

export class SettlementService {
  /**
   * reconcile
   * Warehouse manager calls this at EOD for a specific driver.
   * 1. Calculates expected cash from all DELIVERED COD shipments for the day.
   * 2. Creates (or updates) a Settlement record for that (driver, date) pair.
   * 3. Updates the driver's unreconciledCash balance accordingly.
   */
  async reconcile(
    payload: ReconcilePayload,
    managerId: string,
    companyId: string
  ): Promise<ISettlementPublic> {
    const { driverId, collectedCash, notes, settlementDate: dateStr } = payload;

    if (!mongoose.Types.ObjectId.isValid(driverId)) {
      throw new Error("Invalid driver ID format");
    }

    if (typeof collectedCash !== "number" || collectedCash < 0) {
      throw new Error("collectedCash must be a non-negative number");
    }

    // Verify the driver belongs to this company
    const driver = await User.findOne({
      _id: new mongoose.Types.ObjectId(driverId),
      companyId: new mongoose.Types.ObjectId(companyId),
      role: UserRole.DRIVER,
    }).lean();

    if (!driver) {
      throw new Error("Driver not found in your company");
    }

    const day = toMidnightUtc(dateStr);
    const nextDay = new Date(day);
    nextDay.setUTCDate(nextDay.getUTCDate() + 1);

    const companyOid = new mongoose.Types.ObjectId(companyId);
    const driverOid = new mongoose.Types.ObjectId(driverId);

    // Sum the codAmount for all COD deliveries made by this driver on the settlement day
    // Also collect the IDs of those shipments to enforce double-settlement idempotency.
    const [cashAgg] = await Shipment.aggregate<{ total: number; shipmentIds: mongoose.Types.ObjectId[] }>([
      {
        $match: {
          companyId: companyOid,
          assignedDriver: driverOid,
          status: ShipmentStatus.DELIVERED,
          paymentMethod: PaymentMethod.CASH_ON_DELIVERY,
          deliveredAt: { $gte: day, $lt: nextDay },
        },
      },
      {
        $group: { 
          _id: null, 
          total: { $sum: "$codAmount" },
          shipmentIds: { $push: "$_id" }
        },
      },
    ]);

    const expectedCash = cashAgg?.total ?? 0;
    const shipmentIds = cashAgg?.shipmentIds ?? [];
    const discrepancyAmount = collectedCash - expectedCash;

    // Idempotency Guard: prevent double-settlement of shipments.
    // If the array is empty (historical records), this check is naturally bypassed.
    if (shipmentIds.length > 0) {
      const existingConflict = await Settlement.findOne({
        companyId: companyOid,
        // Exclude the current day's settlement (if re-reconciling the same day, it's safe)
        settlementDate: { $ne: day },
        shipmentIds: { $in: shipmentIds }
      });
      if (existingConflict) {
        throw new Error(
          `Double-settlement detected: one or more shipments are already reconciled in a settlement dated ${existingConflict.settlementDate.toISOString()}`
        );
      }
    }

    // Upsert — idempotent: re-reconciling the same day replaces the old record
    const settlement = await Settlement.findOneAndUpdate(
      { companyId: companyOid, driverId: driverOid, settlementDate: day },
      {
        companyId: companyOid,
        driverId: driverOid,
        settlementDate: day,
        expectedCash,
        collectedCash,
        discrepancyAmount,
        shipmentIds,
        status: SettlementStatus.RECONCILED,
        verifiedBy: new mongoose.Types.ObjectId(managerId),
        notes,
      },
      { upsert: true, new: true, runValidators: true }
    );

    // Reset driver's unreconciled cash balance to 0 (manager has taken the float)
    await User.findByIdAndUpdate(driverId, { unreconciledCash: 0 });

    return toPublic(settlement!);
  }

  /**
   * getDriverStatement
   * Returns the settlement history for a specific driver (tenant-scoped).
   * Supports optional date range filtering.
   */
  async getDriverStatement(
    driverId: string,
    companyId: string,
    options: { from?: string; to?: string; limit?: number } = {}
  ): Promise<{ driver: DriverSummary; settlements: ISettlementPublic[] }> {
    if (!mongoose.Types.ObjectId.isValid(driverId)) {
      throw new Error("Invalid driver ID format");
    }

    const companyOid = new mongoose.Types.ObjectId(companyId);
    const driverOid = new mongoose.Types.ObjectId(driverId);

    // Tenant check — driver must belong to this company
    const driver = await User.findOne({
      _id: driverOid,
      companyId: companyOid,
      role: UserRole.DRIVER,
    })
      .select("userName email phone unreconciledCash")
      .lean();

    if (!driver) {
      throw new Error("Driver not found in your company");
    }

    const dateFilter: Record<string, Date> = {};
    if (options.from) dateFilter.$gte = toMidnightUtc(options.from);
    if (options.to) {
      const to = toMidnightUtc(options.to);
      to.setUTCDate(to.getUTCDate() + 1); // inclusive end
      dateFilter.$lt = to;
    }

    const query: Record<string, unknown> = {
      companyId: companyOid,
      driverId: driverOid,
    };
    if (Object.keys(dateFilter).length > 0) {
      query.settlementDate = dateFilter;
    }

    const settlements = await Settlement.find(query)
      .sort({ settlementDate: -1 })
      .limit(options.limit ?? 90)
      .populate("verifiedBy", "userName email")
      .lean();

    return {
      driver: {
        id: driver._id.toString(),
        userName: driver.userName,
        email: driver.email,
        phone: driver.phone,
        unreconciledCash: driver.unreconciledCash,
      },
      settlements: settlements.map(toPublic),
    };
  }

  /**
   * getTodaySummary
   * Returns today's expected vs reconciled cash totals for the whole company.
   * Used by the analytics/dashboard endpoint.
   */
  async getTodaySummary(companyId: string): Promise<CashSummary> {
    const companyOid = new mongoose.Types.ObjectId(companyId);
    const today = toMidnightUtc();
    const tomorrow = new Date(today);
    tomorrow.setUTCDate(tomorrow.getUTCDate() + 1);

    // Expected cash = all COD deliveries today across all drivers
    const [expectedAgg] = await Shipment.aggregate<{ total: number }>([
      {
        $match: {
          companyId: companyOid,
          status: ShipmentStatus.DELIVERED,
          paymentMethod: PaymentMethod.CASH_ON_DELIVERY,
          deliveredAt: { $gte: today, $lt: tomorrow },
        },
      },
      { $group: { _id: null, total: { $sum: "$codAmount" } } },
    ]);

    // Reconciled cash = sum of all RECONCILED settlements for today
    const [reconciledAgg] = await Settlement.aggregate<{
      totalCollected: number;
      count: number;
    }>([
      {
        $match: {
          companyId: companyOid,
          settlementDate: { $gte: today, $lt: tomorrow },
          status: SettlementStatus.RECONCILED,
        },
      },
      {
        $group: {
          _id: null,
          totalCollected: { $sum: "$collectedCash" },
          count: { $sum: 1 },
        },
      },
    ]);

    const totalExpected = expectedAgg?.total ?? 0;
    const totalCollected = reconciledAgg?.totalCollected ?? 0;
    const reconciledCount = reconciledAgg?.count ?? 0;

    return {
      totalExpected,
      totalCollected,
      discrepancy: totalCollected - totalExpected,
      reconciledDriversCount: reconciledCount,
    };
  }
}

// ── Local type helpers ────────────────────────────────────────────────────────

interface ISettlementPublic {
  id: string;
  driverId: string;
  settlementDate: string;
  expectedCash: number;
  collectedCash: number;
  discrepancyAmount: number;
  status: string;
  verifiedBy?: string | { userName?: string; email?: string };
  notes?: string;
  createdAt: string;
}

interface DriverSummary {
  id: string;
  userName: string;
  email: string;
  phone?: string | undefined;
  unreconciledCash: number;
}

export interface CashSummary {
  totalExpected: number;
  totalCollected: number;
  discrepancy: number;
  reconciledDriversCount: number;
}

function toPublic(s: any): ISettlementPublic {
  return {
    id: s._id.toString(),
    driverId: s.driverId.toString(),
    settlementDate: s.settlementDate instanceof Date
      ? s.settlementDate.toISOString().slice(0, 10)
      : String(s.settlementDate),
    expectedCash: s.expectedCash,
    collectedCash: s.collectedCash,
    discrepancyAmount: s.discrepancyAmount,
    status: s.status,
    verifiedBy: s.verifiedBy,
    notes: s.notes,
    createdAt: s.createdAt?.toISOString?.() ?? String(s.createdAt),
  };
}
