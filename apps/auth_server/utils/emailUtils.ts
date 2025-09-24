import { emailService } from "../../../packages/services/emailService";
import { activateEmail } from "../emails/activateEmail";
import jwt from "jsonwebtoken";
import { passwordEmail } from "../emails/PasswordEmail";

const sendActivationEmail = async (
  user_id: string,
  email: string,
  firstName: string
) => {
  const CLIENT_URL = process.env.CLIENT_URL;
  const JWT_SECRET_EMAIL = process.env.JWT_SECRET_EMAIL;

  const token = jwt.sign({ id: user_id }, JWT_SECRET_EMAIL!, {
    expiresIn: "30m",
  });

  const url = `${CLIENT_URL}/activate/${token}`;
  try {
    await emailService(
      email,
      url,
      "Activate your account",
      activateEmail(firstName, url)
    );
  } catch (error) {
    throw new Error("Failed to send activation email");
  }
};

const sendPasswordResetEmail = async (
  user_id: string,
  email: string,
  firstName: string,
  type: "reset" | "forgot"
) => {
  const CLIENT_URL = process.env.CLIENT_URL;
  const JWT_SECRET_PASSWORD = process.env.JWT_SECRET_PASSWORD;

  const token = jwt.sign({ id: user_id }, JWT_SECRET_PASSWORD!, {
    expiresIn: "30m",
  });

  const url = `${CLIENT_URL}/reset_password/${token}`;
  try {
    await emailService(
      email,
      url,
      "Reset your password",
      passwordEmail(email, url, type)
    );
  } catch (error) {
    throw new Error("Failed to send password reset email");
  }
};

export { sendActivationEmail, sendPasswordResetEmail };
