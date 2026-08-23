import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { hasSupabaseConfig, publicSupabaseConfig } from "@/lib/supabase/config";

const publicRoutes = ["/entrar", "/cadastro", "/recuperar-acesso", "/offline"];

export async function proxy(request: NextRequest) {
  const isPublic = publicRoutes.some((route) => request.nextUrl.pathname.startsWith(route));
  const isApi = request.nextUrl.pathname.startsWith("/api/");

  // Falha fechada: uma configuração ausente nunca pode liberar as telas privadas.
  if (!hasSupabaseConfig()) {
    if (!isPublic && !isApi) return NextResponse.redirect(new URL("/entrar", request.url));
    return NextResponse.next();
  }
  const { url, publishableKey } = publicSupabaseConfig();
  let response = NextResponse.next({ request });
  const supabase = createServerClient(url, publishableKey, {
    cookies: {
      getAll: () => request.cookies.getAll(),
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
        response = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
        response.headers.set("Cache-Control", "private, no-store");
      },
    },
  });

  const { data } = await supabase.auth.getClaims();
  const authenticated = Boolean(data?.claims?.sub);
  if (!authenticated && !isPublic && !isApi) return NextResponse.redirect(new URL("/entrar", request.url));
  if (authenticated && isPublic && request.nextUrl.pathname !== "/offline") return NextResponse.redirect(new URL("/", request.url));
  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|icon|manifest.webmanifest|sw.js|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)"],
};
