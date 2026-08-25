import { LocalKnowledgeRepository } from '../infrastructure/LocalKnowledgeRepository';
import { AnalyzedQuery } from './QueryAnalyzer';
import { UserContext, VectorDocument } from '../../../types/rag.types';

export class HybridRetriever {
  constructor(
    private localKnowledge: LocalKnowledgeRepository
  ) {}

  async retrieve(
    analyzed: AnalyzedQuery,
    context: UserContext,
    weights: {
      vectorWeight: number;
      keywordWeight: number;
      graphWeight: number;
    }
  ): Promise<VectorDocument[]> {

   const docs = await this.localKnowledge.search(
  analyzed.keywords,
  3
);

    console.log(
      `[LOCAL RAG] Retrieved ${docs.length} documents`
    );

    return docs;
  }
}