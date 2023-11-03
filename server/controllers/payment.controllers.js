import { pay } from "../index.js";
import User from "../models/user.model.js";
import AppError from "../utils/error.utils.js";

export const buySubscription = async (req, res, next) => {
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
  const subscription = await pay.subscriptions.create({
    plan_id: process.env.PLAN_ID,
    customer_notify: 1, // 1 means razorpay will handle notifying the customer, 0 means we will not notify the customer
    total_count: 6, // 6 means it will charge bi-monthly basis for a 1-year sub.
  });

  user.subscription.id = subscription.id;
  user.subscription.status = subscription.status;

  await user.save();

  res.status(200).json({
    success: true,
    message: "Subscribed successfully",
    subscription_id: subscription.id,
  });
};

export const getRazorpayApiKey = async (req, res, next) => {
  res.status(200).json({
    success: true,
    message: "Payment API Key",
    key: process.env.KEY_ID,
  });
};

export const verifySubscription = async (req, res, next) => {
  const { id } = req.user;
  const { payment_id, subscription_id, signature } = req.body;

  const user = await User.findById(id);

  const subscriptionId = user.subscription.id;

  // Generating a signature with SHA256 for verification purposes
  // Here the subscriptionId should be the one which we saved in the DB
  // razorpay_payment_id is from the frontend and there should be a '|' character between this and subscriptionId
  // At the end convert it to Hex value
  const generateSignature = crypto
    .createHmac("sha256", process.env.KEY_SECRET)
    .update(`${payment_id} | ${subscriptionId}`)
    .digest("hex");

  // Check if generated signature and signature received from the frontend is the same or not
  if (generateSignature !== signature) {
    return next(new AppError("Payment not verified, please try again.", 400));
  }

  // If they match create payment and store it in the DB
  await Payment.create({
    payment_id,
    subscription_id,
    signature,
  });

  user.subscription.status = "active";

  await user.save();

  res.status(200).json({
    success: true,
    message: "Payment verified successfully",
  });
};

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
    const subscription = await pay.subscriptions.cancel(
      subscriptionId // subscription id
    );

    // Adding the subscription status to the user account
    user.subscription.status = subscription.status;

    // Saving the user object
    await user.save();
  } catch (error) {
    // Returning error if any, and this error is from razorpay so we have statusCode and message built in
    return next(new AppError(error.error.description, error.statusCode));
  }

  // Finding the payment using the subscription ID
  const payment = await Payment.findOne({
    subscription_id: subscriptionId,
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
};

export const allPayments = async (req, res, next) => {
  const { count, skip } = req.query;

  // Find all subscriptions from razorpay
  const allPayments = await pay.subscriptions.all({
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
