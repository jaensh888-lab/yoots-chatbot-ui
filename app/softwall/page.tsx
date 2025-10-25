'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Turnstile from 'react-turnstile'
import { supabase } from '@/supabase/browser-client'

export default function SoftwallPage() {
  const router = useRouter()
  const [token, setToken] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  const goAsGuest = async () => {
    if (!token) return
    setLoading(true)

    // Если хочешь строго — сначала POST на свой API /api/turnstile-verify,
    // который проверит токен сервером, а уже затем signInAnonymously ниже.

    const { error } = await supabase.auth.signInAnonymously()
    if (error) {
      alert(error.message)
      setLoading(false)
      return
    }

    router.replace('/chat')
  }

  return (
    <main className="mx-auto max-w-md p-6 space-y-6">
      <h1 className="text-2xl font-semibold">Быстрый вход</h1>
      <p className="text-sm opacity-75">
        Продолжи как гость — без регистрации. Позже ты сможешь привязать email.
      </p>

      <Turnstile
        sitekey={process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY!}
        onVerify={(t) => setToken(t)}
      />

      <button
        className="btn btn-primary w-full disabled:opacity-50"
        disabled={!token || loading}
        onClick={goAsGuest}
      >
        Продолжить как гость
      </button>

      <div className="text-sm text-center">
        или <a href="/login" className="underline">войти/зарегистрироваться</a>
      </div>
    </main>
  )
}
