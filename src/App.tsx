import { useState } from 'react'
import { Navigate, Route, Routes } from 'react-router-dom'
import { hasAppAccess, useAuth } from './context/AuthContext'
import { ClubProvider } from './context/ClubContext'
import Layout from './components/Layout'
import LoginScreen from './components/LoginScreen'
import SubscriptionOnboardingScreen from './components/SubscriptionOnboardingScreen'
import HomeScreen from './components/HomeScreen'
import BookingsScreen from './components/BookingsScreen'
import OrdersScreen from './components/OrdersScreen'
import StockScreen from './components/StockScreen'
import OnboardingScreen, { onboardingSeen } from './components/OnboardingScreen'
import SplashScreen from './components/SplashScreen'
import TablesScreen from './components/TablesScreen'
import PlayersScreen from './components/PlayersScreen'
import DueDeskScreen from './components/DueDeskScreen'
import ItemsScreen from './components/ItemsScreen'
import ExpensesScreen from './components/ExpensesScreen'
import FinanceScreen from './components/FinanceScreen'
import TournamentsScreen from './components/TournamentsScreen'
import ItemBillsScreen from './components/ItemBillsScreen'
import FramesScreen from './components/FramesScreen'
import LogsScreen from './components/LogsScreen'
import AdminScreen from './components/AdminScreen'
import AdminDashboardScreen from './components/AdminDashboardScreen'
import DayCloseScreen from './components/DayCloseScreen'
import TeamScreen from './components/TeamScreen'
import SettingsScreen from './components/SettingsScreen'
import SupportScreen from './components/SupportScreen'
import PrivacyScreen from './components/PrivacyScreen'
import TermsScreen from './components/TermsScreen'
import MasterAdminScreen from './components/MasterAdminScreen'
import { Card, EmptyState } from './components/ui'
import ErrorBoundary from './components/ErrorBoundary'

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
    <ClubProvider>
      <Routes>
        <Route element={<Layout />}>
          <Route path="/home" element={<ErrorBoundary label="Home"><HomeScreen /></ErrorBoundary>} />
          <Route path="/tables" element={ <ErrorBoundary label="Tables"> <TablesScreen /></ErrorBoundary>} />
          <Route path="/bookings" element={<ErrorBoundary label="Bookings"><BookingsScreen /></ErrorBoundary>} />
          <Route path="/orders" element={<ErrorBoundary label="Orders"><OrdersScreen /></ErrorBoundary>} />
          <Route path="/players" element={<PlayersScreen />} />
          <Route path="/due-desk" element={<DueDeskScreen />} />
          <Route path="/items" element={<ErrorBoundary label="Items"><ItemsScreen /></ErrorBoundary>} />
          {/* <Route path="/items" element={<ItemsScreen />} /> */}
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
          <Route path="/support" element={<SupportScreen />} />
          <Route path="/privacy" element={<PrivacyScreen />} />
          <Route path="/terms" element={<TermsScreen />} />
          <Route path="/master" element={<MasterAdminScreen />} />
          <Route path="*" element={<Navigate to="/home" replace />} />
        </Route>
      </Routes>
    </ClubProvider>
  )
}
