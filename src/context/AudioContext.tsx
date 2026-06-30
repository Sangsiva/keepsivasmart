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
  moduleProgress: Record<string, number>;
}

const AudioContext = createContext<AudioContextType | undefined>(undefined);

export function AudioProvider({ children, hasPremiumTTS = null }: { children: React.ReactNode, hasPremiumTTS?: boolean | null }) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [currentModuleId, setCurrentModuleId] = useState<string | null>(null);
  const [currentTrackTitle, setCurrentTrackTitle] = useState<string | null>(null);
  const [rate, setRate] = useState(1);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [isTTSConfigured, setIsTTSConfigured] = useState<boolean | null>(hasPremiumTTS);
  const [moduleProgress, setModuleProgress] = useState<Record<string, number>>({});
  
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
  const fallbackPlaybackIdRef = useRef<number>(0);
  const fallbackLastTickRef = useRef<number>(0);

  useEffect(() => {
    // If the server didn't pass it, check via API
    if (isTTSConfigured === null) {
      fetch('/api/tts/status')
        .then(res => res.json())
        .then(data => setIsTTSConfigured(data.enabled))
        .catch(() => setIsTTSConfigured(false));
    }
  }, [isTTSConfigured]);

  // Clean up markdown before sending to TTS
  const cleanMarkdownForAudio = (md: string) => {
    let clean = md;
    
    // Replace mermaid blocks with auditory cue
    clean = clean.replace(/```mermaid[\s\S]*?```/g, '. [Diagram displayed on screen]. ');
    
    // Replace other code blocks with auditory cue (both with and without language tags)
    clean = clean.replace(/```[a-zA-Z]*\n[\s\S]*?```/g, '. [Code snippet displayed on screen]. ');
    clean = clean.replace(/```[\s\S]*?```/g, '. [Code snippet displayed on screen]. ');
    
    // Clean up remaining markdown syntax
    clean = clean
      .replace(/#/g, '')
      .replace(/\*/g, '')
      .replace(/`(.*?)`/g, '$1') // Inline code removes backticks but keeps text
      .replace(/\[(.*?)\]\(.*?\)/g, '$1') // Links keep only their text
      .trim();
      
    return clean;
  };

  const playTrack = async (moduleId: string, title: string, markdownContent: string, initialProgress: number = 0) => {
    // If the same track is requested and we have it, just resume
    if (currentModuleId === moduleId) {
      if (!isFallbackRef.current && audioRef.current && audioRef.current.paused) {
        audioRef.current.play();
        setIsPlaying(true);
      } else if (isFallbackRef.current && !isPlaying) {
        fallbackLastTickRef.current = Date.now();
        window.speechSynthesis.resume();
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

    // By entirely skipping the async fetch when there is no API key,
    // we preserve the exact synchronous execution context of the React onClick event,
    // perfectly bypassing macOS Safari/Chrome anti-spam WebAudio blocks!
    if (isTTSConfigured === false) {
      console.log('No OpenAI key configured, routing synchronously to Web Speech API');
      playFallback(markdownContent, initialProgress);
      return;
    }

    try {
      const cleanText = cleanMarkdownForAudio(markdownContent);
      const preferredVoice = localStorage.getItem('ttsVoice') || 'alloy';
      
      const res = await fetch('/api/tts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: cleanText, voice: preferredVoice })
      });

      if (res.status === 404) {
        console.log('No OpenAI key found, falling back to Web Speech API asynchronously');
        playFallback(markdownContent, initialProgress);
        return;
      }

      if (!res.ok) throw new Error('Failed to generate TTS');

      isFallbackRef.current = false;
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const audio = new Audio(url);
      
      audio.playbackRate = rateRef.current;
      
      audio.onended = () => setIsPlaying(false);
      audio.ontimeupdate = () => {
        setCurrentTime(audio.currentTime);
        currentTimeRef.current = audio.currentTime;
      };
      audio.onloadedmetadata = () => {
        setDuration(audio.duration);
        durationRef.current = audio.duration;
        // Fix: Set currentTime ONLY after metadata is loaded so the browser knows the duration
        audio.currentTime = initialProgress;
        setCurrentTime(initialProgress);
        currentTimeRef.current = initialProgress;
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

  const makeChunksOfText = (text: string, maxLength = 180) => {
    const speechChunks = [];
    let currentText = text;
    while (currentText.length > 0) {
      if (currentText.length <= maxLength) {
        speechChunks.push(currentText);
        break;
      }
      let chunk = currentText.substring(0, maxLength + 1);
      let lastSpaceIndex = chunk.lastIndexOf(' ');
      
      if (lastSpaceIndex !== -1) {
        speechChunks.push(currentText.substring(0, lastSpaceIndex).trim());
        currentText = currentText.substring(lastSpaceIndex + 1).trim();
      } else {
        speechChunks.push(currentText.substring(0, maxLength).trim());
        currentText = currentText.substring(maxLength).trim();
      }
    }
    return speechChunks.filter(Boolean);
  };

  const runFallbackPlayback = async (chunks: string[], startIndex: number, estDuration: number) => {
    fallbackPlaybackIdRef.current++;
    const currentPlaybackId = fallbackPlaybackIdRef.current;
    
    let totalCharsBefore = chunks.slice(0, startIndex).join('').length;
    const totalChars = chunks.join('').length;

    for (let index = startIndex; index < chunks.length; index++) {
      if (!isFallbackRef.current || fallbackPlaybackIdRef.current !== currentPlaybackId) break;
      
      currentChunkIndexRef.current = index;
      const chunk = chunks[index];
      
      await new Promise<void>((resolve) => {
        const utterance = new SpeechSynthesisUtterance(chunk);
        utterance.rate = rateRef.current;
        utterance.lang = 'en-US';
        
        const voices = window.speechSynthesis.getVoices();
        if (voices.length > 0) {
          // Read the user's preferred TTS voice to try and match the gender in Demo Mode
          const preferredVoice = localStorage.getItem('ttsVoice') || 'alloy';
          const isMale = ['echo', 'fable', 'onyx'].includes(preferredVoice);
          
          let matchedVoice = voices.find(v => v.lang.startsWith('en'));
          if (isMale) {
             const maleVoice = voices.find(v => v.lang.startsWith('en') && (v.name.includes('Daniel') || v.name.includes('Alex') || v.name.includes('Arthur') || v.name.includes('Fred') || v.name.includes('Rishi')));
             if (maleVoice) matchedVoice = maleVoice;
          } else {
             const femaleVoice = voices.find(v => v.lang.startsWith('en') && (v.name.includes('Samantha') || v.name.includes('Victoria') || v.name.includes('Karen')));
             if (femaleVoice) matchedVoice = femaleVoice;
          }
          
          if (matchedVoice) utterance.voice = matchedVoice;
        }

        utterance.onend = () => {
          totalCharsBefore += chunk.length;
          resolve();
        };

        utterance.onerror = (e) => {
          if (e.error !== 'canceled') {
            console.warn('SpeechSynthesis error:', e);
          }
          totalCharsBefore += chunk.length;
          resolve();
        };

        fallbackUtteranceRef.current = utterance;
        window.speechSynthesis.speak(utterance);
      });
    }
    
    if (isFallbackRef.current && fallbackPlaybackIdRef.current === currentPlaybackId) {
      setIsPlaying(false);
      isFallbackRef.current = false;
    }
  };

  const playFallback = (content: string, initialProgress: number = 0) => {
    isFallbackRef.current = true;
    
    const text = cleanMarkdownForAudio(content);
    const chunks = makeChunksOfText(text);
    fallbackChunksRef.current = chunks;
    
    const words = text.split(/\s+/).length;
    const estDuration = (words / 150) * 60;
    setDuration(estDuration);
    durationRef.current = estDuration;
    
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
    setIsPlaying(true);
    fallbackLastTickRef.current = Date.now();
    
    // Execute loop completely asynchronously but preserving object lifecycles
    runFallbackPlayback(chunks, chunkIndex, estDuration);
  };

  const togglePlayPause = () => {
    if (isFallbackRef.current) {
      if (isPlaying) {
        window.speechSynthesis.pause();
        setIsPlaying(false);
      } else {
        fallbackLastTickRef.current = Date.now();
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
    fallbackPlaybackIdRef.current++; // Kill active loop
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
      fallbackPlaybackIdRef.current++; // Kill active loop
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
      
      // Start a fresh playback loop
      runFallbackPlayback(fallbackChunksRef.current, chunkIndex, durationRef.current);
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
        
        // Manual clock tick for fallback
        if (isFallbackRef.current) {
          const now = Date.now();
          const deltaSeconds = (now - fallbackLastTickRef.current) / 1000;
          fallbackLastTickRef.current = now;
          
          if (deltaSeconds > 0 && deltaSeconds < 2) { // prevent huge jumps
            const newTime = currentTimeRef.current + (deltaSeconds * rateRef.current);
            setCurrentTime(newTime);
            currentTimeRef.current = newTime;
          }
        }

        const currentProgress = Math.floor(currentTimeRef.current);
        if (Math.abs(currentProgress - lastSavedProgressRef.current) >= 3) {
          lastSavedProgressRef.current = currentProgress;
          setModuleProgress(prev => ({ ...prev, [currentModuleId]: currentProgress }));
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
    }, 500); // Check every 500ms

    return () => {
      clearInterval(interval);
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
      seekTo,
      moduleProgress
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
