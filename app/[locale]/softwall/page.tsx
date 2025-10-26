"use client"

import { useRouter } from "next/navigation"
import { useState } from "react"
import dynamic from "next/dynamic"
import { supabase } from "@/supabase/browser-client"

const Turnstile = dynamic(() => import("@marsidev/react-turnstile"), {
  ssr: false
})

export default function SoftwallPage() {
  const router = useRouter()
  const [token, setToken] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  const continueAsGuest = async () => {
    // если включил Turnstile — потребуем токен
    // если нет — просто убери эту проверку
    // if (!token) return;

    try {
      setBusy(true)

      // Анонимный вход
      const { data, error } = await supabase.auth.signInAnonymously()
      if (error) throw error

      // Гарантируем домашний воркспейс
      const userId = data.user?.id!
      const { data: home } = await supabase
        .from("workspaces")
        .select("id")
        .eq("user_id", userId)
        .eq("is_home", true)
        .single()

      let workspaceId = home?.id
      if (!workspaceId) {
        const { data: created, error: createErr } = await supabase
          .from("workspaces")
          .insert({
            user_id: userId,
            name: "My Workspace",
            is_home: true
          })
          .select("id")
          .single()
        if (createErr) throw createErr
        workspaceId = created.id
      }

      router.replace(`/${workspaceId}/chat`)
    } catch (e) {
      console.error(e)
      alert("Не получилось зайти гостем.")
    } finally {
      setBusy(false)
    }
  }

  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-6 p-6">
      <h1 className="text-3xl font-semibold">Добро пожаловать 👋</h1>
      <p className="text-muted-foreground max-w-[560px] text-center">
        Можно просто попробовать без регистрации. Позже попросим создать
        аккаунт, чтобы сохранить прогресс.
      </p>

      {/* Закомментируй этот блок, если Turnstile пока не нужен */}
      <div className="w-[300px]">
        <Turnstile
          siteKey={process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY!}
          onSuccess={t => setToken(t)}
          options={{ theme: "dark" }}
        />
      </div>

      <button
        onClick={continueAsGuest}
        disabled={busy}
        className="rounded-xl bg-blue-600 px-5 py-2.5 text-white hover:bg-blue-500 disabled:opacity-50"
      >
        {busy ? "Входим…" : "Продолжить как гость"}
      </button>
    </main>
  )
}
