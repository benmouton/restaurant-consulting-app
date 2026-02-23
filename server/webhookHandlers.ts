import { getStripeSync } from './stripeClient';
import { storage } from './storage';

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

    const sync = await getStripeSync();
    await sync.processWebhook(payload, signature);

    try {
      const rawPayload = JSON.parse(payload.toString());
      const eventType = rawPayload?.type;

      if (eventType === 'customer.subscription.created' ||
          eventType === 'customer.subscription.updated' ||
          eventType === 'customer.subscription.deleted') {
        const subscription = rawPayload?.data?.object;
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
