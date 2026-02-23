import { getUncachableStripeClient } from './stripeClient';
import { db } from './db';
import { sql } from 'drizzle-orm';

export class StripeService {
  async getStripe() {
    return await getUncachableStripeClient();
  }

  async createCustomer(email: string, userId: string) {
    const stripe = await getUncachableStripeClient();
    return await stripe.customers.create({
      email,
      metadata: { userId },
    });
  }

  async createCheckoutSession(customerId: string, priceId: string, successUrl: string, cancelUrl: string, metadata?: Record<string, string>) {
    const stripe = await getUncachableStripeClient();
    return await stripe.checkout.sessions.create({
      customer: customerId,
      payment_method_types: ['card'],
      line_items: [{ price: priceId, quantity: 1 }],
      mode: 'subscription',
      success_url: successUrl,
      cancel_url: cancelUrl,
      subscription_data: {
        trial_period_days: 7,
        metadata: metadata || {},
      },
      metadata: metadata || {},
    });
  }

  async getOrCreateTierPrice(tier: string, interval: 'month' | 'year'): Promise<string> {
    const stripe = await getUncachableStripeClient();

    const tierConfig: Record<string, { name: string; monthlyAmount: number; annualAmount: number }> = {
      basic: { name: 'The Restaurant Consultant - Basic', monthlyAmount: 1000, annualAmount: 9900 },
      pro: { name: 'The Restaurant Consultant - Pro', monthlyAmount: 2500, annualAmount: 24900 },
    };

    const config = tierConfig[tier];
    if (!config) throw new Error(`Invalid tier: ${tier}`);

    const amount = interval === 'year' ? config.annualAmount : config.monthlyAmount;
    const lookupKey = `trc_${tier}_${interval}`;

    const existing = await stripe.prices.list({
      lookup_keys: [lookupKey],
      active: true,
      limit: 1,
    });

    if (existing.data.length > 0) {
      return existing.data[0].id;
    }

    const products = await stripe.products.list({ active: true, limit: 100 });
    let product = products.data.find(p => p.metadata?.tier === tier);

    if (!product) {
      product = await stripe.products.create({
        name: config.name,
        metadata: { tier },
      });
    }

    const price = await stripe.prices.create({
      product: product.id,
      unit_amount: amount,
      currency: 'usd',
      recurring: { interval },
      lookup_key: lookupKey,
      metadata: { tier, interval },
    });

    return price.id;
  }

  async createCustomerPortalSession(customerId: string, returnUrl: string) {
    const stripe = await getUncachableStripeClient();
    return await stripe.billingPortal.sessions.create({
      customer: customerId,
      return_url: returnUrl,
    });
  }

  async getProduct(productId: string) {
    const result = await db.execute(
      sql`SELECT * FROM stripe.products WHERE id = ${productId}`
    );
    return result.rows[0] || null;
  }

  async getSubscription(subscriptionId: string) {
    const result = await db.execute(
      sql`SELECT * FROM stripe.subscriptions WHERE id = ${subscriptionId}`
    );
    return result.rows[0] || null;
  }

  async listProducts(active = true) {
    const result = await db.execute(
      sql`SELECT * FROM stripe.products WHERE active = ${active}`
    );
    return result.rows;
  }

  async listPrices(active = true) {
    const result = await db.execute(
      sql`SELECT * FROM stripe.prices WHERE active = ${active}`
    );
    return result.rows;
  }

  async getActiveSubscriptionForCustomer(customerId: string) {
    const result = await db.execute(
      sql`SELECT * FROM stripe.subscriptions WHERE customer = ${customerId} AND (status = 'active' OR status = 'trialing') LIMIT 1`
    );
    return result.rows[0] || null;
  }

  async getEmployeeSeatPriceId(): Promise<string | null> {
    // Find the price for the Employee Scheduling Seat product
    const result = await db.execute(
      sql`SELECT p.id FROM stripe.prices p
          INNER JOIN stripe.products prod ON p.product = prod.id
          WHERE p.active = true 
          AND prod.name = 'Employee Scheduling Seat'
          AND prod.active = true
          ORDER BY p.created DESC 
          LIMIT 1`
    );
    return result.rows[0]?.id as string || null;
  }

  async createEmployeeAddCheckout(
    customerId: string | null, 
    successUrl: string, 
    cancelUrl: string,
    employeeData: { firstName: string; lastName: string; email?: string; phone?: string; positionId?: number; hourlyRate?: string; ownerId: string }
  ) {
    const stripe = await getUncachableStripeClient();
    
    const sessionConfig: any = {
      payment_method_types: ['card'],
      line_items: [{
        price_data: {
          currency: 'usd',
          product_data: {
            name: 'New Employee Fee',
            description: `Add ${employeeData.firstName} ${employeeData.lastName} to your team`,
          },
          unit_amount: 500, // $5.00 in cents
        },
        quantity: 1,
      }],
      mode: 'payment',
      success_url: successUrl,
      cancel_url: cancelUrl,
      metadata: {
        type: 'employee_add',
        firstName: employeeData.firstName,
        lastName: employeeData.lastName,
        email: employeeData.email || '',
        phone: employeeData.phone || '',
        positionId: employeeData.positionId?.toString() || '',
        hourlyRate: employeeData.hourlyRate || '',
        ownerId: employeeData.ownerId,
      },
    };

    if (customerId) {
      sessionConfig.customer = customerId;
    }

    return await stripe.checkout.sessions.create(sessionConfig);
  }

  async getCheckoutSession(sessionId: string) {
    const stripe = await getUncachableStripeClient();
    return await stripe.checkout.sessions.retrieve(sessionId);
  }

  async updateEmployeeSeatQuantity(customerId: string, seatCount: number): Promise<boolean> {
    try {
      const stripe = await getUncachableStripeClient();
      
      // Get the active subscription for this customer
      const subscriptions = await stripe.subscriptions.list({
        customer: customerId,
        status: 'active',
        limit: 1,
      });

      if (!subscriptions.data.length) {
        console.log('No active subscription found for customer:', customerId);
        return false;
      }

      const subscription = subscriptions.data[0];
      const employeeSeatPriceId = await this.getEmployeeSeatPriceId();
      
      if (!employeeSeatPriceId) {
        console.log('Employee seat price not found');
        return false;
      }

      // Find existing employee seat item in subscription
      const existingSeatItem = subscription.items.data.find(
        item => item.price.id === employeeSeatPriceId
      );

      if (existingSeatItem) {
        if (seatCount > 0) {
          // Update quantity
          await stripe.subscriptionItems.update(existingSeatItem.id, {
            quantity: seatCount,
          });
        } else {
          // Remove the item if no seats
          await stripe.subscriptionItems.del(existingSeatItem.id);
        }
      } else if (seatCount > 0) {
        // Add new line item
        await stripe.subscriptionItems.create({
          subscription: subscription.id,
          price: employeeSeatPriceId,
          quantity: seatCount,
        });
      }

      return true;
    } catch (error) {
      console.error('Failed to update employee seat quantity:', error);
      return false;
    }
  }
}

export const stripeService = new StripeService();
