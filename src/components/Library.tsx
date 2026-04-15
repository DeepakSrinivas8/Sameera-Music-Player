import { useState, useMemo } from 'react';
import { usePlayer } from '../context/PlayerContext';
import { SongCard } from './SongCard';
import { Search, Loader2, AlertCircle, ArrowLeft, Film, Music as MusicIcon, Folder, ListMusic, X, RotateCcw, RotateCw } from 'lucide-react';
import '../styles/Library.css';
import type { Track } from '../services/sheetService';

export function Library() {
  const { 
    tracks, isLoading, error, searchQuery, setSearchQuery, 
    activeGenre, setActiveGenre, mediaType, setMediaType,
    currentTrack, audioRef, closePlayer, skipForward, skipBackward
  } = usePlayer();

  const [selectedAlbum, setSelectedAlbum] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'folders' | 'all'>('folders');

  const albums = useMemo(() => {
    const map = new Map<string, Track[]>();
    for (const t of tracks) {
      const albumTracks = map.get(t.album) || [];
      albumTracks.push(t);
      map.set(t.album, albumTracks);
    }
    return Array.from(map.entries()).map(([name, tList]) => ({ name, tracks: tList, firstTrack: tList[0] }));
  }, [tracks]);

  const genres = useMemo(() => {
    const all = tracks.map((s) => s.genre);
    const unique = Array.from(new Set(all));
    return ['All', ...unique];
  }, [tracks]);

  const filteredAlbums = useMemo(() => {
    return albums.filter((album) => {
      const matchGenre = activeGenre === 'All' || album.tracks.some(t => t.genre === activeGenre);
      const q = searchQuery.toLowerCase();
      const matchSearch =
        !q ||
        album.name.toLowerCase().includes(q) ||
        album.tracks.some(t => t.artist.toLowerCase().includes(q));
      return matchGenre && matchSearch;
    });
  }, [albums, activeGenre, searchQuery]);

  const filteredTracks = useMemo(() => {
    return tracks.filter((t) => {
      const matchGenre = activeGenre === 'All' || t.genre === activeGenre;
      const q = searchQuery.toLowerCase();
      const matchSearch = !q || t.title.toLowerCase().includes(q) || t.artist.toLowerCase().includes(q);
      return matchGenre && matchSearch;
    });
  }, [tracks, activeGenre, searchQuery]);

  const albumTracks = useMemo(() => {
    if (!selectedAlbum) return [];
    const album = albums.find(a => a.name === selectedAlbum);
    if (!album) return [];
    const q = searchQuery.toLowerCase();
    return album.tracks.filter(t => !q || t.title.toLowerCase().includes(q) || t.artist.toLowerCase().includes(q));
  }, [selectedAlbum, albums, searchQuery]);

  const handleToggleMediaType = (type: 'audio' | 'video') => {
    setMediaType(type);
    setSelectedAlbum(null);
  };

  // Quick-play tracks carry mediaKind; library tracks use the global mediaType
  const effectiveType = currentTrack?.mediaKind ?? mediaType;

  return (
    <main className="library">
      <div 
         className="video-hero-container" 
         style={{ display: effectiveType === 'video' && currentTrack ? 'block' : 'none' }}
      >
        <button 
          className="video-close-btn"
          onClick={closePlayer}
          aria-label="Close video player"
        >
          <X size={18} /> Close Video
        </button>
        <div className="video-hero-wrapper" style={{ position: 'relative', width: '100%', height: '100%' }}>
          {currentTrack?.isYoutube ? (
            <iframe 
               className="video-hero-element" 
               src={currentTrack.mediaUrl}
               frameBorder="0"
               allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
               allowFullScreen
            />
          ) : (
            <video 
               ref={audioRef as any} 
               className="video-hero-element" 
               preload="metadata" 
               controls
            />
          )}
        </div>
      </div>

      {/* Header controls */}
      <div className="library-header" style={{ alignItems: 'flex-start', flexWrap: 'wrap', gap: '20px' }}>
        <div>
          <h1 className="library-heading" style={{ marginBottom: '16px' }}>Your Library</h1>
          <div className="media-toggle" style={{ display: 'flex', gap: '8px', marginBottom: '16px' }}>
            <button 
              className={`genre-chip ${mediaType === 'audio' ? 'genre-chip--active' : ''}`}
              onClick={() => handleToggleMediaType('audio')}
              style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
            >
              <MusicIcon size={14} /> Music
            </button>
            <button 
              className={`genre-chip ${mediaType === 'video' ? 'genre-chip--active' : ''}`}
              onClick={() => handleToggleMediaType('video')}
              style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
            >
              <Film size={14} /> Videos
            </button>
          </div>
          
          {!selectedAlbum && (
            <div className="view-tabs">
              <button 
                className={`view-tab ${viewMode === 'folders' ? 'active' : ''}`}
                onClick={() => setViewMode('folders')}
              >
                Movies Base
              </button>
              <button 
                className={`view-tab ${viewMode === 'all' ? 'active' : ''}`}
                onClick={() => setViewMode('all')}
              >
                All {mediaType === 'audio' ? 'Songs' : 'Videos'}
              </button>
            </div>
          )}
        </div>
        
        <div className="search-wrap" style={{ alignSelf: 'flex-start', marginTop: '10px' }}>
          <Search size={18} className="search-icon" />
          <input
            id="search-input"
            type="text"
            className="search-input"
            placeholder={selectedAlbum ? "Search tracks..." : "Search movies, artists..."}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            aria-label="Search"
          />
        </div>
      </div>

      {/* Genre Filter Chips */}
      {!selectedAlbum && (
        <div className="genre-chips" role="group" aria-label="Genre filter">
          {genres.map((g) => (
            <button
              key={g}
              className={`genre-chip ${activeGenre === g ? 'genre-chip--active' : ''}`}
              onClick={() => setActiveGenre(g)}
              aria-pressed={activeGenre === g}
            >
              {g}
            </button>
          ))}
        </div>
      )}

      {/* States */}
      {isLoading && (
        <div className="state-container">
          <Loader2 size={40} className="spinner" />
          <p>Loading your {mediaType === 'audio' ? 'music' : 'videos'}...</p>
        </div>
      )}

      {error && !isLoading && (
        <div className="state-container state-error">
          <AlertCircle size={40} />
          <p>Could not load. Check your internet connection.</p>
          <span className="error-detail">{error}</span>
        </div>
      )}

      {/* Content */}
      {!isLoading && !error && (
        <>
          {selectedAlbum ? (
            <section className="all-songs-section" id="library">
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '24px', cursor: 'pointer' }} onClick={() => setSelectedAlbum(null)}>
                <button className="icon-btn" style={{ background: 'var(--bg-surface)', padding: '8px' }} aria-label="Back">
                  <ArrowLeft size={20} />
                </button>
                <h2 className="section-title" style={{ margin: 0 }}>
                  {selectedAlbum}
                  <span className="song-count">{albumTracks.length} items</span>
                </h2>
              </div>
              
              {albumTracks.length === 0 ? (
                <div className="state-container">
                  <p>No matches found in this album.</p>
                </div>
              ) : (
                <div className="songs-grid">
                  {albumTracks.map((track) => (
                    <SongCard key={track.id} song={track} index={track.id} albumName={selectedAlbum} />
                  ))}
                </div>
              )}
            </section>
          ) : viewMode === 'folders' ? (
            <section className="all-songs-section" id="library">
              <h2 className="section-title">
                {searchQuery || activeGenre !== 'All' ? 'Matched Movies' : 'All Movies'}
                <span className="song-count">{filteredAlbums.length} folders</span>
              </h2>

              {filteredAlbums.length === 0 ? (
                <div className="state-container">
                  <p>No movies found. Try a different search or filter.</p>
                </div>
              ) : (
                <div className="songs-grid folders-grid">
                  {filteredAlbums.map((album) => (
                    <div className="folder-card" key={album.name} onClick={() => {
                        setSelectedAlbum(album.name);
                        setSearchQuery('');
                      }}>
                      <div className="folder-artwork">
                        {album.firstTrack?.coverUrl ? (
                          <img src={album.firstTrack.coverUrl} alt={album.name} />
                        ) : (
                          <div className="folder-placeholder">🎬</div>
                        )}
                        <div className="folder-disk-behind"></div>
                      </div>
                      <div className="folder-info">
                        <h3 className="folder-title">{album.name}</h3>
                        <p className="folder-count">{album.tracks.length} {mediaType === 'audio' ? 'Tracks' : 'Videos'}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </section>
          ) : (
            <section className="all-songs-section" id="library">
              <h2 className="section-title">
                All {mediaType === 'audio' ? 'Songs' : 'Videos'}
                <span className="song-count">{filteredTracks.length} items</span>
              </h2>

              {filteredTracks.length === 0 ? (
                <div className="state-container">
                  <p>No tracks found. Try a different search or filter.</p>
                </div>
              ) : (
                <div className="songs-grid">
                  {filteredTracks.map((track) => (
                    // We pass 'All Media' as the album name so playback hits the global queue
                    <SongCard key={track.id} song={track} index={track.id} albumName="All Media" />
                  ))}
                </div>
              )}
            </section>
          )}
        </>
      )}
    </main>
  );
}
