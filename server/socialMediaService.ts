import { encrypt, decrypt } from './encryption';
import { storage } from './storage';
import crypto from 'crypto';
import type { ConnectedAccount, InsertConnectedAccount } from '@shared/schema';
import { oauthStates } from '@shared/schema';
import { db } from './db';
import { eq, lt } from 'drizzle-orm';

const META_APP_ID = process.env.META_APP_ID;
const META_APP_SECRET = process.env.META_APP_SECRET;
const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET;
const LINKEDIN_CLIENT_ID = process.env.LINKEDIN_CLIENT_ID;
const LINKEDIN_CLIENT_SECRET = process.env.LINKEDIN_CLIENT_SECRET;
const X_CLIENT_ID = process.env.X_CLIENT_ID;
const X_CLIENT_SECRET = process.env.X_CLIENT_SECRET;
const NEXTDOOR_CLIENT_ID = process.env.NEXTDOOR_CLIENT_ID;
const NEXTDOOR_CLIENT_SECRET = process.env.NEXTDOOR_CLIENT_SECRET;

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

async function cleanupExpiredStates() {
  const expiryTime = new Date(Date.now() - STATE_EXPIRY_MS);
  await db.delete(oauthStates).where(lt(oauthStates.createdAt, expiryTime));
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
  async validateAndConsumeState(state: string): Promise<{ userId: string; provider: string; codeVerifier?: string | null } | null> {
    await cleanupExpiredStates();
    const [data] = await db.select().from(oauthStates).where(eq(oauthStates.state, state));
    if (!data) {
      return null;
    }
    await db.delete(oauthStates).where(eq(oauthStates.state, state));
    return { userId: data.userId, provider: data.provider, codeVerifier: data.codeVerifier };
  },

  async startMetaOAuth(userId: string): Promise<OAuthStartResult> {
    await cleanupExpiredStates();
    const state = crypto.randomBytes(32).toString('hex');
    await db.insert(oauthStates).values({ state, userId, provider: 'meta' });
    const redirectUri = `${getBaseUrl()}/api/oauth/meta/callback`;
    
    const authUrl = `https://www.facebook.com/v21.0/dialog/oauth?` +
      `client_id=${META_APP_ID}` +
      `&redirect_uri=${encodeURIComponent(redirectUri)}` +
      `&state=${state}` +
      `&response_type=code` +
      `&config_id=1387221869875164`;
    
    return { authUrl, state };
  },

  async exchangeMetaCode(code: string): Promise<TokenExchangeResult> {
    const redirectUri = `${getBaseUrl()}/api/oauth/meta/callback`;
    
    const response = await fetch(
      `https://graph.facebook.com/v21.0/oauth/access_token?` +
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
      `https://graph.facebook.com/v21.0/oauth/access_token?` +
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

  async getFacebookPages(userToken: string): Promise<{pages: FacebookPage[], diagnostics: any}> {
    let diagnostics: any = {};
    
    const debugUrl = `https://graph.facebook.com/debug_token?input_token=${userToken}&access_token=${META_APP_ID}|${META_APP_SECRET}`;
    try {
      const debugRes = await fetch(debugUrl);
      const debugData = await debugRes.json();
      diagnostics.scopes = debugData?.data?.scopes || [];
      diagnostics.app_id = debugData?.data?.app_id;
      diagnostics.type = debugData?.data?.type;
      diagnostics.is_valid = debugData?.data?.is_valid;
      console.log("META DEBUG_TOKEN:", JSON.stringify(debugData));
    } catch (e) {
      console.error("META DEBUG_TOKEN error:", e);
      diagnostics.debug_error = String(e);
    }

    const accountsUrl = `https://graph.facebook.com/v21.0/me/accounts?` +
      `fields=id,name,access_token,picture&limit=100` +
      `&access_token=${userToken}`;
    const response = await fetch(accountsUrl);
    const rawText = await response.text();
    console.log("META /me/accounts status:", response.status);
    console.log("META /me/accounts body:", rawText);
    diagnostics.accounts_status = response.status;
    
    if (!response.ok) {
      diagnostics.accounts_error = rawText;
      return { pages: [], diagnostics };
    }
    
    const data = JSON.parse(rawText);
    let pages: FacebookPage[] = data.data || [];
    diagnostics.accounts_count = pages.length;

    if (pages.length === 0) {
      console.log("META: /me/accounts returned 0 pages, trying Business Portfolio fallback...");
      try {
        const bizRes = await fetch(
          `https://graph.facebook.com/v21.0/me/businesses?` +
          `fields=id,name&access_token=${userToken}`
        );
        const bizText = await bizRes.text();
        console.log("META /me/businesses status:", bizRes.status, "body:", bizText);
        diagnostics.businesses_status = bizRes.status;

        if (bizRes.ok) {
          const bizData = JSON.parse(bizText);
          const businesses = bizData.data || [];
          diagnostics.businesses_count = businesses.length;

          for (const biz of businesses) {
            console.log("META: Checking business:", biz.id, biz.name);
            const bizPagesRes = await fetch(
              `https://graph.facebook.com/v21.0/${biz.id}/owned_pages?` +
              `fields=id,name,access_token,picture&limit=100` +
              `&access_token=${userToken}`
            );
            const bizPagesText = await bizPagesRes.text();
            console.log("META business", biz.id, "owned_pages status:", bizPagesRes.status, "body:", bizPagesText);

            if (bizPagesRes.ok) {
              const bizPagesData = JSON.parse(bizPagesText);
              const bizPages = bizPagesData.data || [];
              pages = pages.concat(bizPages);
            }
          }
          diagnostics.accounts_count = pages.length;
          diagnostics.source = "business_portfolio";
        }
      } catch (bizErr) {
        console.error("META Business Portfolio fallback error:", bizErr);
        diagnostics.business_error = String(bizErr);
      }
    }

    if (pages.length === 0) {
      console.log("META: Still 0 pages, trying /me?fields=accounts fallback...");
      try {
        const altRes = await fetch(
          `https://graph.facebook.com/v21.0/me?` +
          `fields=accounts{id,name,access_token,picture}` +
          `&access_token=${userToken}`
        );
        const altText = await altRes.text();
        console.log("META /me?fields=accounts status:", altRes.status, "body:", altText);
        diagnostics.alt_status = altRes.status;

        if (altRes.ok) {
          const altData = JSON.parse(altText);
          const altPages = altData?.accounts?.data || [];
          if (altPages.length > 0) {
            pages = altPages;
            diagnostics.accounts_count = pages.length;
            diagnostics.source = "me_fields_accounts";
          }
        }
      } catch (altErr) {
        console.error("META /me?fields=accounts fallback error:", altErr);
      }
    }

    return { pages, diagnostics };
  },

  async getInstagramAccounts(pageId: string, pageToken: string): Promise<InstagramAccount[]> {
    const response = await fetch(
      `https://graph.facebook.com/v21.0/${pageId}?` +
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
  async startGoogleOAuth(userId: string): Promise<OAuthStartResult> {
    await cleanupExpiredStates();
    const state = crypto.randomBytes(32).toString('hex');
    await db.insert(oauthStates).values({ state, userId, provider: 'google' });
    const redirectUri = `${getBaseUrl()}/api/oauth/google/callback`;
    console.log('[GOOGLE_OAUTH] Base URL:', getBaseUrl());
    console.log('[GOOGLE_OAUTH] Redirect URI:', redirectUri);
    
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
    const fetchWithRetry = async (url: string, options: RequestInit, retries = 4): Promise<Response> => {
      for (let attempt = 0; attempt < retries; attempt++) {
        const response = await fetch(url, options);
        if (response.status === 429) {
          const retryAfter = response.headers.get('Retry-After');
          const waitSec = retryAfter ? parseInt(retryAfter, 10) : Math.min(5 * Math.pow(2, attempt), 60);
          console.log(`[GOOGLE_API] Rate limited (429), waiting ${waitSec}s before retry ${attempt + 1}/${retries}...`);
          await new Promise(resolve => setTimeout(resolve, waitSec * 1000));
          continue;
        }
        return response;
      }
      const finalResponse = await fetch(url, options);
      if (finalResponse.status === 429) {
        throw new Error('RATE_LIMITED: Google is rate limiting requests. Please wait a minute and try connecting again.');
      }
      return finalResponse;
    };

    const accountsResponse = await fetchWithRetry(
      'https://mybusinessaccountmanagement.googleapis.com/v1/accounts',
      { headers: { Authorization: `Bearer ${accessToken}` } }
    );
    
    if (!accountsResponse.ok) {
      const error = await accountsResponse.text();
      throw new Error(`Failed to get accounts: ${error}`);
    }
    
    const accountsData = await accountsResponse.json();
    console.log(`[GOOGLE_API] Accounts response:`, JSON.stringify(accountsData).substring(0, 500));
    const accounts = accountsData.accounts || [];
    
    const locations: GoogleLocation[] = [];
    for (const account of accounts) {
      const locUrl = `https://mybusinessbusinessinformation.googleapis.com/v1/${account.name}/locations?readMask=name,title,storefrontAddress,websiteUri`;
      console.log(`[GOOGLE_API] Fetching locations from: ${locUrl}`);
      const locResponse = await fetchWithRetry(
        locUrl,
        { headers: { Authorization: `Bearer ${accessToken}` } }
      );
      
      if (locResponse.ok) {
        const locData = await locResponse.json();
        console.log(`[GOOGLE_API] Locations response for ${account.name}:`, JSON.stringify(locData).substring(0, 500));
        for (const loc of locData.locations || []) {
          locations.push({
            name: loc.name,
            title: loc.title || loc.storefrontAddress?.locality || 'Unknown Location',
          });
        }
      } else {
        const errText = await locResponse.text();
        console.error(`[GOOGLE_API] Failed to fetch locations for ${account.name}: ${locResponse.status} ${errText}`);
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
    let endpoint = imageUrl
      ? `https://graph.facebook.com/v21.0/${pageId}/photos`
      : `https://graph.facebook.com/v21.0/${pageId}/feed`;

    const body = new URLSearchParams();
    body.append('access_token', pageToken);
    if (imageUrl) {
      body.append('url', imageUrl);
      body.append('caption', message);
    } else {
      body.append('message', message);
    }

    console.log(`[POST_FB] Posting to ${endpoint} for page ${pageId}`);
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: body.toString(),
    });

    const rawText = await response.text();
    console.log(`[POST_FB] Response status: ${response.status}, body: ${rawText}`);

    if (!response.ok) {
      let errMsg = 'Failed to post to Facebook';
      try { errMsg = JSON.parse(rawText)?.error?.message || errMsg; } catch {}
      throw new Error(errMsg);
    }

    return JSON.parse(rawText);
  },

  // Posting to Instagram (2-step: create container, then publish)
  async postToInstagram(
    igUserId: string,
    pageToken: string,
    caption: string,
    imageUrl: string
  ): Promise<{ id: string }> {
    const createBody = new URLSearchParams();
    createBody.append('image_url', imageUrl);
    createBody.append('caption', caption);
    createBody.append('access_token', pageToken);

    console.log(`[POST_IG] Creating media container for IG user ${igUserId}`);
    const createResponse = await fetch(
      `https://graph.facebook.com/v21.0/${igUserId}/media`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: createBody.toString(),
      }
    );

    const createText = await createResponse.text();
    console.log(`[POST_IG] Create response: ${createResponse.status}, body: ${createText}`);

    if (!createResponse.ok) {
      let errMsg = 'Failed to create Instagram media';
      try { errMsg = JSON.parse(createText)?.error?.message || errMsg; } catch {}
      throw new Error(errMsg);
    }

    const { id: containerId } = JSON.parse(createText);

    await new Promise(resolve => setTimeout(resolve, 3000));

    const publishBody = new URLSearchParams();
    publishBody.append('creation_id', containerId);
    publishBody.append('access_token', pageToken);

    console.log(`[POST_IG] Publishing container ${containerId}`);
    const publishResponse = await fetch(
      `https://graph.facebook.com/v21.0/${igUserId}/media_publish`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: publishBody.toString(),
      }
    );

    const publishText = await publishResponse.text();
    console.log(`[POST_IG] Publish response: ${publishResponse.status}, body: ${publishText}`);

    if (!publishResponse.ok) {
      let errMsg = 'Failed to publish Instagram media';
      try { errMsg = JSON.parse(publishText)?.error?.message || errMsg; } catch {}
      throw new Error(errMsg);
    }

    return JSON.parse(publishText);
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

  async generatePostContent(data: any, brandSettings?: any) {
    const { postType, platforms, outputStyle, tone, targetAudience, eventName, promotionDetails } = data;
    
    let prompt = `Act as an expert restaurant social media manager. Generate a high-performing social media post for a restaurant.
    
    RESTAURANT INFO:
    Name: ${brandSettings?.restaurantName || "Our Restaurant"}
    Location: ${brandSettings?.location || "Local area"}
    Voice: ${(brandSettings?.voiceAdjectives || []).join(", ")}
    
    POST TYPE: ${postType}
    PLATFORMS: ${platforms.join(", ")}
    STYLE: ${outputStyle}
    TONE: ${tone}
    AUDIENCE: ${targetAudience}
    
    DETAILS:
    ${eventName ? `Subject: ${eventName}` : ""}
    ${promotionDetails ? `Details: ${promotionDetails}` : ""}
    ${data.postTypeData ? `Specific Info: ${JSON.stringify(data.postTypeData)}` : ""}
    
    Provide the response in JSON format with:
    - primaryCaption (engaging caption with emojis based on emoji_level: ${brandSettings?.emojiLevel || "light"})
    - shortCaption (for quick reading or stories)
    - storyOverlays (3-5 short text snippets for story slides)
    - hashtags (relevant trending and local hashtags)
    - suggestedPostTime (best time today to post)
    - replyPack (3 potential responses to common comments)`;

    // AI generation logic would go here, currently using Replit AI integration
    // For now, returning a mock structure or calling the actual AI service
    return {
      primaryCaption: "Drafting your perfect post...",
      shortCaption: "Coming soon!",
      storyOverlays: ["Slide 1", "Slide 2"],
      hashtags: ["#restaurant", "#foodie"],
      suggestedPostTime: "6:00 PM",
      replyPack: ["Yum!", "See you there!"]
    };
  },

  // LinkedIn OAuth
  async startLinkedInOAuth(userId: string): Promise<OAuthStartResult> {
    await cleanupExpiredStates();
    const state = crypto.randomBytes(32).toString('hex');
    await db.insert(oauthStates).values({ state, userId, provider: 'linkedin' });
    const redirectUri = `${getBaseUrl()}/api/oauth/linkedin/callback`;
    const scopes = 'openid profile w_member_social';
    const authUrl = `https://www.linkedin.com/oauth/v2/authorization?` +
      `response_type=code` +
      `&client_id=${LINKEDIN_CLIENT_ID}` +
      `&redirect_uri=${encodeURIComponent(redirectUri)}` +
      `&state=${state}` +
      `&scope=${encodeURIComponent(scopes)}`;
    return { authUrl, state };
  },

  async exchangeLinkedInCode(code: string): Promise<TokenExchangeResult> {
    const redirectUri = `${getBaseUrl()}/api/oauth/linkedin/callback`;
    const response = await fetch('https://www.linkedin.com/oauth/v2/accessToken', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        code,
        client_id: LINKEDIN_CLIENT_ID!,
        client_secret: LINKEDIN_CLIENT_SECRET!,
        redirect_uri: redirectUri,
      }),
    });
    if (!response.ok) {
      const error = await response.text();
      throw new Error(`LinkedIn token exchange failed: ${error}`);
    }
    const data = await response.json();
    return {
      accessToken: data.access_token,
      refreshToken: data.refresh_token,
      expiresIn: data.expires_in,
    };
  },

  async getLinkedInProfile(accessToken: string): Promise<{ sub: string; name: string; picture?: string }> {
    const response = await fetch('https://api.linkedin.com/v2/userinfo', {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    if (!response.ok) {
      const error = await response.text();
      throw new Error(`LinkedIn profile fetch failed: ${error}`);
    }
    const data = await response.json();
    return {
      sub: data.sub,
      name: data.name || `${data.given_name || ''} ${data.family_name || ''}`.trim(),
      picture: data.picture,
    };
  },

  async postToLinkedIn(
    personUrn: string,
    accessToken: string,
    message: string,
    imageUrl?: string
  ): Promise<{ id: string }> {
    const body: any = {
      author: `urn:li:person:${personUrn}`,
      lifecycleState: 'PUBLISHED',
      specificContent: {
        'com.linkedin.ugc.ShareContent': {
          shareCommentary: { text: message },
          shareMediaCategory: 'NONE',
        },
      },
      visibility: { 'com.linkedin.ugc.MemberNetworkVisibility': 'PUBLIC' },
    };

    if (imageUrl) {
      body.specificContent['com.linkedin.ugc.ShareContent'].shareMediaCategory = 'ARTICLE';
      body.specificContent['com.linkedin.ugc.ShareContent'].media = [{
        status: 'READY',
        originalUrl: imageUrl,
      }];
    }

    console.log(`[POST_LI] Posting to LinkedIn for person ${personUrn}`);
    const response = await fetch('https://api.linkedin.com/v2/ugcPosts', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
        'X-Restli-Protocol-Version': '2.0.0',
      },
      body: JSON.stringify(body),
    });

    const rawText = await response.text();
    console.log(`[POST_LI] Response status: ${response.status}, body: ${rawText}`);

    if (!response.ok) {
      let errMsg = 'Failed to post to LinkedIn';
      try { errMsg = JSON.parse(rawText)?.message || errMsg; } catch {}
      throw new Error(errMsg);
    }

    return { id: response.headers.get('x-restli-id') || JSON.parse(rawText)?.id || 'posted' };
  },

  // X (Twitter) OAuth 2.0 with PKCE
  async startXOAuth(userId: string): Promise<OAuthStartResult> {
    await cleanupExpiredStates();
    const state = crypto.randomBytes(32).toString('hex');
    const codeVerifier = crypto.randomBytes(32).toString('base64url');
    const codeChallenge = crypto.createHash('sha256').update(codeVerifier).digest('base64url');

    await db.insert(oauthStates).values({ state, userId, provider: 'x', codeVerifier });
    const redirectUri = `${getBaseUrl()}/api/oauth/x/callback`;
    const scopes = 'tweet.read tweet.write users.read offline.access';
    const authUrl = `https://twitter.com/i/oauth2/authorize?` +
      `response_type=code` +
      `&client_id=${X_CLIENT_ID}` +
      `&redirect_uri=${encodeURIComponent(redirectUri)}` +
      `&scope=${encodeURIComponent(scopes)}` +
      `&state=${state}` +
      `&code_challenge=${codeChallenge}` +
      `&code_challenge_method=S256`;
    return { authUrl, state };
  },

  async exchangeXCode(code: string, codeVerifier: string): Promise<TokenExchangeResult> {
    const redirectUri = `${getBaseUrl()}/api/oauth/x/callback`;
    const basicAuth = Buffer.from(`${X_CLIENT_ID}:${X_CLIENT_SECRET}`).toString('base64');
    const response = await fetch('https://api.x.com/2/oauth2/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        Authorization: `Basic ${basicAuth}`,
      },
      body: new URLSearchParams({
        code,
        grant_type: 'authorization_code',
        redirect_uri: redirectUri,
        code_verifier: codeVerifier,
      }),
    });
    if (!response.ok) {
      const error = await response.text();
      throw new Error(`X token exchange failed: ${error}`);
    }
    const data = await response.json();
    return {
      accessToken: data.access_token,
      refreshToken: data.refresh_token,
      expiresIn: data.expires_in,
    };
  },

  async refreshXToken(refreshToken: string): Promise<TokenExchangeResult> {
    const basicAuth = Buffer.from(`${X_CLIENT_ID}:${X_CLIENT_SECRET}`).toString('base64');
    const response = await fetch('https://api.x.com/2/oauth2/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        Authorization: `Basic ${basicAuth}`,
      },
      body: new URLSearchParams({
        grant_type: 'refresh_token',
        refresh_token: refreshToken,
      }),
    });
    if (!response.ok) {
      const error = await response.text();
      throw new Error(`X token refresh failed: ${error}`);
    }
    const data = await response.json();
    return {
      accessToken: data.access_token,
      refreshToken: data.refresh_token,
      expiresIn: data.expires_in,
    };
  },

  async getXProfile(accessToken: string): Promise<{ id: string; username: string; name: string; profileImageUrl?: string }> {
    const response = await fetch('https://api.x.com/2/users/me?user.fields=profile_image_url', {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    if (!response.ok) {
      const error = await response.text();
      throw new Error(`X profile fetch failed: ${error}`);
    }
    const data = await response.json();
    return {
      id: data.data.id,
      username: data.data.username,
      name: data.data.name,
      profileImageUrl: data.data.profile_image_url,
    };
  },

  async postToX(
    accessToken: string,
    message: string
  ): Promise<{ id: string }> {
    console.log(`[POST_X] Posting tweet`);
    const response = await fetch('https://api.x.com/2/tweets', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ text: message }),
    });

    const rawText = await response.text();
    console.log(`[POST_X] Response status: ${response.status}, body: ${rawText}`);

    if (!response.ok) {
      let errMsg = 'Failed to post to X';
      try { errMsg = JSON.parse(rawText)?.detail || JSON.parse(rawText)?.title || errMsg; } catch {}
      throw new Error(errMsg);
    }

    const result = JSON.parse(rawText);
    return { id: result.data?.id || 'posted' };
  },

  // Nextdoor OAuth 2.0
  async startNextdoorOAuth(userId: string): Promise<OAuthStartResult> {
    await cleanupExpiredStates();
    const state = crypto.randomBytes(32).toString('hex');
    await db.insert(oauthStates).values({ state, userId, provider: 'nextdoor' });
    const redirectUri = `${getBaseUrl()}/api/oauth/nextdoor/callback`;
    const scopes = 'profile:read post:write';
    const authUrl = `https://auth.nextdoor.com/v2/authorize?` +
      `response_type=code` +
      `&client_id=${NEXTDOOR_CLIENT_ID}` +
      `&redirect_uri=${encodeURIComponent(redirectUri)}` +
      `&state=${state}` +
      `&scope=${encodeURIComponent(scopes)}`;
    return { authUrl, state };
  },

  async exchangeNextdoorCode(code: string): Promise<TokenExchangeResult> {
    const redirectUri = `${getBaseUrl()}/api/oauth/nextdoor/callback`;
    const basicAuth = Buffer.from(`${NEXTDOOR_CLIENT_ID}:${NEXTDOOR_CLIENT_SECRET}`).toString('base64');
    const response = await fetch('https://auth.nextdoor.com/v2/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        Authorization: `Basic ${basicAuth}`,
      },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        code,
        redirect_uri: redirectUri,
      }),
    });
    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Nextdoor token exchange failed: ${error}`);
    }
    const data = await response.json();
    return {
      accessToken: data.access_token,
      refreshToken: data.refresh_token,
      expiresIn: data.expires_in,
    };
  },

  async refreshNextdoorToken(refreshToken: string): Promise<TokenExchangeResult> {
    const basicAuth = Buffer.from(`${NEXTDOOR_CLIENT_ID}:${NEXTDOOR_CLIENT_SECRET}`).toString('base64');
    const response = await fetch('https://auth.nextdoor.com/v2/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        Authorization: `Basic ${basicAuth}`,
      },
      body: new URLSearchParams({
        grant_type: 'refresh_token',
        refresh_token: refreshToken,
      }),
    });
    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Nextdoor token refresh failed: ${error}`);
    }
    const data = await response.json();
    return {
      accessToken: data.access_token,
      refreshToken: data.refresh_token,
      expiresIn: data.expires_in,
    };
  },

  async getNextdoorProfile(accessToken: string): Promise<{ id: string; name: string; profileUrl?: string }> {
    const response = await fetch('https://nextdoor.com/external/api/partner/v1/me/', {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        Accept: 'application/json',
      },
    });
    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Nextdoor profile fetch failed: ${error}`);
    }
    const data = await response.json();
    return {
      id: data.secure_profile_id || data.id || 'unknown',
      name: data.name || data.display_name || 'Nextdoor User',
      profileUrl: data.profile_url,
    };
  },

  async postToNextdoor(
    accessToken: string,
    message: string,
    mediaUrls?: string[]
  ): Promise<{ id: string; shareLink?: string }> {
    console.log(`[POST_ND] Posting to Nextdoor`);
    const body: any = {
      body_text: message,
    };

    if (mediaUrls && mediaUrls.length > 0) {
      body.media_attachments = mediaUrls;
    }

    const response = await fetch('https://nextdoor.com/external/api/partner/v1/post/create/', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify(body),
    });

    const rawText = await response.text();
    console.log(`[POST_ND] Response status: ${response.status}, body: ${rawText}`);

    if (!response.ok) {
      let errMsg = 'Failed to post to Nextdoor';
      try { errMsg = JSON.parse(rawText)?.message || JSON.parse(rawText)?.error || errMsg; } catch {}
      throw new Error(errMsg);
    }

    const result = JSON.parse(rawText);
    return {
      id: result.post_share_id || result.id || 'posted',
      shareLink: result.share_link,
    };
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
