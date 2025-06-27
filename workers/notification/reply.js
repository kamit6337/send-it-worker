import redisClient, { redisPub } from "../../redis/redisClient.js";
import filterFollowerIds from "../../utils/javaScript/filterFollowerIds.js";
import createNewNotificationDB from "../../database/Notification/createNewNotificationDB.js";

const replyWorker = async (userId) => {
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

        const allSenderIds = [...new Set(reply.map((obj) => obj.sender._id))];

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

    const notificationIds = promises.map((obj) => obj._id?.toString());

    await redisPub.publish("notification", JSON.stringify(notificationIds));

    console.log(`[Worker] Sent reply notification to user ${userId}`);
  }
  await redisClient.del(key);
  await redisClient.del(`reply-unqiue-postId:${userId}`);
};

export default replyWorker;
