
import { emailService } from '@/emailService';
import { internalApi } from '@/internalApi.client';
import { EmailJobData } from '@/queueManager';
import  dotenv  from 'dotenv';
import { tradeConfirmationEmail } from '../emails/tradeConfirmationEmail';
dotenv.config({ path: "../.env" });

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
    const response = await internalApi.get(
      `${process.env.AUTH_SERVER_URL}/api/internal/get-user-email/${userId}`
    );
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

export { sendTradeConfirmationEmail };
