import 'dotenv/config';
import { registerUser } from './services/auth.service.js';

async function test() {
  try {
    console.log('Calling registerUser for sohelvx1@gmail.com...');
    const result = await registerUser(
      'sohelvx1@gmail.com',
      'TestPassword123!',
      'http://localhost:3000/auth/verify'
    );
    console.log('Result:', result);
  } catch (err) {
    console.error('Thrown Error:', err);
  }
}

test();
