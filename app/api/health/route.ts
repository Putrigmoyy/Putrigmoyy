import { NextResponse } from 'next/server';
import { getPusatPanelMeta } from '@/lib/pusatpanel';

export async function GET() {
  const provider = getPusatPanelMeta();
  return NextResponse.json({
    ok: true,
    app: 'putri-gmoyy-web-store',
    smmConfigured: provider.configured,
    smmApiUrl: provider.apiUrl,
  });
}
