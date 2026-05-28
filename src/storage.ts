import { DEFAULT_BOARDS, STORAGE_KEY, THEMES, createId } from './data';
import type { Board, Pin, PinSortMode, PinType, ThemeId } from './types';

const themeIds = new Set(THEMES.map((theme) => theme.id));
const pinTypes = new Set<PinType>(['image-url', 'upload', 'quote', 'link']);
const pinSortModes = new Set<PinSortMode>(['manual', 'created-desc', 'created-asc', 'updated-desc', 'updated-asc']);

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const asString = (value: unknown, fallback = '') =>
  typeof value === 'string' ? value : fallback;

const asBoolean = (value: unknown, fallback = false) =>
  typeof value === 'boolean' ? value : fallback;

const asThemeId = (value: unknown, fallback: ThemeId = 'aurora'): ThemeId => {
  return typeof value === 'string' && themeIds.has(value as ThemeId) ? (value as ThemeId) : fallback;
};

const asPinSortMode = (value: unknown, fallback: PinSortMode = 'manual'): PinSortMode => {
  return typeof value === 'string' && pinSortModes.has(value as PinSortMode)
    ? (value as PinSortMode)
    : fallback;
};

const asDateString = (value: unknown, fallback = new Date().toISOString()) => {
  const candidate = asString(value);
  return Number.isNaN(Date.parse(candidate)) ? fallback : candidate;
};

const normalizePin = (value: unknown): Pin | null => {
  if (!isRecord(value)) return null;
  const type = asString(value.type) as PinType;
  if (!pinTypes.has(type)) return null;

  const createdAt = asDateString(value.createdAt);
  const updatedAt = asDateString(value.updatedAt, createdAt);

  const base = {
    id: asString(value.id, createId('pin')),
    caption: asString(value.caption).trim() || undefined,
    createdAt,
    updatedAt,
    isStarred: asBoolean(value.isStarred, false),
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
      const createdAt = asDateString(rawBoard.createdAt);

      return {
        id: asString(rawBoard.id, createId('board')),
        name,
        themeId: asThemeId(rawBoard.themeId),
        pins,
        isStarred: asBoolean(rawBoard.isStarred, false),
        pinSortMode: asPinSortMode(rawBoard.pinSortMode, 'manual'),
        createdAt,
        updatedAt: asDateString(rawBoard.updatedAt, createdAt),
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
