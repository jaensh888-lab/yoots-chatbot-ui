// app/[locale]/login/page.tsx
import { Brand } from "@/components/ui/brand"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { SubmitButton } from "@/components/ui/submit-button"
import { createClient } from "@/lib/supabase/server"
import { Database } from "@/supabase/types"
import { createServerClient } from "@supabase/ssr"
import { get } from "@vercel/edge-config"
import type { Metadata } from "next"
import { cookies, headers } from "next/headers"
import { redirect } from "next/navigation"

export const metadata: Metadata = { title: "Login" }

export default async function Login({
  searchParams
}: { searchParams: { message?: string } }) {
  // SSR: если сессия есть — в чат
  const cookieStore = cookies()
  const supabaseSSR = createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: { get(name: string) { return cookieStore.get(name)?.value } }
    }
  )
  const session = (await supabaseSSR.auth.getSession()).data.session
  if (session) {
    const { data: homeWorkspace, error } = await supabaseSSR
      .from("workspaces").select("*")
      .eq("user_id", session.user.id).eq("is_home", true).single()
    if (!homeWorkspace) throw new Error(error?.message ?? "Workspace not found")
    return redirect(`/${homeWorkspace.id}/chat`)
  }

  // ----- server actions -----

  const signIn = async (formData: FormData) => {
    "use server"
    const email = formData.get("email") as string
    const password = formData.get("password") as string
    const cookieStore = cookies()
    const supabase = createClient(cookieStore)

    const { data, error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) return redirect(`/login?message=${encodeURIComponent(error.message)}`)

    const { data: homeWorkspace, error: hwErr } = await supabase
      .from("workspaces").select("*")
      .eq("user_id", data.user.id).eq("is_home", true).single()
    if (!homeWorkspace) throw new Error(hwErr?.message || "An unexpected error occurred")
    return redirect(`/${homeWorkspace.id}/chat`)
  }

  const getEnvVarOrEdgeConfigValue = async (name: string) => {
    "use server"
    if (process.env.EDGE_CONFIG) return await get<string>(name)
    return process.env[name]
  }

  const signUp = async (formData: FormData) => {
    "use server"
    const email = formData.get("email") as string
    const password = formData.get("password") as string

    const emailDomainWhitelistPatternsString = await getEnvVarOrEdgeConfigValue("EMAIL_DOMAIN_WHITELIST")
    const emailDomainWhitelist = emailDomainWhitelistPatternsString?.trim()
      ? emailDomainWhitelistPatternsString.split(",") : []

    const emailWhitelistPatternsString = await getEnvVarOrEdgeConfigValue("EMAIL_WHITELIST")
    const emailWhitelist = emailWhitelistPatternsString?.trim()
      ? emailWhitelistPatternsString.split(",") : []

    if (emailDomainWhitelist.length > 0 || emailWhitelist.length > 0) {
      const domainMatch = emailDomainWhitelist.includes(email.split("@")[1])
      const emailMatch = emailWhitelist.includes(email)
      if (!domainMatch && !emailMatch) {
        return redirect(`/login?message=${encodeURIComponent(`Email ${email} is not allowed to sign up.`)}`)
      }
    }

    const cookieStore = cookies()
    const supabase = createClient(cookieStore)
    const { error } = await supabase.auth.signUp({ email, password })
    if (error) return redirect(`/login?message=${encodeURIComponent(error.message)}`)
    return redirect("/setup")
  }

  const signInAnonymously = async () => {
    "use server"
    const cookieStore = cookies()
    const supabase = createClient(cookieStore)

    // официальный API: создаёт анонимного пользователя
    const { error } = await supabase.auth.signInAnonymously()
    if (error) return redirect(`/login?message=${encodeURIComponent(error.message)}`)

    // ведём к мастеру — он создаст домашний workspace
    return redirect("/setup")
  }

  const handleResetPassword = async (formData: FormData) => {
    "use server"
    const origin = headers().get("origin")
    const email = formData.get("email") as string
    const cookieStore = cookies()
    const supabase = createClient(cookieStore)
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${origin}/auth/callback?next=/login/password`
    })
    if (error) return redirect(`/login?message=${encodeURIComponent(error.message)}`)
    return redirect("/login?message=Check email to reset password")
  }

  // ----- UI -----
  return (
    <div className="flex w-full flex-1 flex-col justify-center gap-2 px-8 sm:max-w-md">
      <form className="animate-in text-foreground flex w-full flex-1 flex-col justify-center gap-2" action={signIn}>
        <Brand />

        <Label className="text-md mt-4" htmlFor="email">Email</Label>
        <Input className="mb-3 rounded-md border bg-inherit px-4 py-2" name="email" placeholder="you@example.com" required />

        <Label className="text-md" htmlFor="password">Password</Label>
        <Input className="mb-6 rounded-md border bg-inherit px-4 py-2" type="password" name="password" placeholder="••••••••" />

        <SubmitButton className="mb-2 rounded-md bg-blue-700 px-4 py-2 text-white">Login</SubmitButton>
        <SubmitButton formAction={signUp} className="border-foreground/20 mb-2 rounded-md border px-4 py-2">Sign Up</SubmitButton>

        <div className="text-muted-foreground mt-1 flex justify-center text-sm">
          <span className="mr-1">Forgot your password?</span>
          <button formAction={handleResetPassword} className="text-primary ml-1 underline hover:opacity-80">Reset</button>
        </div>

        {/* гость без регистрации — отдельная Server Action-кнопка */}
        <div className="mt-6 flex items-center justify-center">
          <button formAction={signInAnonymously} className="rounded-md border px-4 py-2">
            Продолжить без регистрации
          </button>
        </div>

        {searchParams?.message && (
          <p className="bg-foreground/10 text-foreground mt-4 p-4 text-center">{searchParams.message}</p>
        )}
      </form>
    </div>
  )
}
