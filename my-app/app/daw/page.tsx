// app/daw/page.tsx
import DawShell from '@/components/daw/DawShell';
import { SongSpecProvider } from '@/lib/song-spec-context';

export default function DawPage() {
  return (
    <SongSpecProvider>
      <DawShell />
    </SongSpecProvider>
  );
}
