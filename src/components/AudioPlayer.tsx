'use client';

import { useState, useEffect, useRef } from 'react';

interface AudioPlayerProps {
  markdownContent: string;
}

export default function AudioPlayer({ markdownContent }: AudioPlayerProps) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [rate, setRate] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  const synthRef = useRef<SpeechSynthesis | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [useFallback, setUseFallback] = useState(false);

  useEffect(() => {
    synthRef.current = window.speechSynthesis;
    
    // Stop speaking if component unmounts
    return () => {
      if (synthRef.current) {
        synthRef.current.cancel();
      }
      if (audioRef.current) {
        audioRef.current.pause();
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

  const handlePlayPause = async () => {
    if (isPlaying) {
      if (audioRef.current) audioRef.current.pause();
      if (synthRef.current) synthRef.current.pause();
      setIsPlaying(false);
      return;
    }

    if (useFallback) {
      playFallback();
      return;
    }

    // If we already have the audio loaded, just resume
    if (audioRef.current) {
      audioRef.current.play();
      setIsPlaying(true);
      return;
    }

    // Otherwise, generate the audio!
    setIsLoading(true);
    try {
      const res = await fetch('/api/tts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: markdownContent })
      });

      if (res.status === 404) {
        console.log('No OpenAI key found, falling back to Web Speech API');
        setUseFallback(true);
        playFallback();
        return;
      }

      if (!res.ok) throw new Error('Failed to generate TTS');

      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const audio = new Audio(url);
      
      audio.playbackRate = rate;
      audio.onended = () => setIsPlaying(false);
      audio.play();
      
      audioRef.current = audio;
      setIsPlaying(true);
    } catch (e) {
      console.error('TTS Error:', e);
      setUseFallback(true);
      playFallback();
    } finally {
      setIsLoading(false);
    }
  };

  const playFallback = () => {
    if (!synthRef.current) return;
    
    if (synthRef.current.paused) {
      synthRef.current.resume();
    } else {
      const text = cleanMarkdownForAudio(markdownContent);
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.rate = rate;
      utterance.onend = () => setIsPlaying(false);
      synthRef.current.speak(utterance);
    }
    setIsPlaying(true);
  };

  const handleStop = () => {
    if (synthRef.current) synthRef.current.cancel();
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
    }
    setIsPlaying(false);
  };

  const handleRateChange = () => {
    const nextRate = rate === 1 ? 1.5 : rate === 1.5 ? 2 : 1;
    setRate(nextRate);
    
    if (audioRef.current) {
      audioRef.current.playbackRate = nextRate;
    } else if (isPlaying && synthRef.current) {
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
        disabled={isLoading}
        style={{ padding: '0.25rem 0.75rem', background: 'var(--primary)', color: 'white', border: 'none', borderRadius: '4px', cursor: isLoading ? 'wait' : 'pointer', opacity: isLoading ? 0.7 : 1 }}
      >
        {isLoading ? '⏳ Loading...' : isPlaying ? '⏸ Pause' : '▶️ Listen'}
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
