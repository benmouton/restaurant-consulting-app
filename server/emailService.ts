// Resend Email Service Integration
// Uses Replit Connectors for secure API key management

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

export async function sendOrganizationInviteEmail(
  toEmail: string,
  inviterName: string,
  organizationName: string,
  inviteLink: string
): Promise<boolean> {
  try {
    const { client, fromEmail } = await getResendClient();
    
    await client.emails.send({
      from: fromEmail || 'The Restaurant Consultant <noreply@resend.dev>',
      to: toEmail,
      subject: `${inviterName} invited you to join ${organizationName}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #1a1a1a;">You've been invited to join ${organizationName}</h2>
          <p style="color: #444; font-size: 16px;">
            ${inviterName} has invited you to join their organization on The Restaurant Consultant.
          </p>
          <p style="color: #444; font-size: 16px;">
            As a member, you'll be able to view shared documents, training materials, and collaborate with your team.
          </p>
          <div style="margin: 30px 0;">
            <a href="${inviteLink}" style="background-color: #2563eb; color: white; padding: 14px 28px; text-decoration: none; border-radius: 6px; font-size: 16px; display: inline-block;">
              Accept Invitation
            </a>
          </div>
          <p style="color: #888; font-size: 14px;">
            This invitation link will expire in 7 days. If you didn't expect this invitation, you can safely ignore this email.
          </p>
        </div>
      `,
    });
    
    return true;
  } catch (error) {
    console.error('Failed to send invite email:', error);
    return false;
  }
}
