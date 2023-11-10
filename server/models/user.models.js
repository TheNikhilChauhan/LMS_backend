import { Schema, model } from "mongoose";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import crypto from "crypto";
import dotenv from "dotenv";
dotenv.config();

const userSchema = new Schema(
  {
    fullname: {
      type: String,
      required: [true, "Name is required"],
      minLength: [5, "Name must be greater than 5 characters"],
      maxLength: [50, "Name must not exceed 50 characters"],
      lowercase: true,
      trim: true,
    },
    email: {
      type: String,
      required: [true, "Email is required"],
      unique: true,
      lowercase: true,
      trim: true,
      match: [
        /^(([^<>()[\]\\.,;:\s@"]+(\.[^<>()[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/,
        "Please fill in a valid email address",
      ], // Matches email against regex
    },
    password: {
      type: String,
      required: [true, "Password is required"],
      minLength: [8, "Password must be at least 8 characters"],
      select: false,
    },
    avatar: {
      public_id: {
        type: String,
      },
      secure_url: {
        type: String,
      },
    },
    role: {
      type: String,
      enum: ["USER", "ADMIN"],
      default: "USER",
    },
    subscription: {
      id: String,
      status: String,
    },
    forgotPasswordToken: String,
    forgotPasswordExpiry: Date,
  },
  {
    timestamps: true,
  }
);

userSchema.pre("save", async function (next) {
  if (!this.isModified("password")) {
    return next();
  }
  this.password = await bcrypt.hash(this.password, 10);
});

userSchema.methods = {
  comparePassword: async function (plainTextPassword) {
    return await bcrypt.compare(plainTextPassword, this.password);
  },
  generateJWTToken: async function () {
    return await jwt.sign(
      {
        id: this._id,
        subscription: this.subscription,
        role: this.role,
      },
      process.env.JWT_SECRET,
      {
        expiresIn: process.env.JWT_EXPIRY,
      }
    );
  },

  generatePasswordResetToken: async function () {
    const resetToken = crypto.randomBytes(32).toString("hex");

    this.forgotPasswordToken = crypto
      .createHash("sha256")
      .update(resetToken)
      .digest("hex");
    this.forgotPasswordExpiry = Date.now() + 15 * 60 * 1000; // 15 min from now

    return resetToken;
  },
};

const User = model("User", userSchema);

export default User;

// NOTE:-

//Schema.pre:  is used to define middleware functions that
// are executed before specific operations on a document,
// such as save, validate, or remove.
// Middleware functions defined with schema.pre are
// executed at various points in the lifecycle of a
// document, such as before it is saved to the database or validated.

//Schema.methods: is used to define instance methods
//that can be called on individual documents created from
// a schema.
// These methods are available on individual document
// instances and allow you to define custom behavior that
// can be performed on specific documents.
