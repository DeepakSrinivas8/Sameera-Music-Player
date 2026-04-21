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
function normalizeColumnName(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]/g, '');
}

function findColumn(
  labels: Map<string, number>,
  aliases: string[],
  fallbackIndex: number
): number {
  for (const alias of aliases) {
    const idx = labels.get(normalizeColumnName(alias));
    if (idx !== undefined) return idx;
  }
  return fallbackIndex;
}

function getCellValue(c: any[], index: number): any {
  return index >= 0 ? c[index]?.v : undefined;
}

function getDuration(c: any[], index: number): string {
  if (index < 0) return '0:00';
  const raw = c[index];
  return raw?.f ?? raw?.v ?? '0:00';
}

function sortByTitle(a: Track, b: Track): number {
  return a.title.localeCompare(b.title, undefined, {
    sensitivity: 'base',
    numeric: true,
  });
}

function parseGvizResponse(rawText: string, type: 'audio' | 'video'): Track[] {
  const match = rawText.match(/setResponse\(([\s\S]*)\);?\s*$/);
  if (!match || !match[1]) {
    throw new Error(`Unexpected response format from Google Sheets`);
  }
  const jsonStr = match[1].trim();
  const data = JSON.parse(jsonStr);
  const cols = data?.table?.cols ?? [];
  const rows = data?.table?.rows ?? [];
  const labels = new Map<string, number>();

  cols.forEach((col: any, index: number) => {
    const label = normalizeColumnName(col?.label || col?.id || '');
    if (label) labels.set(label, index);
  });

  const idIndex = findColumn(labels, ['id'], 0);
  const titleIndex = findColumn(labels, ['title', 'name', 'movie'], 1);
  const artistIndex = findColumn(labels, ['artist', 'singer'], type === 'audio' ? 2 : -1);
  const albumIndex = findColumn(labels, ['album', 'movieName'], type === 'audio' ? 3 : -1);
  const genreIndex = findColumn(labels, ['genre', 'category'], type === 'audio' ? 4 : -1);
  const durationIndex = findColumn(labels, ['duration', 'runtime'], type === 'audio' ? 5 : 2);
  const yearIndex = findColumn(labels, ['year'], type === 'audio' ? 6 : 3);
  const mediaUrlIndex = findColumn(
    labels,
    [type === 'video' ? 'videoUrl' : 'audioUrl', 'mediaUrl', 'driveUrl', 'driveLink', 'url'],
    type === 'audio' ? 7 : 4
  );
  const coverUrlIndex = findColumn(
    labels,
    ['coverUrl', 'cover', 'poster', 'posterUrl', 'thumbnail', 'imageUrl'],
    type === 'audio' ? 8 : 5
  );
  return rows
    .map((row: any) => {
      const c = row.c;
      if (!c) return null;
      const title = getCellValue(c, titleIndex) ?? 'Unknown Title';
      if (!getCellValue(c, idIndex) || !title) return null;

      const rawMediaUrl = getCellValue(c, mediaUrlIndex) ?? '';
      const rawCoverUrl = getCellValue(c, coverUrlIndex) ?? '';
      const album = type === 'video' ? title : getCellValue(c, albumIndex) ?? 'Unknown Album';

      return {
        id: getCellValue(c, idIndex) ?? 0,
        title,
        artist: getCellValue(c, artistIndex) ?? '',
        album,
        genre: getCellValue(c, genreIndex) ?? '',
        duration: getDuration(c, durationIndex),
        year: getCellValue(c, yearIndex) ?? 0,
        mediaUrl: convertDriveUrl(rawMediaUrl, 'media'),
        coverUrl: convertDriveUrl(rawCoverUrl, 'image'),
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
  const tracks = parseGvizResponse(text, type).sort(sortByTitle);
  trackCache[type] = tracks;
  return tracks;
}
