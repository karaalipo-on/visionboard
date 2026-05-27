import { DEFAULT_BOARDS, STORAGE_KEY, THEMES, createId } from './data';
import type { Board, Pin, PinType, ThemeId } from './types';

const themeIds = new Set(THEMES.map((theme) => theme.id));
const pinTypes = new Set<PinType>(['image-url', 'upload', 'quote', 'link']);

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const asString = (value: unknown, fallback = '') =>
  typeof value === 'string' ? value : fallback;

const asThemeId = (value: unknown, fallback: ThemeId = 'aurora'): ThemeId => {
  return typeof value === 'string' && themeIds.has(value as ThemeId) ? (value as ThemeId) : fallback;
};

const asDateString = (value: unknown) => {
  const candidate = asString(value);
  return Number.isNaN(Date.parse(candidate)) ? new Date().toISOString() : candidate;
};

const normalizePin = (value: unknown): Pin | null => {
  if (!isRecord(value)) return null;
  const type = asString(value.type) as PinType;
  if (!pinTypes.has(type)) return null;

  const base = {
    id: asString(value.id, createId('pin')),
    caption: asString(value.caption).trim() || undefined,
    createdAt: asDateString(value.createdAt),
  };

  if (type === 'image-url') {
    const imageUrl = asString(value.imageUrl).trim();
    if (!imageUrl) return null;
    return {
      ...base,
      type,
      imageUrl,
      alt: asString(value.alt).trim() || undefined,
    };
  }

  if (type === 'upload') {
    const imageData = asString(value.imageData).trim();
    if (!imageData.startsWith('data:image/')) return null;
    return {
      ...base,
      type,
      imageData,
      fileName: asString(value.fileName).trim() || undefined,
      alt: asString(value.alt).trim() || undefined,
    };
  }

  if (type === 'quote') {
    const quote = asString(value.quote).trim();
    if (!quote) return null;
    return {
      ...base,
      type,
      quote,
      author: asString(value.author).trim() || undefined,
      themeId: asThemeId(value.themeId),
    };
  }

  const url = asString(value.url).trim();
  const title = asString(value.title).trim();
  if (!url || !title) return null;
  return {
    ...base,
    type: 'link',
    url,
    title,
    previewImage: asString(value.previewImage).trim() || undefined,
  };
};

export const normalizeBoards = (value: unknown): Board[] | null => {
  if (!Array.isArray(value)) return null;

  const boards = value
    .map((rawBoard) => {
      if (!isRecord(rawBoard)) return null;

      const pins = Array.isArray(rawBoard.pins)
        ? rawBoard.pins.map(normalizePin).filter((pin): pin is Pin => Boolean(pin))
        : [];

      const name = asString(rawBoard.name, 'Untitled board').trim() || 'Untitled board';

      return {
        id: asString(rawBoard.id, createId('board')),
        name,
        themeId: asThemeId(rawBoard.themeId),
        pins,
        createdAt: asDateString(rawBoard.createdAt),
        updatedAt: asDateString(rawBoard.updatedAt),
      } satisfies Board;
    })
    .filter((board): board is Board => Boolean(board));

  return boards.length > 0 ? boards : null;
};

export const readBoards = (): Board[] => {
  try {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    if (!stored) return DEFAULT_BOARDS;

    const parsed = JSON.parse(stored) as unknown;
    return normalizeBoards(parsed) ?? DEFAULT_BOARDS;
  } catch {
    return DEFAULT_BOARDS;
  }
};

export const saveBoards = (boards: Board[]) => {
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(boards));
};

export const resetBoards = () => {
  window.localStorage.removeItem(STORAGE_KEY);
};
