import { createSlice, type PayloadAction } from "@reduxjs/toolkit";

interface IncidentState {
  items: any[];
  loading: boolean;
  error: string | null;
}

const initialState: IncidentState = {
  items: [],
  loading: false,
  error: null,
};

const incidentSlice = createSlice({
  name: "incidents",
  initialState,
  reducers: {
    setIncidents: (state, action: PayloadAction<any[]>) => {
      state.items = action.payload;
    },
    setLoading: (state, action: PayloadAction<boolean>) => {
      state.loading = action.payload;
    },
    setError: (state, action: PayloadAction<string | null>) => {
      state.error = action.payload;
    },
  },
});

export const { setIncidents, setLoading, setError } = incidentSlice.actions;
export default incidentSlice.reducer;
