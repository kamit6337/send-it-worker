import mongoose from "mongoose";
import validation from "validator";
import { hashUserPassword } from "../lib/bcrypt.js";
import Follower from "../models/FollowerModel.js";

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    email: {
      type: String,
      required: true,
      unique: true,
      validate: {
        validator: function (value) {
          return validation.isEmail(value);
        },
        message: (props) => `${props.value} is not a valid email`,
      },
    },
    password: {
      type: String,
      default: "",
      trim: true,
    },
    photo: {
      type: String,
      default: [true, "Please provide pic"],
      trim: true,
    },
    bg_photo: {
      type: String,
      default: "",
      trim: true,
    },
    bio: {
      type: String,
      default: "",
      trim: true,
    },
    location: {
      type: String,
      default: "",
      trim: true,
    },
    website: {
      type: String,
      default: "",
      trim: true,
    },
    OAuthId: {
      type: String,
      default: null,
      select: false,
    },
    OAuthProvider: {
      type: String,
      default: null,
      select: false,
    },
    role: {
      type: String,
      enum: ["user", "admin"],
      default: "user",
    },
    passwordLastUpdated: {
      type: Date,
      default: Date.now(),
    },
  },
  {
    timestamps: true,
  }
);

userSchema.index({ email: 1 });

userSchema.pre("save", async function (next) {
  if (this.isModified("password")) {
    await hashUserPassword(this); // Hash only if password is modified.
  }

  next();
});

userSchema.post("save", async function (doc, next) {
  try {
    await Follower.create({
      user: doc._id,
      follower: doc._id,
    });

    next();
  } catch (error) {
    console.error("Failed to create self-follower:", err);
    next(err); // optionally pass error, or just call next() if not critical
  }
});

const User = mongoose.model("User", userSchema);

export default User;
