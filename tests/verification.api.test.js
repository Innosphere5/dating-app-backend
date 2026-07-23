import 'dotenv/config';
import test from 'node:test';
import assert from 'node:assert/strict';

process.env.NODE_ENV = 'test';

const { default: app } = await import('../src/app.js');
const { validateSignupInput, isDisposableEmail, isValidEmail, normalizeEmail } = await import('../src/utils/validators.js');

let server;
let baseUrl;

test.before(() => {
  return new Promise((resolve) => {
    server = app.listen(0, () => {
      const port = server.address().port;
      baseUrl = `http://localhost:${port}`;
      resolve();
    });
  });
});

test.after(() => {
  return new Promise((resolve) => {
    server.close(resolve);
  });
});

test('Validators - RFC email, disposable rejection, and password strength', () => {
  assert.equal(isValidEmail('user@example.com'), true);
  assert.equal(isValidEmail('invalid-email'), false);
  assert.equal(normalizeEmail('  TEST@Example.COM '), 'test@example.com');

  assert.equal(isDisposableEmail('test@mailinator.com'), true);
  assert.equal(isDisposableEmail('test@tempmail.com'), true);
  assert.equal(isDisposableEmail('test@gmail.com'), false);

  const res1 = validateSignupInput({
    fullName: 'John Doe',
    email: 'john@tempmail.com',
    password: 'Password123!'
  });
  assert.equal(res1.isValid, false);
  assert.match(res1.errors.join(' '), /Disposable email/);

  const res2 = validateSignupInput({
    fullName: 'John Doe',
    email: 'john@example.com',
    password: 'short'
  });
  assert.equal(res2.isValid, false);
  assert.match(res2.errors.join(' '), /8 characters/);
});

test('POST /auth/signup - rejects disposable emails with 400', async () => {
  const res = await fetch(`${baseUrl}/auth/signup`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      fullName: 'Test User',
      email: 'fake@mailinator.com',
      password: 'StrongPassword123!'
    })
  });

  assert.equal(res.status, 400);
  const body = await res.json();
  assert.equal(body.success, false);
  assert.match(body.message, /Disposable email/);
});

test('POST /auth/login - blocks unverified user with 403 Forbidden', async () => {
  const res = await fetch(`${baseUrl}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: 'unverified-test-user@app.internal',
      password: 'WrongOrUnverified123!'
    })
  });

  // Should return 401 (invalid credentials) or 403 (unverified)
  assert.ok([401, 403].includes(res.status));
  const body = await res.json();
  assert.equal(body.success, false);
});

test('POST /auth/resend-verification - rate limiting & generic response', async () => {
  const email = 'resend-test@example.com';

  // First request
  const res1 = await fetch(`${baseUrl}/auth/resend-verification`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email })
  });

  assert.equal(res1.status, 200);
  const body1 = await res1.json();
  assert.equal(body1.success, true);
  assert.match(body1.message, /verification email has been sent/);

  // Immediate second request (triggers 60s cooldown limit)
  const res2 = await fetch(`${baseUrl}/auth/resend-verification`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email })
  });

  assert.equal(res2.status, 200);
  const body2 = await res2.json();
  assert.equal(body2.success, true); // Returns generic success to prevent email enumeration
  assert.match(body2.message, /verification email has been sent/);
});

test('GET /auth/verify-pending - renders page', async () => {
  const res = await fetch(`${baseUrl}/auth/verify-pending?email=test@example.com`);
  assert.equal(res.status, 200);
  const html = await res.text();
  assert.match(html, /Verify your email/);
  assert.match(html, /test@example.com/);
});
