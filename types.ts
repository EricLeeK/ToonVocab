export interface Word {
  id: string;
  term: string;
  meaningCn: string; // Chinese (Mother tongue)
  meaningEn: string; // English definition
  meaningJp: string; // Japanese
  meaningJpReading: string; // Japanese Furigana (Hiragana)
}

export interface WordGroup {
  id: string;
  title: string; // e.g., "Day 1", "Fruits"
  createdAt: number;
  imageUrl?: string; // First/main image (kept for backward compatibility)
  imageUrls?: string[]; // Array of additional images
  words: Word[];
  lastScore?: number;
  passed?: boolean;
}

export type ViewState = 'HOME' | 'CREATE' | 'STUDY' | 'REVIEW' | 'ARTICLE_PICKER';