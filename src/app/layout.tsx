import './globals.css';
import Link from 'next/link';
import { auth, signIn, signOut } from '@/auth';
import ClientAudioLayout from '@/components/ClientAudioLayout';
import FeedbackButton from '@/components/FeedbackButton';

export const metadata = {
  title: 'KeepSivaSmart',
  description: 'AI Learning Agent',
  manifest: '/manifest.json', // for next-pwa
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'KeepSivaSmart',
  },
  formatDetection: {
    telephone: false,
  },
};

export const viewport = {
  themeColor: '#ffffff',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  
  return (
    <html lang="en">
      <body>
        <nav className="nav">
          <Link href="/dashboard">Dashboard</Link>
          <Link href="/learning-hub">Learning Hub</Link>
          <Link href="/settings">Settings</Link>
          <FeedbackButton />
          <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: '10px' }}>
            {session?.user ? (
              <>
                {session.user.image && <img src={session.user.image} alt="Avatar" style={{ width: 32, height: 32, borderRadius: '50%' }} />}
                <form action={async () => {
                  'use server';
                  await signOut();
                }}>
                  <button type="submit" className="btn-primary" style={{ padding: '0.5rem 1rem' }}>Sign Out</button>
                </form>
              </>
            ) : (
              <form action={async () => {
                'use server';
                await signIn('github');
              }}>
                <button type="submit" className="btn-primary" style={{ padding: '0.5rem 1rem' }}>Sign In with GitHub</button>
              </form>
            )}
          </div>
        </nav>
        <main style={{ padding: '2rem', maxWidth: '1000px', margin: '0 auto' }}>
          <ClientAudioLayout hasPremiumTTS={!!process.env.OPENAI_API_KEY}>
            {children}
          </ClientAudioLayout>
        </main>
      </body>
    </html>
  );
}
