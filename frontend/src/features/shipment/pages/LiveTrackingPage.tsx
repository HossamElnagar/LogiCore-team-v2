import { useEffect, useState, useMemo, useRef } from "react";
import { useSelector } from "react-redux";
import { Layers, ChevronDown, ChevronUp, Map, Moon, Satellite, Activity } from "lucide-react";
import tt from "@tomtom-international/web-sdk-maps";
import "@tomtom-international/web-sdk-maps/dist/maps.css";

import api from "../../../api/axios";
import type { RootState } from "../../../app/store";
import { useSocket } from "../../../hooks/useSocket";

// ── TomTom API Key ─────────────────────────────────────────────────────────────
const TOMTOM_API_KEY = import.meta.env.VITE_TOMTOM_API_KEY || "YOUR_TOMTOM_API_KEY";

// ── Types ─────────────────────────────────────────────────────────────────────

interface LocationPayload {
  driverId: string;
  latitude: number;
  longitude: number;
  bearing: number;
  speed: number;
  timestamp: string;
}

interface DriverUser {
  _id: string;
  userName: string;
  email: string;
  phone?: string;
  isOnline: boolean;
}

interface DriverState extends DriverUser {
  latitude?: number;
  longitude?: number;
  bearing?: number;
  speed?: number;
  lastUpdated?: string;
  activeShipmentCount: number;
}

// Map center default in TomTom format: [Longitude, Latitude] (Cairo, Egypt)
const DEFAULT_CENTER: [number, number] = [31.2357, 30.0444];

// ── Helper to Create Custom Marker Element ─────────────────────────────────────

function createDriverMarkerElement(bearing: number, isOnline: boolean, enablePulse: boolean): HTMLElement {
  const rotation = bearing || 0;
  const color = isOnline ? "#10b981" : "#94a3b8"; // emerald vs slate
  const ringColor = isOnline ? "rgba(16, 185, 129, 0.4)" : "rgba(148, 163, 184, 0.4)";

  const container = document.createElement("div");
  container.className = "custom-driver-icon";
  container.style.cssText = "position: relative; width: 44px; height: 44px; display: flex; align-items: center; justify-content: center; cursor: pointer;";

  container.innerHTML = `
    ${
      isOnline && enablePulse
        ? `<div class="animate-ping" style="position: absolute; width: 36px; height: 36px; border-radius: 50%; background-color: ${ringColor}; opacity: 0.75;"></div>`
        : ""
    }
    <div style="position: relative; width: 28px; height: 28px; background-color: #0f172a; border: 2px solid ${color}; border-radius: 50%; display: flex; align-items: center; justify-content: center; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);">
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="${color}" style="width: 16px; height: 16px; transform: rotate(${rotation}deg); transition: transform 0.4s ease-out;">
        <path d="M12 2L2 22l10-6 10 6L12 2z"/>
      </svg>
    </div>
  `;

  return container;
}

// ── Main Page Component ────────────────────────────────────────────────────────

export default function LiveTrackingPage() {
  const { user } = useSelector((state: RootState) => state.auth);
  const { socket, isConnected } = useSocket();

  // Map DOM Reference & Map Instance
  const mapElement = useRef<HTMLDivElement | null>(null);
  const mapInstance = useRef<tt.Map | null>(null);
  const markersRef = useRef<Record<string, tt.Marker>>({});

  // Core States
  const [drivers, setDrivers] = useState<Record<string, DriverUser>>({});
  const [locations, setLocations] = useState<Record<string, LocationPayload>>({});
  const [activeShipmentCounts, setActiveShipmentCounts] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  
  // Map Widget States
  const [isLayerPanelOpen, setIsLayerPanelOpen] = useState(false);
  const [showTraffic, setShowTraffic] = useState(true);
  const [mapTheme, setMapTheme] = useState<'main' | 'night' | 'satellite'>('main');
  const [pulseDrivers, setPulseDrivers] = useState(true);

  // 1. Initialize TomTom Map Instance
  useEffect(() => {
    if (!mapElement.current) return;

    mapInstance.current = tt.map({
      key: TOMTOM_API_KEY,
      container: mapElement.current,
      center: DEFAULT_CENTER,
      zoom: 12,
    });

    mapInstance.current.addControl(new tt.NavigationControl());

    mapInstance.current.on('load', () => {
      if (mapInstance.current && showTraffic) {
        mapInstance.current.showTrafficFlow();
        mapInstance.current.showTrafficIncidents();
      }
    });

    return () => {
      if (mapInstance.current) {
        mapInstance.current.remove();
        mapInstance.current = null;
      }
    };
  }, []);

  // 2. Real-time location listeners via Socket
  useEffect(() => {
    if (!socket) return;

    const handleLocationChange = (data: LocationPayload) => {
      setLocations((prev) => ({
        ...prev,
        [data.driverId]: data,
      }));
    };

    socket.on("fleet:location_changed", handleLocationChange);

    return () => {
      socket.off("fleet:location_changed", handleLocationChange);
    };
  }, [socket]);

  // 3. Load baseline driver and shipment counts
  useEffect(() => {
    if (!user?.companyId) return;

    const fetchBaseline = async () => {
      try {
        setLoading(true);

        const [usersRes, shipmentsRes] = await Promise.all([
          api.get(`/users/company/${user.companyId}`),
          api.get("/shipments"),
        ]);

        if (usersRes.data.success) {
          const driverMap: Record<string, DriverUser> = {};
          (usersRes.data.data || []).forEach((u: any) => {
            if (u.role === "DRIVER") {
              driverMap[u._id] = {
                _id: u._id,
                userName: u.userName,
                email: u.email,
                phone: u.phone,
                isOnline: u.isOnline,
              };
            }
          });
          setDrivers(driverMap);
        }

        if (shipmentsRes.data.success) {
          const counts: Record<string, number> = {};
          (shipmentsRes.data.data || []).forEach((s: any) => {
            if (
              s.assignedDriver &&
              s.status !== "DELIVERED" &&
              s.status !== "CANCELLED"
            ) {
              const driverId = String(s.assignedDriver);
              counts[driverId] = (counts[driverId] || 0) + 1;
            }
          });
          setActiveShipmentCounts(counts);
        }
      } catch (err) {
        console.error("Failed to load map baseline metrics:", err);
      } finally {
        setLoading(false);
      }
    };

    void fetchBaseline();
  }, [user]);

  // Merge static driver data with live locations
  const fleet: DriverState[] = useMemo(() => {
    return Object.keys(drivers).map((id) => {
      const d = drivers[id]!;
      const loc = locations[id];
      return {
        ...d,
        latitude: loc?.latitude,
        longitude: loc?.longitude,
        bearing: loc?.bearing,
        speed: loc?.speed,
        lastUpdated: loc?.timestamp,
        activeShipmentCount: activeShipmentCounts[id] || 0,
      };
    });
  }, [drivers, locations, activeShipmentCounts]);

  const activeDrivers = useMemo(() => {
    return fleet.filter((d) => d.latitude !== undefined && d.longitude !== undefined);
  }, [fleet]);

  // Handle Map Theme change
  useEffect(() => {
    const map = mapInstance.current;
    if (!map || !map.loaded()) return;

    let styleUri: any = `https://api.tomtom.com/map/1/style/21.1.0-0/basic_main.json?key=${TOMTOM_API_KEY}`;
    if (mapTheme === 'night') styleUri = `https://api.tomtom.com/map/1/style/21.1.0-0/basic_night.json?key=${TOMTOM_API_KEY}`;
    if (mapTheme === 'satellite') {
      styleUri = {
        version: 8,
        sources: {
          'satellite-source': {
            type: 'raster',
            tiles: [`https://api.tomtom.com/map/1/tile/sat/main/{z}/{x}/{y}.jpg?key=${TOMTOM_API_KEY}`],
            tileSize: 256,
          }
        },
        layers: [
          {
            id: 'satellite-layer',
            type: 'raster',
            source: 'satellite-source',
            minzoom: 0,
            maxzoom: 22
          }
        ]
      };
    }

    try {
      map.setStyle(styleUri);
    } catch (e) {
      console.error("Failed to set map style:", e);
    }

    // After style loads, re-apply traffic if enabled
    const onStyleData = () => {
      if (showTraffic) {
        map.showTrafficFlow();
        map.showTrafficIncidents();
      }
      map.off('styledata', onStyleData);
    };
    map.on('styledata', onStyleData);
  }, [mapTheme]);

  // Handle Traffic toggle
  useEffect(() => {
    const map = mapInstance.current;
    if (!map || !map.loaded()) return;

    if (showTraffic) {
      map.showTrafficFlow();
      map.showTrafficIncidents();
    } else {
      map.hideTrafficFlow();
      map.hideTrafficIncidents();
    }
  }, [showTraffic]);

  // Recreate markers when pulseDrivers changes
  useEffect(() => {
    Object.values(markersRef.current).forEach((marker) => marker.remove());
    markersRef.current = {};
  }, [pulseDrivers]);

  // 4. Update TomTom Markers dynamically on map
  useEffect(() => {
    if (!mapInstance.current) return;

    const map = mapInstance.current;

    activeDrivers.forEach((driver) => {
      const lngLat: [number, number] = [driver.longitude!, driver.latitude!];

      // Popup HTML content
      const popupHtml = `
        <div style="padding: 4px; min-width: 180px; color: #0f172a; font-family: sans-serif;">
          <div style="display: flex; align-items: center; justify-content: space-between; border-bottom: 1px solid #f1f5f9; padding-bottom: 8px;">
            <span style="font-weight: 800; font-size: 14px;">${driver.userName}</span>
            <span style="height: 10px; width: 10px; border-radius: 50%; background-color: ${driver.isOnline ? '#10b981' : '#94a3b8'};"></span>
          </div>
          <p style="font-size: 12px; color: #475569; margin-top: 4px;">${driver.email}</p>
          <div style="margin-top: 12px; display: grid; grid-template-columns: 1fr 1fr; gap: 8px; text-align: center; font-size: 10px; font-weight: bold;">
            <div style="background-color: #f8fafc; padding: 6px; border-radius: 4px; border: 1px solid #f1f5f9;">
              <span style="display: block; font-size: 8px; color: #64748b; text-transform: uppercase;">Velocity</span>
              <span style="color: #1e293b; font-family: monospace;">${Math.round(driver.speed || 0)} km/h</span>
            </div>
            <div style="background-color: #f8fafc; padding: 6px; border-radius: 4px; border: 1px solid #f1f5f9;">
              <span style="display: block; font-size: 8px; color: #64748b; text-transform: uppercase;">Active</span>
              <span style="color: #1e293b;">${driver.activeShipmentCount} jobs</span>
            </div>
          </div>
          ${
            driver.lastUpdated
              ? `<p style="margin-top: 8px; font-size: 9px; color: #94a3b8; text-align: right;">Updated: ${new Date(driver.lastUpdated).toLocaleTimeString()}</p>`
              : ""
          }
        </div>
      `;

      if (markersRef.current[driver._id]) {
        // Update position and popup of existing marker
        const existingMarker = markersRef.current[driver._id];
        existingMarker.setLngLat(lngLat);
        existingMarker.getPopup().setHTML(popupHtml);
      } else {
        // Create new TomTom marker
        const element = createDriverMarkerElement(driver.bearing || 0, driver.isOnline, pulseDrivers);
        const popup = new tt.Popup({ offset: 20 }).setHTML(popupHtml);

        const marker = new tt.Marker({ element })
          .setLngLat(lngLat)
          .setPopup(popup)
          .addTo(map);

        markersRef.current[driver._id] = marker;
      }
    });
  }, [activeDrivers, pulseDrivers]);

  // Handle focusing map on driver click
  const handleFocusDriver = (lng: number, lat: number) => {
    if (mapInstance.current) {
      mapInstance.current.flyTo({
        center: [lng, lat],
        zoom: 14,
        duration: 1000,
      });
    }
  };

  return (
    <div className="flex h-[calc(100vh-2rem)] flex-col gap-5 p-4 lg:flex-row">
      {/* ── Sidebar panel showing driver list ─────────────────────────────────── */}
      <aside className="flex flex-col rounded-2xl border border-slate-200 bg-white shadow-sm w-full lg:w-96 flex-shrink-0">
        <div className="border-b border-slate-100 p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-bold uppercase tracking-widest text-emerald-600">Live fleet</p>
              <h1 className="mt-1 text-xl font-extrabold text-slate-900">Telemetry Tracking</h1>
            </div>
            <span
              className={`flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-bold ${
                isConnected
                  ? "bg-emerald-50 text-emerald-700 border border-emerald-100"
                  : "bg-rose-50 text-rose-700 border border-rose-100"
              }`}
            >
              <span className={`h-2.5 w-2.5 rounded-full ${isConnected ? "bg-emerald-500 animate-pulse" : "bg-rose-500"}`} />
              {isConnected ? "Connected" : "Offline"}
            </span>
          </div>
          <p className="mt-3 text-xs text-slate-500">
            Real-time telemetry showing driver coordinate offsets and transit velocities.
          </p>
        </div>

        {/* Driver List */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {loading ? (
            <p className="text-center text-sm text-slate-500">Loading driver baseline...</p>
          ) : fleet.length > 0 ? (
            fleet.map((driver) => {
              const hasLoc = driver.latitude !== undefined && driver.longitude !== undefined;
              return (
                <button
                  key={driver._id}
                  onClick={() => {
                    if (hasLoc) {
                      handleFocusDriver(driver.longitude!, driver.latitude!);
                    }
                  }}
                  className={`w-full text-left rounded-xl border p-4 transition-all duration-200 ${
                    hasLoc
                      ? "bg-slate-50 border-slate-200 hover:bg-slate-100 hover:border-slate-300"
                      : "bg-white border-slate-100 opacity-60 cursor-not-allowed"
                  }`}
                  disabled={!hasLoc}
                >
                  <div className="flex items-center justify-between">
                    <p className="font-bold text-sm text-slate-900">{driver.userName}</p>
                    <span
                      className={`inline-block h-2 w-2 rounded-full ${
                        driver.isOnline ? "bg-emerald-500" : "bg-slate-300"
                      }`}
                    />
                  </div>
                  <p className="text-xs text-slate-500 truncate mt-1">{driver.email}</p>

                  <div className="mt-3 flex items-center justify-between text-[11px] font-semibold text-slate-600">
                    <span className="rounded-lg bg-sky-50 px-2 py-0.5 border border-sky-100">
                      {driver.activeShipmentCount} active shipment{driver.activeShipmentCount !== 1 ? "s" : ""}
                    </span>
                    {hasLoc && (
                      <span className="font-mono text-emerald-600">
                        {Math.round(driver.speed || 0)} km/h
                      </span>
                    )}
                  </div>
                </button>
              );
            })
          ) : (
            <p className="text-center text-sm text-slate-500">No company drivers found.</p>
          )}
        </div>
      </aside>

      {/* ── Interactive TomTom Map Container ───────────────────────────────────── */}
      <main className="relative flex-1 overflow-hidden rounded-2xl border border-slate-200 bg-slate-100 shadow-sm min-h-[400px]">
        <div ref={mapElement} className="h-full w-full z-10" />
        
        {/* ── Floating Controls Widget ────────────────────────────────────────── */}
        <div className="absolute top-4 right-4 z-20 flex flex-col items-end space-y-2">
          {/* Main Toggle Button */}
          <button
            onClick={() => setIsLayerPanelOpen(!isLayerPanelOpen)}
            className="flex items-center gap-2 rounded-xl bg-white/80 p-3 text-sm font-bold text-slate-700 shadow-lg backdrop-blur-md transition-all hover:bg-white focus:outline-none focus:ring-2 focus:ring-slate-400 border border-white/40"
          >
            <Layers className="h-5 w-5 text-indigo-600" />
            <span>Layers & Options</span>
            {isLayerPanelOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          </button>

          {/* Collapsible Panel */}
          {isLayerPanelOpen && (
            <div className="w-64 rounded-2xl bg-white/80 p-4 shadow-xl backdrop-blur-md border border-white/40 transition-all">
              
              {/* Traffic Toggle */}
              <div className="mb-4 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Activity className="h-4 w-4 text-emerald-500" />
                  <span className="text-sm font-semibold text-slate-700">Live Traffic</span>
                </div>
                <button
                  onClick={() => setShowTraffic(!showTraffic)}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 ${showTraffic ? 'bg-emerald-500' : 'bg-slate-300'}`}
                >
                  <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${showTraffic ? 'translate-x-6' : 'translate-x-1'}`} />
                </button>
              </div>

              {/* Pulse Toggle */}
              <div className="mb-4 flex items-center justify-between border-t border-slate-200/50 pt-4">
                <div className="flex items-center gap-2">
                  <span className="relative flex h-3 w-3">
                    {pulseDrivers && <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75"></span>}
                    <span className="relative inline-flex h-3 w-3 rounded-full bg-emerald-500"></span>
                  </span>
                  <span className="text-sm font-semibold text-slate-700">Marker Pulse</span>
                </div>
                <button
                  onClick={() => setPulseDrivers(!pulseDrivers)}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 ${pulseDrivers ? 'bg-indigo-500' : 'bg-slate-300'}`}
                >
                  <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${pulseDrivers ? 'translate-x-6' : 'translate-x-1'}`} />
                </button>
              </div>

              {/* Theme Selection */}
              <div className="border-t border-slate-200/50 pt-4">
                <span className="mb-3 block text-xs font-bold uppercase tracking-wider text-slate-500">Map Theme</span>
                <div className="space-y-2">
                  <button
                    onClick={() => setMapTheme('main')}
                    className={`flex w-full items-center gap-2 rounded-lg p-2 text-sm font-medium transition-colors ${mapTheme === 'main' ? 'bg-indigo-50 text-indigo-700' : 'text-slate-600 hover:bg-slate-100'}`}
                  >
                    <Map className="h-4 w-4" />
                    Standard Main
                  </button>
                  <button
                    onClick={() => setMapTheme('night')}
                    className={`flex w-full items-center gap-2 rounded-lg p-2 text-sm font-medium transition-colors ${mapTheme === 'night' ? 'bg-slate-800 text-white' : 'text-slate-600 hover:bg-slate-100'}`}
                  >
                    <Moon className="h-4 w-4" />
                    Dark Mode
                  </button>
                  <button
                    onClick={() => setMapTheme('satellite')}
                    className={`flex w-full items-center gap-2 rounded-lg p-2 text-sm font-medium transition-colors ${mapTheme === 'satellite' ? 'bg-emerald-50 text-emerald-700' : 'text-slate-600 hover:bg-slate-100'}`}
                  >
                    <Satellite className="h-4 w-4" />
                    Satellite / Aerial
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}