import { cert, getApps, initializeApp, type App } from "firebase-admin/app";
import { getAuth, type Auth } from "firebase-admin/auth";

function getServiceAccount() {
  const projectId = process.env.FIREBASE_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
  const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, "\n");

  // During `next build` these are often missing — avoid throwing at build time
  if (!projectId || !clientEmail || !privateKey) return null;

  return { projectId, clientEmail, privateKey };
}

let _app: App | null = null;
let _auth: Auth | null = null;

export function getAdminAuth(): Auth {
  const sa = getServiceAccount();
  if (!sa) {
    throw new Error(
      "Firebase Admin not configured. Missing FIREBASE_PROJECT_ID / FIREBASE_CLIENT_EMAIL / FIREBASE_PRIVATE_KEY."
    );
  }

  if (!_app) {
    _app =
      getApps().length > 0
        ? getApps()[0]!
        : initializeApp({ credential: cert(sa) });
  }

  if (!_auth) _auth = getAuth(_app);

  return _auth;
}