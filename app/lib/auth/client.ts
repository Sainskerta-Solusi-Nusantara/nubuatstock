"use client";

import { createAuthClient } from "better-auth/react";

/**
 * Better-Auth client untuk komponen browser.
 *
 * Base URL relatif — Better-Auth otomatis pakai `window.location.origin` via
 * Next.js client cookies. Tidak perlu baca env.
 */
export const authClient = createAuthClient({
  // Tidak perlu baseURL untuk same-origin (default).
});

// Better-Auth v1.6+: endpoint `forgetPassword` di-rename jadi `requestPasswordReset`
// (path `/request-password-reset`). Re-export dengan nama baru. Lihat
// node_modules/better-auth/dist/api/routes/password.mjs.
export const {
  signIn,
  signUp,
  signOut,
  useSession,
  getSession,
  requestPasswordReset,
  resetPassword,
  sendVerificationEmail,
} = authClient;
