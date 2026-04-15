import { redirect } from 'next/navigation';

export const dynamic = 'force-dynamic';

type PageProps = {
  searchParams?: Promise<{
    tab?: string | string[];
  }>;
};

export default async function AccountCenterPage({ searchParams }: PageProps) {
  await searchParams;
  redirect('/');
}
