import assert from "node:assert/strict";
import test from "node:test";
import mongoose from "mongoose";
import { pathToFileURL } from "node:url";

const controllerModuleUrl = pathToFileURL("./src/controllers/incidentAction.controller.ts").href;
const incidentModelUrl = pathToFileURL("./src/models/Incedent.model.ts").href;
const chatRoomModelUrl = pathToFileURL("./src/models/ChatRoom.model.ts").href;
const socketModuleUrl = pathToFileURL("./src/socket/socket.ts").href;

test("escalateToManager accepts multiple managers and adds each to the incident room", async () => {
  const { IncidentActionController } = await import(controllerModuleUrl);
  const { Incident } = await import(incidentModelUrl);
  const { ChatRoom } = await import(chatRoomModelUrl);
  const socketModule = await import(socketModuleUrl);

  const originalIncidentFindOne = Incident.findOne;
  const originalChatRoomFindOne = ChatRoom.findOne;
  const originalChatRoomCreate = ChatRoom.create;
  const originalChatRoomFindById = ChatRoom.findById;

  const createdRoomPayloads: any[] = [];
  const incident = {
    _id: new mongoose.Types.ObjectId(),
    companyId: new mongoose.Types.ObjectId(),
    reportedBy: new mongoose.Types.ObjectId(),
    title: "Test incident",
    status: "OPEN",
    escalatedByManager: false,
    escalatedBy: undefined,
    chatRoomId: undefined,
    save: async function () { return this; },
  };

  (Incident as typeof Incident & { findOne: typeof Incident.findOne }).findOne = (async () => incident) as any;

  (ChatRoom as typeof ChatRoom & { findOne: typeof ChatRoom.findOne }).findOne = (async () => null) as any;

  (ChatRoom as typeof ChatRoom & { create: typeof ChatRoom.create }).create = (async (payload: any) => {
    createdRoomPayloads.push(payload);
    return {
      _id: new mongoose.Types.ObjectId(),
      ...payload,
      save: async function () { return this; },
    };
  }) as any;

  (ChatRoom as typeof ChatRoom & { findById: typeof ChatRoom.findById }).findById = ((id: any) => ({
    populate: () => ({
      populate: () => ({
        lean: async () => ({ _id: id, participants: [] })
      })
    })
  })) as any;

  try {
    const controller = new IncidentActionController();
    const req = {
      params: { id: incident._id.toString() },
      body: { managerIds: [new mongoose.Types.ObjectId().toString(), new mongoose.Types.ObjectId().toString()], issueTitle: "Escalation" },
      user: { companyId: incident.companyId.toString(), sub: new mongoose.Types.ObjectId().toString(), role: "CS_AGENT" },
    } as any;
    const res = {
      status: (code: number) => ({ json: (body: any) => ({ code, body }) }),
    } as any;

    await controller.escalateToManager(req, res);

    assert.equal(createdRoomPayloads.length, 1);
    const participants = createdRoomPayloads[0].participants.map((p: any) => String(p));
    assert.ok(participants.includes(String(incident.reportedBy)));
    assert.ok(participants.includes(String(req.user.sub)));
    assert.ok(participants.includes(String(req.body.managerIds[0])));
    assert.ok(participants.includes(String(req.body.managerIds[1])));
    assert.equal(incident.assignedTo?.toString(), req.body.managerIds[0]);
  } finally {
    (Incident as typeof Incident & { findOne: typeof Incident.findOne }).findOne = originalIncidentFindOne;
    (ChatRoom as typeof ChatRoom & { findOne: typeof ChatRoom.findOne }).findOne = originalChatRoomFindOne;
    (ChatRoom as typeof ChatRoom & { create: typeof ChatRoom.create }).create = originalChatRoomCreate;
    (ChatRoom as typeof ChatRoom & { findById: typeof ChatRoom.findById }).findById = originalChatRoomFindById;
  }
});
