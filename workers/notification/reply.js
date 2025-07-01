import redisClient, { redisPub } from "../../redis/redisClient.js";
import filterFollowerIds from "../../utils/javaScript/filterFollowerIds.js";
import Notification from "../../models/NotificationModel.js";

const replyWorker = async (userId) => {
  const key = `reply-batch-list:${userId}`;

  const replyRaw = await redisClient.lrange(key, 0, -1);

  const allReplysSenderAndPost = replyRaw.map(JSON.parse);

  if (allReplysSenderAndPost.length === 0) return;

  const replyObj = {};

  allReplysSenderAndPost.forEach((obj) => {
    const { sender, post } = obj;
    if (replyObj[post]) {
      replyObj[post] = [...new Set([sender, ...replyObj[post]])];
    } else {
      replyObj[post] = [sender];
    }
  });

  const newNotificationList = Object.keys(replyObj).map((post) => {
    const allSenderIds = likeObj[post];

    const savingSenderIds = filterFollowerIds(allSenderIds);

    return {
      user: userId,
      type: "reply",
      sender: savingSenderIds,
      senderIds: allSenderIds,
      totalSenders: allSenderIds.length,
      post,
    };
  });

  const newNotifications = await Notification.insertMany(newNotificationList);

  const notificationIds = newNotifications.map((obj) => obj._id?.toString());

  await redisPub.publish("notification", JSON.stringify(notificationIds));

  console.log(`[Worker] Sent reply notification to user ${userId}`);
  await redisClient.del(key);
};

export default replyWorker;
