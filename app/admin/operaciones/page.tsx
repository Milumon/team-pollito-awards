import LegacyAdminPanel from '@/components/admin/LegacyAdminPanel';

type Props = {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
};

export default async function LegacyAdminOperationsPage({ searchParams }: Props) {
  const params = await searchParams;
  const section = typeof params.seccion === 'string' ? params.seccion : undefined;

  return (
    <LegacyAdminPanel
      initialTab={
        section === 'postulaciones'
          ? 'applications'
          : section === 'multimedia'
            ? 'media-submissions'
            : 'dashboard'
      }
    />
  );
}
