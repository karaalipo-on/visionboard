export type PinType = 'image-url' | 'upload' | 'quote' | 'link';

export type PinSortMode =
  | 'manual'
  | 'created-desc'
  | 'created-asc'
  | 'updated-desc'
  | 'updated-asc';

export type ThemeId =
  | 'aurora'
  | 'rose'
  | 'citrine'
  | 'lagoon'
  | 'orchid'
  | 'midnight';

export interface BoardTheme {
  id: ThemeId;
  name: string;
  accentA: string;
  accentB: string;
  glow: string;
  contrast: '#ffffff' | '#12131a';
}

interface BasePin {
  id: string;
  type: PinType;
  caption?: string;
  createdAt: string;
  updatedAt: string;
  isStarred: boolean;
}

export interface ImageUrlPin extends BasePin {
  type: 'image-url';
  imageUrl: string;
  alt?: string;
}

export interface UploadPin extends BasePin {
  type: 'upload';
  imageData: string;
  fileName?: string;
  alt?: string;
}

export interface QuotePin extends BasePin {
  type: 'quote';
  quote: string;
  author?: string;
  themeId: ThemeId;
}

export interface LinkPin extends BasePin {
  type: 'link';
  url: string;
  title: string;
  previewImage?: string;
}

export type Pin = ImageUrlPin | UploadPin | QuotePin | LinkPin;

export interface Board {
  id: string;
  name: string;
  themeId: ThemeId;
  pins: Pin[];
  isStarred: boolean;
  pinSortMode: PinSortMode;
  createdAt: string;
  updatedAt: string;
}

export type AddPinDraft =
  | {
      type: 'image-url';
      imageUrl: string;
      caption: string;
      alt: string;
    }
  | {
      type: 'upload';
      imageData: string;
      fileName: string;
      caption: string;
      alt: string;
    }
  | {
      type: 'quote';
      quote: string;
      author: string;
      caption: string;
      themeId: ThemeId;
    }
  | {
      type: 'link';
      url: string;
      title: string;
      previewImage: string;
      caption: string;
    };
