import { usePlayer } from '../context/PlayerContext';
import { Music, Library, Star, Settings } from 'lucide-react';
import { QuickPlay } from './QuickPlay';
import '../styles/Sidebar.css';

const NAV_ITEMS = [
  { id: 'library', label: 'Library', icon: Library },
  { id: 'featured', label: 'Featured', icon: Star },
];

export function Sidebar() {
  const { currentTrack, isPlaying } = usePlayer();

  return (
    <aside className="sidebar">
      <div className="sidebar-logo">
        <div className="logo-icon">
          <Music size={22} />
        </div>
        <span className="logo-text">Sameera</span>
      </div>

      <nav className="sidebar-nav">
        {NAV_ITEMS.map((item) => (
          <a
            key={item.id}
            href={`#${item.id}`}
            className="nav-item active"
            aria-label={item.label}
          >
            <item.icon size={18} />
            <span>{item.label}</span>
          </a>
        ))}
      </nav>

      <div className="sidebar-spacer" />

      {/* Quick Play Widget */}
      <QuickPlay />

      {/* Now Playing mini card */}
      {currentTrack && (
        <div className="now-playing-card">
          <div className="np-cover-wrap">
            {currentTrack.coverUrl ? (
              <img
                src={currentTrack.coverUrl}
                alt={currentTrack.title}
                className={`np-cover ${isPlaying ? 'spinning' : ''}`}
                onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
              />
            ) : (
              <div className="np-cover-placeholder">♪</div>
            )}
            {isPlaying && (
              <div className="np-wave">
                {[1, 2, 3, 4].map((i) => (
                  <span key={i} className="wave-bar" style={{ animationDelay: `${i * 0.1}s` }} />
                ))}
              </div>
            )}
          </div>
          <div className="np-meta">
            <span className="np-label">Now Playing</span>
            <span className="np-title">{currentTrack.title}</span>
            <span className="np-artist">{currentTrack.artist}</span>
          </div>
        </div>
      )}

      <div className="sidebar-settings">
        <a href="#settings" className="nav-item" aria-label="Settings">
          <Settings size={18} />
          <span>Settings</span>
        </a>
      </div>
    </aside>
  );
}
