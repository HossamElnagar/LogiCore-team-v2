# TomTom Maps Integration Guide

## Installation

```bash
npm install @tomtom-international/web-sdk-maps
```

## Global CSS Setup

Add this to your `main.tsx` or main CSS file:

```typescript
// main.tsx
import '@tomtom-international/web-sdk-maps/dist/maps.css';
```

## Environment Variables

Create a `.env.local` file in your project root:

```env
VITE_TOMTOM_API_KEY=your_api_key_here
```

Access it in your component:

```typescript
const apiKey = import.meta.env.VITE_TOMTOM_API_KEY || 'YOUR_API_KEY';
```

## Component Structure

```
src/
├── components/
│   └── TomTomMap/
│       ├── TomTomMap.tsx      (Main component)
│       └── index.ts           (Exports)
└── pages/
    └── MapExamplePage.tsx     (Usage example)
```

## Basic Usage

```typescript
import { TomTomMap } from '@/components/TomTomMap';

export function MyMapComponent() {
  return (
    <TomTomMap
      apiKey="YOUR_API_KEY"
      center={[31.2357, 30.0444]}    // [lng, lat]
      zoom={12}
      markers={[
        { 
          id: '1', 
          lng: 31.2357, 
          lat: 30.0444, 
          title: 'Cairo Hub' 
        }
      ]}
      onMarkerClick={(id) => console.log('Clicked:', id)}
    />
  );
}
```

## Key Features

### ✅ Dynamic Marker Management
- Add/remove markers without re-mounting
- Automatically updates when `markers` prop changes
- No memory leaks - proper cleanup on unmount

### ✅ Coordinate System
- **TomTom format:** `[longitude, latitude]`
- **NOT Leaflet format:** `[latitude, longitude]`
- Always pass `[lng, lat]` to avoid bugs

### ✅ Navigation Controls
- Zoom in/out buttons
- Compass for orientation
- Terrain control

### ✅ TypeScript Support
- Full type safety with `MapMarker` and `TomTomMapProps` interfaces
- React.FC pattern for component typing

### ✅ Production Ready
- Error handling and validation
- Proper useEffect cleanup
- Memory leak prevention
- Accessibility attributes (aria-label)

## Props Reference

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `apiKey` | string | - | **Required** - Your TomTom API key |
| `center` | [lng, lat] | [31.2357, 30.0444] | Map center coordinates (Cairo) |
| `zoom` | number | 12 | Initial zoom level (0-20) |
| `markers` | MapMarker[] | [] | Array of markers to display |
| `onMarkerClick` | function | undefined | Callback when marker is clicked |
| `className` | string | '' | Additional CSS classes |

## MapMarker Interface

```typescript
interface MapMarker {
  id: string;           // Unique identifier
  lat: number;          // Latitude
  lng: number;          // Longitude
  title?: string;       // Marker tooltip text
}
```

## Common Issues & Solutions

### ❌ Map not showing
- Verify API key is correct and valid
- Check that CSS is imported globally
- Ensure container has `minHeight` set

### ❌ Markers at wrong position
- Check coordinate order: **[lng, lat]** NOT [lat, lng]
- Verify `lng` and `lat` are numbers, not strings

### ❌ Performance issues with many markers
- Cluster markers using TomTom's clustering API
- Limit visible markers on screen
- Use marker filtering by zoom level

## Advanced: Marker Clustering

To cluster markers (e.g., 100+ markers), extend TomTomMap:

```typescript
// Add to TomTomMap.tsx in the marker setup effect
if (markers.length > 50) {
  mapInstance.current.setFeatureState(
    { source: 'markers', id: markerId },
    { cluster: true }
  );
}
```

## Migration from Leaflet

### Key Differences

| Feature | Leaflet | TomTom |
|---------|---------|--------|
| **Coordinates** | [lat, lng] | [lng, lat] |
| **Syntax** | L.map() | tt.map() |
| **API Key** | Optional | **Required** |
| **Styling** | Custom | TomTom styles |
| **Controls** | Many plugins | Built-in controls |

### Quick Refactor

**Before (Leaflet):**
```typescript
const marker = L.marker([30.0444, 31.2357]).addTo(map);
```

**After (TomTom):**
```typescript
const marker = new tt.Marker().setLngLat([31.2357, 30.0444]).addTo(map);
```

## Performance Tips

1. **Use useRef for map instance** - Prevents re-renders
2. **Memoize marker callbacks** - Use `useCallback` for `onMarkerClick`
3. **Lazy load markers** - Load markers as user pans/zooms
4. **Cluster large datasets** - Use TomTom clustering API
5. **Limit re-renders** - Only update when data truly changes

## Browser Support

TomTom Web SDK supports:
- ✅ Chrome 90+
- ✅ Firefox 88+
- ✅ Safari 14+
- ✅ Edge 90+

## Resources

- [TomTom Maps SDK Documentation](https://developer.tomtom.com/maps-sdk-web)
- [API Key Setup](https://developer.tomtom.com/user/register)
- [TomTom Examples](https://developer.tomtom.com/maps-sdk-web/functional-examples)

## Support & Troubleshooting

If you encounter issues:
1. Check console for error messages
2. Verify API key permissions in TomTom dashboard
3. Ensure dependencies are installed correctly
4. Clear cache and rebuild: `npm run build`
