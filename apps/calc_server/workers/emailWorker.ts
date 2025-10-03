import { Job } from "bullmq";
import { emailService } from "../../../shared/emailService";
import { tradeConfirmationEmail } from "../emails/tradeConfirmationEmail";

export interface CalcEmailJobData {
  type: "trade-confirmation" | "custom";
  to: string;
  subject: string;
  template?: "trade-confirmation";
  templateData?: {
    tradeDetails?: {
      symbol: string;
      action: string;
      quantity: number;
      price: number;
      total: number;
    };
    [key: string]: any;
  };
  customHtml?: string;
  priority?: number; // 1 = highest, 10 = lowest
}

/**
 * Calc server email worker processor
 * Handles sending trade confirmation and custom emails asynchronously from the queue
 *
 * Features:
 * - Async email processing (doesn't block calc server)
 * - Automatic retries on failure (up to 5 attempts)
 * - Rate limiting (30 emails per minute)
 * - Template support for trade confirmation
 * - Custom HTML support for flexibility
 * - Priority-based processing
 */
export async function processCalcEmailJob(job: Job<CalcEmailJobData>) {
  const { type, to, subject, template, templateData, customHtml } = job.data;

  try {
    console.log(
      `📧 [Calc] Processing email job ${job.id} for ${to} (type: ${type}, priority: ${job.opts.priority || 5})`
    );

    let htmlContent: string;

    // Generate HTML based on template type
    if (customHtml) {
      htmlContent = customHtml;
    } else if (
      template === "trade-confirmation" &&
      templateData?.tradeDetails
    ) {
      htmlContent = tradeConfirmationEmail(templateData.tradeDetails);
    } else {
      throw new Error(
        "Either customHtml or trade-confirmation template with tradeDetails must be provided"
      );
    }

    // Send email using the email service
    const result = await emailService(
      to,
      templateData?.tradeDetails?.symbol || "",
      subject,
      () => htmlContent
    );

    console.log(
      `✅ [Calc] Email sent successfully to ${to} (job: ${job.id}, messageId: ${result.messageId})`
    );

    return {
      success: true,
      messageId: result.messageId,
      recipient: to,
      type: type,
      sentAt: new Date().toISOString(),
    };
  } catch (error) {
    console.error(
      `❌ [Calc] Failed to send email to ${to} (job: ${job.id}):`,
      error
    );

    // Log error details
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error";
    console.error(`[Calc] Error details: ${errorMessage}`);

    // Check if this is the last retry attempt
    const attemptsLeft = (job.opts.attempts || 5) - (job.attemptsMade || 0);
    if (attemptsLeft <= 1) {
      console.error(
        `⚠️ [Calc] Final attempt failed for email to ${to}. Email will not be retried.`
      );
    } else {
      console.log(
        `🔄 [Calc] Will retry email to ${to}. Attempts left: ${attemptsLeft - 1}`
      );
    }

    // Throw error to trigger retry mechanism
    throw new Error(`Failed to send ${type} email to ${to}: ${errorMessage}`);
  }
}

/**
 * Helper function to validate calc email job data
 */
export function validateCalcEmailJobData(data: CalcEmailJobData): boolean {
  if (!data.to || !data.subject || !data.type) {
    return false;
  }

  // Validate email format
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(data.to)) {
    return false;
  }

  // If using trade-confirmation template, validate required fields
  if (
    data.template === "trade-confirmation" &&
    !data.templateData?.tradeDetails
  ) {
    return false;
  }

  return true;
}
