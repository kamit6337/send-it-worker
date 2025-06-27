import redisClient, { redisPub } from "../../redis/redisClient.js";
import filterFollowerIds from "../../utils/javaScript/filterFollowerIds.js";
import createNewNotificationDB from "../../database/Notification/createNewNotificationDB.js";
import uniqueObjectFromArray from "../../utils/javaScript/uniqueObjectFromArray.js";

const followerWorker = async (userId) => {
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

    const newNotification = await createNewNotificationDB(newNotificationObj);

    await redisPub.publish(
      "follower-notification",
      newNotification._id?.toString()
    );

    console.log(`[Worker] Sent Follower notification to user ${userId}`);
  }
  await redisClient.del(key);
};

export default followerWorker;
