import test from 'node:test';
import assert from 'node:assert/strict';
import { applySubscriptionEvent, isHandledSubscriptionEvent } from '../src/services/subscriptionService.js';

// Minimal stand-in for the Supabase client: records what was written
function fakeSupabase({ error = null } = {}) {
  const calls = [];
  return {
    calls,
    from(table) {
      return {
        upsert: async (row, options) => { calls.push({ op: 'upsert', table, row, options }); return { error }; },
        update: (row) => ({
          match: async (filter) => { calls.push({ op: 'update', table, row, filter }); return { error }; }
        })
      };
    }
  };
}

const event = (overrides = {}) => ({
  id: 'sub_123',
  customer_id: 'ctm_9',
  status: 'active',
  next_billed_at: '2030-01-01T00:00:00Z',
  items: [{ price: { id: 'pri_pro' } }],
  custom_data: { supabaseUserId: 'user-1' },
  ...overrides
});

test('subscription.created upserts the subscription for the right user', async () => {
  const db = fakeSupabase();
  const result = await applySubscriptionEvent(db, 'subscription.created', event());

  assert.deepEqual(result, { handled: true, action: 'upserted' });
  assert.equal(db.calls[0].table, 'subscriptions');
  assert.equal(db.calls[0].row.user_id, 'user-1');
  assert.equal(db.calls[0].row.plan_id, 'pri_pro');
  assert.equal(db.calls[0].row.status, 'active');
  assert.equal(db.calls[0].row.current_period_end, '2030-01-01T00:00:00.000Z');
  assert.equal(db.calls[0].options.onConflict, 'user_id,subscription_id');
});

test('canceled and expired events mark the subscription cancelled, scoped to the user', async () => {
  for (const type of ['subscription.canceled', 'subscription.expired']) {
    const db = fakeSupabase();
    const result = await applySubscriptionEvent(db, type, event({ status: 'canceled' }));

    assert.equal(result.action, 'cancelled');
    assert.equal(db.calls[0].row.status, 'cancelled');
    assert.deepEqual(db.calls[0].filter, { subscription_id: 'sub_123', user_id: 'user-1' });
  }
});

test('events without our user id are ignored, not written', async () => {
  const db = fakeSupabase();
  const result = await applySubscriptionEvent(db, 'subscription.created', event({ custom_data: {} }));

  assert.equal(result.handled, false);
  assert.equal(db.calls.length, 0);
});

test('unrelated events are not handled', async () => {
  const db = fakeSupabase();
  assert.equal(isHandledSubscriptionEvent('transaction.completed'), false);
  assert.equal((await applySubscriptionEvent(db, 'transaction.completed', event())).handled, false);
  assert.equal(db.calls.length, 0);
});

test('database errors surface to the caller', async () => {
  const db = fakeSupabase({ error: new Error('db down') });
  await assert.rejects(applySubscriptionEvent(db, 'subscription.updated', event()), /db down/);
});
