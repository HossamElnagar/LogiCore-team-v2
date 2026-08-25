import { Router } from "express";
import { AnalyticsController } from "../controllers/analytics.controller.js";
import { authenticate } from "../middlewares/userAuth.middleware.js";

const router = Router();
const controller = new AnalyticsController();

router.get("/dashboard", authenticate, controller.getDashboard.bind(controller));

export default router;
