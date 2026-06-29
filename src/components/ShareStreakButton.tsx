'use client';

interface ShareStreakButtonProps {
  streak: number;
  totalModules: number;
}

export default function ShareStreakButton({ streak, totalModules }: ShareStreakButtonProps) {
  const handleShare = async () => {
    const text = `🔥 I'm on a ${streak}-day learning streak on KeepSivaSmart! I've completed ${totalModules} modules so far. 🧠`;
    
    if (navigator.share) {
      try {
        await navigator.share({
          title: 'My Learning Streak',
          text: text,
          url: window.location.origin,
        });
      } catch (err) {
        console.error('Error sharing:', err);
      }
    } else {
      try {
        await navigator.clipboard.writeText(text);
        alert('Streak copied to clipboard! Share it anywhere.');
      } catch (err) {
        console.error('Failed to copy!', err);
        alert('Failed to copy to clipboard.');
      }
    }
  };

  return (
    <button 
      onClick={handleShare}
      style={{
        display: 'block',
        margin: '0 auto 2rem auto',
        padding: '0.75rem 2rem',
        background: 'var(--foreground)',
        color: 'var(--background)',
        border: 'none',
        borderRadius: '50px',
        fontWeight: 'bold',
        cursor: 'pointer',
        boxShadow: '0 4px 14px rgba(0,0,0,0.1)',
        transition: 'transform 0.2s',
      }}
      onMouseOver={(e) => e.currentTarget.style.transform = 'scale(1.05)'}
      onMouseOut={(e) => e.currentTarget.style.transform = 'scale(1)'}
    >
      ↗ Share My Streak
    </button>
  );
}
