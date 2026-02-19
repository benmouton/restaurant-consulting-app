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
    return `${displayName} <noreply@therestaurantconsultant.com>`;
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

function getFirstName(fullName: string | undefined): string {
  if (!fullName || !fullName.trim()) return '';
  return fullName.trim().split(/\s+/)[0];
}

function buildGreeting(recipientName: string | undefined): string {
  const first = getFirstName(recipientName);
  return first ? `Hey ${escapeHtml(first)},` : 'Hey there,';
}

function buildBrandHeader(): string {
  return `
          <tr>
            <td style="background-color: #0d1117; padding: 20px 30px; border-radius: 8px 8px 0 0;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td>
                    <span style="color: #ffffff; font-family: 'Georgia', 'Times New Roman', serif; font-size: 18px; font-weight: bold;">The Restaurant</span>
                    <span style="color: #14b8a6; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; font-size: 11px; text-transform: uppercase; letter-spacing: 1.5px; margin-left: 6px; font-weight: 500;">Consultant</span>
                  </td>
                </tr>
              </table>
            </td>
          </tr>`;
}

function buildComplianceFooter(reasonText: string): string {
  return `
          <tr>
            <td style="background-color: #0d1117; padding: 24px 30px; border-radius: 0 0 8px 8px; text-align: center;">
              <p style="color: #999999; font-size: 13px; margin: 0 0 4px 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;">The Restaurant Consultant</p>
              <p style="color: #777777; font-size: 12px; font-style: italic; margin: 0 0 16px 0; font-family: 'Georgia', serif;">Systems that work on your worst night.</p>
              <p style="color: #666666; font-size: 11px; line-height: 1.5; margin: 0 0 8px 0;">Austin, TX</p>
              <p style="color: #666666; font-size: 11px; line-height: 1.5; margin: 0 0 8px 0;">${reasonText}</p>
              <p style="color: #555555; font-size: 11px; line-height: 1.5; margin: 0;">Don't want these emails? Reply with "unsubscribe" and we'll stop.</p>
            </td>
          </tr>`;
}

function buildCtaButton(href: string, label: string): string {
  return `
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td align="center" style="padding: 10px 0 20px 0;">
                    <a href="${href}" style="background-color: #14b8a6; color: #ffffff; padding: 16px 48px; text-decoration: none; border-radius: 6px; font-size: 16px; font-weight: 600; display: inline-block; letter-spacing: 0.3px; mso-padding-alt: 0; text-align: center;">
                      ${label}
                    </a>
                  </td>
                </tr>
              </table>`;
}

function buildFeatureList(): string {
  return `
              <table role="presentation" cellpadding="0" cellspacing="0" style="margin: 0 0 30px 0; width: 100%;">
                <tr><td style="padding: 6px 0; color: #444; font-size: 15px; line-height: 1.5;">
                  &rarr; 12 operational domains &mdash; from kitchen readiness to HR compliance
                </td></tr>
                <tr><td style="padding: 6px 0; color: #444; font-size: 15px; line-height: 1.5;">
                  &rarr; Training templates and employee handbooks personalized to your restaurant
                </td></tr>
                <tr><td style="padding: 6px 0; color: #444; font-size: 15px; line-height: 1.5;">
                  &rarr; Food cost tools and financial analysis
                </td></tr>
                <tr><td style="padding: 6px 0; color: #444; font-size: 15px; line-height: 1.5;">
                  &rarr; Crisis management playbooks for your worst nights
                </td></tr>
                <tr><td style="padding: 6px 0; color: #444; font-size: 15px; line-height: 1.5;">
                  &rarr; An operations consultant for any question
                </td></tr>
              </table>`;
}

function buildEmailWrapper(bodyHtml: string): string {
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
${bodyHtml}
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
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

    const greeting = buildGreeting(opts.recipientName);
    const subject = opts.subjectLine || `${opts.inviterName} invited you to The Restaurant Consultant`;

    const fromDisplay = `${opts.inviterName} via The Restaurant Consultant`;
    const senderFrom = buildFromAddress(fromDisplay, fromEmail);

    const messageHtml = opts.personalMessage 
      ? nl2br(opts.personalMessage)
      : `I've been building something I'm really excited about &mdash; a restaurant operations platform called The Restaurant Consultant. It's built from everything I've learned running my own restaurants, and I'd love your honest feedback on it.<br><br>You know this business better than most, and your perspective would mean a lot to me as I shape this into something that actually helps operators like us.<br><br>Take a look when you get a chance &mdash; no rush at all. Just want to know if this is something you'd actually use on a Tuesday night when everything's going sideways.<br><br>&mdash; ${escapeHtml(opts.inviterName)}`;

    const replyNote = opts.inviterEmail 
      ? `Questions? Just reply to this email &mdash; it goes directly to ${escapeHtml(opts.inviterName)}.`
      : `Questions? Reach out to ${escapeHtml(opts.inviterName)} directly.`;

    const bodyHtml = `
${buildBrandHeader()}
          
          <tr>
            <td style="background-color: #ffffff; padding: 40px 30px;">
              <p style="color: #1a1a1a; font-size: 16px; line-height: 1.6; margin: 0 0 20px 0;">
                ${greeting}
              </p>
              
              <p style="color: #333333; font-size: 16px; line-height: 1.7; margin: 0 0 30px 0;">
                ${messageHtml}
              </p>
              
              <hr style="border: none; border-top: 1px solid #e5e5e5; margin: 30px 0;">
              
              <p style="color: #1a1a1a; font-size: 15px; font-weight: 600; margin: 0 0 16px 0;">
                Here's what you'll get access to:
              </p>
              
${buildFeatureList()}
              
              <hr style="border: none; border-top: 1px solid #e5e5e5; margin: 30px 0;">
              
${buildCtaButton(opts.inviteLink, 'Accept Invitation &rarr;')}
              
              <p style="color: #888888; font-size: 13px; text-align: center; margin: 10px 0 0 0;">
                This invitation expires in 7 days.
              </p>
              
              <hr style="border: none; border-top: 1px solid #e5e5e5; margin: 30px 0;">
              
              <p style="color: #888888; font-size: 14px; margin: 0;">
                ${replyNote}
              </p>
            </td>
          </tr>
          
${buildComplianceFooter(`You received this because ${escapeHtml(opts.inviterName)} invited you to join their team.`)}`;

    const html = buildEmailWrapper(bodyHtml);

    const recipientFirst = getFirstName(opts.recipientName);
    const plainText = buildInvitePlainText({
      greeting: recipientFirst ? `Hey ${recipientFirst},` : 'Hey there,',
      messageText: opts.personalMessage || `I've been building something I'm really excited about -- a restaurant operations platform called The Restaurant Consultant. It's built from everything I've learned running my own restaurants, and I'd love your honest feedback on it.\n\nYou know this business better than most, and your perspective would mean a lot to me as I shape this into something that actually helps operators like us.\n\nTake a look when you get a chance -- no rush at all. Just want to know if this is something you'd actually use on a Tuesday night when everything's going sideways.\n\n-- ${opts.inviterName}`,
      inviteLink: opts.inviteLink,
      expiryNote: 'This invitation expires in 7 days.',
      inviterName: opts.inviterName,
    });
    
    const result = await client.emails.send({
      from: senderFrom,
      to: opts.toEmail,
      replyTo: opts.inviterEmail || undefined,
      subject,
      html,
      text: plainText,
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

    const greeting = buildGreeting(opts.recipientName);
    const fromDisplay = `${opts.inviterName} via The Restaurant Consultant`;
    const senderFrom = buildFromAddress(fromDisplay, fromEmail);

    const expiryNote = `Your access expires in ${opts.daysRemaining} day${opts.daysRemaining === 1 ? '' : 's'}.`;

    const messageHtml = `Just following up &mdash; I sent you access to The Restaurant Consultant a few days ago. No rush at all, but if you get 10 minutes, I'd really appreciate your honest take.`;

    const replyNote = opts.inviterEmail 
      ? `Questions? Just reply to this email &mdash; it goes directly to ${escapeHtml(opts.inviterName)}.`
      : `Questions? Reach out to ${escapeHtml(opts.inviterName)} directly.`;

    const bodyHtml = `
${buildBrandHeader()}
          
          <tr>
            <td style="background-color: #ffffff; padding: 40px 30px;">
              <p style="color: #1a1a1a; font-size: 16px; line-height: 1.6; margin: 0 0 20px 0;">
                ${greeting}
              </p>
              
              <p style="color: #333333; font-size: 16px; line-height: 1.7; margin: 0 0 30px 0;">
                ${messageHtml}
              </p>
              
              <hr style="border: none; border-top: 1px solid #e5e5e5; margin: 30px 0;">
              
${buildCtaButton(opts.inviteLink, 'Check It Out &rarr;')}
              
              <p style="color: #888888; font-size: 13px; text-align: center; margin: 10px 0 0 0;">
                ${expiryNote}
              </p>
              
              <hr style="border: none; border-top: 1px solid #e5e5e5; margin: 30px 0;">
              
              <p style="color: #888888; font-size: 14px; margin: 0;">
                ${replyNote}
              </p>
            </td>
          </tr>
          
${buildComplianceFooter(`You received this because ${escapeHtml(opts.inviterName)} invited you to join their team.`)}`;

    const html = buildEmailWrapper(bodyHtml);

    const recipientFirst = getFirstName(opts.recipientName);
    const plainText = buildReminderPlainText({
      greeting: recipientFirst ? `Hey ${recipientFirst},` : 'Hey there,',
      inviterName: opts.inviterName,
      inviteLink: opts.inviteLink,
      expiryNote,
    });

    const result = await client.emails.send({
      from: senderFrom,
      to: opts.toEmail,
      replyTo: opts.inviterEmail || undefined,
      subject: `Following up -- ${opts.inviterName} still wants your take`,
      html,
      text: plainText,
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

    const greeting = buildGreeting(opts.recipientName);
    const durationText = opts.durationDays === 1 ? '1 day' : `${opts.durationDays} days`;

    const inviterLine = opts.senderName
      ? `${escapeHtml(opts.senderName)} has given you access to <strong>The Restaurant Consultant</strong> &mdash; an operations platform built for independent restaurant operators.`
      : `You've been given access to <strong>The Restaurant Consultant</strong> &mdash; an operations platform built for independent restaurant operators.`;

    const subjectLine = opts.senderName
      ? `${opts.senderName} invited you to The Restaurant Consultant`
      : `You're invited to try The Restaurant Consultant`;

    const bodyHtml = `
${buildBrandHeader()}
          
          <tr>
            <td style="background-color: #ffffff; padding: 40px 30px;">
              <p style="color: #1a1a1a; font-size: 16px; line-height: 1.6; margin: 0 0 20px 0;">
                ${greeting}
              </p>
              
              <p style="color: #333333; font-size: 16px; line-height: 1.7; margin: 0 0 10px 0;">
                ${inviterLine}
              </p>

              <p style="color: #333333; font-size: 16px; line-height: 1.7; margin: 0 0 30px 0;">
                You've got <strong>${durationText}</strong> to explore everything:
              </p>
              
${buildFeatureList()}
              
              <hr style="border: none; border-top: 1px solid #e5e5e5; margin: 30px 0;">
              
${buildCtaButton(opts.accessLink, 'Get Started &rarr;')}
              
              <p style="color: #888888; font-size: 13px; text-align: center; margin: 10px 0 0 0;">
                Your access expires in ${durationText}. No credit card required.
              </p>
            </td>
          </tr>
          
${buildComplianceFooter(opts.senderName ? `You received this because ${escapeHtml(opts.senderName)} invited you to try the platform.` : 'You received this because someone invited you to try the platform.')}`;

    const html = buildEmailWrapper(bodyHtml);

    const recipientFirst = getFirstName(opts.recipientName);
    const plainText = buildTestAccessPlainText({
      greeting: recipientFirst ? `Hey ${recipientFirst},` : 'Hey there,',
      senderName: opts.senderName,
      durationText,
      accessLink: opts.accessLink,
    });

    const result = await client.emails.send({
      from: senderFrom,
      to: opts.toEmail,
      subject: subjectLine,
      html,
      text: plainText,
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

function buildTestAccessPlainText(params: {
  greeting: string;
  senderName?: string;
  durationText: string;
  accessLink: string;
}): string {
  const inviterLine = params.senderName
    ? `${params.senderName} has given you access to The Restaurant Consultant -- an operations platform built for independent restaurant operators.`
    : `You've been given access to The Restaurant Consultant -- an operations platform built for independent restaurant operators.`;

  return `The Restaurant Consultant

${params.greeting}

${inviterLine}

You've got ${params.durationText} to explore everything:

- 12 operational domains -- from kitchen readiness to HR compliance
- Training templates and employee handbooks personalized to your restaurant
- Food cost tools and financial analysis
- Crisis management playbooks for your worst nights
- An operations consultant for any question

Get Started: ${params.accessLink}

Your access expires in ${params.durationText}. No credit card required.

---
The Restaurant Consultant
Systems that work on your worst night.
Austin, TX
${params.senderName ? `You received this because ${params.senderName} invited you to try the platform.` : 'You received this because someone invited you to try the platform.'}
Don't want these emails? Reply with "unsubscribe" and we'll stop.`;
}

function buildInvitePlainText(params: {
  greeting: string;
  messageText: string;
  inviteLink: string;
  expiryNote: string;
  inviterName: string;
}): string {
  return `The Restaurant Consultant

${params.greeting}

${params.messageText}

---

Here's what you'll get access to:

- 12 operational domains -- from kitchen readiness to HR compliance
- Training templates and employee handbooks personalized to your restaurant
- Food cost tools and financial analysis
- Crisis management playbooks for your worst nights
- An operations consultant for any question

Accept Invitation: ${params.inviteLink}

${params.expiryNote}

Questions? Reach out to ${params.inviterName} directly.

---
The Restaurant Consultant
Systems that work on your worst night.
Austin, TX
You received this because ${params.inviterName} invited you to join their team.
Don't want these emails? Reply with "unsubscribe" and we'll stop.`;
}

function buildReminderPlainText(params: {
  greeting: string;
  inviterName: string;
  inviteLink: string;
  expiryNote: string;
}): string {
  return `The Restaurant Consultant

${params.greeting}

Just following up -- I sent you access to The Restaurant Consultant a few days ago. No rush at all, but if you get 10 minutes, I'd really appreciate your honest take.

Check It Out: ${params.inviteLink}

${params.expiryNote}

Questions? Reach out to ${params.inviterName} directly.

---
The Restaurant Consultant
Systems that work on your worst night.
Austin, TX
You received this because ${params.inviterName} invited you to join their team.
Don't want these emails? Reply with "unsubscribe" and we'll stop.`;
}
