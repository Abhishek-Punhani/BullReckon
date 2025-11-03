import { Job } from "bullmq";
import { emailService } from "../../../shared/js/emailService";
import { activateEmail } from "../emails/activateEmail";
import { passwordEmail } from "../emails/PasswordEmail";
import { welcomeEmail } from "../emails/welcomeEmail";

export interface EmailJobData {
  type:
    | "activation"
    | "password-reset"
    | "password-changed"
    | "welcome"
    | "trade-confirmation"
    | "custom";
  to: string;
  subject: string;
  template?:
    | "activation"
    | "password-forgot"
    | "password-reset"
    | "welcome"
    | "trade-confirmation";
  templateData?: {
    url?: string;
    name?: string;
    userName?: string;
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
 * Email worker processor
 * Handles sending emails asynchronously from the queue
 *
 * Features:
 * - Async email processing (doesn't block auth server)
 * - Automatic retries on failure (up to 5 attempts)
 * - Rate limiting (30 emails per minute)
 * - Template support for common email types
 * - Custom HTML support for flexibility
 * - Priority-based processing
 */
export async function processEmailJob(job: Job<EmailJobData>) {
  const { type, to, subject, template, templateData, customHtml } = job.data;

  try {
    console.log(
      `📧 Processing email job ${job.id} for ${to} (type: ${type}, priority: ${job.opts.priority || 5})`
    );

    let htmlContent: string;

    // Generate HTML based on template type
    if (customHtml) {
      htmlContent = customHtml;
    } else if (template && templateData) {
      switch (template) {
        case "activation":
          if (!templateData.url) {
            throw new Error("Activation email requires url in templateData");
          }
          htmlContent = activateEmail(to, templateData.url);
          break;
        case "password-forgot":
          if (!templateData.url) {
            throw new Error(
              "Password forgot email requires url in templateData"
            );
          }
          htmlContent = passwordEmail("forgot")(to, templateData.url);
          break;
        case "password-reset":
          if (!templateData.url) {
            throw new Error(
              "Password reset email requires url in templateData"
            );
          }
          htmlContent = passwordEmail("reset")(to, templateData.url);
          break;
        case "welcome":
          // Import welcome template dynamically
          htmlContent = welcomeEmail(templateData.userName || to);
          break;
        default:
          throw new Error(`Unknown email template: ${template}`);
      }
    } else {
      throw new Error(
        "Either customHtml or template with templateData must be provided"
      );
    }

    // Send email using the email service
    const result = await emailService(
      to,
      templateData?.url || "",
      subject,
      () => htmlContent
    );

    console.log(
      `✅ Email sent successfully to ${to} (job: ${job.id}, messageId: ${result.messageId})`
    );

    return {
      success: true,
      messageId: result.messageId,
      recipient: to,
      type: type,
      sentAt: new Date().toISOString(),
    };
  } catch (error) {
    console.error(`❌ Failed to send email to ${to} (job: ${job.id}):`, error);

    // Log error details
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error";
    console.error(`Error details: ${errorMessage}`);

    // Check if this is the last retry attempt
    const attemptsLeft = (job.opts.attempts || 5) - (job.attemptsMade || 0);
    if (attemptsLeft <= 1) {
      console.error(
        `⚠️ Final attempt failed for email to ${to}. Email will not be retried.`
      );
    } else {
      console.log(
        `🔄 Will retry email to ${to}. Attempts left: ${attemptsLeft - 1}`
      );
    }

    // Throw error to trigger retry mechanism
    throw new Error(`Failed to send ${type} email to ${to}: ${errorMessage}`);
  }
}

/**
 * Helper function to validate email job data
 */
export function validateEmailJobData(data: EmailJobData): boolean {
  if (!data.to || !data.subject || !data.type) {
    return false;
  }

  // Validate email format
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(data.to)) {
    return false;
  }

  // If using template, validate required fields
  if (data.template && !data.customHtml) {
    if (!data.templateData?.url) {
      return false;
    }
  }

  return true;
}
