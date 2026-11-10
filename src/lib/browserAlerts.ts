import { getItem, setItem } from './storage'

export type BrowserAlertKind = 'stock' | 'dues' | 'membership' | 'orders' | 'subscriptions' | 'bookings' | 'topups'

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
    topups: true,
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

export async function sendBrowserAlert(title: string, body: string, tag: string): Promise<boolean> {
  if (typeof Notification === 'undefined' || Notification.permission !== 'granted') return false
  let registration: ServiceWorkerRegistration | undefined
  try {
    if ('serviceWorker' in navigator) {
      registration = await navigator.serviceWorker.getRegistration()
    }
  } catch (error) {
    console.error('Service worker registration could not be read for browser notification', error)
  }
  if (registration) {
    try {
      await registration.showNotification(title, {
        body,
        tag,
        icon: '/icons/rowdys_den_logo_square.png',
        data: { url: '/account' },
      })
      return true
    } catch (error) {
      console.error('Service worker browser notification failed', error)
    }
  }
  try {
    new Notification(title, { body, tag, icon: '/icons/rowdys_den_logo_square.png' })
    return true
  } catch (error) {
    console.error('Browser notification could not be displayed', error)
    return false
  }
}

export function getAlertSnapshot<T>(key: string): T | null {
  try {
    const value = getItem(key)
    return value === null ? null : JSON.parse(value) as T
  } catch {
    return null
  }
}

export function saveAlertSnapshot(key: string, snapshot: unknown): void {
  try {
    setItem(key, JSON.stringify(snapshot))
  } catch (error) {
    console.error('Browser notification state could not be saved', error)
  }
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
