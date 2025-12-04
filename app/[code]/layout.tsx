import { Metadata } from 'next';

type Props = {
  children: React.ReactNode;
  params: Promise<{ code: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { code } = await params;

  return {
    manifest: `/api/manifest/${code}`,
  };
}

export default function CustomerLayout({ children }: Props) {
  return <>{children}</>;
}
