import mongoose from "mongoose";
import dotenv from "dotenv";

dotenv.config();
const dbConnect = () => {
  mongoose
    .connect(process.env.MONGODB_URL)
    .then((conn) =>
      console.log(`Connected to database: ${conn.connection.host}`)
    )
    .catch((error) => {
      console.log("Error: ", error);
      process.exit(1);
    });
};

export default dbConnect;
