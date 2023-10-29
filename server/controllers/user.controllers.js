import AppError from "../utils/error.utils.js";
import User from "../models/user.models.js";
import cloudinary from "cloudinary";
import fs from "fs/promises";

//cookie options
const cookieOptions = {
  maxAge: 7 * 24 * 60 * 60 * 1000, //7days
  httpOnly: true,
  secure: true,
};

// register controller
const register = async (req, res, next) => {
  const { username, email, password } = req.body;

  //if any field is empty
  if (!username || !email || !password) {
    return next(new AppError("All fileds are required", 400));
  }

  // find user and check if user exists
  const userExists = await User.findOne({ email });
  if (userExists) {
    return next(new AppError("Email already exists", 400));
  }

  const user = await User.create({
    username,
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
    console.log(req.file);
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
const login = async (req, res) => {
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
const getProfile = async (req, res) => {
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

export { register, login, logout, getProfile };
