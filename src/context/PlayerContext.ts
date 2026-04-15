import { createContext, useContext } from 'react';
import type { Track } from '../services/sheetService';

export interface PlayerState {
  tracks: Track[];
  currentTrack: Track | null;
  currentIndex: number;
  currentAlbum: string | null;
  mediaType: 'audio' | 'video';
  isPlaying: boolean;
  isLoading: boolean;
  isShuffle: boolean;
  isRepeat: boolean;
  volume: number;
  progress: number;
  duration: number;
  searchQuery: string;
  activeGenre: string;
  error: string | null;
}

export interface PlayerActions {
  playTrack: (track: Track, albumName: string) => void;
  togglePlay: () => void;
  playNext: () => void;
  playPrev: () => void;
  toggleShuffle: () => void;
  toggleRepeat: () => void;
  setVolume: (v: number) => void;
  seekTo: (pct: number) => void;
  skipForward: (seconds?: number) => void;
  skipBackward: (seconds?: number) => void;
  setSearchQuery: (q: string) => void;
  setActiveGenre: (g: string) => void;
  setMediaType: (t: 'audio' | 'video') => void;
  closePlayer: () => void;
  playUrl: (url: string, type: 'audio' | 'video', label?: string) => void;
  audioRef: React.RefObject<HTMLAudioElement | HTMLVideoElement | null>;
}

export type PlayerContextType = PlayerState & PlayerActions;

export const PlayerContext = createContext<PlayerContextType | null>(null);

export function usePlayer(): PlayerContextType {
  const ctx = useContext(PlayerContext);
  if (!ctx) throw new Error('usePlayer must be used within PlayerProvider');
  return ctx;
}
