export interface WordItem {
  term: string;
  meaningCn: string;
  meaningEn: string;
  meaningJp: string;
  meaningJpReading: string;
}

export interface WordGroup {
  id: number;
  title: string;
  words: WordItem[];
  images?: {
    part1?: string; // Words 1-5
    part2?: string; // Words 6-10
  };
  isProcessing?: boolean;
}

export interface ImageConfig {
  userPrompt: string;
}

export enum ProcessingStatus {
  IDLE,
  PROCESSING_TEXT,
  PROCESSING_IMAGES,
  COMPLETED,
  ERROR
}
