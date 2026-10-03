import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import { getItem, getThemePref, setItem, setThemePref } from '../lib/storage'

type Theme = 'dark' | 'light'

interface ThemeCtx {
  theme: Theme
  toggle: () => void
  /** den_app session.textScale — 0.85…1.25, applied to the root font size. */
  textScale: number
  setTextScale: (v: number) => void
}

const SCALE_KEY = 'textScale'
const MIN = 0.85
const MAX = 1.25

const Ctx = createContext<ThemeCtx>({
  theme: 'light',
  toggle: () => undefined,
  textScale: 1,
  setTextScale: () => undefined,
})

export function ThemeProvider({ children }: { children: ReactNode }) {
  // ★ den_app parity (main.dart): LIGHT is the product default, dark is the
  // night look one tap away. Anyone who already picked a theme keeps it.
  const [theme, setTheme] = useState<Theme>(() => (getThemePref() === 'dark' ? 'dark' : 'light'))
  const [textScale, setScale] = useState<number>(() => {
    const raw = Number(getItem(SCALE_KEY))
    return Number.isFinite(raw) && raw > 0 ? Math.min(MAX, Math.max(MIN, raw)) : 1
  })

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme)
    setThemePref(theme)
  }, [theme])

  // Flutter's MediaQuery textScaler has no exact CSS twin; zoom on the app
  // root gives the same "sab kuch thoda bada/chhota" result across screens.
  useEffect(() => {
    const root = document.getElementById('root')
    if (root) root.style.zoom = String(textScale)
    document.documentElement.style.setProperty('--text-scale', String(textScale))
    setItem(SCALE_KEY, String(textScale))
  }, [textScale])

  const value = useMemo<ThemeCtx>(
    () => ({
      theme,
      toggle: () => setTheme((t) => (t === 'dark' ? 'light' : 'dark')),
      textScale,
      setTextScale: (v: number) => setScale(Math.min(MAX, Math.max(MIN, v))),
    }),
    [theme, textScale],
  )
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>
}

export function useTheme() {
  return useContext(Ctx)
}
