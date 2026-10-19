import test from 'node:test'
import assert from 'node:assert/strict'
import { hasAppAccess, subscriptionOk } from '../src/lib/accessPolicy.js'

const fixedNow = Date.parse('2026-10-19T12:00:00Z')

test('subscription access matches supported backend states', () => {
  for (const status of ['pending', 'trial', 'active', 'past_due', 'paused', 'keep_current', 'current']) {
    assert.equal(subscriptionOk({ status }, fixedNow), true, `${status} should be allowed`)
  }
  for (const status of ['expired', 'cancelled', 'unknown']) {
    assert.equal(subscriptionOk({ status }, fixedNow), false, `${status} should be blocked`)
  }
})

test('subscription expiry follows backend rules', () => {
  assert.equal(subscriptionOk({ status: 'active', expiresAt: '2026-10-20T00:00:00Z' }, fixedNow), true)
  assert.equal(subscriptionOk({ status: 'active', expiresAt: '2026-10-19T11:59:59Z' }, fixedNow), false)
  assert.equal(subscriptionOk({ status: 'active', expiresAt: 'not-a-date' }, fixedNow), false)
  assert.equal(subscriptionOk({ status: 'past_due', expiresAt: '2020-01-01T00:00:00Z' }, fixedNow), true)
  assert.equal(subscriptionOk({ status: 'paused', expiresAt: '2020-01-01T00:00:00Z' }, fixedNow), true)
})

test('staff need a club assignment but not an individual subscription', () => {
  assert.equal(hasAppAccess({ role: 'staff', clubIds: ['club-1'] }), true)
  assert.equal(hasAppAccess({ role: 'staff', clubIds: [] }), false)
  assert.equal(hasAppAccess({ role: 'master', clubIds: [] }), true)
  assert.equal(hasAppAccess({ role: 'owner', subscription: null }), false)
})
