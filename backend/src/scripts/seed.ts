import dotenv from "dotenv";
import mongoose from "mongoose";
import bcrypt from "bcrypt";
import process from "node:process";

import { Company } from "../models/Company.model.js";
import { Department, DepartmentStatus, DepartmentType } from "../models/Department.model.js";
import { User } from "../models/User.model.js";
import { Shipment } from "../models/Shipment.model.js";
import { Incident } from "../models/Incedent.model.js";
import { ChatRoom, ChatRoomType } from "../models/ChatRoom.model.js";
import { Message } from "../models/Message.model.js";

import { companyPlan, IndustryType } from "../types/company.type.js";
import { UserRole, AuthProvider } from "../types/user.type.js";
import { PaymentMethod, ShipmentStatus } from "../types/shipment.type.js";
import { IncidentEntityType, IncidentSeverity, IncidentStatus } from "../types/incident.type.js";

dotenv.config();

const DEMO_COMPANY = {
  companyName: "LogiCore Demo Logistics",
  slug: "logicore-demo-logistics",
  companyEmail: "demo@logicore.app",
};

const DEFAULT_PASSWORD = "12345678";
const PASSWORD_SALT_ROUNDS = 10;

interface SeedAccount {
  userName: string;
  email: string;
  password: string;
  role: string;
}

async function clearDemoData() {
  const existingCompany = await Company.findOne({
    $or: [
      { slug: DEMO_COMPANY.slug },
      { companyEmail: DEMO_COMPANY.companyEmail },
      { companyName: DEMO_COMPANY.companyName },
    ],
  }).lean();

  if (!existingCompany) {
    return null;
  }

  const companyId = existingCompany._id;
  const rooms = await ChatRoom.find({ companyId }).select("_id").lean();
  const roomIds = rooms.map((room: any) => room._id);

  await Message.deleteMany({ roomId: { $in: roomIds } });
  await ChatRoom.deleteMany({ companyId });
  await Incident.deleteMany({ companyId });
  await Shipment.deleteMany({ companyId });
  await User.deleteMany({ companyId });
  await Department.deleteMany({ companyId });
  await Company.deleteOne({ _id: companyId });

  return companyId;
}

async function hashPassword(plainPassword: string) {
  return bcrypt.hash(plainPassword, PASSWORD_SALT_ROUNDS);
}

async function createConversationSeedData({
  company,
  csManager,
  csAgents,
  drivers,
  owner,
}: {
  company: any;
  csManager: any;
  csAgents: any[];
  drivers: any[];
  owner: any;
}) {
  const conversationSpecs = [
    {
      driver: drivers[0],
      agent: csAgents[0],
      manager: null,
      title: "Driver delivery delay follow-up",
      description: "Driver reported a delay near the downtown checkpoint and needs a quick status update.",
      status: IncidentStatus.IN_PROGRESS,
      roomTitle: "Active: Driver delivery delay follow-up",
      escalated: false,
      label: "active",
      messageCount: 14,
      baseOffsetHours: 2,
    },
    {
      driver: drivers[1],
      agent: csAgents[1],
      manager: null,
      title: "Customer refused the delivery at the gate",
      description: "The recipient refused the parcel and the driver needs a coordinated response.",
      status: IncidentStatus.RESOLVED,
      roomTitle: "Resolved: Customer refused the delivery at the gate",
      escalated: false,
      label: "resolved",
      messageCount: 12,
      baseOffsetHours: 10,
    },
    {
      driver: drivers[2],
      agent: csAgents[0],
      manager: csManager,
      title: "Priority parcel stalled at the hub",
      description: "The parcel is stalled at the hub and requires manager oversight for a fast decision.",
      status: IncidentStatus.IN_PROGRESS,
      roomTitle: "Escalated: Priority parcel stalled at the hub",
      escalated: true,
      label: "escalated",
      messageCount: 16,
      baseOffsetHours: 20,
    },
    {
      driver: drivers[3],
      agent: csAgents[1],
      manager: csManager,
      title: "Wrong address confirmation required",
      description: "The driver needs support for a wrong address confirmation before the final delivery attempt.",
      status: IncidentStatus.OPEN,
      roomTitle: "Active: Wrong address confirmation required",
      escalated: true,
      label: "escalated",
      messageCount: 15,
      baseOffsetHours: 30,
    },
  ];

  const createdRooms = [] as any[];
  for (const spec of conversationSpecs) {
    const shipment = await Shipment.create({
      companyId: company._id,
      trackingNumber: `CHAT${String(Date.now()).slice(-6)}-${spec.label}`,
      customerName: `${spec.driver.userName} Conversation Customer`,
      customerPhone: "+201000000000",
      customerEmail: `${spec.driver.email.replace("@", "+chat@")}`,
      pickupAddress: `${spec.driver.userName} pickup lane`,
      deliveryAddress: `Support desk ${spec.label}`,
      status: ShipmentStatus.INCIDENT,
      paymentMethod: PaymentMethod.CASH_ON_DELIVERY,
      codAmount: 150,
      assignedDriver: spec.driver._id,
      createdBy: owner._id,
      deliveryOtpAttempts: 0,
      importedVia: "MANUAL",
    });

    const incident = await Incident.create({
      companyId: company._id,
      title: spec.title,
      description: spec.description,
      severity: IncidentSeverity.MEDIUM,
      status: spec.status,
      relatedEntityType: IncidentEntityType.SHIPMENT,
      relatedEntityId: shipment._id,
      reportedBy: spec.driver._id,
      assignedTo: spec.agent._id,
      shipmentId: shipment._id,
      escalatedByManager: spec.escalated,
      escalatedBy: spec.escalated ? spec.manager?._id : null,
      attachments: [],
      resolvedAt: spec.status === IncidentStatus.RESOLVED ? new Date() : undefined,
      metadata: spec.escalated ? {
        escalatedToManagers: [spec.manager._id.toString()],
        escalationReason: "Manager review required",
      } : undefined,
    });

    const participants = [spec.driver._id, spec.agent._id, ...(spec.manager ? [spec.manager._id] : [])];
    const room = await ChatRoom.create({
      companyId: company._id,
      type: ChatRoomType.INCIDENT,
      participants,
      incidentId: incident._id,
      title: spec.roomTitle,
      createdById: spec.driver._id,
    });

    await Incident.updateOne({ _id: incident._id }, { chatRoomId: room._id });
    await Shipment.updateOne({ _id: shipment._id }, { activeIncidentId: incident._id });

    const participantUsers = [spec.driver, spec.agent, ...(spec.manager ? [spec.manager] : [])];
    const messageTexts = [
      `${spec.driver.userName} reported the issue and shared the latest location update.`,
      `${spec.agent.userName} confirmed the report and asked for the current stop status.`,
      `${spec.driver.userName} said the route is still affected and the customer is waiting.`,
      `${spec.agent.userName} suggested a quick workaround and requested more details.`,
      `${spec.driver.userName} described the final delivery step and the current constraint.`,
      `${spec.agent.userName} asked whether the customer can be contacted directly.`,
      `${spec.driver.userName} replied that the customer is unavailable for the moment.`,
      `${spec.agent.userName} logged the note and proposed the next dispatch step.`,
      `${spec.driver.userName} confirmed the action is underway.`,
      `${spec.agent.userName} updated the support timeline and thanked the driver.`,
      `${spec.driver.userName} noted the issue is still open for follow-up.`,
      `${spec.agent.userName} said the case is being monitored closely.`,
      `${spec.driver.userName} reported the latest checkpoint before handoff.`,
      `${spec.agent.userName} shared the final note for the incident record.`,
    ];

    const messages = [] as any[];
    for (let index = 0; index < spec.messageCount; index += 1) {
      const sender = participantUsers[index % participantUsers.length];
      const text = messageTexts[index % messageTexts.length];
      const timestamp = new Date(Date.now() - (spec.baseOffsetHours + index * 6) * 60 * 60 * 1000);
      messages.push({
        roomId: room._id,
        senderId: sender._id,
        senderName: sender.userName,
        senderRole: sender.role,
        text,
        timestamp,
      });
    }

    if (spec.label === "resolved") {
      messages.push({
        roomId: room._id,
        senderId: spec.agent._id,
        senderName: spec.agent.userName,
        senderRole: spec.agent.role,
        text: "The case is now resolved and the customer has been informed about the final outcome.",
        timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000),
      });
    }

    if (spec.escalated && spec.manager) {
      messages.push({
        roomId: room._id,
        senderId: spec.manager._id,
        senderName: spec.manager.userName,
        senderRole: spec.manager.role,
        text: "I am reviewing the escalation and will confirm the next manager decision.",
        timestamp: new Date(Date.now() - 3 * 60 * 60 * 1000),
      });
    }

    await Message.insertMany(messages);
    createdRooms.push(room);
  }

  return createdRooms;
}

async function main() {
  const mongoUri = process.env.MONGO_URI || "mongodb://localhost:27017/logicore";
  console.log(`Connecting to MongoDB at ${mongoUri}`);
  await mongoose.connect(mongoUri);
  console.log("✅ Connected to MongoDB");

  try {
    await clearDemoData();

    const ownerTempId = new mongoose.Types.ObjectId();
    const company = await Company.create({
      companyName: DEMO_COMPANY.companyName,
      slug: DEMO_COMPANY.slug,
      companyEmail: DEMO_COMPANY.companyEmail,
      phone: "+1-555-0100",
      industry: IndustryType.LOGISTICS,
      subscriptionPlan: companyPlan.PRO,
      ownerId: ownerTempId,
      isActive: true,
    });

    const owner = (await User.create({
      companyId: company._id,
      userName: "Amina Hassan",
      email: "owner@logicore.app",
      password: await hashPassword(DEFAULT_PASSWORD),
      phone: "+1-555-0101",
      role: UserRole.OWNER,
      authProvider: AuthProvider.LOCAL,
      isActive: true,
      isOnline: false,
    })) as any;

    await Company.updateOne({ _id: company._id }, { ownerId: owner._id });

    const customerServiceDepartment = (await Department.create({
      companyId: company._id,
      name: "Customer Service",
      type: DepartmentType.CS,
      status: DepartmentStatus.ACTIVE,
      maxEmployees: 12,
      location: "Cairo HQ",
      description: "Handles customer support and incident triage",
    })) as any;

    const driversDepartment = (await Department.create({
      companyId: company._id,
      name: "Drivers",
      type: DepartmentType.OPERATIONS,
      status: DepartmentStatus.ACTIVE,
      maxEmployees: 20,
      location: "Alexandria Hub",
      description: "Coordinates field drivers and delivery operations",
    })) as any;

    const csManager = (await User.create({
      companyId: company._id,
      departmentId: customerServiceDepartment._id,
      userName: "Khaled Samir",
      email: "csmanager@logicore.app",
      password: await hashPassword(DEFAULT_PASSWORD),
      phone: "+1-555-0102",
      role: UserRole.CS_MANAGER,
      authProvider: AuthProvider.LOCAL,
      isActive: true,
      isOnline: false,
    })) as any;

    const csAgents = (await User.create([
      {
        companyId: company._id,
        departmentId: customerServiceDepartment._id,
        userName: "Nour El Din",
        email: "csagent1@logicore.app",
        password: await hashPassword(DEFAULT_PASSWORD),
        phone: "+1-555-0103",
        role: UserRole.CS_AGENT,
        authProvider: AuthProvider.LOCAL,
        isActive: true,
        isOnline: false,
      },
      {
        companyId: company._id,
        departmentId: customerServiceDepartment._id,
        userName: "Mona Farouk",
        email: "csagent2@logicore.app",
        password: await hashPassword(DEFAULT_PASSWORD),
        phone: "+1-555-0104",
        role: UserRole.CS_AGENT,
        authProvider: AuthProvider.LOCAL,
        isActive: true,
        isOnline: false,
      },
    ])) as any[];

    const driverManager = (await User.create({
      companyId: company._id,
      departmentId: driversDepartment._id,
      userName: "Omar El Sayed",
      email: "drivermanager@logicore.app",
      password: await hashPassword(DEFAULT_PASSWORD),
      phone: "+1-555-0105",
      role: UserRole.DRIVER_MANAGER,
      authProvider: AuthProvider.LOCAL,
      isActive: true,
      isOnline: false,
    })) as any;

    const drivers = (await User.create([
      {
        companyId: company._id,
        departmentId: driversDepartment._id,
        userName: "Hossam Youssef",
        email: "driver1@logicore.app",
        password: await hashPassword(DEFAULT_PASSWORD),
        phone: "+1-555-0106",
        role: UserRole.DRIVER,
        authProvider: AuthProvider.LOCAL,
        isActive: true,
        isOnline: false,
      },
      {
        companyId: company._id,
        departmentId: driversDepartment._id,
        userName: "Yara Ibrahim",
        email: "driver2@logicore.app",
        password: await hashPassword(DEFAULT_PASSWORD),
        phone: "+1-555-0107",
        role: UserRole.DRIVER,
        authProvider: AuthProvider.LOCAL,
        isActive: true,
        isOnline: false,
      },
      {
        companyId: company._id,
        departmentId: driversDepartment._id,
        userName: "Samir Abdallah",
        email: "driver3@logicore.app",
        password: await hashPassword(DEFAULT_PASSWORD),
        phone: "+1-555-0108",
        role: UserRole.DRIVER,
        authProvider: AuthProvider.LOCAL,
        isActive: true,
        isOnline: false,
      },
      {
        companyId: company._id,
        departmentId: driversDepartment._id,
        userName: "Layla Nabil",
        email: "driver4@logicore.app",
        password: await hashPassword(DEFAULT_PASSWORD),
        phone: "+1-555-0109",
        role: UserRole.DRIVER,
        authProvider: AuthProvider.LOCAL,
        isActive: true,
        isOnline: false,
      },
    ])) as any[];

    await Department.updateOne({ _id: customerServiceDepartment._id }, { managerId: csManager._id });
    await Department.updateOne({ _id: driversDepartment._id }, { managerId: driverManager._id });

    const shipmentStatuses = [
      ShipmentStatus.CREATED,
      ShipmentStatus.ASSIGNED,
      ShipmentStatus.PICKED_UP,
      ShipmentStatus.IN_TRANSIT,
      ShipmentStatus.OUT_FOR_DELIVERY,
      ShipmentStatus.DELIVERED,
      ShipmentStatus.DELAYED,
      ShipmentStatus.INCIDENT,
    ];

    const shipments = [] as any[];
    for (let index = 0; index < 20; index += 1) {
      const assignedDriver = drivers[index % drivers.length] as any;
      const shipmentStatus = shipmentStatuses[index % shipmentStatuses.length] ?? ShipmentStatus.CREATED;
      const shipment = await Shipment.create({
        companyId: company._id,
        trackingNumber: `LC${String(index + 1).padStart(4, "0")}`,
        customerName: `Customer ${index + 1}`,
        customerPhone: `+20${1000000000 + index}`,
        customerEmail: `customer${index + 1}@example.com`,
        pickupAddress: `${index + 1} El Haram Street, Cairo`,
        deliveryAddress: `${index + 1} Tahrir Square, Giza`,
        currentLocation: index % 2 === 0 ? "Cairo Hub" : "Alexandria Hub",
        status: shipmentStatus,
        paymentMethod: index % 2 === 0 ? PaymentMethod.CASH_ON_DELIVERY : PaymentMethod.PREPAID_ONLINE,
        codAmount: 120 + index * 15,
        assignedDriver: assignedDriver._id,
        estimatedDeliveryTime: new Date(Date.now() + (index + 1) * 3600 * 1000),
        createdBy: owner._id,
        deliveryOtpAttempts: 0,
        importedVia: "MANUAL",
      });
      shipments.push(shipment);
    }

    const incidentStatuses = [IncidentStatus.OPEN, IncidentStatus.IN_PROGRESS, IncidentStatus.RESOLVED];
    const incidentSeverities = [IncidentSeverity.LOW, IncidentSeverity.MEDIUM, IncidentSeverity.HIGH, IncidentSeverity.CRITICAL];
    const incidentTitles = [
      "Delayed delivery at first checkpoint",
      "Customer reported damaged package",
      "Wrong delivery address supplied",
      "Driver missed promised delivery window",
      "Package arrived without seal",
      "Recipient unavailable at delivery time",
      "Driver requested reroute due to road closure",
      "Customer refused package on arrival",
      "Shipment stalled near customs checkpoint",
      "Priority parcel needs urgent attention",
    ];

    const incidents = [] as any[];
    for (let index = 0; index < 20; index += 1) {
      const shipment = shipments[index] as any;
      const reporter = drivers[index % drivers.length] as any;
      const assignedAgent = (index < 10 ? csAgents[0] : csAgents[1]) as any;
      const status = incidentStatuses[index % incidentStatuses.length] ?? IncidentStatus.OPEN;
      const shouldEscalate = index % 4 === 0 || index % 4 === 2;
      const shouldEscalateToMultipleManagers = index % 5 === 0;
      const escalatedManagerIds = shouldEscalate
        ? [
            shouldEscalateToMultipleManagers ? csManager._id : driverManager._id,
            ...(shouldEscalateToMultipleManagers ? [owner._id, driverManager._id] : []),
          ]
        : [];
      const incidentPayload: any = {
        companyId: company._id,
        title: incidentTitles[index % incidentTitles.length],
        description: `Incident ${index + 1} for shipment ${shipment.trackingNumber}. The issue requires follow-up from support and dispatch teams.`,
        severity: incidentSeverities[index % incidentSeverities.length],
        status,
        relatedEntityType: IncidentEntityType.SHIPMENT,
        relatedEntityId: shipment._id,
        reportedBy: reporter._id,
        assignedTo: assignedAgent._id,
        shipmentId: shipment._id,
        escalatedByManager: shouldEscalate,
        attachments: [],
      };
      if (shouldEscalate) {
        incidentPayload.escalatedBy = shouldEscalateToMultipleManagers ? owner._id : csManager._id;
        incidentPayload.metadata = {
          escalatedToManagers: escalatedManagerIds.map((id: mongoose.Types.ObjectId) => id.toString()),
          escalationReason: shouldEscalateToMultipleManagers ? "Cross-functional oversight" : "Manager review required",
        };
      }
      if (status === IncidentStatus.RESOLVED) {
        incidentPayload.resolvedAt = new Date();
      }
      const incident = await Incident.create(incidentPayload);

      incidents.push(incident);
      await Shipment.updateOne({ _id: shipment._id }, { activeIncidentId: incident._id });
      if (incident.status === IncidentStatus.RESOLVED) {
        await Shipment.updateOne({ _id: shipment._id }, { status: ShipmentStatus.INCIDENT });
      }
    }

    for (let index = 0; index < incidents.length; index += 1) {
      const incident = incidents[index] as any;
      const reporter = (await User.findById(incident.reportedBy)) as any;
      const assignedAgent = (await User.findById(incident.assignedTo)) as any;
      const escalationManager = incident.escalatedBy ? ((await User.findById(incident.escalatedBy)) as any) : null;
      const participants = [
        incident.reportedBy,
        incident.assignedTo,
        ...(incident.escalatedBy ? [incident.escalatedBy] : []),
      ].filter(Boolean);

      const room = await ChatRoom.create({
        companyId: company._id,
        type: ChatRoomType.INCIDENT,
        participants,
        incidentId: incident._id,
        title: incident.escalatedByManager
          ? `Escalated: ${incident.title}`
          : incident.status === IncidentStatus.RESOLVED
            ? `Resolved: ${incident.title}`
            : `Active: ${incident.title}`,
        createdById: incident.assignedTo || incident.reportedBy,
      });

      await Incident.updateOne({ _id: incident._id }, { chatRoomId: room._id });

      const messageTemplates = [
        {
          senderId: reporter?._id,
          senderName: reporter?.userName || "Reporter",
          senderRole: reporter?.role || "DRIVER",
          text: "I have updated the shipment status and uploaded the latest notes.",
        },
        {
          senderId: assignedAgent?._id,
          senderName: assignedAgent?.userName || "Support Agent",
          senderRole: assignedAgent?.role || "CS_AGENT",
          text: "I am reviewing the shipment details and will coordinate the next update.",
        },
      ];

      if (incident.escalatedByManager && escalationManager) {
        messageTemplates.push({
          senderId: escalationManager._id,
          senderName: escalationManager.userName,
          senderRole: escalationManager.role,
          text: "I am reviewing the escalation and will confirm the final resolution path.",
        });
      }

      if (incident.status === IncidentStatus.RESOLVED) {
        messageTemplates.push({
          senderId: assignedAgent?._id,
          senderName: assignedAgent?.userName || "Support Agent",
          senderRole: assignedAgent?.role || "CS_AGENT",
          text: "The case has been resolved and the customer has been informed.",
        });
      } else {
        messageTemplates.push({
          senderId: reporter?._id,
          senderName: reporter?.userName || "Reporter",
          senderRole: reporter?.role || "DRIVER",
          text: "The latest delivery attempt is still pending confirmation.",
        });
      }

      await Message.insertMany(
        messageTemplates.map((message, messageIndex) => ({
          roomId: room._id,
          senderId: message.senderId,
          senderName: message.senderName,
          senderRole: message.senderRole,
          text: message.text,
          timestamp: new Date(Date.now() - (messageIndex + 1) * 15 * 60 * 1000),
        }))
      );
    }

    await createConversationSeedData({
      company,
      csManager,
      csAgents,
      drivers,
      owner,
    });

    const seededRoomIds = await ChatRoom.find({ companyId: company._id }).select("_id").lean();
    const totalUsers = await User.countDocuments({ companyId: company._id });
    const totalIncidents = await Incident.countDocuments({ companyId: company._id });
    const totalChatRooms = await ChatRoom.countDocuments({ companyId: company._id });
    const totalMessages = await Message.countDocuments({ roomId: { $in: seededRoomIds.map((room: any) => room._id) } });

    const seedAccounts: SeedAccount[] = [
      { userName: owner.userName, email: owner.email, password: DEFAULT_PASSWORD, role: owner.role },
      { userName: csManager.userName, email: csManager.email, password: DEFAULT_PASSWORD, role: csManager.role },
      { userName: csAgents[0].userName, email: csAgents[0].email, password: DEFAULT_PASSWORD, role: csAgents[0].role },
      { userName: csAgents[1].userName, email: csAgents[1].email, password: DEFAULT_PASSWORD, role: csAgents[1].role },
      { userName: driverManager.userName, email: driverManager.email, password: DEFAULT_PASSWORD, role: driverManager.role },
      ...drivers.map((driver: any) => ({ userName: driver.userName, email: driver.email, password: DEFAULT_PASSWORD, role: driver.role })),
    ];

    console.log("\nGenerated login accounts:");
    seedAccounts.forEach((account) => {
      console.log(`- ${account.userName} | ${account.email} | ${account.password} | ${account.role}`);
    });

    console.log("\nSeed totals:");
    console.log(`- total users: ${totalUsers}`);
    console.log(`- total incidents: ${totalIncidents}`);
    console.log(`- total chat rooms: ${totalChatRooms}`);
    console.log(`- total messages: ${totalMessages}`);

    console.log("\n✅ Seed completed successfully");
  } catch (error) {
    console.error("❌ Seed failed", error);
    process.exitCode = 1;
  } finally {
    await mongoose.disconnect();
    console.log("🔌 Disconnected from MongoDB");
  }
}

main();
