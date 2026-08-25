import { configureStore } from "@reduxjs/toolkit";
import shipmentReducer from "../features/shipment/shipmentSlice";
import authReducer from "../features/auth/authSlice";
import incidentReducer from "../features/incident/incidentSlice";
import departmentReducer from "../features/department/departmentSlice";

export const store = configureStore({
  reducer: {
    auth: authReducer,
    shipments: shipmentReducer,
    incidents: incidentReducer,
    departments: departmentReducer,
  },
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
