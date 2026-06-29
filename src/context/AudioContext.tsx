'use client';

import React, { createContext, useContext, useState, useRef, useEffect } from 'react';

interface AudioContextType {
  isPlaying: boolean;
  isLoading: boolean;
  currentTrackTitle: string | null;
  rate: number;
  playTrack: (title: string, markdownContent: string) => Promise<void>;
  togglePlayPause: () => void;
  stopTrack: () => void;
  changeRate: () => void;
}

const AudioContext = createContext<AudioContextType | undefined>(undefined);

export function AudioProvider({ children }: { children: React.ReactNode }) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [currentTrackTitle, setCurrentTrackTitle] = useState<string | null>(null);
  const [rate, setRate] = useState(1);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Clean up markdown before sending to TTS
  const cleanMarkdownForAudio = (md: string) => {
    return md
      .replace(/#/g, '')
      .replace(/\*/g, '')
      .replace(/`/g, '')
      .replace(/\[(.*?)\]\(.*?\)/g, '$1')
      .trim();
  };

  const playTrack = async (title: string, markdownContent: string) => {
    // If the same track is requested and we have it, just resume
    if (currentTrackTitle === title && audioRef.current) {
      if (audioRef.current.paused) {
        audioRef.current.play();
        setIsPlaying(true);
      }
      return;
    }

    // Stop current track if any
    stopTrack();
    
    setIsLoading(true);
    setCurrentTrackTitle(title);

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
    setCurrentTrackTitle(null);
  };

  const changeRate = () => {
    const nextRate = rate === 1 ? 1.5 : rate === 1.5 ? 2 : 1;
    setRate(nextRate);
    if (audioRef.current) {
      audioRef.current.playbackRate = nextRate;
    }
  };

  useEffect(() => {
    return () => {
      stopTrack();
    };
  }, []);

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
