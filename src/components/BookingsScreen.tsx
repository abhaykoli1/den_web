// Bookings — port of den_app `lib/src/screens/bookings_screen.dart`.
// GET /clubs/{id}/bookings?club_id={id} · DELETE /clubs/{id}/bookings/{bookingId}
import { useCallback, useEffect, useMemo, useState } from 'react'
import { CalendarDays, RefreshCw, X } from 'lucide-react'
import { api, ApiError, asArray } from '../lib/api'
import { useClub } from '../context/ClubContext'
import { useToast } from '../context/ToastContext'
import { Badge, Btn, Card, ConfirmModal, EmptyState, Seg, StatCard } from './ui'
import { FullLoader } from './ui'
import type { TableBooking } from '../types'

type Filter = 'upcoming' | 'all'

function labelOf(b: TableBooking): string {
  return `${b.tableName || 'Table'} · ${b.memberName || 'Staff'}`
}

function whenOf(b: TableBooking): string {
  const slot = [b.startIST, b.endIST].filter(Boolean).join('–')
  return [b.dateIST, slot].filter(Boolean).join(' · ')
}

export default function BookingsScreen() {
  const { club } = useClub()
  const toast = useToast()
  const [bookings, setBookings] = useState<TableBooking[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [filter, setFilter] = useState<Filter>('upcoming')
  const [cancelTarget, setCancelTarget] = useState<TableBooking | null>(null)
  const [busy, setBusy] = useState(false)

  const load = useCallback(async () => {
    if (!club) return
    setLoading(true)
    setError(null)
    try {
      const res = await api<any>(`/clubs/${club.id}/bookings?club_id=${encodeURIComponent(club.id)}`)
      const raw = Array.isArray(res) ? res : res?.bookings
      setBookings(asArray<TableBooking>(raw))
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Could not load bookings')
      setBookings([])
    } finally {
      setLoading(false)
    }
  }, [club?.id])

  useEffect(() => {
    void load()
  }, [load])

  const doCancel = async () => {
    if (!club || !cancelTarget?.id) return
    setBusy(true)
    try {
      await api(`/clubs/${club.id}/bookings/${cancelTarget.id}`, { method: 'DELETE' })
      toast.success('Booking cancelled')
      setCancelTarget(null)
      await load()
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : 'Could not cancel the booking')
    } finally {
      setBusy(false)
    }
  }

  const visible = useMemo(
    () => (filter === 'all' ? bookings : bookings.filter((b) => (b.status ?? 'upcoming') === 'upcoming')),
    [bookings, filter],
  )
  const upcoming = bookings.filter((b) => (b.status ?? 'upcoming') === 'upcoming').length
  const minutes = bookings.reduce((s, b) => s + (b.minutes ?? 0), 0)

  if (!club) return <EmptyState title="No club selected" hint="Pick a club to see its reservations." />

  return (
    <div className="stack">
      <div className="grid-stats three">
        <StatCard label="Upcoming" value={String(upcoming)} tone="green" sub="reservations" />
        <StatCard label="Total bookings" value={String(bookings.length)} tone="blue" sub="all statuses" />
        <StatCard label="Booked minutes" value={String(minutes)} tone="gold" sub="across the list" />
      </div>

      <div className="row wrap" style={{ alignItems: 'center' }}>
        <Seg<Filter>
          value={filter}
          onChange={setFilter}
          ariaLabel="Booking filter"
          options={[
            { value: 'upcoming', label: 'Upcoming' },
            { value: 'all', label: 'All' },
          ]}
        />
        <span className="spacer" />
        <Btn variant="ghost" size="sm" onClick={() => void load()}>
          <RefreshCw size={12} /> Refresh
        </Btn>
      </div>

      {loading ? (
        <FullLoader label="Loading bookings…" />
      ) : error ? (
        <Card>
          <div className="section-title">Could not load bookings</div>
          <p className="muted small">{error}</p>
          <Btn variant="outline" className="mt" onClick={() => void load()}>
            <RefreshCw size={12} /> Try again
          </Btn>
        </Card>
      ) : visible.length === 0 ? (
        <Card>
          <EmptyState
            icon={<CalendarDays size={22} />}
            title="No bookings yet"
            hint="Member reservations will appear here."
          />
        </Card>
      ) : (
        <div className="stack-sm">
          {visible.map((b, i) => {
            const status = b.status ?? 'upcoming'
            const isUpcoming = status === 'upcoming'
            return (
              <Card key={b.id ?? i} style={{ padding: 0 }}>
                <div className="booking-row">
                  <span className={`booking-av${isUpcoming ? '' : ' past'}`}>
                    <CalendarDays size={18} />
                  </span>
                  <div className="booking-main">
                    <div className="booking-title">{labelOf(b)}</div>
                    <div className="booking-sub">
                      {whenOf(b)}
                      <br />
                      {b.players ?? 2} players · {b.minutes ?? 0} min
                      {b.note ? ` · ${b.note}` : ''}
                    </div>
                  </div>
                  {isUpcoming ? (
                    <button
                      className="btn-icon danger"
                      title="Cancel booking"
                      aria-label="Cancel booking"
                      onClick={() => setCancelTarget(b)}
                    >
                      <X size={14} />
                    </button>
                  ) : (
                    <Badge kind="muted">{status}</Badge>
                  )}
                </div>
              </Card>
            )
          })}
        </div>
      )}

      <ConfirmModal
        open={!!cancelTarget}
        onClose={() => setCancelTarget(null)}
        onConfirm={() => void doCancel()}
        busy={busy}
        title="Cancel booking?"
        confirmLabel="Cancel booking"
        message={cancelTarget ? `${labelOf(cancelTarget)} · ${whenOf(cancelTarget)}` : ''}
      />
    </div>
  )
}
