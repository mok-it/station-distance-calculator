import { useState, useCallback } from 'react';
import { GoogleMap, useJsApiLoader, Marker, Libraries } from '@react-google-maps/api';
import { Button, Box, CircularProgress, TextField } from '@mui/material';
import { db } from '../firebase';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { useAuth } from '../contexts/AuthContext';

interface Pin {
  lat: number;
  lng: number;
  names: string[];
  notes?: string;
}

const containerStyle = {
  width: '100%',
  height: '600px'
};

const center = {
  lat: 47.4979,
  lng: 19.0402
};

const defaultOptions = {
  panControl: true,
  zoomControl: true,
  mapTypeControl: false,
  scaleControl: false,
  streetViewControl: false,
  rotateControl: false,
  clickableIcons: false,
  keyboardShortcuts: false,
  scrollwheel: true,
  disableDoubleClickZoom: false,
  fullscreenControl: false,
};

const libraries: Libraries = ['places'];

export default function Map() {
  const { user } = useAuth();
  const [pins, setPins] = useState<Pin[]>([]);

  const { isLoaded, loadError } = useJsApiLoader({
    id: 'google-map-script',
    googleMapsApiKey: import.meta.env.VITE_GOOGLE_MAPS_API_KEY,
    libraries
  });

  const onLoad = useCallback(() => {
    // No-op: we don't store the map instance
  }, []);

  const onUnmount = useCallback(() => {
    // No-op on unmount
  }, []);

  const handleMapClick = async (e: google.maps.MapMouseEvent) => {
    if (!user || !e.latLng) return;

    const namesInput = window.prompt(
      'Enter station names separated by commas',
      `Station ${pins.length + 1}`
    );
    if (!namesInput) return;

    const newPin: Pin = {
      lat: e.latLng.lat(),
      lng: e.latLng.lng(),
      names: namesInput.split(',').map((n) => n.trim()).filter(Boolean),
      notes: ''
    };

    setPins([...pins, newPin]);
  };

  const savePins = async () => {
    if (!user) return;

    try {
      await addDoc(collection(db, 'maps'), {
        userId: user.uid,
        mapName: 'My Map',
        timestamp: serverTimestamp(),
        pins: pins
      });
      alert('Map saved successfully!');
    } catch (error) {
      console.error('Error saving map:', error);
      alert('Error saving map. Please try again.');
    }
  };

  const getDistance = (
    lat1: number,
    lng1: number,
    lat2: number,
    lng2: number
  ) => {
    const R = 6371; // km
    const dLat = ((lat2 - lat1) * Math.PI) / 180;
    const dLng = ((lng2 - lng1) * Math.PI) / 180;
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos((lat1 * Math.PI) / 180) *
        Math.cos((lat2 * Math.PI) / 180) *
        Math.sin(dLng / 2) *
        Math.sin(dLng / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  };

  const exportDistances = () => {
    const points: { name: string; lat: number; lng: number }[] = [];
    pins.forEach((pin) =>
      pin.names.forEach((n) => points.push({ name: n, lat: pin.lat, lng: pin.lng }))
    );
    const rows = ['from,to,distance_km'];
    for (let i = 0; i < points.length; i++) {
      for (let j = i + 1; j < points.length; j++) {
        const dist = getDistance(
          points[i].lat,
          points[i].lng,
          points[j].lat,
          points[j].lng
        );
        rows.push(
          `${points[i].name},${points[j].name},${dist.toFixed(2)}`
        );
      }
    }
    const csv = rows.join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'distances.csv';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const updatePinNames = (index: number, value: string) => {
    const updated = [...pins];
    updated[index].names = value
      .split(',')
      .map((n) => n.trim())
      .filter(Boolean);
    setPins(updated);
  };

  if (loadError) {
    return <div>Error loading maps</div>;
  }

  if (!isLoaded) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '400px' }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box sx={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
      <GoogleMap
        mapContainerStyle={containerStyle}
        center={center}
        zoom={10}
        onLoad={onLoad}
        onUnmount={onUnmount}
        onClick={handleMapClick}
        options={defaultOptions}
      >
        {pins.map((pin, index) => (
          <Marker
            key={index}
            position={{ lat: pin.lat, lng: pin.lng }}
            title={pin.names.join(', ')}
          />
        ))}
      </GoogleMap>

      {pins.map((pin, index) => (
        <TextField
          key={index}
          label={`Names for Station ${index + 1}`}
          value={pin.names.join(', ')}
          onChange={(e) => updatePinNames(index, e.target.value)}
          sx={{ mt: 2, width: '100%' }}
        />
      ))}

      {user && (
        <Box sx={{ display: 'flex', gap: 2, mt: 2 }}>
          <Button variant="contained" onClick={savePins}>
            Save Map
          </Button>
          <Button variant="contained" onClick={exportDistances}>
            Export CSV
          </Button>
        </Box>
      )}
    </Box>
  );
} 