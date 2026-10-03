/**
 * DEV-ONLY mock of the Rowdy's Den FastAPI backend.
 * Lets you run / review the React app (design + flows) without the real
 * `../backend`. Start it with:  node mock-api/server.mjs   (port 8000)
 * then run `npm run dev` — vite proxies /api → http://127.0.0.1:8000.
 * NOT part of the production app; delete it any time.
 */
import { createServer } from 'node:http'

const PORT = Number(process.env.MOCK_PORT || 8000)
const now = new Date()
const iso = (d) => new Date(d).toISOString()
const minutesAgo = (m) => iso(now.getTime() - m * 60000)
const todayKey = iso(now).slice(0, 10)

const CLUB_ID = 'club-1'

const db = {
  user: {
    id: 'u-1',
    email: 'owner@rowdysden.in',
    name: 'Abhay Koli',
    picture: null,
    phone: '+91 98290 00000',
    location: 'Bhilwara, Rajasthan',
    role: 'owner',
    active: true,
    clubIds: [CLUB_ID],
    subscription: {
      planId: 'p-pro',
      planName: 'Pro',
      status: 'active',
      price: 1499,
      billingCycle: 'monthly',
      durationDays: 30,
      maxClubs: 3,
      startsAt: iso(now.getTime() - 86400000 * 12),
      expiresAt: iso(now.getTime() + 86400000 * 18),
    },
    createdAt: iso(now.getTime() - 86400000 * 90),
  },
  club: {
    id: CLUB_ID,
    name: "Rowdy's Den — Bhilwara",
    logo: null,
    qrCode: null,
    ownerUserId: 'u-1',
    settings: {
      winnerBonus: 0,
      dueLimit: 5000,
      defaultAdvance: 100,
      currency: 'INR',
      currencySymbol: '₹',
      monthlyTableDiscount: 10,
      isOpen: true,
    },
    createdAt: iso(now.getTime() - 86400000 * 200),
  },
  tables: [
    { id: 't-1', clubId: CLUB_ID, name: 'Table 1', active: true, sortOrder: 1, rate: { hourlyRate: 280, minCharge: 40, peakHourlyRate: 340, peakStartHour: 18, peakEndHour: 23, glovePrice: 20 } },
    { id: 't-2', clubId: CLUB_ID, name: 'Table 2', active: true, sortOrder: 2, rate: { hourlyRate: 280, minCharge: 40, glovePrice: 20 } },
    { id: 't-3', clubId: CLUB_ID, name: 'Snooker 1', active: true, sortOrder: 3, rate: { hourlyRate: 360, minCharge: 60, glovePrice: 20 } },
    { id: 't-4', clubId: CLUB_ID, name: 'Pool Corner', active: true, sortOrder: 4, rate: { hourlyRate: 240, minCharge: 40 } },
  ],
  members: [
    { id: 'm-1', clubId: CLUB_ID, name: 'Rahul Sharma', phone: '9829011111', type: 'member', walletBalance: 450, dueAmount: 0, passFramesLeft: 4, planName: 'Frame Pass 10', planType: 'pass', planExpiresAt: iso(now.getTime() + 86400000 * 20), tableDiscountPercent: 0, active: true },
    { id: 'm-2', clubId: CLUB_ID, name: 'Imran Khan', phone: '9829022222', type: 'member', walletBalance: 0, dueAmount: 860, passFramesLeft: 0, tableDiscountPercent: 0, active: true },
    { id: 'm-3', clubId: CLUB_ID, name: 'Vikas Jain', phone: '9829033333', type: 'premium', walletBalance: 1200, dueAmount: 0, passFramesLeft: 0, planName: 'Monthly Premium', planType: 'monthly', planExpiresAt: iso(now.getTime() + 86400000 * 4), tableDiscountPercent: 15, active: true },
    { id: 'm-4', clubId: CLUB_ID, name: 'Sahil Mewara', phone: '9829044444', type: 'member', walletBalance: 0, dueAmount: 320, passFramesLeft: 0, tableDiscountPercent: 0, active: true },
    { id: 'm-5', clubId: CLUB_ID, name: 'Deepak Soni', phone: '9829055555', type: 'guest', walletBalance: 0, dueAmount: 0, passFramesLeft: 0, tableDiscountPercent: 0, active: true },
  ],
  plans: [
    { id: 'pl-1', clubId: CLUB_ID, name: 'Wallet 1000', type: 'wallet', amount: 900, value: 1000, days: 0, tableDiscountPercent: 0, isDefault: true, active: true },
    { id: 'pl-2', clubId: CLUB_ID, name: 'Frame Pass 10', type: 'pass', amount: 800, value: 10, days: 60, tableDiscountPercent: 0, isDefault: false, active: true },
    { id: 'pl-3', clubId: CLUB_ID, name: 'Monthly Premium', type: 'monthly', amount: 1500, value: 0, days: 30, tableDiscountPercent: 15, isDefault: false, active: true },
  ],
  sessions: [
    {
      id: 's-1', clubId: CLUB_ID, tableId: 't-1', tableName: 'Table 1',
      startedAt: minutesAgo(37), endedAt: null,
      players: [
        { id: 'sp-1', name: 'Rahul Sharma', memberId: 'm-1', team: 'A' },
        { id: 'sp-2', name: 'Imran Khan', memberId: 'm-2', team: 'B' },
      ],
      playerCount: 2, hourlyRate: 280, minCharge: 40, matchMode: 'solo',
      itemsTotal: 60, items: [{ menuItemId: 'i-1', name: 'Tea', qty: 2, price: 30, amount: 60 }],
      discount: 0, advancePaid: 100, notes: 'Cue #4 thoda loose hai', peak: false, gloves: [],
    },
    {
      id: 's-2', clubId: CLUB_ID, tableId: 't-3', tableName: 'Snooker 1',
      startedAt: minutesAgo(12), endedAt: null,
      players: [
        { id: 'sp-3', name: 'Vikas Jain', memberId: 'm-3', team: 'A' },
        { id: 'sp-4', name: 'Deepak Soni', memberId: 'm-5', team: 'B' },
      ],
      playerCount: 2, hourlyRate: 360, minCharge: 60, matchMode: 'solo',
      itemsTotal: 0, items: [], discount: 0, advancePaid: 0, peak: true, gloves: [],
    },
  ],
  frames: [
    {
      id: 'f-1', clubId: CLUB_ID, tableId: 't-2', tableName: 'Table 2',
      startedAt: minutesAgo(210), endedAt: minutesAgo(160), minutes: 50,
      matchMode: 'solo', hourlyRate: 280, tableAmount: 233.33, itemsTotal: 120,
      discount: 0, advancePaid: 0, total: 353.33, mode: 'cash',
      players: [{ id: 'sp-9', name: 'Sahil Mewara', memberId: 'm-4' }, { id: 'sp-10', name: 'Rahul Sharma', memberId: 'm-1' }],
      winners: ['Rahul Sharma'], losers: ['Sahil Mewara'],
      items: [{ name: 'Cold Drink', qty: 2, price: 60, amount: 120 }],
      settlements: [{ name: 'Sahil Mewara', amount: 353.33, mode: 'due' }],
      createdAt: minutesAgo(160),
    },
  ],
  menuItems: [
    { id: 'i-1', clubId: CLUB_ID, name: 'Tea', category: 'Cafe', price: 30, costPrice: 12, stockQty: 48, reorderLevel: 10, unit: 'cup', active: true, image: null },
    { id: 'i-2', clubId: CLUB_ID, name: 'Cold Drink', category: 'Cafe', price: 60, costPrice: 38, stockQty: 6, reorderLevel: 8, unit: 'pc', active: true, image: null },
    { id: 'i-3', clubId: CLUB_ID, name: 'Chips', category: 'Snacks', price: 20, costPrice: 14, stockQty: 0, reorderLevel: 5, unit: 'pc', active: true, image: null },
    { id: 'i-4', clubId: CLUB_ID, name: 'Sandwich', category: 'Snacks', price: 70, costPrice: 42, stockQty: 14, reorderLevel: 4, unit: 'pc', active: true, image: null },
    { id: 'i-5', clubId: CLUB_ID, name: 'Cue Chalk', category: 'Misc', price: 40, costPrice: 22, stockQty: 25, reorderLevel: 6, unit: 'pc', active: true, image: null },
  ],
  itemBills: [
    { id: 'ib-1', clubId: CLUB_ID, billNo: 'IB-1042', customerName: 'Rahul Sharma', memberId: 'm-1', items: [{ name: 'Tea', qty: 2, price: 30, amount: 60 }], subtotal: 60, discount: 0, total: 60, mode: 'cash', paid: true, createdAt: minutesAgo(95) },
    { id: 'ib-2', clubId: CLUB_ID, billNo: 'IB-1043', customerName: 'Walk-in', memberId: null, items: [{ name: 'Sandwich', qty: 1, price: 70, amount: 70 }, { name: 'Cold Drink', qty: 1, price: 60, amount: 60 }], subtotal: 130, discount: 10, total: 120, mode: 'upi', paid: true, createdAt: minutesAgo(48) },
  ],
  expenses: [
    { id: 'e-1', clubId: CLUB_ID, category: 'Stock', description: 'Cold drink crate', amount: 912, date: todayKey, createdAt: minutesAgo(300) },
    { id: 'e-2', clubId: CLUB_ID, category: 'Electricity', description: 'Monthly bill', amount: 3400, date: todayKey, createdAt: minutesAgo(1500) },
  ],
  membershipSales: [
    { id: 'ms-1', clubId: CLUB_ID, memberId: 'm-3', memberName: 'Vikas Jain', planId: 'pl-3', planName: 'Monthly Premium', planType: 'monthly', amount: 1500, value: 0, tableDiscountPercent: 15, mode: 'upi', createdAt: minutesAgo(2800) },
  ],
  logs: [
    { id: 'l-1', clubId: CLUB_ID, tag: 'billing', message: 'Frame billed · Table 2 · ₹353.33 → Sahil Mewara (due)', createdAt: minutesAgo(160) },
    { id: 'l-2', clubId: CLUB_ID, tag: 'payment', message: 'Item bill IB-1043 · ₹120 · UPI', createdAt: minutesAgo(48) },
    { id: 'l-3', clubId: CLUB_ID, tag: 'warning', message: 'Stock out — Chips', createdAt: minutesAgo(30) },
    { id: 'l-4', clubId: CLUB_ID, tag: 'admin', message: 'Club settings updated · due limit ₹5000', createdAt: minutesAgo(900) },
  ],
  bookings: [
    { id: 'b-1', tableId: 't-2', tableName: 'Table 2', memberId: 'm-1', memberName: 'Rahul Sharma', dateIST: todayKey, startIST: '19:00', endIST: '20:00', minutes: 60, players: 2, status: 'upcoming', note: 'Birthday frame' },
    { id: 'b-2', tableId: 't-4', tableName: 'Pool Corner', memberId: 'm-3', memberName: 'Vikas Jain', dateIST: todayKey, startIST: '21:30', endIST: '22:30', minutes: 60, players: 4, status: 'upcoming' },
    { id: 'b-3', tableId: 't-1', tableName: 'Table 1', memberId: 'm-4', memberName: 'Sahil Mewara', dateIST: todayKey, startIST: '12:00', endIST: '13:00', minutes: 60, players: 2, status: 'completed' },
  ],
  orders: [
    { id: 'o-1', orderNumber: 'ORD-204', status: 'pending', memberName: 'Rahul Sharma', tableName: 'Table 1', items: [{ name: 'Tea', qty: 2 }, { name: 'Chips', qty: 1 }], total: 80, createdAt: minutesAgo(8) },
    { id: 'o-2', orderNumber: 'ORD-203', status: 'completed', memberName: 'Vikas Jain', tableName: 'Snooker 1', items: [{ name: 'Sandwich', qty: 1 }], total: 70, createdAt: minutesAgo(40) },
    { id: 'o-3', orderNumber: 'ORD-202', status: 'cancelled', customerName: 'Walk-in', items: [{ name: 'Cold Drink', qty: 2 }], total: 120, createdAt: minutesAgo(120) },
  ],
  tournaments: [],
}

const stats = () => ({
  clubId: CLUB_ID,
  totalDue: db.members.reduce((s, m) => s + (m.dueAmount || 0), 0),
  todayEarnings: 4860,
  dueLimit: db.club.settings.dueLimit,
  activeMembers: db.members.filter((m) => m.active).length,
  activeSessions: db.sessions.filter((s) => !s.endedAt).length,
  today: todayKey,
  currency: 'INR',
  currencySymbol: '₹',
})

const send = (res, status, body) => {
  const payload = body === undefined ? '' : JSON.stringify(body)
  res.writeHead(status, {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': '*',
    'Access-Control-Allow-Methods': 'GET,POST,PATCH,DELETE,OPTIONS',
  })
  res.end(payload)
}

const readBody = (req) =>
  new Promise((resolve) => {
    let raw = ''
    req.on('data', (c) => (raw += c))
    req.on('end', () => {
      try {
        resolve(raw ? JSON.parse(raw) : {})
      } catch {
        resolve({})
      }
    })
  })

createServer(async (req, res) => {
  const url = new URL(req.url, 'http://localhost')
  const path = url.pathname.replace(/^\/api/, '')
  const method = req.method || 'GET'
  if (method === 'OPTIONS') return send(res, 204)

  // ---- auth ----
  if (path === '/auth/dev-mode') return send(res, 200, { enabled: true })
  if (path === '/auth/dev' || path === '/auth/google') {
    const body = await readBody(req)
    if (body.email) db.user.email = body.email
    if (body.name) db.user.name = body.name
    return send(res, 200, { user: db.user, token: 'mock-token' })
  }
  if (path === '/auth/me') {
    if (method === 'PATCH') Object.assign(db.user, await readBody(req))
    return send(res, 200, db.user)
  }
  if (path === '/platform/support') return send(res, 200, { email: 'master@rowdys.dev', phone: '+91 98290 12345' })
  if (path === '/subscription-plans') return send(res, 200, [])

  // ---- clubs ----
  if (path === '/clubs' && method === 'GET') return send(res, 200, [db.club])
  if (path === `/clubs/${CLUB_ID}/data`) {
    return send(res, 200, {
      club: db.club,
      tables: db.tables,
      members: db.members,
      plans: db.plans,
      sessions: db.sessions,
      frames: db.frames,
      menuItems: db.menuItems,
      itemBills: db.itemBills,
      expenses: db.expenses,
      membershipSales: db.membershipSales,
      logs: db.logs,
      stats: stats(),
    })
  }
  if (path === `/clubs/${CLUB_ID}` && method === 'PATCH') {
    Object.assign(db.club, await readBody(req))
    return send(res, 200, db.club)
  }
  if (path === `/clubs/${CLUB_ID}/settings` && method === 'PATCH') {
    Object.assign(db.club.settings, await readBody(req))
    return send(res, 200, db.club)
  }
  if (path === `/clubs/${CLUB_ID}/bookings` && method === 'GET') return send(res, 200, { bookings: db.bookings })
  if (path.startsWith(`/clubs/${CLUB_ID}/bookings/`) && method === 'DELETE') {
    const id = path.split('/').pop()
    db.bookings = db.bookings.filter((b) => b.id !== id)
    return send(res, 200, { ok: true })
  }
  if (path === `/clubs/${CLUB_ID}/orders`) return send(res, 200, { orders: db.orders })
  if (path === `/clubs/${CLUB_ID}/tournaments`) return send(res, 200, db.tournaments)
  if (path.includes('/reports/')) {
    return send(res, 200, { month: todayKey.slice(0, 7), sourceTotals: {}, sourceCounts: {}, rows: [], daily: [], totals: {} })
  }
  if (path === '/team' || path === '/team/staff') return send(res, 200, [])

  // ---- generic club mutations (menu items, members, bills…) ----
  if (path.startsWith(`/clubs/${CLUB_ID}/`)) {
    const body = await readBody(req)
    return send(res, 200, { ok: true, ...body })
  }

  return send(res, 404, { detail: `Mock backend: no handler for ${method} ${path}` })
}).listen(PORT, '0.0.0.0', () => {
  console.log(`[mock-api] listening on http://0.0.0.0:${PORT} (dev-only fixture data)`)
})
