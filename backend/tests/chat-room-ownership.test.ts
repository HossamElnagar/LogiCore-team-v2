import assert from "node:assert/strict";
import test from "node:test";
import mongoose from "mongoose";
import { pathToFileURL } from "node:url";
import { UserRole } from "../src/types/user.type.js";

test("CS_AGENT chat-room listing preserves the existing ownership workflow", async () => {
  const companyId = new mongoose.Types.ObjectId().toString();
  const agentId = new mongoose.Types.ObjectId().toString();
  const otherAgentId = new mongoose.Types.ObjectId().toString();

  const userModuleUrl = pathToFileURL("./src/models/User.model.ts").href;
  const controllerModuleUrl = pathToFileURL("./src/controllers/chatRoom.controller.ts").href;
  const chatRoomModuleUrl = pathToFileURL("./src/models/ChatRoom.model.ts").href;

  const userModule = await import(userModuleUrl);
  const { ChatRoomController } = await import(controllerModuleUrl);
  const { ChatRoom } = await import(chatRoomModuleUrl);

  const controller = new ChatRoomController();
  const originalChatRoomFind = ChatRoom.find;
  const originalUserFind = userModule.User.find;
  const capturedQueries: any[] = [];

  (ChatRoom as typeof ChatRoom & { find: typeof ChatRoom.find }).find = ((query: any) => {
    capturedQueries.push(query);
    return {
      populate: () => ({
        populate: () => ({
          sort: () => ({
            lean: async () => [],
          }),
        }),
      }),
    } as any;
  }) as typeof ChatRoom.find;

  (userModule.User as typeof userModule.User & { find: typeof userModule.User.find }).find = ((query: any) => {
    assert.deepEqual(query, { companyId: new mongoose.Types.ObjectId(companyId), role: UserRole.CS_AGENT });
    return {
      select: () => ({
        lean: async () => [{ _id: new mongoose.Types.ObjectId(otherAgentId) }],
      }),
    } as any;
  }) as typeof userModule.User.find;

  try {
    const req = {
      user: {
        companyId,
        sub: agentId,
        role: UserRole.CS_AGENT,
      },
      query: {},
    } as any;

    const res = {
      status: (code: number) => ({ json: (body: any) => ({ code, body }) }),
    } as any;

    await controller.getRooms(req, res);

    assert.equal(capturedQueries.length, 1);
    const query = capturedQueries[0];
    assert.ok(query.$or);
    assert.equal(String(query.$or[0].participants), agentId);
    assert.ok(query.$or[1].participants.$not.$elemMatch.$in.some((id: any) => String(id) === otherAgentId));
  } finally {
    (ChatRoom as typeof ChatRoom & { find: typeof ChatRoom.find }).find = originalChatRoomFind;
    (userModule.User as typeof userModule.User & { find: typeof userModule.User.find }).find = originalUserFind;
  }
});

test("CS_MANAGER and OWNER requests keep access to all chat rooms", async () => {
  const controllerModuleUrl = pathToFileURL("./src/controllers/chatRoom.controller.ts").href;
  const chatRoomModuleUrl = pathToFileURL("./src/models/ChatRoom.model.ts").href;

  const { ChatRoomController } = await import(controllerModuleUrl);
  const { ChatRoom } = await import(chatRoomModuleUrl);

  const controller = new ChatRoomController();
  const companyId = new mongoose.Types.ObjectId().toString();
  const originalChatRoomFind = ChatRoom.find;
  const capturedQueries: any[] = [];

  (ChatRoom as typeof ChatRoom & { find: typeof ChatRoom.find }).find = ((query: any) => {
    capturedQueries.push(query);
    return {
      populate: () => ({
        populate: () => ({
          sort: () => ({
            lean: async () => [],
          }),
        }),
      }),
    } as any;
  }) as typeof ChatRoom.find;

  try {
    const req = {
      user: {
        companyId,
        sub: new mongoose.Types.ObjectId().toString(),
        role: UserRole.CS_MANAGER,
      },
      query: {},
    } as any;

    const res = {
      status: (code: number) => ({ json: (body: any) => ({ code, body }) }),
    } as any;

    await controller.getRooms(req, res);

    assert.equal(capturedQueries.length, 1);
    const query = capturedQueries[0];
    assert.equal(String(query.companyId), companyId);
    assert.equal(query.$or, undefined);
  } finally {
    (ChatRoom as typeof ChatRoom & { find: typeof ChatRoom.find }).find = originalChatRoomFind;
  }
});
