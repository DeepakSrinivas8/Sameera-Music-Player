import {
  useState,
  useEffect,
  useRef,
  useCallback,
  type ReactNode,
} from 'react';
import { PlayerContext } from './PlayerContext';
import { fetchTracks, convertDriveUrl, type Track } from '../services/sheetService';

export function PlayerProvider({ children }: { children: ReactNode }) {
  const [tracks, setTracks] = useState<Track[]>([]);
  const [currentTrack, setCurrentTrack] = useState<Track | null>(null);
  const [currentIndex, setCurrentIndex] = useState<number>(-1);
  const [currentAlbum, setCurrentAlbum] = useState<string | null>(null);
  const [mediaType, setMediaType] = useState<'audio' | 'video'>('audio');
  const [isPlaying, setIsPlaying] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isShuffle, setIsShuffle] = useState(false);
  const [isRepeat, setIsRepeat] = useState(false);
  const [volume, setVolumeState] = useState(0.8);
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeGenre, setActiveGenre] = useState('All');
  const [error, setError] = useState<string | null>(null);

  const audioRef = useRef<HTMLVideoElement | null>(null);

  // Load tracks from Google Sheet when mediaType changes
  useEffect(() => {
    (async () => {
      try {
        setIsLoading(true);
        const data = await fetchTracks(mediaType);
        setTracks(data);
        setActiveGenre('All');
        setSearchQuery('');
        // Clear current active on switch
        setCurrentTrack(null);
        setCurrentAlbum(null);
        setCurrentIndex(-1);
        setIsPlaying(false);
      } catch (e: any) {
        setError(e.message ?? 'Failed to load tracks');
      } finally {
        setIsLoading(false);
      }
    })();
  }, [mediaType]);

  // Sync audio/video element volume
  useEffect(() => {
    if (audioRef.current) audioRef.current.volume = volume;
  }, [volume]);

  // Media event listeners
  useEffect(() => {
    const media = audioRef.current;
    if (!media) return;

    const onTimeUpdate = () => setProgress(media.currentTime);
    const onDurationChange = () => setDuration(media.duration || 0);
    const onEnded = () => {
      if (isRepeat) {
        media.currentTime = 0;
        media.play();
      } else {
        playNext();
      }
    };
    const onPlay = () => setIsPlaying(true);
    const onPause = () => setIsPlaying(false);
    const onError = () => {
      const err = media.error;
      console.error('[Sameera] Media error:', err?.code, err?.message);
    };

    media.addEventListener('timeupdate', onTimeUpdate);
    media.addEventListener('durationchange', onDurationChange);
    media.addEventListener('ended', onEnded);
    media.addEventListener('play', onPlay);
    media.addEventListener('pause', onPause);
    media.addEventListener('error', onError);

    return () => {
      media.removeEventListener('timeupdate', onTimeUpdate);
      media.removeEventListener('durationchange', onDurationChange);
      media.removeEventListener('ended', onEnded);
      media.removeEventListener('play', onPlay);
      media.removeEventListener('pause', onPause);
      media.removeEventListener('error', onError);
    };
  }, [isRepeat, currentIndex, isShuffle, tracks, currentAlbum]);

  const playTrack = useCallback((track: Track, albumName: string) => {
    setCurrentTrack(track);
    setCurrentAlbum(albumName);

    // Find the track's index inside its specific album list or global list
    const albumTracks = albumName === 'All Media' ? tracks : tracks.filter((t) => t.album === albumName);
    const idx = albumTracks.findIndex((t) => t.id === track.id);
    setCurrentIndex(idx);
    
    setProgress(0);
    setDuration(0);

    const media = audioRef.current;
    if (!media) return;

    // Remove any previous canplay listener to avoid stacking
    const onCanPlay = () => {
      media.play().catch((e) => console.error('[Sameera] play() rejected:', e));
      media.removeEventListener('canplay', onCanPlay);
    };

    media.addEventListener('canplay', onCanPlay);
    media.src = track.mediaUrl;
    media.load();
  }, [tracks]);

  const togglePlay = useCallback(() => {
    const media = audioRef.current;
    if (!media) return;
    if (isPlaying) {
      media.pause();
    } else {
      media.play().catch(() => {});
    }
  }, [isPlaying]);

  const playNext = useCallback(() => {
    if (!currentAlbum || tracks.length === 0) return;
    const albumTracks = currentAlbum === 'All Media' ? tracks : tracks.filter((t) => t.album === currentAlbum);
    if (albumTracks.length === 0) return;

    let nextIndex: number;
    if (isShuffle) {
      nextIndex = Math.floor(Math.random() * albumTracks.length);
    } else {
      nextIndex = (currentIndex + 1) % albumTracks.length;
    }
    playTrack(albumTracks[nextIndex], currentAlbum);
  }, [tracks, currentIndex, currentAlbum, isShuffle, playTrack]);

  const playPrev = useCallback(() => {
    if (!currentAlbum || tracks.length === 0) return;
    const albumTracks = currentAlbum === 'All Media' ? tracks : tracks.filter((t) => t.album === currentAlbum);
    if (albumTracks.length === 0) return;

    const media = audioRef.current;
    // If > 3s in, restart. Otherwise go to previous.
    if (media && media.currentTime > 3) {
      media.currentTime = 0;
      return;
    }
    const prevIndex = (currentIndex - 1 + albumTracks.length) % albumTracks.length;
    playTrack(albumTracks[prevIndex], currentAlbum);
  }, [tracks, currentIndex, currentAlbum, playTrack]);

  const toggleShuffle = useCallback(() => setIsShuffle((s) => !s), []);
  const toggleRepeat = useCallback(() => setIsRepeat((r) => !r), []);
  const setVolume = useCallback((v: number) => setVolumeState(v), []);

  const seekTo = useCallback(
    (pct: number) => {
      const media = audioRef.current;
      if (!media || !duration) return;
      media.currentTime = (pct / 100) * duration;
      setProgress(media.currentTime);
    },
    [duration]
  );

  const skipForward = useCallback((seconds = 5) => {
    const media = audioRef.current;
    if (!media) return;
    media.currentTime = Math.min(media.currentTime + seconds, media.duration || 0);
    setProgress(media.currentTime);
  }, []);

  const skipBackward = useCallback((seconds = 5) => {
    const media = audioRef.current;
    if (!media) return;
    media.currentTime = Math.max(media.currentTime - seconds, 0);
    setProgress(media.currentTime);
  }, []);


  const closePlayer = useCallback(() => {
    setCurrentTrack(null);
    setCurrentAlbum(null);
    setCurrentIndex(-1);
    setIsPlaying(false);
    setProgress(0);
    const media = audioRef.current;
    if (media) {
      media.pause();
      media.currentTime = 0;
      media.removeAttribute('src');
      media.load();
    }
  }, []);

  const playUrl = useCallback((rawUrl: string, type: 'audio' | 'video', label = 'Quick Play') => {
    let mediaUrl = rawUrl;
    let isYoutube = false;

    // Detect YouTube URLs (e.g., youtube.com/watch?v=ID or youtu.be/ID)
    const ytRegex = /(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/i;
    const ytMatch = rawUrl.match(ytRegex);

    if (ytMatch && ytMatch[1]) {
      // Force video type for YouTube
      type = 'video';
      mediaUrl = `https://www.youtube.com/embed/${ytMatch[1]}?autoplay=1&rel=0`;
      isYoutube = true;
    } else {
      // Convert Drive share link → streamable URL
      mediaUrl = convertDriveUrl(rawUrl, 'media');
    }

    // Build a synthetic Track stamped with mediaKind so the UI knows
    // what type is playing WITHOUT touching the library's mediaType state.
    // NOTE: We deliberately do NOT call setMediaType() here.
    const syntheticTrack: Track = {
      id: -1,
      title: label || 'Quick Play',
      artist: isYoutube ? 'YouTube' : 'Direct URL',
      album: 'Quick Play',
      genre: '',
      duration: '—',
      year: 0,
      mediaUrl,
      coverUrl: '',
      mediaKind: type,
      isYoutube,
    };

    setCurrentTrack(syntheticTrack);
    setCurrentAlbum('Quick Play');
    setCurrentIndex(-1);
    setProgress(0);
    setDuration(0);

    const media = audioRef.current;
    if (!media) return;

    // For HTML5 video/audio, we attach to the ref. For YouTube iframes, 
    // the iframe auto-plays via URL parameters and we don't use HTMLMediaElement APIs.
    if (!isYoutube) {
      const onCanPlay = () => {
        media.play().catch((e) => console.error('[Sameera] quickPlay() rejected:', e));
        media.removeEventListener('canplay', onCanPlay);
      };
      media.addEventListener('canplay', onCanPlay);
      media.src = mediaUrl;
      media.load();
    }
  }, []);                       // no deps — doesn't touch mediaType state at all


  return (
    <PlayerContext.Provider
      value={{
        tracks,
        currentTrack,
        currentIndex,
        currentAlbum,
        mediaType,
        isPlaying,
        isLoading,
        isShuffle,
        isRepeat,
        volume,
        progress,
        duration,
        searchQuery,
        activeGenre,
        error,
        playTrack,
        togglePlay,
        playNext,
        playPrev,
        toggleShuffle,
        toggleRepeat,
        setVolume,
        seekTo,
        skipForward,
        skipBackward,
        setSearchQuery,
        setActiveGenre,
        setMediaType,
        closePlayer,
        playUrl,
        audioRef,
      }}
    >
      {children}
    </PlayerContext.Provider>
  );
}
