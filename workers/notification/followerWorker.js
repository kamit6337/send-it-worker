import { Worker } from "bullmq";
import redisClient, { createWorkerRedis } from "../../redis/redisClient.js";
import uniqueObjectFromArray from "../../utils/javaScript/uniqueObjectFromArray.js";
import filterFollowerIds from "../../utils/javaScript/filterFollowerIds.js";
import createNewNotificationDB from "../../database/Notification/createNewNotificationDB.js";

// BullMQ connection — don't use this for native Redis commands
const bullConnection = createWorkerRedis();

// Worker to process batch after 5 minutes
const worker = new Worker(
  "follow-batch",
  async (job) => {
    try {
      const { userId } = job.data;

      const key = `follow-batch-list:${userId}`;

      const followersRaw = await redisClient.lrange(key, 0, -1);
      const followers = followersRaw.map(JSON.parse);

      if (followers.length > 0) {
        const uniqueFollowers = uniqueObjectFromArray(followers);

        const followerIds = uniqueFollowers.map((follower) => follower._id);

        const savingFollowerIds = filterFollowerIds(followerIds);

        const newNotificationObj = {
          user: userId,
          type: "follower",
          sender: savingFollowerIds,
          totalSenders: followerIds.length,
        };

        const newNotification = await createNewNotificationDB(
          newNotificationObj
        );

        console.log(`[Worker] Sent follow notification to user ${userId}`);

        let notification = JSON.parse(JSON.stringify(newNotification));

        const modifySender = savingFollowerIds.map((userId) => {
          return uniqueFollowers.find((follower) => follower._id === userId);
        });

        notification = { ...notification, sender: modifySender };

        // io.to(userId).emit("notification", {
        //   message: notificationMsg(notification),
        //   ...notification,
        // });

        // const notificationCount = await getNotificationCountByUserIdDB(userId);

        // io.to(userId).emit("notification-count", notificationCount);
      }
      await redisClient.del(key);
    } catch (error) {
      console.error("Worker error:", error);
      throw error; // BullMQ will retry automatically
    }
  },
  { connection: bullConnection }
);

// --- Worker Events ---
worker.on("completed", (job) => {
  console.log(`[Worker] Job ${job.id} Follower completed`);
});

worker.on("failed", (job, err) => {
  console.error(`[Worker] Job ${job.id} Follower failed:`, err);
});

worker.on("error", (err) => {
  console.error(`[Worker] Worker Follower error:`, err);
});

console.log("[Worker] Follow batch worker started");
