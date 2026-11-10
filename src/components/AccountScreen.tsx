import { Link } from 'react-router-dom'
import {
  Activity,
  Bell,
  Building2,
  CalendarDays,
  ChevronRight,
  CreditCard,
  Gamepad2,
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
  UserRound,
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

const SETTINGS_LINKS: AccountLink[] = [
  { label: 'My Profile', description: 'Your name, phone number and location', to: '/settings/profile', icon: UserRound },
  { label: 'Browser Notifications', description: 'Choose which alerts appear on this device', to: '/settings/notifications', icon: Bell },
  { label: 'Club Settings', description: 'Club profile, payment QR and billing defaults', to: '/settings/club', icon: Building2 },
  { label: 'Game Pricing', description: 'Game tables, rates and peak pricing', to: '/settings/pricing', icon: Gamepad2 },
  { label: 'Membership Plans', description: 'Wallet, frame pass and monthly plans', to: '/settings/plans', icon: CreditCard },
]

const GENERAL_LINKS: AccountLink[] = [
  { label: 'Settings', description: 'Configure your club settings', to: '/settings', icon: Settings },
  { label: 'Human Support', description: 'Contact support for help', to: '/support', icon: Headset },
]

const ADMIN_GENERAL_LINKS: AccountLink[] = [
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
      <div className={`settings-links${tone === 'gold' ? ' settings-links-gold' : ''}`}>
        {links.map(({ label, description, to, icon: Icon }) => (
          <Link className="settings-link-card" key={to} to={to}>
            <span className="settings-link-icon"><Icon size={19} strokeWidth={2} aria-hidden="true" /></span>
            <span className="settings-link-copy">
              <b>{label}</b>
              <span className="muted small">{description}</span>
            </span>
            <ChevronRight className="settings-link-chevron" size={19} aria-hidden="true" />
          </Link>
        ))}
      </div>
    </section>
  )
}

export default function AccountScreen() {
  const { user, logout } = useAuth()
  const { club } = useClub()
  const isAdmin = user?.role === 'owner' || user?.role === 'master'

  if (!user) return null

  return (
    <div className="account-page">
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
          <div className="settings-links settings-links-gold">
            <Link className="settings-link-card" to="/master">
              <span className="settings-link-icon"><Shield size={19} strokeWidth={2} aria-hidden="true" /></span>
              <span className="settings-link-copy">
                <b>Master Admin</b>
                <span className="muted small">Manage platform-wide administration</span>
              </span>
              <ChevronRight className="settings-link-chevron" size={19} aria-hidden="true" />
            </Link>
          </div>
        </section>
      )}

      {isAdmin && <LinkGroup heading="SETTINGS" links={SETTINGS_LINKS} />}

      {isAdmin ? (
        <LinkGroup heading="ADMIN" links={ADMIN_LINKS} />
      ) : (
        <LinkGroup heading={club?.name ? club.name.toUpperCase() : 'CLUB'} links={CLUB_LINKS} />
      )}
      <LinkGroup heading="GENERAL" links={isAdmin ? ADMIN_GENERAL_LINKS : GENERAL_LINKS} />

      <button className="account-signout" onClick={() => void logout()}>
        <LogOut size={17} /> Sign out
      </button>
    </div>
  )
}
