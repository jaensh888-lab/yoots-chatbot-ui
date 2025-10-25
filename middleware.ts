import { createClient } from "@/lib/supabase/middleware"
import { i18nRouter } from "next-i18n-router"
import { NextResponse, type NextRequest } from "next/server"
import i18nConfig from "./i18nConfig"

// middleware.ts
import { NextResponse, type NextRequest } from 'next/server'
import createClient from '@/lib/supabase/middleware' // как у тебя было
import { i18nRouter } from 'next-i18n-router'
import i18nConfig from './i18nConfig'

const PUBLIC_PATHS = [
  /^\/_next\//,
  /^\/api\/public/,
  /^\/(ru|en|kk)?\/softwall\/?$/, // ← страница «мягкой стенки»
];

function isPublicPath(pathname: string) {
  return PUBLIC_PATHS.some((re) => re.test(pathname));
}
export async function middleware(request: NextRequest) {
  if (isPublicPath(request.nextUrl.pathname)) {
    return NextResponse.next();
  }

  // ... существующая логика Supabase/session + ваши редиректы
}


const PUBLIC_PATHS = [
  /^\/_next\//,
  /^\/api\/public/,
  /^\/(ru|en|kk)?\/softwall\/?$/,   // страница «мягкой стенки»
]

export async function middleware(request: NextRequest) {
  // 1) если путь публичный — пропускаем сразу
  const { pathname } = request.nextUrl
  if (PUBLIC_PATHS.some((re) => re.test(pathname))) {
    return NextResponse.next()
  }

  // 2) остальная твоя логика (локализация, Supabase, редирект на чат и т.д.)
  const i18nResult = i18nRouter(request, i18nConfig)
  if (i18nResult) return i18nResult

  try {
    const { supabase, response } = createClient(request)
    const { data: { session } } = await supabase.auth.getSession()

    // Если нет сессии — здесь, вероятно, у тебя редирект на /login:
    if (!session) {
      return NextResponse.redirect(new URL('/login', request.url))
    }

    return response
  } catch {
    return NextResponse.next()
  }
}

export const config = {
  // matcher можно оставить как был (главное, чтобы /softwall не перехватывался)
  // Пример:
  matcher: ['/((?!_next|api|static|.*\\..*).*)'],
}



// --- PUBLIC PATHS (можно без авторизации) -------------------
const PUBLIC_PATHS = [
  /^\/_next\//,                 // статика Next.js
  /^\/api\/public/,             // твои публичные API (если есть)
  /^\/(ru|en|kk)?\/softwall\/?$/ // страница "мягкой стенки", с локалями
];

const isPublicPath = (pathname: string) =>
  PUBLIC_PATHS.some((re) => re.test(pathname));
// -------------------------------------------------------------


export async function middleware(request: NextRequest) {
  const i18nResult = i18nRouter(request, i18nConfig)
  if (i18nResult) return i18nResult
const { pathname } = request.nextUrl;

// если путь публичный — пропускаем дальше без проверок
if (isPublicPath(pathname)) {
  return NextResponse.next();
}

  try {
    const { supabase, response } = createClient(request)

    const session = await supabase.auth.getSession()

    const redirectToChat = session && request.nextUrl.pathname === "/"

    if (redirectToChat) {
      const { data: homeWorkspace, error } = await supabase
        .from("workspaces")
        .select("*")
        .eq("user_id", session.data.session?.user.id)
        .eq("is_home", true)
        .single()

      if (!homeWorkspace) {
        throw new Error(error?.message)
      }

      return NextResponse.redirect(
        new URL(`/${homeWorkspace.id}/chat`, request.url)
      )
    }

    return response
  } catch (e) {
    return NextResponse.next({
      request: {
        headers: request.headers
      }
    })
  }
}

export const config = {
  matcher: "/((?!api|static|.*\\..*|_next|auth).*)"
}
