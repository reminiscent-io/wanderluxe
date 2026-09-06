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

async function resolveUserIdFromSubscription(
  sb: SupabaseClient,
  subscription: Stripe.Subscription
): Promise<string | undefined> {
  const userId = subscription.metadata?.supabase_user_id;
  if (userId) return userId;

  if (!subscription.customer) return undefined;

  const customerId = typeof subscription.customer === 'string'
    ? subscription.customer
    : subscription.customer.id;

  const { data: profile } = await sb
    .from('profiles')
    .select('id')
    .eq('stripe_customer_id', customerId)
    .single();

  return profile?.id;
}

async function handleCheckoutCompleted(
  sb: SupabaseClient,
  event: Stripe.Event
): Promise<void> {
  const session = event.data.object as Stripe.Checkout.Session;
  const userId = session.metadata?.supabase_user_id;

  if (!userId || !session.subscription) return;

  await sb
    .from('profiles')
    .update({
      subscription_tier: 'pro',
      stripe_subscription_id: session.subscription as string,
      // Chat is unlimited on every tier; the 20/day OCR cap is universal
      // abuse protection, so Pro keeps it too.
      ai_messages_limit: -1,
      ai_imports_limit: 20,
    })
    .eq('id', userId);

  console.log(`User ${userId} upgraded to Pro`);
}

async function handleSubscriptionUpdated(
  sb: SupabaseClient,
  event: Stripe.Event
): Promise<void> {
  const subscription = event.data.object as Stripe.Subscription;
  const userId = await resolveUserIdFromSubscription(sb, subscription);

  if (!userId) return;

  const isActive = subscription.status === 'active' || subscription.status === 'trialing';

  await sb
    .from('profiles')
    .update({
      subscription_tier: isActive ? 'pro' : 'free',
      // AI limits no longer vary by tier (unlimited chat, 20 OCR imports/day).
      ai_messages_limit: -1,
      ai_imports_limit: 20,
    })
    .eq('id', userId);

  console.log(`User ${userId} subscription updated: ${subscription.status}`);
}

async function handleSubscriptionDeleted(
  sb: SupabaseClient,
  event: Stripe.Event
): Promise<void> {
  const subscription = event.data.object as Stripe.Subscription;
  const userId = await resolveUserIdFromSubscription(sb, subscription);

  if (!userId) return;

  await sb
    .from('profiles')
    .update({
      subscription_tier: 'free',
      stripe_subscription_id: null,
      ai_messages_limit: -1,
      ai_imports_limit: 20,
    })
    .eq('id', userId);

  console.log(`User ${userId} subscription cancelled`);
}

async function handleInvoicePaymentSucceeded(
  sb: SupabaseClient,
  stripeClient: Stripe,
  event: Stripe.Event
): Promise<void> {
  const invoice = event.data.object as Stripe.Invoice;
  // `subscription` exists on Invoice at runtime but isn't in Stripe v20 TS types
  const subscriptionId = (invoice as Stripe.Invoice & { subscription?: string | Stripe.Subscription }).subscription;
  if (!subscriptionId) return;

  const subscription = await stripeClient.subscriptions.retrieve(subscriptionId as string);
  const userId = subscription.metadata?.supabase_user_id;

  if (!userId) return;

  await sb
    .from('profiles')
    .update({
      subscription_tier: 'pro',
      ai_messages_limit: -1,
      ai_imports_limit: 20,
    })
    .eq('id', userId);

  console.log(`User ${userId} payment succeeded`);
}

async function handleInvoicePaymentFailed(
  stripeClient: Stripe,
  event: Stripe.Event
): Promise<void> {
  const invoice = event.data.object as Stripe.Invoice;
  // `subscription` exists on Invoice at runtime but isn't in Stripe v20 TS types
  const subscriptionId = (invoice as Stripe.Invoice & { subscription?: string | Stripe.Subscription }).subscription;
  if (!subscriptionId) return;

  const subscription = await stripeClient.subscriptions.retrieve(subscriptionId as string);
  const userId = subscription.metadata?.supabase_user_id;

  if (userId) {
    console.log(`User ${userId} payment failed - subscription may be suspended`);
  }
}

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
    // Check for required environment variables with detailed logging
    const hasStripeKey = !!process.env.STRIPE_SECRET_KEY;
    const hasSupabaseUrl = !!(process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL);
    const hasServiceRoleKey = !!process.env.SUPABASE_SERVICE_ROLE_KEY;


    if (!hasStripeKey) {
      console.error('STRIPE_SECRET_KEY is not configured');
      return res.status(500).json({ error: 'Stripe is not configured. Please contact support.' });
    }

    const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
    if (!hasSupabaseUrl || !hasServiceRoleKey) {
      console.error('Supabase environment variables are not configured:', { hasSupabaseUrl, hasServiceRoleKey });
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

    let customerId: string;
    try {
      customerId = await getOrCreateStripeCustomer(user.id, user.email || '');
      console.log('Created/retrieved customer:', customerId);
    } catch (customerError: unknown) {
      console.error('Failed to create/retrieve Stripe customer:', customerError instanceof Error ? customerError.message : customerError);
      return res.status(500).json({ error: 'Failed to set up payment. Please try again.' });
    }

    const origin = req.headers.origin || process.env.REPLIT_DEV_DOMAIN || 'http://localhost:5001';
    const successUrl = `${origin}/profile?upgraded=true`;
    const cancelUrl = `${origin}/profile?cancelled=true`;
    console.log('Creating checkout session with URLs:', { origin, successUrl, cancelUrl });

    const stripeClient = getStripe();
    let session;
    try {
      session = await stripeClient.checkout.sessions.create({
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
    } catch (sessionError: unknown) {
      const stripeErr = sessionError instanceof Stripe.errors.StripeError ? sessionError : null;
      console.error('Failed to create Stripe checkout session:', {
        message: stripeErr?.message ?? (sessionError instanceof Error ? sessionError.message : String(sessionError)),
        type: stripeErr?.type,
        code: stripeErr?.code,
        statusCode: stripeErr?.statusCode,
      });
      // Provide user-friendly error messages for common Stripe errors
      if (stripeErr?.type === 'StripeAuthenticationError') {
        return res.status(500).json({ error: 'Payment system configuration error. Please contact support.' });
      }
      if (stripeErr?.type === 'StripeConnectionError') {
        return res.status(503).json({ error: 'Unable to connect to payment service. Please try again.' });
      }
      if (stripeErr?.type === 'StripeInvalidRequestError') {
        return res.status(500).json({ error: 'Payment configuration error. Please contact support.' });
      }
      return res.status(500).json({ error: 'Failed to create checkout session. Please try again.' });
    }

    if (!session.url) {
      console.error('Stripe checkout session created without URL:', session.id);
      return res.status(500).json({ error: 'Failed to create checkout URL' });
    }

    console.log('Checkout session created:', session.id);
    return res.json({ url: session.url });
  } catch (error: unknown) {
    console.error('Unexpected error in checkout endpoint:', error instanceof Error ? error.message : error);
    return res.status(500).json({ error: 'An unexpected error occurred. Please try again.' });
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
    event = await stripeClient.webhooks.constructEventAsync(req.body, sig, webhookSecret);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    console.error('Webhook signature verification failed:', message);
    return res.status(400).json({ error: `Webhook Error: ${message}` });
  }

  console.log(`Received Stripe event: ${event.type}`);

  try {
    const sb = getSupabase();
    const stripeClient = getStripe();

    switch (event.type) {
      case 'checkout.session.completed':
        await handleCheckoutCompleted(sb, event);
        break;
      case 'customer.subscription.updated':
        await handleSubscriptionUpdated(sb, event);
        break;
      case 'customer.subscription.deleted':
        await handleSubscriptionDeleted(sb, event);
        break;
      case 'invoice.payment_succeeded':
        await handleInvoicePaymentSucceeded(sb, stripeClient, event);
        break;
      case 'invoice.payment_failed':
        await handleInvoicePaymentFailed(stripeClient, event);
        break;
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

    const returnUrl = `${req.headers.origin || process.env.REPLIT_DEV_DOMAIN || 'http://localhost:5001'}/profile`;

    const stripeClient = getStripe();
    const portalSession = await stripeClient.billingPortal.sessions.create({
      customer: profile.stripe_customer_id,
      return_url: returnUrl,
    });

    return res.json({ url: portalSession.url });
  } catch (error: unknown) {
    console.error('Error creating portal session:', error);
    if (error instanceof Stripe.errors.StripeError && error.type === 'StripeAuthenticationError') {
      return res.status(500).json({ error: 'Payment system configuration error. Please contact support.' });
    }
    return res.status(500).json({ error: 'Failed to create portal session' });
  }
});

// Get subscription details
router.get('/api/stripe/subscription', async (req: Request, res: Response) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Please sign in' });
    }

    const token = authHeader.split(' ')[1];
    const sb = getSupabase();
    const { data: { user }, error: authError } = await sb.auth.getUser(token);

    if (authError || !user) {
      return res.status(401).json({ error: 'Session expired' });
    }

    const { data: profile } = await sb
      .from('profiles')
      .select('stripe_subscription_id, subscription_tier')
      .eq('id', user.id)
      .single();

    if (!profile?.stripe_subscription_id) {
      return res.json({ subscription: null });
    }

    const stripeClient = getStripe();
    const subscription = await stripeClient.subscriptions.retrieve(profile.stripe_subscription_id);

    // Get the billing cycle anchor (when billing started)
    // `billing_cycle_anchor` and `start_date` exist at runtime but aren't in Stripe v20 TS types
    const subWithExtras = subscription as Stripe.Subscription & {
      billing_cycle_anchor?: number;
      start_date?: number;
      cancel_at?: number | null;
    };
    const billingAnchor = subWithExtras.billing_cycle_anchor || subscription.created;
    const startDate = subWithExtras.start_date || subscription.created;

    // Calculate next renewal date based on billing anchor
    // For monthly subscriptions, find the next monthly anniversary
    const now = Math.floor(Date.now() / 1000);
    let nextRenewal = billingAnchor;

    // Add months until we're in the future
    while (nextRenewal <= now) {
      // Add approximately one month (30.44 days average)
      const anchorDate = new Date(nextRenewal * 1000);
      anchorDate.setMonth(anchorDate.getMonth() + 1);
      nextRenewal = Math.floor(anchorDate.getTime() / 1000);
    }

    // If subscription has a cancel_at date, use that instead
    const cancelAt = subWithExtras.cancel_at;

    console.log('Subscription billing info:', {
      billingAnchor,
      startDate,
      nextRenewal,
      cancelAt,
      cancelAtPeriodEnd: subscription.cancel_at_period_end,
    });

    return res.json({
      subscription: {
        status: subscription.status,
        currentPeriodStart: startDate,
        currentPeriodEnd: cancelAt || nextRenewal,
        cancelAtPeriodEnd: subscription.cancel_at_period_end,
        canceledAt: subscription.canceled_at,
        created: subscription.created,
      }
    });
  } catch (error: unknown) {
    console.error('Error fetching subscription:', error);
    return res.status(500).json({ error: 'Failed to fetch subscription details' });
  }
});

// Cancel subscription at period end
router.post('/api/stripe/cancel-subscription', async (req: Request, res: Response) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Please sign in' });
    }

    const token = authHeader.split(' ')[1];
    const sb = getSupabase();
    const { data: { user }, error: authError } = await sb.auth.getUser(token);

    if (authError || !user) {
      return res.status(401).json({ error: 'Session expired' });
    }

    const { data: profile } = await sb
      .from('profiles')
      .select('stripe_subscription_id')
      .eq('id', user.id)
      .single();

    if (!profile?.stripe_subscription_id) {
      return res.status(400).json({ error: 'No active subscription found' });
    }

    const stripeClient = getStripe();

    // Cancel at period end (user keeps access until billing period ends)
    const subscription = await stripeClient.subscriptions.update(profile.stripe_subscription_id, {
      cancel_at_period_end: true,
    });

    console.log(`User ${user.id} requested subscription cancellation - will end at period end`);

    // `current_period_end` was removed from the Subscription object in newer
    // Stripe API versions and now lives on each subscription item. Setting
    // `cancel_at_period_end` populates `cancel_at` with that same timestamp,
    // so prefer it and fall back to the item's period end.
    const currentPeriodEnd =
      subscription.cancel_at ??
      subscription.items.data[0]?.current_period_end ??
      null;

    return res.json({
      success: true,
      cancelAtPeriodEnd: subscription.cancel_at_period_end,
      currentPeriodEnd,
    });
  } catch (error: unknown) {
    console.error('Error cancelling subscription:', error);
    return res.status(500).json({ error: 'Failed to cancel subscription' });
  }
});

// Reactivate subscription (undo cancellation)
router.post('/api/stripe/reactivate-subscription', async (req: Request, res: Response) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Please sign in' });
    }

    const token = authHeader.split(' ')[1];
    const sb = getSupabase();
    const { data: { user }, error: authError } = await sb.auth.getUser(token);

    if (authError || !user) {
      return res.status(401).json({ error: 'Session expired' });
    }

    const { data: profile } = await sb
      .from('profiles')
      .select('stripe_subscription_id')
      .eq('id', user.id)
      .single();

    if (!profile?.stripe_subscription_id) {
      return res.status(400).json({ error: 'No subscription found' });
    }

    const stripeClient = getStripe();

    // Remove cancellation
    const subscription = await stripeClient.subscriptions.update(profile.stripe_subscription_id, {
      cancel_at_period_end: false,
    });

    console.log(`User ${user.id} reactivated subscription`);

    return res.json({
      success: true,
      cancelAtPeriodEnd: subscription.cancel_at_period_end,
    });
  } catch (error: unknown) {
    console.error('Error reactivating subscription:', error);
    return res.status(500).json({ error: 'Failed to reactivate subscription' });
  }
});

export default router;
