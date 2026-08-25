import { createServer } from "http";
import app from "./app.js";
import { initSocket } from "./socket/socket.js";

// require mongoose
import mongoose from "mongoose";

// require dotenv
import dotenv from "dotenv";
dotenv.config();

const PORT = process.env.PORT || 5000;

// Wrap Express in a standard Node HTTP server so Socket.io can attach to it
const httpServer = createServer(app);

// Initialize Socket.io on the HTTP server
initSocket(httpServer);

mongoose.connect(process.env.MONGO_URI as string)
  .then(() => {
    console.log("MongoDB connected");

    httpServer.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
      console.log(`Socket.io ready on ws://localhost:${PORT}`);
    });
  })
  .catch((err) => {
    console.log(err);
  });