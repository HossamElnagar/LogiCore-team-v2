import { VectorStoreRepository } from '../services/rag/infrastructure/VectorStoreRepository';
import { EmbeddingModel } from '../services/rag/infrastructure/EmbeddingModel';
import config from '../config';

async function verify() {
  const vectorStore = new VectorStoreRepository();
  const embeddingModel = new EmbeddingModel();
  const query = "damaged shipment procedure";
  const embedding = await embeddingModel.encodeText(query);
  const results = await vectorStore.similaritySearch(embedding, {
    companyId: 'system',
    limit: 3,
  });
  console.log('🔍 Found documents:', results.length);
  results.forEach((doc, i) => {
    console.log(`\n${i+1}. Score: ${doc.score}`);
    console.log(`   Content: ${doc.content.substring(0, 150)}...`);
  });
}
verify().catch(console.error);
