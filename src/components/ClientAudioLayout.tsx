'use client';

import React from 'react';
import { AudioProvider, useAudio } from '@/context/AudioContext';

function MiniPlayer() {
  const { currentTrackTitle, isPlaying, isLoading, togglePlayPause, stopTrack, rate, changeRate } = useAudio();

  if (!currentTrackTitle) return null;

  return (
    <div style={{
      position: 'fixed',
      bottom: '20px',
      left: '50%',
      transform: 'translateX(-50%)',
      background: 'rgba(255, 255, 255, 0.9)',
      backdropFilter: 'blur(10px)',
      boxShadow: '0 10px 25px rgba(0,0,0,0.1)',
      borderRadius: '50px',
      padding: '0.75rem 1.5rem',
      display: 'flex',
      alignItems: 'center',
      gap: '1rem',
      zIndex: 1000,
      border: '1px solid #eaeaea',
      maxWidth: '90%',
      minWidth: '350px'
    }}>
      <div style={{ flex: 1, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
        <span style={{ fontWeight: 'bold', fontSize: '0.9rem' }}>{currentTrackTitle}</span>
        <div style={{ fontSize: '0.75rem', color: '#888' }}>Playing via KeepSivaSmart AI</div>
      </div>
      
      <button 
        onClick={togglePlayPause}
        disabled={isLoading}
        style={{ width: '40px', height: '40px', borderRadius: '50%', background: 'var(--primary)', color: 'white', border: 'none', cursor: isLoading ? 'wait' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
      >
        {isLoading ? '⏳' : isPlaying ? '⏸' : '▶️'}
      </button>

      <button onClick={stopTrack} style={{ background: 'transparent', border: 'none', cursor: 'pointer', fontSize: '1.2rem' }}>
        ⏹
      </button>

      <button onClick={changeRate} style={{ background: '#f5f5f5', border: 'none', padding: '0.25rem 0.5rem', borderRadius: '12px', fontSize: '0.8rem', cursor: 'pointer' }}>
        {rate}x
      </button>
    </div>
  );
}

export default function ClientAudioLayout({ children }: { children: React.ReactNode }) {
  return (
    <AudioProvider>
      {children}
      <MiniPlayer />
    </AudioProvider>
  );
}
