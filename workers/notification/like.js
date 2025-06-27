import redisClient, { redisPub } from "../../redis/redisClient.js";
import filterFollowerIds from "../../utils/javaScript/filterFollowerIds.js";
import createNewNotificationDB from "../../database/Notification/createNewNotificationDB.js";

const likeWorker = async (userId) => {
  const key = `like-batch-list:${userId}`;

  const likeRaw = await redisClient.lrange(key, 0, -1);

  const uniquePostIds = await redisClient.smembers(
    `like-unqiue-postId:${userId}`
  );

  const allLikesSenderAndPost = likeRaw.map(JSON.parse);

  if (uniquePostIds.length > 0 && allLikesSenderAndPost.length > 0) {
    const uniquePostIdWithLikes = uniquePostIds.map((postId) => {
      const filterLike = allLikesSenderAndPost.filter(
        (obj) => obj.post._id === postId
      );
      return { post: postId, like: filterLike };
    });

    const promises = await Promise.all(
      uniquePostIdWithLikes.map((obj) => {
        const { post, like } = obj;

        const allSenderIds = [...new Set(like.map((obj) => obj.sender._id))];

        const savingSenderIds = filterFollowerIds(allSenderIds);

        const newNotificationObj = {
          user: userId,
          type: "like",
          sender: savingSenderIds,
          totalSenders: allSenderIds.length,
          post,
        };

        return createNewNotificationDB(newNotificationObj);
      })
    );

    const notificationIds = promises.map((obj) => obj._id?.toString());

    await redisPub.publish(
      "like-notification",
      JSON.stringify(notificationIds)
    );

    console.log(`[Worker] Sent Like notification to user ${userId}`);
    // promises.forEach((promise) => {
    //   const notificationData = JSON.parse(JSON.stringify(promise));

    //   const findPost = allLikesSenderAndPost.find(
    //     (obj) =>
    //       obj.post._id?.toString() === notificationData.post?.toString()
    //   )?.post;

    //   const senders = notificationData.sender
    //     .map((userId) => {
    //       return allLikesSenderAndPost.find(
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
  await redisClient.del(`like-unqiue-postId:${userId}`);
};

export default likeWorker;
