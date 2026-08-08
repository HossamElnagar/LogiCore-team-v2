import api from "../../api/axios";
import type {
  ShipmentDetailApiResponse,
  ShipmentListResponse,
  UpdateShipmentStatusPayload,
} from "./shipment.types";

export const shipmentService = {
  listShipments: async (companyId?: string) => {
    
    const response = await api.get<ShipmentListResponse>("/shipments", {
      params: companyId ? { companyId } : {},
    });
    return response.data;
  },

  getShipmentById: async (id: string) => {
    const response = await api.get<ShipmentDetailApiResponse>(`/shipments/${id}`);
    return response.data;
  },

  updateShipmentStatus: async (id: string, payload: UpdateShipmentStatusPayload) => {
    const response = await api.patch<{ success: boolean; data: any }>(`/shipments/${id}/status`, payload);
    return response.data;
  },

  importCsv: async (csvData: string) => {
    const response = await api.post("/shipments/import-csv", { csvData });
    return response.data;
  },
  submitBatchForApproval: async (batchId: string) => {
    const response = await api.post("/shipments/submit-import", { batchId });
    return response.data;
  },
  approveBatch: async (batchId: string) => {
    const response = await api.post("/shipments/approve-import", { batchId });
    return response.data;
  },
  rejectBatch: async (batchId: string, rejectionReason: string) => {
    const response = await api.post("/shipments/reject-import", { batchId, rejectionReason });
    return response.data;
  },
  cancelBatch: async (batchId: string) => {
    const response = await api.post("/shipments/cancel-import", { batchId });
    return response.data;
  },
  overrideBatch: async (batchId: string, newStatus: string, reason: string) => {
    const response = await api.post("/shipments/override-batch", { batchId, newStatus, reason });
    return response.data;
  },
  listPendingBatches: async () => {
    const response = await api.get<{ success: boolean; data: any[] }>("/shipments/pending-batches");
    return response.data;
  },
  getBatchDetailsForFinance: async (batchId: string) => {
    const response = await api.get<{ success: boolean; data: any }>(`/shipments/pending-batches/${batchId}/finance`);
    return response.data;
  },
  getBatchDetailsForAccountant: async (batchId: string) => {
    const response = await api.get<{ success: boolean; data: any }>(`/shipments/pending-batches/${batchId}/accountant`);
    return response.data;
  }
};