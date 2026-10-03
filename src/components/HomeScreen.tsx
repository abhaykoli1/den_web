// Home overview — 1:1 port of den_app `lib/src/screens/workspace_hubs.dart`
// (HomeOverview + _ClubStatusSwitch + _Action tiles). Greeting, club open/closed
// switch, "Today's pulse" hero, four stat tiles and the quick-actions grid.
import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Activity,
  AudioLines,
  ChevronRight,
  Grid3x3,
  History,
  Settings,
  ShoppingBag,
  Trophy,
  UserPlus,
  Users,
  Wallet,
  Zap,
  type LucideIcon,
} from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { useClub } from '../context/ClubContext'
import { useToast } from '../context/ToastContext'
import { formatCurrency } from '../lib/format'
import { Card, StatCard } from './ui'

type Tone = 'green' | 'blue' | 'red' | 'gold'

interface QuickAction {
  icon: LucideIcon
  label: string
  tone: Tone
  to: string
}

/** workspace_hubs.dart → _timeGreeting() */
function timeGreeting(): string {
  const h = new Date().getHours()
  return h < 12 ? 'morning' : h < 17 ? 'afternoon' : 'evening'
}

/** _ClubStatusSwitch — PATCH /clubs/{id}/settings { isOpen } */
function ClubStatusSwitch() {
  const { club, data, mutate } = useClub()
  const toast = useToast()
  const [saving, setSaving] = useState(false)
  const serverOpen = (data?.club?.settings?.isOpen ?? club?.settings?.isOpen) !== false
  const [optimistic, setOptimistic] = useState<boolean | null>(null)
  const isOpen = optimistic ?? serverOpen

  const toggle = async () => {
    if (saving || !club) return
    const next = !isOpen
    setSaving(true)
    setOptimistic(next)
    const ok = await mutate('settings', {
      method: 'PATCH',
      body: { isOpen: next },
      toast: next ? 'Club is now OPEN' : 'Club marked CLOSED',
    })
    if (!ok) {
      setOptimistic(null)
      toast.error('Could not update club status')
    }
    setSaving(false)
  }

  return (
    <span className="club-switch-toggle">
      <span className={`cs-label ${isOpen ? 'cs-open' : 'cs-closed'}`}>{isOpen ? 'OPEN' : 'CLOSED'}</span>
      <button
        type="button"
        className={`switch${isOpen ? ' on' : ''}`}
        disabled={saving}
        onClick={toggle}
        aria-pressed={isOpen}
        aria-label={isOpen ? 'Club open. Switch to close club.' : 'Club closed. Switch to open club.'}
        title={isOpen ? 'Club open — tap to close' : 'Club closed — tap to open'}
      />
    </span>
  )
}

export default function HomeScreen() {
  const { user } = useAuth()
  const { club, data, stats } = useClub()
  const navigate = useNavigate()

  const running = useMemo(() => (data?.sessions ?? []).filter((s) => !s.endedAt).length, [data])
  const duesCount = useMemo(
    () => (data?.members ?? []).filter((m) => m.active !== false && (m.dueAmount ?? 0) > 0).length,
    [data],
  )
  const activePlayers = useMemo(() => (data?.members ?? []).filter((m) => m.active !== false).length, [data])
  const lowStock = useMemo(
    () =>
      (data?.menuItems ?? []).filter(
        (i) => i.active !== false && (i.stockQty ?? 0) <= (i.reorderLevel ?? 5),
      ).length,
    [data],
  )

  const first = (user?.name ?? '').trim().split(/\s+/)[0]

  const actions: QuickAction[] = [
    { icon: Grid3x3, label: 'Manage tables', tone: 'green', to: '/tables' },
    { icon: UserPlus, label: 'Manage players', tone: 'blue', to: '/players' },
    { icon: Wallet, label: 'Collect due', tone: 'red', to: '/due-desk' },
    { icon: History, label: 'Frames', tone: 'gold', to: '/frames' },
    { icon: ShoppingBag, label: 'Counter sale', tone: 'gold', to: '/items' },
    { icon: Trophy, label: 'Tournament', tone: 'gold', to: '/tournaments' },
    { icon: Activity, label: 'Activity Logs', tone: 'gold', to: '/logs' },
    { icon: Settings, label: 'Settings', tone: 'gold', to: '/settings' },
  ]

  return (
    <div className="stack">
      <div className="home-greet-row">
        <div style={{ flex: 1, minWidth: 0 }}>
          <h2 className="home-greet">
            Good {timeGreeting()}, {first || 'there'}
          </h2>
          <p className="home-sub">Here is what needs attention at {club?.name ?? 'your club'}.</p>
        </div>
        <ClubStatusSwitch />
      </div>

      {/* Today's pulse — gradient hero (workspace_hubs.dart) */}
      <div className="pulse-card">
        <div style={{ flex: 1, minWidth: 0 }}>
          <div className="pulse-label">Today&apos;s pulse</div>
          <div className="pulse-title">{running === 0 ? 'Ready for the next game' : `${running} tables are live`}</div>
          <div className="pulse-hint">
            {duesCount === 0 ? 'Everything looks clear.' : `${duesCount} dues need attention today.`}
          </div>
        </div>
        {running === 0 ? <Zap size={62} className="pulse-icon" /> : <AudioLines size={62} className="pulse-icon" />}
      </div>

      <div className="grid-stats two">
        <StatCard label="Live tables" value={String(running)} tone="green" sub={`${data?.tables?.length ?? 0} tables set up`} />
        <StatCard label="Pending dues" value={String(duesCount)} tone="red" sub={formatCurrency(stats?.totalDue ?? 0)} />
      </div>
      <div className="grid-stats two">
        <StatCard label="Active players" value={String(activePlayers)} tone="blue" sub="members active" />
        <StatCard label="Low stock items" value={String(lowStock)} tone="gold" sub="need restocking" />
      </div>

      <div className="section-head" style={{ marginTop: 6 }}>
        <div className="section-title">Quick actions</div>
        <span className="small muted">Today&apos;s collection · {formatCurrency(stats?.todayEarnings ?? 0)}</span>
      </div>
      <div className="qa-grid">
        {actions.map((a) => {
          const Icon = a.icon
          return (
            <button key={a.label} type="button" className={`qa-tile qa-${a.tone}`} onClick={() => navigate(a.to)}>
              <span className="qa-ic">
                <Icon size={20} />
              </span>
              <span className="qa-label">{a.label}</span>
              <ChevronRight size={18} style={{ opacity: 0.45, flexShrink: 0 }} />
            </button>
          )
        })}
      </div>

      {!data && (
        <Card>
          <div className="row" style={{ alignItems: 'center', gap: 8 }}>
            <Users size={14} className="muted" />
            <span className="muted small">Club data load ho raha hai…</span>
          </div>
        </Card>
      )}
    </div>
  )
}
