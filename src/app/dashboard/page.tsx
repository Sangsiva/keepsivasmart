import { prisma } from '@/lib/prisma';
import { auth } from '@/auth';

export default async function Dashboard() {
  const session = await auth();
  const userId = session?.user?.id;
  
  if (!userId) return <div style={{ padding: '2rem' }}>Please log in.</div>;

  const profile = await prisma.userProfile.findUnique({ where: { userId } });
  const logs = profile ? await prisma.activityLog.findMany({ 
    where: { userProfileId: profile.id },
    orderBy: { date: 'desc' }, 
    take: 7 
  }) : [];
  const streak = logs.length > 0 ? logs[0].streakDays : 0;
  const totalModules = logs.reduce((acc, log) => acc + log.modulesCompleted, 0);

  return (
    <div style={{ maxWidth: '800px', margin: '0 auto', padding: '2rem', fontFamily: 'system-ui, sans-serif' }}>
      <h1 style={{ borderBottom: '2px solid #eaeaea', paddingBottom: '0.5rem' }}>Your Progress (Strava for Learning)</h1>
      
      <div style={{ display: 'flex', gap: '2rem', marginBottom: '3rem', marginTop: '2rem' }}>
        <div style={{ padding: '2rem', background: '#fff', borderRadius: '12px', textAlign: 'center', flex: 1, boxShadow: '0 4px 12px rgba(0,0,0,0.08)' }}>
          <h2 style={{ fontSize: '4rem', margin: 0, color: '#ff4500' }}>🔥 {streak}</h2>
          <p style={{ color: '#666', fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: '1px' }}>Day Streak</p>
        </div>
        <div style={{ padding: '2rem', background: '#fff', borderRadius: '12px', textAlign: 'center', flex: 1, boxShadow: '0 4px 12px rgba(0,0,0,0.08)' }}>
          <h2 style={{ fontSize: '4rem', margin: 0, color: '#0070f3' }}>📚 {totalModules}</h2>
          <p style={{ color: '#666', fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: '1px' }}>Modules Completed</p>
        </div>
      </div>
      
      <h2>Activity Heatmap (Last 7 Days)</h2>
      <div style={{ display: 'flex', gap: '15px', padding: '1.5rem', background: '#fafafa', borderRadius: '12px', border: '1px solid #eaeaea' }}>
        {Array.from({ length: 7 }).map((_, i) => {
          const isActive = logs[i]?.modulesCompleted > 0;
          return (
            <div 
              key={i} 
              title={isActive ? 'Active Day' : 'Rest Day'}
              style={{ 
                width: '40px', 
                height: '40px', 
                background: isActive ? '#4caf50' : '#e0e0e0', 
                borderRadius: '8px',
                transition: 'transform 0.2s',
                cursor: 'pointer'
              }} 
            />
          );
        })}
      </div>
    </div>
  );
}
