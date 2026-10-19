import { useMemo, useState } from 'react'
import { Crown, Printer, Repeat } from 'lucide-react'
import { useClub } from '../context/ClubContext'
import { formatCurrency, titleCase } from '../lib/format'
import { Badge, Btn, Card, EmptyState, Modal, StatCard, TextInput } from './ui'
import ReceiptModal, { frameReceipt, type ReceiptData } from './ReceiptModal'
import type { FrameRecord, Team } from '../types'

function localDateKey(value: string): string {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return ''
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${date.getFullYear()}-${month}-${day}`
}

function todayDateKey(): string {
  const now = new Date()
  const month = String(now.getMonth() + 1).padStart(2, '0')
  const day = String(now.getDate()).padStart(2, '0')
  return `${now.getFullYear()}-${month}-${day}`
}

function frameDateTime(value: string): string {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return '—'
  return date.toLocaleString('en-IN', {
    day: 'numeric',
    month: 'short',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  }).replace(',', ' ·')
}

function framePaymentAccent(frame: FrameRecord): 'due' | 'pass' | 'wallet' | 'paid' {
  if (frame.dueAmount > 0 || frame.status === 'partial' || frame.status === 'unpaid') return 'due'
  if (frame.passFramesUsed > 0 || frame.passTableCredit > 0) return 'pass'
  if (frame.paymentMode === 'wallet' || frame.settlements.some((settlement) => (settlement.walletPart ?? 0) > 0)) {
    return 'wallet'
  }
  return 'paid'
}

function WinnerModal({ frame, onClose }: { frame: FrameRecord; onClose: () => void }) {
  const { mutate } = useClub()
  const is2v2 = frame.matchMode === '2v2'
  const [winners, setWinners] = useState<string[]>(frame.winnerPlayerIds ?? [])
  const [team, setTeam] = useState<Team | null>(frame.winningTeam ?? null)
  const [busy, setBusy] = useState(false)

  const valid = is2v2
    ? team !== null && team !== frame.winningTeam
    : winners.length >= 1 && winners.length < frame.players.length &&
      JSON.stringify([...winners].sort()) !== JSON.stringify([...(frame.winnerPlayerIds ?? [])].sort())

  const save = async () => {
    setBusy(true)
    const body = is2v2 ? { winningTeam: team } : { winnerPlayerIds: winners }
    const r = await mutate(`frames/${frame.id}/winners`, {
      method: 'PATCH',
      body,
      toast: 'Winner changed · settlement recalculated',
    })
    setBusy(false)
    if (r) onClose()
  }

  const teamOf = (t: Team) => frame.players.filter((p) => p.team === t)

  return (
    <Modal
      open
      onClose={onClose}
      title={`Change Winner · ${frame.tableName}`}
      width={420}
      footer={
        <>
          <Btn variant="ghost" style={{height:"32px"}} onClick={onClose}>Cancel</Btn>
          <Btn variant="green" style={{height:"32px"}} loading={busy} disabled={!valid} onClick={save}>Apply Correction</Btn>
        </>
      }
    >
      <p className="muted small">
        This reverses the old settlement (wallet refunded, newly-added due removed, pass frames
        restored) and re-bills the frame to the new paying side. Cash already collected is
        re-applied, not refunded.
      </p>
      {is2v2 ? (
        <div className="team-pick" style={{ marginTop: 8 }}>
          {(['A', 'B'] as Team[]).map((t) => (
            <button key={t} type="button" className={`team-btn${team === t ? ' active' : ''}`} onClick={() => setTeam(t)}>
              <span className="team-title">Team {t}</span>
              <span className="team-names">{teamOf(t).map((p) => p.label).join(' · ')}</span>
              <span className={`team-role ${team === t ? 'money-green' : 'money-red'}`}>{team === t ? 'Winner' : 'Pays'}</span>
            </button>
          ))}
        </div>
      ) : (
        <div className="winner-pick" style={{ marginTop: 8 }}>
          {frame.players.map((p) => {
            const win = winners.includes(p.id)
            return (
              <button
                key={p.id}
                type="button"
                className={`win-chip${win ? ' win' : ''}`}
                onClick={() =>
                  setWinners((list) => (list.includes(p.id) ? list.filter((x) => x !== p.id) : [...list, p.id]))
                }
              >
                <span>{p.label}</span>
                <span className={win ? 'money-green' : 'money-red'}>{win ? 'Winner' : 'Pays'}</span>
              </button>
            )
          })}
        </div>
      )}
    </Modal>
  )
}

export default function FramesScreen() {
  const { data } = useClub()
  const [date, setDate] = useState(todayDateKey)
  const [winnerFrame, setWinnerFrame] = useState<FrameRecord | null>(null)
  const [receipt, setReceipt] = useState<ReceiptData | null>(null)

  const frames = data?.frames ?? []
  const filtered = useMemo(
    () => frames.filter((f) => localDateKey(f.createdAt) === date),
    [frames, date],
  )

  const totals = useMemo(() => {
    const t = { count: filtered.length, total: 0, collected: 0, due: 0 }
    for (const f of filtered) {
      t.total += f.totalAmount || 0
      t.collected += f.paidAmount || 0
      t.due += f.dueAmount || 0
    }
    return t
  }, [filtered])

  return (
    <div className="stack">
      <TextInput className="frame-date-input" type="date" value={date} onChange={(e) => setDate(e.target.value)} aria-label="Filter frames by date" />


     <div className="grid-stats">
        {/* <StatCard label="Frames" value={String(totals.count)} tone="blue"  /> */}
        <StatCard label="Billed" value={String(formatCurrency(totals.total))} tone="green" sub="for selected date" />
        <StatCard label="Collected" value={String(formatCurrency(totals.collected))} tone="green" sub="paid against frame bills" />
        <StatCard label="Due left" value={String(formatCurrency(totals.due))} tone="red" sub="remaining to collect" />
      </div>

      {filtered.length === 0 ? (
        <EmptyState title="No frames billed yet" hint="Confirm a table bill to see it here." />
      ) : (
        <div className="stack-sm">
          {filtered.map((f) => (
            <Card key={f.id} className={`frame-card frame-payment-${framePaymentAccent(f)}`}>
              <div className="frame-card-heading">
                <div className="frame-card-topline">
                  <span className="pc-name">{f.tableName}</span>
                  <div className="frame-card-badges">
                    <Badge  kind="blue">{f.matchMode === '2v2' ? '2V2' : 'SOLO'}</Badge>
                    <Badge kind={f.status === 'paid' ? 'green' : f.status === 'partial' ? 'blue' : 'red'}>{titleCase(f.status).toUpperCase()}</Badge>
                  </div>
                </div>
                <span className="muted small">{frameDateTime(f.startedAt)} → {frameDateTime(f.endedAt)}</span>
              </div>

              <div className="frame-card-amounts">
                <div className="bill-row total"><span>Frame total</span><b>{formatCurrency(f.totalAmount)}</b></div>
                <div className="bill-row"><span>Collected now</span><b className="money-red">{formatCurrency(f.paidAmount)}</b></div>
              </div>

              <div className="chip-row frame-players">
                {f.players.map((p) => {
                  const isWinner = (f.winners ?? []).includes(p.label)
                  return (
                    <span key={p.id} className={`chip${isWinner ? ' chip-win' : ''}${p.team ? ` team-${p.team}` : ''}`}>
                      {isWinner && <Crown size={12} aria-hidden="true" />}
                      {p.label}
                    </span>
                  )
                })}
              </div>

              <div className="frame-card-actions">
                <Btn size="sm" variant="outline" aria-label={`Print receipt for ${f.tableName}`} onClick={() => setReceipt(frameReceipt(f, data?.club.name ?? 'Club'))}>
                  <Printer size={12} /> Receipt
                </Btn>
                <Btn size="sm" variant="outline" className="frame-fix-winner" aria-label={`Fix winner for ${f.tableName}`} onClick={() => setWinnerFrame(f)}>
                  <Repeat size={11} /> Fix winner
                </Btn>
              </div>
            </Card>
          ))}
        </div>
      )}

      {winnerFrame && <WinnerModal frame={winnerFrame} onClose={() => setWinnerFrame(null)} />}
      <ReceiptModal open={!!receipt} onClose={() => setReceipt(null)} receipt={receipt} />
    </div>
  )
}
