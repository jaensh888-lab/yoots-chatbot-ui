'use client'

import { Turnstile } from '@marsidev/react-turnstile'
import { supabase } from '@/supabase/browser-client' // или относительный путь

export default function SoftWallPage() {
  return (
    <main className="mx-auto max-w-xl p-6">
      <h1 className="text-2xl font-semibold mb-4">Быстрый доступ</h1>

      <div className="mb-4">
        <Turnstile siteKey={process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY!} />
      </div>

      <button
        className="rounded bg-blue-600 px-4 py-2 text-white"
        onClick={async () => {
          // анонимный вход
          const { error } = await supabase.auth.signInAnonymously()
          if (error) {
            alert(error.message)
            return
          }
          window.location.href = '/'
        }}
      >
        Продолжить как гость
      </button>
    </main>
  )
}
