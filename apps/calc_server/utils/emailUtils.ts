import { emailService } from "../../../shared/emailService";
import { internalApi } from "../../../shared/internalApi.client";
import { CalcEmailJobData } from "../workers/emailWorker";
import { addCalcEmailJob } from "../queue.setup";
import dotenv from "dotenv";
import { tradeConfirmationEmail } from "../emails/tradeConfirmationEmail";
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

    // Use calc_server's own email queue
    const emailData: CalcEmailJobData = {
      type: "trade-confirmation",
      to: email,
      subject: `Trade Confirmation - ${action} ${quantity} ${symbol}`,
      template: "trade-confirmation",
      templateData: { tradeDetails },
    };

    await addCalcEmailJob(emailData, { priority: 3 });
    console.log(`✅ Trade confirmation email queued for ${email}`);
  } catch (error) {
    console.error("Error sending trade confirmation email:", error);
    // Fallback to direct send if queue fails
    try {
      const tradeDetails = {
        symbol,
        action,
        quantity,
        price,
        total,
        timestamp: new Date().toISOString(),
        status: "executed",
      };
      const response = await internalApi.get(
        `${process.env.AUTH_SERVER_URL}/api/internal/get-user-email/${userId}`
      );
      const email = response.data.email;
      if (email) {
        await emailService(
          email,
          "",
          `Trade Confirmation - ${action} ${quantity} ${symbol}`,
          () => tradeConfirmationEmail(tradeDetails)
        );
        console.log(`✅ Trade confirmation email sent directly`);
      }
    } catch (fallbackError) {
      console.error("Failed to send email directly:", fallbackError);
    }
  }
};

export { sendTradeConfirmationEmail };
