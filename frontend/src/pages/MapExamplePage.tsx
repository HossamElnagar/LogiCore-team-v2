import React, { useState } from 'react';
import { TomTomMap, MapMarker } from '../components/TomTomMap';

/**
 * Example page demonstrating TomTomMap usage
 * 
 * Shows:
 * - Basic map initialization
 * - Adding markers dynamically
 * - Handling marker clicks
 * - Updating map center and zoom
 */
export function MapExamplePage() {
  const TOMTOM_API_KEY = import.meta.env.VITE_TOMTOM_API_KEY || 'YOUR_API_KEY_HERE';

  // Sample markers - Egypt delivery locations
  const [markers, setMarkers] = useState<MapMarker[]>([
    {
      id: 'cairo-hub',
      lng: 31.2357,
      lat: 30.0444,
      title: 'Cairo Hub',
    },
    {
      id: 'giza-center',
      lng: 31.1996,
      lat: 30.0081,
      title: 'Giza Distribution Center',
    },
    {
      id: 'helwan-warehouse',
      lng: 31.3502,
      lat: 29.8559,
      title: 'Helwan Warehouse',
    },
    {
      id: 'qalyubia-depot',
      lng: 31.2913,
      lat: 30.3396,
      title: 'Qalyubia Depot',
    },
  ]);

  const [selectedMarkerId, setSelectedMarkerId] = useState<string | null>(null);
  const [mapCenter, setMapCenter] = useState<[number, number]>([31.2357, 30.0444]);
  const [mapZoom, setMapZoom] = useState(12);

  /**
   * Handle marker click
   */
  const handleMarkerClick = (markerId: string) => {
    setSelectedMarkerId(markerId);
    
    // Find the marker and center on it
    const marker = markers.find((m) => m.id === markerId);
    if (marker) {
      setMapCenter([marker.lng, marker.lat]);
      setMapZoom(14);
    }
  };

  /**
   * Add a new marker to the map
   */
  const handleAddMarker = () => {
    const newMarker: MapMarker = {
      id: `marker-${Date.now()}`,
      lng: 31.2357 + (Math.random() - 0.5) * 0.5,
      lat: 30.0444 + (Math.random() - 0.5) * 0.5,
      title: `New Location ${markers.length + 1}`,
    };
    setMarkers([...markers, newMarker]);
  };

  /**
   * Remove selected marker
   */
  const handleRemoveMarker = (markerId: string) => {
    setMarkers(markers.filter((m) => m.id !== markerId));
    if (selectedMarkerId === markerId) {
      setSelectedMarkerId(null);
    }
  };

  /**
   * Center map on Cairo
   */
  const handleCenterCairo = () => {
    setMapCenter([31.2357, 30.0444]);
    setMapZoom(12);
    setSelectedMarkerId(null);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-slate-900 mb-2">Live Delivery Map</h1>
          <p className="text-slate-600">
            TomTom Maps integration with dynamic marker management
          </p>
        </div>

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Map Container */}
          <div className="lg:col-span-2">
            <div className="bg-white rounded-xl shadow-lg overflow-hidden">
              <TomTomMap
                apiKey={TOMTOM_API_KEY}
                center={mapCenter}
                zoom={mapZoom}
                markers={markers}
                onMarkerClick={handleMarkerClick}
                className="h-full"
              />
            </div>
          </div>

          {/* Sidebar Controls */}
          <div className="space-y-6">
            {/* Control Panel */}
            <div className="bg-white rounded-xl shadow-lg p-6">
              <h2 className="text-xl font-bold text-slate-900 mb-4">Controls</h2>
              
              <div className="space-y-3">
                <button
                  onClick={handleAddMarker}
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 px-4 rounded-lg transition-colors"
                >
                  + Add Marker
                </button>

                <button
                  onClick={handleCenterCairo}
                  className="w-full bg-green-600 hover:bg-green-700 text-white font-semibold py-2 px-4 rounded-lg transition-colors"
                >
                  Center on Cairo
                </button>

                <button
                  onClick={() => setMapZoom(mapZoom + 1)}
                  disabled={mapZoom >= 20}
                  className="w-full bg-slate-600 hover:bg-slate-700 text-white font-semibold py-2 px-4 rounded-lg transition-colors disabled:opacity-50"
                >
                  Zoom In (Current: {mapZoom})
                </button>

                <button
                  onClick={() => setMapZoom(Math.max(mapZoom - 1, 0))}
                  disabled={mapZoom <= 0}
                  className="w-full bg-slate-600 hover:bg-slate-700 text-white font-semibold py-2 px-4 rounded-lg transition-colors disabled:opacity-50"
                >
                  Zoom Out (Current: {mapZoom})
                </button>
              </div>
            </div>

            {/* Markers List */}
            <div className="bg-white rounded-xl shadow-lg p-6">
              <h2 className="text-xl font-bold text-slate-900 mb-4">Markers ({markers.length})</h2>
              
              <div className="space-y-2 max-h-96 overflow-y-auto">
                {markers.length === 0 ? (
                  <p className="text-slate-500 text-sm">No markers on the map</p>
                ) : (
                  markers.map((marker) => (
                    <div
                      key={marker.id}
                      onClick={() => handleMarkerClick(marker.id)}
                      className={`p-3 rounded-lg cursor-pointer transition-colors ${
                        selectedMarkerId === marker.id
                          ? 'bg-blue-100 border-2 border-blue-500'
                          : 'bg-slate-100 border-2 border-transparent hover:bg-slate-200'
                      }`}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <p className="font-semibold text-slate-900">{marker.title || `Marker ${marker.id}`}</p>
                          <p className="text-xs text-slate-600 mt-1">
                            {marker.lat.toFixed(4)}, {marker.lng.toFixed(4)}
                          </p>
                        </div>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleRemoveMarker(marker.id);
                          }}
                          className="ml-2 text-red-600 hover:text-red-700 font-bold text-lg"
                          title="Delete marker"
                        >
                          ×
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Selected Marker Info */}
            {selectedMarkerId && (
              <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-xl shadow-lg p-6 border-2 border-blue-200">
                <h2 className="text-lg font-bold text-blue-900 mb-3">Selected Marker</h2>
                {markers
                  .filter((m) => m.id === selectedMarkerId)
                  .map((marker) => (
                    <div key={marker.id} className="space-y-2 text-sm">
                      <div>
                        <p className="text-blue-700 font-semibold">Title</p>
                        <p className="text-blue-900">{marker.title || 'Untitled'}</p>
                      </div>
                      <div>
                        <p className="text-blue-700 font-semibold">Coordinates</p>
                        <p className="text-blue-900 font-mono">
                          [{marker.lng.toFixed(6)}, {marker.lat.toFixed(6)}]
                        </p>
                      </div>
                      <button
                        onClick={() => handleRemoveMarker(marker.id)}
                        className="w-full mt-4 bg-red-600 hover:bg-red-700 text-white font-semibold py-2 px-4 rounded-lg transition-colors"
                      >
                        Delete This Marker
                      </button>
                    </div>
                  ))}
              </div>
            )}
          </div>
        </div>

        {/* Info Section */}
        <div className="mt-8 bg-blue-50 border-2 border-blue-200 rounded-xl p-6">
          <h3 className="text-lg font-bold text-blue-900 mb-3">📍 Coordinate Format</h3>
          <p className="text-blue-800 text-sm mb-2">
            <strong>Important:</strong> TomTom uses [lng, lat] format, NOT [lat, lng] like Leaflet!
          </p>
          <div className="bg-white rounded-lg p-3 font-mono text-xs text-slate-700 overflow-x-auto">
            <p>✅ TomTom:  [31.2357, 30.0444] (longitude, latitude)</p>
            <p>❌ Leaflet: [30.0444, 31.2357] (latitude, longitude)</p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default MapExamplePage;
