/**
 * Applies a verified Paddle subscription event to the `subscriptions` table.
 * Kept free of Express/Paddle imports so it can be unit tested with a fake client.
 */

const CANCEL_EVENTS = new Set(['subscription.canceled', 'subscription.expired']);
const UPSERT_EVENTS = new Set(['subscription.created', 'subscription.updated']);

export function isHandledSubscriptionEvent(eventType) {
  return UPSERT_EVENTS.has(eventType) || CANCEL_EVENTS.has(eventType);
}

export async function applySubscriptionEvent(supabaseAdmin, eventType, data) {
  const supabaseUserId = data?.custom_data?.supabaseUserId;
  if (!supabaseUserId) {
    return { handled: false, reason: 'missing_user' };
  }

  const subscriptionId = data.id;
  const now = new Date().toISOString();

  if (UPSERT_EVENTS.has(eventType)) {
    const { error } = await supabaseAdmin.from('subscriptions').upsert(
      {
        user_id: supabaseUserId,
        paddle_user_id: data.customer_id,
        subscription_id: subscriptionId,
        plan_id: data.items?.[0]?.price?.id ?? null,
        status: data.status,
        current_period_end: new Date(data.next_billed_at || now).toISOString(),
        updated_at: now
      },
      { onConflict: 'user_id,subscription_id' }
    );
    if (error) throw error;
    return { handled: true, action: 'upserted' };
  }

  if (CANCEL_EVENTS.has(eventType)) {
    const { error } = await supabaseAdmin
      .from('subscriptions')
      .update({ status: 'cancelled', updated_at: now })
      .match({ subscription_id: subscriptionId, user_id: supabaseUserId });
    if (error) throw error;
    return { handled: true, action: 'cancelled' };
  }

  return { handled: false, reason: 'unhandled_event' };
}
