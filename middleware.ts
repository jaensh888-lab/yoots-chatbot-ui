import { createClient } from '@/lib/supabase/middleware'
import { NextResponse, type NextRequest } from 'next/server'
import { i18nRouter } from 'next-i18n-router'
import i18nConfig from './i18nConfig'

// пути, которые доступны без авторизации
const PUBLIC_PATHS: RegExp[] = [
  /^\/(?:ru|en|kk)?\/softwall\/?$/i,
  /^\/(?:ru|en|kk)?\/login\/?$/i,
  /^\/(?:ru|en|kk)?\/signup\/?$/i,
  /^\/_next\//,
  /^\/api\/public/,
  /^\/favicon\.ico$/i,
  /^\/robots\.txt$/i,
  /^\/sitemap\.xml$/i,
]

export async function middleware(request: NextRequest) {
  // Сначала i18n-роутер (он может вернуть rewrite/redirect)
  const i18nResponse = i18nRouter(request, i18nConfig)
  if (i18nResponse) return i18nResponse

  const { nextUrl } = request
  const pathname = nextUrl.pathname

  // Разрешаем публичные пути (в т.ч. /softwall)
  if (PUBLIC_PATHS.some((re) => re.test(pathname))) {
    return NextResponse.next()
  }

  // Проверяем сессию
  const supabase = createClient(request)
  const {
    data: { session },
  } = await supabase.auth.getSession()

  // Нет сессии — отправляем на мягкую стенку
  if (!session) {
    const url = new URL(`/softwall`, request.url)
    return NextResponse.redirect(url)
  }

  // Сессия есть — пропускаем дальше
  return NextResponse.next()
}

// matcher определяет, где вообще запускается middleware
export const config = {
  // исключаем статику и тех.файлы, остальное перехватываем
  matcher: ['/((?!_next/static|_next/image|favicon.ico|robots.txt|sitemap.xml).*)'],
}
