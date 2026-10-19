import { useCallback, useEffect, useMemo, useState } from 'react'
import { Pencil, Plus, ShieldCheck, UserCog } from 'lucide-react'
import { api, ApiError, asArray } from '../lib/api'
import { useClub } from '../context/ClubContext'
import { useAuth } from '../context/AuthContext'
import { formatDateTime } from '../lib/format'
import { Badge, Btn, Card, EmptyState, Field, Modal, StatCard, TextInput } from './ui'
import type { TeamClubRow, TeamStaff } from '../types'

// ------------------------------------------------------------------ screen

/** Admin-area tab: admins manage their clubs; Master Admins can manage any club. */
export default function TeamScreen() {
  const { club, clubs } = useClub()
  const { user } = useAuth()
  const [rows, setRows] = useState<TeamClubRow[]>([])
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [clubId, setClubId] = useState('')
  const [staffModal, setStaffModal] = useState<{ staff: TeamStaff | null; clubId: string } | null>(null)
  const ownedClubs = useMemo(
    () => clubs.filter((item) => item.ownerUserId === user?.id),
    [clubs, user?.id],
  )
  const manageableClubs = useMemo(
    () => user?.role === 'master' ? clubs : ownedClubs,
    [clubs, ownedClubs, user?.role],
  )

  const load = useCallback(async () => {
    if (!club) return
    setLoading(true)
    setError(null)
    try {
      const data = await api<{ rows?: TeamClubRow[]; clubs?: TeamClubRow[] }>('/team')
      setRows(asArray<TeamClubRow>(data?.rows ?? data?.clubs))
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Could not load the team overview')
    } finally {
      setLoading(false)
    }
  }, [club?.id])

  useEffect(() => {
    void load()
  }, [load])

  useEffect(() => {
    if (!manageableClubs.length) {
      setClubId('')
      return
    }
    if (!manageableClubs.some((item) => item.id === clubId)) {
      setClubId(manageableClubs.find((item) => item.id === club?.id)?.id ?? manageableClubs[0].id)
    }
  }, [manageableClubs, club?.id, clubId])

  const openCreate = () => {
    setName('')
    setEmail('')
    setStaffModal({ staff: null, clubId: clubId || manageableClubs[0]?.id || '' })
  }

  const openEdit = (staff: TeamStaff, assignedClubId: string) => {
    setName(staff.name)
    setEmail(staff.email)
    setStaffModal({ staff, clubId: assignedClubId })
  }

  const saveStaff = async () => {
    if (!staffModal || !name.trim() || !staffModal.clubId) return
    if (!staffModal.staff && !email.trim()) return
    setSaving(true)
    setError(null)
    setNotice(null)
    try {
      if (staffModal.staff) {
        await api(`/team/staff/${staffModal.staff.id}`, {
          method: 'PATCH',
          body: { name: name.trim(), clubId: staffModal.clubId },
        })
      } else {
        await api('/team/staff', {
          method: 'POST',
          body: { name: name.trim(), email: email.trim(), clubId: staffModal.clubId },
        })
      }
      const editing = Boolean(staffModal.staff)
      setStaffModal(null)
      setName('')
      setEmail('')
      setNotice(editing ? 'Staff name updated.' : 'Staff account created and assigned. They can sign in with Google using this email.')
      await load()
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Could not create the staff account')
    } finally {
      setSaving(false)
    }
  }

  const totalStaff = rows.reduce((s, r) => s + r.staff.length, 0)
  const disabled = rows.reduce((s, r) => s + r.staff.filter((m) => !m.active).length, 0)

  return (
    <div className="stack">
      {error && <div className="banner banner-error">{error}</div>}
      {notice && <div className="banner banner-success">{notice}</div>}

      {(user?.role === 'owner' || user?.role === 'master') && (
            <Btn style={{height:34 ,fontWeight:'600'}} variant="green" disabled={!manageableClubs.length} onClick={openCreate}>
              <Plus size={13} /> Add New Staff
            </Btn>

      )}

      <div className="grid-stats three">
        <StatCard label="Clubs" tone="blue" value={rows.length} sub="under you" />
        <StatCard label="Handlers" tone="green" value={totalStaff} sub="owners + staff" />
        <StatCard label="Disabled" tone="gold" value={disabled} sub="accounts blocked by Master Admin" />
      </div>

      {rows.length === 0 && !loading ? (
        <Card>
          <EmptyState icon={<UserCog size={26} />} title="No clubs yet" hint="Create a club to add and assign its staff account here." />
        </Card>
      ) : (
        rows.map((row) => (
          <Card key={row.club.id}>
            <div className="row spread">
              <div className="section-title" style={{ margin: 0 }}>{row.club.name}</div>
              <Badge kind="muted">{row.staff.length} handler{row.staff.length === 1 ? '' : 's'}</Badge>
            </div>
            <div className="stack-sm" style={{ marginTop: 8 }}>
              {row.staff.map((s) => (
                <div key={s.id} className="team-row">
                  {s.picture ? (
                    <img className="avatar" src={s.picture} alt={s.name} referrerPolicy="no-referrer" />
                  ) : (
                    <span className="avatar avatar-initial">{(s.name || '?').slice(0, 1).toUpperCase()}</span>
                  )}
                  <div className="team-info">
                    <div className="team-name">
                      {s.name}
                      {s.isOwner && (
                        <Badge kind="gold">
                          <ShieldCheck size={10} style={{ verticalAlign: -1 }} /> Owner
                        </Badge>
                      )}
                      {!s.isOwner && <Badge kind="blue">Staff</Badge>}
                      {!s.active && <Badge kind="red">disabled</Badge>}
                    </div>
                    <div className="muted small">{s.email}</div>
                  </div>
                  <div className="team-meta muted small">
                    {s.lastLoginAt ? `last login · ${formatDateTime(s.lastLoginAt)}` : 'never logged in'}
                  </div>
                  {!s.isOwner && (user?.role === 'owner' || user?.role === 'master') && (
                    <button
                      className="btn-icon"
                      title={`Edit ${s.name}`}
                      aria-label={`Edit ${s.name}`}
                      onClick={() => openEdit(s, row.club.id)}
                    >
                      <Pencil size={13} />
                    </button>
                  )}
                </div>
              ))}
            </div>
          </Card>
        ))
      )}

      <Modal
        open={staffModal !== null}
        onClose={() => { if (!saving) setStaffModal(null) }}
        title={staffModal?.staff ? `Edit · ${staffModal.staff.name}` : 'Add staff account'}
        width={520}
        footer={(
          <>
            <Btn variant="ghost" disabled={saving} onClick={() => setStaffModal(null)}>Cancel</Btn>
            <Btn
              variant="green"
              loading={saving}
              disabled={!name.trim() || !staffModal?.clubId || (!staffModal?.staff && !email.trim())}
              onClick={() => void saveStaff()}
            >
              {staffModal?.staff ? 'Save changes' : 'Create & Assign'}
            </Btn>
          </>
        )}
      >
        <div className="form-grid">
          <Field label="Staff name">
            <TextInput value={name} onChange={(e) => setName(e.target.value)} placeholder="Full name" autoFocus />
          </Field>
          {staffModal?.staff ? (
            <Field label="Google sign-in email">
              <TextInput value={email} readOnly />
            </Field>
          ) : (
            <Field label="Google sign-in email">
              <TextInput type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="staff@example.com" />
            </Field>
          )}
          <Field label={staffModal?.staff ? 'Add to club' : 'Assign to club'}>
            <select
              className="input select"
              value={staffModal?.clubId ?? ''}
              onChange={(e) => setStaffModal((current) => current ? { ...current, clubId: e.target.value } : current)}
            >
              {manageableClubs.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
            </select>
          </Field>
        </div>
      </Modal>
    </div>
  )
}
