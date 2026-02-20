import { Resend } from 'resend';

let connectionSettings: any;

async function getCredentials() {
  const hostname = process.env.REPLIT_CONNECTORS_HOSTNAME;
  const xReplitToken = process.env.REPL_IDENTITY 
    ? 'repl ' + process.env.REPL_IDENTITY 
    : process.env.WEB_REPL_RENEWAL 
    ? 'depl ' + process.env.WEB_REPL_RENEWAL 
    : null;

  if (!xReplitToken) {
    throw new Error('X_REPLIT_TOKEN not found for repl/depl');
  }

  connectionSettings = await fetch(
    'https://' + hostname + '/api/v2/connection?include_secrets=true&connector_names=resend',
    {
      headers: {
        'Accept': 'application/json',
        'X_REPLIT_TOKEN': xReplitToken
      }
    }
  ).then(res => res.json()).then(data => data.items?.[0]);

  if (!connectionSettings || (!connectionSettings.settings.api_key)) {
    throw new Error('Resend not connected');
  }
  return { apiKey: connectionSettings.settings.api_key, fromEmail: connectionSettings.settings.from_email };
}

async function getResendClient() {
  const { apiKey, fromEmail } = await getCredentials();
  return {
    client: new Resend(apiKey),
    fromEmail
  };
}

function buildFromAddress(displayName: string, fromEmail: string | undefined): string {
  if (!fromEmail) {
    return `${displayName} <noreply@restaurantai.consulting>`;
  }
  const emailMatch = fromEmail.match(/<(.+)>/);
  const bareEmail = emailMatch ? emailMatch[1] : fromEmail.trim();
  return `${displayName} <${bareEmail}>`;
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function nl2br(str: string): string {
  return escapeHtml(str).replace(/\n/g, '<br>');
}

interface PersonalizedInviteOptions {
  toEmail: string;
  recipientName?: string;
  inviterName: string;
  inviterEmail?: string;
  organizationName: string;
  inviteLink: string;
  personalMessage?: string;
  subjectLine?: string;
  relationship?: string;
}

export async function sendOrganizationInviteEmail(
  toEmailOrOptions: string | PersonalizedInviteOptions,
  inviterNameArg?: string,
  organizationNameArg?: string,
  inviteLinkArg?: string
): Promise<boolean> {
  let opts: PersonalizedInviteOptions;

  if (typeof toEmailOrOptions === 'string') {
    opts = {
      toEmail: toEmailOrOptions,
      inviterName: inviterNameArg || 'A team member',
      organizationName: organizationNameArg || '',
      inviteLink: inviteLinkArg || '',
    };
  } else {
    opts = toEmailOrOptions;
  }

  try {
    console.log(`[Email] Attempting to send invite email to ${opts.toEmail}`);
    const { client, fromEmail } = await getResendClient();
    console.log(`[Email] Got Resend client, fromEmail: ${fromEmail || 'using default'}`);

    const recipientFirst = opts.recipientName || '';
    const subject = opts.subjectLine || `Hey ${recipientFirst} — I'd love your feedback on something I'm building`;

    const fromDisplay = `${opts.inviterName} via The Restaurant Consultant`;
    const senderFrom = buildFromAddress(fromDisplay, fromEmail);

    const emailMatch = fromEmail?.match(/<(.+)>/);
    const fromEmailAddr = emailMatch ? emailMatch[1] : (fromEmail?.trim() || 'noreply@restaurantai.consulting');

    const messageHtml = opts.personalMessage 
      ? nl2br(opts.personalMessage)
      : `I've been building something I'm really excited about &mdash; a restaurant operations platform called The Restaurant Consultant. It's built from everything I've learned running my own restaurants, and I'd love your honest feedback on it.<br><br>You know this business better than most, and your perspective would mean a lot to me as I shape this into something that actually helps operators like us.<br><br>Take a look when you get a chance &mdash; no pressure, no sales pitch. Just want to know if this is something you'd actually use on a Tuesday night when everything's going sideways.<br><br>&mdash; ${escapeHtml(opts.inviterName)}`;

    const html = buildInviteEmailHtml({
      recipientName: recipientFirst,
      messageHtml,
      inviteLink: opts.inviteLink,
      inviterName: opts.inviterName,
      inviterEmail: opts.inviterEmail,
      senderEmailAddr: fromEmailAddr,
    });
    
    const result = await client.emails.send({
      from: senderFrom,
      to: opts.toEmail,
      replyTo: opts.inviterEmail || undefined,
      subject,
      html,
    });
    
    console.log(`[Email] Resend API response:`, JSON.stringify(result));
    
    if (result.error) {
      console.error('[Email] Resend returned error:', result.error);
      return false;
    }
    
    console.log(`[Email] Successfully sent invite email to ${opts.toEmail}, id: ${result.data?.id}`);
    return true;
  } catch (error: any) {
    console.error('[Email] Failed to send invite email:', error?.message || error);
    console.error('[Email] Full error:', JSON.stringify(error, null, 2));
    return false;
  }
}

export async function sendInviteReminderEmail(opts: {
  toEmail: string;
  recipientName?: string;
  inviterName: string;
  inviterEmail?: string;
  inviteLink: string;
  daysRemaining: number;
}): Promise<boolean> {
  try {
    console.log(`[Email] Sending reminder email to ${opts.toEmail}`);
    const { client, fromEmail } = await getResendClient();

    const recipientFirst = opts.recipientName || '';
    const fromDisplay = `${opts.inviterName} via The Restaurant Consultant`;
    const senderFrom = buildFromAddress(fromDisplay, fromEmail);
    const emailMatch2 = fromEmail?.match(/<(.+)>/);
    const fromEmailAddr = emailMatch2 ? emailMatch2[1] : (fromEmail?.trim() || 'noreply@restaurantai.consulting');

    const messageHtml = `Just bumping this &mdash; I sent you access to The Restaurant Consultant a few days ago. No rush at all, but if you get 10 minutes, I'd really appreciate your honest take.`;

    const html = buildInviteEmailHtml({
      recipientName: recipientFirst,
      messageHtml,
      inviteLink: opts.inviteLink,
      inviterName: opts.inviterName,
      inviterEmail: opts.inviterEmail,
      senderEmailAddr: fromEmailAddr,
      isReminder: true,
      daysRemaining: opts.daysRemaining,
    });

    const result = await client.emails.send({
      from: senderFrom,
      to: opts.toEmail,
      replyTo: opts.inviterEmail || undefined,
      subject: `Quick follow-up — still want your take on this`,
      html,
    });

    if (result.error) {
      console.error('[Email] Resend returned error:', result.error);
      return false;
    }

    console.log(`[Email] Reminder sent to ${opts.toEmail}, id: ${result.data?.id}`);
    return true;
  } catch (error: any) {
    console.error('[Email] Failed to send reminder email:', error?.message || error);
    return false;
  }
}

export async function sendTestAccessEmail(opts: {
  toEmail: string;
  recipientName: string;
  accessLink: string;
  durationDays: number;
  senderName?: string;
}): Promise<boolean> {
  try {
    console.log(`[Email] Sending test access email to ${opts.toEmail}`);
    const { client, fromEmail } = await getResendClient();

    const fromDisplay = opts.senderName 
      ? `${opts.senderName} via The Restaurant Consultant`
      : 'The Restaurant Consultant';
    const senderFrom = buildFromAddress(fromDisplay, fromEmail);

    const recipientFirst = opts.recipientName.split(' ')[0];
    const greeting = `Hey ${escapeHtml(recipientFirst)},`;
    const durationText = opts.durationDays === 1 ? '1 day' : `${opts.durationDays} days`;

    const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin: 0; padding: 0; background-color: #f5f5f5; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color: #f5f5f5;">
    <tr>
      <td align="center" style="padding: 40px 20px;">
        <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="max-width: 600px; width: 100%;">
          
          <!-- Header -->
          <tr>
            <td style="background-color: #0d1117; padding: 20px 30px; border-radius: 8px 8px 0 0;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td>
                    <span style="color: #ffffff; font-family: 'Georgia', serif; font-size: 18px; font-weight: bold;">The Restaurant</span>
                    <span style="color: #14b8a6; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; font-size: 12px; text-transform: uppercase; letter-spacing: 2px; margin-left: 6px;">Consultant</span>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          
          <!-- Body -->
          <tr>
            <td style="background-color: #ffffff; padding: 40px 30px;">
              <p style="color: #1a1a1a; font-size: 16px; line-height: 1.6; margin: 0 0 20px 0;">
                ${greeting}
              </p>
              
              <p style="color: #333333; font-size: 16px; line-height: 1.7; margin: 0 0 10px 0;">
                You've been given exclusive access to <strong>The Restaurant Consultant</strong> &mdash; a complete operations platform built for independent restaurant operators.
              </p>

              <p style="color: #333333; font-size: 16px; line-height: 1.7; margin: 0 0 30px 0;">
                Take it for a spin and let us know what you think. Your access lasts <strong>${durationText}</strong>.
              </p>
              
              <!-- Divider -->
              <hr style="border: none; border-top: 1px solid #e5e5e5; margin: 30px 0;">
              
              <p style="color: #1a1a1a; font-size: 15px; font-weight: 600; margin: 0 0 16px 0;">
                Here's what you'll have access to:
              </p>
              
              <table role="presentation" cellpadding="0" cellspacing="0" style="margin: 0 0 30px 0;">
                <tr><td style="padding: 6px 0; color: #444; font-size: 15px; line-height: 1.5;">
                  <span style="margin-right: 8px;">&#x1F52A;</span> 12 operational domains &mdash; from kitchen readiness to HR compliance
                </td></tr>
                <tr><td style="padding: 6px 0; color: #444; font-size: 15px; line-height: 1.5;">
                  <span style="margin-right: 8px;">&#x1F4CB;</span> Training templates and employee handbooks
                </td></tr>
                <tr><td style="padding: 6px 0; color: #444; font-size: 15px; line-height: 1.5;">
                  <span style="margin-right: 8px;">&#x1F4B0;</span> Food cost tools and financial analysis
                </td></tr>
                <tr><td style="padding: 6px 0; color: #444; font-size: 15px; line-height: 1.5;">
                  <span style="margin-right: 8px;">&#x1F6A8;</span> Crisis management playbooks
                </td></tr>
                <tr><td style="padding: 6px 0; color: #444; font-size: 15px; line-height: 1.5;">
                  <span style="margin-right: 8px;">&#x1F4AC;</span> An operations consultant for any question
                </td></tr>
              </table>
              
              <!-- Divider -->
              <hr style="border: none; border-top: 1px solid #e5e5e5; margin: 30px 0;">
              
              <!-- CTA Button -->
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td align="center" style="padding: 10px 0 20px 0;">
                    <a href="${opts.accessLink}" style="background-color: #14b8a6; color: #ffffff; padding: 16px 40px; text-decoration: none; border-radius: 6px; font-size: 16px; font-weight: 600; display: inline-block; letter-spacing: 0.3px;">
                      Get Started &rarr;
                    </a>
                  </td>
                </tr>
              </table>
              
              <p style="color: #888888; font-size: 13px; text-align: center; margin: 10px 0 0 0;">
                Your access expires in ${durationText}. No credit card required.
              </p>
            </td>
          </tr>
          
          <!-- Footer -->
          <tr>
            <td style="background-color: #0d1117; padding: 20px 30px; border-radius: 0 0 8px 8px; text-align: center;">
              <p style="color: #888888; font-size: 13px; margin: 0 0 4px 0;">The Restaurant Consultant</p>
              <p style="color: #666666; font-size: 12px; font-style: italic; margin: 0;">Systems that work on your worst night.</p>
            </td>
          </tr>
          
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;

    const result = await client.emails.send({
      from: senderFrom,
      to: opts.toEmail,
      subject: `${escapeHtml(recipientFirst)}, you've been invited to try The Restaurant Consultant`,
      html,
    });

    if (result.error) {
      console.error('[Email] Resend returned error:', result.error);
      return false;
    }

    console.log(`[Email] Test access email sent to ${opts.toEmail}, id: ${result.data?.id}`);
    return true;
  } catch (error: any) {
    console.error('[Email] Failed to send test access email:', error?.message || error);
    return false;
  }
}

function buildInviteEmailHtml(params: {
  recipientName: string;
  messageHtml: string;
  inviteLink: string;
  inviterName: string;
  inviterEmail?: string;
  senderEmailAddr: string;
  isReminder?: boolean;
  daysRemaining?: number;
}): string {
  const greeting = params.recipientName ? `Hey ${escapeHtml(params.recipientName)},` : `Hey there,`;
  const expiryNote = params.isReminder && params.daysRemaining 
    ? `Expires in ${params.daysRemaining} day${params.daysRemaining === 1 ? '' : 's'}.`
    : `This invitation expires in 7 days.`;
  const replyNote = params.inviterEmail 
    ? `Questions? Just reply to this email &mdash; it goes directly to ${escapeHtml(params.inviterName)}.`
    : `Questions? Reach out to ${escapeHtml(params.inviterName)} directly.`;

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin: 0; padding: 0; background-color: #f5f5f5; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color: #f5f5f5;">
    <tr>
      <td align="center" style="padding: 40px 20px;">
        <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="max-width: 600px; width: 100%;">
          
          <!-- Header -->
          <tr>
            <td style="background-color: #0d1117; padding: 20px 30px; border-radius: 8px 8px 0 0;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td>
                    <span style="color: #ffffff; font-family: 'Georgia', serif; font-size: 18px; font-weight: bold;">The Restaurant</span>
                    <span style="color: #14b8a6; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; font-size: 12px; text-transform: uppercase; letter-spacing: 2px; margin-left: 6px;">Consultant</span>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          
          <!-- Body -->
          <tr>
            <td style="background-color: #ffffff; padding: 40px 30px;">
              <p style="color: #1a1a1a; font-size: 16px; line-height: 1.6; margin: 0 0 20px 0;">
                ${greeting}
              </p>
              
              <p style="color: #333333; font-size: 16px; line-height: 1.7; margin: 0 0 30px 0;">
                ${params.messageHtml}
              </p>
              
              <!-- Divider -->
              <hr style="border: none; border-top: 1px solid #e5e5e5; margin: 30px 0;">
              
              <p style="color: #1a1a1a; font-size: 15px; font-weight: 600; margin: 0 0 16px 0;">
                Here's what you'll get access to:
              </p>
              
              <table role="presentation" cellpadding="0" cellspacing="0" style="margin: 0 0 30px 0;">
                <tr><td style="padding: 6px 0; color: #444; font-size: 15px; line-height: 1.5;">
                  <span style="margin-right: 8px;">&#x1F52A;</span> 12 operational domains &mdash; from kitchen readiness to HR compliance
                </td></tr>
                <tr><td style="padding: 6px 0; color: #444; font-size: 15px; line-height: 1.5;">
                  <span style="margin-right: 8px;">&#x1F4CB;</span> Training templates and employee handbooks
                </td></tr>
                <tr><td style="padding: 6px 0; color: #444; font-size: 15px; line-height: 1.5;">
                  <span style="margin-right: 8px;">&#x1F4B0;</span> Food cost tools and financial analysis
                </td></tr>
                <tr><td style="padding: 6px 0; color: #444; font-size: 15px; line-height: 1.5;">
                  <span style="margin-right: 8px;">&#x1F6A8;</span> Crisis management playbooks
                </td></tr>
                <tr><td style="padding: 6px 0; color: #444; font-size: 15px; line-height: 1.5;">
                  <span style="margin-right: 8px;">&#x1F4AC;</span> An operations consultant for any question
                </td></tr>
              </table>
              
              <!-- Divider -->
              <hr style="border: none; border-top: 1px solid #e5e5e5; margin: 30px 0;">
              
              <!-- CTA Button -->
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td align="center" style="padding: 10px 0 20px 0;">
                    <a href="${params.inviteLink}" style="background-color: #14b8a6; color: #ffffff; padding: 16px 40px; text-decoration: none; border-radius: 6px; font-size: 16px; font-weight: 600; display: inline-block; letter-spacing: 0.3px;">
                      Accept Invitation &rarr;
                    </a>
                  </td>
                </tr>
              </table>
              
              <p style="color: #888888; font-size: 13px; text-align: center; margin: 10px 0 0 0;">
                ${expiryNote}
              </p>
              
              <!-- Divider -->
              <hr style="border: none; border-top: 1px solid #e5e5e5; margin: 30px 0;">
              
              <p style="color: #888888; font-size: 14px; margin: 0;">
                ${replyNote}
              </p>
            </td>
          </tr>
          
          <!-- Footer -->
          <tr>
            <td style="background-color: #0d1117; padding: 20px 30px; border-radius: 0 0 8px 8px; text-align: center;">
              <p style="color: #888888; font-size: 13px; margin: 0 0 4px 0;">The Restaurant Consultant</p>
              <p style="color: #666666; font-size: 12px; font-style: italic; margin: 0;">Systems that work on your worst night.</p>
            </td>
          </tr>
          
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}
