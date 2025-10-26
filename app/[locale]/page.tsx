"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { useTheme } from "next-themes"
import Link from "next/link"
import { IconArrowRight } from "@tabler/icons-react"

import { ChatbotUISVG } from "@/components/icons/chatbotui-svg"
import { supabase } from "@/supabase/browser-client"
import type { Tables } from "@/supabase/types"

type WorkspaceIdRow = Pick<Tables<"workspaces">, "id">

export default function LoginPage() {
  const router = useRouter()
  const { theme } = useTheme()

  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Если уже есть сессия — сразу в домашний workspace
  useEffect(() => {
    ;(async () => {
      const { data } = await supabase.auth.getSession()
      if (data.session) {
        await goHome()
      } else {
        setLoading(false)
      }
    })()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  async function goHome() {
    try {
      const { data: ws, error } = await supabase
        .from("workspaces")
        .select("id")
        .order("created_at", { ascending: true })
        .limit(1)
        .returns<WorkspaceIdRow[]>() // подсказываем тип
        .maybeSingle()               // объект или null (без броска ошибки)
      if (error) throw error

      if (ws?.id) {
        router.push(`/${ws.id}/chat`)
      } else {
        router.push("/workspaces/new")
      }
    } catch (e: any) {
      setError(e?.message ?? "Failed to resolve workspace")
      setLoading(false)
    }
  }

  async function loginAnonymous() {
    try {
      setError(null)
      setLoading(true)
      const { error } = await supabase.auth.signInAnonymously()
      if (error) throw error
      await goHome()
    } catch (e: any) {
      setError(e?.message ?? "Anonymous sign-in failed")
      setLoading(false)
    }
  }

  return (
    <div className="flex min-h-[70vh] flex-col items-center justify-center p-6">
      <div className="mb-4">
        <ChatbotUISVG theme={theme === "dark" ? "dark" : "light"} scale={0.3} />
      </div>

      <h1 className="text-3xl font-bold">Войти в чат</h1>

      {error && (
        <div className="mt-3 rounded-md border border-red-500 px-3 py-2 text-sm text-red-600">
          {error}
        </div>
      )}

      <div className="mt-6 flex w-[260px] flex-col gap-3">
        <button
          onClick={loginAnonymous}
          disabled={loading}
          className="rounded-md bg-blue-500 p-2 font-semibold text-white disabled:opacity-60"
        >
          {loading ? "Загрузка…" : "Продолжить как гость"}
        </button>

        <Link
          href="/"
          className="mt-1 flex items-center justify-center gap-1 rounded-md border p-2 text-sm"
        >
          На главную
          <IconArrowRight size={18} />
        </Link>
      </div>
    </div>
  )
}
