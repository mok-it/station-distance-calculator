import { useState, useCallback } from 'react';
import { GoogleMap, useJsApiLoader, Marker, Libraries } from '@react-google-maps/api';
import { Button, Box, CircularProgress } from '@mui/material';
import { db } from '../firebase';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { useAuth } from '../contexts/AuthContext';

interface Pin {
  lat: number;
  lng: number;
  stationName: string;
  notes?: string;
}

const containerStyle = {
  width: '100%',
  height: '400px'
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
  const [map, setMap] = useState<google.maps.Map | null>(null);

  const { isLoaded, loadError } = useJsApiLoader({
    id: 'google-map-script',
    googleMapsApiKey: import.meta.env.VITE_GOOGLE_MAPS_API_KEY,
    libraries
  });

  const onLoad = useCallback((map: google.maps.Map) => {
    setMap(map);
  }, []);

  const onUnmount = useCallback(() => {
    setMap(null);
  }, []);

  const handleMapClick = async (e: google.maps.MapMouseEvent) => {
    if (!user || !e.latLng) return;

    const newPin: Pin = {
      lat: e.latLng.lat(),
      lng: e.latLng.lng(),
      stationName: `Station ${pins.length + 1}`,
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
    <Box sx={{ width: '100%', height: '100%' }}>
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
            title={pin.stationName}
          />
        ))}
      </GoogleMap>
      {user && (
        <Button
          variant="contained"
          onClick={savePins}
          sx={{ mt: 2 }}
        >
          Save Map
        </Button>
      )}
    </Box>
  );
} 