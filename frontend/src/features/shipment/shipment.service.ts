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

  bulkImport: async (payload: { shipments: any[] }) => {
    const response = await api.post<{
      success: boolean;
      message: string;
      data: {
        batchId: string;
        totalRows: number;
        successCount: number;
        failedCount: number;
        failedRows: Array<{ row: number; trackingNumber: string; reason: string }>;
      };
    }>("/shipments/bulk-import", payload);
    return response.data;
  },
};