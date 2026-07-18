import 'dotenv/config';
import { adminAuth } from './config/firebase.js';

const FIREBASE_API_KEY = process.env.FIREBASE_API_KEY;

async function firebaseAuthRest(endpoint, body) {
  const url = `https://identitytoolkit.googleapis.com/v1/accounts:${endpoint}?key=${FIREBASE_API_KEY}`;
  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  });
  const data = await response.json();
  return { status: response.status, data };
}

async function testEmail() {
  const email = 'sohelvx1@gmail.com';
  try {
    const user = await adminAuth.getUserByEmail(email);
    console.log('Found user in Firebase Auth:', user.uid);
    
    // Create custom token
    const customToken = await adminAuth.createCustomToken(user.uid);
    console.log('Custom token generated');

    // Exchange custom token for ID token
    const exchangeRes = await firebaseAuthRest('signInWithCustomToken', {
      token: customToken,
      returnSecureToken: true
    });
    console.log('Exchange status:', exchangeRes.status);
    if (exchangeRes.status !== 200) {
      console.error('Exchange failed:', exchangeRes.data);
      return;
    }

    const idToken = exchangeRes.data.idToken;

    // Send verification email
    const emailRes = await firebaseAuthRest('sendOobCode', {
      requestType: 'VERIFY_EMAIL',
      idToken
    });
    console.log('Send email status:', emailRes.status);
    console.log('Send email response data:', emailRes.data);
  } catch (error) {
    console.error('Error running test:', error);
  }
}

testEmail();
