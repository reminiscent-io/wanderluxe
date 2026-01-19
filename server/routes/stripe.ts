import { Router, Request, Response } from 'express';
import Stripe from 'stripe';
import { createClient } from '@supabase/supabase-js';

const router = Router();

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || '');

const supabaseUrl = process.env.SUPABASE_URL || '';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
const supabase = createClient(supabaseUrl, supabaseServiceKey);

const PRO_PRICE_AMOUNT = 399;
const PRO_PRICE_CURRENCY = 'usd';

async function getOrCreateStripeCustomer(userId: string, email: string): Promise<string> {
  const { data: profile } = await supabase
    .from('profiles')
    .select('stripe_customer_id')
    .eq('id', userId)
    .single();

  if (profile?.stripe_customer_id) {
    return profile.stripe_customer_id;
  }

  const customer = await stripe.customers.create({
    email,
    metadata: { supabase_user_id: userId },
  });

  await supabase
    .from('profiles')
    .update({ stripe_customer_id: customer.id })
    .eq('id', userId);

  return customer.id;
}

router.post('/api/stripe/create-checkout', async (req: Request, res: Response) => {
  try {
    if (!process.env.STRIPE_SECRET_KEY) {
      console.error('STRIPE_SECRET_KEY is not configured');
      return res.status(500).json({ error: 'Stripe is not configured' });
    }

    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const token = authHeader.split(' ')[1];
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);

    if (authError || !user) {
      console.error('Auth error:', authError);
      return res.status(401).json({ error: 'Invalid token' });
    }

    const customerId = await getOrCreateStripeCustomer(user.id, user.email || '');
    console.log('Created/retrieved customer:', customerId);

    const successUrl = `${req.headers.origin || process.env.REPLIT_DEV_DOMAIN || 'http://localhost:5000'}/profile?upgraded=true`;
    const cancelUrl = `${req.headers.origin || process.env.REPLIT_DEV_DOMAIN || 'http://localhost:5000'}/profile?cancelled=true`;

    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      payment_method_types: ['card'],
      mode: 'subscription',
      line_items: [
        {
          price_data: {
            currency: PRO_PRICE_CURRENCY,
            product_data: {
              name: 'WanderLuxe Pro',
              description: 'Unlimited AI assistant messages and document imports',
            },
            unit_amount: PRO_PRICE_AMOUNT,
            recurring: {
              interval: 'month',
            },
          },
          quantity: 1,
        },
      ],
      success_url: successUrl,
      cancel_url: cancelUrl,
      metadata: {
        supabase_user_id: user.id,
      },
      subscription_data: {
        metadata: {
          supabase_user_id: user.id,
        },
      },
    });

    console.log('Checkout session created:', session.id);
    return res.json({ url: session.url });
  } catch (error: any) {
    console.error('Error creating checkout session:', error?.message || error);
    return res.status(500).json({ error: error?.message || 'Failed to create checkout session' });
  }
});

router.post('/api/stripe/webhook', async (req: Request, res: Response) => {
  const sig = req.headers['stripe-signature'];
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  if (!sig || !webhookSecret) {
    console.error('Missing stripe signature or webhook secret');
    return res.status(400).json({ error: 'Missing signature' });
  }

  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(req.body, sig, webhookSecret);
  } catch (err: any) {
    console.error('Webhook signature verification failed:', err.message);
    return res.status(400).json({ error: `Webhook Error: ${err.message}` });
  }

  console.log(`Received Stripe event: ${event.type}`);

  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session;
        const userId = session.metadata?.supabase_user_id;

        if (userId && session.subscription) {
          await supabase
            .from('profiles')
            .update({
              subscription_tier: 'pro',
              stripe_subscription_id: session.subscription as string,
              ai_messages_limit: -1,
              ai_imports_limit: -1,
            })
            .eq('id', userId);

          console.log(`User ${userId} upgraded to Pro`);
        }
        break;
      }

      case 'customer.subscription.updated': {
        const subscription = event.data.object as Stripe.Subscription;
        let userId = subscription.metadata?.supabase_user_id;

        if (!userId && subscription.customer) {
          const customerId = typeof subscription.customer === 'string' ? subscription.customer : subscription.customer.id;
          const { data: profile } = await supabase
            .from('profiles')
            .select('id')
            .eq('stripe_customer_id', customerId)
            .single();
          userId = profile?.id;
        }

        if (userId) {
          const isActive = subscription.status === 'active' || subscription.status === 'trialing';

          await supabase
            .from('profiles')
            .update({
              subscription_tier: isActive ? 'pro' : 'free',
              ai_messages_limit: isActive ? -1 : 10,
              ai_imports_limit: isActive ? -1 : 5,
            })
            .eq('id', userId);

          console.log(`User ${userId} subscription updated: ${subscription.status}`);
        }
        break;
      }

      case 'customer.subscription.deleted': {
        const subscription = event.data.object as Stripe.Subscription;
        let userId = subscription.metadata?.supabase_user_id;

        if (!userId && subscription.customer) {
          const customerId = typeof subscription.customer === 'string' ? subscription.customer : subscription.customer.id;
          const { data: profile } = await supabase
            .from('profiles')
            .select('id')
            .eq('stripe_customer_id', customerId)
            .single();
          userId = profile?.id;
        }

        if (userId) {
          await supabase
            .from('profiles')
            .update({
              subscription_tier: 'free',
              stripe_subscription_id: null,
              ai_messages_limit: 10,
              ai_imports_limit: 5,
            })
            .eq('id', userId);

          console.log(`User ${userId} subscription cancelled`);
        }
        break;
      }

      case 'invoice.payment_succeeded': {
        const invoice = event.data.object as Stripe.Invoice;
        const subscriptionId = (invoice as any).subscription;
        if (subscriptionId) {
          const subscription = await stripe.subscriptions.retrieve(subscriptionId as string);
          const userId = subscription.metadata?.supabase_user_id;

          if (userId) {
            await supabase
              .from('profiles')
              .update({
                subscription_tier: 'pro',
                ai_messages_limit: -1,
                ai_imports_limit: -1,
              })
              .eq('id', userId);

            console.log(`User ${userId} payment succeeded`);
          }
        }
        break;
      }

      case 'invoice.payment_failed': {
        const invoice = event.data.object as Stripe.Invoice;
        const subscriptionId = (invoice as any).subscription;
        if (subscriptionId) {
          const subscription = await stripe.subscriptions.retrieve(subscriptionId as string);
          const userId = subscription.metadata?.supabase_user_id;

          if (userId) {
            console.log(`User ${userId} payment failed - subscription may be suspended`);
          }
        }
        break;
      }
    }
  } catch (error) {
    console.error('Error processing webhook:', error);
    return res.status(500).json({ error: 'Webhook processing failed' });
  }

  return res.json({ received: true });
});

router.post('/api/stripe/create-portal', async (req: Request, res: Response) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const token = authHeader.split(' ')[1];
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);

    if (authError || !user) {
      return res.status(401).json({ error: 'Invalid token' });
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('stripe_customer_id')
      .eq('id', user.id)
      .single();

    if (!profile?.stripe_customer_id) {
      return res.status(400).json({ error: 'No subscription found' });
    }

    const returnUrl = `${req.headers.origin || process.env.REPLIT_DEV_DOMAIN || 'http://localhost:5000'}/profile`;

    const portalSession = await stripe.billingPortal.sessions.create({
      customer: profile.stripe_customer_id,
      return_url: returnUrl,
    });

    return res.json({ url: portalSession.url });
  } catch (error) {
    console.error('Error creating portal session:', error);
    return res.status(500).json({ error: 'Failed to create portal session' });
  }
});

export default router;
