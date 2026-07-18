import 'dotenv/config';
import { db } from './config/firebase.js';

async function run() {
  try {
    console.log('Testing Firestore connectivity...');
    const collections = await db.listCollections();
    console.log('Firestore collections:', collections.map(c => c.id));
    console.log('Firestore connection is working successfully!');
  } catch (err) {
    console.error('Firestore Connection error:', err.message);
  }
}

run();
