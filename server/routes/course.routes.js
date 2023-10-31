import { Router } from "express";
import {
  createCourse,
  getAllCourses,
  getLecturesByCourseId,
  removeCourse,
  updateCourse,
} from "../controllers/course.controllers.js";
import { isLoggedIn } from "../middlewares/auth.middleware.js";
import uploadImg from "../middlewares/multer.middleware.js";

const router = Router();

router.get("/", getAllCourses);
router.post("/", uploadImg.single("thumbnail"), createCourse);
router.patch("/:id", uploadImg.single("thumbnail"), updateCourse);
router.get("/:id", isLoggedIn, getLecturesByCourseId);
router.delete("/:id", removeCourse);

export default router;
