import dotenv from "dotenv";
dotenv.config();
import express from "express";
import { environment } from "./utils/environment.js";
import connectToDB from "./lib/connectToDB.js";
const PORT = environment.PORT || 8080;
const app = express();
import "./workers/notification/index.js";

try {
  console.log("Connecting to MongoDB...");
  await connectToDB();

  app.listen(PORT, () => {
    console.log(`Server is connected on port ${PORT}`);
  });
} catch (error) {
  console.error("Failed to start server:", error);
}
