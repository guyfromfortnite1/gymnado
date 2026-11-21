// Browser-only auth helpers.
import { createClient } from "./supabase/client";

/**
 * Signs out on this device and does a full page load to /login. A full load (not router.replace) matters:
 * the app router may hold a copy of /login fetched while still signed in, which redirected to the home page.
 */
export async function signOutToLogin() {
  await createClient().auth.signOut({ scope: "local" });
  window.location.replace("/login");
}
