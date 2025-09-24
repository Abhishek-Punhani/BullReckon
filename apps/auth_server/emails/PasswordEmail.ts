export type PasswordEmailType = 'forgot' | 'reset';

export const passwordEmail = (type: PasswordEmailType) => (
    to: string,
    url: string
) => {
    const subject =
        type === 'forgot'
            ? 'Reset your BullReckon password'
            : 'Your BullReckon password has been changed';

    const actionText =
        type === 'forgot'
            ? 'Reset my password'
            : 'Go to BullReckon';

    const description =
        type === 'forgot'
            ? `We received a request to reset the password for your BullReckon account (${to}). Click the button below or use this link <a href="${url}"><strong>${url}</strong></a> to reset your password. This link will expire in <strong>48 hours</strong>.`
            : `Your password for BullReckon account (${to}) has been successfully changed. If you did not perform this action, please contact our support immediately.`;

    return `
        <!DOCTYPE html>
        <html lang="en">
        <head>
            <meta charset="UTF-8">
            <meta content="width=device-width, initial-scale=1" name="viewport">
            <title>${subject}</title>
            <link href="https://fonts.googleapis.com/css2?family=Montserrat&display=swap" rel="stylesheet">
            <style>
                body { font-family: Montserrat, sans-serif; background: #fff; margin: 0; padding: 0; }
                .container { max-width: 600px; margin: 0 auto; background: #fff; padding: 40px 20px; }
                .btn { display: inline-block; padding: 12px 32px; background: #134F5C; color: #fff; text-decoration: none; border-radius: 4px; font-size: 16px; margin-top: 24px; }
                .footer { font-size: 12px; color: #888; margin-top: 40px; text-align: center; }
            </style>
        </head>
        <body>
            <div class="container">
                <img src="https://ftkwhgb.stripocdn.email/content/guids/CABINET_2663efe83689b9bda1312f85374f56d2/images/10381620386430630.png" alt="BullReckon" width="80" style="display:block;margin:0 auto 24px;">
                <h2 style="color:#333;text-align:center;">${subject}</h2>
                <hr style="border:none;border-top:1px solid #eee;margin:24px 0;">
                <p style="font-size:16px;color:#333;line-height:1.6;">${description}</p>
                <div style="text-align:center;">
                    <a href="${url}" class="btn" target="_blank">${actionText}</a>
                </div>
                <hr style="border:none;border-top:1px solid #eee;margin:32px 0;">
                <div style="text-align:center;">
                    <p style="font-size:14px;color:#333;">Need help? <a href="mailto:help@bullReckon.com" style="color:#134F5C;text-decoration:underline;">Contact support</a></p>
                </div>
                <div class="footer">
                    <p>You are receiving this email because you requested a password change for your BullReckon account.<br>
                    If you did not request this, please ignore this email or contact support.</p>
                </div>
            </div>
        </body>
        </html>
    `;
};
