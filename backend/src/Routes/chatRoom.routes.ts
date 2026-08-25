import { Router } from "express";
import { ChatRoomController } from "../controllers/chatRoom.controller.js";
import { authenticate } from "../middlewares/userAuth.middleware.js";

const router = Router();
const controller = new ChatRoomController();

router.get(
  "/",
  authenticate,
  controller.getRooms.bind(controller)
);

// Static routes MUST come before dynamic /:id routes
router.post(
  "/escalate",
  authenticate,
  controller.createManagerEscalationRoom.bind(controller)
);

router.post(
  "/incident/:incidentId",
  authenticate,
  controller.getOrCreateIncidentRoom.bind(controller)
);

router.get(
  "/:id/messages",
  authenticate,
  controller.getMessages.bind(controller)
);

router.post(
  "/:id/resolve",
  authenticate,
  controller.resolveRoom.bind(controller)
);

export default router;
