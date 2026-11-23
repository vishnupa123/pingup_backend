// Send OTP email via Brevo HTTP API (Render free tier blocks SMTP ports)
export const sendEmail = async (email, otp) => {
  const apiKey = process.env.BREVO_API_KEY;
  const senderEmail = process.env.BREVO_SENDER_EMAIL || process.env.EMAIL_USER;
  const senderName = process.env.BREVO_SENDER_NAME || 'PingUp Support';

  if (!apiKey) {
    throw new Error('BREVO_API_KEY is missing');
  }
  if (!senderEmail) {
    throw new Error('Sender email is missing (set BREVO_SENDER_EMAIL or EMAIL_USER)');
  }

  const payload = {
    sender: { name: senderName, email: senderEmail },
    to: [{ email }],
    subject: 'PingUp Email Verification OTP',
    htmlContent: `
      <div style="font-family: Arial, sans-serif; padding: 20px; border: 1px solid #eee; border-radius: 10px; max-width: 500px; background-color: #f9f9f9;">
        <h2 style="color: #db2777; text-align: center;">Welcome to PingUp!</h2>
        <p style="color: #333; font-size: 16px;">Hello,</p>
        <p style="color: #333; font-size: 16px;">Your verification code for email confirmation is:</p>
        <div style="text-align: center; margin: 20px 0;">
          <span style="display: inline-block; background-color: #fff; color: #db2777; font-size: 32px; font-weight: bold; letter-spacing: 5px; padding: 10px 20px; border: 1px dashed #db2777; border-radius: 5px;">
            ${otp}
          </span>
        </div>
        <p style="color: #666; font-size: 14px;">This code is valid for 5 minutes. Please do not share this code with anyone.</p>
        <p style="color: #666; font-size: 14px;">If you did not request this, please ignore this email.</p>
      </div>
    `,
  };

  try {
    const response = await fetch('https://api.brevo.com/v3/smtp/email', {
      method: 'POST',
      headers: {
        accept: 'application/json',
        'content-type': 'application/json',
        'api-key': apiKey,
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const errorText = await response.text().catch(() => '');
      throw new Error(`Brevo API error ${response.status}: ${errorText}`);
    }
  } catch (error) {
    console.error('Error sending email:', error);
    throw new Error(error.message || 'Email sending failed');
  }
};
