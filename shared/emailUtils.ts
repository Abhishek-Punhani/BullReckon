import { emailService } from "@repo/services/emailService";
import { EmailJobData } from "./queueManager";
import jwt from "jsonwebtoken";
import { activateEmail } from "../apps/auth_server/emails/activateEmail";
import { passwordEmail } from "../apps/auth_server/emails/PasswordEmail";
import { welcomeEmail } from "../apps/auth_server/emails/welcomeEmail";
import { tradeConfirmationEmail } from "../apps/calc_server/emails/tradeConfirmationEmail";
import  dotenv from "dotenv";
import { internalApi } from "./internalApi.client";

dotenv.config({path: '../.env'});
const sendActivationEmail = async (user_id: string, email: string) => {
  const CLIENT_URL = process.env.CLIENT_URL;
  const JWT_SECRET_EMAIL = process.env.JWT_SECRET_EMAIL;

  const token = jwt.sign({ id: user_id }, JWT_SECRET_EMAIL!, {
    expiresIn: "5m",
  });

  const url = `${CLIENT_URL}/activate/${token}`;

  try {
    // Get queue manager from global
    const queueManager = (global as any).queueManager;

    if (queueManager && queueManager.addEmailJob) {
      // Add to queue for async processing
      const emailData: EmailJobData = {
        type: "activation",
        to: email,
        subject: "Activate your account",
        template: "activation",
        templateData: { url },
      };

      await queueManager.addEmailJob(emailData);
      console.log(`✅ Activation email queued for ${email}`);
    } else {
      await emailService(email, url, "Activate your account", activateEmail);
      console.log(`✅ Activation email sent directly to ${email}`);
    }
  } catch (error) {
    console.log(error);
    throw new Error("Failed to send activation email");
  }
};

const sendPasswordResetEmail = async (
  user_id: string,
  email: string,
  type: "reset" | "forgot"
) => {
  const CLIENT_URL = process.env.CLIENT_URL;
  const JWT_SECRET_PASSWORD = process.env.JWT_SECRET_PASSWORD;

  const token = jwt.sign({ id: user_id }, JWT_SECRET_PASSWORD!, {
    expiresIn: "5m",
  });

  const url = `${CLIENT_URL}/reset_password/${token}`;

  try {
    // Get queue manager from global
    const queueManager = (global as any).queueManager;

    if (queueManager && queueManager.addEmailJob) {
      // Add to queue for async processing
      const emailData: EmailJobData = {
        type: "password-reset",
        to: email,
        subject: "Reset your password",
        template: type === "forgot" ? "password-forgot" : "password-reset",
        templateData: { url },
      };

      await queueManager.addEmailJob(emailData, { priority: 2 }); // High priority
      console.log(`✅ Password reset email queued for ${email}`);
    } else {
      await emailService(
        email,
        url,
        "Reset your password",
        passwordEmail(type)
      );
      console.log(`✅ Password reset email sent directly to ${email}`);
    }
  } catch (error) {
    throw new Error("Failed to send password reset email");
  }
};

const sendWelcomeEmail = async (email: string, userName: string) => {
  try {
    // Get queue manager from global
    const queueManager = (global as any).queueManager;

    if (queueManager && queueManager.addEmailJob) {
      // Add to queue for async processing
      const emailData: EmailJobData = {
        type: "welcome",
        to: email,
        subject: "Welcome to BullReckon! 🎉",
        template: "welcome",
        templateData: { userName },
      };

      await queueManager.addEmailJob(emailData, { priority: 5 }); // Normal priority
      console.log(`✅ Welcome email queued for ${email}`);
    } else {
      await emailService(
        email,
        "", // No URL needed for welcome email
        "Welcome to BullReckon! 🎉",
        () => welcomeEmail(userName)
      );
      console.log(`✅ Welcome email sent directly to ${email}`);
    }
  } catch (error) {
    console.error("Failed to send welcome email:", error);
    // Don't throw error - welcome email failure shouldn't break activation
  }
};


const sendTradeConfirmationEmail = async (
  userId: string,
  symbol: string,
  action: string,
  quantity: number,
  price: number,
  total: number
) => {
  try {
    // Fetch user email via internal API
    const response = await internalApi.get(`${process.env.AUTH_SERVER_URL}/api/internal/get-user-email/${userId}`);
    const email = response.data.email;
    if (!email) {
      console.log(`⚠️ User ${userId} has no email`);
      return;
    }

    // Prepare trade details
    const tradeDetails = {
      symbol,
      action,
      quantity,
      price,
      total,
      timestamp: new Date().toISOString(),
      status: "executed",
    };

    // Send the email using existing utility
    // (reuse the previous implementation)
    const queueManager = (global as any).queueManager;

    if (queueManager && queueManager.addEmailJob) {
      const emailData: EmailJobData = {
        type: "trade-confirmation",
        to: email,
        subject: `Trade Confirmation - ${action} ${quantity} ${symbol}`,
        template: "trade-confirmation",
        templateData: { tradeDetails },
      };

      await queueManager.addEmailJob(emailData, { priority: 3 });
      console.log(`✅ Trade confirmation email queued for ${email}`);
    } else {
      await emailService(
        email,
        "",
        `Trade Confirmation - ${action} ${quantity} ${symbol}`,
        () => tradeConfirmationEmail(tradeDetails)
      );
      console.log(`✅ Trade confirmation email sent directly to ${email}`);
    }
  } catch (error) {
    console.error("Error sending trade confirmation email:", error);
    // Don't throw - email failure shouldn't affect trade execution
  }
};

export {
  sendActivationEmail,
  sendPasswordResetEmail,
  sendWelcomeEmail,
  sendTradeConfirmationEmail,
};
