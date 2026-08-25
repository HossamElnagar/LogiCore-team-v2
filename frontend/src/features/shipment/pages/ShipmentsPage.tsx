import { useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import { Link } from "react-router-dom";
import type { AppDispatch, RootState } from "../../../app/store";
import { fetchShipments } from "../shipmentSlice";
import DriverShipmentsPage from "./DriverShipmentsPage";
import { UserRole } from "../../../types/user.types";

export default function ShipmentsPage() {
  const dispatch = useDispatch<AppDispatch>();
  const { shipments, loading, error } = useSelector((state: RootState) => state.shipments);
  const { user } = useSelector((state: RootState) => state.auth);

  // Drivers get their own purpose-built delivery view
  if (user?.role === UserRole.DRIVER) {
    return <DriverShipmentsPage />;
  }

  useEffect(() => {
    void dispatch(fetchShipments());
  }, [dispatch]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case "DELIVERED":
        return "bg-emerald-50 text-emerald-700 border border-emerald-200";
      case "DELAYED":
      case "CANCELLED":
        return "bg-red-50 text-red-700 border border-red-200";
      case "OUT_FOR_DELIVERY":
        return "bg-amber-50 text-amber-700 border border-amber-200";
      default:
        return "bg-blue-50 text-blue-700 border border-blue-200";
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 px-4 py-8 text-slate-900 sm:px-6 lg:px-8">
      <div className="mx-auto flex max-w-7xl flex-col gap-6">
        <header className="rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.32em] text-emerald-600">Operations Center</p>
              <h1 className="mt-3 text-4xl font-bold tracking-tight text-slate-900">Shipment Tracking</h1>
              <p className="mt-3 max-w-2xl text-base text-slate-600">
                Monitor active deliveries, review shipment history, and keep status updates consistent across the operation.
              </p>
            </div>
            <Link to="/shipments/preview" className="inline-flex items-center justify-center rounded-lg bg-emerald-600 px-6 py-3 text-sm font-semibold text-white shadow-md transition hover:bg-emerald-700 hover:shadow-lg">
              View sample
            </Link>
          </div>
        </header>

        <section className="rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
          {loading && <div className="flex items-center justify-center py-12"><p className="text-slate-600">Loading shipments...</p></div>}
          {error && <div className="rounded-lg border border-red-200 bg-red-50 p-4"><p className="text-red-700">{error}</p></div>}

          {!loading && !error && shipments.length === 0 && (
            <div className="rounded-lg border-2 border-dashed border-slate-300 bg-slate-50 p-12 text-center">
              <p className="text-slate-600">No shipments are available yet. Create a shipment record to see it appear here.</p>
            </div>
          )}

          {shipments.length > 0 && (
            <div className="space-y-3">
              {shipments.map((shipment) => (
                <Link
                  key={shipment._id}
                  to={`/shipments/${shipment._id}`}
                  className="group flex flex-col gap-4 rounded-lg border border-slate-200 bg-white p-6 transition duration-200 hover:border-emerald-300 hover:shadow-md lg:flex-row lg:items-center lg:justify-between"
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-semibold uppercase tracking-[0.28em] text-slate-500">Tracking ID</span>
                      <span className="h-1 w-1 rounded-full bg-emerald-500" />
                    </div>
                    <h2 className="mt-2 text-lg font-semibold text-slate-900">{shipment.customerName}</h2>
                    <p className="mt-1 text-sm text-slate-600">{shipment.trackingNumber}</p>
                    <p className="mt-2 text-sm text-slate-600">{shipment.deliveryAddress}</p>
                  </div>
                  <div className="flex flex-col items-start gap-3 lg:items-end">
                    <span className={`inline-flex rounded-full px-4 py-1.5 text-sm font-semibold ${getStatusColor(shipment.status)}`}>
                      {shipment.status}
                    </span>
                    <p className="text-sm text-slate-500">{shipment.currentLocation || "Location pending"}</p>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
