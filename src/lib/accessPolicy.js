const ALLOWED_SUBSCRIPTION_STATES = new Set([
  'pending',
  'trial',
  'active',
  'past_due',
  'paused',
  'keep_current',
  'current',
])

const NO_EXPIRY_VALUES = new Set(['null', 'none', 'n/a'])

/** Keep in sync with den_server/app/services.py:subscription_is_active. */
export function subscriptionOk(subscription, now = Date.now()) {
  if (!subscription) return false

  const status = String(subscription.status ?? '').trim().toLowerCase().replaceAll(' ', '_')
  if (!ALLOWED_SUBSCRIPTION_STATES.has(status)) return false

  const expiresAt = String(subscription.expiresAt ?? '').trim()
  if (!expiresAt || NO_EXPIRY_VALUES.has(expiresAt.toLowerCase())) return true
  if (status === 'past_due' || status === 'paused') return true

  const expires = Date.parse(expiresAt)
  return Number.isFinite(expires) && expires > now
}

/** Staff can enter the app only when assigned to a club; owners need a plan. */
export function hasAppAccess(user) {
  if (!user) return false
  if (user.role === 'master') return true
  if (user.role === 'staff') return Array.isArray(user.clubIds) && user.clubIds.length > 0
  return subscriptionOk(user.subscription)
}
