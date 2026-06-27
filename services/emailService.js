const { Resend } = require("resend");

const resend = new Resend(process.env.RESEND_API_KEY);
const FROM = "Wzdm.in <noreply@wzdm.in>";

async function sendPasswordResetEmail({ to, name, resetUrl }) {
  await resend.emails.send({
    from: FROM,
    to: [to],
    subject: "Reset your Wzdm.in password",
    html: `
<!DOCTYPE html>
<html>
<body style="margin:0;padding:0;background:#f6f4ef;font-family:'Inter',system-ui,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="padding:48px 0;">
    <tr><td align="center">
      <table width="520" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:14px;border:1px solid rgba(17,22,29,0.10);overflow:hidden;">
        <tr><td style="padding:32px 40px;border-bottom:1px solid rgba(17,22,29,0.08);">
          <span style="font-family:Georgia,serif;font-size:22px;font-weight:600;color:#11161d;letter-spacing:-0.01em;">
            <span style="display:inline-block;width:11px;height:11px;border-radius:3px;background:#e0633a;vertical-align:middle;margin-right:7px;"></span>Wzdm.in
          </span>
        </td></tr>
        <tr><td style="padding:36px 40px;">
          <p style="margin:0 0 8px 0;font-size:20px;font-weight:600;color:#11161d;">Reset your password</p>
          <p style="margin:0 0 24px 0;font-size:15px;color:#3a4654;line-height:1.6;">Hi ${name || "there"},</p>
          <p style="margin:0 0 24px 0;font-size:15px;color:#3a4654;line-height:1.6;">We received a request to reset the password on your Wzdm.in account. Click the button below to set a new password. This link expires in <strong>1 hour</strong>.</p>
          <a href="${resetUrl}" style="display:inline-block;padding:12px 28px;background:#e0633a;color:#ffffff;font-size:15px;font-weight:600;text-decoration:none;border-radius:9px;">Reset password</a>
          <p style="margin:24px 0 0 0;font-size:13px;color:#8b95a2;line-height:1.6;">If you didn't request this, you can safely ignore this email — your password won't change.<br><br>Or copy this link into your browser:<br><a href="${resetUrl}" style="color:#e0633a;word-break:break-all;">${resetUrl}</a></p>
        </td></tr>
        <tr><td style="padding:20px 40px;background:#faf9f6;border-top:1px solid rgba(17,22,29,0.06);">
          <p style="margin:0;font-size:12px;color:#8b95a2;">© 2026 Wzdm.in. All rights reserved.</p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>
    `.trim()
  });
}

module.exports = { sendPasswordResetEmail };
