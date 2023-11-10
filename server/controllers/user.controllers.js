import AppError from "../utils/error.utils.js";
import User from "../models/user.models.js";
import cloudinary from "cloudinary";
import fs from "fs/promises";
import sendEmail from "../utils/sendEmail.js";
import crypto from "crypto";

//cookie options
const cookieOptions = {
  maxAge: 7 * 24 * 60 * 60 * 1000, //7days
  httpOnly: true,
  secure: true,
};

// register controller
const register = async (req, res, next) => {
  const { fullname, email, password } = req.body;

  //if any field is empty
  if (!fullname || !email || !password) {
    return next(new AppError("All fileds are required", 400));
  }

  // find user and check if user exists
  const userExists = await User.findOne({ email });
  if (userExists) {
    return next(new AppError("Email already exists", 400));
  }

  const user = await User.create({
    fullname,
    email,
    password,
    avatar: {
      public_id: email,
      secure_url: email,
    },
  });

  if (!user) {
    return next(
      new AppError("User registration failed, please try again", 400)
    );
  }

  //TODO file upload
  if (req.file) {
    try {
      const result = await cloudinary.v2.uploader.upload(req.file.path, {
        folder: "lms", // file will be saved in lms folder
        width: 250,
        height: 250,
        gravity: "faces",
        crop: "fill",
      });
      console.log(result);
      if (result) {
        // Set the public_id and secure_url in DB
        user.avatar.public_id = result.public_id;
        user.avatar.secure_url = result.secure_url;

        //Remove file from local system or server: saving on cloudinary
        fs.rm(`uploads/${req.file.filename}`);
      }
    } catch (error) {
      return next(
        new AppError(error || "File not uploaded, please try again", 400)
      );
    }
  }

  await user.save();

  const token = await user.generateJWTToken();
  user.password = undefined;
  res.cookie("token", token, cookieOptions);

  res.status(201).json({
    success: true,
    message: "User registered successfully",
    user,
  });
};

//login controller
const login = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return next(new AppError("All fields are required", 400));
    }
    const user = await User.findOne({ email }).select("+password");

    if (!user || !user.comparePassword(password)) {
      return next(new AppError("Email or password does not match!", 400));
    }

    const token = await user.generateJWTToken();
    user.password = undefined;

    res.cookie("token", token, cookieOptions);

    res.status(200).json({
      success: true,
      message: "User logged in successfully!",
      user,
    });
  } catch (error) {
    return next(new AppError(error.message, 500));
  }
};

//logout controller
const logout = (req, res) => {
  res.cookie("token", null, {
    secure: true,
    maxAge: 0,
    httpOnly: true,
  });
  res.status(200).json({
    success: true,
    message: "User logged out successfully!",
  });
};

//get user Profile controller
const getProfile = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const user = await User.findById(userId);

    res.status(200).json({
      success: true,
      message: "User details",
      user,
    });
  } catch (error) {
    return next(new AppError("Failed to fetch the User Detail", 500));
  }
};

//forgot password
const forgotPassword = async (req, res, next) => {
  const { email } = req.body;
  //check if email is entered
  if (!email) {
    return next(new AppError("Email is required", 400));
  }

  //check if user with email exists or not
  const user = await User.findOne({ email });
  if (!user) {
    return next(new AppError("Email is not registered", 400));
  }

  const resetToken = await user.generatePasswordResetToken();
  console.log(resetToken);
  await user.save();

  const resetPasswordURL = `${process.env.FRONTEND_URL}/resetPassword/${resetToken}`;
  console.log(resetPasswordURL);
  const subject = "Reset Password for LMS";
  const message = `You can reset your password by clicking  <a href=${resetPasswordURL} target="_blank"> Reset Password</a>`;

  try {
    await sendEmail(email, subject, message);

    res.status(200).json({
      success: true,
      message: `Reset Password token has been sent to ${email} successfully`,
    });
  } catch (error) {
    //if any error occurs and fail to get the mail then
    // we will set it undefined so that user can ask for forgot password email from frontend again
    user.forgotPasswordExpiry = undefined;
    user.forgotPasswordToken = undefined;

    await user.save();
    return next(new AppError(error.message, 500));
  }
};

//reset password
const resetPassword = async (req, res, next) => {
  const { resetToken } = req.params;

  const { password } = req.body;

  const forgotPasswordToken = crypto
    .createHash("sha256")
    .update(resetToken)
    .digest("hex");

  console.log("forgotPToken", forgotPasswordToken);
  const user = await User.findOne({
    forgotPasswordToken,
    forgotPasswordExpiry: { $gt: Date.now() },
  });
  console.log("USerPToken", user.forgotPasswordToken);

  if (!user) {
    return next(
      new AppError("Token is invalid or expired, Please try again", 400)
    );
  }

  user.password = password;
  user.forgotPasswordToken = undefined;
  user.forgotPasswordExpiry = undefined;

  user.save();

  res.status(200).json({
    success: true,
    message: "Password changed successfully",
  });
};

//change user password
const changePassword = async (req, res, next) => {
  const { oldPassword, newPassword } = req.body;
  const { id } = req.user;

  if (!oldPassword || !newPassword) {
    return next(
      new AppError("Old password and new password are required ", 400)
    );
  }

  const user = await User.findById(id).select("+password");

  if (!user) {
    return next(new AppError("Invalid user id or user does not exists", 400));
  }

  // Check if the old password is correct
  const isPasswordValid = await user.comparePassword(oldPassword);

  // If the old password is not valid then throw an error message
  if (!isPasswordValid) {
    return next(new AppError("Invalid old password", 400));
  }

  // Setting the new password
  user.password = newPassword;

  // Save the data in DB
  await user.save();

  // Setting the password undefined so that it won't get sent in the response
  user.password = undefined;

  res.status(200).json({
    success: true,
    message: "Password changed successfully",
  });
};

const updateProfile = async (req, res, next) => {
  const { fullname } = req.body;
  const id = req.user.id;

  const user = await User.findById(id);

  if (!user) {
    return next(new AppError("User does not exists", 400));
  }

  //update fullname
  if (fullname) {
    user.fullname = fullname;
  }

  //destroy old img and update new image
  if (req.file) {
    await cloudinary.v2.uploader.destroy(user.avatar.public_id);
    try {
      const result = await cloudinary.v2.uploader.upload(req.file.path, {
        folder: "lms",
        width: 250,
        height: 250,
        gravity: "faces",
        crop: "fill",
      });

      if (result) {
        user.avatar.public_id = result.public_id;
        user.avatar.secure_url = result.secure_url;

        //remove file from server
        fs.rm(`uploads/${req.file.filename}`);
      }
    } catch (error) {
      return next(
        new AppError(error || "File not uploaded, please try again ", 500)
      );
    }
  }
  await user.save();

  res.status(200).json({
    success: true,
    message: "Profile updated successfully!",
  });
};

export {
  register,
  login,
  logout,
  getProfile,
  forgotPassword,
  resetPassword,
  updateProfile,
  changePassword,
};
