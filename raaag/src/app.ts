import express from 'express';
import http from 'http';
import { Server as SocketIOServer } from 'socket.io';
import mongoose from 'mongoose';
import helmet from 'helmet';
import compression from 'compression';
import cors from 'cors';
import config from './config';

const app = express();
const server = http.createServer(app);
let io: SocketIOServer | null = null;

// CORS for the React frontend.
// This only affects HTTP requests to the RAG service.
app.use(
  cors({
    origin: ['http://localhost:5173'],
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  })
);

app.use(helmet({ contentSecurityPolicy: false }));
app.use(compression());
app.use(express.json());

app.get('/health', (_req, res) => {
  res.json({ status: 'ok', service: 'RAG', version: '1.0.0' });
});

export function getIO(): SocketIOServer | null {
  return io;
}

// ─── RAG Module (requires Qdrant + Redis — disabled by default) ──────────────
let ragLoaded = false;

async function loadRAGModule() {
  if (ragLoaded) return;

  ragLoaded = true;

  if (process.env.ENABLE_RAG !== 'true') {
    console.log('ℹ️  RAG module disabled (ENABLE_RAG != true). Skipping.');
    return;
  }

  try {
    const swaggerUi =
      (await import('swagger-ui-express')).default;

    const { swaggerSpec } =
      await import('./config/swagger');

    const { EmbeddingModel } =
      await import('./services/rag/infrastructure/EmbeddingModel');

    const { VectorStoreRepository } =
      await import('./services/rag/infrastructure/VectorStoreRepository');
const { LocalKnowledgeRepository } =
  await import('./services/rag/infrastructure/LocalKnowledgeRepository');
    const { CacheManager } =
      await import('./services/rag/infrastructure/CacheManager');

    const { QueryAnalyzer } =
      await import('./services/rag/core/QueryAnalyzer');

    const { HybridRetriever } =
      await import('./services/rag/core/HybridRetriever');

    const { CrossEncoderReranker } =
      await import('./services/rag/core/CrossEncoderReranker');

    const { LLMResponseGenerator } =
      await import('./services/rag/core/LLMResponseGenerator');

    const { RAGService } =
      await import('./services/rag/core/RAGService');

    const { TimeSeriesModel } =
      await import('./services/rag/predictive/TimeSeriesModel');

    const { PredictiveAlertEngine } =
      await import('./services/rag/predictive/PredictiveAlertEngine');

    const { ExecutiveReportGenerator } =
      await import('./services/rag/reporting/ExecutiveReportGenerator');

    const { PredictiveAlertScanner } =
      await import('./jobs/rag/PredictiveAlertScanner');

    const { ScheduledReportWorker } =
      await import('./jobs/rag/ScheduledReportWorker');

    const { ActiveLearningWorker } =
      await import('./jobs/rag/ActiveLearningWorker');

    const { initializeRAGSchedulers } =
      await import('./schedulers/ragScheduler');

    const { setupIncidentChatSocket } =
      await import('./sockets/rag/incidentChat.handler');

    const setupRagRoutes =
      (await import('./routes/api/v1/rag.routes')).default;

   const embeddingModel = new EmbeddingModel();

const vectorStore = new VectorStoreRepository();

const localKnowledge = new LocalKnowledgeRepository();

const cache = new CacheManager();
    const ragService = new RAGService(
      embeddingModel,
      vectorStore,
      cache,
      new QueryAnalyzer(),
   new HybridRetriever(localKnowledge),
         new CrossEncoderReranker(),
      new LLMResponseGenerator()
    );

    const alertEngine = new PredictiveAlertEngine(
      new TimeSeriesModel(),
      ragService
    );

    const reportGenerator =
      new ExecutiveReportGenerator(ragService);

    // Swagger docs
    app.use(
      '/api-docs',
      swaggerUi.serve,
      swaggerUi.setup(swaggerSpec, {
        explorer: true,
      })
    );

    app.get('/api-docs.json', (_req, res) => {
      res.setHeader(
        'Content-Type',
        'application/json'
      );

      res.send(swaggerSpec);
    });

    // RAG routes
    app.use(
      '/api/v1/rag',
      setupRagRoutes(
        ragService,
        embeddingModel,
        vectorStore,
        alertEngine,
        reportGenerator
      )
    );

    // Socket & schedulers
    if (io) {
      setupIncidentChatSocket(io, ragService);
    }

    initializeRAGSchedulers(
      new PredictiveAlertScanner(alertEngine),
      new ScheduledReportWorker(reportGenerator),
      new ActiveLearningWorker()
    );

    console.log(
      '✅ RAG module loaded on /api/v1/rag'
    );
  } catch (err) {
    console.warn(
      '⚠️  RAG module failed to load — server continues without it:',
      (err as Error).message
    );
  }
}

// ─── Database & Server Startup ───────────────────────────────────────────────
export async function startServer() {
  try {
    await mongoose.connect(config.mongodbUri);
    console.log('Connected to MongoDB');
  } catch {
    console.warn(
      'MongoDB connection failed. Continuing in offline mode.'
    );
  }

  // Socket.IO CORS remains unchanged.
  io = new SocketIOServer(server, {
    cors: { origin: '*' },
  });

  app.locals.io = io;

  await loadRAGModule();

  if (process.env.NODE_ENV !== 'test') {
    server.listen(config.port, () => {
      console.log(
        `LogiCore RAG Service running on port ${config.port}`
      );
    });
  }

  return { app, server, io };
}

export const ragReady: Promise<void> =
  process.env.ENABLE_RAG === 'true'
    ? loadRAGModule()
    : Promise.resolve();

if (process.env.NODE_ENV !== 'test') {
  startServer();
}

export { app, server };