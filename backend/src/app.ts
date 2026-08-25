import express, { type Application, type Request, type Response } from 'express';
import cors from 'cors';
import morgan from 'morgan';
import helmet from 'helmet';

import companyRoutes from "./Routes/company.routes.js";
import userRoutes from "./Routes/user.routes.js";
import shipmentRoutes from "./Routes/shipment.routes.js";
import authRoutes from "./Routes/auth.routes.js";
import incidentRoutes from "./Routes/incident.routes.js";
import analyticsRoutes from "./Routes/analytics.routes.js";
import settlementRoutes from "./Routes/settlement.routes.js"
import departmentRoutes from "./Routes/department.routes.js";
import chatRoomRoutes from "./Routes/chatRoom.routes.js";


const app: Application = express();
// Middlewares
app.use(cors());
app.use(express.json({ limit: "5mb" }));

app.use(morgan('combined'));
app.use(helmet());



// Routes
app.use("/api/auth", authRoutes);
app.use("/api/company", companyRoutes);
app.use("/api/users", userRoutes);
app.use("/api/shipments", shipmentRoutes);
app.use("/api/incidents", incidentRoutes);
app.use("/api/analytics", analyticsRoutes);
app.use("/api/settlements", settlementRoutes);
app.use("/api/departments", departmentRoutes);
app.use("/api/chat-rooms", chatRoomRoutes);

export default app;
