import 'dotenv/config';
import { adminAuth } from './config/firebase.js';

const apiKey = process.env.FIREBASE_API_KEY;

async function testFirebaseEmail(email) {
  console.log('Testing Firebase email for:', email);
  try {
    let userRecord;
    try {
      userRecord = await adminAuth.getUserByEmail(email);
      console.log('User found:', userRecord.uid);
    } catch {
      userRecord = await adminAuth.createUser({ email, password: 'TestPassword123!', emailVerified: false });
      console.log('User created:', userRecord.uid);
    }

    const customToken = await adminAuth.createCustomToken(userRecord.uid);
    console.log('Custom token generated');

    const exchangeRes = await fetch(`https://identitytoolkit.googleapis.com/v1/accounts:signInWithCustomToken?key=${apiKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token: customToken, returnSecureToken: true })
    });
    const exchangeData = await exchangeRes.json();
    console.log('Exchange status:', exchangeRes.status, exchangeData.idToken ? 'ID Token obtained' : exchangeData);

    const sendRes = await fetch(`https://identitytoolkit.googleapis.com/v1/accounts:sendOobCode?key=${apiKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        requestType: 'VERIFY_EMAIL',
        idToken: exchangeData.idToken
      })
    });
    const sendData = await sendRes.json();
    console.log('SendOobCode status:', sendRes.status, sendData);
  } catch (err) {
    console.error('Error:', err);
  }
}

testFirebaseEmail('henrychritopher20@gmail.com');
