const nodemailer = require('nodemailer');
const { createClient } = require('@supabase/supabase-js');

const SMS_GATEWAYS = {
  Verizon: 'vtext.com',
  'AT&T': 'txt.att.net',
  'T-Mobile': 'tmomail.net',
  Sprint: 'messaging.sprintpcs.com',
  Cricket: 'sms.cricketwireless.net',
};

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  let body;
  try {
    body = JSON.parse(event.body);
  } catch {
    return { statusCode: 400, body: 'Invalid JSON' };
  }

  const { memberId, demeritId, reason, points, issuedDate, eventName } = body;
  if (!memberId || !reason) {
    return { statusCode: 400, body: 'Missing required fields' };
  }

  const supabase = createClient(
    process.env.VITE_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  );

  const { data: member, error: memberErr } = await supabase
    .from('members')
    .select('first_name, last_name, email, phone_number, phone_carrier')
    .eq('id', memberId)
    .maybeSingle();

  if (memberErr || !member) {
    return { statusCode: 404, body: 'Member not found' };
  }

  const transport = nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS,
    },
  });

  const formattedDate = issuedDate
    ? new Date(issuedDate).toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })
    : 'N/A';

  const results = [];

  // Full email to member
  if (member.email) {
    const fullHtml = `
      <div style="font-family: Arial, sans-serif; max-width: 560px; margin: 0 auto; background: #fff; border: 1px solid #e5e7eb; border-radius: 12px; overflow: hidden;">
        <div style="background: #111827; padding: 24px 32px;">
          <h1 style="color: #facc15; margin: 0; font-size: 18px; letter-spacing: 1px;">GOLD MEMBERS CLUB</h1>
          <p style="color: #9ca3af; margin: 4px 0 0; font-size: 12px; text-transform: uppercase; letter-spacing: 1px;">Demerit Notice</p>
        </div>
        <div style="padding: 32px;">
          <p style="color: #374151; font-size: 15px; margin: 0 0 20px;">Dear <strong>${member.first_name} ${member.last_name}</strong>,</p>
          <p style="color: #374151; font-size: 15px; margin: 0 0 24px;">
            This is an official notice that a demerit has been issued to your record.
          </p>
          <div style="background: #fef2f2; border: 1px solid #fecaca; border-radius: 8px; padding: 20px; margin-bottom: 24px;">
            <table style="width: 100%; border-collapse: collapse;">
              <tr>
                <td style="padding: 6px 0; color: #6b7280; font-size: 13px; width: 120px;">Points Issued</td>
                <td style="padding: 6px 0; font-weight: 700; font-size: 18px; color: #dc2626;">${points}</td>
              </tr>
              <tr>
                <td style="padding: 6px 0; color: #6b7280; font-size: 13px;">Reason</td>
                <td style="padding: 6px 0; color: #111827; font-size: 14px;">${reason}</td>
              </tr>
              <tr>
                <td style="padding: 6px 0; color: #6b7280; font-size: 13px;">Date Issued</td>
                <td style="padding: 6px 0; color: #111827; font-size: 14px;">${formattedDate}</td>
              </tr>
              ${eventName ? `
              <tr>
                <td style="padding: 6px 0; color: #6b7280; font-size: 13px;">Linked Event</td>
                <td style="padding: 6px 0; color: #111827; font-size: 14px;">${eventName}</td>
              </tr>
              ` : ''}
            </table>
          </div>
          <p style="color: #6b7280; font-size: 13px; margin: 0 0 8px;">
            If you believe this demerit was issued in error, please contact your chapter administrator.
          </p>
          <p style="color: #6b7280; font-size: 13px; margin: 0;">
            Accumulating excessive demerits may affect your standing in the organization.
          </p>
        </div>
        <div style="background: #f9fafb; border-top: 1px solid #e5e7eb; padding: 16px 32px; text-align: center;">
          <p style="color: #9ca3af; font-size: 12px; margin: 0;">Gold Members Club &mdash; Automated Notification</p>
        </div>
      </div>
    `;

    try {
      await transport.sendMail({
        from: `"Gold Members Club" <${process.env.EMAIL_USER}>`,
        to: member.email,
        subject: `[GMC] Demerit Notice — ${points} Point${points !== 1 ? 's' : ''} Issued`,
        html: fullHtml,
      });
      results.push({ channel: 'email', status: 'sent', to: member.email });
    } catch (err) {
      results.push({ channel: 'email', status: 'error', error: err.message });
    }
  }

  // SMS via email gateway
  if (member.phone_number && member.phone_carrier && SMS_GATEWAYS[member.phone_carrier]) {
    const digits = member.phone_number.replace(/\D/g, '');
    const gateway = SMS_GATEWAYS[member.phone_carrier];
    const smsAddress = `${digits}@${gateway}`;
    const smsText = `GMC Demerit: ${points} pt(s) issued to ${member.first_name} ${member.last_name}. Reason: ${reason}. Date: ${formattedDate}. Contact admin with questions.`;

    try {
      await transport.sendMail({
        from: `"GMC" <${process.env.EMAIL_USER}>`,
        to: smsAddress,
        subject: '',
        text: smsText,
      });
      results.push({ channel: 'sms', status: 'sent', to: smsAddress });
    } catch (err) {
      results.push({ channel: 'sms', status: 'error', error: err.message });
    }
  }

  return {
    statusCode: 200,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ success: true, results }),
  };
};
