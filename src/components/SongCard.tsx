import { usePlayer } from '../context/PlayerContext';
import { Play, Pause, Music } from 'lucide-react';
import type { Track } from '../services/sheetService';
import '../styles/SongCard.css';

interface SongCardProps {
  song: Track;
  index: number;
  albumName: string;
}

export function SongCard({ song, index, albumName }: SongCardProps) {
  const { currentTrack, isPlaying, playTrack, togglePlay } = usePlayer();
  const isActive = currentTrack?.id === song.id;

  const handleClick = () => {
    if (isActive) {
      togglePlay();
    } else {
      playTrack(song, albumName);
    }
  };

  return (
    <div
      className={`song-card ${isActive ? 'song-card--active' : ''}`}
      onClick={handleClick}
      role="button"
      tabIndex={0}
      aria-label={`Play ${song.title} by ${song.artist}`}
      onKeyDown={(e) => e.key === 'Enter' && handleClick()}
    >
      <div className="song-card-cover">
        {song.coverUrl ? (
          <img
            src={song.coverUrl}
            alt={`${song.title} cover`}
            className="song-cover-img"
            loading="lazy"
            onError={(e) => {
              const target = e.target as HTMLImageElement;
              target.style.display = 'none';
              target.nextElementSibling?.classList.remove('hidden');
            }}
          />
        ) : null}
        <div className={`song-cover-fallback ${song.coverUrl ? 'hidden' : ''}`}>
          <Music size={28} />
        </div>
        <div className="song-card-overlay">
          <div className="play-icon-wrap">
            {isActive && isPlaying ? <Pause size={24} /> : <Play size={24} />}
          </div>
        </div>
        {song.isFeatured && <span className="featured-badge">✦ Featured</span>}
      </div>

      <div className="song-card-info">
        <div className="song-card-top">
          <span className="song-card-title">{song.title}</span>
          <span className="song-card-duration">{song.duration}</span>
        </div>
        <span className="song-card-artist">{song.artist}</span>
        <span className="song-card-meta">{song.album} · {song.year}</span>
        <span className="song-card-genre">{song.genre}</span>
      </div>

      {isActive && (
        <div className="active-indicator">
          {[1, 2, 3].map((i) => (
            <span
              key={i}
              className={`active-bar ${isPlaying ? '' : 'paused'}`}
              style={{ animationDelay: `${i * 0.15}s` }}
            />
          ))}
        </div>
      )}
    </div>
  );
}
