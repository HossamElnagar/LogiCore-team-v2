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

export const importShipments = createAsyncThunk(
  "shipments/importShipments",
  async (payload: { shipments: any[] }, { rejectWithValue }) => {
    try {
      return await shipmentService.bulkImport(payload);
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
