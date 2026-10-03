// Workspace tab strips — port of den_app `lib/src/screens/workspace_hubs.dart`
// (ClubWorkspace / RecordsWorkspace + _WorkspaceTabs). The sidebar stays the
// primary web navigation; these strips reproduce the app's two intent-based
// hubs so related screens sit one tap apart, exactly like the phone app.
import { NavLink, useLocation } from 'react-router-dom'

interface Tab {
  to: string
  label: string
  adminOnly?: boolean
}

const CLUB_TABS: Tab[] = [
  { to: '/tables', label: 'Games' },
  { to: '/players', label: 'Players' },
  { to: '/due-desk', label: 'Dues' },
  { to: '/frames', label: 'Frames' },
  { to: '/bookings', label: 'Bookings' },
]

const RECORDS_TABS: Tab[] = [
  { to: '/items', label: 'Counter' },
  { to: '/stock', label: 'Stock' },
  { to: '/item-bills', label: 'Bills' },
  { to: '/orders', label: 'Orders' },
  { to: '/tournaments', label: 'Tournaments' },
  { to: '/logs', label: 'Logs' },
]

export const WORKSPACE_ROUTES = [...CLUB_TABS, ...RECORDS_TABS].map((t) => t.to)

export default function WorkspaceTabs() {
  const { pathname } = useLocation()
  const inClub = CLUB_TABS.some((t) => pathname.startsWith(t.to))
  const inRecords = RECORDS_TABS.some((t) => pathname.startsWith(t.to))
  if (!inClub && !inRecords) return null
  const tabs = inClub ? CLUB_TABS : RECORDS_TABS

  return (
    <div className="ws-tabs" role="tablist" aria-label={inClub ? 'Club workspace' : 'Records workspace'}>
      {tabs.map((t) => (
        <NavLink key={t.to} to={t.to} className={({ isActive }) => `ws-tab${isActive ? ' active' : ''}`} role="tab">
          {t.label}
        </NavLink>
      ))}
    </div>
  )
}
