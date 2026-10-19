import { useEffect, useMemo, useState } from 'react'
import { ArrowRightLeft, Banknote, Hand, IndianRupee, Minus, Pencil, Play, Plus, RotateCcw, Square, StickyNote, UserPlus } from 'lucide-react'
import { useClub } from '../context/ClubContext'
import { useToast } from '../context/ToastContext'
import {
  calcTableAmount,
  effectiveRate,
  formatClock,
  formatCurrency,
  formatDuration,
  formatHour,
  formatHourRange,
  maxPayingDiscount,
  parseNum,
  peakWindowActive,
  planValid,
} from '../lib/format'
import { Badge, Btn, Card, EmptyState, Field, Modal, Seg, Select, TextArea, TextInput } from './ui'
import InsightsCard from './InsightsCard'
import { CategoryIcon, defaultCategoryIcon } from './MenuCategoryField'
import ReceiptModal, { frameReceipt, type ReceiptData } from './ReceiptModal'
import type {
  ActiveSession,
  ClubTable,
  FrameRecord,
  MatchMode,
  Member,
  MenuItem,
  PaymentMode,
  SessionPlayer,
  Team,
} from '../types'

type Seat = { memberId: string | null; guestName: string; team: Team }

// ============================================================== Free table

function FreeCard({ table }: { table: ClubTable }) {
  const { data, mutate } = useClub()
  const toast = useToast()
  const members = useMemo(() => (data?.members ?? []).filter((m) => m.active), [data])
  const [mode, setMode] = useState<MatchMode>('solo')
  const [count, setCount] = useState(2)
  const [seats, setSeats] = useState<Seat[]>([])
  const [gloveSeats, setGloveSeats] = useState<number[]>([])
  const [advance, setAdvance] = useState('')
  const [notes, setNotes] = useState('')
  const [confirmStart, setConfirmStart] = useState(false)
  const [busy, setBusy] = useState(false)
  const glovePrice = table.rate.glovePrice ?? 0

  useEffect(() => {
    const n = mode === '2v2' ? Math.max(4, count) : count
    setSeats((prev) =>
      Array.from({ length: n }, (_, i) => {
        const old = prev[i]
        return {
          memberId: old?.memberId ?? null,
          guestName: old?.guestName ?? '',
          team: old?.team ?? (i < 2 ? 'A' : 'B'),
        }
      }),
    )
  }, [mode, count])

  const usedMembers = new Set(seats.map((s) => s.memberId).filter(Boolean) as string[])
  const rate = effectiveRate(table, seats.length || 2)
  const peakNow = peakWindowActive(table.rate)
  const seatLabel = (s: Seat, i: number) => {
    if (s.memberId) return members.find((m) => m.id === s.memberId)?.name || `Player ${i + 1}`
    return s.guestName.trim() || `Guest ${i + 1}`
  }
  const teamCount = (t: Team) => seats.filter((s) => s.team === t).length

  const toggleGloveSeat = (i: number) =>
    setGloveSeats((list) => (list.includes(i) ? list.filter((x) => x !== i) : [...list, i]))

  const start = () => {
    const memberIds = seats.map((seat) => seat.memberId).filter((id): id is string => Boolean(id))
    if (memberIds.length !== new Set(memberIds).size) {
      toast.error('The same member cannot occupy two seats — make one seat a guest')
      return
    }
    if (mode === '2v2' && (teamCount('A') === 0 || teamCount('B') === 0)) {
      toast.error('For 2v2, Team A and Team B must each have at least one player')
      return
    }
    setConfirmStart(true)
  }

  const beginStart = async () => {
    setConfirmStart(false)
    if (mode === '2v2' && (teamCount('A') === 0 || teamCount('B') === 0)) {
      toast.error('For 2v2, Team A and Team B must each have at least one player')
      return
    }
    setBusy(true)
    const players = seats.map((s, i) => ({
      label: seatLabel(s, i),
      type: s.memberId ? 'member' : 'guest',
      memberId: s.memberId || undefined,
      team: mode === '2v2' ? s.team : undefined,
    }))
    const r = await mutate(`sessions`, {
      body: {
        tableId: table.id,
        matchMode: mode,
        players,
        advancePaid: parseNum(advance),
        notes: notes.trim(),
        ...(glovePrice > 0 && gloveSeats.length > 0
          ? { gloveSeatIndexes: gloveSeats.filter((i) => i < seats.length) }
          : {}),
      },
      toast: `Session started · ${table.name}${gloveSeats.length > 0 ? ` · gloves out ×${gloveSeats.length}` : ''}`,
    })
    setBusy(false)
    if (r) {
      setSeats([])
      setGloveSeats([])
      setAdvance('')
      setNotes('')
    }
  }

  return (
    <Card className="table-card">
      <div className="tc-head">
        <div>
          <div className="tc-name">{table.name}</div>
          <div className="muted small">
            {formatCurrency(rate)}/hr · min {formatCurrency(table.rate.minCharge)}
            {table.rate.peakHourlyRate ? (
              peakNow
                ? <span className="money-gold"> · peak till {formatHour(table.rate.peakEndHour ?? 0)}</span>
                : <> · peak {formatCurrency(table.rate.peakHourlyRate)}/hr {formatHourRange(table.rate.peakStartHour ?? 0, table.rate.peakEndHour ?? 0)}</>
            ) : null}
            {glovePrice > 0 && <> · glove {formatCurrency(glovePrice)}</>}
          </div>
        </div>
        <div className="row" style={{ gap: 4 }}>
          {peakNow && <Badge kind="dark">peak rate</Badge>}
          <Badge kind="green">Free</Badge>
        </div>
      </div>

      <div className="tc-controls">
        <Seg
          ariaLabel="Match mode"
          value={mode}
          onChange={(v) => {
            const nextMode = v as MatchMode
            setMode(nextMode)
            if (nextMode === '2v2') setCount((current) => Math.max(4, current))
          }}
          options={[
            { value: 'solo', label: 'Solo' },
            { value: '2v2', label: '2v2' },
          ]}
        />
        {mode === 'solo' && (
          <Seg
            ariaLabel="Player count"
            value={String(count)}
            onChange={(v) => setCount(parseInt(v, 10))}
            options={Array.from({ length: 5 }, (_, i) => {
              const players = i + 2
              return { value: String(players), label: `${players}P` }
            })}
          />
        )}
      </div>

      <div className="seat-list">
        {seats.map((seat, i) => {
          const others = new Set([...usedMembers].filter((id) => id !== seat.memberId))
          return (
            <div className="seat-row" key={i}>
              <span className="seat-num">{mode === '2v2' ? seat.team : `P${i + 1}`}</span>
              <Select
                value={seat.memberId ?? ''}
                aria-label={`Player ${i + 1}`}
                style={{height:"32px"}}
                onChange={(e) =>
                  setSeats((list) =>
                    list.map((s, j) =>
                      j === i
                        ? { ...s, memberId: e.target.value || null, guestName: '' }
                        : s,
                    ),
                  )
                }
              >
                <option value="">Guest</option>
                {members.map((m) => (
                  <option

                    key={m.id}
                    value={m.id}
                    disabled={others.has(m.id)}
                    style={ m.dueAmount > 0 ? { color: 'var(--accent-red)', fontWeight: 700 , } : undefined}
                  >
                    {m.name}
                    {m.dueAmount > 0 ? ` (due ${formatCurrency(m.dueAmount)})` : ''}
                  </option>
                ))}
              </Select>
              {!seat.memberId && (
                <TextInput
                style={{height:"32px"}}
                  value={seat.guestName}
                  placeholder={`Guest ${i + 1}`}
                  aria-label={`Guest name ${i + 1}`}
                  onChange={(e) =>
                    setSeats((list) =>
                      list.map((s, j) => (j === i ? { ...s, guestName: e.target.value } : s)),
                    )
                  }
                />
              )}
              {mode === '2v2' && (
                <Seg
                  ariaLabel={`Team for player ${i + 1}`}
                  value={seat.team}
                  onChange={(v) =>
                    setSeats((list) => list.map((s, j) => (j === i ? { ...s, team: v as Team } : s)))
                  }
                  options={[
                    { value: 'A', label: 'A' },
                    { value: 'B', label: 'B' },
                  ]}
                />
              )}
            </div>
          )
        })}
      </div>
      {/* {seats.length < 8 && (
        <Btn size="sm" variant="ghost" onClick={() => setCount((current) => Math.min(8, Math.max(current, seats.length) + 1))}>
          <Plus size={12} /> Add seat
        </Btn>
      )} */}

      {/* glove assignment — price set per table in Settings */}
      {glovePrice > 0 && (
        <div className="stack-xs">
          <span className="field-label">
            Gloves · {formatCurrency(glovePrice)}/piece
            {/* — added to the frame bill if not returned */}
          </span>
          <div className="chip-row">
            {seats.map((s, i) => (
              <button
                key={i}
                type="button"
                className={`chip${gloveSeats.includes(i) ? ' glove' : ''}`}
                title={gloveSeats.includes(i) ? 'Glove assigned — tap to remove' : 'Assign a glove to this player'}
                onClick={() => toggleGloveSeat(i)}
              >
                <Hand size={9} /> {seatLabel(s, i)}
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="form-grid two">
        <Field label="Advance ₹ (optional)">
          <TextInput inputMode="decimal" style={{height:"32px"}} value={advance} onChange={(e) => setAdvance(e.target.value)} placeholder={String(data?.club.settings.defaultAdvance || 0)} />
        </Field>
        {/* <Field label="Note (optional)">
          <TextInput value={notes} onChange={(e) => setNotes(e.target.value)} maxLength={300} placeholder="e.g. league night" />
        </Field> */}
      </div>

      <Btn variant="green" style={{height:"32px"}} className="btn-block" loading={busy} onClick={start}>
        <Play size={13} /> Start Game · {formatCurrency(rate)}/hr
      </Btn>
      <Modal
        open={confirmStart}
        onClose={() => setConfirmStart(false)}
        title="Start timer?"
        width={360}
        footer={
          <>
            <Btn variant="ghost" onClick={() => setConfirmStart(false)}>Cancel</Btn>
            <Btn variant="green"  loading={busy} onClick={() => void beginStart()}><Play size={12} /> Start timer</Btn>
          </>
        }
      >
        <p className="muted small">
          Start {table.name} for {seats.map(seatLabel).join(', ')} at {formatCurrency(rate)}/hr?
          {parseNum(advance) > 0 ? ` Advance: ${formatCurrency(parseNum(advance))}.` : ''}
        </p>
      </Modal>
    </Card>
  )
}

// ========================================================== Occupied table

// ------------------------------------------------------- quick actions

function SessionItemsModal({ session, onClose }: { session: ActiveSession; onClose: () => void }) {
  const { data, mutate } = useClub()
  const menu = useMemo(() => (data?.menuItems ?? []).filter((item) => item.active), [data])
  const [quantities, setQuantities] = useState<Record<string, number>>(() =>
    Object.fromEntries((session.items ?? []).map((item) => [item.itemId, item.qty])),
  )
  const [busy, setBusy] = useState(false)
  const currentQty = (item: MenuItem) => session.items.find((line) => line.itemId === item.id)?.qty ?? 0

  const save = async () => {
    setBusy(true)
    const result = await mutate(`sessions/${session.id}/items`, {
      method: 'PUT',
      body: { items: menu.map((item) => ({ menuItemId: item.id, qty: quantities[item.id] ?? 0 })) },
      toast: 'Table items updated',
    })
    setBusy(false)
    if (result) onClose()
  }

  return (
    <Modal
      open
      onClose={onClose}
      title={`Table items · ${session.tableName ?? 'Session'}`}
      width={500}
      footer={
        <>
          <Btn variant="ghost" onClick={onClose}>Cancel</Btn>
          <Btn variant="green" loading={busy} onClick={() => void save()}>Save items</Btn>
        </>
      }
    >
      <p className="muted small">Set each quantity. Set it to 0 to remove; stock and final bill update when saved.</p>
      <div className="session-item-editor">
        {menu.map((item) => {
          const qty = quantities[item.id] ?? 0
          const maxQty = item.stockQty + currentQty(item)
          return (
            <div className="session-item-edit-row" key={item.id}>
              <span className="session-item-edit-name">
                <b className="session-item-edit-title">
                  <CategoryIcon icon={item.categoryIcon ?? defaultCategoryIcon(item.category ?? 'Cafe')} size={14} />
                  <span>{item.name}</span>
                </b>
                <span className="muted small">{formatCurrency(item.price)} · {maxQty} available</span>
              </span>
              <span className="qty-ctl">
                <button type="button" aria-label={`Remove one ${item.name}`} disabled={busy || qty <= 0} onClick={() => setQuantities((current) => ({ ...current, [item.id]: qty - 1 }))}>−</button>
                <b>{qty}</b>
                <button type="button" aria-label={`Add one ${item.name}`} disabled={busy || qty >= maxQty} onClick={() => setQuantities((current) => ({ ...current, [item.id]: qty + 1 }))}>+</button>
              </span>
            </div>
          )
        })}
        {menu.length === 0 && <EmptyState title="No active cafe items" hint="Add cafe items in Items to bill them to this table." />}
      </div>
    </Modal>
  )
}

function AdvanceModal({ session, table, onClose }: { session: ActiveSession; table: ClubTable; onClose: () => void }) {
  const { mutate } = useClub()
  const toast = useToast()
  const [amount, setAmount] = useState('')
  const [mode, setMode] = useState<'cash' | 'upi'>('cash')
  const [busy, setBusy] = useState(false)

  const save = async () => {
    const amt = parseNum(amount)
    if (amt <= 0) {
      toast.error('Enter a valid advance amount')
      return
    }
    setBusy(true)
    const r = await mutate(`sessions/${session.id}/advance`, {
      body: { amount: amt, mode },
      toast: `Advance collected · ${table.name} · ${formatCurrency(amt)} ${mode.toUpperCase()}`,
    })
    setBusy(false)
    if (r) onClose()
  }

  return (
    <Modal
      open
      onClose={onClose}
      title={`Advance · ${table.name}`}
      width={340}
      footer={
        <>
          <Btn variant="ghost" onClick={onClose}>Cancel</Btn>
          <Btn variant="green" loading={busy} disabled={parseNum(amount) <= 0} onClick={save}>Collect Advance</Btn>
        </>
      }
    >
      <p className="muted small">
        Already received <b className="money-green">{formatCurrency(session.advancePaid ?? 0)}</b> advance.
        A new advance joins today’s collection (day-close) instantly and adjusts on the final bill.
      </p>
      <div className="form-grid two advance-fields" style={{ marginTop: 8 }}>
        <Field label="Amount">
          <TextInput inputMode="decimal" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="100" autoFocus onKeyDown={(e) => e.key === 'Enter' && save()} />
        </Field>
        <Field label="Mode">
          <Seg
            value={mode}
            onChange={(v) => setMode(v as 'cash' | 'upi')}
            options={[
              { value: 'cash', label: 'Cash' },
              { value: 'upi', label: 'UPI' },
            ]}
          />
        </Field>
      </div>
    </Modal>
  )
}

function NoteModal({ session, table, onClose }: { session: ActiveSession; table: ClubTable; onClose: () => void }) {
  const { mutate } = useClub()
  const [notes, setNotes] = useState(session.notes ?? '')
  const [busy, setBusy] = useState(false)

  const save = async () => {
    setBusy(true)
    const r = await mutate(`sessions/${session.id}`, {
      method: 'PATCH',
      body: { notes },
      toast: `Session note saved · ${table.name}`,
    })
    setBusy(false)
    if (r) onClose()
  }

  return (
    <Modal
      open
      onClose={onClose}
      title={`Note · ${table.name}`}
      width={340}
      footer={
        <>
          <Btn variant="ghost" onClick={onClose}>Cancel</Btn>
          <Btn variant="green" loading={busy} onClick={save}>Save Note</Btn>
        </>
      }
    >
      <p className="muted small">A VIP request, a reserved item, or any note — it rides along until the final bill.</p>
      <div className="form-grid" style={{ marginTop: 8 }}>
        <TextArea value={notes} onChange={(e) => setNotes(e.target.value)} maxLength={300} placeholder="e.g. Paneer tikka order at 8pm, VIP members" autoFocus />
      </div>
    </Modal>
  )
}

function MoveModal({ session, table, onClose }: { session: ActiveSession; table: ClubTable; onClose: () => void }) {
  const { data, mutate } = useClub()
  const toast = useToast()
  const [targetId, setTargetId] = useState('')
  const [busy, setBusy] = useState(false)
  const busyTables = new Set((data?.sessions ?? []).map((s) => s.tableId))
  const freeTables = (data?.tables ?? []).filter((t) => t.active && t.id !== table.id && !busyTables.has(t.id))

  const save = async () => {
    if (!targetId) {
      toast.error('Pick the new table first')
      return
    }
    setBusy(true)
    const r = await mutate(`sessions/${session.id}/move`, {
      body: { tableId: targetId },
      toast: `Session moved · ${data?.tables.find((t) => t.id === targetId)?.name ?? 'new table'}`,
    })
    setBusy(false)
    if (r) onClose()
  }

  return (
    <Modal
      open
      onClose={onClose}
      title={`Move Session · ${table.name}`}
      width={340}
      footer={
        <>
          <Btn variant="ghost" onClick={onClose}>Cancel</Btn>
          <Btn variant="green" loading={busy} disabled={!targetId} onClick={save}>Move Here</Btn>
        </>
      }
    >
      <p className="muted small">
        The timer keeps running from the original start — only the table changes. The new table’s rate applies.
      </p>
      <div className="form-grid" style={{ marginTop: 8 }}>
        <Field label="Move to (free tables)">
          {freeTables.length === 0 ? (
            <p className="muted small">No table is free right now.</p>
          ) : (
            <Select value={targetId} onChange={(e) => setTargetId(e.target.value)} autoFocus>
              <option value="">Select table…</option>
              {freeTables.map((t) => (
                <option key={t.id} value={t.id}>{t.name} · {formatCurrency(t.rate.hourlyRate)}/hr</option>
              ))}
            </Select>
          )}
        </Field>
      </div>
    </Modal>
  )
}

function OccupiedCard({ table, session }: { table: ClubTable; session: ActiveSession }) {
  const { data, mutate } = useClub()
  const toast = useToast()
  const menu = useMemo(() => (data?.menuItems ?? []).filter((m) => m.active), [data])
  const [now, setNow] = useState(() => Date.now())
  const [busy, setBusy] = useState(false)
  const [itemBusy, setItemBusy] = useState<string | null>(null)
  const [itemsOpen, setItemsOpen] = useState(false)
  const [qaModal, setQaModal] = useState<'advance' | 'note' | 'move' | null>(null)
  const [playerModal, setPlayerModal] = useState(false)
  const [playerMemberId, setPlayerMemberId] = useState('')
  const [guestName, setGuestName] = useState('')
  const [playerTeam, setPlayerTeam] = useState<Team>('A')
  const [playerSaving, setPlayerSaving] = useState(false)
  const members = useMemo(() => (data?.members ?? []).filter((m) => m.active), [data])
  const availableMembers = members.filter((m) => !session.players.some((p) => p.memberId === m.id))

  useEffect(() => {
    const t = window.setInterval(() => setNow(Date.now()), 1000)
    return () => window.clearInterval(t)
  }, [])

  const elapsedSec = Math.max(0, (now - new Date(session.startedAt).getTime()) / 1000)
  const stoppedAt = new Date(now).toISOString()
  const est = calcTableAmount(session.startedAt, stoppedAt, session.hourlyRate, session.minCharge)

  const stop = async () => {
    setBusy(true)
    await mutate(`sessions/${session.id}/stop`, { toast: `Session stopped · ${table.name}` })
    setBusy(false)
  }

  const addItem = async (itemId: string) => {
    setItemBusy(itemId)
    await mutate(`sessions/${session.id}/items`, {
      body: { items: [{ itemId, qty: 1 }] },
      toast: 'Item added to session',
    })
    setItemBusy(null)
  }

  const addPlayer = async () => {
    const guest = guestName.trim()
    let selected = members.find((m) => m.id === playerMemberId)
    if (!selected && guest) {
      const existing = members.find((m) => m.name.trim().toLowerCase() === guest.toLowerCase())
      if (existing && session.players.some((player) => player.memberId === existing.id)) {
        toast.error('This player is already in the session')
        return
      }
      selected = existing
      if (!selected) {
        setPlayerSaving(true)
        selected = await mutate<Member>('members', {
          body: { name: guest },
          toast: `Guest added to Players · ${guest}`,
        }) ?? undefined
        if (!selected) {
          setPlayerSaving(false)
          return
        }
        setPlayerMemberId(selected.id)
        setGuestName('')
      }
    }
    const label = selected?.name || guest
    if (!label) return
    setPlayerSaving(true)
    const result = await mutate(`sessions/${session.id}/players`, {
      body: {
        label,
        type: selected ? 'member' : 'guest',
        ...(selected ? { memberId: selected.id } : {}),
        ...(session.matchMode === '2v2' ? { team: playerTeam } : {}),
      },
      toast: `Player added · ${label}`,
    })
    setPlayerSaving(false)
    if (result) {
      setPlayerModal(false)
      setPlayerMemberId('')
      setGuestName('')
    }
  }

  const attached = session.items ?? []
  const attachedTotal = attached.reduce((s, l) => s + (l.amount ?? 0), 0)

  return (
    <Card className="table-card occupied">
      <div className="tc-head">
        <div>
          <div className="tc-name">{table.name}</div>
          <div className="muted small">
            {formatCurrency(session.hourlyRate)}/hr{session.matchMode === '2v2' ? ' · 2v2' : ''}
          </div>
        </div>
        <div className="row" style={{ gap: 4 }}>
          {session.peak && <Badge kind="dark">peak rate</Badge>}
          <Badge kind="gold">Occupied</Badge>
        </div>
      </div>
      <div className="tc-timer">
        <span className="timer">{formatClock(elapsedSec)}</span>
        <span className="tc-est">
          ≈ {formatCurrency(est.amount)} <span className="muted small">so far · {est.minutes}m running</span>
        </span>
      </div>
      <PlayerChips players={session.players} matchMode={session.matchMode} />
      <GloveChips session={session} />
      {(session.advancePaid ?? 0) > 0 && (
        <p className="small money-green qa-hint"><Banknote size={11} /> Advance received {formatCurrency(session.advancePaid)} — will adjust on the bill</p>
      )}
      {session.notes && (
        <p className="muted small qa-hint"><StickyNote size={11} /> {session.notes}</p>
      )}

      {/* mid-session items — tap to add while the timer runs */}
      {menu.length > 0 && (
        <div className="chip-row item-chips sm">
          {menu.slice(0, 10).map((m) => (
            <button
              key={m.id}
              type="button"
              className="item-chip sm"
              disabled={m.stockQty <= 0 || itemBusy !== null}
              title={m.stockQty <= 0 ? 'Out of stock' : `${m.stockQty} in stock · add 1 to this session`}
              onClick={() => void addItem(m.id)}
            >
              <CategoryIcon icon={m.categoryIcon ?? defaultCategoryIcon(m.category ?? 'Cafe')} size={12} />
              <span className="item-chip-name">{m.name}</span>
              <span className="money-gold">{formatCurrency(m.price)}</span>
            </button>
          ))}
          {menu.length > 10 && (
            <Btn size="sm" variant="ghost" onClick={() => setItemsOpen(true)}>All items · {menu.length}</Btn>
          )}
        </div>
      )}
      {attached.length > 0 && (
        <div className="session-items">
          <div className="session-item-list">
            {attached.map((item) => (
              <div key={item.itemId} className="session-item-line">
                <span>{item.name} ×{item.qty}</span>
                <b className="money-gold">{formatCurrency(item.amount)}</b>
              </div>
            ))}
          </div>
          <p className="muted small">Items on this table · {formatCurrency(attachedTotal)} — added on the final bill automatically.</p>
        </div>
      )}

      <div className="qa-row">
        <Btn size="sm" variant="ghost" onClick={() => setItemsOpen(true)} title="Add or edit cafe items for this table">
          <Plus size={12} /> Cafe Items
        </Btn>
        <Btn size="sm" variant="ghost" onClick={() => setPlayerModal(true)} title="Add player">
          <UserPlus size={12} /> Player
        </Btn>
        <Btn size="sm" variant="ghost" onClick={() => setQaModal('advance')} title="Collect advance">
          <Banknote size={12} /> Advance
        </Btn>
        <Btn size="sm" variant="ghost" onClick={() => setQaModal('note')} title="Session note">
          <StickyNote size={12} /> Note
        </Btn>
      </div>

      <div className="session-action-row">
        <Btn size="sm" variant="ghost" style={{height:"32px"}} onClick={() => setQaModal('move')} title="Move to another table">
          <ArrowRightLeft size={12} /> Move
        </Btn>
        <Btn variant="red" size="sm" style={{height:"32px"}} className="btn-block" loading={busy} onClick={stop}>
          <Square size={12} /> Stop &amp; Final Bill
        </Btn>
      </div>

      {qaModal === 'advance' && <AdvanceModal session={session} table={table} onClose={() => setQaModal(null)} />}
      {qaModal === 'note' && <NoteModal session={session} table={table} onClose={() => setQaModal(null)} />}
      {qaModal === 'move' && <MoveModal session={session} table={table} onClose={() => setQaModal(null)} />}
      {itemsOpen && <SessionItemsModal session={session} onClose={() => setItemsOpen(false)} />}
      <Modal
        open={playerModal}
        onClose={() => setPlayerModal(false)}
        title={`Add player · ${table.name}`}
        width={440}
        footer={
          <>
            <Btn variant="ghost" onClick={() => setPlayerModal(false)}>Cancel</Btn>
            <Btn variant="green" loading={playerSaving} disabled={!playerMemberId && !guestName.trim()} onClick={() => void addPlayer()}>
              <UserPlus size={13} /> Add player
            </Btn>
          </>
        }
      >
        <div className="add-player-form">
          <Field label="Select a member">
            <Select
              value={playerMemberId}
              onChange={(e) => {
                setPlayerMemberId(e.target.value)
                if (e.target.value) setGuestName('')
              }}
              autoFocus
            >
              <option value="">Choose a member…</option>
              {availableMembers.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.name}{m.dueAmount > 0 ? ` · due ${formatCurrency(m.dueAmount)}` : ''}
                </option>
              ))}
            </Select>
            {availableMembers.length === 0 && <span className="muted small">All active members are already in this session.</span>}
          </Field>
          <div className="add-player-divider"><span>OR</span></div>
          <Field label="Guest name">
            <TextInput
              value={guestName}
              onChange={(e) => {
                setGuestName(e.target.value)
                if (e.target.value) setPlayerMemberId('')
              }}
              placeholder="Enter guest name"
              aria-label="Guest name"
              maxLength={80}
            />
            <span className="field-hint">New names are saved to Players for next time.</span>
          </Field>
        </div>
        {session.matchMode === '2v2' && <Seg ariaLabel="Team" value={playerTeam} onChange={(v) => setPlayerTeam(v as Team)} options={[{ value: 'A', label: 'Team A' }, { value: 'B', label: 'Team B' }]} />}
      </Modal>
    </Card>
  )
}

/** Glove chips — gold = still out (will be charged), green = returned. Tap to toggle. */
function GloveChips({ session }: { session: ActiveSession }) {
  const { mutate } = useClub()
  const gloves = session.gloves ?? []
  if (gloves.length === 0) return null

  const toggle = (playerId: string, returned: boolean, label: string) =>
    void mutate(`sessions/${session.id}/gloves/return`, {
      body: { playerId, returned },
      toast: returned
        ? `Glove returned · ${label} — no charge`
        : `Glove back out · ${label} — charged to the bill if not returned`,
    })

  return (
    <div className="stack-xs">
      <span className="field-label">Gloves — tap when returned</span>
      <div className="chip-row">
        {gloves.map((g) => (
          <button
            key={g.playerId}
            type="button"
            className={`chip glove${g.returned ? ' returned' : ''}`}
            title={g.returned ? 'Returned — no charge' : `Out — ${formatCurrency(g.price)} charged if not returned by billing`}
            onClick={() => toggle(g.playerId, !g.returned, g.label)}
          >
            <Hand size={9} /> {g.label} · {g.returned ? 'returned' : formatCurrency(g.price)}
          </button>
        ))}
      </div>
    </div>
  )
}

function PlayerChips({ players, matchMode }: { players: SessionPlayer[]; matchMode: MatchMode }) {
  return (
    <div className="chip-row">
      {players.map((p) => (
        <span key={p.id} className={`chip${matchMode === '2v2' ? ` team-${p.team}` : ''}`}>
          {matchMode === '2v2' ? `${p.team} · ` : ''}
          {p.label}
        </span>
      ))}
    </div>
  )
}

// ========================================================== Final bill

interface Estimate {
  tableAmount: number
  minutes: number
  itemsTotal: number
  itemLines: number
  gloveCharges: number
  gloveMissing: number
  bonus: number
  manualDiscount: number
  membershipDiscount: number
  membershipPct: number
  membershipName: string | null
  passCredit: number
  passName: string | null
  passMemberIds: string[]
  passFramesLeft: number | null
  passMessage: string | null
  frameAmount: number
  oldDue: number
  total: number
  walletCover: number
  walletBy: Array<{ name: string; amount: number }>
  losers: SessionPlayer[]
  losingMembers: Member[]
}

function estimateBill(
  session: ActiveSession,
  losers: SessionPlayer[],
  memberById: Map<string, Member>,
  qty: Record<string, number>,
  menu: MenuItem[],
  discountIn: number,
  settings: { winnerBonus: number; monthlyTableDiscount: number },
  usePass: boolean,
): Estimate {
  const { amount: tableAmount, minutes } = calcTableAmount(
    session.startedAt,
    session.endedAt!,
    session.hourlyRate,
    session.minCharge,
  )
  const items = menu.filter((m) => (qty[m.id] ?? 0) > 0)
  const attachedItems = session.items ?? []
  const attachedTotal = attachedItems.reduce((s, l) => s + (l.amount ?? 0), 0)
  const attachedQty = new Map(attachedItems.map((item) => [item.itemId, item.qty]))
  const itemsTotal = attachedTotal + items.reduce(
    (s, m) => s + Math.max(0, (qty[m.id] ?? 0) - (attachedQty.get(m.id) ?? 0)) * m.price,
    0,
  )
  const bonus = settings.winnerBonus || 0
  const losingMembers = losers
    .map((p) => (p.memberId ? memberById.get(p.memberId) : undefined))
    .filter((m): m is Member => Boolean(m))

  const { pct, name } = maxPayingDiscount(losingMembers, settings.monthlyTableDiscount || 0)
  const membershipDiscount = Math.round(((tableAmount * pct) / 100) * 100) / 100
  const manualDiscount = Math.min(discountIn, tableAmount + itemsTotal + bonus)
  // Unreturned gloves join the frame money AFTER all discounts (backend rules).
  const glovesOut = (session.gloves ?? []).filter((g) => !g.returned)
  const gloveCharges = Math.round(glovesOut.reduce((s, g) => s + (g.price || 0), 0) * 100) / 100
  const passCandidates = losers.map((player) => {
    if (player.memberId) return memberById.get(player.memberId)
    const playerName = player.label.trim().toLocaleLowerCase()
    const matches = [...memberById.values()].filter(
      (member) => member.name.trim().toLocaleLowerCase() === playerName,
    )
    return matches.length === 1 ? matches[0] : undefined
  }).filter((member): member is Member => Boolean(member))
  const passMembers = passCandidates.filter(
    (m, index, all) =>
      (m.passFramesLeft ?? 0) > 0 &&
      planValid(m.planExpiresAt) &&
      m.dueAmount <= 0 &&
      all.findIndex((candidate) => candidate.id === m.id) === index,
  )
  const passMemberIds = passMembers.map((m) => m.id)
  const passName = passMembers.length ? passMembers.map((m) => m.name).join(', ') : null
  const passFramesLeft = passMembers[0]?.passFramesLeft ?? null
  const exhaustedPassMembers = passCandidates.filter((m, index, all) =>
    m.planType === 'pass' && (m.passFramesLeft ?? 0) < 1 &&
    all.findIndex((candidate) => candidate.id === m.id) === index,
  )
  const passMessage = (() => {
    if (exhaustedPassMembers.length) {
      const action = passMembers.length ? 'unka bill doosre mode se pay hoga.' : 'doosra payment mode choose karein.'
      return `${exhaustedPassMembers.map((m) => m.name).join(', ')} ke frame pass khatam ho gaye; ${action}`
    }
    if (passMembers.length) return null
    const blockedByDue = passCandidates.filter((m) => (m.passFramesLeft ?? 0) > 0 && m.dueAmount > 0)
    if (blockedByDue.length) {
      return `${blockedByDue.map((m) => m.name).join(', ')} par pending due hai; pass use karne se pehle due clear karein.`
    }
    return 'Kisi payer ke paas active frame pass nahi hai. Doosra payment mode choose karein.'
  })()
  const passEligibleShare = losers.length
    ? Math.max(0, (tableAmount + itemsTotal + bonus - manualDiscount - membershipDiscount + gloveCharges) / losers.length)
    : 0
  const passCredit = usePass
    ? Math.round(passMembers.reduce((sum) => sum + Math.min(session.hourlyRate, passEligibleShare), 0) * 100) / 100
    : 0
  const frameAmount =
    Math.max(
      0,
      Math.round((tableAmount + itemsTotal + bonus - manualDiscount - membershipDiscount) * 100) / 100,
    ) + gloveCharges
  const oldDue = losingMembers.reduce((s, m) => s + (m.dueAmount || 0), 0)
  const total = frameAmount + oldDue
  const share = losers.length ? frameAmount / losers.length : 0
  const walletBy = losingMembers
    .map((m) => ({
      name: m.name,
      amount: Math.min(
        m.walletBalance || 0,
        Math.max(0, share - (passMembers.some((passMember) => passMember.id === m.id)
          ? Math.min(session.hourlyRate, passEligibleShare)
          : 0)),
      ),
    }))
    .filter((w) => w.amount > 0)
  const walletCover = walletBy.reduce((s, w) => s + w.amount, 0)
  const itemLines = new Set([...attachedItems.map((item) => item.itemId), ...items.map((item) => item.id)]).size

  return {
    tableAmount, minutes, itemsTotal, itemLines, gloveCharges, gloveMissing: glovesOut.length, bonus, manualDiscount,
    membershipDiscount, membershipPct: pct, membershipName: name,
    passCredit, passName, passMemberIds, passFramesLeft, passMessage, frameAmount, oldDue, total,
    walletCover, walletBy, losers, losingMembers,
  }
}

function FinalBillCard({ table, session, onConfirmed }: { table: ClubTable; session: ActiveSession; onConfirmed?: (frame: FrameRecord) => void }) {
  const { data, stats, mutate } = useClub()
  const toast = useToast()
  const members = data?.members ?? []
  const menu = (data?.menuItems ?? []).filter((m) => m.active)
  const settings = data?.club.settings
  const memberById = useMemo(() => new Map(members.map((m) => [m.id, m])), [members])

  const [split, setSplit] = useState(false)
  const [payers, setPayers] = useState<string[]>([])
  const [teamPick, setTeamPick] = useState<Team | null>(null)
  const [qty, setQty] = useState<Record<string, number>>(() =>
    Object.fromEntries((session.items ?? []).map((item) => [item.itemId, item.qty])),
  )
  const [discount, setDiscount] = useState('0')
  const [mode, setMode] = useState<PaymentMode | 'pass' | null>(null)
  const [paid, setPaid] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [editingGuest, setEditingGuest] = useState<SessionPlayer | null>(null)
  const [guestName, setGuestName] = useState('')
  const [guestSaving, setGuestSaving] = useState(false)

  const is2v2 = session.matchMode === '2v2'
  const losers = useMemo(() => {
    if (split) return session.players
    if (is2v2) return teamPick ? session.players.filter((p) => p.team !== teamPick) : []
    return session.players.filter((p) => payers.includes(p.id))
  }, [split, is2v2, teamPick, payers, session.players])
  const validSides = split || (is2v2 ? teamPick !== null : payers.length > 0)

  const est = useMemo(
    () =>
      estimateBill(
        session,
        validSides ? losers : [],
        memberById,
        qty,
        menu,
        parseNum(discount),
        { winnerBonus: settings?.winnerBonus ?? 0, monthlyTableDiscount: settings?.monthlyTableDiscount ?? 0 },
        mode === 'pass' || mode === null,
      ),
    [session, losers, validSides, memberById, qty, menu, discount, settings, mode],
  )

  // Prefer a frame pass for an eligible payer, then wallet, until the cashier chooses a mode.
  const fallbackMode: PaymentMode | 'pass' = est.passMemberIds.length
    ? 'pass'
    : est.losingMembers.some((m) => (m.walletBalance ?? 0) > 0) ? 'wallet' : 'cash'
  const autoMode: PaymentMode | 'pass' = mode ?? fallbackMode
  const isDue = autoMode === 'due'
  const isPass = autoMode === 'pass'
  const advance = session.advancePaid ?? 0 // already collected mid-session; offsets the bill
  const defaultPaid = isDue || autoMode === 'wallet' || isPass ? 0 : Math.max(0, Math.round((est.total - est.walletCover - advance) * 100) / 100)
  const paidNum = isDue || isPass ? 0 : paid === null ? defaultPaid : Math.max(0, parseNum(paid))

  const walletUsed = isDue ? 0 : est.walletCover
  const passPaid = isPass ? est.passCredit : 0
  const estDueLeft = Math.max(0, Math.round((est.total - walletUsed - passPaid - advance - paidNum) * 100) / 100)
  const overLimit =
    estDueLeft > 0 &&
    (stats?.dueLimit ?? 0) > 0 &&
    (stats?.totalDue ?? 0) + estDueLeft > (stats?.dueLimit ?? 0)

  const pickTeam = (t: Team) => {
    setTeamPick((cur) => (cur === t ? null : t))
  }
  const togglePayer = (id: string) => {
    if (split) {
      setSplit(false)
      setPayers([id])
      return
    }
    setPayers((list) => (list.includes(id) ? list.filter((x) => x !== id) : [...list, id]))
  }
  const toggleSplit = () => {
    setSplit((current) => !current)
    setPayers([])
    setTeamPick(null)
  }
  const editGuest = (player: SessionPlayer) => {
    setEditingGuest(player)
    setGuestName(player.label)
  }
  const saveGuest = async () => {
    const name = guestName.trim()
    if (!editingGuest || !name) {
      toast.error('Enter a guest name')
      return
    }
    setGuestSaving(true)
    let member = members.find((candidate) => candidate.name.trim().toLowerCase() === name.toLowerCase())
    if (member && session.players.some((player) => player.id !== editingGuest.id && player.memberId === member?.id)) {
      toast.error('This player is already in the session')
      setGuestSaving(false)
      return
    }
    if (member?.active === false) {
      member = await mutate<Member>(`members/${member.id}`, {
        method: 'PATCH',
        body: { name, active: true },
        toast: `Player activated · ${name}`,
      }) ?? undefined
      if (!member) {
        setGuestSaving(false)
        return
      }
    }
    if (!member) {
      member = await mutate<Member>('members', {
        body: { name },
        toast: `Guest added to Players · ${name}`,
      }) ?? undefined
      if (!member) {
        setGuestSaving(false)
        return
      }
    }
    const result = await mutate(`sessions/${session.id}`, {
      method: 'PATCH',
      body: {
        players: [{
          pid: editingGuest.pid ?? editingGuest.id,
          label: name,
          type: 'member',
          memberId: member.id,
        }],
      },
      toast: `Guest saved to Players · ${name}`,
    })
    setGuestSaving(false)
    if (result) setEditingGuest(null)
  }
  const bumpQty = (itemId: string, delta: number) => {
    setQty((q) => {
      const attachedQty = (session.items ?? []).find((item) => item.itemId === itemId)?.qty ?? 0
      const maxQty = (menu.find((item) => item.id === itemId)?.stockQty ?? 0) + attachedQty
      const next = Math.min(maxQty, Math.max(attachedQty, (q[itemId] ?? attachedQty) + delta))
      return { ...q, [itemId]: next }
    })
  }

  const confirm = async () => {
    if (!validSides) {
      toast.error(is2v2 ? 'Select the winning team first' : 'Select at least one winner and one payer')
      return
    }
    setBusy(true)
    const body: Record<string, unknown> = {
      items: Object.entries(qty)
        .map(([itemId, q]) => {
          const attachedQty = (session.items ?? []).find((item) => item.itemId === itemId)?.qty ?? 0
          return { itemId, qty: Math.max(0, q - attachedQty) }
        })
        .filter((item) => item.qty > 0),
      discount: parseNum(discount),
      paymentMode: autoMode,
      paidAmount: paidNum,
      split,
      usePass: autoMode === 'pass' ? est.passMemberIds : [],
    }
    if (is2v2 && !split) body.winningTeam = teamPick
    else if (!is2v2) {
      body.winnerPlayerIds = split
        ? []
        : session.players.filter((player) => !payers.includes(player.id)).map((player) => player.id)
    }
    const r = await mutate(`sessions/${session.id}/confirm`, {
      body,
      toast: `Frame bill confirmed · ${table.name}`,
    })
    setBusy(false)
    if (!r) return
    onConfirmed?.(r as FrameRecord)
  }

  const resume = async () => {
    await mutate(`sessions/${session.id}/resume`, { toast: `Session resumed · ${table.name}` })
  }

  const teamOf = (t: Team) => session.players.filter((p) => p.team === t)
  const attachedQty = (itemId: string) => (session.items ?? []).find((item) => item.itemId === itemId)?.qty ?? 0
  const selectedItems = menu.filter((m) => (qty[m.id] ?? 0) > 0)
  const splitShare = (index: number) => {
    const count = session.players.length
    if (!count) return 0
    const totalCents = Math.round(est.total * 100)
    const baseCents = Math.floor(totalCents / count)
    return (baseCents + (index < totalCents % count ? 1 : 0)) / 100
  }

  return (
    <Card className="table-card final">
      <div className="tc-head">
        <div>
          <div className="tc-name">{table.name}</div>
          <div className="muted small">
            Stopped · {formatDuration(est.minutes)}
            {session.matchMode === '2v2' ? ' · 2v2' : ''}
          </div>
        </div>
        <div className="row" style={{ gap: 6 }}>
          <Badge kind="gold">Final Bill</Badge>
        </div>
      </div>
      <div className="split-mode-row">
        <span className={split ? 'money-green' : 'muted'}>
          {split
            ? `Split equally · about ${formatCurrency(splitShare(0))} each`
            : is2v2
              ? teamPick ? `Team ${teamPick} wins · Team ${teamPick === 'A' ? 'B' : 'A'} pays` : 'Select the winning team'
              : payers.length > 0
                ? `Payers: ${session.players.filter((player) => payers.includes(player.id)).map((player) => player.label).join(', ')}`
                : 'Choose who pays'}
        </span>
        <Btn
          size="sm"
          variant={split ? 'green' : 'ghost'}
          aria-pressed={split}
          onClick={toggleSplit}
          style={{ height:24 }}
        >
          Split
        </Btn>
      </div>
      {/* winner / team selection */}
      {split ? (
        <div className="split-share-list" aria-label="Estimated amount per player">
          {session.players.map((player, index) => (
            <div className="split-share-chip" key={player.id}>
              <span>{player.label}</span>
              <b>{formatCurrency(splitShare(index))}</b>
            </div>
          ))}
        </div>
      ) : is2v2 ? (
        <div className="team-pick">
          {(['A', 'B'] as Team[]).map((t) => (
            <button
              key={t}
              type="button"
              className={`team-btn${teamPick === t ? ' active' : ''}`}
              onClick={() => pickTeam(t)}
            >
              <span className="team-title">Team {t}</span>
              <span className="team-names">
                {teamOf(t).map((p, i) => (
                  <span key={p.id} className={p.memberId && (memberById.get(p.memberId)?.dueAmount ?? 0) > 0 ? 'money-red' : ''}>
                    {i > 0 ? ' · ' : ''}{p.label}
                  </span>
                ))}
              </span>
              <span className={`team-role ${teamPick === t ? 'money-green' : 'money-red'}`}>
                {teamPick === t ? 'Winner' : 'Pays'}
              </span>
            </button>
          ))}
        </div>
      ) : (
        <div className="winner-pick">
          {session.players.map((p) => {
            const payer = payers.includes(p.id)
            const guest = p.type !== 'member' && !p.memberId
            return (
              <div className={`win-chip-wrap${guest ? ' has-guest-edit' : ''}`} key={p.id}>
                <button
                  type="button"
                  className={`win-chip${!payer && payers.length > 0 ? ' win' : ''}`}
                  onClick={() => togglePayer(p.id)}
                  title={payer ? 'Payer' : 'Winner'}
                >
                  <span className={p.memberId && (memberById.get(p.memberId)?.dueAmount ?? 0) > 0 ? 'money-red' : ''}>{p.label}</span>
                  <span className={!payer && payers.length > 0 ? 'money-green' : payer ? 'money-red' : 'muted'}>
                    {payers.length === 0 ? 'Tap to set payer' : payer ? 'Pays' : 'Winner'}
                  </span>
                </button>
                {guest && (
                  <button
                    type="button"
                    className="btn-icon guest-edit-btn"
                    title={`Save ${p.label} to Players`}
                    aria-label={`Edit guest name ${p.label}`}
                    onClick={() => editGuest(p)}
                  >
                    <Pencil size={12} />
                  </button>
                )}
              </div>
            )
          })}
        </div>
      )}
      <Modal
        open={editingGuest !== null}
        onClose={() => { if (!guestSaving) setEditingGuest(null) }}
        title="Add guest to Players"
        width={360}
        footer={
          <>
            <Btn variant="ghost" disabled={guestSaving} onClick={() => setEditingGuest(null)}>Cancel</Btn>
            <Btn variant="green" loading={guestSaving} disabled={!guestName.trim()} onClick={() => void saveGuest()}>
              Save name
            </Btn>
          </>
        }
      >
        <Field label="Guest name" hint="This guest will be saved in Players and linked to this bill.">
          <TextInput
            value={guestName}
            maxLength={80}
            autoFocus
            onChange={(event) => setGuestName(event.target.value)}
            onKeyDown={(event) => { if (event.key === 'Enter') void saveGuest() }}
            placeholder="Enter player name"
          />
        </Field>
      </Modal>

      {/* gloves — return them here before confirming to drop their charge */}
      <GloveChips session={session} />
      {est.gloveCharges > 0 && (
        <p className="small warn-text" style={{ margin: '2px 0 0' }}>
          <Hand size={10} /> {est.gloveMissing} glove{est.gloveMissing === 1 ? '' : 's'} × {formatCurrency(est.gloveCharges)} is joining the frame bill — tap above once returned.
        </p>
      )}

      {/* items */}
      {menu.length > 0 && (
        <div className="chip-row item-chips">
          {menu.map((m) => (
            <button
              key={m.id}
              type="button"
              className={`item-chip${(qty[m.id] ?? 0) > 0 ? ' has-qty' : ''}${(qty[m.id] ?? 0) >= m.stockQty + attachedQty(m.id) ? ' out-of-stock' : ''}`}
              disabled={(qty[m.id] ?? 0) >= m.stockQty + attachedQty(m.id)}
              title={(qty[m.id] ?? 0) >= m.stockQty + attachedQty(m.id) ? 'Out of stock' : `${m.stockQty} in stock`}
              onClick={() => bumpQty(m.id, 1)}
            >
              <CategoryIcon icon={m.categoryIcon ?? defaultCategoryIcon(m.category ?? 'Cafe')} size={14} />
              <span className="item-chip-name">{m.name}</span>
              <span className="money-gold">{formatCurrency(m.price)}</span>
              {(qty[m.id] ?? 0) > 0 && <span className="qty-badge">{qty[m.id]}</span>}
            </button>
          ))}
        </div>
      )}
      {selectedItems.length > 0 && (
        <div className="sel-items">
          {selectedItems.map((m) => (
            <div className="sel-item" key={m.id}>
              <span className="sel-item-name">
                <CategoryIcon icon={m.categoryIcon ?? defaultCategoryIcon(m.category ?? 'Cafe')} size={14} />
                <span>{m.name}</span>
              </span>
              <span className="qty-ctl">
                <div aria-label="Decrease" style={{ display: 'flex', alignItems: 'center' }} onClick={() => bumpQty(m.id, -1)}><Minus size={14} color="var(--text)" /></div>
                <b>{qty[m.id]}</b>
                <div aria-label="Increase" style={{ display: 'flex', alignItems: 'center' }} onClick={() => bumpQty(m.id, 1)}><Plus size={14} color="var(--text)" /></div>
              </span>
              <span className="money-gold small">{formatCurrency((qty[m.id] ?? 0) * m.price)}</span>
            </div>
          ))}
        </div>
      )}

      {/* money controls */}
      <div className="bill-controls">
        <label className="field">
          <span className="field-label">Discount</span>
          <TextInput style={{height:"32px"}} inputMode="decimal" value={discount} onChange={(e) => setDiscount(e.target.value)} />
        </label>
        <label className="field">
          <span className="field-label">{isPass ? 'Paid · Pass' : isDue ? 'Paid (locked)' : 'Paid'}</span>
          <TextInput
          style={{height:"32px"}}
            inputMode="decimal"
            value={isPass ? String(est.passCredit) : isDue ? '0' : paid === null ? String(defaultPaid) : paid}
            disabled={isDue || isPass}
            onChange={(e) => setPaid(e.target.value)}
          />
        </label>
        <label className="field bill-mode-field">
          <span className="field-label">Payment Mode</span>
          <Seg
            ariaLabel="Payment mode"
            value={autoMode}
            onChange={(value) => { setMode(value); setPaid(null) }}
            options={[
              { value: 'cash' as PaymentMode, label: 'Cash' },
              { value: 'upi' as PaymentMode, label: 'UPI' },
              { value: 'wallet' as PaymentMode, label: 'Wallet' },
              { value: 'pass' as const, label: 'Pass' },
              { value: 'due' as PaymentMode, label: 'Due' },
            ]}
          />
        </label>
      </div>
      {walletUsed > 0 && (
        <p className="small money-gold">
          Wallet auto-applies first: -{formatCurrency(walletUsed)}
          {est.walletBy.length > 0 && (
            <span className="muted"> ({est.walletBy.map((w) => `${w.name} -${formatCurrency(w.amount)}`).join(', ')})</span>
          )}
        </p>
      )}
      {est.passMessage && (isPass || est.passMessage.includes('frame pass khatam ho gaye')) && (
        <p className="small warn-text" role="status">{est.passMessage}</p>
      )}

      {/* bill rows */}
      <div className="bill-rows">
        <div className="bill-row"><span>Table · {formatDuration(est.minutes)}</span><b>{formatCurrency(est.tableAmount)}</b></div>
        {est.itemsTotal > 0 && <div className="bill-row"><span>Items ({est.itemLines})</span><b>{formatCurrency(est.itemsTotal)}</b></div>}
        {est.gloveCharges > 0 && <div className="bill-row"><span>Gloves not returned ({est.gloveMissing})</span><b>+{formatCurrency(est.gloveCharges)}</b></div>}
        {est.bonus > 0 && <div className="bill-row"><span>Winner bonus</span><b>+{formatCurrency(est.bonus)}</b></div>}
        {est.membershipDiscount > 0 && (
          <div className="bill-row neg"><span>Premium {est.membershipName ? `· ${est.membershipName} ` : ''}{est.membershipPct}%</span><b>-{formatCurrency(est.membershipDiscount)}</b></div>
        )}
        {est.passCredit > 0 && (
          <div className="bill-row neg">
            <span>Frame pass · {est.passName}{est.passFramesLeft !== null ? ` (${est.passFramesLeft} frame${est.passFramesLeft === 1 ? '' : 's'} left)` : ''}</span>
            <b>-{formatCurrency(est.passCredit)}</b>
          </div>
        )}
        {est.oldDue > 0 && <div className="bill-row"><span>Old due</span><b>{formatCurrency(est.oldDue)}</b></div>}
        {est.manualDiscount > 0 && <div className="bill-row neg"><span>Manual discount</span><b>-{formatCurrency(est.manualDiscount)}</b></div>}
        <div className="bill-row total"><span>Total</span><b>{formatCurrency(est.total)}</b></div>
        {advance > 0 && <div className="bill-row neg"><span>Advance already received</span><b>-{formatCurrency(advance)}</b></div>}
        <div className={`bill-row ${estDueLeft > 0 ? 'neg' : 'pos'}`}><span>Estimated due left</span><b>{formatCurrency(estDueLeft)}</b></div>
      </div>

      {overLimit && (
        <p className="small warn-text">
          Due limit {formatCurrency(stats?.dueLimit)} will be exceeded (total due {formatCurrency((stats?.totalDue ?? 0) + estDueLeft)}).
        </p>
      )}

      <div className="final-actions">
        <Btn variant="ghost"  style={{ height: '32px' }} onClick={resume} title="Resume session">
          <RotateCcw size={12} /> Resume
        </Btn>
        <Btn variant="green" style={{ height: '32px' , fontWeight: '600' }} className="btn-block" loading={busy} disabled={!validSides || (isPass && est.passMemberIds.length === 0)} onClick={confirm}>
          Confirm Bill · {formatCurrency(validSides ? est.total : 0)}
        </Btn>
      </div>
    </Card>
  )
}

// ================================================================= screen

export default function TablesScreen() {
  const { data, stats } = useClub()
  const [receipt, setReceipt] = useState<ReceiptData | null>(null)
  const tables = data?.tables ?? []
  const sessions = data?.sessions ?? []
  const byTable = new Map(sessions.map((s) => [s.tableId, s]))

  return (
    <div className="stack">
      <InsightsCard compact scopes={['live', 'members', 'stock', 'revenue']} max={4} title="Smart Insights · Today" />
      <Card className="games-earnings-card pulse-card">
        <div className="games-earnings-copy">
          <div className="games-earnings-label">Today's Earnings</div>
          <div className="games-earnings-total">{formatCurrency(stats?.todayEarnings ?? 0)}</div>
          <div className="games-earnings-modes">
            <span>Cash <b>{formatCurrency(stats?.todayCash ?? 0)}</b></span>
            <span>UPI <b>{formatCurrency(stats?.todayUpi ?? 0)}</b></span>
            <span>Wallet used <b>{formatCurrency(stats?.todayWallet ?? 0)}</b></span>
          </div>
          <div className="games-earnings-due">
            Total Due: {formatCurrency(stats?.totalDue ?? 0)}
            <span> · {stats?.activeMembers ?? 0} active members</span>
          </div>
        </div>
        <IndianRupee className="games-earnings-icon" size={50} strokeWidth={1.8} aria-hidden />
      </Card>

      {tables.length === 0 ? (
        <EmptyState title="No games yet" hint="Add games from Settings → Game Pricing." />
      ) : (
        <div className="table-grid">
          {tables.map((t) => {
            const session = byTable.get(t.id)
            if (!t.active && !session) {
              return (
                <Card key={t.id} className="table-card disabled">
                  <div className="tc-head">
                    <div className="tc-name">{t.name}</div>
                    <Badge kind="muted">Disabled</Badge>
                  </div>
                  <p className="muted small">Enable this game from Settings.</p>
                </Card>
              )
            }
            if (!session) return <FreeCard key={t.id} table={t} />
            if (session.endedAt) return <FinalBillCard key={t.id} table={t} session={session} onConfirmed={(frame) => setReceipt(frameReceipt(frame, data?.club.name ?? 'Club'))} />
            return <OccupiedCard key={t.id} table={t} session={session} />
          })}
        </div>
      )}
      <ReceiptModal open={!!receipt} onClose={() => setReceipt(null)} receipt={receipt} />
    </div>
  )
}
