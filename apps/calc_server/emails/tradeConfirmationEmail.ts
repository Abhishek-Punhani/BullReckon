/**
 * Trade Confirmation Email Template
 * Sent to users after a trade is executed
 */

interface TradeDetails {
  symbol: string;
  action: string;
  quantity: number;
  price: number;
  total: number;
  timestamp?: string;
  status?: string;
}

export const tradeConfirmationEmail = (tradeDetails: TradeDetails) => {
  const { symbol, action, quantity, price, total, timestamp, status } =
    tradeDetails;
  const isSuccess = status !== "failed" && status !== "cancelled";
  const actionColor = action === "BUY" ? "#10b981" : "#ef4444";
  const statusColor = isSuccess ? "#10b981" : "#ef4444";

  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Trade Confirmation</title>
  <style>
    body {
      margin: 0;
      padding: 0;
      font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
      background-color: #f5f5f5;
    }
    .container {
      max-width: 600px;
      margin: 40px auto;
      background-color: #ffffff;
      border-radius: 8px;
      overflow: hidden;
      box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
    }
    .header {
      background: linear-gradient(135deg, #1e293b 0%, #334155 100%);
      padding: 40px 20px;
      text-align: center;
      color: #ffffff;
    }
    .header h1 {
      margin: 0 0 10px 0;
      font-size: 28px;
      font-weight: 700;
    }
    .status-badge {
      display: inline-block;
      padding: 6px 16px;
      border-radius: 20px;
      font-size: 14px;
      font-weight: 600;
      background-color: ${statusColor};
      color: #ffffff;
    }
    .content {
      padding: 40px 30px;
    }
    .trade-summary {
      background-color: #f9fafb;
      border-radius: 8px;
      padding: 30px;
      margin-bottom: 30px;
      border: 2px solid #e5e7eb;
    }
    .trade-row {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 12px 0;
      border-bottom: 1px solid #e5e7eb;
    }
    .trade-row:last-child {
      border-bottom: none;
    }
    .trade-label {
      font-size: 14px;
      color: #6b7280;
      font-weight: 500;
    }
    .trade-value {
      font-size: 16px;
      color: #111827;
      font-weight: 600;
    }
    .action-badge {
      display: inline-block;
      padding: 6px 16px;
      border-radius: 6px;
      font-weight: 700;
      color: #ffffff;
      background-color: ${actionColor};
    }
    .total-row {
      padding-top: 20px;
      margin-top: 20px;
      border-top: 2px solid #e5e7eb;
    }
    .total-value {
      font-size: 24px !important;
      color: ${actionColor} !important;
    }
    .info-box {
      background-color: #eff6ff;
      border-left: 4px solid #3b82f6;
      padding: 16px;
      margin: 20px 0;
      border-radius: 4px;
    }
    .info-box p {
      margin: 0;
      font-size: 14px;
      color: #1e40af;
    }
    .button {
      display: inline-block;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: #ffffff;
      text-decoration: none;
      padding: 14px 32px;
      border-radius: 6px;
      font-weight: 600;
      margin: 20px 0;
    }
    .footer {
      background-color: #f9fafb;
      padding: 30px;
      text-align: center;
      color: #999999;
      font-size: 14px;
      border-top: 1px solid #e5e7eb;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>Trade Confirmation</h1>
      <span class="status-badge">${status || "Executed"}</span>
    </div>
    
    <div class="content">
      <p style="font-size: 16px; color: #374151; margin-bottom: 30px;">
        Your trade has been ${isSuccess ? "successfully executed" : "processed"}. Here are the details:
      </p>

      <div class="trade-summary">
        <div class="trade-row">
          <span class="trade-label">Action</span>
          <span class="action-badge">${action}</span>
        </div>
        <div class="trade-row">
          <span class="trade-label">Symbol</span>
          <span class="trade-value">${symbol}</span>
        </div>
        <div class="trade-row">
          <span class="trade-label">Quantity</span>
          <span class="trade-value">${quantity}</span>
        </div>
        <div class="trade-row">
          <span class="trade-label">Price per Unit</span>
          <span class="trade-value">$${price.toFixed(2)}</span>
        </div>
        ${
          timestamp
            ? `
        <div class="trade-row">
          <span class="trade-label">Time</span>
          <span class="trade-value">${new Date(timestamp).toLocaleString()}</span>
        </div>
        `
            : ""
        }
        <div class="trade-row total-row">
          <span class="trade-label" style="font-size: 18px; color: #111827; font-weight: 700;">Total ${action === "BUY" ? "Cost" : "Proceeds"}</span>
          <span class="trade-value total-value">$${total.toFixed(2)}</span>
        </div>
      </div>

      <div class="info-box">
        <p>
          <strong>💡 Tip:</strong> You can view all your trades and portfolio performance in your dashboard.
        </p>
      </div>

      <center>
        <a href="${process.env.CLIENT_URL}/portfolio" class="button">
          View Portfolio →
        </a>
      </center>

      <p style="font-size: 14px; color: #6b7280; margin-top: 30px;">
        <strong>What's next?</strong>
      </p>
      <ul style="font-size: 14px; color: #6b7280; line-height: 1.8;">
        <li>Track your position in the <a href="${process.env.CLIENT_URL}/portfolio" style="color: #667eea;">Portfolio</a> page</li>
        <li>Set up alerts for price changes</li>
        <li>View detailed trade history and analytics</li>
        <li>Adjust your risk management settings</li>
      </ul>
    </div>

    <div class="footer">
      <p>© ${new Date().getFullYear()} BullReckon. All rights reserved.</p>
      <p style="font-size: 12px; margin-top: 10px;">
        This is an automated confirmation email. Please do not reply to this email.
      </p>
      <p style="font-size: 12px; margin-top: 10px;">
        <a href="${process.env.CLIENT_URL}/settings/notifications" style="color: #667eea; text-decoration: none;">
          Manage email preferences
        </a>
      </p>
    </div>
  </div>
</body>
</html>
  `;
};
