'use client';

import { useState, useEffect, useRef } from 'react';

interface AudioPlayerProps {
  markdownContent: string;
}

export default function AudioPlayer({ markdownContent }: AudioPlayerProps) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [rate, setRate] = useState(1);
  const synthRef = useRef<SpeechSynthesis | null>(null);

  useEffect(() => {
    synthRef.current = window.speechSynthesis;
    
    // Stop speaking if component unmounts
    return () => {
      if (synthRef.current) {
        synthRef.current.cancel();
      }
    };
  }, []);

  const cleanMarkdownForAudio = (md: string) => {
    // Remove markdown symbols (hashes, stars, codeblocks) for smoother listening
    return md
      .replace(/#/g, '')
      .replace(/\\*/g, '')
      .replace(/`/g, '')
      .replace(/\\[(.*?)\\]\\(.*?\\)/g, '$1') // Remove markdown links but keep text
      .trim();
  };

  const handlePlayPause = () => {
    if (!synthRef.current) return;

    if (isPlaying) {
      synthRef.current.pause();
      setIsPlaying(false);
    } else {
      if (synthRef.current.paused) {
        synthRef.current.resume();
      } else {
        const text = cleanMarkdownForAudio(markdownContent);
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.rate = rate;
        
        utterance.onend = () => {
          setIsPlaying(false);
        };
        
        synthRef.current.speak(utterance);
      }
      setIsPlaying(true);
    }
  };

  const handleStop = () => {
    if (synthRef.current) {
      synthRef.current.cancel();
      setIsPlaying(false);
    }
  };

  const handleRateChange = () => {
    const nextRate = rate === 1 ? 1.5 : rate === 1.5 ? 2 : 1;
    setRate(nextRate);
    
    // If playing, we have to restart the utterance to apply the new rate
    if (isPlaying && synthRef.current) {
      synthRef.current.cancel();
      const text = cleanMarkdownForAudio(markdownContent);
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.rate = nextRate;
      utterance.onend = () => setIsPlaying(false);
      synthRef.current.speak(utterance);
    }
  };

  return (
    <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', background: 'rgba(0,0,0,0.05)', padding: '0.5rem 1rem', borderRadius: '8px', marginBottom: '1rem' }}>
      <button 
        onClick={handlePlayPause}
        style={{ padding: '0.25rem 0.75rem', background: 'var(--primary)', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
      >
        {isPlaying ? '⏸ Pause' : '▶️ Listen'}
      </button>
      
      {isPlaying && (
        <button 
          onClick={handleStop}
          style={{ padding: '0.25rem 0.75rem', background: '#ff4444', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
        >
          ⏹ Stop
        </button>
      )}
      
      <button 
        onClick={handleRateChange}
        style={{ padding: '0.25rem 0.5rem', background: '#e0e0e0', color: '#333', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '0.8rem' }}
      >
        {rate}x Speed
      </button>
      
      <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginLeft: 'auto' }}>
        Commute Mode
      </span>
    </div>
  );
}
