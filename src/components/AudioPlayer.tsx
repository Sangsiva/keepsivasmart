'use client';

import { useAudio } from '@/context/AudioContext';

interface AudioPlayerProps {
  moduleId: string;
  title: string;
  markdownContent: string;
  initialProgress?: number;
}

export default function AudioPlayer({ moduleId, title, markdownContent, initialProgress = 0 }: AudioPlayerProps) {
  const { currentTrackTitle, isPlaying, playTrack, togglePlayPause, isLoading, moduleProgress } = useAudio();

  const isThisTrackActive = currentTrackTitle === title;
  
  // Use the global context progress if we've played it this session, otherwise fallback to DB initial progress
  const activeProgress = moduleProgress[moduleId] ?? initialProgress;

  const handlePlayClick = () => {
    if (isThisTrackActive) {
      togglePlayPause();
    } else {
      playTrack(moduleId, title, markdownContent, 0); // Always start from beginning if "Listen" is clicked
    }
  };

  const handleResumeClick = () => {
    playTrack(moduleId, title, markdownContent, activeProgress);
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', background: 'rgba(0,0,0,0.05)', padding: '0.5rem 1rem', borderRadius: '8px', marginBottom: '1rem' }}>
      <button 
        onClick={handlePlayClick}
        disabled={isThisTrackActive && isLoading}
        style={{ padding: '0.25rem 0.75rem', background: 'var(--primary)', color: 'white', border: 'none', borderRadius: '4px', cursor: (isThisTrackActive && isLoading) ? 'wait' : 'pointer', opacity: (isThisTrackActive && isLoading) ? 0.7 : 1 }}
      >
        {isThisTrackActive && isLoading ? '⏳ Loading...' : (isThisTrackActive && isPlaying) ? '⏸ Pause' : '▶️ Listen from Start'}
      </button>
      
      <button 
        onClick={handleResumeClick}
        disabled={activeProgress === 0}
        style={{ 
          padding: '0.25rem 0.75rem', 
          background: activeProgress > 0 ? 'var(--secondary)' : '#e0e0e0', 
          color: activeProgress > 0 ? 'white' : '#9e9e9e', 
          border: 'none', 
          borderRadius: '4px', 
          cursor: activeProgress > 0 ? 'pointer' : 'not-allowed',
          opacity: activeProgress > 0 ? 1 : 0.7
        }}
      >
        📖 Resume from {activeProgress > 0 ? formatTime(activeProgress) : 'last left'}
      </button>
      
      <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginLeft: 'auto' }}>
        {isThisTrackActive && isPlaying ? 'Playing globally...' : 'Commute Mode'}
      </span>
    </div>
  );
}
