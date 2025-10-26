import { createClient } from "@/lib/supabase/middleware";
import { i18nRouter } from "next-i18n-router";
import i18nConfig from "./i18nConfig";
import { NextRequest, NextResponse } from "next/server";

// Путь, который пропускаем без проверки сессии
const PUBLIC_PATHS = [
  /^\/softwall\/?$/,
  /^\/(ru|en|kk)\/softwall\/?$/,
  /^\/_next\//,
  /^\/api\/public/,
  /^\/favicon\.ico$/,
  /^\/robots\.txt$/
];

export async function middleware(request: NextRequest) {
  // Сначала i18n
  const i18n = i18nRouter(request, i18nConfig);
  if (i18n) return i18n;

  const { pathname } = request.nextUrl;

  // Мягкая стенка и прочие public пути — пропускаем без auth-гейта
  if (PUBLIC_PATHS.some((re) => re.test(pathname))) {
    return NextResponse.next();
  }

  // Всё остальное: стандартная логика
  const { supabase, response } = createClient(request);

  const { data: { session } } = await supabase.auth.getSession();

  // Редиректим корень авторизованного на домашний чат
  if (session && pathname === "/") {
    const { data: homeWorkspace } = await supabase
      .from("workspaces")
      .select("id")
      .eq("user_id", session.user.id)
      .eq("is_home", true)
      .single();

    if (homeWorkspace?.id) {
      return NextResponse.redirect(new URL(`/${homeWorkspace.id}/chat`, request.url));
    }
  }

  return response;
}

// Обрабатываем все пути, кроме статичных и _next
export const config = {
  matcher: ["/((?!static|.*\\..*|_next).*)"]
};
