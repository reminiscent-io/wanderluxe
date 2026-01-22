import { Router, Request, Response } from 'express';
import Stripe from 'stripe';
import { createClient, SupabaseClient } from '@supabase/supabase-js';

const router = Router();

// Lazy initialization of Stripe and Supabase clients
let stripe: Stripe | null = null;
let supabase: SupabaseClient | null = null;

function getStripe(): Stripe {
  if (!stripe) {
    const secretKey = process.env.STRIPE_SECRET_KEY;
    if (!secretKey) {
      throw new Error('STRIPE_SECRET_KEY is not configured');
    }
    stripe = new Stripe(secretKey);
  }
  return stripe;
}

function getSupabase(): SupabaseClient {
  if (!supabase) {
    const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error('Supabase configuration is missing');
    }
    supabase = createClient(supabaseUrl, supabaseServiceKey);
  }
  return supabase;
}

const PRO_PRICE_AMOUNT = 399;
const PRO_PRICE_CURRENCY = 'usd';

async function getOrCreateStripeCustomer(userId: string, email: string): Promise<string> {
  const sb = getSupabase();
  const stripeClient = getStripe();

  const { data: profile, error: profileError } = await sb
    .from('profiles')
    .select('stripe_customer_id')
    .eq('id', userId)
    .single();

  if (profileError) {
    console.error('Error fetching profile for Stripe customer:', profileError);
    throw new Error('Failed to fetch user profile');
  }

  if (profile?.stripe_customer_id) {
    return profile.stripe_customer_id;
  }

  const customer = await stripeClient.customers.create({
    email,
    metadata: { supabase_user_id: userId },
  });

  const { error: updateError } = await sb
    .from('profiles')
    .update({ stripe_customer_id: customer.id })
    .eq('id', userId);

  if (updateError) {
    console.error('Error updating profile with Stripe customer ID:', updateError);
    // Don't throw - customer was created, just log the error
  }

  return customer.id;
}

router.post('/api/stripe/create-checkout', async (req: Request, res: Response) => {
  try {
    // Check for required environment variables
    if (!process.env.STRIPE_SECRET_KEY) {
      console.error('STRIPE_SECRET_KEY is not configured');
      return res.status(500).json({ error: 'Stripe is not configured. Please contact support.' });
    }

    const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
    if (!supabaseUrl || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
      console.error('Supabase environment variables are not configured');
      return res.status(500).json({ error: 'Server configuration error. Please contact support.' });
    }

    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Please sign in to upgrade' });
    }

    const token = authHeader.split(' ')[1];
    const sb = getSupabase();
    const { data: { user }, error: authError } = await sb.auth.getUser(token);

    if (authError || !user) {
      console.error('Auth error:', authError);
      return res.status(401).json({ error: 'Session expired. Please sign in again.' });
    }

    const customerId = await getOrCreateStripeCustomer(user.id, user.email || '');
    console.log('Created/retrieved customer:', customerId);

    const origin = req.headers.origin || process.env.REPLIT_DEV_DOMAIN || 'http://localhost:5000';
    const successUrl = `${origin}/profile?upgraded=true`;
    const cancelUrl = `${origin}/profile?cancelled=true`;

    const stripeClient = getStripe();
    const session = await stripeClient.checkout.sessions.create({
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

    if (!session.url) {
      console.error('Stripe checkout session created without URL:', session.id);
      return res.status(500).json({ error: 'Failed to create checkout URL' });
    }

    console.log('Checkout session created:', session.id);
    return res.json({ url: session.url });
  } catch (error: any) {
    console.error('Error creating checkout session:', error?.message || error);
    // Provide user-friendly error messages for common Stripe errors
    if (error?.type === 'StripeAuthenticationError') {
      return res.status(500).json({ error: 'Payment system configuration error. Please contact support.' });
    }
    if (error?.type === 'StripeConnectionError') {
      return res.status(503).json({ error: 'Unable to connect to payment service. Please try again.' });
    }
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
    const stripeClient = getStripe();
    event = stripeClient.webhooks.constructEvent(req.body, sig, webhookSecret);
  } catch (err: any) {
    console.error('Webhook signature verification failed:', err.message);
    return res.status(400).json({ error: `Webhook Error: ${err.message}` });
  }

  console.log(`Received Stripe event: ${event.type}`);

  try {
    const sb = getSupabase();
    const stripeClient = getStripe();

    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session;
        const userId = session.metadata?.supabase_user_id;

        if (userId && session.subscription) {
          await sb
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
          const { data: profile } = await sb
            .from('profiles')
            .select('id')
            .eq('stripe_customer_id', customerId)
            .single();
          userId = profile?.id;
        }

        if (userId) {
          const isActive = subscription.status === 'active' || subscription.status === 'trialing';

          await sb
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
          const { data: profile } = await sb
            .from('profiles')
            .select('id')
            .eq('stripe_customer_id', customerId)
            .single();
          userId = profile?.id;
        }

        if (userId) {
          await sb
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
          const subscription = await stripeClient.subscriptions.retrieve(subscriptionId as string);
          const userId = subscription.metadata?.supabase_user_id;

          if (userId) {
            await sb
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
          const subscription = await stripeClient.subscriptions.retrieve(subscriptionId as string);
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
      return res.status(401).json({ error: 'Please sign in to manage subscription' });
    }

    const token = authHeader.split(' ')[1];
    const sb = getSupabase();
    const { data: { user }, error: authError } = await sb.auth.getUser(token);

    if (authError || !user) {
      return res.status(401).json({ error: 'Session expired. Please sign in again.' });
    }

    const { data: profile } = await sb
      .from('profiles')
      .select('stripe_customer_id')
      .eq('id', user.id)
      .single();

    if (!profile?.stripe_customer_id) {
      return res.status(400).json({ error: 'No subscription found' });
    }

    const returnUrl = `${req.headers.origin || process.env.REPLIT_DEV_DOMAIN || 'http://localhost:5000'}/profile`;

    const stripeClient = getStripe();
    const portalSession = await stripeClient.billingPortal.sessions.create({
      customer: profile.stripe_customer_id,
      return_url: returnUrl,
    });

    return res.json({ url: portalSession.url });
  } catch (error: any) {
    console.error('Error creating portal session:', error);
    if (error?.type === 'StripeAuthenticationError') {
      return res.status(500).json({ error: 'Payment system configuration error. Please contact support.' });
    }
    return res.status(500).json({ error: 'Failed to create portal session' });
  }
});

export default router;
