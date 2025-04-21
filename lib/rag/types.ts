/**
 * Type definitions for the RAG system
 */

// Results returned by vector search
export interface VectorSearchResult {
  id: string | number; // Upstash Vector can return numeric IDs
  score: number;
  data?: string;
  vector?: number[];
  metadata?: Record<string, any>;
}

// Options for configuring RAG
export interface RAGOptions {
  topK?: number;
  includeData?: boolean;
  useReranking?: boolean;
  cohereModel?: string;
  relevanceThreshold?: number;
}

// Results from RAG process, to be used in prompt
export interface RAGResponse {
  contextText: string;
  systemPrompt: string;
  results: VectorSearchResult[];
}
