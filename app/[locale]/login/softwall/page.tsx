// app/softwall/page.tsx
'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Turnstile } from '@marsidev/react-turnstile'; // React-обертка Turnstile
import { supabase } from '@/supabase/browser-client';   // твой файл клиента

export default function SoftwallPage() {
  const router = useRouter();
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function continueAsGuest() {
    setErr(null);
    setLoading(true);
    try {
      // опционально: можно проверить token на сервере своим API-роутом
      if (!token) {
        setErr('Подтвердите, что вы не робот.');
        setLoading(false);
        return;
      }
      const { error } = await supabase.auth.signInAnonymously();
      if (error) throw error;
      router.push('/chat'); // куда пускаем гостя после входа
    } catch (e: any) {
      setErr(e.message ?? 'Не удалось войти гостем');
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="mx-auto max-w-md p-6 space-y-6">
      <h1 className="text-2xl font-semibold">Добро пожаловать!</h1>
      <p className="text-sm opacity-80">
        Вы можете продолжить как гость (без регистрации). Некоторые функции могут быть недоступны.
      </p>

      {/* Виджет Turnstile */}
      <Turnstile
        siteKey={process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY!}
        onSuccess={(t) => setToken(t)}
        options={{ refreshExpired: 'auto' }}
      />

      <button
        onClick={continueAsGuest}
        disabled={loading}
        className="w-full rounded-lg py-2 font-medium bg-white/10 hover:bg-white/20"
      >
        {loading ? 'Входим…' : 'Продолжить как гость'}
      </button>

      {err && <p className="text-red-400 text-sm">{err}</p>}

      <hr className="opacity-20" />

      <p className="text-sm opacity-80">
        Или <a className="underline" href="/login">войдите / зарегистрируйтесь</a>,
        чтобы открыть полный функционал.
      </p>
    </main>
  );
}
