const emailjs = require("@emailjs/nodejs");

const EMAILJS_SERVICE_ID = process.env.EMAILJS_SERVICE_ID;
const EMAILJS_TEMPLATE_ID = process.env.EMAILJS_TEMPLATE_ID;
const EMAILJS_PUBLIC_KEY = process.env.EMAILJS_PUBLIC_KEY;
const EMAILJS_PRIVATE_KEY = process.env.EMAILJS_PRIVATE_KEY;

emailjs.init(EMAILJS_PUBLIC_KEY);

async function sendPasswordChangeEmail(toEmail, userName, confirmLink) {
  if (!EMAILJS_SERVICE_ID || !EMAILJS_TEMPLATE_ID || !EMAILJS_PUBLIC_KEY) {
    console.warn("EmailJS not configured, skipping email send");
    return;
  }

  try {
    await emailjs.send(
      EMAILJS_SERVICE_ID,
      EMAILJS_TEMPLATE_ID,
      {
        to_email: toEmail,
        to_name: userName || toEmail,
        confirm_link: confirmLink,
        subject: "Confirm your password change",
      },
      EMAILJS_PRIVATE_KEY
    );
  } catch (err) {
    console.error("Failed to send password change email:", err);
    throw new Error("Failed to send confirmation email");
  }
}

module.exports = { sendPasswordChangeEmail };
