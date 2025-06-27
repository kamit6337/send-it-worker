import { Worker } from "bullmq";
import redisClient, { createWorkerRedis } from "../../redis/redisClient.js";
import ObjectID from "../../lib/ObjectID.js";
import Chat from "../../models/ChatModel.js";

// BullMQ connection — don't use this for native Redis commands
const bullConnection = createWorkerRedis();

// Worker to process batch after 5 minutes
const worker = new Worker(
  "chat-batch",
  async (job) => {
    try {
      const { roomId } = job.data;

      if (!roomId) throw new Error("RoomId is not provided");

      const chatIds = await redisClient.zrevrange(`Chat_Room:${roomId}`, 0, -1);

      if (!chatIds || chatIds.length === 0) return;

      const chatMsgs = await Promise.all(
        chatIds.map((chatId) => redisClient.hgetall(`Chat_Msg:${chatId}`))
      );

      if (!chatMsgs || chatMsgs.length === 0) return;

      const updateChatMsgs = chatMsgs.map((c) => ({
        ...c,
        _id: ObjectID(c._id),
        createdAt: new Date(Number(c.createdAt)),
        updatedAt: new Date(Number(c.updatedAt)),
      }));

      const result = await Chat.insertMany(updateChatMsgs);

      console.log("result", result);

      await redisClient.zrem(`Chat_Room:${roomId}`, ...chatIds);

      await Promise.all(
        chatIds.map((chatId) => redisClient.del(`Chat_Msg:${chatId}`))
      );
    } catch (error) {
      console.error("Worker error:", error);
      throw error; // BullMQ will retry automatically
    }
  },
  { connection: bullConnection }
);

// --- Worker Events ---
worker.on("completed", (job) => {
  console.log(`[Worker] Job ${job.id} Chat completed`);
});

worker.on("failed", (job, err) => {
  console.error(`[Worker] Job ${job.id} Chat failed:`, err);
});

worker.on("error", (err) => {
  console.error(`[Worker] Worker Chat error:`, err);
});

console.log("[Worker] Chat batch worker started");
