import mongoose from "mongoose";
import process from "node:process";
import { User } from "../models/User.model.js";
import { Shipment } from "../models/Shipment.model.js";
import { Company } from "../models/Company.model.js";
import { ChatRoom, ChatRoomType } from "../models/ChatRoom.model.js";
import { Incident } from "../models/Incedent.model.js";
import { Message } from "../models/Message.model.js";
import { UserRole } from "../types/user.type.js";
import { IncidentService } from "../services/incident.service.js";
import { ChatRoomController } from "../controllers/chatRoom.controller.js";
import { IncidentActionController } from "../controllers/incidentAction.controller.js";
import { PaymentMethod, ShipmentStatus } from "../types/shipment.type.js";

const incidentService = new IncidentService();
const actionController = new IncidentActionController();
const chatRoomController = new ChatRoomController();

async function runTest() {
  const mongoUri = process.env.MONGO_URI || "mongodb://localhost:27017/logicore";
  console.log(`Connecting to ${mongoUri}`);
  await mongoose.connect(mongoUri);
  console.log("✅ Connected to MongoDB.");

  try {
    // 1. Setup Mock Entities
    console.log("\n[1] Setting up mock entities...");
    const company = await (Company as any).create({ name: "E2E Test Co", owner: new mongoose.Types.ObjectId() });
    
    const driver = await (User as any).create({
      userName: "Test Driver",
      email: "driver@test.com",
      role: UserRole.DRIVER,
      companyId: company._id,
      authProvider: "LOCAL",
    });

    const driverManager = await (User as any).create({
      userName: "Test Driver Manager",
      email: "dmanager@test.com",
      role: UserRole.DRIVER_MANAGER,
      companyId: company._id,
      authProvider: "LOCAL",
    });

    const csManager = await (User as any).create({
      userName: "Test CS Manager",
      email: "csmanager@test.com",
      role: UserRole.CS_MANAGER,
      companyId: company._id,
      authProvider: "LOCAL",
    });

    const csAgent = await (User as any).create({
      userName: "Test CS Agent",
      email: "csagent@test.com",
      role: UserRole.CS_AGENT,
      companyId: company._id,
      authProvider: "LOCAL",
    });

    // 2. Create Shipment
    console.log("\n[2] Creating test shipment...");
    const shipment = await (Shipment as any).create({
      trackingNumber: `TEST-${Date.now()}`,
      companyId: company._id,
      assignedDriver: driver._id,
      status: ShipmentStatus.OUT_FOR_DELIVERY,
      codAmount: 100,
      paymentMethod: PaymentMethod.CASH_ON_DELIVERY,
      customerDetails: { name: "Bob", phone: "123", address: "123 Test St", location: { type: "Point", coordinates: [0, 0] } }
    });
    console.log(`✅ Shipment created: ${shipment._id}`);

    // 3. Log Incident (Auto-creates ChatRoom)
    console.log("\n[3] Logging Incident (Triggering ChatRoom auto-creation)...");
    const incidentResult = await incidentService.logAdminIncident(
      { shipmentId: shipment._id.toString(), reason: "PACKAGE_DAMAGED" as any, comment: "Box is wet" },
      company._id.toString(),
      driver._id.toString(), // Mocking as if the admin logged it on driver's behalf
      UserRole.DRIVER_MANAGER
    );
    
    const incident = incidentResult.incident;
    console.log(`✅ Incident logged: ${incident._id}`);

    // Verify ChatRoom Creation & Participants
    const chatRoom = await ChatRoom.findOne({ incidentId: incident._id });
    if (!chatRoom) throw new Error("ChatRoom was not automatically created!");
    if (chatRoom.type !== ChatRoomType.INCIDENT) throw new Error("ChatRoom is not INCIDENT type!");
    
    const participants = chatRoom.participants.map(p => String(p));
    if (!participants.includes(String(driver._id))) throw new Error("Driver missing from room!");
    if (!participants.includes(String(driverManager._id))) throw new Error("Driver Manager missing from room!");
    console.log(`✅ ChatRoom created (${chatRoom._id}) with correct initial participants.`);

    // 4. Assign CS Agent
    console.log("\n[4] Assigning CS Agent to Incident...");
    // Mock express req/res
    const reqAssign: any = {
      params: { id: incident._id.toString() },
      body: { agentId: csAgent._id.toString() },
      user: { companyId: company._id.toString() }
    };
    let assignPayload: any;
    const resAssign: any = {
      status: (code: number) => ({ json: (data: any) => { assignPayload = data; return resAssign; } })
    };

    await actionController.assignAgent(reqAssign, resAssign);
    if (!assignPayload?.success) throw new Error(assignPayload?.message);
    
    const updatedRoom = await ChatRoom.findById(chatRoom._id);
    if (!updatedRoom?.participants.map(p => String(p)).includes(String(csAgent._id))) {
      throw new Error("CS Agent was not injected into ChatRoom participants!");
    }
    console.log("✅ CS Agent dynamically injected into ChatRoom participants.");

    // 5. Simulate sending a message
    console.log("\n[5] Simulating message send (saving to MongoDB)...");
    const msg = await (Message as any).create({
      roomId: updatedRoom._id,
      senderId: csAgent._id,
      senderName: csAgent.userName,
      senderRole: csAgent.role,
      text: "I am looking into this now."
    });
    console.log(`✅ Message saved: ${msg._id}`);

    // 6. Resolve Incident ChatRoom
    console.log("\n[6] Resolving ChatRoom...");
    const reqResolve: any = {
      params: { id: updatedRoom._id.toString() },
      user: { sub: csAgent._id.toString(), role: UserRole.CS_AGENT, companyId: company._id.toString() }
    };
    let resolvePayload: any;
    const resResolve: any = {
      status: (code: number) => ({ json: (data: any) => { resolvePayload = data; return resResolve; } })
    };

    await chatRoomController.resolveRoom(reqResolve, resResolve);
    if (!resolvePayload?.success) throw new Error(resolvePayload?.message);
    
    const finalIncident = await Incident.findById(incident._id);
    if (finalIncident?.status !== "RESOLVED") throw new Error("Incident not resolved!");
    console.log("✅ Incident successfully resolved via REST endpoint.");

    console.log("\n🎉 E2E Incident Workflow Verification Completed Successfully!");

  } catch (error) {
    console.error("\n❌ Test Failed:", error);
  } finally {
    // Cleanup
    console.log("\n[7] Cleaning up database...");
    await Company.deleteMany({ name: "E2E Test Co" });
    await User.deleteMany({ email: { $in: ["driver@test.com", "dmanager@test.com", "csmanager@test.com", "csagent@test.com"] } });
    await mongoose.connection.db?.collection("shipments").deleteMany({ trackingNumber: { $regex: /^TEST-/ } });
    await mongoose.connection.db?.collection("incidents").deleteMany({});
    await mongoose.connection.db?.collection("chatrooms").deleteMany({});
    await mongoose.connection.db?.collection("messages").deleteMany({});
    
    await mongoose.disconnect();
    console.log("✅ Disconnected.");
  }
}

runTest();
