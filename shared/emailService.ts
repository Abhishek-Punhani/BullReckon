import nodemailer from "nodemailer";

export const emailService = async (
  to: string,
  url: string,
  subject: string,
  template: (to: string, url: string) => string
): Promise<any> => {
  try {
    const host = process.env.MAILGUN_SMTP_HOST;
    const port = process.env.MAILGUN_SMTP_PORT;
    const user = process.env.MAILGUN_USERNAME;
    const pass = process.env.MAILGUN_PASSWORD;
    const from = process.env.SENDER_EMAIL;

    if (!host || !port || !user || !pass || !from) {
      throw new Error(
        "Missing required email configuration environment variables"
      );
    }

    const smtpTransport = nodemailer.createTransport({
      host: host,
      port: parseInt(port, 10),
      secure: false,
      auth: {
        user: user,
        pass: pass,
      },
    });

    const mailOptions = {
      from: from,
      to,
      subject,
      html: template(to, url),
    };

    const result = await smtpTransport.sendMail(mailOptions);
    console.log("Email sent successfully:", result);
    return result;
  } catch (err) {
    console.error("Error sending email:", err);
    throw err;
  }
};
