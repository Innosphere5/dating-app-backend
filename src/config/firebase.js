import { initializeApp, getApps, cert } from 'firebase-admin';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';
import { readFileSync, existsSync, readdirSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

/**
 * Singleton Firebase Admin SDK initialization.
 * Never initializes twice.
 */
function initializeFirebase() {
  const apps = getApps();
  if (apps.length > 0) {
    return apps[0];
  }

  // Try loading from service account JSON file first
  const possiblePaths = [
    resolve(__dirname, '..', '..', 'serviceAccountKey.json'),
    resolve(__dirname, '..', 'dating-app-backend-d34a4-firebase-adminsdk-fbsvc-abcef3b9ec.json'),
    resolve(__dirname, '..', '..', 'dating-app-backend-d34a4-firebase-adminsdk-fbsvc-abcef3b9ec.json')
  ];

  let serviceAccountPath = possiblePaths.find(p => existsSync(p));

  if (!serviceAccountPath) {
    // Dynamically search in parent folder and src folder for any JSON matching firebase-adminsdk
    try {
      const srcFiles = readdirSync(resolve(__dirname, '..'));
      const foundSrc = srcFiles.find(f => f.includes('firebase-adminsdk') && f.endsWith('.json'));
      if (foundSrc) serviceAccountPath = resolve(__dirname, '..', foundSrc);

      if (!serviceAccountPath) {
        const rootFiles = readdirSync(resolve(__dirname, '..', '..'));
        const foundRoot = rootFiles.find(f => f.includes('firebase-adminsdk') && f.endsWith('.json'));
        if (foundRoot) serviceAccountPath = resolve(__dirname, '..', '..', foundRoot);
      }
    } catch (e) {
      console.warn('Failed to dynamically scan for service account key:', e.message);
    }
  }

  if (serviceAccountPath && existsSync(serviceAccountPath)) {
    const serviceAccount = JSON.parse(readFileSync(serviceAccountPath, 'utf8'));
    return initializeApp({
      credential: cert(serviceAccount),
      storageBucket: process.env.FIREBASE_STORAGE_BUCKET || undefined
    });
  }

  // Fall back to environment variables
  const projectId = process.env.FIREBASE_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
  const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n');

  if (!projectId || !clientEmail || !privateKey) {
    throw new Error(
      'Missing Firebase credentials. Either place serviceAccountKey.json in the project root, ' +
      'or set FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, and FIREBASE_PRIVATE_KEY environment variables.'
    );
  }

  return initializeApp({
    credential: cert({ projectId, clientEmail, privateKey }),
    storageBucket: process.env.FIREBASE_STORAGE_BUCKET || undefined
  });
}

const app = initializeFirebase();

/** Firebase Admin Auth instance */
export const adminAuth = getAuth(app);

/** Firestore instance */
export const db = getFirestore(app);

/** Firebase Admin Firestore FieldValue */
export const firestoreFieldValue = FieldValue;
