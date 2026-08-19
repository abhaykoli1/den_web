// Thermal-printer friendly receipt (58mm) — preview in a modal, real print
// via window.print(): a portal copy lives at <body>.print-root and the
// @media print CSS swaps the whole app for the receipt only.
//
// BACKEND-FIX: field mappings backend ke real keys pe aligned:
//  Item bill (POST /item-bills → res.bill):
//    amount (total), paid (bool), payments [{mode,amount}], mode,
//    subtotal, discount, status, customerName, memberName, items[...]
//  Frame (table bill doc):
//    frameAmount (total — "totalAmount" naam NAHI hai backend pe),
//    cashCollected + advanceUsed (paid), settlements [{walletPart,passPart,
//    cashPart,duePart}], passApplied [{memberId,framesUsed,covers}],
//    membershipDiscount, winnerBonus, gloveCharges, itemsAmount,
//    tableAmount, winners/losers, matchMode, winningTeam, durationMinutes
//  Pehle ye file b.total / b.paidAmount / f.totalAmount jaisi keys padh raha
//  tha jo backend pe hain hi nahi → NaN/undefined aur crash risk.
import { createPortal } from 'react-dom'
import { Printer } from 'lucide-react'
import { asArray, asNum } from '../lib/api'
import { formatCurrency, formatDateTime, formatDuration, modeBadge } from '../lib/format'
import { Btn, Modal } from './ui'
import type { FrameRecord, ItemBill } from '../types'

export interface ReceiptLineItem {
  name: string
  qty: number
  amount: string
}

export interface ReceiptRow {
  label: string
  value: string
  strong?: boolean
  neg?: boolean
}

export interface ReceiptData {
  kind: string // 'TABLE BILL' | 'ITEM BILL'
  clubName: string
  billNo: string
  when: string
  party: string
  partyNote?: string | null
  items?: ReceiptLineItem[]
  rows: ReceiptRow[]
  total: string
  paid: string
  due?: string | null
  mode: string
  footer?: string
}

export function frameReceipt(f: FrameRecord, clubName: string): ReceiptData {
  const fr = f as any // backend frame doc — raw fields
  const settlements = asArray<any>(fr.settlements)
  const rows: ReceiptRow[] = [
    { label: `Table · ${formatDuration(fr.durationMinutes)}`, value: formatCurrency(asNum(fr.tableAmount)) },
  ]
  if (asNum(fr.itemsAmount) > 0) rows.push({ label: 'Items', value: formatCurrency(asNum(fr.itemsAmount)) })
  if (asNum(fr.gloveCharges) > 0) {
    const names = asArray<any>(fr.gloves).filter((g) => !g.returned).map((g) => g.label).join(', ')
    rows.push({ label: `Gloves not returned${names ? ` · ${names}` : ''}`, value: `+${formatCurrency(asNum(fr.gloveCharges))}` })
  }
  if (asNum(fr.winnerBonus) > 0) rows.push({ label: 'Winner bonus', value: `+${formatCurrency(asNum(fr.winnerBonus))}` })
  if (asNum(fr.membershipDiscount) > 0) {
    rows.push({ label: `Premium discount`, value: `-${formatCurrency(asNum(fr.membershipDiscount))}`, neg: true })
  }
  // Frame pass cover — backend: passApplied [{memberId, framesUsed, covers}]
  const passArr = asArray<any>(fr.passApplied)
  const passCover = passArr.reduce((s, p) => s + asNum(p?.covers), 0)
  if (passCover > 0) {
    const framesUsed = passArr.reduce((s, p) => s + asNum(p?.framesUsed), 0)
    rows.push({ label: `Pass · ${framesUsed} frame covered`, value: `-${formatCurrency(passCover)}`, neg: true })
  }
  if (asNum(fr.discount) > 0) rows.push({ label: 'Discount', value: `-${formatCurrency(asNum(fr.discount))}`, neg: true })
  if (asNum(fr.advancePaid) > 0) rows.push({ label: 'Advance (already received)', value: formatCurrency(asNum(fr.advancePaid)) })

  const total = asNum(fr.frameAmount ?? fr.totalAmount)
  const dueLeft = settlements.reduce((s, l) => s + asNum(l?.duePart), 0)
  const paidNow = asNum(fr.cashCollected) + asNum(fr.advanceUsed)
  // payment mode label from settlement parts (wallet/pass/cash + due)
  const partModes = [...new Set(settlements.flatMap((l) => [
    asNum(l?.walletPart) > 0 ? 'wallet' : '',
    asNum(l?.passPart) > 0 ? 'pass' : '',
    asNum(l?.cashPart) > 0 ? 'cash' : '',
    asNum(l?.duePart) > 0 ? 'due' : '',
  ]).filter(Boolean))]

  return {
    kind: 'TABLE BILL',
    clubName,
    billNo: String(fr.id ?? '').slice(0, 8).toUpperCase(),
    when: formatDateTime(fr.endedAt ?? fr.createdAt),
    party: fr.tableName ?? 'Table',
    partyNote:
      `Winner: ${asArray<string>(fr.winners).join(', ') || '—'} · Pays: ${asArray<string>(fr.losers).join(', ') || '—'}` +
      (fr.matchMode === '2v2' && fr.winningTeam ? ` · Team ${fr.winningTeam} won` : ''),
    items: asArray<any>(fr.items).map((i) => ({ name: i.name, qty: asNum(i.qty), amount: formatCurrency(asNum(i.amount)) })),
    rows,
    total: formatCurrency(total),
    paid: formatCurrency(paidNow || total - dueLeft),
    due: dueLeft > 0 ? formatCurrency(dueLeft) : null,
    mode: partModes.join(' + ') || 'cash',
    footer: dueLeft > 0 ? 'Due pending — baad me collect karein' : 'Payment complete — thank you!',
  }
}

export function itemBillReceipt(b: ItemBill, clubName: string): ReceiptData {
  const bill = b as any // backend bill doc — {amount, paid, payments, mode, ...}
  const payments = asArray<any>(bill.payments)
  const paidAmt = payments.reduce((s, p) => s + asNum(p?.amount), 0)
  const walletPart = asNum(payments.find((p) => p?.mode === 'wallet')?.amount)
  const total = asNum(bill.amount ?? bill.total)
  const isDue = bill.paid === false || bill.status === 'unpaid'

  const rows: ReceiptRow[] = [
    { label: 'Subtotal', value: formatCurrency(asNum(bill.subtotal)) },
  ]
  if (asNum(bill.discount) > 0) rows.push({ label: 'Discount', value: `-${formatCurrency(asNum(bill.discount))}`, neg: true })
  if (walletPart > 0) rows.push({ label: 'Wallet used', value: formatCurrency(walletPart) })

  return {
    kind: 'ITEM BILL',
    clubName,
    billNo: String(bill.id ?? '').slice(0, 8).toUpperCase(),
    when: formatDateTime(bill.createdAt),
    party: bill.customerName ?? 'Customer',
    partyNote: bill.memberName ? `Member: ${bill.memberName}` : null,
    items: asArray<any>(bill.items).map((i) => ({ name: i.name, qty: asNum(i.qty), amount: formatCurrency(asNum(i.amount)) })),
    rows,
    total: formatCurrency(total),
    paid: formatCurrency(isDue ? 0 : paidAmt || total),
    due: isDue ? formatCurrency(total) : null,
    mode: modeBadge(bill.mode ?? 'cash'),
    footer: isDue ? 'Due hai — Due Desk se collect karein' : 'Payment complete — thank you!',
  }
}

function ReceiptPaper({ data }: { data: ReceiptData }) {
  return (
    <div className="receipt">
      <div className="r-center r-brand">{data.clubName}</div>
      <div className="r-center r-sub">powered by Rowdy&apos;s Den — Club Billing</div>
      <div className="r-dash" />
      <div className="r-row"><span>{data.kind}</span><span>#{data.billNo}</span></div>
      <div className="r-row"><span>{data.when}</span><span>{data.party}</span></div>
      {data.partyNote && <div className="r-note">{data.partyNote}</div>}
      <div className="r-dash" />
      {(data.items ?? []).length > 0 && (
        <>
          {data.items!.map((i, idx) => (
            <div className="r-row" key={idx}>
              <span className="r-ellipsis">{i.name} x{i.qty}</span>
              <span>{i.amount}</span>
            </div>
          ))}
          <div className="r-dash" />
        </>
      )}
      {data.rows.map((r, idx) => (
        <div className={`r-row${r.strong ? ' r-strong' : ''}`} key={idx}>
          <span>{r.label}</span>
          <span>{r.value}</span>
        </div>
      ))}
      <div className="r-dash" />
      <div className="r-row r-strong r-big"><span>TOTAL</span><span>{data.total}</span></div>
      <div className="r-row"><span>Paid ({data.mode})</span><span>{data.paid}</span></div>
      {data.due && <div className="r-row r-strong"><span>DUE LEFT</span><span>{data.due}</span></div>}
      <div className="r-dash" />
      <div className="r-center r-sub">{data.footer ?? 'Thank you!'}</div>
      <div className="r-center r-sub">Visit again · play fair</div>
    </div>
  )
}

export default function ReceiptModal({
  open,
  onClose,
  receipt,
}: {
  open: boolean
  onClose: () => void
  receipt: ReceiptData | null
}) {
  const doPrint = () => {
    document.body.classList.add('do-print')
    const cleanup = () => document.body.classList.remove('do-print')
    window.addEventListener('afterprint', cleanup, { once: true })
    window.print()
    window.setTimeout(cleanup, 2500) // safety if afterprint never fires
  }

  return (
    <>
      <Modal
        open={open && !!receipt}
        onClose={onClose}
        title="Print Receipt"
        width={340}
        footer={
          <>
            <Btn variant="ghost" onClick={onClose}>Close</Btn>
            <Btn variant="green" onClick={doPrint}>
              <Printer size={13} /> Print (58mm)
            </Btn>
          </>
        }
      >
        {receipt && (
          <div className="receipt-preview">
            <ReceiptPaper data={receipt} />
          </div>
        )}
        <p className="muted small center" style={{ marginTop: 6 }}>
          Works on both thermal (58mm) and regular A4 printers.
        </p>
      </Modal>
      {open && receipt && createPortal(
        <div className="print-root" aria-hidden>
          <ReceiptPaper data={receipt} />
        </div>,
        document.body,
      )}
    </>
  )
}
