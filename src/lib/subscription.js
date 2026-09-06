import { supabase } from './supabase'

export async function getUserPlan(userId) {
  const { data } = await supabase
    .from('profiles')
    .select('plan, plan_expires_at')
    .eq('id', userId)
    .single()

  if (!data) return 'free'
  if (!data.plan || data.plan === 'free') return 'free'

  // Check if plan is expired
  if (data.plan_expires_at && new Date(data.plan_expires_at) < new Date()) {
    // Expire it
    await supabase.from('profiles').update({ plan: 'free', plan_expires_at: null }).eq('id', userId)
    return 'free'
  }

  return data.plan
}

export function canAccessFeature(plan, feature) {
  const features = {
    free: ['discover', 'chat', 'daily_vibe', 'super_likes_3'],
    plus: ['discover', 'chat', 'daily_vibe', 'super_likes_unlimited', 'see_who_liked', 'boost_weekly', 'read_receipts'],
    gold: ['discover', 'chat', 'daily_vibe', 'super_likes_unlimited', 'see_who_liked', 'boost_weekly', 'read_receipts', 'dm_invite', 'priority_discover', 'incognito', 'vibe_full_breakdown'],
  }
  return features[plan]?.includes(feature) ?? false
}

export const PLANS = {
  plus: {
    name: 'Nearby Plus',
    price: 199,
    period: 'month',
    color: '#E8734A',
    features: [
      { icon: '👀', text: 'See who liked you' },
      { icon: '⭐', text: 'Unlimited super likes' },
      { icon: '🚀', text: '1 boost per week' },
      { icon: '✓✓', text: 'Read receipts in chat' },
    ],
  },
  gold: {
    name: 'Nearby Gold',
    price: 299,
    period: 'month',
    color: '#D4A144',
    features: [
      { icon: '💌', text: 'Invite to DM — message anyone directly' },
      { icon: '🥇', text: 'Priority in Discover (shown first)' },
      { icon: '🕵️', text: 'Incognito mode — browse invisibly' },
      { icon: '✨', text: 'Full Vibe Match breakdown' },
      { icon: '👀', text: 'See who liked you' },
      { icon: '⭐', text: 'Unlimited super likes' },
      { icon: '🚀', text: '1 boost per week' },
      { icon: '✓✓', text: 'Read receipts in chat' },
    ],
  },
}
