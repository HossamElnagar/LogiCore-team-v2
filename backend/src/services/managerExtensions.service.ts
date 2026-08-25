import mongoose from "mongoose";
import { User } from "../models/User.model.js";
import { Incident } from "../models/Incedent.model.js";
import { ChatRoom } from "../models/ChatRoom.model.js";
import { Message } from "../models/Message.model.js";
import { UserRole } from "../types/user.type.js";
import { getIo } from "../socket/socket.js";

function mapRoleToDepartment(role?: string) {
  switch (role) {
    case UserRole.CS_AGENT:
      return "Customer Service";
    case UserRole.CS_MANAGER:
      return "Customer Service";
    case UserRole.DRIVER:
      return "Operations";
    case UserRole.DRIVER_MANAGER:
      return "Operations";
    case UserRole.OWNER:
      return "Executive";
    default:
      return "Operations";
  }
}

type CsManagerNotificationPayload = {
  event: string;
  companyId?: string;
  incidentId?: string;
  managerIds?: string[];
  roomId?: string;
  senderId?: string;
  [key: string]: unknown;
};

type DashboardExtensionPayload = {
  companyId?: string;
  metrics?: Record<string, unknown>;
  [key: string]: unknown;
};

type DashboardExtensionResult = Record<string, unknown>;

type CsManagerNotificationHook = (payload: CsManagerNotificationPayload) => void | Promise<void>;
type DashboardExtensionHook = (payload: DashboardExtensionPayload) => DashboardExtensionResult | Promise<DashboardExtensionResult>;

const csManagerNotificationHooks = new Set<CsManagerNotificationHook>();
const dashboardExtensionHooks = new Set<DashboardExtensionHook>();

export function registerCsManagerNotificationHook(hook: CsManagerNotificationHook) {
  csManagerNotificationHooks.add(hook);
  return () => csManagerNotificationHooks.delete(hook);
}

export async function dispatchCsManagerNotification(payload: CsManagerNotificationPayload) {
  await Promise.all(Array.from(csManagerNotificationHooks).map((hook) => hook(payload)));
}

export function registerDashboardExtensionHook(hook: DashboardExtensionHook) {
  dashboardExtensionHooks.add(hook);
  return () => dashboardExtensionHooks.delete(hook);
}

export async function applyDashboardExtensions(payload: DashboardExtensionPayload) {
  const results = await Promise.all(Array.from(dashboardExtensionHooks).map((hook) => hook(payload)));
  return results.reduce<DashboardExtensionResult>((acc, current) => ({ ...acc, ...current }), {});
}

export class ManagerExtensionsService {
  async notifyManagers(payload: CsManagerNotificationPayload) {
    const io = getIo();
    if (!io || !payload.companyId) return;

    const companyId = payload.companyId;

    // Build recipient list: when specific managerIds are provided, notify only those managers (and
    // only if they belong to the company). Otherwise, fall back to notifying all CS_MANAGERS for the company.
    const recipientIds = new Set<string>();

    if (payload.managerIds && Array.isArray(payload.managerIds) && payload.managerIds.length > 0) {
      const validManagers = await User.find({
        _id: { $in: payload.managerIds.map((id) => new mongoose.Types.ObjectId(id)) },
        companyId: new mongoose.Types.ObjectId(companyId),
        role: { $in: [UserRole.CS_MANAGER, UserRole.DRIVER_MANAGER, UserRole.OWNER] }
      }).select("_id").lean();

      validManagers.forEach((m: any) => recipientIds.add(String(m._id)));
    } else {
      const managers = await User.find({ companyId: new mongoose.Types.ObjectId(companyId), role: UserRole.CS_MANAGER }).select("_id").lean();
      managers.forEach((manager: any) => recipientIds.add(String(manager._id)));
    }

    if (!payload.incidentId) {
      return;
    }

    const incident = await Incident.findById(payload.incidentId).select("title status").lean();
    if (!incident) return;

    const messageByEvent: Record<string, string> = {
      incident_assigned: "A new incident was assigned to a CS agent.",
      incident_escalated: "An incident was escalated and requires manager attention.",
      manager_added: "A manager was added to an escalation room.",
      room_message: "A room assigned to one of your agents has a new message.",
      incident_resolved: "An incident was resolved.",
    };

    const message = messageByEvent[payload.event as string] || "A new CS manager notification is available.";
    for (const recipientId of Array.from(recipientIds)) {
      if (payload.senderId && recipientId === payload.senderId) continue;
      io.to(`user_${recipientId}`).emit("manager:notification", {
        type: payload.event,
        incidentId: payload.incidentId,
        title: incident.title,
        message,
        timestamp: new Date().toISOString(),
      });
    }
  }

  async buildManagerDashboardPayload(companyId: string) {
    const objectId = new mongoose.Types.ObjectId(companyId);

    const [employeeCount, activeIncidents, resolvedIncidents, openIncidents, escalatedIncidents, statusBreakdown, dailyIncidents, employees, recentIncidents] = await Promise.all([
      User.countDocuments({ companyId: objectId, role: { $in: [UserRole.CS_AGENT, UserRole.CS_MANAGER] } }),
      Incident.countDocuments({ companyId: objectId, status: { $in: ["OPEN", "IN_PROGRESS"] } }),
      Incident.countDocuments({ companyId: objectId, status: "RESOLVED" }),
      Incident.countDocuments({ companyId: objectId, status: "OPEN" }),
      Incident.countDocuments({ companyId: objectId, $or: [{ escalatedByManager: true }, { status: "IN_PROGRESS" }] }),
      Incident.aggregate([
        { $match: { companyId: objectId } },
        { $group: { _id: "$status", count: { $sum: 1 } } },
        { $sort: { count: -1 } },
      ]),
      Incident.aggregate([
        { $match: { companyId: objectId, createdAt: { $gte: new Date(Date.now() - 6 * 24 * 60 * 60 * 1000) } } },
        { $group: { _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } }, count: { $sum: 1 } } },
        { $sort: { _id: 1 } },
      ]),
      User.find({ companyId: objectId, role: UserRole.CS_AGENT }).select("_id userName email role isOnline").lean(),
      Incident.find({ companyId: objectId }).sort({ createdAt: -1 }).limit(8).select("_id title status severity createdAt").lean(),
    ]);

    const escalationByDepartment = await Incident.aggregate([
      { $match: { companyId: objectId, escalatedByManager: true } },
      { $lookup: { from: "users", localField: "assignedTo", foreignField: "_id", as: "assignedUser" } },
      { $unwind: { path: "$assignedUser", preserveNullAndEmptyArrays: true } },
      { $group: { _id: "$assignedUser.role", count: { $sum: 1 } } },
      { $sort: { count: -1 } },
    ]);

    const employeeSummaries = await Promise.all(
      employees.map(async (employee: any) => {
        const [totalIncidents, openIncidentsForEmployee, resolvedIncidentsForEmployee, escalatedIncidentsForEmployee, openChats, resolvedChats] = await Promise.all([
          Incident.countDocuments({ companyId: objectId, assignedTo: employee._id }),
          Incident.countDocuments({ companyId: objectId, assignedTo: employee._id, status: "OPEN" }),
          Incident.countDocuments({ companyId: objectId, assignedTo: employee._id, status: "RESOLVED" }),
          Incident.countDocuments({ companyId: objectId, assignedTo: employee._id, escalatedByManager: true }),
          ChatRoom.countDocuments({ companyId: objectId, participants: employee._id, type: "INCIDENT" }),
          Message.countDocuments({ senderId: employee._id }),
        ]);

        return {
          _id: employee._id,
          userName: employee.userName,
          email: employee.email,
          role: employee.role,
          isOnline: employee.isOnline,
          totalIncidents,
          openIncidents: openIncidentsForEmployee,
          resolvedIncidents: resolvedIncidentsForEmployee,
          escalatedIncidents: escalatedIncidentsForEmployee,
          openChats,
          resolvedChats,
        };
      })
    );

    const dailyReport = {
      title: "Daily Report",
      totalIncidents: recentIncidents.length,
      resolved: recentIncidents.filter((incident: any) => incident.status === "RESOLVED" || incident.status === "CLOSED").length,
      open: recentIncidents.filter((incident: any) => incident.status === "OPEN").length,
      escalated: recentIncidents.filter((incident: any) => incident.status === "IN_PROGRESS" || incident.escalatedByManager).length,
      incidents: recentIncidents,
    };

    const weeklyReport = {
      title: "Weekly Report",
      totalIncidents: recentIncidents.length,
      resolved: recentIncidents.filter((incident: any) => incident.status === "RESOLVED" || incident.status === "CLOSED").length,
      open: recentIncidents.filter((incident: any) => incident.status === "OPEN").length,
      escalated: recentIncidents.filter((incident: any) => incident.status === "IN_PROGRESS" || incident.escalatedByManager).length,
      incidents: recentIncidents,
    };

    return {
      summary: {
        totalCsEmployees: employeeCount,
        activeIncidents,
        resolvedIncidents,
        openIncidents,
        escalatedIncidents,
      },
      incidentsByStatus: statusBreakdown.map((item: any) => ({ status: item._id, count: item.count })),
      escalationsByDepartment: escalationByDepartment.map((item: any) => ({ department: mapRoleToDepartment(item._id), count: item.count })),
      dailyIncidents: dailyIncidents.map((item: any) => ({ date: item._id, count: item.count })),
      employees: employeeSummaries,
      recentIncidents,
      reports: {
        dailyReport,
        weeklyReport,
      },
    };
  }
}

// Export a singleton instance so other modules (and hooks) can reuse it.
export const managerExtensionsService = new ManagerExtensionsService();

// Register a dashboard extension hook so `AnalyticsController.getDashboard` will include
// manager dashboard payload when requesting the combined metrics.
registerDashboardExtensionHook(async (payload: DashboardExtensionPayload) => {
  if (!payload.companyId) return {};
  try {
    return await managerExtensionsService.buildManagerDashboardPayload(String(payload.companyId));
  } catch (err) {
    return {};
  }
});
