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

export type ViewState = 'HOME' | 'CREATE' | 'STUDY' | 'REVIEW' | 'TOOLBOX' | 'ARTICLE_PICKER' | 'WORD_FACTORY' | 'WORD_FACTORY_SETTINGS';

// Word Factory Types
export type AIProvider = 'gemini' | 'deepseek' | 'siliconflow';

export interface AISettings {
  selectedProvider: AIProvider;
  geminiApiKey: string;
  deepseekApiKey: string;
  siliconflowApiKey: string;
}

export interface WordFactoryItem {
  term: string;
  meaningCn: string;
  meaningEn: string;
  meaningJp: string;
  meaningJpReading: string;
}

export interface WordFactoryGroup {
  id: number;
  title: string;
  words: WordFactoryItem[];
  images?: {
    part1?: string;
    part2?: string;
  };
  isProcessing?: boolean;
}

export enum WordFactoryStatus {
  IDLE = 'IDLE',
  PROCESSING = 'PROCESSING',
  COMPLETED = 'COMPLETED',
  ERROR = 'ERROR'
}