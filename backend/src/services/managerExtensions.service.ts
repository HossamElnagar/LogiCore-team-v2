/*
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
*/

/*
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
    case UserRole.CS_MANAGER:
      return "Customer Service";
    case UserRole.DRIVER:
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
  query?: Record<string, unknown>;
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

    if (!payload.incidentId) return;

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

  async buildManagerDashboardPayload(companyId: string, query: Record<string, any> = {}) {
    const objectId = new mongoose.Types.ObjectId(companyId);

    // 1. التواريخ للتقارير
    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);

    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    // 2. إعدادات الـ Pagination
    const empPage = parseInt(query.empPage as string) || parseInt(query.page as string) || 1;
    const empLimit = parseInt(query.empLimit as string) || 5;
    const empSkip = (empPage - 1) * empLimit;

    const dailyPage = parseInt(query.dailyPage as string) || 1;
    const dailyLimit = parseInt(query.dailyLimit as string) || 5;
    const dailySkip = (dailyPage - 1) * dailyLimit;

    const weeklyPage = parseInt(query.weeklyPage as string) || 1;
    const weeklyLimit = parseInt(query.weeklyLimit as string) || 5;
    const weeklySkip = (weeklyPage - 1) * weeklyLimit;

    // 3. جلب البيانات الرئيسي
    const [
      totalEmployeesCount,
      activeIncidents,
      resolvedIncidents,
      openIncidents,
      escalatedIncidents,
      statusBreakdown,
      dailyIncidentsChart,
      employees,
      totalDailyIncidents,
      dailyIncidentsList,
      totalWeeklyIncidents,
      weeklyIncidentsList,
      allDailyIncidents,
      allWeeklyIncidents
    ] = await Promise.all([
      User.countDocuments({ companyId: objectId, role: UserRole.CS_AGENT }),
      Incident.countDocuments({ companyId: objectId, status: { $in: ["OPEN", "IN_PROGRESS"] } }),
      Incident.countDocuments({ companyId: objectId, status: { $in: ["RESOLVED", "CLOSED"] } }),
      Incident.countDocuments({ companyId: objectId, status: "OPEN" }),
      Incident.countDocuments({ companyId: objectId, $or: [{ escalatedByManager: true }, { status: "ESCALATED" }] }),
      Incident.aggregate([
        { $match: { companyId: objectId } },
        { $group: { _id: "$status", count: { $sum: 1 } } },
        { $sort: { count: -1 } },
      ]),
      Incident.aggregate([
        { $match: { companyId: objectId, createdAt: { $gte: sevenDaysAgo } } },
        { $group: { _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } }, count: { $sum: 1 } } },
        { $sort: { _id: 1 } },
      ]),
      User.find({ companyId: objectId, role: UserRole.CS_AGENT })
        .select("_id userName email role isOnline")
        .skip(empSkip)
        .limit(empLimit)
        .lean(),

      Incident.countDocuments({ companyId: objectId, createdAt: { $gte: startOfToday } }),
      Incident.find({ companyId: objectId, createdAt: { $gte: startOfToday } })
        .sort({ createdAt: -1 })
        .skip(dailySkip)
        .limit(dailyLimit)
        .select("_id title status severity createdAt")
        .lean(),

      Incident.countDocuments({ companyId: objectId, createdAt: { $gte: sevenDaysAgo } }),
      Incident.find({ companyId: objectId, createdAt: { $gte: sevenDaysAgo } })
        .sort({ createdAt: -1 })
        .skip(weeklySkip)
        .limit(weeklyLimit)
        .select("_id title status severity createdAt")
        .lean(),

      Incident.find({ companyId: objectId, createdAt: { $gte: startOfToday } }).select("status escalatedByManager").lean(),
      Incident.find({ companyId: objectId, createdAt: { $gte: sevenDaysAgo } }).select("status escalatedByManager").lean(),
    ]);

    const escalationByDepartment = await Incident.aggregate([
      { $match: { companyId: objectId, escalatedByManager: true } },
      { $lookup: { from: "users", localField: "assignedTo", foreignField: "_id", as: "assignedUser" } },
      { $unwind: { path: "$assignedUser", preserveNullAndEmptyArrays: true } },
      { $group: { _id: "$assignedUser.role", count: { $sum: 1 } } },
      { $sort: { count: -1 } },
    ]);

    // 4. إحصائيات الموظف بناءً على الموظف المباشر
    const employeeSummaries = await Promise.all(
      employees.map(async (employee: any) => {
        const empIdStr = String(employee._id);
        const empIdObj = new mongoose.Types.ObjectId(empIdStr);

        const empFilter = {
          $or: [
            { assignedTo: empIdObj },
            { assignedTo: empIdStr },
            { assignedAgent: empIdObj },
            { assignedAgent: empIdStr },
          ]
        };

        const [openIncidentsForEmployee, resolvedIncidentsForEmployee, escalatedIncidentsForEmployee, openChats, resolvedChats] = await Promise.all([
          Incident.countDocuments({ ...empFilter, status: { $in: ["OPEN", "IN_PROGRESS"] } }),
          Incident.countDocuments({ ...empFilter, status: { $in: ["RESOLVED", "CLOSED"] } }),
          Incident.countDocuments({ ...empFilter, $or: [{ escalatedByManager: true }, { status: "ESCALATED" }] }),
          ChatRoom.countDocuments({ participants: { $in: [empIdObj, empIdStr] }, type: "INCIDENT" }),
          Message.countDocuments({ $or: [{ senderId: empIdObj }, { senderId: empIdStr }] }),
        ]);

        return {
          _id: employee._id,
          userName: employee.userName,
          email: employee.email,
          role: employee.role,
          isOnline: employee.isOnline,
          totalIncidents: openIncidentsForEmployee + resolvedIncidentsForEmployee + escalatedIncidentsForEmployee,
          openIncidents: openIncidentsForEmployee,
          resolvedIncidents: resolvedIncidentsForEmployee,
          escalatedIncidents: escalatedIncidentsForEmployee,
          openChats,
          resolvedChats,
        };
      })
    );

    ;const empTotalPages = Math.ceil(totalEmployeesCount / empLimit) || 1;
    const dailyTotalPages = Math.ceil(totalDailyIncidents / dailyLimit) || 1;
    const weeklyTotalPages = Math.ceil(totalWeeklyIncidents / weeklyLimit) || 1;

    const calcReportStats = (list: any[]) => ({
      resolved: list.filter((i) => ["RESOLVED", "CLOSED"].includes(String(i.status).toUpperCase())).length,
      open: list.filter((i) => ["OPEN", "IN_PROGRESS"].includes(String(i.status).toUpperCase())).length,
      escalated: list.filter((i) => i.escalatedByManager || String(i.status).toUpperCase() === "ESCALATED").length,
    });

    return {
      summary: {
        totalCsEmployees: totalEmployeesCount,
        activeIncidents,
        resolvedIncidents,
        openIncidents,
        escalatedIncidents,
      },
      pagination: {
        employees: {
          page: empPage,
          limit: empLimit,
          totalItems: totalEmployeesCount,
          totalPages: empTotalPages,
          hasNextPage: empPage < empTotalPages,
          hasPrevPage: empPage > 1,
        },
        dailyReports: {
          page: dailyPage,
          limit: dailyLimit,
          totalItems: totalDailyIncidents,
          totalPages: dailyTotalPages,
          hasNextPage: dailyPage < dailyTotalPages,
          hasPrevPage: dailyPage > 1,
        },
        weeklyReports: {
          page: weeklyPage,
          limit: weeklyLimit,
          totalItems: totalWeeklyIncidents,
          totalPages: weeklyTotalPages,
          hasNextPage: weeklyPage < weeklyTotalPages,
          hasPrevPage: weeklyPage > 1,
        },
      },
      incidentsByStatus: statusBreakdown.map((item: any) => ({ status: item._id, count: item.count })),
      escalationsByDepartment: escalationByDepartment.map((item: any) => ({ department: mapRoleToDepartment(item._id), count: item.count })),
      dailyIncidents: dailyIncidentsChart.map((item: any) => ({ date: item._id, count: item.count })),
      employees: employeeSummaries,
      recentIncidents: dailyIncidentsList,
      reports: {
        dailyReport: {
          title: "Daily Report",
          totalIncidents: totalDailyIncidents,
          page: dailyPage,
          limit: dailyLimit,
          totalPages: dailyTotalPages,
          hasNextPage: dailyPage < dailyTotalPages,
          hasPrevPage: dailyPage > 1,
          ...calcReportStats(allDailyIncidents),
          incidents: dailyIncidentsList,
        },
        weeklyReport: {
          title: "Weekly Report",
          totalIncidents: totalWeeklyIncidents,
          page: weeklyPage,
          limit: weeklyLimit,
          totalPages: weeklyTotalPages,
          hasNextPage: weeklyPage < weeklyTotalPages,
          hasPrevPage: weeklyPage > 1,
          ...calcReportStats(allWeeklyIncidents),
          incidents: weeklyIncidentsList,
        },
      },
    };
  }
}

export const managerExtensionsService = new ManagerExtensionsService();

registerDashboardExtensionHook(async (payload: DashboardExtensionPayload) => {
  if (!payload.companyId) return {};
  try {
    return await managerExtensionsService.buildManagerDashboardPayload(
      String(payload.companyId),
      payload.query as Record<string, any>
    );
  } catch (err) {
    return {};
  }
});*/
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
    case UserRole.CS_MANAGER:
      return "Customer Service";
    case UserRole.DRIVER:
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
  query?: Record<string, unknown>;
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

    if (!payload.incidentId) return;

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

  async buildManagerDashboardPayload(companyId: string, query: Record<string, any> = {}) {
    const objectId = new mongoose.Types.ObjectId(companyId);

    // 1. حساب التواريخ الصحيح للـ Daily والـ Weekly
    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0); // بداية اليوم الحالي الساعة 00:00

    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7); // قبل 7 أيام من اللحظة الحالية

    // 2. استقبال إعدادات الـ Pagination بصيغها المختلفة من الـ Frontend
    const empPage = Number(query.empPage || query.page || 1);
    const empLimit = Number(query.empLimit || query.limit || 5);
    const empSkip = (empPage - 1) * empLimit;

    const dailyPage = Number(query.dailyPage || query.page || 1);
    const dailyLimit = Number(query.dailyLimit || query.limit || 5);
    const dailySkip = (dailyPage - 1) * dailyLimit;

    const weeklyPage = Number(query.weeklyPage || query.page || 1);
    const weeklyLimit = Number(query.weeklyLimit || query.limit || 5);
    const weeklySkip = (weeklyPage - 1) * weeklyLimit;

    // شروط الفلترة الزمنية الصحيحة
    const dailyFilter = { companyId: objectId, createdAt: { $gte: startOfToday } };
    const weeklyFilter = { companyId: objectId, createdAt: { $gte: sevenDaysAgo } }; // يشمل اليوم والـ 6 أيام السابقة

    // 3. التنفيذ الموازي للشاشات والتقارير
    const [
      totalEmployeesCount,
      activeIncidents,
      resolvedIncidents,
      openIncidents,
      escalatedIncidents,
      statusBreakdown,
      dailyIncidentsChart,
      employees,
      totalDailyIncidents,
      dailyIncidentsList,
      totalWeeklyIncidents,
      weeklyIncidentsList,
      allDailyIncidents,
      allWeeklyIncidents
    ] = await Promise.all([
      User.countDocuments({ companyId: objectId, role: UserRole.CS_AGENT }),
      Incident.countDocuments({ companyId: objectId, status: { $in: ["OPEN", "IN_PROGRESS"] } }),
      Incident.countDocuments({ companyId: objectId, status: { $in: ["RESOLVED", "CLOSED"] } }),
      Incident.countDocuments({ companyId: objectId, status: "OPEN" }),
      Incident.countDocuments({ companyId: objectId, $or: [{ escalatedByManager: true }, { status: "ESCALATED" }] }),
      Incident.aggregate([
        { $match: { companyId: objectId } },
        { $group: { _id: "$status", count: { $sum: 1 } } },
        { $sort: { count: -1 } },
      ]),
      Incident.aggregate([
        { $match: { companyId: objectId, createdAt: { $gte: sevenDaysAgo } } },
        { $group: { _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } }, count: { $sum: 1 } } },
        { $sort: { _id: 1 } },
      ]),
      User.find({ companyId: objectId, role: UserRole.CS_AGENT })
        .select("_id userName email role isOnline")
        .skip(empSkip)
        .limit(empLimit)
        .lean(),

      // Daily Queries
      Incident.countDocuments(dailyFilter),
      Incident.find(dailyFilter)
        .sort({ createdAt: -1 })
        .skip(dailySkip)
        .limit(dailyLimit)
        .select("_id title status severity createdAt")
        .lean(),

      // Weekly Queries
      Incident.countDocuments(weeklyFilter),
      Incident.find(weeklyFilter)
        .sort({ createdAt: -1 })
        .skip(weeklySkip)
        .limit(weeklyLimit)
        .select("_id title status severity createdAt")
        .lean(),

      Incident.find(dailyFilter).select("status escalatedByManager").lean(),
      Incident.find(weeklyFilter).select("status escalatedByManager").lean(),
    ]);

    const escalationByDepartment = await Incident.aggregate([
      { $match: { companyId: objectId, escalatedByManager: true } },
      { $lookup: { from: "users", localField: "assignedTo", foreignField: "_id", as: "assignedUser" } },
      { $unwind: { path: "$assignedUser", preserveNullAndEmptyArrays: true } },
      { $group: { _id: "$assignedUser.role", count: { $sum: 1 } } },
      { $sort: { count: -1 } },
    ]);

    // 4. إحصائيات الموظفين
    const employeeSummaries = await Promise.all(
      employees.map(async (employee: any) => {
        const empIdStr = String(employee._id);
        const empIdObj = new mongoose.Types.ObjectId(empIdStr);

        const empFilter = {
          $or: [
            { assignedTo: empIdObj },
            { assignedTo: empIdStr },
            { assignedAgent: empIdObj },
            { assignedAgent: empIdStr },
          ]
        };

        const [openIncidentsForEmployee, resolvedIncidentsForEmployee, escalatedIncidentsForEmployee, openChats, resolvedChats] = await Promise.all([
          Incident.countDocuments({ ...empFilter, status: { $in: ["OPEN", "IN_PROGRESS"] } }),
          Incident.countDocuments({ ...empFilter, status: { $in: ["RESOLVED", "CLOSED"] } }),
          Incident.countDocuments({ ...empFilter, $or: [{ escalatedByManager: true }, { status: "ESCALATED" }] }),
          ChatRoom.countDocuments({ participants: { $in: [empIdObj, empIdStr] }, type: "INCIDENT" }),
          Message.countDocuments({ $or: [{ senderId: empIdObj }, { senderId: empIdStr }] }),
        ]);

        return {
          _id: employee._id,
          userName: employee.userName,
          email: employee.email,
          role: employee.role,
          isOnline: employee.isOnline,
          totalIncidents: openIncidentsForEmployee + resolvedIncidentsForEmployee + escalatedIncidentsForEmployee,
          openIncidents: openIncidentsForEmployee,
          resolvedIncidents: resolvedIncidentsForEmployee,
          escalatedIncidents: escalatedIncidentsForEmployee,
          openChats,
          resolvedChats,
        };
      })
    );

    const empTotalPages = Math.ceil(totalEmployeesCount / empLimit) || 1;
    const dailyTotalPages = Math.ceil(totalDailyIncidents / dailyLimit) || 1;
    const weeklyTotalPages = Math.ceil(totalWeeklyIncidents / weeklyLimit) || 1;

    const calcReportStats = (list: any[]) => ({
      resolved: list.filter((i) => ["RESOLVED", "CLOSED"].includes(String(i.status).toUpperCase())).length,
      open: list.filter((i) => ["OPEN", "IN_PROGRESS"].includes(String(i.status).toUpperCase())).length,
      escalated: list.filter((i) => i.escalatedByManager || String(i.status).toUpperCase() === "ESCALATED").length,
    });

    return {
      summary: {
        totalCsEmployees: totalEmployeesCount,
        activeIncidents,
        resolvedIncidents,
        openIncidents,
        escalatedIncidents,
      },
      pagination: {
        employees: {
          page: empPage,
          limit: empLimit,
          totalItems: totalEmployeesCount,
          totalPages: empTotalPages,
          hasNextPage: empPage < empTotalPages,
          hasPrevPage: empPage > 1,
        },
        dailyReports: {
          page: dailyPage,
          limit: dailyLimit,
          totalItems: totalDailyIncidents,
          totalPages: dailyTotalPages,
          hasNextPage: dailyPage < dailyTotalPages,
          hasPrevPage: dailyPage > 1,
        },
        weeklyReports: {
          page: weeklyPage,
          limit: weeklyLimit,
          totalItems: totalWeeklyIncidents,
          totalPages: weeklyTotalPages,
          hasNextPage: weeklyPage < weeklyTotalPages,
          hasPrevPage: weeklyPage > 1,
        },
      },
      incidentsByStatus: statusBreakdown.map((item: any) => ({ status: item._id, count: item.count })),
      escalationsByDepartment: escalationByDepartment.map((item: any) => ({ department: mapRoleToDepartment(item._id), count: item.count })),
      dailyIncidents: dailyIncidentsChart.map((item: any) => ({ date: item._id, count: item.count })),
      employees: employeeSummaries,
      recentIncidents: dailyIncidentsList,
      reports: {
        dailyReport: {
          title: "Daily Report",
          totalIncidents: totalDailyIncidents,
          page: dailyPage,
          limit: dailyLimit,
          totalPages: dailyTotalPages,
          hasNextPage: dailyPage < dailyTotalPages,
          hasPrevPage: dailyPage > 1,
          ...calcReportStats(allDailyIncidents),
          incidents: dailyIncidentsList,
        },
        weeklyReport: {
          title: "Weekly Report",
          totalIncidents: totalWeeklyIncidents,
          page: weeklyPage,
          limit: weeklyLimit,
          totalPages: weeklyTotalPages,
          hasNextPage: weeklyPage < weeklyTotalPages,
          hasPrevPage: weeklyPage > 1,
          ...calcReportStats(allWeeklyIncidents),
          incidents: weeklyIncidentsList,
        },
      },
    };
  }
}

export const managerExtensionsService = new ManagerExtensionsService();

registerDashboardExtensionHook(async (payload: DashboardExtensionPayload) => {
  if (!payload.companyId) return {};
  try {
    return await managerExtensionsService.buildManagerDashboardPayload(
      String(payload.companyId),
      (payload.query || {}) as Record<string, any>
    );
  } catch (err) {
    return {};
  }
});