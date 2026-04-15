import './styles/global.css';
import { PlayerProvider } from './context/PlayerProvider';
import { Sidebar } from './components/Sidebar';
import { Library } from './components/Library';
import { PlayerBar } from './components/PlayerBar';

import { usePlayer } from './context/PlayerContext';

function AppContent() {
  const { mediaType, currentTrack } = usePlayer();
  // Quick-play tracks carry their own mediaKind; library tracks rely on global mediaType
  const effectiveType = currentTrack?.mediaKind ?? mediaType;
  
  // Show player ONLY for audio (restores clean full-bleed UI for video)
  const showPlayer = effectiveType === 'audio' && currentTrack !== null;
  const playerHeight = showPlayer ? 'var(--player-height)' : '0px';

  return (
    <div className="app-layout" style={{ gridTemplateRows: `1fr ${playerHeight}` }}>
      <Sidebar />
      <main className="app-main">
        <Library />
      </main>
      <div className="app-player" style={{ display: showPlayer ? 'block' : 'none' }}>
        <PlayerBar />
      </div>
    </div>
  );
}

function App() {
  return (
    <PlayerProvider>
      <AppContent />
    </PlayerProvider>
  );
}

export default App;
