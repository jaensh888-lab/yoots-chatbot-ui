import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  const { token } = await req.json();

  const form = new URLSearchParams();
  form.append('secret', process.env.TURNSTILE_SECRET_KEY!);
  form.append('response', token ?? '');

  const verify = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
    method: 'POST',
    body: form
  });

  const data = await verify.json();
  // data.success === true  → человек
  return NextResponse.json({ success: !!data.success });
}
