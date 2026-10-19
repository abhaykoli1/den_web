import { useMemo, useState } from 'react'
import { BadgeCheck, Banknote, Gamepad2, Mail, MessageCircle, Search, UserRound, X } from 'lucide-react'
import { useClub } from '../context/ClubContext'
import { useToast } from '../context/ToastContext'
import { formatCurrency, formatDateTime, titleCase } from '../lib/format'
import { Badge, Btn, Card, EmptyState, Modal, Seg, StatCard, TextInput } from './ui'
import { parseNum } from '../lib/format'
import InsightsCard from './InsightsCard'
import { useSearchSeed } from '../lib/useSearchSeed'
import type { FrameRecord, Member, PlanPaymentMode, SessionPlayer } from '../types'

/** wa.me deep link with a polite prefilled due reminder. */
function waRemindUrl(m: Member, clubName: string): string {
  const digits = (m.phone || '').replace(/\D/g, '')
  const withCc = digits.length === 10 ? `91${digits}` : digits
  const text =
    `Hello ${m.name}, a friendly reminder from ${clubName} — ` +
    `your due of ${formatCurrency(m.dueAmount)} is still pending. ` +
    `Please clear it at the counter whenever convenient. Thank you! 🎱`
  return `https://wa.me/${withCc}?text=${encodeURIComponent(text)}`
}

function memberIdOf(player: SessionPlayer): string | null {
  return player.memberId ?? player.pid ?? null
}

function MemberGamesModal({ member, frames, onClose }: { member: Member; frames: FrameRecord[]; onClose: () => void }) {
  const history = useMemo(
    () => frames
      .filter((frame) => frame.players.some((player) => memberIdOf(player) === member.id))
      .sort((a, b) => (b.createdAt || b.startedAt).localeCompare(a.createdAt || a.startedAt)),
    [frames, member.id],
  )
  const won = history.filter((frame) => {
    const player = frame.players.find((entry) => memberIdOf(entry) === member.id)
    return player?.isWinner === true
      || (frame.winnerPlayerIds ?? []).includes(member.id)
      || (player ? frame.winners.includes(player.label) : false)
  }).length
  const billed = history.reduce((total, frame) => total + (frame.frameAmount ?? 0), 0)

  return (
    <Modal open onClose={onClose} title={`Games · ${member.name}`} width={620}>
      <div className="member-games-content">
        <div className="row wrap member-games-member-meta">
          <Badge kind="muted">{member.phone || 'No phone'}</Badge>
          {member.planName && <Badge kind="gold">{member.planName}</Badge>}
          {member.notes && <span className="muted small">{member.notes}</span>}
        </div>
        <div className="grid-stats four member-games-stats">
          <StatCard label="Played" value={history.length} tone="blue" />
          <StatCard label="Won" value={won} tone="green" />
          <StatCard label="Lost" value={history.length - won} tone="red" />
          <StatCard label="Total" value={formatCurrency(billed)} tone="green" />
        </div>
        {history.length === 0 ? (
          <EmptyState title="No previous games" hint="This member has no billed frame history yet." icon={<Gamepad2 size={26} />} />
        ) : (
          <div className="record-list member-games-list">
            {history.map((frame) => {
              const player = frame.players.find((entry) => memberIdOf(entry) === member.id)
              const didWin = player?.isWinner === true
                || (frame.winnerPlayerIds ?? []).includes(member.id)
                || (player ? frame.winners.includes(player.label) : false)
              const opponents = frame.players
                .filter((entry) => memberIdOf(entry) !== member.id)
                .map((entry) => entry.label)
                .filter(Boolean)
              const matchLabel = frame.players.length === 3 ? '3 player' : frame.matchMode
              const ended = frame.endedAt ? formatDateTime(frame.endedAt) : 'ongoing'

              return (
                <div className="record-item member-game-item" key={frame.id}>
                  <div className="member-game-heading">
                    <span className={`member-game-result${didWin ? ' won' : ''}`} aria-label={didWin ? 'Won' : 'Lost'}>
                      {didWin ? <Gamepad2 size={17} /> : <X size={17} />}
                    </span>
                    <strong className={didWin ? 'money-green' : 'money-red'}>
                      {titleCase(frame.tableName)} · {titleCase(matchLabel)}
                    </strong>
                    <span className="member-game-opponents">With: {opponents.length ? opponents.join(' vs ') : 'No opponent recorded'}</span>
                  </div>
                  <div className="member-game-meta">
                    <span>{formatDateTime(frame.startedAt)} → {ended}</span>
                    <b className={didWin ? 'money-green' : 'money-red'}>{formatCurrency(frame.frameAmount ?? 0)}</b>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </Modal>
  )
}

function DueRow({ member, clubName, frames }: { member: Member; clubName: string; frames: FrameRecord[] }) {
  const { mutate } = useClub()
  const toast = useToast()
  const [collecting, setCollecting] = useState(false)
  const [gamesOpen, setGamesOpen] = useState(false)
  const [amount, setAmount] = useState(() => String(member.dueAmount))
  const [mode, setMode] = useState<PlanPaymentMode>('cash')
  const [busy, setBusy] = useState(false)

  const collect = async () => {
    const amt = parseNum(amount)
    if (amt <= 0) {
      toast.error('Enter a valid payment amount')
      return
    }
    if (amt > member.dueAmount) {
      toast.error(`Overpayment not allowed — due is ${formatCurrency(member.dueAmount)}`)
      return
    }
    setBusy(true)
    const r = await mutate(`members/${member.id}/payments`, {
      body: { amount: amt, mode },
      toast: `Payment recorded · ${member.name} · ${formatCurrency(amt)} ${mode.toUpperCase()}`,
    })
    setBusy(false)
    if (r) {
      setAmount('')
      setCollecting(false)
    }
  }

  return (
    <Card className="due-row due-member-card">
      <div className="due-member-head">
        <span className="due-avatar" aria-hidden="true">{member.name.trim().charAt(0).toUpperCase() || <UserRound size={17} />}</span>
        <div className="due-member-info">
          <span className="due-member-name">{member.name}</span>
          {member.email && <span className="muted small">{member.email}</span>}
        </div>
        <div className="due-member-total">
          <span className="due-label">DUE</span>
          <b>{formatCurrency(member.dueAmount)}</b>
        </div>
      </div>
      <div className="due-member-actions">
        <Badge kind="muted">WALLET <b className="money-gold">{formatCurrency(member.walletBalance)}</b></Badge>
      </div>
      <div className="due-card-actions">
        <button className="player-action player-action-wallet" type="button" aria-label={`View previous games for ${member.name}`} title="Previous games" onClick={() => setGamesOpen(true)}>
          <Gamepad2 size={15} /><span>Games</span>
        </button>
        <button
          className="player-action player-action-record"
          type="button"
          aria-label={`Collect due from ${member.name}`}
          title="Collect due"
          aria-expanded={collecting}
          onClick={() => setCollecting((value) => !value)}
        >
          {collecting ? <X size={15} /> : <Banknote size={15} />}<span>{collecting ? 'Close' : 'Collect'}</span>
        </button>
        {member.phone ? (
          <a className="player-action player-action-mail" href={waRemindUrl(member, clubName)} target="_blank" rel="noreferrer" aria-label={`WhatsApp ${member.name}`} title="WhatsApp reminder">
            <MessageCircle size={15} /><span>WhatsApp</span>
          </a>
        ) : (
          <button className="player-action player-action-mail" type="button" disabled aria-label="No phone number saved" title="No phone number saved">
            <MessageCircle size={15} /><span>WhatsApp</span>
          </button>
        )}
        {member.email ? (
          <a className="player-action" href={`mailto:${member.email}`} aria-label={`Email ${member.name}`} title={`Email ${member.name}`}>
            <Mail size={15} /><span>Email</span>
          </a>
        ) : (
          <button className="player-action" type="button" disabled aria-label="No email saved" title="No email saved">
            <Mail size={15} /><span>Email</span>
          </button>
        )}
      </div>
      {collecting && (
        <div className="due-collect-form">
          <TextInput
            inputMode="decimal"
            value={amount}
            placeholder="Amount"
            aria-label="Payment amount"
            onChange={(e) => setAmount(e.target.value)}
          />
          <Seg
            value={mode}
            onChange={(v) => setMode(v as PlanPaymentMode)}
            ariaLabel={`Payment mode for ${member.name}`}
            options={[
              { value: 'cash', label: 'Cash' },
              { value: 'upi', label: 'UPI' },
              // { value: 'card', label: 'Card' },
            ]}
          />
          <Btn variant="green" size="sm" style={{height:"32px"}} loading={busy} onClick={collect}>Collect</Btn>
        </div>
      )}
      {gamesOpen && <MemberGamesModal member={member} frames={frames} onClose={() => setGamesOpen(false)} />}
    </Card>
  )
}

export default function DueDeskScreen() {
  const { data } = useClub()
  const [search, setSearch] = useState('')
  useSearchSeed(setSearch)
  const members = data?.members ?? []
  const dueMembers = useMemo(() => {
    const q = search.trim().toLowerCase()
    return members
      .filter((m) => m.active && m.dueAmount > 0)
      .filter((m) => !q || m.name.toLowerCase().includes(q) || (m.phone || '').includes(q))
      .sort((a, b) => b.dueAmount - a.dueAmount)
  }, [members, search])

  const total = members.filter((m) => m.active).reduce((s, m) => s + (m.dueAmount || 0), 0)
  const pendingMembers = members.filter((m) => m.active && m.dueAmount > 0).length
  const dueLimit = data?.club.settings.dueLimit ?? 0

  return (
    <div className="stack">
      <InsightsCard compact scopes={['members']} max={3} />
      <div className="grid-stats due-stats">
        <StatCard label="Pending Due" tone="red" value={formatCurrency(total)} sub={`${pendingMembers} members pending`} />
        <StatCard label="Wallet Held" tone="gold" value={formatCurrency(members.reduce((s, m) => s + (m.walletBalance || 0), 0))} sub="prepaid member credit" />
        <StatCard label="Due Limit" tone="blue" value={formatCurrency(dueLimit)} sub="club collection limit" />
      </div>


      <div className="search-box due-search">
        <Search size={16} />
        <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search name or phone…" aria-label="Search due members" />
      </div>

      {dueMembers.length === 0 ? (
        <EmptyState icon={<BadgeCheck size={30} />} title="No pending dues" hint="Everyone is settled. 🎉" />
      ) : (
        <div className="stack-sm">
          {dueMembers.map((m) => (
            <DueRow key={m.id} member={m} clubName={data?.club.name ?? 'Club'} frames={data?.frames ?? []} />
          ))}
        </div>
      )}
    </div>
  )
}
