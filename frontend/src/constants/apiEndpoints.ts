export const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL || "http://localhost:5000/api";

// RAG endpoints (raaag service — port 3001)
const RAG_BASE =
  import.meta.env.VITE_RAG_BASE_URL || "http://localhost:3001/api/v1/rag";

export const RAG_QUERY_URL = `${RAG_BASE}/query`;
export const RAG_FEEDBACK_URL = `${RAG_BASE}/feedback/rate`;
export const RAG_HEALTH_URL = `http://localhost:3001/health`;

export const ENABLE_RAG =
  import.meta.env.VITE_ENABLE_RAG === "true" || import.meta.env.DEV;