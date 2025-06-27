import dotenv from "dotenv";
dotenv.config();

export const environment = {
  PROJECT_NAME: process.env.PROJECT_NAME,

  PORT: process.env.PORT,
  NODE_ENV: process.env.NODE_ENV,
  MONGO_DB_URI: process.env.MONGO_DB_URI,

  MY_GMAIL_ID: process.env.MY_GMAIL_ID,
  MY_GMAIL_PASSWORD: process.env.MY_GMAIL_PASSWORD,

  REDIS_URL: process.env.REDIS_URL,
};
