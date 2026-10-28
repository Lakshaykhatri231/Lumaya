// subscriptionUtils.js
export async function getUserSubscriptionLimits(supabaseClient, userId) {
    try {
      // Get user's active subscription using the authenticated client
      const { data: subscription, error: subError } = await supabaseClient
        .from('subscriptions')
        .select('plan_id, status')
        .eq('user_id', userId)
        .eq('status', 'active')
        .single();
  
      if (subError || !subscription) {
        return { max_tracked_wallets: 0, max_stealth_wallets: 0 };
      }
  
      // Get limits for the subscription plan
      const { data: limits, error: limitsError } = await supabaseClient
        .from('subscription_limits')
        .select('*')
        .eq('plan_id', subscription.plan_id)
        .single();
  
      if (limitsError || !limits) {
        return { max_tracked_wallets: 0, max_stealth_wallets: 0 };
      }
  
      return limits;
    } catch (error) {
      console.error('Error getting subscription limits:', error);
      return { max_tracked_wallets: 0, max_stealth_wallets: 0 };
    }
  }
  
  export async function checkSubscriptionLimits(supabaseClient, userId, type, currentCount) {
    const limits = await getUserSubscriptionLimits(supabaseClient, userId);
    
    switch (type) {
      case 'tracked_wallets':
        return currentCount < limits.max_tracked_wallets;
      case 'stealth_wallets':
        return currentCount < limits.max_stealth_wallets;
      default:
        return false;
    }
  }
  