import { createAsyncThunk, createSlice } from "@reduxjs/toolkit";
import { shipmentService } from "./shipment.service";
import type { ShipmentDetailResponse, ShipmentSummary } from "./shipment.types";

interface ShipmentState {
  shipments: ShipmentSummary[];
  selectedShipment: ShipmentDetailResponse | null;
  loading: boolean;
  error: string | null;
}

const initialState: ShipmentState = {
  shipments: [],
  selectedShipment: null,
  loading: false,
  error: null,
};

export const fetchShipments = createAsyncThunk(
  "shipments/fetchShipments",
  async (companyId?: string) => shipmentService.listShipments(companyId)
);

export const fetchShipmentById = createAsyncThunk(
  "shipments/fetchShipmentById",
  async (id: string) => shipmentService.getShipmentById(id)
);

export const updateShipmentStatus = createAsyncThunk(
  "shipments/updateShipmentStatus",
  async ({ id, payload }: { id: string; payload: { status: string; note?: string; actorId?: string } }) =>
    shipmentService.updateShipmentStatus(id, payload)
);

export const stageCsvImport = createAsyncThunk(
  "shipments/stageCsvImport",
  async (csvData: string, { rejectWithValue }) => {
    try {
      return await shipmentService.importCsv(csvData);
    } catch (error: any) {
      return rejectWithValue(error.response?.data || { message: error.message });
    }
  }
);
export const submitBatchForApproval = createAsyncThunk(
  "shipments/submitBatchForApproval",
  async (batchId: string, { rejectWithValue }) => {
    try {
      return await shipmentService.submitBatchForApproval(batchId);
    } catch (error: any) {
      return rejectWithValue(error.response?.data || { message: error.message });
    }
  }
);
export const listPendingBatches = createAsyncThunk(
  "shipments/listPendingBatches",
  async (_, { rejectWithValue }) => {
    try {
      return await shipmentService.listPendingBatches();
    } catch (error: any) {
      return rejectWithValue(error.response?.data || { message: error.message });
    }
  }
);
export const getBatchDetailsForFinance = createAsyncThunk(
  "shipments/getBatchDetailsForFinance",
  async (batchId: string, { rejectWithValue }) => {
    try {
      return await shipmentService.getBatchDetailsForFinance(batchId);
    } catch (error: any) {
      return rejectWithValue(error.response?.data || { message: error.message });
    }
  }
);
export const getBatchDetailsForAccountant = createAsyncThunk(
  "shipments/getBatchDetailsForAccountant",
  async (batchId: string, { rejectWithValue }) => {
    try {
      return await shipmentService.getBatchDetailsForAccountant(batchId);
    } catch (error: any) {
      return rejectWithValue(error.response?.data || { message: error.message });
    }
  }
);
export const approveBatch = createAsyncThunk(
  "shipments/approveBatch",
  async (batchId: string, { rejectWithValue }) => {
    try {
      return await shipmentService.approveBatch(batchId);
    } catch (error: any) {
      return rejectWithValue(error.response?.data || { message: error.message });
    }
  }
);
export const rejectBatch = createAsyncThunk(
  "shipments/rejectBatch",
  async ({ batchId, reason }: { batchId: string, reason: string }, { rejectWithValue }) => {
    try {
      return await shipmentService.rejectBatch(batchId, reason);
    } catch (error: any) {
      return rejectWithValue(error.response?.data || { message: error.message });
    }
  }
);
export const cancelBatch = createAsyncThunk(
  "shipments/cancelBatch",
  async (batchId: string, { rejectWithValue }) => {
    try {
      return await shipmentService.cancelBatch(batchId);
    } catch (error: any) {
      return rejectWithValue(error.response?.data || { message: error.message });
    }
  }
);
export const overrideBatch = createAsyncThunk(
  "shipments/overrideBatch",
  async ({ batchId, newStatus, reason }: { batchId: string, newStatus: string, reason: string }, { rejectWithValue }) => {
    try {
      return await shipmentService.overrideBatch(batchId, newStatus, reason);
    } catch (error: any) {
      return rejectWithValue(error.response?.data || { message: error.message });
    }
  }
);

const shipmentSlice = createSlice({
  name: "shipments",
  initialState,
  reducers: {
    clearSelectedShipment(state) {
      state.selectedShipment = null;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchShipments.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchShipments.fulfilled, (state, action) => {
        state.loading = false;
        state.shipments = action.payload.data;
      })
      .addCase(fetchShipments.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message || "Failed to load shipments";
      })
      .addCase(fetchShipmentById.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchShipmentById.fulfilled, (state, action) => {
        state.loading = false;
        state.selectedShipment = action.payload.data;
      })
      .addCase(fetchShipmentById.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message || "Failed to load shipment details";
      })
      .addCase(updateShipmentStatus.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(updateShipmentStatus.fulfilled, (state) => {
        state.loading = false;
      })
      .addCase(updateShipmentStatus.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message || "Failed to update shipment status";
      });
  },
});

export const { clearSelectedShipment } = shipmentSlice.actions;
export default shipmentSlice.reducer;
