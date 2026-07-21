import 'dotenv/config';
import test from 'node:test';
import assert from 'node:assert/strict';

// Set env to test
process.env.NODE_ENV = 'test';

const { default: app } = await import('../src/app.js');
const { resetMockDb } = await import('../src/services/profile.service.js');

let server;
let baseUrl;

test.before(() => {
  return new Promise((resolve) => {
    // Start Express app on a dynamic port
    server = app.listen(0, () => {
      const port = server.address().port;
      baseUrl = `http://localhost:${port}/api`;
      resolve();
    });
  });
});

test.after(() => {
  return new Promise((resolve) => {
    server.close(resolve);
  });
});

// Reset mock DB before each test
test.beforeEach(() => {
  resetMockDb();
});

const validProfileData = {
  full_name: "Jane Doe",
  gender: "female",
  age: 28,
  looking_for: "relationship",
  show_me: "both",
  employment_status: "employed",
  salary_range: "50000_100000",
  religion: "None",
  interests: ["coding", "hiking"],
  selfie_image: "https://example.com/selfie.jpg",
  profile_images: ["https://example.com/p1.jpg", "https://example.com/p2.jpg"],
  about: "Passionate developer looking to connect.",
  community: 1, // 1: straight man, 2: straight woman, 3: lgbtq
  dob: "1998-05-15"
};

test('Missing JWT should return 401 Unauthorized', async () => {
  const res = await fetch(`${baseUrl}/profile`, {
    method: 'GET'
  });
  assert.equal(res.status, 401);
  const body = await res.json();
  assert.equal(body.success, false);
  assert.match(body.message, /Missing JWT token/);
});

test('Invalid JWT should return 401 Unauthorized', async () => {
  const res = await fetch(`${baseUrl}/profile`, {
    method: 'GET',
    headers: {
      'Authorization': 'Bearer invalid-token'
    }
  });
  assert.equal(res.status, 401);
  const body = await res.json();
  assert.equal(body.success, false);
  assert.match(body.message, /Invalid or expired JWT token/);
});

test('Create Profile - successful creation', async () => {
  const res = await fetch(`${baseUrl}/profile`, {
    method: 'POST',
    headers: {
      'Authorization': 'Bearer valid-token',
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(validProfileData)
  });

  assert.equal(res.status, 201);
  const body = await res.json();
  assert.equal(body.success, true);
  assert.equal(body.message, 'Profile created successfully');
  assert.deepEqual(body.data, {});
});

test('Duplicate Profile - should return 409 Conflict', async () => {
  // Create first profile
  await fetch(`${baseUrl}/profile`, {
    method: 'POST',
    headers: {
      'Authorization': 'Bearer valid-token',
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(validProfileData)
  });

  // Attempt duplicate profile creation
  const res = await fetch(`${baseUrl}/profile`, {
    method: 'POST',
    headers: {
      'Authorization': 'Bearer valid-token',
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(validProfileData)
  });

  assert.equal(res.status, 409);
  const body = await res.json();
  assert.equal(body.success, false);
  assert.match(body.message, /Conflict/);
});

test('Get Profile - successful retrieval and 404 when not found', async () => {
  // GET profile when not created yet
  const resEmpty = await fetch(`${baseUrl}/profile`, {
    method: 'GET',
    headers: {
      'Authorization': 'Bearer valid-token'
    }
  });
  assert.equal(resEmpty.status, 404);
  const emptyBody = await resEmpty.json();
  assert.equal(emptyBody.success, false);
  assert.equal(emptyBody.message, 'Profile not found.');

  // Create profile
  await fetch(`${baseUrl}/profile`, {
    method: 'POST',
    headers: {
      'Authorization': 'Bearer valid-token',
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(validProfileData)
  });

  // GET profile after creation
  const resGet = await fetch(`${baseUrl}/profile`, {
    method: 'GET',
    headers: {
      'Authorization': 'Bearer valid-token'
    }
  });
  assert.equal(resGet.status, 200);
  const getBody = await resGet.json();
  assert.equal(getBody.success, true);
  assert.equal(getBody.data.full_name, 'Jane Doe');
  assert.equal(getBody.data.about, 'Passionate developer looking to connect.');
  assert.equal(getBody.data.community, 1);
  assert.equal(getBody.data.dob, '1998-05-15');
  assert.equal(getBody.data.age, 28);
  assert.equal(getBody.data.religion, 'None');
});

test('Update One Field - successful patch', async () => {
  // Create profile
  await fetch(`${baseUrl}/profile`, {
    method: 'POST',
    headers: {
      'Authorization': 'Bearer valid-token',
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(validProfileData)
  });

  // Patch one field (religion)
  const resUpdate = await fetch(`${baseUrl}/profile`, {
    method: 'PATCH',
    headers: {
      'Authorization': 'Bearer valid-token',
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ religion: 'Buddhism' })
  });

  assert.equal(resUpdate.status, 200);
  const updateBody = await resUpdate.json();
  assert.equal(updateBody.success, true);
  assert.equal(updateBody.message, 'Profile updated successfully');

  // Verify other fields remain intact
  const resGet = await fetch(`${baseUrl}/profile`, {
    method: 'GET',
    headers: {
      'Authorization': 'Bearer valid-token'
    }
  });
  const getBody = await resGet.json();
  assert.equal(getBody.data.religion, 'Buddhism');
  assert.equal(getBody.data.full_name, 'Jane Doe'); // unchanged
  assert.equal(getBody.data.age, 28); // unchanged
});

test('Update Multiple Fields - successful patch', async () => {
  // Create profile
  await fetch(`${baseUrl}/profile`, {
    method: 'POST',
    headers: {
      'Authorization': 'Bearer valid-token',
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(validProfileData)
  });

  // Patch multiple fields
  const resUpdate = await fetch(`${baseUrl}/profile`, {
    method: 'PATCH',
    headers: {
      'Authorization': 'Bearer valid-token',
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ age: 30, employment_status: 'self_employed' })
  });

  assert.equal(resUpdate.status, 200);

  // Verify changes
  const resGet = await fetch(`${baseUrl}/profile`, {
    method: 'GET',
    headers: {
      'Authorization': 'Bearer valid-token'
    }
  });
  const getBody = await resGet.json();
  assert.equal(getBody.data.age, 30);
  assert.equal(getBody.data.employment_status, 'self_employed');
});

test('Invalid Age - fails validation', async () => {
  const invalidAges = [17, 101, 25.5, '25'];

  for (const age of invalidAges) {
    const payload = { ...validProfileData, age };
    const res = await fetch(`${baseUrl}/profile`, {
      method: 'POST',
      headers: {
        'Authorization': 'Bearer valid-token',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    });

    assert.equal(res.status, 400);
    const body = await res.json();
    assert.equal(body.success, false);
    assert.equal(body.message, 'Validation failed');
    assert.ok(body.errors.some(err => err.field === 'age'));
  }
});

test('Invalid Enum - fails validation', async () => {
  const payload = { ...validProfileData, gender: 'other_gender' };
  const res = await fetch(`${baseUrl}/profile`, {
    method: 'POST',
    headers: {
      'Authorization': 'Bearer valid-token',
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(payload)
  });

  assert.equal(res.status, 400);
  const body = await res.json();
  assert.equal(body.success, false);
  assert.ok(body.errors.some(err => err.field === 'gender'));
});

test('Interests rules - validation failures', async () => {
  // 1. More than 3 interests
  const payloadMore = { ...validProfileData, interests: ['a', 'b', 'c', 'd'] };
  const resMore = await fetch(`${baseUrl}/profile`, {
    method: 'POST',
    headers: {
      'Authorization': 'Bearer valid-token',
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(payloadMore)
  });
  assert.equal(resMore.status, 400);

  // 2. Duplicate interests
  const payloadDup = { ...validProfileData, interests: ['coding', 'hiking', 'coding'] };
  const resDup = await fetch(`${baseUrl}/profile`, {
    method: 'POST',
    headers: {
      'Authorization': 'Bearer valid-token',
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(payloadDup)
  });
  assert.equal(resDup.status, 400);
});

test('Maximum Interests - successful validation', async () => {
  const payloadMax = { ...validProfileData, interests: ['a', 'b', 'c'] };
  const res = await fetch(`${baseUrl}/profile`, {
    method: 'POST',
    headers: {
      'Authorization': 'Bearer valid-token',
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(payloadMax)
  });
  assert.equal(res.status, 201);
});

test('SQL Injection Attempt - should be rejected', async () => {
  const payloads = [
    { ...validProfileData, full_name: "Jane; DROP TABLE users;--" },
    { ...validProfileData, religion: "UNION SELECT * FROM auth.users" },
    { ...validProfileData, about: "About; DROP TABLE users;--" },
    { ...validProfileData, dob: "1998-05-15; DROP TABLE users;--" }
  ];

  for (const payload of payloads) {
    const res = await fetch(`${baseUrl}/profile`, {
      method: 'POST',
      headers: {
        'Authorization': 'Bearer valid-token',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    });

    assert.equal(res.status, 400);
    const body = await res.json();
    assert.equal(body.success, false);
    assert.match(body.message, /Validation failed/);
  }
});

test('Unknown Fields - should be rejected', async () => {
  const payload = { ...validProfileData, extra_hacker_field: 'exploit' };
  const res = await fetch(`${baseUrl}/profile`, {
    method: 'POST',
    headers: {
      'Authorization': 'Bearer valid-token',
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(payload)
  });

  assert.equal(res.status, 400);
  const body = await res.json();
  assert.equal(body.success, false);
  assert.ok(body.errors.some(err => err.field === 'extra_hacker_field'));
});

test('Empty Body on PATCH - should be rejected', async () => {
  // Create profile first
  await fetch(`${baseUrl}/profile`, {
    method: 'POST',
    headers: {
      'Authorization': 'Bearer valid-token',
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(validProfileData)
  });

  const res = await fetch(`${baseUrl}/profile`, {
    method: 'PATCH',
    headers: {
      'Authorization': 'Bearer valid-token',
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({})
  });

  assert.equal(res.status, 400);
  const body = await res.json();
  assert.equal(body.success, false);
  assert.ok(body.errors.some(err => err.field === 'body'));
});

test('Delete Profile and Delete Twice behavior', async () => {
  // Create profile first
  await fetch(`${baseUrl}/profile`, {
    method: 'POST',
    headers: {
      'Authorization': 'Bearer valid-token',
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(validProfileData)
  });

  // Delete profile
  const resDelete = await fetch(`${baseUrl}/profile`, {
    method: 'DELETE',
    headers: {
      'Authorization': 'Bearer valid-token'
    }
  });
  assert.equal(resDelete.status, 200);
  const deleteBody = await resDelete.json();
  assert.equal(deleteBody.success, true);
  assert.equal(deleteBody.message, 'Profile deleted successfully');

  // Verify deletion by attempting to GET profile (should return 404)
  const resGet = await fetch(`${baseUrl}/profile`, {
    method: 'GET',
    headers: {
      'Authorization': 'Bearer valid-token'
    }
  });
  assert.equal(resGet.status, 404);

  // Delete profile again (Delete Twice)
  const resDeleteTwice = await fetch(`${baseUrl}/profile`, {
    method: 'DELETE',
    headers: {
      'Authorization': 'Bearer valid-token'
    }
  });
  assert.equal(resDeleteTwice.status, 404);
});

test('Community Validation - accepts 1, 2, 3 and rejects invalid values', async () => {
  // Valid community values: 1 (straight man), 2 (straight woman), 3 (lgbtq)
  for (const communityVal of [1, 2, 3]) {
    resetMockDb();
    const payload = { ...validProfileData, community: communityVal };
    const res = await fetch(`${baseUrl}/profile`, {
      method: 'POST',
      headers: {
        'Authorization': 'Bearer valid-token',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    });
    assert.equal(res.status, 201);
  }

  // Invalid community values
  for (const communityVal of [0, 4, '1', 'straight man', null]) {
    resetMockDb();
    const payload = { ...validProfileData, community: communityVal };
    const res = await fetch(`${baseUrl}/profile`, {
      method: 'POST',
      headers: {
        'Authorization': 'Bearer valid-token',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    });
    assert.equal(res.status, 400);
    const body = await res.json();
    assert.equal(body.success, false);
    assert.ok(body.errors.some(err => err.field === 'community'));
  }
});

test('DOB Validation - requires valid YYYY-MM-DD date format', async () => {
  const invalidDobs = ['15-05-1998', '1998/05/15', 'invalid-date', 19980515, null];
  for (const dob of invalidDobs) {
    resetMockDb();
    const payload = { ...validProfileData, dob };
    const res = await fetch(`${baseUrl}/profile`, {
      method: 'POST',
      headers: {
        'Authorization': 'Bearer valid-token',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    });
    assert.equal(res.status, 400);
    const body = await res.json();
    assert.equal(body.success, false);
    assert.ok(body.errors.some(err => err.field === 'dob'));
  }
});
