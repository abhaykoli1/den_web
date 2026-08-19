import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Activity,
  BarChart3,
  ClipboardCheck,
  History,
  LayoutDashboard,
  Receipt,
  ReceiptText,
  Scale,
  UserCog,
  type LucideIcon,
} from 'lucide-react'
import { api, asArray, asNum } from '../lib/api'
import { useClub } from '../context/ClubContext'
import { formatCurrency } from '../lib/format'
import { Btn, Card, EmptyState, StatCard } from './ui'
import InsightsCard from './InsightsCard'

// ================================================================
// ADMIN DASHBOARD (v3.21 · owner-only money cockpit)
//  Ek hi page pe sab kuch: daily income graph, source mix, expense mix,
//  P&L strip, stat cards — aur har money-page ka card link. Backend ke
//  canonical report shapes use kiye hain (day-close / monthly / finance) —
//  koi naya API nahi, koi nayi dependency nahi (graphs pure SVG).
//
//  Sidebar me is route ke liye Layout me single "Admin Dashboard" link hai;
//  Day Close / Monthly Revenue / Finance / Expenses / Club Staff ke DIRECT
//  links yahan card grid me rehte hain ("aur bhi links" = Item Bills,
//  Frames, Activity Logs bhi add kiye gaye).
// ================================================================

const C = {
  green: '#34d399',
  red: '#f87171',
  gold: '#fbbf24',
  blue: '#60a5fa',
  purple: '#c084fc',
  teal: '#2dd4bf',
  muted: '#94a3b8',
  grid: 'rgba(148,163,184,0.16)',
}

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

function fmtDay(d: string): string {
  const y = Number(d.slice(0, 4))
  const m = Number(d.slice(5, 7))
  const dd = Number(d.slice(8, 10))
  return `${dd} ${MONTHS[(m || 1) - 1]}` + (y ? ` '${String(y).slice(2)}` : '')
}

const SOURCE_META: { key: string; label: string; color: string }[] = [
  { key: 'frames', label: 'Frames', color: C.green },
  { key: 'items', label: 'Item Bills', color: C.blue },
  { key: 'memberships', label: 'Memberships', color: C.gold },
  { key: 'due', label: 'Due Collections', color: C.purple },
  { key: 'tournaments', label: 'Tournaments', color: C.teal },
]

type DayRow = { date: string; income: number; expenses: number }

/** 14-day income vs expenses bar graph — pure SVG, dark/light safe. */
function DailyBars({ rows }: { rows: DayRow[] }) {
  const W = 700
  const H = 170
  const PAD_X = 8
  const PAD_T = 12
  const PAD_B = 18
  const max = Math.max(1, ...rows.map((r) => Math.max(r.income, r.expenses)))
  const slot = (W - PAD_X * 2) / Math.max(1, rows.length)
  const bw = Math.min(26, slot * 0.52)
  const exw = Math.min(10, slot * 0.2)
  const y = (v: number) => PAD_T + (H - PAD_B - PAD_T) * (1 - v / max)
  const base = H - PAD_B
  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      style={{ width: '100%', height: 180, display: 'block' }}
      role="img"
      aria-label="Daily income vs expenses (last 14 days)"
    >
      {[0.25, 0.5, 0.75, 1].map((f) => (
        <line key={f} x1={PAD_X} x2={W - PAD_X} y1={y(f * max)} y2={y(f * max)} stroke={C.grid} strokeWidth={1} />
      ))}
      {rows.map((r, i) => {
        const cx = PAD_X + slot * i + slot / 2
        const iy = y(r.income)
        const ey = y(r.expenses)
        const day = Number(r.date.slice(8, 10))
        const showLabel = i === 0 || i === rows.length - 1 || i % 3 === 0
        return (
          <g key={r.date}>
            <title>{`${fmtDay(r.date)} · income ${formatCurrency(r.income)} · expenses ${formatCurrency(r.expenses)}`}</title>
            <rect x={cx - bw / 2 - exw / 2 - 1} y={iy} width={bw} height={Math.max(2, base - iy)} rx={3} fill={C.green} fillOpacity={0.92} />
            <rect x={cx + bw / 2 - exw / 2 + 1} y={ey} width={exw} height={Math.max(0, base - ey)} rx={2} fill={C.red} fillOpacity={0.85} />
            {showLabel && (
              <text x={cx} y={H - 4} textAnchor="middle" fontSize={9} fill={C.muted}>
                {day}
              </text>
            )}
          </g>
        )
      })}
    </svg>
  )
}

/** Label + bar + amount row (source mix / expense mix). */
function HBars({ rows, empty }: { rows: { label: string; value: number; color: string }[]; empty: string }) {
  const total = rows.reduce((a, r) => a + r.value, 0)
  if (total <= 0) {
    return <p className="muted small" style={{ margin: '10px 0 4px' }}>{empty}</p>
  }
  return (
    <div style={{ display: 'grid', gap: 8, marginTop: 8 }}>
      {rows
        .filter((r) => r.value > 0)
        .sort((a, b) => b.value - a.value)
        .map((r) => {
          const pct = (r.value / total) * 100
          return (
            <div key={r.label}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, marginBottom: 3 }}>
                <span className="muted">{r.label}</span>
                <span className="money" style={{ fontWeight: 700 }}>{formatCurrency(r.value)} · {pct.toFixed(0)}%</span>
              </div>
              <div style={{ height: 8, borderRadius: 5, background: 'rgba(148,163,184,0.14)', overflow: 'hidden' }}>
                <div style={{ width: `${pct}%`, height: '100%', background: r.color, borderRadius: 5 }} />
              </div>
            </div>
          )
        })}
    </div>
  )
}

type PageLink = {
  to: string
  label: string
  icon: LucideIcon
  metric: string
  sub: string
}

export function AdminDashboardScreen() {
  const { club, stats } = useClub()
  const navigate = useNavigate()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [dc, setDc] = useState<Record<string, unknown> | null>(null)
  const [mon, setMon] = useState<Record<string, unknown> | null>(null)
  const [fin, setFin] = useState<Record<string, unknown> | null>(null)

  const monthKey = new Date().toISOString().slice(0, 7)

  const load = async () => {
    if (!club) return
    setLoading(true)
    setError('')
    try {
      const [d, m, f] = await Promise.all([
        api<Record<string, unknown>>(`/clubs/${club.id}/reports/day-close`),
        api<Record<string, unknown>>(`/clubs/${club.id}/reports/monthly?month=${monthKey}`),
        api<Record<string, unknown>>(`/clubs/${club.id}/reports/finance?month=${monthKey}`),
      ])
      setDc(d)
      setMon(m)
      setFin(f)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Reports load nahi hui — retry karo')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [club?.id])

  // ---- derived numbers (all canonical keys, optional-chained) ------------
  const todayDate = typeof dc?.date === 'string' ? dc.date : new Date().toISOString().slice(0, 10)
  const collected = asNum(dc?.collected)
  const netToday = asNum(dc?.net)
  const expToday = asNum((dc?.expenses as Record<string, unknown> | undefined)?.total)
  // const framesToday = asNum((dc?.frames as Record<string, unknown> | undefined)?.count)
  const totalDue = stats?.totalDue ?? 0
  // const runningSessions = stats?.runningSessions ?? 0

  const daily = asArray<Record<string, unknown>>(mon?.daily)
  const rows14: DayRow[] = useMemo(() => {
    // last 14 days ending on today (zero-filled)
    const out: DayRow[] = []
    const byDate = new Map(daily.map((d) => [String(d.date), d]))
    const end = new Date(`${todayDate}T00:00:00`)
    for (let i = 13; i >= 0; i--) {
      const dt = new Date(end.getTime() - i * 86400000)
      const key = `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, '0')}-${String(dt.getDate()).padStart(2, '0')}`
      const row = byDate.get(key)
      out.push({ date: key, income: asNum(row?.income), expenses: asNum(row?.expenses) })
    }
    return out
  }, [daily, todayDate])

  const yesterdayIncome = rows14.length > 1 ? rows14[rows14.length - 2].income : 0
  const deltaPct = yesterdayIncome > 0 ? Math.round(((collected - yesterdayIncome) / yesterdayIncome) * 100) : null

  const srcTotals = (mon?.sourceTotals ?? {}) as Record<string, unknown>
  const srcRows = SOURCE_META.map((s) => ({ label: s.label, color: s.color, value: asNum(srcTotals[s.key]) }))
  const monthTotal = asNum(mon?.totalEarnings)

  const expCats = asArray<Record<string, unknown>>(fin?.expenseCategories).map((e, i) => ({
    label: String(e.category ?? 'misc').replace(/^[a-z]/, (c) => c.toUpperCase()),
    value: asNum(e.amount),
    color: [C.red, C.gold, C.blue, C.purple, C.teal, C.muted][i % 6],
  }))
  const expMonth = asNum((fin?.expenses as Record<string, unknown> | undefined)?.total)
  const pnl = (fin?.pnl ?? {}) as Record<string, unknown>
  const netProfit = asNum(pnl.netProfit)

  const links: PageLink[] = [
    { to: '/day-close', label: 'Day Close', icon: ClipboardCheck, metric: formatCurrency(collected), sub: 'collected today · drawer reconcile' },
    { to: '/admin', label: 'Monthly Revenue', icon: BarChart3, metric: formatCurrency(monthTotal), sub: 'received this month · by stream' },
    { to: '/finance', label: 'Finance · P&L', icon: Scale, metric: formatCurrency(netProfit), sub: 'net profit this month' },
    { to: '/expenses', label: 'Expenses', icon: ReceiptText, metric: formatCurrency(expMonth), sub: 'spent this month · categories' },
    // { to: '/team', label: 'Club Staff', icon: UserCog, metric: 'Roles', sub: 'staff access & permissions' },
    { to: '/item-bills', label: 'Item Bills', icon: Receipt, metric: formatCurrency(asNum(srcTotals.items)), sub: 'counter sales this month' },
    { to: '/frames', label: 'Frames', icon: History, metric: formatCurrency(asNum(srcTotals.frames)), sub: 'table billing this month' },
    // { to: '/logs', label: 'Activity Logs', icon: Activity, metric: 'Audit', sub: 'payments, warnings & admin actions' },
  ]

  if (error) {
    return (
      <Card>
        <EmptyState title="Reports load nahi hui" hint={error} />
        <div style={{ marginTop: 8 }}>
          <Btn variant="green" size="sm" onClick={() => void load()}>Retry</Btn>
        </div>
      </Card>
    )
  }

  return (
    <div style={{ display: 'grid', gap: 10 }}>
      {/* ---- top stat cards ---- */}
      <div className="grid-stats">
        <StatCard
          label="Today Collected"
          tone="green"
          value={formatCurrency(collected)}
          sub={deltaPct === null ? 'PAYMENT ledger · today' : `${deltaPct >= 0 ? '↑' : '↓'} ${Math.abs(deltaPct)}% vs yesterday`}
        />
        <StatCard label="Today Net" tone="blue" value={formatCurrency(netToday)} sub={`expenses ${formatCurrency(expToday)}`} />
        <StatCard label="Total Due" tone="red" value={formatCurrency(totalDue)} sub={`limit ${formatCurrency(stats?.dueLimit ?? 0)}`} />
      </div>
       {/* ---- page links ---- */}
{/* 
       stat-card {
  background: var(--bg-elevated);
  border: 1px solid var(--border);
  border-left: 3px solid var(--accent-green);
  border-radius: var(--radius);
  padding: 8px 10px;
}
.stat-red { border-left-color: var(--accent-red); }
.stat-blue { border-left-color: var(--accent-blue); }
.stat-gold { border-left-color: var(--accent-gold); }
.stat-green { border-left-color: var(--accent-green); }
.stat-label { font-size: 8px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.08em; color: var(--text-muted); }
.stat-value { font-size: 16px; font-weight: 700; font-variant-numeric: tabular-nums; margin-top: 2px; }
.stat-sub { font-size: 9px; color: var(--text-muted); margin-top: 2px; } */}

      <div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8 }}>
          <LayoutDashboard size={14} aria-hidden />
          <div style={{ fontWeight: 800, fontSize: 13 }}>Reports &amp; Admin Pages</div>
        </div>


        <div style={{ display: 'grid', gap: 8, gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))' }}>
          {links.map((l) => {
            const Icon = l.icon
            return (
              <div
                key={l.to}
                role="link"
                tabIndex={0}
                onClick={() => navigate(l.to)}
                onKeyDown={(e) => e.key === 'Enter' && navigate(l.to)}
                className="master-card-link"
              >
                <div className="master-card-label" >
                  <Icon size={13} aria-hidden /> {l.label}
                </div>
                <div className="master-card-money money-green" style={{ marginLeft:18 }}>{l.metric}</div>
                <div className="muted small">{l.sub}</div>
              </div>
            )
          })}
        </div>
      </div>
 {/* ---- smart insights (existing engine reuse, no extra API call) ---- */}
      <InsightsCard month={monthKey} report={mon as never} finance={fin as never} scopes={['finance', 'revenue', 'expenses']} />

      {/* ---- daily graph + income mix ---- */}
      <div style={{ display: 'grid', gap: 10, gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))' }}>
        <Card>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
            <div>
              <div style={{ fontWeight: 800, fontSize: 13 }}>Daily Income — last 14 days</div>
              <div className="muted small">green income · red expenses · hover for totals</div>
            </div>
            <Btn variant="ghost" size="sm" loading={loading} onClick={() => void load()}>Reload</Btn>
          </div>
          <DailyBars rows={rows14} />
        </Card>

        <Card>
          <div style={{ fontWeight: 800, fontSize: 13 }}>Income Mix — this month</div>
          <div className="muted small">total {formatCurrency(monthTotal)} · PAYMENT ledger</div>
          <HBars rows={srcRows} empty="Is month abhi koi income nahi — day close baad yahan dikhega." />
        </Card>
      </div>

      {/* ---- expense mix + P&L ---- */}
      <div style={{ display: 'grid', gap: 10, gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))' }}>
        <Card>
          <div style={{ fontWeight: 800, fontSize: 13 }}>Expense Mix — this month</div>
          <div className="muted small">total {formatCurrency(expMonth)}</div>
          <HBars rows={expCats} empty="Is month koi expense book nahi hua — clean month! 🎉" />
        </Card>

        <Card>
          <div style={{ fontWeight: 800, fontSize: 13 }}>Profit &amp; Loss — this month</div>
          <div style={{ display: 'grid', gap: 6, marginTop: 10 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12 }}>
              <span className="muted">Income</span>
              <span className="money money-green" style={{ color: C.green, fontWeight: 700 }}>{formatCurrency(monthTotal)}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12 }}>
              <span className="muted">Expenses</span>
              <span className="money" style={{ color: C.red, fontWeight: 700 }}>− {formatCurrency(expMonth)}</span>
            </div>
            <div style={{ borderTop: '1px solid rgba(148,163,184,0.2)', margin: '2px 0' }} />
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 14 }}>
              <span style={{ fontWeight: 800 }}>Net Profit</span>
              <span className="money" style={{ color: netProfit >= 0 ? C.gold : C.red, fontWeight: 800, fontSize: 16 }}>
                {formatCurrency(netProfit)}
              </span>
            </div>
            <div className="muted small">server-computed · cash-basis (wallet consumption income nahi hota)</div>
          </div>
        </Card>
      </div>

     
     
    </div>
  )
}

export default AdminDashboardScreen
