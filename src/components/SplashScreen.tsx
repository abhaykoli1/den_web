// Branded splash — port of den_app `main.dart` → BrandSplashScreen.
// Black canvas + square club logo while the saved session is restored.
export default function SplashScreen() {
  return (
    <div className="splash" role="status" aria-label="Rowdy's Den">
      <img src="/icons/rowdys_den_logo_square.png" alt="Rowdy's Den" />
    </div>
  )
}
