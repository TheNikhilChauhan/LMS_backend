import { Router } from "express";
import {
  createCourse,
  getAllCourses,
  getLecturesByCourseId,
  removeCourse,
  updateCourse,
} from "../controllers/course.controllers.js";
import { isLoggedIn } from "../middlewares/auth.middleware.js";

const router = Router();

router.get("/", getAllCourses);
router.post("/createCourse", createCourse);
router.patch("/:id", updateCourse);
router.get("/:id", isLoggedIn, getLecturesByCourseId);
router.delete("/:id", removeCourse);

export default router;
