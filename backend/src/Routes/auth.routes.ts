import { Router } from "express";
import { AuthController } from "../controllers/auth.controller.js";
import { validate } from "../middlewares/validate.middleware.js";
import { loginSchema, registerSchema } from "../validations/auth.validation.js";

const router = Router();
const controller = new AuthController();

router.post("/register", validate(registerSchema), controller.register.bind(controller));
router.post("/login", validate(loginSchema), controller.login.bind(controller));
router.post("/logout", controller.logout.bind(controller));

export default router;
