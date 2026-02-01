import Stripe from 'stripe';

let connectionSettings: any;
let cachedCredentials: { publishableKey: string; secretKey: string } | null = null;

async function getCredentials() {
  // Return cached credentials if available
  if (cachedCredentials) {
    return cachedCredentials;
  }

  // First, check for environment variable fallback
  if (process.env.STRIPE_SECRET_KEY) {
    // Strip all non-printable ASCII characters and whitespace
    const sanitizeKey = (key: string) => key.replace(/[^\x20-\x7E]/g, '').trim();
    const secretKey = sanitizeKey(process.env.STRIPE_SECRET_KEY);
    const publishableKey = sanitizeKey(process.env.STRIPE_PUBLISHABLE_KEY || '');
    console.log('Using STRIPE_SECRET_KEY from environment variable, key length:', secretKey.length);
    cachedCredentials = {
      publishableKey,
      secretKey,
    };
    return cachedCredentials;
  }

  // Try Replit Connector
  const hostname = process.env.REPLIT_CONNECTORS_HOSTNAME;
  const xReplitToken = process.env.REPL_IDENTITY
    ? 'repl ' + process.env.REPL_IDENTITY
    : process.env.WEB_REPL_RENEWAL
      ? 'depl ' + process.env.WEB_REPL_RENEWAL
      : null;

  if (!xReplitToken || !hostname) {
    throw new Error('No Stripe credentials found. Please set STRIPE_SECRET_KEY environment variable.');
  }

  const connectorName = 'stripe';
  const isProduction = process.env.REPLIT_DEPLOYMENT === '1';
  const targetEnvironment = isProduction ? 'production' : 'development';

  try {
    const url = new URL(`https://${hostname}/api/v2/connection`);
    url.searchParams.set('include_secrets', 'true');
    url.searchParams.set('connector_names', connectorName);
    url.searchParams.set('environment', targetEnvironment);

    const response = await fetch(url.toString(), {
      headers: {
        'Accept': 'application/json',
        'X_REPLIT_TOKEN': xReplitToken
      }
    });

    const data = await response.json();
    
    connectionSettings = data.items?.[0];

    if (!connectionSettings || (!connectionSettings.settings.publishable || !connectionSettings.settings.secret)) {
      throw new Error(`Stripe ${targetEnvironment} connection not found`);
    }

    cachedCredentials = {
      publishableKey: connectionSettings.settings.publishable,
      secretKey: connectionSettings.settings.secret,
    };
    return cachedCredentials;
  } catch (error) {
    // Fall back to environment variable if connector fails
    if (process.env.STRIPE_SECRET_KEY) {
      const sanitizeKey = (key: string) => key.replace(/[^\x20-\x7E]/g, '').trim();
      console.log('Connector failed, falling back to STRIPE_SECRET_KEY');
      cachedCredentials = {
        publishableKey: sanitizeKey(process.env.STRIPE_PUBLISHABLE_KEY || ''),
        secretKey: sanitizeKey(process.env.STRIPE_SECRET_KEY),
      };
      return cachedCredentials;
    }
    throw error;
  }
}

export async function getUncachableStripeClient() {
  const { secretKey } = await getCredentials();

  return new Stripe(secretKey, {
    apiVersion: '2025-08-27.basil',
  });
}

export async function getStripePublishableKey() {
  const { publishableKey } = await getCredentials();
  return publishableKey;
}

export async function getStripeSecretKey() {
  const { secretKey } = await getCredentials();
  return secretKey;
}

let stripeSync: any = null;

export async function getStripeSync() {
  if (!stripeSync) {
    const { StripeSync } = await import('stripe-replit-sync');
    const secretKey = await getStripeSecretKey();

    stripeSync = new StripeSync({
      poolConfig: {
        connectionString: process.env.DATABASE_URL!,
        max: 2,
      },
      stripeSecretKey: secretKey,
    });
  }
  return stripeSync;
}
