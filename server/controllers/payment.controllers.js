import { razorpay } from "../index.js";
import crypto from "crypto";
import User from "../models/user.models.js";
import AppError from "../utils/error.utils.js";
import Payment from "../models/Payment.models.js";
import dotenv from "dotenv";
import asyncHandler from "../middlewares/asyncHandler.middleware.js";

dotenv.config();

export const buySubscription = asyncHandler(async (req, res, next) => {
  try {
    //extract id from request obj
    const { id } = req.user;

    //finding the usr based on the ID
    const user = await User.findById(id);

    if (!user) {
      return next(new AppError("Unauthorized, please login"));
    }

    if (user.role === "ADMIN") {
      return next(new AppError("Admin cannot purchase a subscription", 400));
    }

    // Creating a subscription using razorpay that we imported from the server
    const subscription = await razorpay.subscriptions.create({
      plan_id: process.env.RAZORPAY_PLAN_ID,
      customer_notify: 1, // 1 means razorpay will handle notifying the customer, 0 means we will not notify the customer
      total_count: 12,
    });

    user.subscription.id = subscription.id;
    user.subscription.status = subscription.status;

    await user.save();

    res.status(200).json({
      success: true,
      message: "Subscribed successfully",
      subscription_id: subscription.id,
    });
  } catch (error) {
    return next(
      new AppError(error.message || "Error while creating subscripton", 500)
    );
  }
});

export const getRazorpayApiKey = async (_req, res, _next) => {
  res.status(200).json({
    success: true,
    message: "Payment API Key",
    key: process.env.RAZORPAY_KEY_ID,
  });
};

export const verifySubscription = asyncHandler(async (req, res, next) => {
  const { id } = req.user;
  const { razorpay_payment_id, razorpay_subscription_id, razorpay_signature } =
    req.body;

  const user = await User.findById(id);

  const subscriptionId = user.subscription.id;

  // Generating a signature with SHA256 for verification purposes
  // Here the subscriptionId should be the one which we saved in the DB
  // razorpay_payment_id is from the frontend and there should be a '|' character between this and subscriptionId
  // At the end convert it to Hex value
  const generateSignature = crypto
    .createHmac("sha256", process.env.RAZORPAY_SECRET)
    .update(`${razorpay_payment_id}|${subscriptionId}`)
    .digest("hex");

  // Check if generated signature and signature received from the frontend is the same or not
  if (generateSignature !== razorpay_signature) {
    return next(new AppError("Payment not verified, please try again.", 400));
  }

  // If they match create payment and store it in the DB
  await Payment.create({
    razorpay_payment_id,
    razorpay_subscription_id,
    razorpay_signature,
  });

  user.subscription.status = "active";

  await user.save();

  res.status(200).json({
    success: true,
    message: "Payment verified successfully",
  });
});

export const cancelSubscription = async (req, res, next) => {
  const { id } = req.user;

  const user = await User.findById(id);

  if (user.role === "ADMIN") {
    return next(
      new AppError("Admin does not need to cancel subscription", 400)
    );
  }

  // Finding subscription ID from subscription
  const subscriptionId = user.subscription.id;

  // Creating a subscription using razorpay that we imported from the server
  try {
    const subscription = await razorpay.subscriptions.cancel(
      subscriptionId // subscription id
    );

    console.log(subscription.status);
    // Adding the subscription status to the user account
    user.subscription.status = subscription.status;
    console.log(user.subscription.status);

    // Saving the user object
    await user.save();
  } catch (error) {
    // Returning error if any, and this error is from razorpay so we have statusCode and message built in
    return next(new AppError(error.error.description, error.statusCode));
  }

  // Finding the payment using the subscription ID
  const payment = await Payment.findOne({
    razorpay_subscription_id: subscriptionId,
  });

  // Getting the time from the date of successful payment (in milliseconds)
  const timeSinceSubscribed = Date.now() - payment.createdAt;

  // refund period which in our case is 14 days
  const refundPeriod = 14 * 24 * 60 * 60 * 1000;

  // Check if refund period has expired or not
  if (refundPeriod <= timeSinceSubscribed) {
    return next(
      new AppError(
        "Refund period is over, so there will not be any refunds provided.",
        400
      )
    );
  }

  // If refund period is valid then refund the full amount that the user has paid
  await razorpay.payments.refund(payment.razorpay_payment_id, {
    speed: "optimum", // This is required
  });

  user.subscription.id = undefined; // Remove the subscription ID from user DB
  user.subscription.status = undefined; // Change the subscription Status in user DB

  await user.save();
  await payment.depopulate();

  // Send the response
  res.status(200).json({
    success: true,
    message: "Subscription canceled successfully",
  });
};

export const allPayments = async (req, res, next) => {
  const { count, skip } = req.query;

  // Find all subscriptions from razorpay
  const allPayments = await razorpay.subscriptions.all({
    count: count ? count : 10, // If count is sent then use that else default to 10
    skip: skip ? skip : 0, // // If skip is sent then use that else default to 0
  });

  const monthNames = [
    "January",
    "February",
    "March",
    "April",
    "May",
    "June",
    "July",
    "August",
    "September",
    "October",
    "November",
    "December",
  ];

  const finalMonths = {
    January: 0,
    February: 0,
    March: 0,
    April: 0,
    May: 0,
    June: 0,
    July: 0,
    August: 0,
    September: 0,
    October: 0,
    November: 0,
    December: 0,
  };

  //`monthlyWisePayments` contains the names of the months corresponding to each payment.
  const monthlyWisePayments = allPayments.items.map((payment) => {
    const monthsInNumbers = new Date(payment.start_at * 1000);

    return monthNames[monthsInNumbers.getMonth()];
  });

  monthlyWisePayments.map((month) => {
    Object.keys(finalMonths).forEach((objMonth) => {
      if (month === objMonth) {
        finalMonths[month] += 1;
      }
    });
  });

  const monthlySalesRecord = [];

  Object.keys(finalMonths).forEach((monthName) => {
    monthlySalesRecord.push(finalMonths[monthName]);
  });

  //Object.keys(finalMonths) converts it into array
  //the count for each month is appended to the monthlySalesRecord array in the same order as the months, resulting in an array of sales or payment counts.

  res.status(200).json({
    success: true,
    message: "All Payments",
    allPayments,
    finalMonths,
    monthlySalesRecord,
  });
};
