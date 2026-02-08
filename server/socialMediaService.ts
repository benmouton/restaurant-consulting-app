import { encrypt, decrypt } from './encryption';
import { storage } from './storage';
import crypto from 'crypto';
import type { ConnectedAccount, InsertConnectedAccount } from '@shared/schema';

const META_APP_ID = process.env.META_APP_ID;
const META_APP_SECRET = process.env.META_APP_SECRET;
const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET;

const pendingOAuthStates = new Map<string, { userId: string; timestamp: number; provider: string }>();
const STATE_EXPIRY_MS = 10 * 60 * 1000;

function getBaseUrl(): string {
  if (process.env.BASE_URL) {
    return process.env.BASE_URL;
  }
  if (process.env.REPLIT_DEV_DOMAIN) {
    return `https://${process.env.REPLIT_DEV_DOMAIN}`;
  }
  return 'http://localhost:5000';
}

function cleanupExpiredStates() {
  const now = Date.now();
  const entries = Array.from(pendingOAuthStates.entries());
  for (const [state, data] of entries) {
    if (now - data.timestamp > STATE_EXPIRY_MS) {
      pendingOAuthStates.delete(state);
    }
  }
}

export interface OAuthStartResult {
  authUrl: string;
  state: string;
}

export interface TokenExchangeResult {
  accessToken: string;
  refreshToken?: string;
  expiresIn?: number;
}

export interface FacebookPage {
  id: string;
  name: string;
  access_token: string;
  picture?: { data: { url: string } };
}

export interface InstagramAccount {
  id: string;
  username: string;
  profile_picture_url?: string;
}

export interface GoogleLocation {
  name: string;
  title: string;
}

export const socialMediaService = {
  // OAuth state management
  validateAndConsumeState(state: string): { userId: string; provider: string } | null {
    cleanupExpiredStates();
    const data = pendingOAuthStates.get(state);
    if (!data) {
      return null;
    }
    pendingOAuthStates.delete(state);
    return { userId: data.userId, provider: data.provider };
  },

  // Meta (Facebook + Instagram) OAuth
  startMetaOAuth(userId: string): OAuthStartResult {
    cleanupExpiredStates();
    const state = crypto.randomBytes(32).toString('hex');
    pendingOAuthStates.set(state, { userId, timestamp: Date.now(), provider: 'meta' });
    const redirectUri = `${getBaseUrl()}/api/oauth/meta/callback`;
    
    const scopes = 'pages_show_list,pages_read_engagement,pages_manage_posts';
    
    const authUrl = `https://www.facebook.com/v18.0/dialog/oauth?` +
      `client_id=${META_APP_ID}` +
      `&redirect_uri=${encodeURIComponent(redirectUri)}` +
      `&state=${state}` +
      `&scope=${scopes}` +
      `&response_type=code`;
    
    return { authUrl, state };
  },

  async exchangeMetaCode(code: string): Promise<TokenExchangeResult> {
    const redirectUri = `${getBaseUrl()}/api/oauth/meta/callback`;
    
    const response = await fetch(
      `https://graph.facebook.com/v18.0/oauth/access_token?` +
      `client_id=${META_APP_ID}` +
      `&client_secret=${META_APP_SECRET}` +
      `&redirect_uri=${encodeURIComponent(redirectUri)}` +
      `&code=${code}`
    );
    
    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Failed to exchange code: ${error}`);
    }
    
    const data = await response.json();
    return {
      accessToken: data.access_token,
      expiresIn: data.expires_in,
    };
  },

  async getMetaLongLivedToken(shortLivedToken: string): Promise<TokenExchangeResult> {
    const response = await fetch(
      `https://graph.facebook.com/v18.0/oauth/access_token?` +
      `grant_type=fb_exchange_token` +
      `&client_id=${META_APP_ID}` +
      `&client_secret=${META_APP_SECRET}` +
      `&fb_exchange_token=${shortLivedToken}`
    );
    
    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Failed to get long-lived token: ${error}`);
    }
    
    const data = await response.json();
    return {
      accessToken: data.access_token,
      expiresIn: data.expires_in,
    };
  },

  async getFacebookPages(userToken: string): Promise<FacebookPage[]> {
    const response = await fetch(
      `https://graph.facebook.com/v18.0/me/accounts?` +
      `fields=id,name,access_token,picture` +
      `&access_token=${userToken}`
    );
    
    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Failed to get pages: ${error}`);
    }
    
    const data = await response.json();
    return data.data || [];
  },

  async getInstagramAccounts(pageId: string, pageToken: string): Promise<InstagramAccount[]> {
    const response = await fetch(
      `https://graph.facebook.com/v18.0/${pageId}?` +
      `fields=instagram_business_account{id,username,profile_picture_url}` +
      `&access_token=${pageToken}`
    );
    
    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Failed to get Instagram account: ${error}`);
    }
    
    const data = await response.json();
    if (data.instagram_business_account) {
      return [data.instagram_business_account];
    }
    return [];
  },

  // Google Business Profile OAuth
  startGoogleOAuth(userId: string): OAuthStartResult {
    cleanupExpiredStates();
    const state = crypto.randomBytes(32).toString('hex');
    pendingOAuthStates.set(state, { userId, timestamp: Date.now(), provider: 'google' });
    const redirectUri = `${getBaseUrl()}/api/oauth/google/callback`;
    
    const scopes = [
      'https://www.googleapis.com/auth/business.manage'
    ].join(' ');
    
    const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?` +
      `client_id=${GOOGLE_CLIENT_ID}` +
      `&redirect_uri=${encodeURIComponent(redirectUri)}` +
      `&response_type=code` +
      `&scope=${encodeURIComponent(scopes)}` +
      `&state=${state}` +
      `&access_type=offline` +
      `&prompt=consent`;
    
    return { authUrl, state };
  },

  async exchangeGoogleCode(code: string): Promise<TokenExchangeResult> {
    const redirectUri = `${getBaseUrl()}/api/oauth/google/callback`;
    
    const response = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: GOOGLE_CLIENT_ID!,
        client_secret: GOOGLE_CLIENT_SECRET!,
        code,
        grant_type: 'authorization_code',
        redirect_uri: redirectUri,
      }),
    });
    
    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Failed to exchange code: ${error}`);
    }
    
    const data = await response.json();
    return {
      accessToken: data.access_token,
      refreshToken: data.refresh_token,
      expiresIn: data.expires_in,
    };
  },

  async refreshGoogleToken(refreshToken: string): Promise<TokenExchangeResult> {
    const response = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: GOOGLE_CLIENT_ID!,
        client_secret: GOOGLE_CLIENT_SECRET!,
        refresh_token: refreshToken,
        grant_type: 'refresh_token',
      }),
    });
    
    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Failed to refresh token: ${error}`);
    }
    
    const data = await response.json();
    return {
      accessToken: data.access_token,
      expiresIn: data.expires_in,
    };
  },

  async getGoogleBusinessLocations(accessToken: string): Promise<GoogleLocation[]> {
    const accountsResponse = await fetch(
      'https://mybusinessaccountmanagement.googleapis.com/v1/accounts',
      { headers: { Authorization: `Bearer ${accessToken}` } }
    );
    
    if (!accountsResponse.ok) {
      const error = await accountsResponse.text();
      throw new Error(`Failed to get accounts: ${error}`);
    }
    
    const accountsData = await accountsResponse.json();
    const accounts = accountsData.accounts || [];
    
    const locations: GoogleLocation[] = [];
    for (const account of accounts) {
      const locResponse = await fetch(
        `https://mybusinessbusinessinformation.googleapis.com/v1/${account.name}/locations`,
        { headers: { Authorization: `Bearer ${accessToken}` } }
      );
      
      if (locResponse.ok) {
        const locData = await locResponse.json();
        for (const loc of locData.locations || []) {
          locations.push({
            name: loc.name,
            title: loc.title || loc.storefrontAddress?.locality || 'Unknown Location',
          });
        }
      }
    }
    
    return locations;
  },

  // Posting to Facebook
  async postToFacebook(
    pageId: string,
    pageToken: string,
    message: string,
    imageUrl?: string
  ): Promise<{ id: string }> {
    let url = `https://graph.facebook.com/v18.0/${pageId}/feed`;
    const params: any = {
      message,
      access_token: pageToken,
    };
    
    if (imageUrl) {
      url = `https://graph.facebook.com/v18.0/${pageId}/photos`;
      params.url = imageUrl;
      params.caption = message;
      delete params.message;
    }
    
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(params),
    });
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error?.message || 'Failed to post to Facebook');
    }
    
    return response.json();
  },

  // Posting to Instagram (2-step: create container, then publish)
  async postToInstagram(
    igUserId: string,
    pageToken: string,
    caption: string,
    imageUrl: string
  ): Promise<{ id: string }> {
    const createResponse = await fetch(
      `https://graph.facebook.com/v18.0/${igUserId}/media`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          image_url: imageUrl,
          caption,
          access_token: pageToken,
        }),
      }
    );
    
    if (!createResponse.ok) {
      const error = await createResponse.json();
      throw new Error(error.error?.message || 'Failed to create Instagram media');
    }
    
    const { id: containerId } = await createResponse.json();
    
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    const publishResponse = await fetch(
      `https://graph.facebook.com/v18.0/${igUserId}/media_publish`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          creation_id: containerId,
          access_token: pageToken,
        }),
      }
    );
    
    if (!publishResponse.ok) {
      const error = await publishResponse.json();
      throw new Error(error.error?.message || 'Failed to publish Instagram media');
    }
    
    return publishResponse.json();
  },

  // Posting to Google Business Profile
  async postToGoogleBusiness(
    locationName: string,
    accessToken: string,
    summary: string,
    callToAction?: { actionType: string; url: string }
  ): Promise<{ name: string }> {
    const postBody: any = {
      languageCode: 'en',
      summary,
      topicType: 'STANDARD',
    };
    
    if (callToAction) {
      postBody.callToAction = callToAction;
    }
    
    const response = await fetch(
      `https://mybusiness.googleapis.com/v4/${locationName}/localPosts`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(postBody),
      }
    );
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error?.message || 'Failed to post to Google Business');
    }
    
    return response.json();
  },

  // Helper: Get decrypted token for an account
  getDecryptedToken(account: ConnectedAccount): string {
    return decrypt(account.accessTokenEncrypted);
  },

  getDecryptedRefreshToken(account: ConnectedAccount): string | null {
    if (!account.refreshTokenEncrypted) return null;
    return decrypt(account.refreshTokenEncrypted);
  },

  // Save connected account with encrypted tokens
  async saveConnectedAccount(
    userId: string,
    provider: string,
    providerAccountId: string,
    displayName: string,
    accessToken: string,
    refreshToken?: string,
    expiresIn?: number,
    meta?: object,
    profilePictureUrl?: string
  ): Promise<ConnectedAccount> {
    const tokenExpiresAt = expiresIn
      ? new Date(Date.now() + expiresIn * 1000)
      : null;
    
    const data: InsertConnectedAccount = {
      userId,
      provider,
      providerAccountId,
      displayName,
      accessTokenEncrypted: encrypt(accessToken),
      refreshTokenEncrypted: refreshToken ? encrypt(refreshToken) : undefined,
      tokenExpiresAt,
      meta,
      profilePictureUrl,
      status: 'active',
    };
    
    return await storage.createConnectedAccount(data);
  },
};
