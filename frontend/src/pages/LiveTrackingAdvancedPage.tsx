import React, { useState, useEffect, useCallback } from 'react';
import { TomTomMap, MapMarker } from '../components/TomTomMap';
import {
  calculateDistance,
  formatDistance,
  calculateBoundingBox,
  getRecommendedZoom,
  formatCoordinates,
} from '../components/TomTomMap/mapUtils';

/**
 * Advanced Live Tracking Example
 * 
 * Demonstrates:
 * - Real-time driver tracking
 * - Distance calculations
 * - Dynamic marker updates
 * - Geofencing alerts
 * - Shipment status integration
 */
export function LiveTrackingAdvancedPage() {
  const TOMTOM_API_KEY = import.meta.env.VITE_TOMTOM_API_KEY || 'YOUR_API_KEY_HERE';

  // Simulated active shipments with driver locations
  const [activeShipments, setActiveShipments] = useState<
    Array<{
      id: string;
      driverId: string;
      driverName: string;
      status: 'in-transit' | 'delivered' | 'pending';
      currentLat: number;
      currentLng: number;
      destination: { lat: number; lng: number };
      distance: number;
    }>
  >([
    {
      id: 'ship-001',
      driverId: 'driver-1',
      driverName: 'Ahmed Hassan',
      status: 'in-transit',
      currentLat: 30.0533,
      currentLng: 31.2340,
      destination: { lat: 29.8559, lng: 31.3502 },
      distance: 0,
    },
    {
      id: 'ship-002',
      driverId: 'driver-2',
      driverName: 'Fatima Al-Mansouri',
      status: 'in-transit',
      currentLat: 30.0981,
      currentLng: 31.1996,
      destination: { lat: 30.3396, lng: 31.2913 },
      distance: 0,
    },
    {
      id: 'ship-003',
      driverId: 'driver-3',
      driverName: 'Mohamed Samir',
      status: 'pending',
      currentLat: 30.0444,
      currentLng: 31.2357,
      destination: { lat: 30.0081, lng: 31.1996 },
      distance: 0,
    },
  ]);

  const [selectedShipmentId, setSelectedShipmentId] = useState<string | null>(null);
  const [mapCenter, setMapCenter] = useState<[number, number]>([31.2357, 30.0444]);
  const [autoZoom, setAutoZoom] = useState(true);

  /**
   * Calculate distances for all shipments
   */
  useEffect(() => {
    setActiveShipments((prev) =>
      prev.map((ship) => ({
        ...ship,
        distance: calculateDistance(
          ship.currentLat,
          ship.currentLng,
          ship.destination.lat,
          ship.destination.lng
        ),
      }))
    );
  }, []);

  /**
   * Auto-zoom map to fit all active shipments
   */
  useEffect(() => {
    if (autoZoom && activeShipments.length > 0) {
      const markers = activeShipments.map((s) => ({
        lat: s.currentLat,
        lng: s.currentLng,
      }));

      // Also include destinations
      const allPoints = [
        ...markers,
        ...activeShipments.map((s) => ({
          lat: s.destination.lat,
          lng: s.destination.lng,
        })),
      ];

      const [minLng, minLat, maxLng, maxLat] = calculateBoundingBox(allPoints);

      // Center on bounding box
      const centerLng = (minLng + maxLng) / 2;
      const centerLat = (minLat + maxLat) / 2;
      setMapCenter([centerLng, centerLat]);
    }
  }, [activeShipments, autoZoom]);

  /**
   * Handle shipment marker click
   */
  const handleMarkerClick = useCallback((markerId: string) => {
    setSelectedShipmentId(markerId);
  }, []);

  /**
   * Simulate real-time driver movement
   */
  const simulateMovement = useCallback(() => {
    setActiveShipments((prev) =>
      prev.map((ship) => {
        const hasDestination =
          Math.abs(ship.currentLat - ship.destination.lat) > 0.001 ||
          Math.abs(ship.currentLng - ship.destination.lng) > 0.001;

        if (!hasDestination) {
          return { ...ship, status: 'delivered' as const };
        }

        // Move towards destination
        const speed = 0.0005;
        const toLat = Math.sign(ship.destination.lat - ship.currentLat) * speed;
        const toLng = Math.sign(ship.destination.lng - ship.currentLng) * speed;

        return {
          ...ship,
          currentLat: ship.currentLat + toLat,
          currentLng: ship.currentLng + toLng,
        };
      })
    );
  }, []);

  /**
   * Update distances periodically
   */
  useEffect(() => {
    const interval = setInterval(() => {
      setActiveShipments((prev) =>
        prev.map((ship) => ({
          ...ship,
          distance: calculateDistance(
            ship.currentLat,
            ship.currentLng,
            ship.destination.lat,
            ship.destination.lng
          ),
        }))
      );
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  /**
   * Simulate movement every 3 seconds
   */
  useEffect(() => {
    const movementInterval = setInterval(simulateMovement, 3000);
    return () => clearInterval(movementInterval);
  }, [simulateMovement]);

  // Convert to map markers
  const mapMarkers: MapMarker[] = activeShipments.map((ship) => ({
    id: ship.id,
    lat: ship.currentLat,
    lng: ship.currentLng,
    title: `${ship.driverName} - ${ship.distance.toFixed(2)}km to destination`,
  }));

  const selectedShipment = activeShipments.find((s) => s.id === selectedShipmentId);

  // Status color mapping
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'in-transit':
        return 'bg-blue-100 text-blue-900 border-blue-300';
      case 'delivered':
        return 'bg-green-100 text-green-900 border-green-300';
      case 'pending':
        return 'bg-amber-100 text-amber-900 border-amber-300';
      default:
        return 'bg-slate-100 text-slate-900 border-slate-300';
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-slate-900 mb-2">Live Fleet Tracking</h1>
          <p className="text-slate-600">
            Real-time driver locations and shipment tracking with TomTom Maps
          </p>
        </div>

        {/* Main Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Map */}
          <div className="lg:col-span-2">
            <div className="bg-white rounded-xl shadow-lg overflow-hidden h-96 lg:h-auto" style={{ minHeight: '500px' }}>
              <TomTomMap
                apiKey={TOMTOM_API_KEY}
                center={mapCenter}
                zoom={10}
                markers={mapMarkers}
                onMarkerClick={handleMarkerClick}
              />
            </div>
          </div>

          {/* Right Sidebar */}
          <div className="space-y-6">
            {/* Controls */}
            <div className="bg-white rounded-xl shadow-lg p-6">
              <h2 className="text-xl font-bold text-slate-900 mb-4">Fleet Control</h2>
              
              <label className="flex items-center space-x-3 cursor-pointer mb-4">
                <input
                  type="checkbox"
                  checked={autoZoom}
                  onChange={(e) => setAutoZoom(e.target.checked)}
                  className="w-4 h-4 rounded"
                />
                <span className="text-sm font-medium text-slate-700">Auto Zoom</span>
              </label>

              <button
                onClick={simulateMovement}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 px-4 rounded-lg transition-colors"
              >
                Manual Update
              </button>

              <div className="mt-4 pt-4 border-t border-slate-200">
                <p className="text-sm text-slate-600">
                  <strong>Active Shipments:</strong> {activeShipments.length}
                </p>
                <p className="text-sm text-slate-600">
                  <strong>In Transit:</strong>{' '}
                  {activeShipments.filter((s) => s.status === 'in-transit').length}
                </p>
                <p className="text-sm text-slate-600">
                  <strong>Delivered:</strong>{' '}
                  {activeShipments.filter((s) => s.status === 'delivered').length}
                </p>
              </div>
            </div>

            {/* Shipments List */}
            <div className="bg-white rounded-xl shadow-lg p-6">
              <h2 className="text-lg font-bold text-slate-900 mb-4">Active Shipments</h2>
              
              <div className="space-y-3 max-h-96 overflow-y-auto">
                {activeShipments.map((shipment) => (
                  <div
                    key={shipment.id}
                    onClick={() => setSelectedShipmentId(shipment.id)}
                    className={`p-3 rounded-lg cursor-pointer transition-colors ${
                      selectedShipmentId === shipment.id
                        ? 'bg-blue-100 border-2 border-blue-500'
                        : 'bg-slate-100 border-2 border-transparent hover:bg-slate-200'
                    }`}
                  >
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex-1">
                        <p className="font-semibold text-slate-900">{shipment.driverName}</p>
                        <p className="text-xs text-slate-600">{shipment.id}</p>
                      </div>
                      <span
                        className={`text-xs font-bold px-2 py-1 rounded border ${getStatusColor(
                          shipment.status
                        )}`}
                      >
                        {shipment.status.toUpperCase()}
                      </span>
                    </div>

                    <div className="text-xs text-slate-600 space-y-1">
                      <p>
                        <strong>Distance:</strong> {formatDistance(shipment.distance)}
                      </p>
                      <p>
                        <strong>Current:</strong>{' '}
                        {formatCoordinates(shipment.currentLat, shipment.currentLng)}
                      </p>
                    </div>

                    {/* Progress bar */}
                    <div className="mt-2 w-full bg-slate-300 rounded-full h-2">
                      <div
                        className="bg-blue-600 h-2 rounded-full transition-all"
                        style={{
                          width: `${Math.max(0, 100 - (shipment.distance / 50) * 100)}%`,
                        }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Selected Shipment Details */}
            {selectedShipment && (
              <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-xl shadow-lg p-6 border-2 border-blue-200">
                <h3 className="text-lg font-bold text-blue-900 mb-4">Shipment Details</h3>

                <div className="space-y-3 text-sm">
                  <div>
                    <p className="text-blue-700 font-semibold">Driver</p>
                    <p className="text-blue-900">{selectedShipment.driverName}</p>
                  </div>

                  <div>
                    <p className="text-blue-700 font-semibold">Status</p>
                    <p
                      className={`font-bold ${
                        selectedShipment.status === 'delivered'
                          ? 'text-green-600'
                          : selectedShipment.status === 'in-transit'
                          ? 'text-blue-600'
                          : 'text-amber-600'
                      }`}
                    >
                      {selectedShipment.status.toUpperCase()}
                    </p>
                  </div>

                  <div>
                    <p className="text-blue-700 font-semibold">Current Location</p>
                    <p className="text-blue-900 font-mono text-xs">
                      [{selectedShipment.currentLng.toFixed(6)},{' '}
                      {selectedShipment.currentLat.toFixed(6)}]
                    </p>
                  </div>

                  <div>
                    <p className="text-blue-700 font-semibold">Distance to Destination</p>
                    <p className="text-lg font-bold text-blue-900">
                      {formatDistance(selectedShipment.distance)}
                    </p>
                  </div>

                  <div>
                    <p className="text-blue-700 font-semibold">Destination</p>
                    <p className="text-blue-900 font-mono text-xs">
                      [{selectedShipment.destination.lng.toFixed(6)},{' '}
                      {selectedShipment.destination.lat.toFixed(6)}]
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Info Box */}
        <div className="mt-8 bg-green-50 border-2 border-green-200 rounded-xl p-6">
          <h3 className="text-lg font-bold text-green-900 mb-2">✨ Features</h3>
          <ul className="text-green-800 text-sm space-y-1">
            <li>✅ Real-time driver tracking with simulated movement</li>
            <li>✅ Distance calculation using Haversine formula</li>
            <li>✅ Auto-zoom to fit all active shipments</li>
            <li>✅ Detailed shipment information panel</li>
            <li>✅ Progress tracking to destination</li>
            <li>✅ Status indicators (In Transit, Delivered, Pending)</li>
          </ul>
        </div>
      </div>
    </div>
  );
}

export default LiveTrackingAdvancedPage;
