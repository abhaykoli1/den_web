import test from 'node:test'
import assert from 'node:assert/strict'
import { readRecords, readStrings, validateClubDataRoot } from '../src/lib/clubDataSchema.js'

test('club-data root requires a club identity and stats object', () => {
  const valid = { club: { id: 'club-1', name: 'The Den' }, stats: {}, members: [] }
  assert.equal(validateClubDataRoot(valid), valid)
  assert.throws(() => validateClubDataRoot({ club: null, stats: {} }), /invalid club data/i)
  assert.throws(() => validateClubDataRoot({ club: { id: '', name: 'The Den' }, stats: {} }), /identity/i)
})

test('club-data arrays reject malformed rows and missing required fields', () => {
  assert.deepEqual(readRecords([{ id: 'member-1', name: 'Furkan' }], 'members', ['id', 'name']), [
    { id: 'member-1', name: 'Furkan' },
  ])
  assert.throws(() => readRecords({}, 'members'), /must be an array/)
  assert.throws(() => readRecords([null], 'members'), /must be an object/)
  assert.throws(() => readRecords([{ id: 'member-1' }], 'members', ['id', 'name']), /name is required/)
})

test('frame winner and loser lists must contain strings', () => {
  assert.deepEqual(readStrings(['player-1'], 'frames[0].winners'), ['player-1'])
  assert.throws(() => readStrings(['player-1', 3], 'frames[0].winners'), /must contain strings/)
})
