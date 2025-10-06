export function riskAlertEmail({
  username,
  reason,
  details,
  tradeInfo,
}: {
  username?: string;
  reason: string;
  details?: string;
  tradeInfo?: {
    symbol: string;
    action: string;
    quantity: number;
    price?: number;
  };
}) {
  return `
    <div style="font-family: Arial, sans-serif; color: #222;">
      <h2 style="color: #d32f2f;">Risk Alert Notification</h2>
      <p>Dear ${username || "Trader"},</p>
      <p><strong>Reason:</strong> ${reason}</p>
      ${details ? `<p><strong>Details:</strong> ${details}</p>` : ""}
      ${
        tradeInfo
          ? `
        <h4>Trade Info:</h4>
        <ul>
          <li><strong>Symbol:</strong> ${tradeInfo.symbol}</li>
          <li><strong>Action:</strong> ${tradeInfo.action}</li>
          <li><strong>Quantity:</strong> ${tradeInfo.quantity}</li>
          ${tradeInfo.price ? `<li><strong>Price:</strong> $${tradeInfo.price}</li>` : ""}
        </ul>
      `
          : ""
      }
      <p style="margin-top: 20px;">This is an automated alert from BullReckon risk management. Please review your risk settings and trading activity.</p>
      <hr />
      <small style="color: #888;">BullReckon Risk Management System</small>
    </div>
  `;
}
