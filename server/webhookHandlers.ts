import Stripe from 'stripe';
import { getStripeSync } from './stripeClient';
import { storage } from './storage';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || '', {
  apiVersion: '2024-04-10' as any,
});

export class WebhookHandlers {
  static async processWebhook(payload: Buffer, signature: string): Promise<void> {
    if (!Buffer.isBuffer(payload)) {
      throw new Error(
        'STRIPE WEBHOOK ERROR: Payload must be a Buffer. ' +
        'Received type: ' + typeof payload + '. ' +
        'This usually means express.json() parsed the body before reaching this handler. ' +
        'FIX: Ensure webhook route is registered BEFORE app.use(express.json()).'
      );
    }

    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
    if (!webhookSecret) {
      throw new Error('STRIPE_WEBHOOK_SECRET is not set. Cannot verify webhook signature.');
    }

    let event: Stripe.Event;
    try {
      event = stripe.webhooks.constructEvent(payload, signature, webhookSecret);
    } catch (err: any) {
      throw new Error(`Webhook signature verification failed: ${err.message}`);
    }

    const sync = await getStripeSync();
    await sync.processWebhook(payload, signature);

    try {
      const eventType = event.type;

      if (eventType === 'customer.subscription.created' ||
          eventType === 'customer.subscription.updated' ||
          eventType === 'customer.subscription.deleted') {
        const subscription = event.data.object as Stripe.Subscription;
        if (subscription) {
          const customerId = subscription.customer as string;
          const tier = subscription.metadata?.tier || 'basic';
          const isActive = subscription.status === 'active' || subscription.status === 'trialing';

          const allUsers = await storage.getAllUsers();
          const user = allUsers.find((u: any) => u.stripeCustomerId === customerId);
          if (user) {
            await storage.updateUserStripeInfo(user.id, {
              stripeSubscriptionId: subscription.id,
              subscriptionStatus: subscription.status,
              subscriptionTier: isActive ? tier : 'free',
            });
            console.log(`Webhook: Updated user ${user.id} tier=${isActive ? tier : 'free'} status=${subscription.status}`);
          }
        }
      }
    } catch (tierError: any) {
      console.log('Tier update from webhook skipped:', tierError?.message);
    }
  }
}
