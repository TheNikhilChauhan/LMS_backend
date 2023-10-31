import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import morgan from "morgan";
import dbConnect from "./config/dbConfig.js";
import userRoutes from "./routes/user.routes.js";
import courseRoutes from "./routes/course.routes.js";
import errorMiddleware from "./middlewares/error.middleware.js";

const app = express();
dbConnect();
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use(
  cors({
    origin: [process.env.FRONTEND_URL],
    credentials: true,
  })
);

app.use(cookieParser());
app.use(morgan("dev"));

app.use("/api/v1/user", userRoutes);
app.use("/api/v1/course", courseRoutes);
app.use("/ping", function (req, res) {
  res.send("pong");
});

app.all("*", (req, res) => {
  res.status(404).send("OOPS! 404 Page Not Found");
});
app.use(errorMiddleware);

export default app;
