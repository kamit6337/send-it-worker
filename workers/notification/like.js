import redisClient, { redisPub } from "../../redis/redisClient.js";
import filterFollowerIds from "../../utils/javaScript/filterFollowerIds.js";
import Notification from "../../models/NotificationModel.js";

const likeWorker = async (userId) => {
  const key = `like-batch-list:${userId}`;

  const likeRaw = await redisClient.lrange(key, 0, -1);

  const allLikesSenderAndPost = likeRaw.map(JSON.parse);
  // [{sender, post}, {sender, post}]

  if (allLikesSenderAndPost.length === 0) return;

  const likeObj = {};

  allLikesSenderAndPost.forEach((obj) => {
    const { sender, post } = obj;
    if (likeObj[post]) {
      likeObj[post] = [...new Set([sender, ...likeObj[post]])];
    } else {
      likeObj[post] = [sender];
    }
  });

  const newNotificationList = Object.keys(likeObj).map((post) => {
    const allSenderIds = likeObj[post];

    const savingSenderIds = filterFollowerIds(allSenderIds);

    return {
      user: userId,
      type: "like",
      sender: savingSenderIds,
      totalSenders: allSenderIds.length,
      post,
    };
  });

  console.log("newNotificationList", newNotificationList);

  const newNotifications = await Notification.insertMany(newNotificationList);

  const notificationIds = newNotifications.map((obj) => obj._id?.toString());

  await redisPub.publish("notification", JSON.stringify(notificationIds));

  console.log(`[Worker] Sent Like notification to user ${userId}`);

  await redisClient.del(key);
};

export default likeWorker;
