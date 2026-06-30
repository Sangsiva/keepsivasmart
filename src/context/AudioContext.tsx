'use client';

import React, { createContext, useContext, useState, useRef, useEffect } from 'react';

interface AudioContextType {
  isPlaying: boolean;
  isLoading: boolean;
  currentTrackTitle: string | null;
  rate: number;
  currentTime: number;
  duration: number;
  playTrack: (moduleId: string, title: string, markdownContent: string, initialProgress?: number) => Promise<void>;
  togglePlayPause: () => void;
  stopTrack: () => void;
  changeRate: () => void;
  seekTo: (time: number) => void;
}

const AudioContext = createContext<AudioContextType | undefined>(undefined);

export function AudioProvider({ children }: { children: React.ReactNode }) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [currentModuleId, setCurrentModuleId] = useState<string | null>(null);
  const [currentTrackTitle, setCurrentTrackTitle] = useState<string | null>(null);
  const [rate, setRate] = useState(1);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const lastSavedProgressRef = useRef<number>(0);
  const currentTimeRef = useRef<number>(0);
  const durationRef = useRef<number>(0);
  const rateRef = useRef<number>(1);
  
  // Fallback specific refs
  const isFallbackRef = useRef<boolean>(false);
  const fallbackChunksRef = useRef<string[]>([]);
  const currentChunkIndexRef = useRef<number>(0);
  const fallbackUtteranceRef = useRef<SpeechSynthesisUtterance | null>(null);

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
    if (currentModuleId === moduleId) {
      if (!isFallbackRef.current && audioRef.current && audioRef.current.paused) {
        audioRef.current.play();
        setIsPlaying(true);
      } else if (isFallbackRef.current && !isPlaying) {
        window.speechSynthesis.resume();
        setIsPlaying(true);
      }
      return;
    }

    // Stop current track if any
    stopTrack();
    
    // Synchronously unlock SpeechSynthesis engine before the async fetch!
    // Browsers block TTS if it's not initiated by a direct user gesture.
    // Use a space ' ' instead of empty string '' which crashes some browsers.
    const unlockUtterance = new SpeechSynthesisUtterance(' ');
    unlockUtterance.volume = 0;
    // Only speak if not already cancelled in the same tick
    window.speechSynthesis.speak(unlockUtterance);
    
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
        playFallback(markdownContent, initialProgress);
        return;
      }

      if (!res.ok) throw new Error('Failed to generate TTS');

      isFallbackRef.current = false;
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const audio = new Audio(url);
      
      audio.playbackRate = rateRef.current;
      audio.currentTime = initialProgress;
      setCurrentTime(initialProgress);
      currentTimeRef.current = initialProgress;
      
      audio.onended = () => setIsPlaying(false);
      audio.ontimeupdate = () => {
        setCurrentTime(audio.currentTime);
        currentTimeRef.current = audio.currentTime;
      };
      audio.onloadedmetadata = () => {
        setDuration(audio.duration);
        durationRef.current = audio.duration;
      };
      audio.play();
      
      audioRef.current = audio;
      setIsPlaying(true);
    } catch (e) {
      console.error('TTS Error:', e);
      playFallback(markdownContent, initialProgress);
    } finally {
      setIsLoading(false);
    }
  };

  const playFallback = (content: string, initialProgress: number = 0) => {
    isFallbackRef.current = true;
    
    // Do NOT cancel() here again, as stopTrack already handled it.
    // Calling cancel() immediately before speak() causes silent failures on macOS/Safari.
    
    const text = cleanMarkdownForAudio(content);
    // Split by sentence markers to prevent silent failures on long text, ensuring we don't drop text without punctuation
    const chunks = text.match(/[^.!?]+[.!?]*|.+/g)?.map(s => s.trim()).filter(Boolean) || [text];
    fallbackChunksRef.current = chunks;
    
    // Estimate duration: ~150 WPM
    const words = text.split(/\s+/).length;
    const estDuration = (words / 150) * 60;
    setDuration(estDuration);
    durationRef.current = estDuration;
    
    // Find where to resume based on initialProgress
    let startFraction = estDuration > 0 ? initialProgress / estDuration : 0;
    if (startFraction > 1) startFraction = 1;
    
    const startCharIndex = Math.floor(startFraction * text.length);
    
    let charCount = 0;
    let chunkIndex = 0;
    for (let i = 0; i < chunks.length; i++) {
      charCount += chunks[i].length;
      if (charCount > startCharIndex) {
        chunkIndex = i;
        break;
      }
    }
    
    currentChunkIndexRef.current = chunkIndex;
    setIsLoading(false);
    
    // Add a tiny delay to ensure any previous cancel() has fully flushed from the OS speech daemon.
    setTimeout(() => {
      playNextChunk();
    }, 50);
  };

  const playNextChunk = () => {
    const chunks = fallbackChunksRef.current;
    const index = currentChunkIndexRef.current;
    
    if (index >= chunks.length) {
      setIsPlaying(false);
      return;
    }
    
    const utterance = new SpeechSynthesisUtterance(chunks[index]);
    utterance.rate = rateRef.current;
    
    utterance.onboundary = (e) => {
      let charsBefore = 0;
      for (let i = 0; i < index; i++) {
        charsBefore += chunks[i].length;
      }
      const absoluteCharIndex = charsBefore + e.charIndex;
      const totalChars = chunks.join('').length;
      const currentFraction = absoluteCharIndex / totalChars;
      
      const newTime = currentFraction * durationRef.current;
      setCurrentTime(newTime);
      currentTimeRef.current = newTime;
    };
    
    utterance.onend = () => {
      // Don't advance if we stopped it manually
      if (!isPlaying && !isFallbackRef.current) return; 
      currentChunkIndexRef.current++;
      playNextChunk();
    };
    
    utterance.onerror = (e) => {
      // ignore cancel errors which happen on manual stop
      if (e.error !== 'canceled') {
        console.warn('SpeechSynthesis error:', e);
        setIsPlaying(false);
      }
    };

    fallbackUtteranceRef.current = utterance;
    window.speechSynthesis.speak(utterance);
    setIsPlaying(true);
  };

  const togglePlayPause = () => {
    if (isFallbackRef.current) {
      if (isPlaying) {
        window.speechSynthesis.pause();
        setIsPlaying(false);
      } else {
        window.speechSynthesis.resume();
        setIsPlaying(true);
      }
    } else if (audioRef.current) {
      if (isPlaying) {
        audioRef.current.pause();
        setIsPlaying(false);
      } else {
        audioRef.current.play();
        setIsPlaying(true);
      }
    }
  };

  const stopTrack = () => {
    // Only cancel if it's actually speaking to avoid breaking the utterance queue
    if (window.speechSynthesis.speaking || window.speechSynthesis.pending) {
      window.speechSynthesis.cancel();
    }
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
      audioRef.current = null;
    }
    isFallbackRef.current = false;
    setIsPlaying(false);
    setCurrentModuleId(null);
    setCurrentTrackTitle(null);
    setCurrentTime(0);
    currentTimeRef.current = 0;
    setDuration(0);
    durationRef.current = 0;
    lastSavedProgressRef.current = 0;
  };

  const seekTo = (time: number) => {
    if (isFallbackRef.current) {
      // Fully restart playback at new chunk
      window.speechSynthesis.cancel();
      const fraction = time / durationRef.current;
      const text = fallbackChunksRef.current.join('');
      const startCharIndex = Math.floor(fraction * text.length);
      
      let charCount = 0;
      let chunkIndex = 0;
      for (let i = 0; i < fallbackChunksRef.current.length; i++) {
        charCount += fallbackChunksRef.current[i].length;
        if (charCount > startCharIndex) {
          chunkIndex = i;
          break;
        }
      }
      currentChunkIndexRef.current = chunkIndex;
      playNextChunk();
    } else if (audioRef.current) {
      audioRef.current.currentTime = time;
      setCurrentTime(time);
      currentTimeRef.current = time;
    }
  };

  const changeRate = () => {
    const nextRate = rate === 1 ? 1.5 : rate === 1.5 ? 2 : 1;
    setRate(nextRate);
    rateRef.current = nextRate;
    if (isFallbackRef.current && fallbackUtteranceRef.current) {
      // For fallback, the new rate will simply apply when the next sentence chunk begins playing.
    } else if (audioRef.current) {
      audioRef.current.playbackRate = nextRate;
    }
  };

  useEffect(() => {
    const interval = setInterval(async () => {
      if (isPlaying && currentModuleId) {
        const currentProgress = Math.floor(currentTimeRef.current);
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
      currentTime,
      duration,
      playTrack,
      togglePlayPause,
      stopTrack,
      changeRate,
      seekTo
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
