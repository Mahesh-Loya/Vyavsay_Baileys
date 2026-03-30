import { OpenAI } from 'openai';
import { SupabaseClient } from '@supabase/supabase-js';
import { config } from '../config/environment.js';

const openai = new OpenAI({
  baseURL: 'https://models.inference.ai.azure.com',
  apiKey: config.GITHUB_PAT,
});

export class RagService {
  constructor(private supabase: SupabaseClient) {}

  /** Search knowledge base for relevant chunks via pgvector */
  async searchKnowledge(userId: string, queryText: string, topK = 5): Promise<string[]> {
    try {
      const result = await openai.embeddings.create({
        model: 'text-embedding-3-small',
        input: queryText,
      });
      const queryEmbedding = result.data[0].embedding;

      const { data, error } = await this.supabase.rpc('wb_match_knowledge', {
        query_embedding: JSON.stringify(queryEmbedding),
        match_threshold: 0.1,
        match_count: topK,
        p_user_id: userId,
      });

      if (error) {
        console.error('❌ Knowledge search error:', error);
        return [];
      }

      return (data || []).map((row: any) => row.content);
    } catch (err) {
      console.error('❌ RAG search failed:', err);
      return [];
    }
  }

  /** Chunk text, embed each chunk, and store in wb_knowledge_base */
  async embedAndStore(
    userId: string,
    text: string,
    sourceFile?: string
  ): Promise<number> {
    const chunks = this.chunkText(text, 500, 50);
    let stored = 0;

    for (const chunk of chunks) {
      try {
        const result = await openai.embeddings.create({
          model: 'text-embedding-3-small',
          input: chunk,
        });
        const embedding = result.data[0].embedding;

        const { error } = await this.supabase.from('wb_knowledge_base').insert({
          user_id: userId,
          content: chunk,
          embedding: JSON.stringify(embedding),
          source_file: sourceFile || null,
        });

        if (!error) stored++;
      } catch (err) {
        console.error('❌ Failed to embed chunk:', err);
      }
    }

    return stored;
  }

  /** Split text into overlapping chunks */
  private chunkText(text: string, chunkSize: number, overlap: number): string[] {
    const words = text.split(/\s+/);
    const chunks: string[] = [];

    for (let i = 0; i < words.length; i += chunkSize - overlap) {
      const chunk = words.slice(i, i + chunkSize).join(' ');
      if (chunk.length > 20) chunks.push(chunk);
    }

    return chunks;
  }
}
