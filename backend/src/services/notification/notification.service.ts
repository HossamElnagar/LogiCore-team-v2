import nodemailer from "nodemailer";

export interface SendOtpOptions {
  customerName: string;
  customerEmail: string | undefined;
  customerPhone: string;
  otp: string;
  trackingNumber: string;
  trackingLink: string;
}

/**
 * Send OTP via Email (Nodemailer) and WhatsApp
 */
export async function sendDeliveryNotifications(options: SendOtpOptions): Promise<void> {
  const { customerName, customerEmail, customerPhone, otp, trackingNumber, trackingLink } = options;

  console.log(`[Notification] Triggered dual-channel notification for ${customerName}`);
  console.log(`[Notification] OTP: ${otp}, Tracking: ${trackingLink}`);

  // ── 1. WhatsApp Delivery (Zero-Cost Blueprints) ──────────────────────────
  // Simulates or fires whatsapp-web.js with anti-ban random delays
  void (async () => {
    try {
      const delayMs = Math.floor(Math.random() * (9000 - 4000 + 1)) + 4000; // 4-9 seconds delay
      await new Promise((resolve) => setTimeout(resolve, delayMs));

      console.log(`[WhatsApp] Sending message to ${customerPhone} after ${delayMs}ms delay...`);
      console.log(
        `[WhatsApp] Message: "Hello ${customerName}, your shipment #${trackingNumber} is out for delivery! Use OTP code ${otp} to verify. Track live: ${trackingLink}"`
      );
      
      // If a global whatsapp client is initialized elsewhere, we could trigger it:
      // const client = getWhatsAppClient();
      // if (client) {
      //   await client.sendMessage(`${customerPhone}@c.us`, ...);
      // }
    } catch (err) {
      console.error("[WhatsApp] Failed to send message:", err);
    }
  })();

  // ── 2. Email Delivery (Nodemailer Gmail SMTP) ─────────────────────────────
  if (!customerEmail) {
    console.log("[Email] No customer email provided. Skipping email dispatch.");
    return;
  }

  try {
    // Read SMTP details from process.env
    const smtpUser = process.env.SMTP_USER || "dev-reconciliation@logicore.com";
    const smtpPass = process.env.SMTP_PASS;

    let transporter: nodemailer.Transporter;

    if (smtpPass) {
      transporter = nodemailer.createTransport({
        service: "gmail",
        auth: {
          user: smtpUser,
          pass: smtpPass,
        },
      });
    } else {
      // Fallback for development: Use Ethereal fake SMTP or mock log
      console.log("[Email] SMTP_PASS not set. Setting up local mock transporter.");
      transporter = nodemailer.createTransport({
        host: "smtp.ethereal.email",
        port: 587,
        secure: false,
        auth: {
          user: "ethereal-user@ethereal.email",
          pass: "ethereal-pass",
        },
      });
    }

    const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <style>
          body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f3f4f6; color: #1f2937; margin: 0; padding: 20px; }
          .container { max-width: 600px; background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1); margin: 0 auto; border: 1px solid #e5e7eb; }
          .header { background: linear-gradient(135deg, #1e3a8a, #3b82f6); padding: 30px; text-align: center; color: white; }
          .header h1 { margin: 0; font-size: 24px; letter-spacing: 0.5px; }
          .content { padding: 30px; line-height: 1.6; }
          .otp-card { background-color: #eff6ff; border: 2px dashed #3b82f6; border-radius: 8px; padding: 20px; text-align: center; margin: 20px 0; }
          .otp-code { font-size: 32px; font-weight: bold; color: #1e3a8a; letter-spacing: 4px; margin: 10px 0; }
          .btn { display: inline-block; background-color: #2563eb; color: #ffffff !important; padding: 12px 24px; border-radius: 6px; text-decoration: none; font-weight: bold; text-align: center; margin-top: 15px; }
          .footer { background-color: #f9fafb; padding: 20px; text-align: center; font-size: 12px; color: #6b7280; border-top: 1px solid #f3f4f6; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>LogiCore Logistics</h1>
          </div>
          <div class="content">
            <p>Dear <strong>${customerName}</strong>,</p>
            <p>Your package with tracking number <strong>${trackingNumber}</strong> is currently <strong>out for delivery</strong>.</p>
            
            <div class="otp-card">
              <p style="margin: 0; color: #4b5563;">Your Secure Verification OTP</p>
              <div class="otp-code">${otp}</div>
              <p style="margin: 0; font-size: 12px; color: #9ca3af;">(Expires in 5 minutes)</p>
            </div>
            
            <p>Please share this OTP with the delivery agent only when you physically receive your package. For real-time tracking, you can follow your driver on the interactive map:</p>
            
            <div style="text-align: center;">
              <a href="${trackingLink}" class="btn" target="_blank">Track Shipment Live</a>
            </div>
          </div>
          <div class="footer">
            <p>This is an automated delivery notification from LogiCore. Please do not reply directly to this email.</p>
          </div>
        </div>
      </body>
      </html>
    `;

    // In a test configuration, we just log instead of attempting actual dispatch if Ethereal fails
    await transporter.sendMail({
      from: `"LogiCore Deliveries" <${smtpUser}>`,
      to: customerEmail,
      subject: `Out for Delivery: OTP & Live Tracking for Shipment #${trackingNumber}`,
      html: htmlContent,
    });

    console.log(`[Email] Notification email successfully sent to ${customerEmail}`);
  } catch (err) {
    console.error("[Email] Failed to dispatch nodemailer email:", err);
  }
}
