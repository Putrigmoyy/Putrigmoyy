import { notFound } from 'next/navigation';
import { TempMailBrowser } from '@/app/temp-mail/temp-mail-browser';
import { getTempMailConfigSnapshot, getTempMailPrivateKey } from '@/lib/temp-mail';

type TempMailPageProps = {
  params: Promise<{
    accessKey: string;
  }>;
};

export default async function TempMailPrivatePage({ params }: TempMailPageProps) {
  const { accessKey } = await params;
  const expectedKey = getTempMailPrivateKey();

  if (!expectedKey || accessKey !== expectedKey) {
    notFound();
  }

  return <TempMailBrowser initialConfig={getTempMailConfigSnapshot()} />;
}
