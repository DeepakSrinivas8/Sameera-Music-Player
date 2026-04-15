import { useState, useRef, useEffect, useCallback } from 'react';
import { Link2, Play, Music, Film, X, Zap, AlertCircle, Loader2 } from 'lucide-react';
import { usePlayer } from '../context/PlayerContext';
import { extractDriveFileId, fetchDriveMimeType } from '../services/sheetService';
import '../styles/QuickPlay.css';

type MediaKind = 'audio' | 'video';
type DetectionState =
  | { status: 'idle' }
  | { status: 'probing' }
  | { status: 'detected'; type: MediaKind; source: 'api' | 'extension' | 'youtube' | 'guess' }
  | { status: 'unknown' }; // Drive link but API returned nothing useful

// ─── Fast extension-based sniff (high confidence, no network needed) ─────────
function sniffFromExtension(url: string): MediaKind | null {
  const s = url.toLowerCase();
  if (/\.(mp4|mkv|webm|mov|avi|m4v|ogv|3gp|flv)(\?|$|#)/i.test(s)) return 'video';
  if (/\.(mp3|flac|wav|ogg|m4a|aac|opus|wma|aiff)(\?|$|#)/i.test(s)) return 'audio';
  return null;
}

export function QuickPlay() {
  const { playUrl } = usePlayer();
  const [url, setUrl] = useState('');
  const [error, setError] = useState('');
  const [detection, setDetection] = useState<DetectionState>({ status: 'idle' });
  // Manual override — only shown when auto-detection returns 'unknown'
  const [manualType, setManualType] = useState<MediaKind>('audio');
  const inputRef = useRef<HTMLInputElement>(null);
  const debounceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ─── Run detection whenever URL changes ──────────────────────────────────
  const runDetection = useCallback(async (rawUrl: string) => {
    const trimmed = rawUrl.trim();

    if (!trimmed) {
      setDetection({ status: 'idle' });
      return;
    }

    // Step 0: Check YouTube URLs instantly
    const ytRegex = /(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/i;
    if (ytRegex.test(trimmed)) {
      setDetection({ status: 'detected', type: 'video', source: 'youtube' });
      return;
    }

    // Step 1: try extension — instant, no network
    const fromExt = sniffFromExtension(trimmed);
    if (fromExt) {
      setDetection({ status: 'detected', type: fromExt, source: 'extension' });
      return;
    }

    // Step 2: if it's a Drive link, call the API for the real mimeType
    const isDrive = extractDriveFileId(trimmed) !== null;
    if (isDrive) {
      setDetection({ status: 'probing' });
      const apiType = await fetchDriveMimeType(trimmed);
      if (apiType) {
        setDetection({ status: 'detected', type: apiType, source: 'api' });
      } else {
        // API returned nothing useful — show manual toggle
        setDetection({ status: 'unknown' });
      }
      return;
    }

    // Step 3: Non-Drive URL with no extension — just show manual toggle
    setDetection({ status: 'unknown' });
  }, []);

  // Debounce detection as user types (500 ms)
  useEffect(() => {
    if (debounceTimer.current) clearTimeout(debounceTimer.current);
    debounceTimer.current = setTimeout(() => runDetection(url), 500);
    return () => { if (debounceTimer.current) clearTimeout(debounceTimer.current); };
  }, [url, runDetection]);

  const resolvedType = (): MediaKind => {
    if (detection.status === 'detected') return detection.type;
    return manualType;
  };

  const handlePlay = () => {
    const trimmed = url.trim();
    if (!trimmed) { setError('Paste a URL first.'); return; }
    const looksLikeUrl = /^https?:\/\//i.test(trimmed);
    if (!looksLikeUrl) { setError("Doesn't look like a valid URL."); return; }

    playUrl(trimmed, resolvedType());
    setUrl('');
    setError('');
    setDetection({ status: 'idle' });
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') handlePlay();
  };

  const handleClear = () => {
    setUrl('');
    setError('');
    setDetection({ status: 'idle' });
    inputRef.current?.focus();
  };

  // ─── Badge content ────────────────────────────────────────────────────────
  const renderBadge = () => {
    if (detection.status === 'idle') return null;
    if (detection.status === 'probing') return (
      <span className="qp-badge qp-badge--probing">
        <Loader2 size={11} className="qp-spin" /> Detecting…
      </span>
    );
    if (detection.status === 'detected') {
      const { type, source } = detection;
      return (
        <span className={`qp-badge ${type === 'video' ? 'qp-badge--video' : 'qp-badge--audio'}`}>
          {type === 'video' ? <Film size={11} /> : <Music size={11} />}
          {type === 'video' ? 'Video' : 'Audio'}
          {source === 'api' && <span className="qp-badge-verified" title="Verified via Drive API">✓</span>}
        </span>
      );
    }
    // unknown — needs manual pick, rendered below instead of badge
    return null;
  };

  return (
    <div className="qp-card">
      {/* Header */}
      <div className="qp-card-header">
        <Zap size={14} className="qp-zap" />
        <span className="qp-card-title">Quick Play</span>
        {renderBadge()}
      </div>

      <p className="qp-card-hint">Paste a Drive or YouTube link to play without adding to library</p>

      {/* URL input */}
      <div className={`qp-input-row ${error ? 'qp-input-row--error' : url ? 'qp-input-row--filled' : ''}`}>
        <Link2 size={14} className="qp-row-icon" />
        <input
          ref={inputRef}
          id="qp-url-input"
          className="qp-url-input"
          type="url"
          placeholder="drive.google.com/… or youtu.be/…"
          value={url}
          onChange={(e) => { setUrl(e.target.value); setError(''); }}
          onKeyDown={handleKeyDown}
          autoComplete="off"
          spellCheck={false}
        />
        {url && (
          <button className="qp-clear-btn" onClick={handleClear} aria-label="Clear">
            <X size={12} />
          </button>
        )}
      </div>

      {error && (
        <div className="qp-error">
          <AlertCircle size={12} /> {error}
        </div>
      )}

      {/* Manual type picker — only shown when detection couldn't determine the type */}
      {detection.status === 'unknown' && (
        <div className="qp-manual-row">
          <span className="qp-manual-label">Couldn't detect type — pick one:</span>
          <div className="qp-kind-toggle">
            <button
              className={`qp-kind-btn ${manualType === 'audio' ? 'qp-kind-btn--active' : ''}`}
              onClick={() => setManualType('audio')}
            >
              <Music size={13} /> Audio
            </button>
            <button
              className={`qp-kind-btn ${manualType === 'video' ? 'qp-kind-btn--active' : ''}`}
              onClick={() => setManualType('video')}
            >
              <Film size={13} /> Video
            </button>
          </div>
        </div>
      )}

      {/* Play button */}
      <button
        className="qp-play-btn"
        onClick={handlePlay}
        disabled={detection.status === 'probing'}
        id="qp-play-btn"
        aria-label="Play URL"
      >
        {detection.status === 'probing'
          ? <><Loader2 size={15} className="qp-spin" /> Detecting…</>
          : <><Play size={15} /> Play Now</>
        }
      </button>
    </div>
  );
}
