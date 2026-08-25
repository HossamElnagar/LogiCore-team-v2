import fs from 'fs';
import path from 'path';
import { VectorDocument } from '../../../types/rag.types';

export class LocalKnowledgeRepository {
    private documents: VectorDocument[] = [];

    constructor() {
        this.loadDocuments();
    }

    private loadDocuments(): void {
        const filePath = path.resolve(
            process.cwd(),
            'data',
            'knowledge.txt'
        );

        if (!fs.existsSync(filePath)) {
            console.warn(
                `[LOCAL RAG] Knowledge file not found: ${filePath}`
            );
            return;
        }

        const text = fs.readFileSync(filePath, 'utf-8');
        const chunks = text
            .split(
                /(?=\b(?:DAMAGED SHIPMENT|DELIVERY DISPUTE|VEHICLE BREAKDOWN|DELAYED SHIPMENT|RETURN) POLICY\b)/i
            )
            .map(chunk => chunk.trim())
            .filter(Boolean);

        this.documents = chunks.map((content, index) => ({
            id: `local-${index}`,
            content,
            embedding: [],
            metadata: {
                companyId: 'system',
                contentType: 'KNOWLEDGE_BASE',
                sourceId: `local-doc-${index}`,
                timestamp: new Date(),
                tags: ['local', 'knowledge-base', 'logistics'],
            },
        }));

        console.log(
            `[LOCAL RAG] Loaded ${this.documents.length} documents`
        );
    }

 async search(
  keywords: string[],
  limit: number = 5
): Promise<VectorDocument[]> {

  const normalizedKeywords = keywords
    .map(word =>
      word
        .toLowerCase()
        .replace(/[?.!,]/g, '')
        .trim()
    )
    .filter(word => word.length > 2);

  console.log(
    '[LOCAL RAG] Search keywords:',
    normalizedKeywords
  );

  const scored = this.documents.map(doc => {
    const content = doc.content.toLowerCase();

    let score = 0;

    for (const keyword of normalizedKeywords) {
      if (content.includes(keyword)) {
        score += 1;
      }
    }

    // Bonus when multiple query keywords appear close together
    for (let i = 0; i < normalizedKeywords.length; i++) {
      for (let j = i + 1; j < normalizedKeywords.length; j++) {

        const first = normalizedKeywords[i];
        const second = normalizedKeywords[j];

        if (
          content.includes(first) &&
          content.includes(second)
        ) {
          score += 3;
        }
      }
    }

    // Bonus if the document title contains query keywords
    const title = content.split('\n')[0];

    for (const keyword of normalizedKeywords) {
      if (title.includes(keyword)) {
        score += 2;
      }
    }

    return {
      ...doc,
      score,
    };
  });

  const results = scored
    .filter(doc => (doc.score || 0) > 0)
    .sort((a, b) => (b.score || 0) - (a.score || 0))
    .slice(0, limit);

  console.log(
    '[LOCAL RAG] Results:',
    results.map(doc => ({
      id: doc.id,
      score: doc.score,
      content: doc.content.substring(0, 80),
    }))
  );

  return results;
}}