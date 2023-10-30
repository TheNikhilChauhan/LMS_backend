import nodemailer from "nodemailer";

const sendEmail = async function (email, subject, message) {
  //create a reusable transporter object
  let transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: process.env.SMTP_PORT,
    auth: {
      user: process.env.SMTP_EMAIL,
      pass: process.env.SMTP_PASSWORD,
    },
  });

  //send mail with defined transport object
  await transporter.sendMail({
    from: `"LMS" ${process.env.SMTP_EMAIL}`,
    to: email,
    subject: subject,
    html: message,
  });
};

export default sendEmail;
