/// <reference types="vite/client" />

export interface Track {
  id: number;
  title: string;
  artist: string;
  album: string;
  genre: string;
  duration: string;
  year: number;
  mediaUrl: string;
  coverUrl: string;
  isFeatured: boolean;
  /** Set only on synthetic quick-play tracks — indicates actual media kind */
  mediaKind?: 'audio' | 'video';
  /** Flag to render an iframe instead of an HTML5 video tag */
  isYoutube?: boolean;
}

// ─── CONFIG ────────────────────────────────────────────────────────────────────
// Your Google Sheet ID (from the URL)
const SHEET_ID = '1uukdGbx8WfHP7x8EKJwdy3UJcaBARAq6Lf5J09zjfNs';
const SHEET_NAME = 'songs';

// Your Google API key — needed to stream audio from Google Drive.
// Get one at: https://console.cloud.google.com/apis/credentials
// Enable "Google Drive API" and restrict the key to the Drive API scope.
// IMPORTANT: You can restrict this key to your domain for security.
const GOOGLE_API_KEY = import.meta.env.VITE_GOOGLE_API_KEY ?? '';
// ────────────────────────────────────────────────────────────────────────────────

/**
 * Extracts the Google Drive file ID from any common Drive URL format:
 *   /file/d/<ID>/view|edit|preview
 *   docs.google.com/uc?...&id=<ID>
 *   drive.google.com/uc?...&id=<ID>
 */
export function extractDriveFileId(url: string): string | null {
  if (!url || url === 'PASTE_DRIVE_LINK_HERE') return null;
  const fileMatch = url.match(/\/file\/d\/([a-zA-Z0-9_-]+)/);
  const idMatch = url.match(/[?&]id=([a-zA-Z0-9_-]+)/);
  return fileMatch?.[1] ?? idMatch?.[1] ?? null;
}

/**
 * Converts a Drive URL to the right format for its type.
 *
 * - Images: Drive Thumbnail API — works publicly, no auth needed.
 * - Audio:  Google Drive Files API with ?alt=media&key=... — serves the raw
 *           audio bytes with proper headers that <audio> can stream.
 *           Requires a Google API key but works for any public Drive file
 *           without user login.
 */
export function convertDriveUrl(url: string, type: 'media' | 'image'): string {
  const fileId = extractDriveFileId(url);
  if (!fileId) return url; // Not a recognised Drive URL — use as-is

  if (type === 'image') {
    // Drive Thumbnail API: serves image directly, no CORS, no auth required
    return `https://drive.google.com/thumbnail?id=${fileId}&sz=w400`;
  } else {
    if (!GOOGLE_API_KEY) {
      // Fallback with no API key — will likely fail for audio but won't crash
      console.warn('[Sameera] VITE_GOOGLE_API_KEY is not set. Media may not play.');
      return `https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`;
    }
    // Files API with alt=media streams the raw file bytes
    return `https://www.googleapis.com/drive/v3/files/${fileId}?alt=media&key=${GOOGLE_API_KEY}`;
  }
}

/**
 * Parses the gviz JSONP response into Song objects.
 */
function parseGvizResponse(rawText: string): Track[] {
  const match = rawText.match(/setResponse\(([\s\S]*)\);?\s*$/);
  if (!match || !match[1]) {
    throw new Error(`Unexpected response format from Google Sheets`);
  }
  const jsonStr = match[1].trim();
  const data = JSON.parse(jsonStr);
  const rows = data?.table?.rows ?? [];

  return rows
    .map((row: any) => {
      const c = row.c;
      if (!c || !c[0]?.v) return null;

      const durationRaw = c[5];
      let duration = '0:00';
      if (durationRaw?.f) {
        duration = durationRaw.f;
      }

      const rawAudioUrl = c[7]?.v ?? '';
      const rawCoverUrl = c[8]?.v ?? '';

      return {
        id: c[0]?.v ?? 0,
        title: c[1]?.v ?? 'Unknown Title',
        artist: c[2]?.v ?? 'Unknown Artist',
        album: c[3]?.v ?? 'Unknown Album',
        genre: c[4]?.v ?? 'Unknown',
        duration,
        year: c[6]?.v ?? 0,
        mediaUrl: convertDriveUrl(rawAudioUrl, 'media'),
        coverUrl: convertDriveUrl(rawCoverUrl, 'image'),
        isFeatured: c[9]?.v ?? false,
      } as Track;
    })
    .filter(Boolean) as Track[];
}

const trackCache: Record<'audio' | 'video', Track[] | null> = {
  audio: null,
  video: null,
};

/**
 * Queries the Drive Files API to get the real MIME type of a file.
 * Returns 'audio', 'video', or null (if not a Drive link or the API call fails).
 *
 * This is the ONLY reliable way to distinguish audio from video for bare
 * Drive share links like /file/d/<ID>/view — the ID alone carries no type info.
 */
export async function fetchDriveMimeType(
  driveUrl: string
): Promise<'audio' | 'video' | null> {
  const fileId = extractDriveFileId(driveUrl);
  if (!fileId || !GOOGLE_API_KEY) return null;

  try {
    const res = await fetch(
      `https://www.googleapis.com/drive/v3/files/${fileId}?fields=mimeType&key=${GOOGLE_API_KEY}`
    );
    if (!res.ok) return null;
    const data: { mimeType?: string } = await res.json();
    const mime = data.mimeType ?? '';
    if (mime.startsWith('video/')) return 'video';
    if (mime.startsWith('audio/')) return 'audio';
    return null;
  } catch {
    return null;
  }
}

export async function fetchTracks(type: 'audio' | 'video'): Promise<Track[]> {
  if (trackCache[type]) {
    return trackCache[type]!;
  }

  const sheetQuery = type === 'video' ? 'gid=2044122217' : `sheet=${encodeURIComponent(SHEET_NAME)}`;
  const url = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/gviz/tq?tqx=out:json&${sheetQuery}`;

  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Failed to fetch sheet: ${response.statusText}`);
  }

  const text = await response.text();
  const tracks = parseGvizResponse(text);
  trackCache[type] = tracks;
  return tracks;
}
