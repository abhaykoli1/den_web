// Offline counter-sale queue — port of den_app `lib/src/offline_queue.dart`.
// When the network drops, an item-bill payload is stored locally (localStorage
// instead of SharedPreferences) and replayed when the API is reachable again.
import { api, ApiError } from './api'
import { getItem, setItem } from './storage'

const KEY = 'offlineBills'
/** Fired whenever the queue length changes — screens re-render their badge. */
export const QUEUE_EVENT = 'rd:offline-queue'

export interface QueuedBill {
  clubId: string
  payload: Record<string, unknown>
  queuedAt: string
  label: string
}

function read(): QueuedBill[] {
  try {
    const raw = getItem(KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? (parsed as QueuedBill[]) : []
  } catch {
    return [] // corrupted queue starts empty (same as the app)
  }
}

function write(list: QueuedBill[]): void {
  setItem(KEY, JSON.stringify(list))
  window.dispatchEvent(new CustomEvent(QUEUE_EVENT, { detail: list.length }))
}

export function pendingBills(): QueuedBill[] {
  return read()
}

export function pendingCount(): number {
  return read().length
}

export function enqueueBill(clubId: string, payload: Record<string, unknown>, label: string): void {
  write([...read(), { clubId, payload, queuedAt: new Date().toISOString(), label }])
}

export function clearQueue(): void {
  write([])
}

/** True when the failure means "no network", not "server said no". */
export function isOfflineError(e: unknown): boolean {
  if (e instanceof ApiError) return e.status === 0 || e.status >= 502
  return !navigator.onLine
}

/** Replays everything still pending → { sent, failed[] } (offline_queue.sync). */
export async function syncQueue(): Promise<{ sent: number; failed: string[] }> {
  const queue = read()
  if (queue.length === 0) return { sent: 0, failed: [] }
  let sent = 0
  const failed: string[] = []
  const rest: QueuedBill[] = []
  for (const entry of queue) {
    try {
      await api(`/clubs/${entry.clubId}/item-bills`, { method: 'POST', body: entry.payload })
      sent++
    } catch (e) {
      if (isOfflineError(e)) rest.push(entry) // still offline — keep queued
      else failed.push(e instanceof ApiError ? e.message : 'Bill rejected by the server')
    }
  }
  write(rest)
  return { sent, failed }
}
