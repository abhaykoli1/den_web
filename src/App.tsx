import { lazy, Suspense, useState } from 'react'
import { Navigate, Route, Routes } from 'react-router-dom'
import { hasAppAccess, useAuth } from './context/AuthContext'
import { ClubProvider } from './context/ClubContext'
import Layout from './components/Layout'
import LoginScreen from './components/LoginScreen'
import SubscriptionOnboardingScreen from './components/SubscriptionOnboardingScreen'
import OnboardingScreen, { onboardingSeen } from './components/OnboardingScreen'
import SplashScreen from './components/SplashScreen'
import { Card, EmptyState } from './components/ui'
import ErrorBoundary from './components/ErrorBoundary'

const HomeScreen = lazy(() => import('./components/HomeScreen'))
const BookingsScreen = lazy(() => import('./components/BookingsScreen'))
const OrdersScreen = lazy(() => import('./components/OrdersScreen'))
const StockScreen = lazy(() => import('./components/StockScreen'))
const TablesScreen = lazy(() => import('./components/TablesScreen'))
const PlayersScreen = lazy(() => import('./components/PlayersScreen'))
const DueDeskScreen = lazy(() => import('./components/DueDeskScreen'))
const ItemsScreen = lazy(() => import('./components/ItemsScreen'))
const ExpensesScreen = lazy(() => import('./components/ExpensesScreen'))
const FinanceScreen = lazy(() => import('./components/FinanceScreen'))
const TournamentsScreen = lazy(() => import('./components/TournamentsScreen'))
const ItemBillsScreen = lazy(() => import('./components/ItemBillsScreen'))
const FramesScreen = lazy(() => import('./components/FramesScreen'))
const LogsScreen = lazy(() => import('./components/LogsScreen'))
const AdminScreen = lazy(() => import('./components/AdminScreen'))
const AdminDashboardScreen = lazy(() => import('./components/AdminDashboardScreen'))
const DayCloseScreen = lazy(() => import('./components/DayCloseScreen'))
const TeamScreen = lazy(() => import('./components/TeamScreen'))
const SettingsScreen = lazy(() => import('./components/SettingsScreen'))
const SupportScreen = lazy(() => import('./components/SupportScreen'))
const PrivacyScreen = lazy(() => import('./components/PrivacyScreen'))
const TermsScreen = lazy(() => import('./components/TermsScreen'))
const MasterAdminScreen = lazy(() => import('./components/MasterAdminScreen'))
const AccountScreen = lazy(() => import('./components/AccountScreen'))

/** Staff accounts never see the money-admin surfaces — bounce them home. */
function AdminOnly({ children }: { children: JSX.Element }) {
  const { user } = useAuth()
  if (user?.role === 'staff') {
    return (
      <Card>
        <EmptyState
          title="Admin area — owner access required"
          hint="Revenue, finance, expenses and team sirf club owner dekhte hain. Aap billing, players, due desk, items aur tournaments handle kar sakte ho."
        />
      </Card>
    )
  }
  return children
}

export default function App() {
  const { status, user } = useAuth()
  // den_app main.dart routing parity: splash → onboarding → login →
  // subscription wall → shell.
  const [introDone, setIntroDone] = useState(() => onboardingSeen())

  if (status === 'loading') return <SplashScreen />
  if (!user && !introDone) return <OnboardingScreen onDone={() => setIntroDone(true)} />
  if (!user) return <LoginScreen />
  if (!hasAppAccess(user)) return <SubscriptionOnboardingScreen />

  return (
    <ClubProvider >
      <Suspense fallback={<SplashScreen />}>
        <Routes >
          <Route element={<Layout />}>
            <Route path="/home" element={<ErrorBoundary label="Home"><HomeScreen /></ErrorBoundary>} />
            <Route path="/tables" element={<ErrorBoundary label="Tables"><TablesScreen /></ErrorBoundary>} />
            <Route path="/bookings" element={<ErrorBoundary label="Bookings"><BookingsScreen /></ErrorBoundary>} />
            <Route path="/orders" element={<ErrorBoundary label="Orders"><OrdersScreen /></ErrorBoundary>} />
            <Route path="/players" element={<PlayersScreen />} />
            <Route path="/due-desk" element={<DueDeskScreen />} />
            <Route path="/items" element={<ErrorBoundary label="Items"><ItemsScreen /></ErrorBoundary>} />
            <Route path="/stock" element={<ErrorBoundary label="Stock"><StockScreen /></ErrorBoundary>} />
            <Route path="/item-bills" element={<ItemBillsScreen />} />
            <Route path="/frames" element={<FramesScreen />} />
            <Route path="/logs" element={<LogsScreen />} />
            <Route path="/expenses" element={<ErrorBoundary label="Expenses"><AdminOnly><ExpensesScreen /></AdminOnly></ErrorBoundary>} />
            <Route path="/finance" element={<ErrorBoundary label="Finance"><AdminOnly><FinanceScreen /></AdminOnly></ErrorBoundary>} />
            <Route path="/tournaments" element={<TournamentsScreen />} />
            {/* ★ v3.21 — sagli money-reports ek cockpit pe; purane sab routes waisi hi live hain */}
            <Route path="/admin-dashboard" element={<ErrorBoundary label="Admin Dashboard"><AdminOnly><AdminDashboardScreen /></AdminOnly></ErrorBoundary>} />
            <Route path="/admin" element={<ErrorBoundary label="Admin"><AdminOnly><AdminScreen /></AdminOnly></ErrorBoundary>} />
            <Route path="/day-close" element={<ErrorBoundary label="Day Close"><AdminOnly><DayCloseScreen /></AdminOnly></ErrorBoundary>} />
            <Route path="/team" element={<ErrorBoundary label="Team"><AdminOnly><TeamScreen /></AdminOnly></ErrorBoundary>} />
            <Route path="/settings" element={<SettingsScreen />} />
            <Route path="/account" element={<AccountScreen />} />
            <Route path="/support" element={<SupportScreen />} />
            <Route path="/privacy" element={<PrivacyScreen />} />
            <Route path="/terms" element={<TermsScreen />} />
            <Route path="/master" element={<MasterAdminScreen />} />
            <Route path="*" element={<Navigate to="/home" replace />} />
          </Route>
        </Routes>
      </Suspense>
    </ClubProvider>
  )
}
