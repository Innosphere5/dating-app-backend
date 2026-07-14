import 'dotenv/config';
import test from 'node:test';
import assert from 'node:assert/strict';

// Set env to test
process.env.NODE_ENV = 'test';

const { default: app } = await import('../src/app.js');

let server;
let baseUrl;

test.before(() => {
  return new Promise((resolve) => {
    // Start Express app on a dynamic port
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

test('Phone validation - rejects invalid numbers', async () => {
  const invalidNumbers = [
    '123456789', // 9 digits
    '12345678901', // 11 digits
    '12345abc90', // non-numeric
    '+9198765432', // special char
  ];

  for (const phone of invalidNumbers) {
    const res = await fetch(`${baseUrl}/auth/phone-login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ phone })
    });
    assert.equal(res.status, 400);
    const body = await res.json();
    assert.equal(body.success, false);
    assert.match(body.message, /exactly 10 digits/);
  }

  // Test empty phone number
  const resEmpty = await fetch(`${baseUrl}/auth/phone-login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ phone: '' })
  });
  assert.equal(resEmpty.status, 400);
  const bodyEmpty = await resEmpty.json();
  assert.equal(bodyEmpty.success, false);
  assert.match(bodyEmpty.message, /Phone number is required/);
});

test('Phone Registration and Login Flow', async () => {
  const testPhone = '9876543210';

  // 1. Login with unregistered number should fail
  const resLoginFail = await fetch(`${baseUrl}/auth/phone-login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ phone: testPhone })
  });
  assert.equal(resLoginFail.status, 401);
  const loginFailBody = await resLoginFail.json();
  assert.equal(loginFailBody.success, false);
  assert.match(loginFailBody.message, /not registered/);

  // 2. Register valid number should succeed
  const resRegister = await fetch(`${baseUrl}/auth/phone-register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ phone: testPhone })
  });
  assert.equal(resRegister.status, 201);
  const registerBody = await resRegister.json();
  assert.equal(registerBody.success, true);
  assert.match(registerBody.message, /successful/);

  // 3. Registering duplicate number should fail
  const resRegisterDup = await fetch(`${baseUrl}/auth/phone-register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ phone: testPhone })
  });
  assert.equal(resRegisterDup.status, 400);
  const registerDupBody = await resRegisterDup.json();
  assert.equal(registerDupBody.success, false);
  assert.match(registerDupBody.message, /already registered/);

  // 4. Logging in with now-registered number should succeed
  const resLoginSuccess = await fetch(`${baseUrl}/auth/phone-login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ phone: testPhone })
  });
  assert.equal(resLoginSuccess.status, 200);
  const loginSuccessBody = await resLoginSuccess.json();
  assert.equal(loginSuccessBody.success, true);
  assert.equal(loginSuccessBody.data.redirectTo, '/dashboard');
});
