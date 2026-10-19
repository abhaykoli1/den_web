import { useEffect, useState } from 'react'
import { Bell, BellOff } from 'lucide-react'
import { useToast } from '../context/ToastContext'
import {
  browserAlertPreferences,
  saveBrowserAlertPreferences,
  type BrowserAlertKind,
  type BrowserAlertPreferences,
} from '../lib/browserAlerts'
import { Badge, Btn, Card } from './ui'

const ALERTS: Array<{ kind: BrowserAlertKind; title: string; description: string }> = [
  { kind: 'stock', title: 'Low stock', description: 'An active item reaches its reorder level or runs out.' },
  { kind: 'dues', title: 'Pending dues', description: 'The club due limit is nearing or crossed.' },
  { kind: 'membership', title: 'Membership sales', description: 'A member buys a plan.' },
  { kind: 'orders', title: 'Live orders', description: 'A new member-app order arrives.' },
  { kind: 'subscriptions', title: 'Subscriptions', description: 'A new subscription request arrives for Master Admin.' },
  { kind: 'bookings', title: 'Bookings', description: 'A new table booking arrives.' },
]

export default function BrowserAlertsSettings() {
  const toast = useToast()
  const [preferences, setPreferences] = useState<BrowserAlertPreferences>(browserAlertPreferences)
  const [permission, setPermission] = useState<NotificationPermission | 'unsupported'>(
    typeof Notification === 'undefined' ? 'unsupported' : Notification.permission,
  )
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    const sync = () => setPreferences(browserAlertPreferences())
    window.addEventListener('rd:browser-alerts', sync)
    return () => window.removeEventListener('rd:browser-alerts', sync)
  }, [])

  const update = (next: BrowserAlertPreferences) => {
    setPreferences(next)
    saveBrowserAlertPreferences(next)
  }

  const enable = async () => {
    if (typeof Notification === 'undefined') {
      toast.error('Browser notifications are not supported here')
      return
    }
    if (!window.isSecureContext) {
      toast.error('Browser notifications require HTTPS or localhost')
      return
    }
    setBusy(true)
    try {
      const result = Notification.permission === 'granted'
        ? 'granted'
        : await Notification.requestPermission()
      setPermission(result)
      if (result === 'granted') {
        update({ ...preferences, enabled: true })
        toast.success('Browser alerts enabled')
      } else {
        update({ ...preferences, enabled: false })
        toast.error(result === 'denied' ? 'Notifications are blocked in browser settings' : 'Notification permission was not granted')
      }
    } finally {
      setBusy(false)
    }
  }

  return (
    <Card>
      <div className="section-head">
        <div className="section-title">Browser Notifications</div>
        <Badge kind={preferences.enabled && permission === 'granted' ? 'green' : 'muted'}>
          {permission === 'unsupported' ? 'Unsupported' : permission === 'denied' ? 'Blocked' : preferences.enabled ? 'On' : 'Off'}
        </Badge>
      </div>
      <p className="muted small">Optional system notifications for app alerts. Permission is requested only when you enable them.</p>
      <div className="row wrap" style={{ gap: 8, marginBottom: 8 }}>
        <Btn size="sm" variant={preferences.enabled ? 'ghost' : 'green'} loading={busy} onClick={() => {
          if (preferences.enabled) update({ ...preferences, enabled: false })
          else void enable()
        }}>
          {preferences.enabled ? <BellOff size={12} /> : <Bell size={12} />}
          {preferences.enabled ? 'Turn off browser alerts' : 'Enable browser alerts'}
        </Btn>
      </div>
      <div className="browser-alert-options">
        {ALERTS.map(({ kind, title, description }) => (
          <label key={kind} className="browser-alert-option">
            <input
              type="checkbox"
              checked={preferences.kinds[kind]}
              onChange={(event) => update({
                ...preferences,
                kinds: { ...preferences.kinds, [kind]: event.target.checked },
              })}
            />
            <span><b>{title}</b><small>{description}</small></span>
          </label>
        ))}
      </div>
    </Card>
  )
}
