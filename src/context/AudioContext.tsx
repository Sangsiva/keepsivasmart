'use client';

import React, { createContext, useContext, useState, useRef, useEffect } from 'react';

interface AudioContextType {
  isPlaying: boolean;
  isLoading: boolean;
  currentTrackTitle: string | null;
  rate: number;
  playTrack: (moduleId: string, title: string, markdownContent: string, initialProgress?: number) => Promise<void>;
  togglePlayPause: () => void;
  stopTrack: () => void;
  changeRate: () => void;
}

const AudioContext = createContext<AudioContextType | undefined>(undefined);

export function AudioProvider({ children }: { children: React.ReactNode }) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [currentModuleId, setCurrentModuleId] = useState<string | null>(null);
  const [currentTrackTitle, setCurrentTrackTitle] = useState<string | null>(null);
  const [rate, setRate] = useState(1);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const lastSavedProgressRef = useRef<number>(0);

  // Clean up markdown before sending to TTS
  const cleanMarkdownForAudio = (md: string) => {
    return md
      .replace(/#/g, '')
      .replace(/\*/g, '')
      .replace(/`/g, '')
      .replace(/\[(.*?)\]\(.*?\)/g, '$1')
      .trim();
  };

  const playTrack = async (moduleId: string, title: string, markdownContent: string, initialProgress: number = 0) => {
    // If the same track is requested and we have it, just resume
    if (currentModuleId === moduleId && audioRef.current) {
      if (audioRef.current.paused) {
        audioRef.current.play();
        setIsPlaying(true);
      }
      return;
    }

    // Stop current track if any
    stopTrack();
    
    setIsLoading(true);
    setCurrentModuleId(moduleId);
    setCurrentTrackTitle(title);
    lastSavedProgressRef.current = initialProgress;

    try {
      const res = await fetch('/api/tts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: markdownContent })
      });

      if (res.status === 404) {
        console.log('No OpenAI key found, falling back to Web Speech API');
        playFallback(markdownContent);
        return;
      }

      if (!res.ok) throw new Error('Failed to generate TTS');

      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const audio = new Audio(url);
      
      audio.playbackRate = rate;
      audio.currentTime = initialProgress;
      audio.onended = () => setIsPlaying(false);
      audio.play();
      
      audioRef.current = audio;
      setIsPlaying(true);
    } catch (e) {
      console.error('TTS Error:', e);
      playFallback(markdownContent);
    } finally {
      setIsLoading(false);
    }
  };

  const playFallback = (content: string) => {
    const text = cleanMarkdownForAudio(content);
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = rate;
    utterance.onend = () => setIsPlaying(false);
    window.speechSynthesis.speak(utterance);
    setIsPlaying(true);
  };

  const togglePlayPause = () => {
    if (audioRef.current) {
      if (isPlaying) {
        audioRef.current.pause();
        setIsPlaying(false);
      } else {
        audioRef.current.play();
        setIsPlaying(true);
      }
    } else {
      if (isPlaying) {
        window.speechSynthesis.pause();
        setIsPlaying(false);
      } else {
        window.speechSynthesis.resume();
        setIsPlaying(true);
      }
    }
  };

  const stopTrack = () => {
    window.speechSynthesis.cancel();
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
      audioRef.current = null;
    }
    setIsPlaying(false);
    setCurrentModuleId(null);
    setCurrentTrackTitle(null);
    lastSavedProgressRef.current = 0;
  };

  const changeRate = () => {
    const nextRate = rate === 1 ? 1.5 : rate === 1.5 ? 2 : 1;
    setRate(nextRate);
    if (audioRef.current) {
      audioRef.current.playbackRate = nextRate;
    }
  };

  useEffect(() => {
    // Sync progress to DB every 5 seconds
    const interval = setInterval(async () => {
      if (isPlaying && audioRef.current && currentModuleId) {
        const currentProgress = Math.floor(audioRef.current.currentTime);
        // Only save if progress has changed by at least 3 seconds to avoid spam
        if (Math.abs(currentProgress - lastSavedProgressRef.current) >= 3) {
          lastSavedProgressRef.current = currentProgress;
          try {
            await fetch(`/api/modules/${currentModuleId}/progress`, {
              method: 'PATCH',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ progressSeconds: currentProgress })
            });
          } catch (err) {
            console.error('Failed to sync audio progress:', err);
          }
        }
      }
    }, 5000);

    return () => {
      clearInterval(interval);
      stopTrack();
    };
  }, [isPlaying, currentModuleId]);

  return (
    <AudioContext.Provider value={{
      isPlaying,
      isLoading,
      currentTrackTitle,
      rate,
      playTrack,
      togglePlayPause,
      stopTrack,
      changeRate
    }}>
      {children}
    </AudioContext.Provider>
  );
}

export function useAudio() {
  const context = useContext(AudioContext);
  if (context === undefined) {
    throw new Error('useAudio must be used within an AudioProvider');
  }
  return context;
}
