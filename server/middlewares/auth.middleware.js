import User from "../models/user.models.js";
import AppError from "../utils/error.utils.js";
import jwt from "jsonwebtoken";

const isLoggedIn = async (req, res, next) => {
  const { token } = req.cookies;

  if (!token) {
    return next(new AppError("Unauthenticated, Please login again", 401));
  }

  const userDetails = await jwt.verify(token, process.env.JWT_SECRET);

  req.user = userDetails;

  next();
};

const authorizedRole =
  (...role) =>
  async (req, res, next) => {
    const currentUserRole = req.user.role;
    if (!role.includes(currentUserRole)) {
      return next(
        new AppError("You do not have permission to access this route", 403)
      );
    }
    next();
  };

const authorizeSubscribers = async (req, res, next) => {
  const user = await User.findById(req.user.id);
  if (user.role !== "ADMIN" && user.subscription.status !== "active") {
    return next(new AppError("Please subscribe to access this route.", 403));
  }

  next();
};

export { isLoggedIn, authorizedRole, authorizeSubscribers };
