import React, { useEffect, useRef, useState } from 'react';
import tt from '@tomtom-international/web-sdk-maps';

/**
 * Marker interface for map markers
 */
export interface MapMarker {
  id: string;
  lat: number;
  lng: number;
  title?: string;
}

/**
 * Props interface for TomTomMap component
 */
export interface TomTomMapProps {
  /** TomTom API Key (required) */
  apiKey: string;
  
  /** Map center coordinates [lng, lat] - default: Cairo [31.2357, 30.0444] */
  center?: [number, number];
  
  /** Zoom level - default: 12 */
  zoom?: number;
  
  /** Array of markers to display on the map */
  markers?: MapMarker[];
  
  /** Callback when a marker is clicked */
  onMarkerClick?: (markerId: string) => void;
  
  /** CSS class name for the container */
  className?: string;
}

/**
 * TomTomMap Component
 * 
 * A production-ready React component for TomTom Maps integration.
 * Replaces Leaflet with TomTom Web SDK Maps.
 * 
 * IMPORTANT: TomTom uses [lng, lat] coordinates, NOT [lat, lng] like Leaflet!
 * 
 * Usage:
 * ```tsx
 * <TomTomMap
 *   apiKey="YOUR_API_KEY"
 *   center={[31.2357, 30.0444]}
 *   zoom={13}
 *   markers={[
 *     { id: '1', lng: 31.2357, lat: 30.0444, title: 'Cairo' }
 *   ]}
 *   onMarkerClick={(id) => console.log('Marker clicked:', id)}
 * />
 * ```
 */
export const TomTomMap: React.FC<TomTomMapProps> = ({
  apiKey,
  center = [31.2357, 30.0444], // Cairo default
  zoom = 12,
  markers = [],
  onMarkerClick,
  className = '',
}) => {
  const mapContainer = useRef<HTMLDivElement>(null);
  const mapInstance = useRef<tt.Map | null>(null);
  const markersRef = useRef<Map<string, tt.Marker>>(new Map());

  /**
   * Initialize the TomTom map on component mount
   */
  useEffect(() => {
    // Validate required props
    if (!apiKey) {
      console.error('TomTomMap: apiKey is required');
      return;
    }

    if (!mapContainer.current) {
      console.error('TomTomMap: Container reference not found');
      return;
    }

    // Set the API key
    tt.setProductsVersion({
      maps: 'latest',
      services: 'latest',
    });

    try {
      // Create map instance
      mapInstance.current = tt.map({
        key: apiKey,
        container: mapContainer.current,
        center: center as tt.LngLatLike,
        zoom: zoom,
        style: 'https://api.tomtom.com/style/1/style/20.0/default-light/default-light.json',
      });

      // Add navigation controls (zoom in/out, compass)
      const navigationControl = new tt.NavigationControl({
        showCompass: true,
        showZoom: true,
        visualizePitch: true,
      });

      mapInstance.current.addControl(navigationControl, 'top-right');

      // Add terrain control
      mapInstance.current.addControl(
        new tt.TerrainControl({
          showLabel: true,
        }),
        'top-right'
      );

      // Set initial map style
      mapInstance.current.on('style.load', () => {
        console.log('TomTom Map loaded successfully');
      });

      // Handle map errors
      mapInstance.current.on('error', (e) => {
        console.error('TomTom Map error:', e);
      });
    } catch (error) {
      console.error('Error initializing TomTom map:', error);
    }

    // Cleanup function
    return () => {
      if (mapInstance.current) {
        // Remove all markers
        markersRef.current.forEach((marker) => {
          marker.remove();
        });
        markersRef.current.clear();

        // Remove map instance
        mapInstance.current.remove();
        mapInstance.current = null;
      }
    };
  }, [apiKey]); // Only re-initialize if apiKey changes

  /**
   * Handle marker updates (add/remove/update)
   */
  useEffect(() => {
    if (!mapInstance.current) return;

    // Get current marker IDs from props
    const currentMarkerIds = new Set(markers.map((m) => m.id));

    // Remove markers that are no longer in the props
    markersRef.current.forEach((marker, markerId) => {
      if (!currentMarkerIds.has(markerId)) {
        marker.remove();
        markersRef.current.delete(markerId);
      }
    });

    // Add or update markers
    markers.forEach((markerData) => {
      const { id, lat, lng, title } = markerData;

      // Check if marker already exists
      if (markersRef.current.has(id)) {
        // Update position if changed
        const existingMarker = markersRef.current.get(id)!;
        const currentLngLat = existingMarker.getLngLat();

        if (currentLngLat.lng !== lng || currentLngLat.lat !== lat) {
          existingMarker.setLngLat([lng, lat]);
        }
      } else {
        // Create new marker
        const element = document.createElement('div');
        element.className =
          'w-8 h-8 bg-blue-600 rounded-full border-2 border-white shadow-lg cursor-pointer hover:bg-blue-700 transition-colors';
        element.title = title || `Marker ${id}`;

        const marker = new tt.Marker({ element })
          .setLngLat([lng, lat])
          .addTo(mapInstance.current!);

        // Add click handler
        element.addEventListener('click', () => {
          if (onMarkerClick) {
            onMarkerClick(id);
          }
        });

        markersRef.current.set(id, marker);
      }
    });
  }, [markers, onMarkerClick]);

  /**
   * Handle zoom level changes
   */
  useEffect(() => {
    if (mapInstance.current) {
      mapInstance.current.setZoom(zoom);
    }
  }, [zoom]);

  /**
   * Handle center coordinate changes
   */
  useEffect(() => {
    if (mapInstance.current) {
      mapInstance.current.setCenter(center as tt.LngLatLike);
    }
  }, [center[0], center[1]]); // Use array destructuring to avoid dependency issues

  return (
    <div
      ref={mapContainer}
      className={`w-full rounded-lg border border-slate-200 shadow-sm ${className}`}
      style={{
        minHeight: '400px',
        height: '100%',
      }}
      aria-label="TomTom Map"
    />
  );
};

export default TomTomMap;
