import { Router } from "express";
import {
  addLecturesByCourseId,
  createCourse,
  getAllCourses,
  getLecturesByCourseId,
  removeCourse,
  removeLectureFromCourse,
  updateCourse,
} from "../controllers/course.controllers.js";
import { authorizedRole, isLoggedIn } from "../middlewares/auth.middleware.js";
import uploadImg from "../middlewares/multer.middleware.js";

const router = Router();

router.get("/", getAllCourses);
router.post(
  "/",
  isLoggedIn,
  authorizedRole("ADMIN"),
  uploadImg.single("thumbnail"),
  createCourse
);
router.patch(
  "/:id",
  isLoggedIn,
  authorizedRole("ADMIN"),
  uploadImg.single("thumbnail"),
  updateCourse
);
router.get("/:id", isLoggedIn, getLecturesByCourseId);
router.delete("/:id", isLoggedIn, authorizedRole("ADMIN"), removeCourse);
router.post(
  "/:id",
  isLoggedIn,
  authorizedRole("ADMIN"),
  uploadImg.single("lecture"),
  addLecturesByCourseId
);
router.delete(
  "/",
  isLoggedIn,
  authorizedRole("ADMIN"),
  removeLectureFromCourse
);

export default router;
