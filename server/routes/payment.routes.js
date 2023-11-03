import { Router } from "express";
import {
  authorizeSubscribers,
  authorizedRole,
  isLoggedIn,
} from "../middlewares/auth.middleware.js";
import {
  allPayments,
  buySubscription,
  cancelSubscription,
  getRazorpayApiKey,
  verifySubscription,
} from "../controllers/payment.controllers.js";

const router = Router();

router.post("/subscribe", isLoggedIn, buySubscription);
router.post("/verify", isLoggedIn, verifySubscription);
router.post(
  "/unsubscribe",
  isLoggedIn,
  authorizeSubscribers,
  cancelSubscription
);
router.get("/razorpay-key", isLoggedIn, getRazorpayApiKey);
router.get("/", isLoggedIn, authorizedRole("ADMIN"), allPayments);

export default router;
