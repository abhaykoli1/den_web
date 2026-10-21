import { Spinner } from './ui'

export default function SplashScreen() {
  return (
    <div className="splash" role="status" aria-label="Loading Rowdy's Den">
      <Spinner size={34} />
      <span>Loading Rowdy's Den…</span>
    </div>
  )
}
