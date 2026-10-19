import { Link, useNavigate } from 'react-router-dom'
import {
  Activity,
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Grid3x3,
  Headset,
  History,
  LogOut,
  Package,
  Receipt,
  Settings,
  Shield,
  ShoppingBag,
  Trophy,
  UserCog,
  Wallet,
  type LucideIcon,
} from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { useClub } from '../context/ClubContext'

type AccountLink = {
  label: string
  description: string
  to: string
  icon: LucideIcon
}

const ADMIN_LINKS: AccountLink[] = [
  { label: 'Reports & smart insights', description: 'Revenue, expenses, P&L, trends and recommended actions', to: '/admin-dashboard', icon: Activity },
  { label: 'Day Close', description: 'Close the day and reconcile accounts', to: '/day-close', icon: History },
  { label: 'Monthly Revenue', description: 'Money received — frames, item bills, memberships, dues', to: '/admin', icon: Grid3x3 },
  { label: 'Finance', description: 'P&L · balance sheet · stock profit · utilisation', to: '/finance', icon: Wallet },
  { label: 'Expenses', description: 'Track and manage club expenses', to: '/expenses', icon: Receipt },
  { label: 'Club Staff', description: 'Manage staff roles and permissions', to: '/team', icon: UserCog },
]

const CLUB_LINKS: AccountLink[] = [
  { label: 'Games', description: 'Live game billing and tables', to: '/tables', icon: Grid3x3 },
  { label: 'Players', description: 'Members, wallets, passes and dues', to: '/players', icon: Wallet },
  { label: 'Due Desk', description: 'Manage player dues and payments', to: '/due-desk', icon: Receipt },
  { label: 'Item Billing', description: 'Counter sales and item bills', to: '/items', icon: ShoppingBag },
  { label: 'Stock', description: 'Items, restock and reorder levels', to: '/stock', icon: Package },
  { label: 'Bookings', description: 'Manage upcoming table reservations', to: '/bookings', icon: CalendarDays },
  { label: 'Tournaments', description: 'Players, matches and winners', to: '/tournaments', icon: Trophy },
  { label: 'Frames', description: 'Frame billing and history', to: '/frames', icon: History },
]

const GENERAL_LINKS: AccountLink[] = [
  { label: 'Settings', description: 'Configure your club settings', to: '/settings', icon: Settings },
  { label: 'Human Support', description: 'Contact support for help', to: '/support', icon: Headset },
]

function AccountAvatar({ name, picture }: { name: string; picture?: string | null }) {
  if (picture) return <img className="account-profile-avatar" src={picture} alt={name} referrerPolicy="no-referrer" />
  return <span className="account-profile-avatar account-profile-initial">{(name || '?').slice(0, 1).toUpperCase()}</span>
}

function LinkGroup({ heading, links, tone = 'green' }: { heading: string; links: AccountLink[]; tone?: 'green' | 'gold' }) {
  return (
    <section className="account-section">
      <h2 className="account-section-heading">{heading}</h2>
      <div className={`account-link-group account-link-group-${tone}`}>
        {links.map(({ label, description, to, icon: Icon }) => (
          <Link className="account-link" key={to} to={to}>
            <span className="account-link-icon"><Icon size={21} /></span>
            <span className="account-link-copy">
              <span className="account-link-title">{label}</span>
              <span className="account-link-description">{description}</span>
            </span>
            <ChevronRight className="account-link-chevron" size={19} />
          </Link>
        ))}
      </div>
    </section>
  )
}

export default function AccountScreen() {
  const { user, logout } = useAuth()
  const { club } = useClub()
  const navigate = useNavigate()
  const isAdmin = user?.role === 'owner' || user?.role === 'master'

  if (!user) return null

  return (
    <div className="account-page">
      <div className="account-page-header">
        <button className="account-back" onClick={() => navigate(-1)} aria-label="Go back">
          <ChevronLeft size={24} />
        </button>
        <div>
          <h1>Account</h1>
          <p>{user.email}</p>
        </div>
      </div>

      <section className="account-profile">
        <AccountAvatar name={user.name} picture={user.picture} />
        <h2>{user.name}</h2>
        <p>{user.email}</p>
        <span className={`account-role-badge${user.role === 'master' ? ' account-role-master' : ''}`}>
          {user.role === 'master' ? 'MASTER ADMIN' : user.role.toUpperCase()}
        </span>
      </section>

      {user.role === 'master' && (
        <section className="account-section">
          <h2 className="account-section-heading">PLATFORM</h2>
          <div className="account-link-group account-link-group-gold">
            <Link className="account-link" to="/master">
              <span className="account-link-icon"><Shield size={21} /></span>
              <span className="account-link-copy">
                <span className="account-link-title">Master Admin</span>
                <span className="account-link-description">Manage platform-wide administration</span>
              </span>
              <ChevronRight className="account-link-chevron" size={19} />
            </Link>
          </div>
        </section>
      )}

      {isAdmin ? (
        <LinkGroup heading="ADMIN" links={ADMIN_LINKS} />
      ) : (
        <LinkGroup heading={club?.name ? club.name.toUpperCase() : 'CLUB'} links={CLUB_LINKS} />
      )}
      <LinkGroup heading="GENERAL" links={GENERAL_LINKS} />

      <button className="account-signout" onClick={() => void logout()}>
        <LogOut size={17} /> Sign out
      </button>
    </div>
  )
}
