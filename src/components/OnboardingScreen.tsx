// First-run intro — port of den_app `lib/src/screens/onboarding_screen.dart`.
// Shown once before the login screen; the "seen" flag lives in localStorage
// (the app persists the same `rd_seen_onboarding` key in SharedPreferences).
import { useState } from 'react'
import {
  ArrowRight,
  Coffee,
  Grid3x3,
  LayoutDashboard,
  Trophy,
  Users,
  Zap,
  type LucideIcon,
} from 'lucide-react'
import { Btn } from './ui'
import { getItem, setItem } from '../lib/storage'

const SEEN_KEY = 'seenOnboarding'

export function onboardingSeen(): boolean {
  return getItem(SEEN_KEY) === 'true'
}

export function markOnboardingSeen(): void {
  setItem(SEEN_KEY, 'true')
}

interface Slide {
  icon: LucideIcon
  title: string
  body: string
}

const SLIDES: Slide[] = [
  {
    icon: Grid3x3,
    title: 'Tables chalao, bill khud bano',
    body: 'Start a table and the timer, rates, peak hours, and glove charges run automatically. Stop it when ready and the server calculates the final bill. Winners never pay.',
  },
  {
    icon: Users,
    title: 'Players, wallet & due ek jagah',
    body: "Track every regular player's wallet, frame pass, and due. Collect from the Due Desk in one tap, or send a WhatsApp or email reminder.",
  },
  {
    icon: Coffee,
    title: 'Counter items & receipts',
    body: 'Add cold drinks, tea, and snacks with a tap and save the bill. Print or share a 58mm thermal receipt instantly. Offline bills queue and sync later.',
  },
  {
    icon: Trophy,
    title: 'Tournaments & reports ready',
    body: 'Knockout ya league — bracket, live table billing, champion tak. Day Close, Monthly sheet, P&L — sab Excel/PDF me export.',
  },
  {
    icon: LayoutDashboard,
    title: 'Dashboard & Smart Insights',
    body: 'Owner Dashboard pe aaj ki kamai, 14-day graph, income mix aur P&L ek nazar me. Smart Insights khud batata hai — kaunsa table sabse zyada kama raha, kaun player due pe hai.',
  },
  {
    icon: Zap,
    title: 'Offline bhi chale, themes bhi',
    body: 'Net chala jaye? Bills queue ho jate hain — wapas aate hi auto-sync. Dark/light dono theme, aur Settings se apna club logo bhi upload kar sakte ho.',
  },
]

export default function OnboardingScreen({ onDone }: { onDone: () => void }) {
  const [page, setPage] = useState(0)
  const slide = SLIDES[page]
  const last = page === SLIDES.length - 1
  const Icon = slide.icon

  const finish = () => {
    markOnboardingSeen()
    onDone()
  }

  return (
    <div className="onboard">
      <div className="onboard-skip">
        <Btn variant="ghost" size="sm" onClick={finish}>
          Skip
        </Btn>
      </div>

      <div className="onboard-body">
        <div className="onboard-halo">
          <div className="onboard-badge">
            <Icon size={44} />
          </div>
        </div>

        <span className="badge" style={{ background: 'var(--accent-green)', color: '#fff', height: 28, padding: '0 14px', borderRadius: 18 }}>
          Step {page + 1} / {SLIDES.length}
        </span>

        <h1 className="onboard-title">{slide.title}</h1>
        <p className="onboard-text">{slide.body}</p>

        <div className="onboard-dots">
          {SLIDES.map((_, i) => (
            <span key={i} className={`onboard-dot${i === page ? ' on' : ''}`} />
          ))}
        </div>
      </div>

      <div className="onboard-foot">
        <Btn
          variant="green"
          size="lg"
          className="btn-block"
          onClick={() => (last ? finish() : setPage((p) => p + 1))}
        >
          {last ? 'Shuru karo' : 'Aage badho'} <ArrowRight size={14} />
        </Btn>
      </div>
    </div>
  )
}
