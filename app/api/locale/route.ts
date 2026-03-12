import { NextRequest, NextResponse } from 'next/server';

const SUPPORTED_LOCALES = ['zh-TW', 'en'];

export async function POST(request: NextRequest) {
  const { locale } = await request.json();

  if (!locale || !SUPPORTED_LOCALES.includes(locale)) {
    return NextResponse.json({ error: 'Invalid locale' }, { status: 400 });
  }

  const response = NextResponse.json({ locale });
  response.cookies.set('NEXT_LOCALE', locale, {
    path: '/',
    maxAge: 60 * 60 * 24 * 365,
    sameSite: 'lax',
  });

  return response;
}
