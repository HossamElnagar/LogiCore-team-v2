import { useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useParams } from "react-router-dom";
import type { AppDispatch, RootState } from "../../../app/store";
import { fetchShipmentById, updateShipmentStatus } from "../shipmentSlice";
import OtpInput from "../../../components/ui/OtpInput";
import api from "../../../api/axios";

export default function ShipmentDetailsPage() {
  const { id } = useParams();
  const dispatch = useDispatch<AppDispatch>();
  const { selectedShipment, loading, error } = useSelector((state: RootState) => state.shipments);
  const [status, setStatus] = useState("IN_TRANSIT");
  const [note, setNote] = useState("");

  useEffect(() => {
    if (id) {
      void dispatch(fetchShipmentById(id));
    }
  }, [dispatch, id]);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!id) return;
    await dispatch(updateShipmentStatus({ id, payload: { status, note } }));
    void dispatch(fetchShipmentById(id));
  };

  if (loading && !selectedShipment) {
    return <div className="flex items-center justify-center min-h-screen"><p className="text-slate-600">Loading shipment details...</p></div>;
  }

  if (error) {
    return <div className="min-h-screen flex items-center justify-center"><div className="rounded-lg border border-red-200 bg-red-50 p-6"><p className="text-red-700">{error}</p></div></div>;
  }

  if (!selectedShipment?.shipment) {
    return <div className="min-h-screen flex items-center justify-center"><div className="rounded-lg border border-slate-300 bg-slate-50 p-8 text-center"><p className="text-slate-600">Shipment not found. Return to the shipment list and try again.</p></div></div>;
  }

  const { shipment, timeline } = selectedShipment;

  const getStatusBadgeColor = (st: string) => {
    switch (st) {
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
          <p className="text-xs font-semibold uppercase tracking-[0.32em] text-emerald-600">Shipment Detail</p>
          <div className="mt-4 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <h1 className="text-3xl font-bold tracking-tight text-slate-900">{shipment.customerName}</h1>
              <p className="mt-2 text-sm text-slate-600">Tracking: {shipment.trackingNumber}</p>
            </div>
            <span className={`inline-flex rounded-lg px-4 py-2 text-sm font-semibold ${getStatusBadgeColor(shipment.status)}`}>
              {shipment.status}
            </span>
          </div>
        </header>

        <div className="grid gap-6 lg:grid-cols-[1fr_0.9fr]">
          <section className="rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
            <h2 className="text-xl font-bold text-slate-900">Shipment Details</h2>
            <div className="mt-8 grid gap-4 sm:grid-cols-2">
              <div className="rounded-lg border border-slate-200 bg-slate-50 p-5">
                <p className="text-xs font-semibold uppercase tracking-[0.25em] text-slate-600">Pickup Location</p>
                <p className="mt-3 font-semibold text-slate-900">{shipment.pickupAddress}</p>
              </div>
              <div className="rounded-lg border border-slate-200 bg-slate-50 p-5">
                <p className="text-xs font-semibold uppercase tracking-[0.25em] text-slate-600">Delivery Location</p>
                <p className="mt-3 font-semibold text-slate-900">{shipment.deliveryAddress}</p>
              </div>
              <div className="rounded-lg border border-slate-200 bg-slate-50 p-5">
                <p className="text-xs font-semibold uppercase tracking-[0.25em] text-slate-600">Current Location</p>
                <p className="mt-3 font-semibold text-slate-900">{shipment.currentLocation || "Pending"}</p>
              </div>
              <div className="rounded-lg border border-slate-200 bg-slate-50 p-5">
                <p className="text-xs font-semibold uppercase tracking-[0.25em] text-slate-600">Contact</p>
                <p className="mt-3 font-semibold text-slate-900">{shipment.customerPhone}</p>
              </div>
            </div>
          </section>

          <section className="rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
            <h2 className="text-xl font-bold text-slate-900">Update Status</h2>
            <form className="mt-8 space-y-5" onSubmit={handleSubmit}>
              <div>
                <label htmlFor="shipment-status" className="mb-3 block text-sm font-semibold text-slate-700">
                  Status
                </label>
                <select 
                  id="shipment-status" 
                  value={status} 
                  onChange={(event) => setStatus(event.target.value)} 
                  className="w-full rounded-lg border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
                >
                  <option value="IN_TRANSIT">In Transit</option>
                  <option value="DELAYED">Delayed</option>
                  <option value="OUT_FOR_DELIVERY">Out for Delivery</option>
                </select>
              </div>
              <div>
                <label htmlFor="shipment-note" className="mb-3 block text-sm font-semibold text-slate-700">
                  Notes (optional)
                </label>
                <textarea
                  id="shipment-note"
                  value={note}
                  onChange={(event) => setNote(event.target.value)}
                  placeholder="Add a note about this update..."
                  className="min-h-24 w-full rounded-lg border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
                />
              </div>
              <button type="submit" className="w-full rounded-lg bg-emerald-600 px-4 py-3 text-sm font-semibold text-white shadow-md transition hover:bg-emerald-700 hover:shadow-lg">
                Save Update
              </button>
            </form>
          </section>
        </div>

        {/* OTP Delivery Handshake — only shown when shipment is OUT_FOR_DELIVERY */}
        {shipment.status === "OUT_FOR_DELIVERY" && (
          <section className="rounded-2xl border-2 border-emerald-200 bg-white p-8 shadow-sm">
            <div className="mb-6 flex flex-col gap-2">
              <p className="text-xs font-semibold uppercase tracking-[0.32em] text-emerald-600">
                Delivery Handshake
              </p>
              <h2 className="text-xl font-bold text-slate-900">Confirm Delivery via OTP</h2>
              <p className="text-sm text-slate-600">
                Enter the 4-digit code that was sent to the customer at{" "}
                <span className="font-semibold text-slate-900">{shipment.customerPhone}</span>
                . This will mark the shipment as <strong>Delivered</strong>.
              </p>
            </div>
            <OtpInput
              onSubmit={async (code) => {
                try {
                  const response = await api.post(`/shipments/${id}/verify-otp`, { code });
                  if (response.data.success) {
                    void dispatch(fetchShipmentById(id!));
                    return { success: true };
                  }
                  return { success: false, message: response.data.message };
                } catch (err: any) {
                  return {
                    success: false,
                    message: err?.response?.data?.message ?? "Verification failed. Please retry.",
                  };
                }
              }}
              onResend={async () => {
                try {
                  await api.post(`/shipments/${id}/generate-otp`);
                } catch {
                  /* swallow — new OTP will arrive via Socket.io event */
                }
              }}
            />
          </section>
        )}

        <section className="rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
          <h2 className="text-xl font-bold text-slate-900">Timeline</h2>
          <div className="mt-8 space-y-3">
            {timeline.map((entry, index) => (
              <div key={entry._id} className="flex gap-4">
                <div className="flex flex-col items-center">
                  <div className="h-3 w-3 rounded-full bg-emerald-600 ring-2 ring-emerald-100" />
                  {index < timeline.length - 1 && <div className="h-8 w-0.5 bg-slate-200" />}
                </div>
                <div className="rounded-lg border border-slate-200 bg-slate-50 p-4 flex-1">
                  <p className="font-semibold text-slate-900">{entry.eventType}</p>
                  <p className="mt-2 text-sm text-slate-600">{entry.note || "No note provided"}</p>
                </div>
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}
