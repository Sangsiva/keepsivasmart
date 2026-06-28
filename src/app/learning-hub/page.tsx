import { prisma } from '@/lib/prisma';
import GenerateButton from './GenerateButton';
import ModuleCard from './ModuleCard';

import { auth } from '@/auth';

export default async function LearningHub() {
  const session = await auth();
  const userId = session?.user?.id;
  
  if (!userId) return <div style={{ padding: '2rem' }}>Please log in.</div>;

  const profile = await prisma.userProfile.findUnique({ where: { userId } });
  const modules = profile ? await prisma.learningModule.findMany({
    where: { userProfileId: profile.id },
    orderBy: { createdAt: 'desc' }
  }) : [];

  return (
    <div style={{ maxWidth: '800px', margin: '0 auto', padding: '2rem', fontFamily: 'system-ui, sans-serif' }}>
      <h1 style={{ borderBottom: '2px solid #eaeaea', paddingBottom: '0.5rem' }}>Learning Hub</h1>
      
      <GenerateButton />

      {modules.length === 0 ? (
        <div style={{ padding: '2rem', textAlign: 'center', background: '#fafafa', borderRadius: '8px', color: '#666' }}>
          <p>No learning modules generated yet.</p>
          <p>Your AI assistant will curate them here daily!</p>
        </div>
      ) : (
        modules.map((mod) => (
          <ModuleCard key={mod.id} mod={mod} />
        ))
      )}
    </div>
  );
}
