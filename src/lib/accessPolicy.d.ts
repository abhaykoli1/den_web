import type { AccountSubscription, AppUser } from '../types'

export function subscriptionOk(subscription?: AccountSubscription | null, now?: number): boolean
export function hasAppAccess(user: AppUser | null): boolean
