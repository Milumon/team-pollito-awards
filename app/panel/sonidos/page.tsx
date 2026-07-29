import { redirect } from 'next/navigation';

type SoundsPageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

const SOUND_TYPES = new Set(['audios', 'multimedia', 'videos']);

export default async function MemberPanelSoundsPage({ searchParams }: SoundsPageProps) {
  const values = await searchParams;
  const requestedType = values.tipo;

  if (requestedType !== undefined && (typeof requestedType !== 'string' || !SOUND_TYPES.has(requestedType))) {
    const normalizedParams = new URLSearchParams();

    Object.entries(values).forEach(([key, value]) => {
      if (key === 'tipo' || value === undefined) return;
      if (Array.isArray(value)) {
        value.forEach((entry) => normalizedParams.append(key, entry));
      } else {
        normalizedParams.set(key, value);
      }
    });
    normalizedParams.set('tipo', 'audios');
    redirect(`/panel/sonidos?${normalizedParams.toString()}`);
  }

  return null;
}
