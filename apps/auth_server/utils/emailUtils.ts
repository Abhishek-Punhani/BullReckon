import { emailService } from "../../../shared/emailService";
import { EmailJobData } from "../workers/emailWorker";
import { addAuthEmailJob } from "../queue.setup";
import jwt from "jsonwebtoken";
import { activateEmail } from "../emails/activateEmail";
import { passwordEmail } from "../emails/PasswordEmail";
import { welcomeEmail } from "../emails/welcomeEmail";
import dotenv from "dotenv";

dotenv.config({ path: "../.env" });

const sendActivationEmail = async (user_id: string, email: string) => {
  const CLIENT_URL = process.env.CLIENT_URL;
  const JWT_SECRET_EMAIL = process.env.JWT_SECRET_EMAIL;

  const token = jwt.sign({ id: user_id }, JWT_SECRET_EMAIL!, {
    expiresIn: "5m",
  });

  const url = `${CLIENT_URL}/activate/${token}`;

  try {
    // Add to queue for async processing
    const emailData: EmailJobData = {
      type: "activation",
      to: email,
      subject: "Activate your account",
      template: "activation",
      templateData: { url },
    };

    await addAuthEmailJob(emailData);
    console.log(`✅ Activation email queued for ${email}`);
  } catch (error) {
    console.log(error);
    // Fallback to direct send if queue fails
    await emailService(email, url, "Activate your account", activateEmail);
    console.log(`✅ Activation email sent directly to ${email}`);
  }
};

const sendPasswordResetEmail = async (
  user_id: string,
  email: string,
  type: "reset" | "forgot"
) => {
  const CLIENT_URL = process.env.CLIENT_URL;
  const JWT_SECRET_EMAIL = process.env.JWT_SECRET_EMAIL;

  const token = jwt.sign({ id: user_id }, JWT_SECRET_EMAIL!, {
    expiresIn: "5m",
  });

  const url = `${CLIENT_URL}/auth/reset_password/${token}`;

  try {
    // Add to queue for async processing
    const emailData: EmailJobData = {
      type: "password-reset",
      to: email,
      subject: "Reset your password",
      template: type === "forgot" ? "password-forgot" : "password-reset",
      templateData: { url },
    };

    await addAuthEmailJob(emailData, { priority: 2 }); // High priority
    console.log(`✅ Password reset email queued for ${email}`);
  } catch (error) {
    // Fallback to direct send if queue fails
    await emailService(email, url, "Reset your password", passwordEmail(type));
    console.log(`✅ Password reset email sent directly to ${email}`);
  }
};

const sendWelcomeEmail = async (email: string, userName: string) => {
  try {
    // Add to queue for async processing
    const emailData: EmailJobData = {
      type: "welcome",
      to: email,
      subject: "Welcome to BullReckon! 🎉",
      template: "welcome",
      templateData: { userName },
    };

    await addAuthEmailJob(emailData, { priority: 5 }); // Normal priority
    console.log(`✅ Welcome email queued for ${email}`);
  } catch (error) {
    console.error("Failed to send welcome email:", error);
    // Fallback - welcome email failure shouldn't break activation
    try {
      await emailService(
        email,
        "", // No URL needed for welcome email
        "Welcome to BullReckon! 🎉",
        () => welcomeEmail(userName)
      );
      console.log(`✅ Welcome email sent directly to ${email}`);
    } catch (directError) {
      console.error("Failed to send welcome email directly:", directError);
    }
  }
};

export { sendActivationEmail, sendPasswordResetEmail, sendWelcomeEmail };
