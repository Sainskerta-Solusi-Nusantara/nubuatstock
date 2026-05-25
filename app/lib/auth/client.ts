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

export const { signIn, signUp, signOut, useSession, getSession, forgetPassword, resetPassword } =
  authClient;
