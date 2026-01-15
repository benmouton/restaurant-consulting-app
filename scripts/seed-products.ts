import Stripe from 'stripe';

async function getCredentials() {
  const hostname = process.env.REPLIT_CONNECTORS_HOSTNAME;
  const xReplitToken = process.env.REPL_IDENTITY
    ? 'repl ' + process.env.REPL_IDENTITY
    : process.env.WEB_REPL_RENEWAL
      ? 'depl ' + process.env.WEB_REPL_RENEWAL
      : null;

  if (!xReplitToken) {
    throw new Error('X_REPLIT_TOKEN not found');
  }

  const connectorName = 'stripe';
  const targetEnvironment = 'development';

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
  const connectionSettings = data.items?.[0];

  if (!connectionSettings?.settings?.secret) {
    throw new Error('Stripe connection not found');
  }

  return connectionSettings.settings.secret;
}

async function seedProducts() {
  const secretKey = await getCredentials();
  const stripe = new Stripe(secretKey, {
    apiVersion: '2025-08-27.basil',
  });

  console.log('Checking for existing products...');
  const existingProducts = await stripe.products.search({ 
    query: "name:'Restaurant Consultant Pro'" 
  });

  if (existingProducts.data.length > 0) {
    console.log('Product already exists:', existingProducts.data[0].id);
    const existingPrices = await stripe.prices.list({ 
      product: existingProducts.data[0].id,
      active: true 
    });
    if (existingPrices.data.length > 0) {
      console.log('Price ID:', existingPrices.data[0].id);
    }
    return;
  }

  console.log('Creating Restaurant Consultant Pro subscription...');
  
  const product = await stripe.products.create({
    name: 'Restaurant Consultant Pro',
    description: 'Full access to the Restaurant Consultant platform: AI-powered operational frameworks, training templates, financial document analysis, and domain-specific AI tools.',
    metadata: {
      type: 'subscription',
      tier: 'pro',
    }
  });
  console.log('Created product:', product.id);

  const price = await stripe.prices.create({
    product: product.id,
    unit_amount: 1000,
    currency: 'usd',
    recurring: { interval: 'month' },
    metadata: {
      display_name: '$10/month',
    }
  });
  console.log('Created price:', price.id);

  console.log('\nProduct setup complete!');
  console.log('Product ID:', product.id);
  console.log('Price ID:', price.id);
  console.log('\nAdd this price ID to your checkout flow.');
}

seedProducts().catch(console.error);
