import type { Board, BoardTheme, Pin, ThemeId } from './types';

const now = () => new Date().toISOString();

const pinBase = (id: string): Pick<Pin, 'id' | 'createdAt' | 'updatedAt' | 'isStarred'> => {
  const timestamp = now();
  return {
    id,
    createdAt: timestamp,
    updatedAt: timestamp,
    isStarred: false,
  };
};

export const STORAGE_KEY = 'glass-vision-board:v1';

export const THEMES: BoardTheme[] = [
  {
    id: 'aurora',
    name: 'Aurora',
    accentA: '#7c3aed',
    accentB: '#06b6d4',
    glow: 'rgba(124, 58, 237, 0.42)',
    contrast: '#ffffff',
  },
  {
    id: 'rose',
    name: 'Rose Quartz',
    accentA: '#be123c',
    accentB: '#fb7185',
    glow: 'rgba(244, 63, 94, 0.34)',
    contrast: '#ffffff',
  },
  {
    id: 'citrine',
    name: 'Citrine',
    accentA: '#f97316',
    accentB: '#facc15',
    glow: 'rgba(250, 204, 21, 0.26)',
    contrast: '#12131a',
  },
  {
    id: 'lagoon',
    name: 'Lagoon',
    accentA: '#0f766e',
    accentB: '#22d3ee',
    glow: 'rgba(34, 211, 238, 0.28)',
    contrast: '#ffffff',
  },
  {
    id: 'orchid',
    name: 'Orchid',
    accentA: '#a21caf',
    accentB: '#f0abfc',
    glow: 'rgba(217, 70, 239, 0.28)',
    contrast: '#ffffff',
  },
  {
    id: 'midnight',
    name: 'Midnight',
    accentA: '#1e1b4b',
    accentB: '#4f46e5',
    glow: 'rgba(79, 70, 229, 0.3)',
    contrast: '#ffffff',
  },
];

export const getTheme = (themeId: ThemeId): BoardTheme =>
  THEMES.find((theme) => theme.id === themeId) ?? THEMES[0];

export const DEFAULT_BOARDS: Board[] = [
  {
    id: 'board-vision',
    name: 'Vision Board',
    themeId: 'aurora',
    isStarred: false,
    pinSortMode: 'manual',
    createdAt: now(),
    updatedAt: now(),
    pins: [
      {
        ...pinBase('pin-vision-quote'),
        type: 'quote',
        quote: 'Design a life that feels as good on the inside as it looks on the outside.',
        author: 'Daily intention',
        caption: 'Core energy for this season',
        themeId: 'aurora',
      },
      {
        ...pinBase('pin-vision-link'),
        type: 'link',
        title: 'Portfolio inspiration',
        url: 'https://dribbble.com/',
        caption: 'A place to save visual ideas and creative direction.',
      },
    ],
  },
  {
    id: 'board-travel',
    name: 'Dream Travel',
    themeId: 'lagoon',
    isStarred: false,
    pinSortMode: 'manual',
    createdAt: now(),
    updatedAt: now(),
    pins: [
      {
        ...pinBase('pin-travel-photo'),
        type: 'image-url',
        imageUrl: 'https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?auto=format&fit=crop&w=1200&q=80',
        caption: 'Slow mornings, scenic walks, and beautiful light.',
        alt: 'A peaceful lakeside travel scene at golden hour',
      },
    ],
  },
  {
    id: 'board-career',
    name: 'Career Goals',
    themeId: 'rose',
    isStarred: false,
    pinSortMode: 'manual',
    createdAt: now(),
    updatedAt: now(),
    pins: [
      {
        ...pinBase('pin-career-quote'),
        type: 'quote',
        quote: 'Build proof, not pressure. Small wins compound.',
        author: 'Career mantra',
        caption: 'For focused work weeks.',
        themeId: 'rose',
      },
    ],
  },
];

export const createId = (prefix: string) => {
  if ('crypto' in window && typeof window.crypto.randomUUID === 'function') {
    return `${prefix}-${window.crypto.randomUUID()}`;
  }

  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`;
};
