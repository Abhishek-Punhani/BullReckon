import sgMail from "@sendgrid/mail";

const { SENDGRID_API_KEY, SENDER_EMAIL_ADDRESS } = process.env;
sgMail.setApiKey(SENDGRID_API_KEY!);

export const emailService = async (
  to: string,
  url: string,
  subject: string,
  template: (to: string, url: string) => string
): Promise<any> => {
  try {
    const msg = {
      to,
      from: SENDER_EMAIL_ADDRESS!,
      subject,
      html: template(to, url),
    };
    const result = await sgMail.send(msg);
    return result;
  } catch (err) {
    console.error("Error sending email:", err);
    throw err;
  }
};
