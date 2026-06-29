'use client';

import { useAudio } from '@/context/AudioContext';

interface AudioPlayerProps {
  moduleId: string;
  title: string;
  markdownContent: string;
  initialProgress?: number;
}

export default function AudioPlayer({ moduleId, title, markdownContent, initialProgress = 0 }: AudioPlayerProps) {
  const { currentTrackTitle, isPlaying, playTrack, togglePlayPause, isLoading } = useAudio();

  const isThisTrackActive = currentTrackTitle === title;

  const handlePlayClick = () => {
    if (isThisTrackActive) {
      togglePlayPause();
    } else {
      playTrack(moduleId, title, markdownContent, initialProgress);
    }
  };

  return (
    <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', background: 'rgba(0,0,0,0.05)', padding: '0.5rem 1rem', borderRadius: '8px', marginBottom: '1rem' }}>
      <button 
        onClick={handlePlayClick}
        disabled={isThisTrackActive && isLoading}
        style={{ padding: '0.25rem 0.75rem', background: 'var(--primary)', color: 'white', border: 'none', borderRadius: '4px', cursor: (isThisTrackActive && isLoading) ? 'wait' : 'pointer', opacity: (isThisTrackActive && isLoading) ? 0.7 : 1 }}
      >
        {isThisTrackActive && isLoading ? '⏳ Loading...' : (isThisTrackActive && isPlaying) ? '⏸ Pause' : '▶️ Listen'}
      </button>
      
      <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginLeft: 'auto' }}>
        {isThisTrackActive && isPlaying ? 'Playing globally...' : 'Commute Mode'}
      </span>
    </div>
  );
}
