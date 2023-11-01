import app from "./app.js";
import dotenv from "dotenv";
import cloudinary from "cloudinary";
import Razorpay from "razorpay";

dotenv.config();
const PORT = process.env.PORT;

//Cloudinary config
cloudinary.v2.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

export const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET,
});

app.listen(PORT, () => {
  console.log(`Server listening to port: ${PORT}`);
});
