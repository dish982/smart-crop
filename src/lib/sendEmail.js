import nodemailer from 'nodemailer';

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.GMAIL_USER,       // your gmail address
    pass: process.env.GMAIL_APP_PASSWORD, // 16-char app password, NOT your normal password
  },
});

export async function sendResetEmail(toEmail, resetLink) {
  await transporter.sendMail({
    from: `"Smart Crop Advisory" <${process.env.GMAIL_USER}>`,
    to: toEmail,
    subject: 'Reset your password',
    html: `
      <p>You requested a password reset.</p>
      <p><a href="${resetLink}">Click here to reset your password</a></p>
      <p>This link expires in 1 hour. If you didn't request this, ignore this email.</p>
    `,
  });
}