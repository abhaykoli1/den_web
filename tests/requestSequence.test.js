import test from 'node:test'
import assert from 'node:assert/strict'
import { RequestSequence } from '../src/lib/RequestSequence.js'

test('only the newest club data request can update state', () => {
  const requests = new RequestSequence()
  const older = requests.begin()
  const newer = requests.begin()

  assert.equal(requests.isCurrent(older), false)
  assert.equal(requests.isCurrent(newer), true)
})

test('a club switch invalidates requests that are still in flight', () => {
  const requests = new RequestSequence()
  const pending = requests.begin()
  requests.invalidate()

  assert.equal(requests.isCurrent(pending), false)
})
