import { Worker } from "bullmq";
import redisClient, { createWorkerRedis } from "../../redis/redisClient.js";
import filterFollowerIds from "../../utils/javaScript/filterFollowerIds.js";
import createNewNotificationDB from "../../database/Notification/createNewNotificationDB.js";

// BullMQ connection — don't use this for native Redis commands
const bullConnection = createWorkerRedis();

// Worker to process batch after 5 minutes
const worker = new Worker(
  "reply-batch",
  async (job) => {
    try {
      const { userId } = job.data;

      const key = `reply-batch-list:${userId}`;

      const replyRaw = await redisClient.lrange(key, 0, -1);

      const uniquePostIds = await redisClient.smembers(
        `reply-unqiue-postId:${userId}`
      );

      const allReplysSenderAndPost = replyRaw.map(JSON.parse);

      if (uniquePostIds.length > 0 && allReplysSenderAndPost.length > 0) {
        const uniquePostIdWithReply = uniquePostIds.map((postId) => {
          const filterReply = allReplysSenderAndPost.filter(
            (obj) => obj.post._id === postId
          );
          return { post: postId, reply: filterReply };
        });

        const promises = await Promise.all(
          uniquePostIdWithReply.map((obj) => {
            const { post, reply } = obj;

            const allSenderIds = [
              ...new Set(reply.map((obj) => obj.sender._id)),
            ];

            const savingSenderIds = filterFollowerIds(allSenderIds);

            const newNotificationObj = {
              user: userId,
              type: "reply",
              sender: savingSenderIds,
              totalSenders: allSenderIds.length,
              post,
            };

            return createNewNotificationDB(newNotificationObj);
          })
        );

        console.log("new notification", promises);

        console.log(`[Worker] Sent reply notification to user ${userId}`);

        // promises.forEach((promise) => {
        //   const notificationData = JSON.parse(JSON.stringify(promise));

        //   const findPost = allReplysSenderAndPost.find(
        //     (obj) =>
        //       obj.post._id?.toString() === notificationData.post?.toString()
        //   )?.post;

        //   const senders = notificationData.sender
        //     .map((userId) => {
        //       return allReplysSenderAndPost.find(
        //         (obj) => obj.sender._id === userId?.toString()
        //       )?.sender;
        //     })
        //     .filter(Boolean);

        //   io.to(userId).emit("notification", {
        //     ...notificationData,
        //     message: notificationMsg(notificationData),
        //     sender: senders,
        //     post: findPost,
        //   });
        // });

        // const notificationCount = await getNotificationCountByUserIdDB(userId);
        // io.to(userId).emit("notification-count", notificationCount);
      }
      await redisClient.del(key);
      await redisClient.del(`reply-unqiue-postId:${userId}`);
    } catch (error) {
      console.error("Worker error:", error);
      throw error; // BullMQ will retry automatically
    }
  },
  { connection: bullConnection }
);

// --- Worker Events ---
worker.on("completed", (job) => {
  console.log(`[Worker] Job ${job.id} Reply completed`);
});

worker.on("failed", (job, err) => {
  console.error(`[Worker] Job ${job.id} Reply failed:`, err);
});

worker.on("error", (err) => {
  console.error(`[Worker] Worker Reply error:`, err);
});

console.log("[Worker] reply batch worker started");
