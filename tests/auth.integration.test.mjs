import assert from 'node:assert/strict'
import { after, before, describe, it } from 'node:test'
import { setTimeout as delay } from 'node:timers/promises'
import { sessionCookie, sqlLiteral, WorkerFixture } from './helpers/worker-fixture.mjs'

describe('Authentication and platform roles on a real local Worker + D1', { concurrency: false, timeout: 240_000 }, () => {
  const worker = new WorkerFixture()
  const alice = { name: 'Alicia Cliente', email: 'alicia@example.invalid', company_name: 'Empresa Alicia' }
  const bob = { name: 'Bruno Cliente', email: 'bruno@example.invalid', company_name: 'Empresa Bruno' }
  const admin = { name: 'Administración', email: 'admin@example.invalid', company_name: 'Plataforma' }
  let aliceCookie
  let bobCookie
  let adminCookie
  let aliceId
  let bobId
  let adminId
  let observedRateLimit = false

  // Keep production throttling enabled and honor its actual Retry-After response.
  // Better Auth's database counter resets after an idle window, not a fixed minute.
  async function authRequest(path, options) {
    const response = await worker.request(`/api/auth/${path}`, { method: 'POST', ...options })
    if (response.status !== 429) return response
    observedRateLimit = true
    const retryAfter = Number(response.headers.get('Retry-After') ?? response.headers.get('X-Retry-After'))
    assert.ok(Number.isFinite(retryAfter) && retryAfter > 0 && retryAfter <= 60, 'Throttling must return a bounded Retry-After')
    await delay((retryAfter + 1) * 1_000)
    return worker.request(`/api/auth/${path}`, { method: 'POST', ...options })
  }

  async function signUp(identity, extra = {}) {
    return authRequest('sign-up/email', { json: { ...identity, password: worker.password, ...extra } })
  }

  async function signIn(identity, password = worker.password) {
    return authRequest('sign-in/email', { json: { email: identity.email, password } })
  }

  async function me(cookie) {
    const response = await worker.request('/api/me', { cookie })
    assert.equal(response.status, 200)
    return response.json()
  }

  function assertRejected(response, expectedStatuses) {
    assert.ok(expectedStatuses.includes(response.status), `Expected rejection ${expectedStatuses.join('/')}; received ${response.status}`)
    assert.ok(!response.headers.getSetCookie().some(cookie => /session_token=[^;]/.test(cookie)), 'Rejected request must not create a session')
  }

  before(async () => { await worker.start() })
  after(async () => { await worker.stop() })

  it('returns 401 for anonymous protected API and agent requests', async () => {
    for (const path of ['/api/me', '/api/admin/clients', '/api/client/assistant', '/agents/another-client']) {
      const response = await worker.request(path)
      assert.equal(response.status, 401, path)
    }
  })

  it('rejects injected privileges and registers only an active client with a secure session cookie', async () => {
    const malicious = await signUp(alice, {
      platform_role: 'admin', platformRole: 'admin', role: 'admin', status: 'suspended',
    })
    assertRejected(malicious, [400])
    const response = await signUp(alice, { platformRole: 'admin' })
    assert.equal(response.status, 200)
    const cookie = sessionCookie(response)
    assert.match(cookie.header, /;\s*HttpOnly(?:;|$)/i)
    assert.match(cookie.header, /;\s*Secure(?:;|$)/i)
    assert.match(cookie.header, /;\s*SameSite=Lax(?:;|$)/i)
    assert.doesNotMatch(cookie.header, /;\s*Domain=/i)
    aliceCookie = cookie.value
    const result = await me(aliceCookie)
    aliceId = result.user.id
    assert.equal(result.user.email, alice.email)
    assert.equal(result.profile.user_id, aliceId)
    assert.equal(result.profile.full_name, alice.name)
    assert.equal(result.profile.company_name, alice.company_name)
    assert.equal(result.profile.platform_role, 'client')
    assert.equal(result.profile.status, 'active')
  })

  it('restores the session on a fresh request and rejects a tampered cookie', async () => {
    const session = await worker.request('/api/auth/get-session', { cookie: aliceCookie })
    assert.equal(session.status, 200)
    assert.equal((await session.json()).user.id, aliceId)
    assert.equal((await me(aliceCookie)).profile.platform_role, 'client')
    const invalid = await worker.request('/api/me', { cookie: `${aliceCookie}tampered` })
    assert.equal(invalid.status, 401)
  })

  it('rejects invalid email addresses and short passwords', async () => {
    const invalidEmail = await signUp({ ...bob, email: 'not-an-email' })
    assertRejected(invalidEmail, [400, 422])
    const weakPassword = await signUp(bob, { password: 'short' })
    assertRejected(weakPassword, [400, 422])
  })

  it('rejects duplicate registration and an incorrect password', async () => {
    const duplicate = await signUp(alice)
    assertRejected(duplicate, [400, 409, 422])
    const badPassword = await signIn(alice, 'Incorrect-password-for-integration-test')
    assertRejected(badPassword, [400, 401])
  })

  it('keeps a second client isolated from the first', async () => {
    const response = await signUp(bob)
    assert.equal(response.status, 200)
    bobCookie = sessionCookie(response).value
    bobId = (await me(bobCookie)).user.id
    assert.notEqual(bobId, aliceId)
    const own = await worker.request(`/agents/${aliceId}`, { cookie: aliceCookie })
    assert.equal(own.status, 200)
    assert.deepEqual(await own.json(), { assistant_status: 'not_configured', conversation_count: 0 })
    const other = await worker.request(`/agents/${bobId}`, { cookie: aliceCookie })
    assert.equal(other.status, 403)
    const forgedIdentity = await worker.request(`/agents/${bobId}`, {
      cookie: aliceCookie,
      headers: { 'X-User-Id': bobId, 'X-Client-Id': bobId, 'X-Platform-Role': 'admin' },
    })
    assert.equal(forgedIdentity.status, 403)
    const assistant = await worker.request('/api/client/assistant', { cookie: bobCookie })
    assert.equal(assistant.status, 200)
    assert.deepEqual(await assistant.json(), { assistant_status: 'not_configured', conversation_count: 0 })
  })

  it('throttles repeated registration attempts and permits retry after the stated delay', () => {
    assert.ok(observedRateLimit, 'The production registration rate limit must have been exercised')
  })

  it('denies a client every administration action and self-promotion', async () => {
    const list = await worker.request('/api/admin/clients', { cookie: aliceCookie })
    assert.equal(list.status, 403)
    const detail = await worker.request(`/api/admin/clients/${bobId}`, { cookie: aliceCookie })
    assert.equal(detail.status, 403)
    const edit = await worker.request(`/api/admin/clients/${bobId}`, {
      method: 'PATCH', cookie: aliceCookie, json: { status: 'suspended' },
    })
    assert.equal(edit.status, 403)
    const selfPromotion = await authRequest('update-user', {
      cookie: aliceCookie, json: { platform_role: 'admin', platformRole: 'admin', role: 'admin' },
    })
    assert.ok([403, 404, 405].includes(selfPromotion.status))
    assert.equal((await me(aliceCookie)).profile.platform_role, 'client')
    assert.equal((await me(bobCookie)).profile.status, 'active')
  })

  it('rejects cross-origin auth mutations without logging the legitimate user out', async () => {
    const crossOrigin = await authRequest('sign-out', { cookie: aliceCookie, json: {}, origin: 'https://attacker.example' })
    assert.equal(crossOrigin.status, 403)
    assert.equal((await me(aliceCookie)).user.id, aliceId)
    const crossOriginRegistration = await authRequest('sign-up/email', {
      json: { ...admin, password: worker.password }, origin: 'https://attacker.example',
    })
    assert.equal(crossOriginRegistration.status, 403)
  })

  it('revokes the session on logout and accepts a subsequent valid login', async () => {
    const previousCookie = aliceCookie
    const logout = await authRequest('sign-out', { cookie: aliceCookie, json: {} })
    assert.equal(logout.status, 200)
    const oldSession = await worker.request('/api/me', { cookie: previousCookie })
    assert.equal(oldSession.status, 401)
    const authSession = await worker.request('/api/auth/get-session', { cookie: previousCookie })
    assert.equal(await authSession.json(), null)
    const login = await signIn(alice)
    assert.equal(login.status, 200)
    aliceCookie = sessionCookie(login).value
    assert.notEqual(aliceCookie, previousCookie)
    assert.equal((await me(aliceCookie)).user.id, aliceId)
  })

  it('grants global admin access only after an internal D1 promotion, returning real clients', async () => {
    const registration = await signUp(admin)
    assert.equal(registration.status, 200)
    adminCookie = sessionCookie(registration).value
    const beforePromotion = await me(adminCookie)
    adminId = beforePromotion.user.id
    assert.equal(beforePromotion.profile.platform_role, 'client')
    await worker.sql(`UPDATE profiles SET platform_role = 'admin' WHERE user_id = ${sqlLiteral(adminId)};`)
    const promoted = await me(adminCookie)
    assert.equal(promoted.profile.platform_role, 'admin')
    const login = await signIn(admin)
    assert.equal(login.status, 200)
    adminCookie = sessionCookie(login).value
    assert.equal((await me(adminCookie)).profile.platform_role, 'admin')
    const list = await worker.request('/api/admin/clients', { cookie: adminCookie })
    assert.equal(list.status, 200)
    const { clients } = await list.json()
    assert.deepEqual(clients.map(client => client.user_id).sort(), [aliceId, bobId].sort())
    for (const client of clients) {
      assert.equal(client.platform_role, 'client')
      assert.equal(client.assistant_status, 'not_configured')
      assert.equal(client.conversation_count, 0)
      assert.ok(client.created_at)
    }
    const detail = await worker.request(`/api/admin/clients/${aliceId}`, { cookie: adminCookie })
    assert.equal(detail.status, 200)
    const { client } = await detail.json()
    assert.equal(client.email, alice.email)
    assert.equal(client.company_name, alice.company_name)
    const agent = await worker.request(`/agents/${bobId}`, { cookie: adminCookie })
    assert.equal(agent.status, 200)
    const absent = await worker.request('/api/admin/clients/nonexistent-client', { cookie: adminCookie })
    assert.equal(absent.status, 404)
  })

  it('rejects cross-origin administration, invalid statuses, and attempts to suspend an admin', async () => {
    const csrf = await worker.request(`/api/admin/clients/${aliceId}`, {
      method: 'PATCH', cookie: adminCookie, json: { status: 'suspended' }, origin: 'https://attacker.example',
    })
    assert.equal(csrf.status, 403)
    assert.equal((await me(aliceCookie)).profile.status, 'active')
    const invalid = await worker.request(`/api/admin/clients/${aliceId}`, {
      method: 'PATCH', cookie: adminCookie, json: { status: 'anything' },
    })
    assert.equal(invalid.status, 400)
    const selfSuspension = await worker.request(`/api/admin/clients/${adminId}`, {
      method: 'PATCH', cookie: adminCookie, json: { status: 'suspended' },
    })
    assert.ok([403, 404].includes(selfSuspension.status))
    assert.equal((await me(adminCookie)).profile.status, 'active')
  })

  it('suspends a client immediately, revokes their sessions, and blocks new logins', async () => {
    const suspended = await worker.request(`/api/admin/clients/${aliceId}`, {
      method: 'PATCH', cookie: adminCookie, json: { status: 'suspended' },
    })
    assert.equal(suspended.status, 200)
    assert.equal((await suspended.json()).client.status, 'suspended')
    for (const path of ['/api/me', '/api/client/assistant', `/agents/${aliceId}`]) {
      const blocked = await worker.request(path, { cookie: aliceCookie })
      assert.ok([401, 403].includes(blocked.status), `Suspension did not protect ${path}`)
    }
    const login = await signIn(alice)
    assertRejected(login, [401, 403])
    assert.equal((await me(bobCookie)).profile.status, 'active')
  })

  it('reactivates a client while leaving the revoked session invalid', async () => {
    const enabled = await worker.request(`/api/admin/clients/${aliceId}`, {
      method: 'PATCH', cookie: adminCookie, json: { status: 'active' },
    })
    assert.equal(enabled.status, 200)
    assert.equal((await enabled.json()).client.status, 'active')
    const revoked = await worker.request('/api/me', { cookie: aliceCookie })
    assert.equal(revoked.status, 401)
    const login = await signIn(alice)
    assert.equal(login.status, 200)
    aliceCookie = sessionCookie(login).value
    assert.equal((await me(aliceCookie)).profile.status, 'active')
  })
})
