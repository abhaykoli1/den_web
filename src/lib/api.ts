// Central REST client: base URL, bearer token, typed errors, 401 handling.
import { clearToken, getToken } from './storage'
import { isRecord, readRecords, readStrings, validateClubDataRoot } from './clubDataSchema'
import type {
  ActiveSession,
  ActivityLog,
  Club,
  ClubData,
  ClubTable,
  Expense,
  FrameRecord,
  ItemBill,
  Member,
  MembershipPlan,
  MembershipSale,
  MenuItem,
  MatchMode,
  SessionPlayer,
  BillLineItem,
  Settlement,
  ClubStats,
} from '../types'

export class ApiError extends Error {
  status: number
  constructor(status: number, message: string) {
    super(message)
    this.status = status
    this.name = 'ApiError'
  }
}

export { isRecord }

export const API_BASE = (import.meta.env.VITE_API_URL || '/api').replace(/\/$/, '')

export const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID || ''
export const DEV_MODE = String(import.meta.env.VITE_AUTH_DEV_MODE).toLowerCase() === 'true'

interface ApiOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE'
  body?: unknown
}

export async function api<T = unknown>(path: string, opts: ApiOptions = {}): Promise<T> {
  const { method = 'GET', body } = opts
  const headers: Record<string, string> = { Accept: 'application/json' }
  if (body !== undefined) headers['Content-Type'] = 'application/json'
  const token = getToken()
  if (token) headers.Authorization = `Bearer ${token}`

  let res: Response
  try {
    res = await fetch(`${API_BASE}${path}`, {
      method,
      headers,
      body: body !== undefined ? JSON.stringify(body) : undefined,
    })
  } catch {
    throw new ApiError(0, 'Network error — is the backend running?')
  }

  let data: unknown = null
  const text = await res.text()
  let invalidJson = false
  if (text) {
    try {
      data = JSON.parse(text)
    } catch {
      invalidJson = true
    }
  }

  if (res.ok && invalidJson) throw new ApiError(502, 'Server returned an invalid response')

  if (!res.ok) {
    const detail = isRecord(data) ? data.detail : undefined
    let message =
      typeof detail === 'string'
        ? detail
        : Array.isArray(detail)
          ? detail.map((entry: unknown) => {
              const message = isRecord(entry) ? entry.msg : undefined
              return typeof message === 'string' ? message : String(entry)
            }).join('; ')
          : res.status === 401
            ? 'Your session expired — please sign in again'
            : `Request failed (${res.status})`
    // Generic/proxy 401s ("Authentication required", empty detail) confuse
    // owners — always surface one friendly, actionable message.
    if (res.status === 401 && (message === 'Authentication required' || !detail)) {
      message = 'Your session expired — please sign in again'
    }
    // Common platform-level failures → one clear line instead of a code.
    if (res.status === 413) message = 'Request too large — try a smaller image'
    if (res.status === 429) message = 'Too many requests — wait a moment and try again'
    if (res.status === 502 || res.status === 503 || res.status === 504) {
      message = 'Server is waking up — wait ~10 seconds and try again'
    }
    if (res.status === 401 && token) {
      clearToken()
      window.dispatchEvent(new Event('auth:unauthorized'))
    }
    throw new ApiError(res.status, message)
  }
  return data as T
}

// ---- normalization helpers (defensive defaults around raw API JSON) ----

export function asArray<T = unknown>(v: unknown): T[] {
  return Array.isArray(v) ? (v as T[]) : []
}

export function asNum(v: unknown, fallback = 0): number {
  const n = typeof v === 'string' ? parseFloat(v) : Number(v)
  return Number.isFinite(n) ? n : fallback
}

export function normClubData(value: unknown): ClubData {
  const raw = validateClubDataRoot(value)
  const sessions = readRecords<ActiveSession>(raw.sessions, 'sessions', ['id', 'startedAt']).map((s, index) => ({
    ...s,
    matchMode: (s?.matchMode === '2v2' ? '2v2' : 'solo') as MatchMode,
    players: readRecords<SessionPlayer>(s?.players, `sessions[${index}].players`, ['label']),
    items: readRecords<BillLineItem>(s?.items, `sessions[${index}].items`),
  }))
  const frames = readRecords<FrameRecord>(raw.frames, 'frames', ['id']).map((f, index) => ({
    ...f,
    matchMode: (f?.matchMode === '2v2' ? '2v2' : 'solo') as MatchMode,
    players: readRecords<SessionPlayer>(f?.players, `frames[${index}].players`, ['label']),
    items: readRecords<BillLineItem>(f?.items, `frames[${index}].items`),
    winners: readStrings(f?.winners, `frames[${index}].winners`),
    losers: readStrings(f?.losers, `frames[${index}].losers`),
    settlements: readRecords<Settlement>(f?.settlements, `frames[${index}].settlements`),
  }))
  return {
    club: raw.club as unknown as Club,
    tables: readRecords<ClubTable>(raw.tables, 'tables', ['id', 'name']).map((t) => ({ ...t, active: t?.active !== false })),
    members: readRecords<Member>(raw.members, 'members', ['id', 'name']).map((m) => ({ ...m, active: m?.active !== false })),
    plans: readRecords<MembershipPlan>(raw.plans, 'plans', ['id', 'name', 'type']).map((p) => ({ ...p, active: p?.active !== false })),
    sessions,
    frames,
    menuItems: readRecords<MenuItem>(raw.menuItems, 'menuItems', ['id', 'name']).map((i) => ({
      ...i,
      active: i?.active !== false,
      costPrice: asNum(i?.costPrice),
      stockQty: i?.stockQty == null ? 0 : asNum(i?.stockQty),
    })),
    itemBills: readRecords<ItemBill>(raw.itemBills, 'itemBills', ['id']),
    expenses: readRecords<Expense>(raw.expenses, 'expenses', ['id', 'title']),
    membershipSales: readRecords<MembershipSale>(raw.membershipSales, 'membershipSales', ['id', 'memberId']),
    logs: readRecords<ActivityLog>(raw.logs, 'logs', ['id', 'message']),
    stats: raw.stats as unknown as ClubStats,
  }
}
