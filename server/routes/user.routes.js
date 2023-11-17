import { Router } from "express";
import {
  register,
  login,
  logout,
  getProfile,
  forgotPassword,
  resetPassword,
  changePassword,
  updateProfile,
} from "../controllers/user.controllers.js";
import { isLoggedIn } from "../middlewares/auth.middleware.js";
import uploadImg from "../middlewares/multer.middleware.js";

const router = Router();

router.post("/register", uploadImg.single("avatar"), register);
router.post("/login", login);
router.get("/logout", logout);
router.get("/getProfile", isLoggedIn, getProfile);
router.post("/resetPassword", forgotPassword);
router.post("/resetPassword/:resetToken", resetPassword);
router.post("/changePassword", isLoggedIn, changePassword);
router.put(
  "/update/:id",
  isLoggedIn,
  uploadImg.single("avatar"),
  updateProfile
);

export default router;
