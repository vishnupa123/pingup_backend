// Send OTP email via Resend HTTP API (Render free tier blocks SMTP ports)
export const sendEmail = async (email, otp) => {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.RESEND_FROM_EMAIL || 'PingUp <onboarding@resend.dev>';

  if (!apiKey) {
    throw new Error('RESEND_API_KEY is missing');
  }

  const payload = {
    from,
    to: [email],
    subject: 'PingUp Email Verification OTP',
    html: `
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
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const errorText = await response.text().catch(() => '');
      throw new Error(`Resend API error ${response.status}: ${errorText}`);
    }
  } catch (error) {
    console.error('Error sending email:', error);
    throw new Error(error.message || 'Email sending failed');
  }
};
