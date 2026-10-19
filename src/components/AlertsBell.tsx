// Topbar alerts dropdown — low stock, due-limit pressure, expiring plans.
import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Bell, CalendarClock, ChevronRight, PackageX, Scale, type LucideIcon } from 'lucide-react'
import { useClub } from '../context/ClubContext'
import { formatCurrency, formatDate } from '../lib/format'
import { api, asArray } from '../lib/api'
import { useAuth } from '../context/AuthContext'
import {
  BROWSER_ALERTS_EVENT,
  browserAlertPreferences,
  rememberAlertSnapshot,
  sendBrowserAlert,
  type BrowserAlertKind,
} from '../lib/browserAlerts'
import type { MemberOrder, TableBooking } from '../types'

interface ClubAlert {
  icon: LucideIcon
  tone: 'red' | 'gold' | 'blue'
  title: string
  sub: string
  to: string
}

const SEVEN_DAYS = 7 * 24 * 60 * 60 * 1000

export default function AlertsBell() {
  const { data, club, refresh } = useClub()
  const { user } = useAuth()
  const navigate = useNavigate()
  const [open, setOpen] = useState(false)
  const [alertSettingsVersion, setAlertSettingsVersion] = useState(0)

  const notify = (kind: BrowserAlertKind, title: string, body: string, tag: string) => {
    const preferences = browserAlertPreferences()
    if (preferences.enabled && preferences.kinds[kind]) sendBrowserAlert(title, body, tag)
  }

  useEffect(() => {
    const sync = () => setAlertSettingsVersion((version) => version + 1)
    window.addEventListener(BROWSER_ALERTS_EVENT, sync)
    return () => window.removeEventListener(BROWSER_ALERTS_EVENT, sync)
  }, [])

  useEffect(() => {
    if (!data || !club) return
    const clubKey = club.id
    const lowStock = data.menuItems
      .filter((item) => item.active && item.stockQty > 0 && item.stockQty <= (item.reorderLevel ?? 5))
      .map((item) => item.id)
    const outOfStock = data.menuItems.filter((item) => item.active && item.stockQty <= 0).map((item) => item.id)
    const previousStock = rememberAlertSnapshot(`browserAlertStock:${clubKey}`, { lowStock, outOfStock }) as
      { lowStock?: string[]; outOfStock?: string[] } | null
    if (previousStock) {
      const oldLow = new Set(previousStock.lowStock ?? [])
      const oldOut = new Set(previousStock.outOfStock ?? [])
      const newlyOut = outOfStock.filter((id) => !oldOut.has(id))
      const newlyLow = lowStock.filter((id) => !oldLow.has(id))
      const changed = [...newlyOut, ...newlyLow]
      if (changed.length) {
        const names = data.menuItems.filter((item) => changed.includes(item.id)).slice(0, 3).map((item) => item.name)
        notify('stock', 'Stock needs attention', names.join(', '), `stock-${clubKey}`)
      }
    }

    const due = data.stats?.totalDue ?? 0
    const limit = data.stats?.dueLimit ?? 0
    const level = limit > 0 && due >= limit ? 'crossed' : limit > 0 && due >= limit * 0.7 ? 'near' : 'clear'
    const previousDue = rememberAlertSnapshot(`browserAlertDue:${clubKey}`, level) as string | null
    if (previousDue && level !== 'clear' && previousDue !== level) {
      notify('dues', level === 'crossed' ? 'Due limit crossed' : 'Due limit nearing', `${formatCurrency(due)} of ${formatCurrency(limit)} remains unpaid`, `dues-${clubKey}`)
    }

    const sales = data.membershipSales
    const previousSales = rememberAlertSnapshot(`browserAlertSales:${clubKey}`, sales.map((sale) => sale.id)) as string[] | null
    if (previousSales) {
      const seen = new Set(previousSales)
      const fresh = sales.find((sale) => !seen.has(sale.id))
      if (fresh) notify('membership', 'New membership purchased', `${fresh.memberName} purchased ${fresh.planName}`, `membership-${fresh.id}`)
    }
  }, [data, club])

  useEffect(() => {
    if (!club && user?.role !== 'master') return
    const prefs = browserAlertPreferences()
    if (!prefs.enabled || typeof Notification === 'undefined' || Notification.permission !== 'granted') return

    let active = true
    let polling = false
    const poll = async () => {
      if (polling) return
      polling = true
      try {
        const jobs: Array<Promise<void>> = []
        if (club) {
          const clubId = club.id
          jobs.push(
            api<unknown>(`/clubs/${clubId}/orders`).then((response) => {
              if (!active) return
              const raw = Array.isArray(response) ? response : (response as { orders?: unknown })?.orders
              const orders = asArray<MemberOrder & { source?: string }>(raw)
                .filter((order) => order.source === 'member_order')
              const ids = orders.map((order) => order.id).filter((id): id is string => Boolean(id))
              const previous = rememberAlertSnapshot(`browserAlertOrders:${clubId}`, ids) as string[] | null
              if (!previous) return
              const old = new Set(previous)
              const fresh = orders.find((order) => order.id && !old.has(order.id))
              if (fresh) notify('orders', 'New live order', `${fresh.memberName ?? fresh.customerName ?? 'A member'} placed an order`, `order-${fresh.id}`)
            }),
            api<unknown>(`/clubs/${clubId}/bookings?club_id=${encodeURIComponent(clubId)}`).then((response) => {
              if (!active) return
              const raw = Array.isArray(response) ? response : (response as { bookings?: unknown })?.bookings
              const bookings = asArray<TableBooking>(raw).filter((booking) => (booking.status ?? 'upcoming') === 'upcoming')
              const ids = bookings.map((booking) => booking.id).filter(Boolean)
              const previous = rememberAlertSnapshot(`browserAlertBookings:${clubId}`, ids) as string[] | null
              if (!previous) return
              const old = new Set(previous)
              const fresh = bookings.find((booking) => booking.id && !old.has(booking.id))
              if (fresh) notify('bookings', 'New table booking', `${fresh.memberName ?? 'A member'} booked ${fresh.tableName ?? 'a table'} · ${fresh.dateIST ?? ''} ${fresh.startIST ?? ''}`, `booking-${fresh.id}`)
            }),
          )
        }
        if (user?.role === 'master') {
          jobs.push(api<unknown>('/master/overview').then((response) => {
            if (!active) return
            const users = asArray<{ id?: string; name?: string; subscription?: { selectedAt?: string; planName?: string } }>(
              (response as { users?: unknown })?.users,
            )
            const requests = users.filter((entry) => entry.subscription?.selectedAt)
            const ids = requests.map((entry) => `${entry.id}:${entry.subscription?.selectedAt}`)
            const previous = rememberAlertSnapshot('browserAlertSubscriptions', ids) as string[] | null
            if (!previous) return
            const old = new Set(previous)
            const fresh = requests.find((entry) => !old.has(`${entry.id}:${entry.subscription?.selectedAt}`))
            if (fresh) notify('subscriptions', 'New subscription request', `${fresh.name ?? 'An account'} selected ${fresh.subscription?.planName ?? 'a plan'}`, `subscription-${fresh.id}`)
          }))
        }
        const results = await Promise.allSettled(jobs)
        for (const result of results) {
          if (result.status === 'rejected' && active) {
            console.error('Browser alert polling failed', result.reason)
          }
        }
      } finally {
        polling = false
      }
    }

    void poll()
    const timer = window.setInterval(() => {
      void poll()
      if (club) void refresh(true)
    }, 60_000)
    return () => {
      active = false
      window.clearInterval(timer)
    }
  }, [club?.id, refresh, user?.role, alertSettingsVersion])

  const alerts = useMemo<ClubAlert[]>(() => {
    if (!data) return []
    const out: ClubAlert[] = []
    const menu = data.menuItems ?? []
    const members = data.members ?? []
    const stats = data.stats

    // den_app shell.dart parity: out-of-stock (red) and low-stock (gold) are
    // two separate alerts, both jumping to the Records/Stock surface.
    const outStock = menu.filter((m) => m.active !== false && (m.stockQty ?? 0) <= 0)
    if (outStock.length > 0) {
      out.push({
        icon: PackageX,
        tone: 'red',
        title: `Out of stock · ${outStock.length} item${outStock.length > 1 ? 's' : ''}`,
        sub: outStock.slice(0, 3).map((m) => m.name).join(', ') + (outStock.length > 3 ? ` +${outStock.length - 3}` : ''),
        to: '/stock',
      })
    }
    const low = menu.filter(
      (m) => m.active !== false && (m.stockQty ?? 0) > 0 && (m.stockQty ?? 0) <= (m.reorderLevel ?? 5),
    )
    if (low.length > 0) {
      out.push({
        icon: PackageX,
        tone: 'gold',
        title: `Low stock · ${low.length} item${low.length > 1 ? 's' : ''}`,
        sub: low.slice(0, 3).map((m) => `${m.name} (${m.stockQty})`).join(', ') + (low.length > 3 ? ` +${low.length - 3}` : ''),
        to: '/stock',
      })
    }

    // due-limit pressure
    const limit = stats?.dueLimit ?? 0
    const due = stats?.totalDue ?? 0
    if (limit > 0 && due >= limit * 0.7) {
      out.push({
        icon: Scale,
        tone: due >= limit ? 'red' : 'gold',
        title: due >= limit ? 'Due limit crossed' : 'Due limit almost reached',
        sub: `${formatCurrency(due)} of ${formatCurrency(limit)} is still uncollected`,
        to: '/due-desk',
      })
    }

    // premium plans expiring in 7 days
    const soon = Date.now() + SEVEN_DAYS
    const expiring = members.filter(
      (m) =>
        m.active !== false &&
        m.planExpiresAt &&
        new Date(m.planExpiresAt).getTime() > Date.now() &&
        new Date(m.planExpiresAt).getTime() <= soon,
    )
    if (expiring.length > 0) {
      out.push({
        icon: CalendarClock,
        tone: 'blue',
        title: `${expiring.length} premium plan${expiring.length > 1 ? 's' : ''} expiring ≤7 din`,
        sub: expiring
            .slice(0, 3)
            .map((m) => `${m.name} · ${formatDate(m.planExpiresAt)}`)
            .join(' · ') + (expiring.length > 3 ? ` +${expiring.length - 3}` : ''),
        to: '/players',
      })
    }
    return out
  }, [data])

  const go = (to: string) => {
    setOpen(false)
    navigate(to)
  }

  return (
    <div className="alerts-wrap">
      <button
        className="btn-icon alerts-btn"
        aria-label={alerts.length > 0 ? `${alerts.length} alerts` : 'No alerts'}
        title={alerts.length > 0 ? `${alerts.length} alerts` : 'No alerts'}
        onClick={() => setOpen((o) => !o)}
      >
        <Bell size={15} />
        {alerts.length > 0 && <span className="alert-count">{alerts.length}</span>}
      </button>
      {open && (
        <>
          <div className="alerts-backdrop" onClick={() => setOpen(false)} />
          <div className="alerts-panel" role="menu">
            <div className="alerts-head">Alerts · {alerts.length}</div>
            {alerts.length === 0 ? (
              <p className="muted small" style={{ padding: '10px 12px' }}>All clear — nothing needs attention today 👍</p>
            ) : (
              alerts.map((a, i) => {
                const Icon = a.icon
                return (
                  <button key={i} className={`alert-row alert-${a.tone}`} role="menuitem" onClick={() => go(a.to)}>
                    <Icon size={13} className={`alert-ic-${a.tone}`} />
                    <span className="alert-text">
                      <b>{a.title}</b>
                      <span className="muted small">{a.sub}</span>
                    </span>
                    <ChevronRight size={12} className="alert-chevron" />
                  </button>
                )
              })
            )}
          </div>
        </>
      )}
    </div>
  )
}
