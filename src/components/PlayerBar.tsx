import { usePlayer } from '../context/PlayerContext';
import { Play, Pause, SkipBack, SkipForward, Shuffle, Repeat, Volume2, VolumeX, Heart, RotateCcw, RotateCw } from 'lucide-react';
import '../styles/PlayerBar.css';

function formatTime(seconds: number): string {
  if (!seconds || isNaN(seconds)) return '0:00';
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, '0')}`;
}

export function PlayerBar() {
  const {
    currentTrack,
    isPlaying,
    isShuffle,
    isRepeat,
    volume,
    progress,
    duration,
    togglePlay,
    playNext,
    playPrev,
    toggleShuffle,
    toggleRepeat,
    setVolume,
    seekTo,
    skipForward,
    skipBackward,
    mediaType,
  } = usePlayer();

  if (mediaType === 'video') return null;

  const progressPct = duration > 0 ? (progress / duration) * 100 : 0;

  const handleProgressClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const pct = ((e.clientX - rect.left) / rect.width) * 100;
    seekTo(pct);
  };

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setVolume(parseFloat(e.target.value));
  };

  const coverUrl = currentTrack?.coverUrl || '';

  return (
    <div className="player-bar">
      {/* Left: Song Info */}
      <div className="player-info">
        <div className="player-cover-wrap">
          {coverUrl ? (
            <img
              src={coverUrl}
              alt={currentTrack?.title}
              className="player-cover"
              onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
            />
          ) : (
            <div className="player-cover-placeholder">♪</div>
          )}
        </div>
        <div className="player-meta">
          <span className="player-title">{currentTrack?.title ?? 'No media selected'}</span>
          <span className="player-artist">{currentTrack?.artist ?? '—'}</span>
        </div>
        <button className="icon-btn heart-btn" aria-label="Like song">
          <Heart size={18} />
        </button>
      </div>

      {/* Center: Controls + Progress */}
      <div className="player-center">
        <div className="player-controls">
          <button
            id="btn-shuffle"
            className={`icon-btn ${isShuffle ? 'active' : ''}`}
            onClick={toggleShuffle}
            aria-label="Shuffle"
          >
            <Shuffle size={18} />
          </button>
          <button id="btn-prev" className="icon-btn" onClick={playPrev} aria-label="Previous track">
            <SkipBack size={20} />
          </button>
          <button id="btn-skip-back" className="icon-btn skip-btn" onClick={() => skipBackward(5)} aria-label="Skip back 5 seconds">
            <RotateCcw size={16} />
            <span className="skip-label">5</span>
          </button>
          <button
            id="btn-play-pause"
            className="play-pause-btn"
            onClick={togglePlay}
            aria-label={isPlaying ? 'Pause' : 'Play'}
          >
            {isPlaying ? <Pause size={22} /> : <Play size={22} />}
          </button>
          <button id="btn-skip-fwd" className="icon-btn skip-btn" onClick={() => skipForward(5)} aria-label="Skip forward 5 seconds">
            <RotateCw size={16} />
            <span className="skip-label">5</span>
          </button>
          <button id="btn-next" className="icon-btn" onClick={playNext} aria-label="Next track">
            <SkipForward size={20} />
          </button>
          <button
            id="btn-repeat"
            className={`icon-btn ${isRepeat ? 'active' : ''}`}
            onClick={toggleRepeat}
            aria-label="Repeat"
          >
            <Repeat size={18} />
          </button>
        </div>

        <div className="progress-row">
          <span className="time-label">{formatTime(progress)}</span>
          <div className="progress-track" onClick={handleProgressClick} role="slider" aria-label="Seek">
            <div className="progress-fill" style={{ width: `${progressPct}%` }}>
              <div className="progress-thumb" />
            </div>
          </div>
          <span className="time-label">{formatTime(duration)}</span>
        </div>
      </div>

      {/* Right: Volume */}
      <div className="player-right">
        <button className="icon-btn" onClick={() => setVolume(volume > 0 ? 0 : 0.8)} aria-label="Mute toggle">
          {volume === 0 ? <VolumeX size={18} /> : <Volume2 size={18} />}
        </button>
        <input
          id="volume-slider"
          type="range"
          className="volume-slider"
          min="0"
          max="1"
          step="0.02"
          value={volume}
          onChange={handleVolumeChange}
          aria-label="Volume"
        />
      </div>
    </div>
  );
}
