import nodemailer from "nodemailer";
import { google } from "googleapis";

const { OAuth2 } = google.auth;

const {
  MAILING_SERVICE_CLIENT_ID,
  MAILING_SERVICE_CLIENT_SECRET,
  MAILING_SERVICE_REFRESH_TOKEN,
  SENDER_EMAIL_ADDRESS,
} = process.env;

const oauth2Client = new OAuth2(
  MAILING_SERVICE_CLIENT_ID,
  MAILING_SERVICE_CLIENT_SECRET,
  "https://developers.google.com/oauthplayground"
);

oauth2Client.setCredentials({
  refresh_token: MAILING_SERVICE_REFRESH_TOKEN,
});

export const emailService = async (
  to: string,
  url: string,
  subject: string,
  template: (to: string, url: string) => string
): Promise<any> => {
  try {
    const accessTokenObj = await oauth2Client.getAccessToken();
    const accessToken =
      typeof accessTokenObj === "string"
        ? accessTokenObj
        : accessTokenObj?.token || "";

    if (!accessToken) {
      throw new Error("Failed to retrieve access token");
    }

    const smtpTransport = nodemailer.createTransport({
      host: "smtp.gmail.com",
      port: 465,
      secure: true,
      auth: {
        type: "OAuth2",
        user: SENDER_EMAIL_ADDRESS,
        clientId: MAILING_SERVICE_CLIENT_ID,
        clientSecret: MAILING_SERVICE_CLIENT_SECRET,
        refreshToken: MAILING_SERVICE_REFRESH_TOKEN,
        accessToken,
      },
    });

    const mailOptions = {
      from: SENDER_EMAIL_ADDRESS,
      to,
      subject,
      html: template(to, url),
    };

    const result = await smtpTransport.sendMail(mailOptions);
    return result;
  } catch (err) {
    console.error("Error sending email:", err);
    throw err;
  }
};
