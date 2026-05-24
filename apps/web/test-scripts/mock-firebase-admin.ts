// In-memory stub of @/lib/firebase-admin for the test runner.
// Returns a fake admin object whose verifyIdToken / verifySessionCookie just
// pass through the supplied token as the uid. That lets route tests exercise
// the auth-rejection branches without booting a real Firebase admin SDK.

interface FakeDecodedToken {
  uid: string;
  [key: string]: unknown;
}

interface FakeAdminAuth {
  verifyIdToken(token: string): Promise<FakeDecodedToken>;
  verifySessionCookie(cookie: string, _checkRevoked?: boolean): Promise<FakeDecodedToken>;
}

// Tokens beginning with "uid-" are treated as valid; anything else throws.
// This mirrors the structure of test fixtures used elsewhere ("uid-alice", etc).
const fakeAdmin: FakeAdminAuth = {
  async verifyIdToken(token: string) {
    if (!token || !token.startsWith("uid-")) {
      throw new Error("invalid id-token (mock)");
    }
    return { uid: token };
  },
  async verifySessionCookie(cookie: string) {
    if (!cookie || !cookie.startsWith("uid-")) {
      throw new Error("invalid session cookie (mock)");
    }
    return { uid: cookie };
  },
};

export function getAdminAuth(): FakeAdminAuth {
  return fakeAdmin;
}

export function getFirebaseAdmin(): unknown {
  return {};
}
