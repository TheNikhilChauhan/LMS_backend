import Course from "../models/course.models.js";
import AppError from "../utils/error.utils.js";

const getAllCourses = async (req, res, next) => {
  try {
    const courses = await Course.find({}).select("-lectures");

    res.status(200).json({
      success: true,
      message: "All the courses",
      courses,
    });
  } catch (error) {
    return next(new AppError(error.message, 500));
  }
};

const createCourse = async (req, res, next) => {};

const updateCourse = async (req, res, next) => {};

const getLecturesByCourseId = async (req, res, next) => {
  try {
    res.status(200).json({
      success: true,
      message: "Course lectures fetched successfully",
      lectures: course.lectures,
    });
  } catch (error) {
    return next(new AppError(error.message, 500));
  }
};

const removeCourse = async (req, res, next) => {};

export {
  getAllCourses,
  getLecturesByCourseId,
  createCourse,
  updateCourse,
  removeCourse,
};
