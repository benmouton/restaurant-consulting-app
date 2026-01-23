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

async function seedEmployeeProduct() {
  const secretKey = await getCredentials();
  const stripe = new Stripe(secretKey, {
    apiVersion: '2025-08-27.basil',
  });

  console.log('Checking for existing Employee Seats product...');
  const existingProducts = await stripe.products.search({ 
    query: "name:'Employee Scheduling Seat'" 
  });

  if (existingProducts.data.length > 0) {
    console.log('Employee Seats product already exists:', existingProducts.data[0].id);
    const existingPrices = await stripe.prices.list({ 
      product: existingProducts.data[0].id,
      active: true 
    });
    if (existingPrices.data.length > 0) {
      console.log('Employee Seat Price ID:', existingPrices.data[0].id);
    }
    return;
  }

  console.log('Creating Employee Scheduling Seat product...');
  
  const product = await stripe.products.create({
    name: 'Employee Scheduling Seat',
    description: 'Per-employee access to the staff scheduling portal. Each active employee with portal access adds $5/month.',
    metadata: {
      type: 'subscription',
      tier: 'employee_seat',
    }
  });
  console.log('Created product:', product.id);

  const price = await stripe.prices.create({
    product: product.id,
    unit_amount: 500, // $5.00
    currency: 'usd',
    recurring: { interval: 'month' },
    metadata: {
      display_name: '$5/month per employee',
      is_employee_seat: 'true',
    }
  });
  console.log('Created price:', price.id);

  console.log('\nEmployee Seat product setup complete!');
  console.log('Product ID:', product.id);
  console.log('Price ID:', price.id);
  console.log('\nThis price will be added to subscriptions as employees accept invites.');
}

seedEmployeeProduct().catch(console.error);
