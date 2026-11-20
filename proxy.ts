import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

// Signed-out only: signed-in users are sent home.
const PUBLIC_PATHS = ["/login", "/signup", "/forgot-password"];
// Anyone: the reset link signs the user in on arrival, Stripe's webhook has no session,
// legal pages are public, and browsers fetch the app manifest without logging in.
const OPEN_PATHS = ["/reset-password", "/api/stripe/webhook", "/terms", "/privacy", "/refund", "/manifest.webmanifest"];

// Refreshes the Supabase session cookie on every request and sends signed-out users to /login.
export async function proxy(request: NextRequest) {
  if (OPEN_PATHS.includes(request.nextUrl.pathname)) return NextResponse.next({ request });
  let response = NextResponse.next({ request });

  const supabase = createServerClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!, {
    cookies: {
      getAll: () => request.cookies.getAll(),
      setAll: (toSet, headers) => {
        toSet.forEach(({ name, value }) => request.cookies.set(name, value));
        response = NextResponse.next({ request });
        toSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
        Object.entries(headers).forEach(([k, v]) => response.headers.set(k, v));
      },
    },
  });

  const { data } = await supabase.auth.getClaims();
  const signedIn = !!data?.claims;
  const isPublic = PUBLIC_PATHS.includes(request.nextUrl.pathname);

  if (!signedIn && !isPublic) return NextResponse.redirect(new URL("/login", request.url));
  if (signedIn && isPublic) return NextResponse.redirect(new URL("/", request.url));
  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|webp)$).*)"],
};
