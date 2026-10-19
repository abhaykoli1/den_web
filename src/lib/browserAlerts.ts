import { getItem, setItem } from './storage'

export type BrowserAlertKind = 'stock' | 'dues' | 'membership' | 'orders' | 'subscriptions' | 'bookings'

export interface BrowserAlertPreferences {
  enabled: boolean
  kinds: Record<BrowserAlertKind, boolean>
}

export const BROWSER_ALERTS_EVENT = 'rd:browser-alerts'
const PREF_KEY = 'browserAlertPreferences'

const DEFAULTS: BrowserAlertPreferences = {
  enabled: false,
  kinds: {
    stock: true,
    dues: true,
    membership: true,
    orders: true,
    subscriptions: true,
    bookings: true,
  },
}

export function browserAlertPreferences(): BrowserAlertPreferences {
  try {
    const saved = JSON.parse(getItem(PREF_KEY) ?? 'null') as Partial<BrowserAlertPreferences> | null
    return {
      enabled: saved?.enabled === true,
      kinds: { ...DEFAULTS.kinds, ...(saved?.kinds ?? {}) },
    }
  } catch {
    return DEFAULTS
  }
}

export function saveBrowserAlertPreferences(preferences: BrowserAlertPreferences): void {
  setItem(PREF_KEY, JSON.stringify(preferences))
  window.dispatchEvent(new Event(BROWSER_ALERTS_EVENT))
}

export function sendBrowserAlert(title: string, body: string, tag: string): void {
  if (typeof Notification === 'undefined' || Notification.permission !== 'granted') return
  new Notification(title, { body, tag, icon: '/icons/rowdys_den_logo_square.png' })
}

export function rememberAlertSnapshot(key: string, snapshot: unknown): unknown | null {
  try {
    const previous = getItem(key)
    setItem(key, JSON.stringify(snapshot))
    return previous === null ? null : JSON.parse(previous)
  } catch {
    return null
  }
}
