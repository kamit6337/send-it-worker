import { Worker } from "bullmq";
import { createWorkerRedis } from "../../redis/redisClient.js";
import followerWorker from "./follower.js";
import likeWorker from "./like.js";
import replyWorker from "./reply.js";

// BullMQ connection — don't use this for native Redis commands
const bullConnection = createWorkerRedis();

// Worker to process batch after 5 minutes

const notificationTypes = ["follower", "like", "reply"];

const worker = new Worker(
  "notification-batch",
  async (job) => {
    try {
      const message = job.name;
      const { userId } = job.data;

      if (message === `notification-follower`) {
        await followerWorker(userId);
      } else if (message === `notification-like`) {
        await likeWorker(userId);
      } else if (message === `notification-reply`) {
        await replyWorker(userId);
      } else {
        throw new Error("Message is Wrong");
      }
    } catch (error) {
      console.error("Worker error:", error);
      throw error; // BullMQ will retry automatically
    }
  },
  { connection: bullConnection }
);

// --- Worker Events ---
worker.on("completed", (job) => {
  console.log(`[Worker] Job ${job.id} of Notification completed`);
});

worker.on("failed", (job, err) => {
  console.error(`[Worker] Job ${job.id} of Notification failed:`, err);
});

worker.on("error", (err) => {
  console.error(`[Worker] Worker of Notification error:`, err);
});

console.log("[Worker] Notification batch worker started");
