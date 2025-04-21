/**
 * Retrieval-Augmented Generation (RAG) implementation
 * Handles searching, reranking, and formatting context for AI prompts
 */
import { vectorIndex, cohere } from './clients';
import { RAGOptions, RAGResponse, VectorSearchResult } from './types';

/**
 * Extract text content from a user message part
 * Handles different message part formats safely
 */
export function extractUserQuery(messagePart: any): string {
  if (typeof messagePart === 'string') {
    return messagePart;
  } else if (messagePart && typeof messagePart === 'object') {
    // Try to get text content from various possible formats
    if ('text' in messagePart && typeof messagePart.text === 'string') {
      return messagePart.text;
    } else if ('content' in messagePart && typeof messagePart.content === 'string') {
      return messagePart.content;
    }
  }
  return '';
}

/**
 * Main RAG function - Performs vector search, optional reranking, and context formatting
 */
export async function generateRAGContext(
  userQuery: string,
  options: RAGOptions = {}
): Promise<RAGResponse | null> {
  // Default options
  const {
    topK = 5,
    includeData = true,
    useReranking = true,
    cohereModel = 'rerank-english-v2.0',
    relevanceThreshold = 0.1
  } = options;

  // Check if we can perform RAG
  if (!vectorIndex || !userQuery || userQuery.trim().length === 0) {
    console.log('RAG unavailable or empty query');
    return null;
  }

  try {
    console.log('Attempting RAG using Upstash internal embedding...');
    console.log(`Querying Upstash Vector with data: "${userQuery.substring(0, 50)}..."`);

    // Step 1: Get context from Upstash Vector
    let vectorResults = await vectorIndex.query({
      data: userQuery,
      topK,
      includeData,
    });

    // Ensure we got results
    if (!vectorResults || vectorResults.length === 0) {
      console.log('No context retrieved from vector search.');
      return null;
    }

    // Step 2: Optional Cohere Reranking
    let finalResults = vectorResults;

    if (useReranking && cohere && vectorResults.length > 1) {
      console.log(`Attempting to rerank ${vectorResults.length} documents with Cohere...`);
      try {
        // Prepare documents for Cohere (extract 'data' field)
        const documentsToRerank = vectorResults
          .map(result => (
            typeof result.data === 'string' && result.data.trim() !== '' ? result.data : ''
          ))
          .filter(doc => doc !== '');

        if (documentsToRerank.length > 0) {
          const rerankResponse = await cohere.rerank({
            query: userQuery,
            documents: documentsToRerank,
            topN: topK,
            model: cohereModel
          });

          console.log(`Cohere reranking successful. Top result score: ${rerankResponse.results[0]?.relevanceScore}`);

          // Map reranked results back to original documents based on index, sorted by relevance
          const rerankedResults = rerankResponse.results
            .filter(result => result.relevanceScore !== undefined && result.relevanceScore > relevanceThreshold)
            .sort((a, b) => (b.relevanceScore ?? 0) - (a.relevanceScore ?? 0))
            .map(result => {
              const originalDoc = vectorResults[result.index];
              return {
                ...originalDoc,
                score: result.relevanceScore ?? originalDoc.score
              } as VectorSearchResult;
            });

          if (rerankedResults.length > 0) {
            finalResults = rerankedResults;
            console.log(`Using ${finalResults.length} reranked documents.`);
          } else {
            console.log('Cohere reranking did not return relevant documents, using original vector search order.');
          }
        } else {
          console.log('No valid document data found to send for reranking.');
        }
      } catch (rerankError) {
        console.error('Cohere reranking failed:', rerankError);
        // Proceed with original results if reranking fails
      }
    } else if (useReranking && !cohere) {
      console.log('Cohere client not available, skipping reranking.');
    } else if (useReranking && vectorResults.length <= 1) {
      console.log('Skipping Cohere reranking as there are not enough documents (<=1).');
    }

    // Step 3: Format context for AI prompt
    const formattedContext = finalResults
      .map((result, index) => {
        const docData = typeof result.data === 'string' && result.data.trim() !== ''
          ? result.data
          : 'No content available';
        const score = result.score.toFixed(4);
        return `${index + 1}: ${docData}`;
      })
      .join('\n\n---\n\n');

    // Create the final system prompt with the context
    const systemPrompt = `You are a helpful AI assistant. The user has asked the following question: "${userQuery}"\r\n\r\n` +
      `Here is a ranked list of context that you can use to answer the user's question:\n${formattedContext}\n\n` +
      console.log('Constructed system prompt with formatted retrieved context.');

    return {
      contextText: formattedContext,
      systemPrompt,
      results: finalResults
    };
  } catch (error) {
    console.error('Error during RAG process:', error);
    return null;
  }
}
