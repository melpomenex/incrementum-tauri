export interface StudyDeck {
  id: string;
  name: string;
  tagFilters: string[];
  createdAt?: string;
  updatedAt?: string;
}

export type StudyDeckId = string;
