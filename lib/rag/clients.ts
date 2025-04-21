/**
 * Centralized Vector DB and Reranking clients initialization.
 * Initializes once at the module level for better performance.
 */
import { Index } from '@upstash/vector';
import { CohereClient } from 'cohere-ai';

// Environment variables for client configuration
const upstashVectorUrl = process.env.UPSTASH_VECTOR_REST_URL;
const upstashVectorToken = process.env.UPSTASH_VECTOR_REST_TOKEN;
const cohereApiKey = process.env.COHERE_API_KEY;

// Singleton Vector client
let vectorIndex: Index | null = null;
if (upstashVectorUrl && upstashVectorToken) {
  try {
    vectorIndex = new Index({
      url: upstashVectorUrl,
      token: upstashVectorToken,
    });
    console.log('Upstash Vector client initialized.');
  } catch (error) {
    console.error('Failed to initialize Upstash Vector client:', error);
  }
} else {
  console.warn('Upstash Vector URL or Token not configured. RAG will be disabled.');
}

// Singleton Cohere client
let cohere: CohereClient | null = null;
if (cohereApiKey) {
  try {
    cohere = new CohereClient({ token: cohereApiKey });
    console.log('Cohere client initialized.');
  } catch (error) {
    console.error('Failed to initialize Cohere client:', error);
  }
} else {
  console.log('Cohere API Key not found, reranking will be disabled.');
}

export { vectorIndex, cohere };
