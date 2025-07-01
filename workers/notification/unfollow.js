import redisClient, { redisPub } from "../../redis/redisClient.js";
import filterFollowerIds from "../../utils/javaScript/filterFollowerIds.js";
import Notification from "../../models/NotificationModel.js";

const unfollowWorker = async (userId) => {
  const key = `unfollow-batch-list:${userId}`;

  const followers = await redisClient.smembers(key);

  if (followers.length === 0) return;

  const savingFollowerIds = filterFollowerIds(followers);

  const newNotificationObj = {
    user: userId,
    type: "unfollow",
    sender: savingFollowerIds,
    senderIds: followers,
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

export default unfollowWorker;
