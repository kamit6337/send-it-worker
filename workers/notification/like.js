import redisClient, { redisPub } from "../../redis/redisClient.js";
import filterFollowerIds from "../../utils/javaScript/filterFollowerIds.js";
import Notification from "../../models/NotificationModel.js";

const likeWorker = async (userId) => {
  const key = `like-batch-list:${userId}`;

  const likeRaw = await redisClient.lrange(key, 0, -1);

  const uniquePostIds = await redisClient.smembers(
    `like-unqiue-postId:${userId}`
  );

  const allLikesSenderAndPost = likeRaw.map(JSON.parse);

  if (uniquePostIds.length === 0 || allLikesSenderAndPost.length === 0) return;

  const uniquePostIdWithLikes = uniquePostIds.map((postId) => {
    const filterLike = allLikesSenderAndPost.filter(
      (obj) => obj.post._id === postId
    );
    return { post: postId, like: filterLike };
  });

  const newNotificationList = uniquePostIdWithLikes.map((obj) => {
    const { post, like } = obj;

    const allSenderIds = [...new Set(like.map((obj) => obj.sender._id))];

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
  await redisClient.del(`like-unqiue-postId:${userId}`);
};

export default likeWorker;
