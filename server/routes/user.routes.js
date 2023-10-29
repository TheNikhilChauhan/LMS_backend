import { Router } from "express";
import {
  register,
  login,
  logout,
  getProfile,
} from "../controllers/user.controllers.js";
import { isLoggedIn } from "../middlewares/auth.middleware.js";
import uploadImg from "../middlewares/multer.middleware.js";

const router = Router();

router.post("/register", uploadImg.single("avatar"), register);
router.post("/login", login);
router.get("/logout", logout);
router.get("/getProfile", isLoggedIn, getProfile);

export default router;
