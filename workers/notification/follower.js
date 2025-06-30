import redisClient, { redisPub } from "../../redis/redisClient.js";
import filterFollowerIds from "../../utils/javaScript/filterFollowerIds.js";
import Notification from "../../models/NotificationModel.js";

const followerWorker = async (userId) => {
  const key = `follower-batch-list:${userId}`;

  const followers = await redisClient.smembers(key);

  if (followers.length === 0) return;

  const savingFollowerIds = filterFollowerIds(followers);

  const newNotificationObj = {
    user: userId,
    type: "follower",
    sender: savingFollowerIds,
    totalSenders: followers.length,
  };

  const newNotification = await Notification.create(newNotificationObj);

  await redisPub.publish(
    "notification",
    JSON.stringify([newNotification._id?.toString()])
  );

  console.log(`[Worker] Sent Follower notification to user ${userId}`);
  await redisClient.del(key);
};

export default followerWorker;
