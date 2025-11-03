"""
Email Service for FastAPI applications
Provides email sending functionality
"""

import smtplib
import logging
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from typing import List, Optional, Dict, Any
import os
from pathlib import Path


class EmailService:
    """Email service for sending emails"""

    def __init__(self):
        self.logger = logging.getLogger(__name__)

        # Email configuration
        self.host = os.getenv("EMAIL_HOST", "smtp.gmail.com")
        self.port = int(os.getenv("EMAIL_PORT", "587"))
        self.username = os.getenv("EMAIL_USERNAME")
        self.password = os.getenv("EMAIL_PASSWORD")
        self.use_tls = os.getenv("EMAIL_USE_TLS", "true").lower() == "true"
        self.from_email = os.getenv("EMAIL_FROM", self.username)

        # Template directory
        self.template_dir = Path(__file__).parent / "email_templates"

    async def send_email(
        self,
        to: str,
        subject: str,
        body: str,
        html: Optional[str] = None,
        cc: Optional[List[str]] = None,
    ) -> bool:
        """Send an email"""
        try:
            # Create message
            msg = MIMEMultipart("alternative")
            msg["From"] = self.from_email
            msg["To"] = to
            msg["Subject"] = subject

            if cc:
                msg["Cc"] = ", ".join(cc)

            # Add text part
            text_part = MIMEText(body, "plain")
            msg.attach(text_part)

            # Add HTML part if provided
            if html:
                html_part = MIMEText(html, "html")
                msg.attach(html_part)

            # Send email
            server = smtplib.SMTP(self.host, self.port)
            if self.use_tls:
                server.starttls()

            if self.username and self.password:
                server.login(self.username, self.password)

            recipients = [to]
            if cc:
                recipients.extend(cc)

            server.sendmail(self.from_email, recipients, msg.as_string())
            server.quit()

            self.logger.info(f"Email sent successfully to {to}")
            return True

        except Exception as e:
            self.logger.error(f"Failed to send email to {to}: {e}")
            return False

    async def send_template_email(
        self, to: str, template_name: str, context: Dict[str, Any], subject: str
    ) -> bool:
        """Send email using a template"""
        try:
            # Load template
            template_path = self.template_dir / f"{template_name}.html"
            if not template_path.exists():
                self.logger.error(f"Template {template_name} not found")
                return False

            with open(template_path, "r") as f:
                template = f.read()

            # Render template (simple string replacement)
            html_body = template
            for key, value in context.items():
                html_body = html_body.replace(f"{{{{ {key} }}}}", str(value))

            # Create text version (strip HTML tags)
            text_body = html_body.replace("<br>", "\n").replace("</p>", "\n\n")
            # Simple HTML tag removal
            import re

            text_body = re.sub(r"<[^>]+>", "", text_body)

            return await self.send_email(to, subject, text_body, html_body)

        except Exception as e:
            self.logger.error(f"Failed to send template email: {e}")
            return False

    async def send_verification_email(self, to: str, verification_url: str) -> bool:
        """Send email verification email"""
        subject = "Verify your email address"
        context = {
            "verification_url": verification_url,
            "app_name": os.getenv("APP_NAME", "BullReckon"),
        }

        return await self.send_template_email(
            to, "email_verification", context, subject
        )

    async def send_password_reset_email(self, to: str, reset_url: str) -> bool:
        """Send password reset email"""
        subject = "Reset your password"
        context = {
            "reset_url": reset_url,
            "app_name": os.getenv("APP_NAME", "BullReckon"),
        }

        return await self.send_template_email(to, "password_reset", context, subject)

    async def send_welcome_email(self, to: str, username: str) -> bool:
        """Send welcome email"""
        subject = "Welcome to BullReckon!"
        context = {
            "username": username,
            "app_name": os.getenv("APP_NAME", "BullReckon"),
        }

        return await self.send_template_email(to, "welcome", context, subject)

    async def send_risk_alert_email(
        self, to: str, alerts: List[Dict[str, Any]]
    ) -> bool:
        """Send risk alert email"""
        subject = "Risk Alert Notification"
        body = "The following risk alerts have been triggered:\n\n"

        for alert in alerts:
            body += f"- {alert.get('type', 'Unknown')}: {alert.get('message', '')}\n"

        body += "\nPlease review your positions immediately."

        return await self.send_email(to, subject, body)

    def health_check(self) -> bool:
        """Check email service health"""
        try:
            server = smtplib.SMTP(self.host, self.port)
            server.quit()
            return True
        except Exception:
            return False
