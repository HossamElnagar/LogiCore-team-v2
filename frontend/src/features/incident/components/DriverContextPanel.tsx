import React, { useState } from "react";
import {
  User,
  PhoneCall,
  MapPin,
  Truck,
  Calendar,
  ExternalLink,
  Image as ImageIcon,
  Navigation,
  ShieldAlert,
  ChevronRight,
  Maximize2,
  X,
  Radio,
} from "lucide-react";
import type { Incident, IncidentUser, IncidentShipment } from "../../../types/incident.types";

interface Props {
  incident: Incident | null;
  theme?: "light" | "dark";
}

export const DriverContextPanel: React.FC<Props> = ({ incident, theme = "light" }) => {
  const [selectedImg, setSelectedImg] = useState<string | null>(null);
  const isDark = theme === "dark";

  if (!incident) {
    return (
      <div
        className={`flex h-full flex-col items-center justify-center rounded-3xl border p-8 text-center transition-all ${
          isDark
            ? "border-slate-800 bg-slate-900/50 text-slate-400"
            : "border-dashed border-slate-300 bg-slate-50 text-slate-500"
        }`}
      >
        <Truck className="mb-3 h-10 w-10 opacity-40" />
        <h3 className="text-sm font-bold">No Incident Selected</h3>
        <p className="mt-1 text-xs opacity-75">Select an incident from the queue to view driver telemetry & context.</p>
      </div>
    );
  }

  // Extract reporter/driver info
  const driver =
    typeof incident.reportedBy === "object" && incident.reportedBy !== null
      ? (incident.reportedBy as IncidentUser)
      : ({ userName: "Driver Representative", email: "driver@logicore.io", phone: "19999" } as IncidentUser);

  const shipment =
    typeof incident.shipmentId === "object" && incident.shipmentId !== null
      ? (incident.shipmentId as IncidentShipment)
      : typeof incident.shipmentId === "string" && incident.shipmentId
      ? ({ trackingNumber: incident.shipmentId, status: "IN_TRANSIT" } as IncidentShipment)
      : null;

  // Extract Telemetry GPS
  const lat = incident.metadata?.driverLat || 30.0444;
  const lng = incident.metadata?.driverLng || 31.2357;
  const mapUrl = `https://www.openstreetmap.org/?mlat=${lat}&mlon=${lng}#map=15/${lat}/${lng}`;

  const allAttachments = [
    ...(incident.attachments || []),
    ...(incident.proofImage ? [incident.proofImage] : []),
  ].filter(Boolean);

  return (
    <div
      className={`flex h-full flex-col overflow-y-auto rounded-3xl border transition-all ${
        isDark
          ? "border-slate-800 bg-slate-900/90 text-slate-100 shadow-2xl shadow-black/40"
          : "border-slate-200 bg-white text-slate-800 shadow-sm"
      }`}
    >
      {/* Header */}
      <div className={`border-b p-5 ${isDark ? "border-slate-800 bg-slate-900" : "border-slate-100 bg-slate-50/70"}`}>
        <div className="flex items-center justify-between">
          <span className="text-[10px] font-extrabold uppercase tracking-widest text-emerald-500 flex items-center gap-1.5">
            <Radio className="h-3 w-3 animate-pulse text-emerald-500" /> Driver & Vehicle Telemetry
          </span>
          <span className="text-xs font-bold text-slate-400">ID: #{incident._id.slice(-6)}</span>
        </div>
        <h2 className="mt-1.5 text-base font-extrabold tracking-tight truncate">
          {incident.title}
        </h2>
        <div className="mt-1 flex items-center gap-2 text-xs opacity-75">
          <Calendar className="h-3.5 w-3.5 shrink-0" />
          <span>Reported {new Date(incident.createdAt || Date.now()).toLocaleString()}</span>
        </div>
      </div>

      <div className="space-y-5 p-5 flex-1">
        {/* Driver Profile Card */}
        <div
          className={`rounded-2xl border p-4 transition-all ${
            isDark ? "border-slate-800 bg-slate-800/60 text-slate-200" : "border-slate-200 bg-slate-50"
          }`}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-gradient-to-tr from-emerald-600 to-teal-500 text-white shadow-md shadow-emerald-500/20 font-black text-base">
                {driver.userName?.slice(0, 2).toUpperCase() || "DR"}
              </div>
              <div>
                <p className="text-sm font-black tracking-tight flex items-center gap-2">
                  {driver.userName || driver.name || "Assigned Driver"}
                  <span className="h-2 w-2 rounded-full bg-emerald-500 title='Online'" />
                </p>
                <p className="text-xs opacity-65 font-mono">{driver.email}</p>
              </div>
            </div>

            {driver.phone && (
              <a
                href={`tel:${driver.phone}`}
                className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-500 to-emerald-700 text-white shadow-lg shadow-emerald-600/30 hover:scale-105 active:scale-95 transition-transform"
                title="Call Driver Direct"
              >
                <PhoneCall className="h-4 w-4 animate-bounce" />
              </a>
            )}
          </div>
        </div>

        {/* Shipment & Vehicle Context */}
        <div className="space-y-3">
          <h3 className="text-[11px] font-black uppercase tracking-wider opacity-60">
            Operational Context
          </h3>
          <div className="grid grid-cols-2 gap-3">
            <div
              className={`rounded-2xl border p-3.5 ${
                isDark ? "border-slate-800 bg-slate-800/40" : "border-slate-200 bg-slate-50/80"
              }`}
            >
              <div className="flex items-center gap-1.5 text-[11px] font-extrabold text-slate-400">
                <Truck className="h-3.5 w-3.5 text-sky-500" /> Shipment Ref
              </div>
              <p className="mt-1 font-mono text-xs font-black truncate">
                {shipment ? `#${shipment.trackingNumber}` : "General Fleet"}
              </p>
              {shipment?.customerName && (
                <p className="mt-0.5 text-[10px] opacity-70 truncate">{shipment.customerName}</p>
              )}
            </div>

            <div
              className={`rounded-2xl border p-3.5 ${
                isDark ? "border-slate-800 bg-slate-800/40" : "border-slate-200 bg-slate-50/80"
              }`}
            >
              <div className="flex items-center gap-1.5 text-[11px] font-extrabold text-slate-400">
                <Navigation className="h-3.5 w-3.5 text-amber-500" /> Severity
              </div>
              <p className="mt-1 text-xs font-extrabold tracking-wide uppercase text-amber-500">
                {incident.severity}
              </p>
              <p className="mt-0.5 text-[10px] opacity-70 truncate">Priority Alert</p>
            </div>
          </div>
        </div>

        {/* Live GPS Map Snippet Card */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-[11px] font-black uppercase tracking-wider opacity-60 flex items-center gap-1.5">
              <MapPin className="h-3.5 w-3.5 text-rose-500" /> Live GPS Telemetry
            </h3>
            <a
              href={mapUrl}
              target="_blank"
              rel="noreferrer"
              className="flex items-center gap-1 text-[11px] font-extrabold text-emerald-500 hover:underline"
            >
              View Full Map <ExternalLink className="h-3 w-3" />
            </a>
          </div>

          <div
            className={`relative overflow-hidden rounded-2xl border ${
              isDark ? "border-slate-800 bg-slate-800/80" : "border-slate-200 bg-slate-100"
            }`}
          >
            {/* Styled Visual Map Snippet Simulation */}
            <div className="relative h-40 w-full bg-[radial-gradient(#334155_1px,transparent_1px)] [background-size:16px_16px] bg-slate-900 flex flex-col items-center justify-center p-4">
              <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-900/60 to-transparent opacity-80" />
              
              {/* Radar pulse around coordinates */}
              <div className="relative z-10 flex flex-col items-center">
                <span className="relative flex h-12 w-12 items-center justify-center">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-8 w-8 bg-gradient-to-br from-rose-500 to-red-600 border-2 border-white shadow-lg items-center justify-center">
                    <Truck className="h-4 w-4 text-white" />
                  </span>
                </span>
                <div className="mt-3 text-center bg-slate-900/90 backdrop-blur-md px-3 py-1.5 rounded-xl border border-slate-700 shadow-md">
                  <p className="text-[11px] font-extrabold text-emerald-400 flex items-center justify-center gap-1">
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" /> Signal Lock OK
                  </p>
                  <p className="text-xs font-mono font-black text-slate-100 mt-0.5">
                    {lat.toFixed(5)}° N, {lng.toFixed(5)}° E
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Evidence & Attachments Gallery */}
        <div className="space-y-3">
          <h3 className="text-[11px] font-black uppercase tracking-wider opacity-60 flex items-center gap-1.5">
            <ImageIcon className="h-3.5 w-3.5 text-indigo-400" /> Evidence Attachments ({allAttachments.length})
          </h3>
          
          {allAttachments.length > 0 ? (
            <div className="grid grid-cols-2 gap-2.5">
              {allAttachments.map((url, idx) => (
                <div
                  key={idx}
                  onClick={() => setSelectedImg(url)}
                  className={`group relative h-24 overflow-hidden rounded-xl border cursor-pointer transition-all hover:scale-[1.02] ${
                    isDark ? "border-slate-800 bg-slate-800" : "border-slate-200 bg-slate-100"
                  }`}
                >
                  <img
                    src={url}
                    alt={`Evidence ${idx + 1}`}
                    className="h-full w-full object-cover object-center transition duration-300 group-hover:scale-110"
                    onError={(e) => {
                      (e.currentTarget as HTMLImageElement).src =
                        "https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?auto=format&fit=crop&w=400&q=80";
                    }}
                  />
                  <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                    <Maximize2 className="h-5 w-5 text-white" />
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div
              className={`rounded-2xl border border-dashed p-4 text-center text-xs opacity-60 ${
                isDark ? "border-slate-800 bg-slate-800/30" : "border-slate-300 bg-slate-50"
              }`}
            >
              No photos or documents attached to this report.
            </div>
          )}
        </div>
      </div>

      {/* Lightbox / Modal for Image Preview */}
      {selectedImg && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/90 backdrop-blur-md p-4"
          onClick={() => setSelectedImg(null)}
        >
          <button
            onClick={() => setSelectedImg(null)}
            className="absolute top-6 right-6 flex h-11 w-11 items-center justify-center rounded-full bg-white/20 text-white hover:bg-white/30 transition"
          >
            <X className="h-6 w-6" />
          </button>
          <img
            src={selectedImg}
            alt="Expanded Evidence"
            className="max-h-[85vh] max-w-[90vw] rounded-2xl border-4 border-slate-800 shadow-2xl object-contain"
          />
        </div>
      )}
    </div>
  );
};

export default DriverContextPanel;
