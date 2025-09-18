// Search Result Types
export interface SearchResult {
  id: string;
  title: string;
  content: string;
  url?: string | undefined;
  score: number;
  metadata?: Record<string, any>;
}

export interface SearchRequest {
  query: string;
  userId?: string;
  limit?: number;
  offset?: number;
  filters?: Record<string, any>;
  context?: SearchContext;
}

export interface SearchContext {
  location?: {
    lat: number;
    lng: number;
    radius?: number;
  };
  timestamp?: Date;
  device?: string;
  sessionId?: string;
  previousQueries?: string[];
}

// Layer-specific Types
export interface Layer1Result {
  documentIds: string[];
  totalCount: number;
  executionTime: number;
}

export interface Layer2Result {
  results: SearchResult[];
  totalCount: number;
  executionTime: number;
}

export interface Layer3Result {
  results: SearchResult[];
  totalCount: number;
  executionTime: number;
  vectorScores: number[];
}

export interface Layer4Result {
  results: SearchResult[];
  totalCount: number;
  executionTime: number;
  personalizationScore: number;
}

// User Profile Types
export interface UserProfile {
  userId: string;
  preferences: {
    categories: string[];
    languages: string[];
    topics: string[];
  };
  behavior: {
    clickHistory: string[];
    searchHistory: string[];
    timeSpent: Record<string, number>;
  };
  demographics?: {
    age?: number;
    location?: string;
    interests?: string[];
  };
  lastUpdated: Date;
}

// Document Types
export interface Document {
  id: string;
  title: string;
  content: string;
  url?: string;
  category?: string;
  tags?: string[];
  createdAt: Date;
  updatedAt: Date;
  metadata?: Record<string, any>;
}

// Inverted Index Types
export interface InvertedIndexEntry {
  term: string;
  documentIds: Set<string>;
  termFrequency: Map<string, number>;
  documentFrequency: number;
}

export interface InvertedIndex {
  index: Map<string, InvertedIndexEntry>;
  documentCount: number;
  totalTerms: number;
}

// BM25 Types
export interface BM25Params {
  k1: number;
  b: number;
}

export interface BM25Score {
  documentId: string;
  score: number;
  termScores: Record<string, number>;
}

// Vector Search Types
export interface VectorEmbedding {
  documentId: string;
  vector: number[];
  metadata?: Record<string, any>;
}

export interface VectorSearchResult {
  documentId: string;
  similarity: number;
  vector: number[];
}

// ML Model Types
export interface MLModel {
  name: string;
  version: string;
  load(): Promise<void>;
  encode(text: string): Promise<number[]>;
  isLoaded: boolean;
}

// Error Types
export class SearchError extends Error {
  constructor(message: string, public code: string, public layer?: string) {
    super(message);
    this.name = "SearchError";
  }
}

export class LayerError extends SearchError {
  constructor(
    message: string,
    public override layer: string,
    public originalError?: Error
  ) {
    super(message, "LAYER_ERROR", layer);
    this.name = "LayerError";
  }
}
