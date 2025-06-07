import {useCallback, useState} from 'react';
import {GoogleMap, Libraries, Marker, useJsApiLoader,} from '@react-google-maps/api';
import {db} from '../firebase';
import {addDoc, collection, serverTimestamp} from 'firebase/firestore';
import {useAuth} from '../contexts/AuthContext';
import ExcelJS from 'exceljs';
import {X} from '@mynaui/icons-react';

interface Pin {
    lat: number;
    lng: number;
    names: string[];
    notes?: string;
}

const center = {
    lat: 47.4979,
    lng: 19.0402,
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
    const {user} = useAuth();
    const [pins, setPins] = useState<Pin[]>([]);

    const {isLoaded, loadError} = useJsApiLoader({
        id: 'google-map-script',
        googleMapsApiKey: import.meta.env.PROD
            ? import.meta.env.VITE_GOOGLE_MAPS_API_KEY
            : '',
        libraries,
    });

    const onLoad = useCallback(() => {
    }, []);
    const onUnmount = useCallback(() => {
    }, []);

    const handleMapClick = (e: google.maps.MapMouseEvent) => {
        if (!user || !e.latLng) return;
        const newPin: Pin = {
            lat: e.latLng.lat(),
            lng: e.latLng.lng(),
            names: [''],
        };
        setPins((prev) => [...prev, newPin]);
    };

    const updateSingleName = (
        pinIndex: number,
        nameIndex: number,
        value: string
    ) => {
        const updated = [...pins];
        updated[pinIndex].names[nameIndex] = value;
        setPins(updated);
    };

    const addNameField = (pinIndex: number) => {
        const updated = [...pins];
        updated[pinIndex].names.push('');
        setPins(updated);
    };

    const removeNameField = (pinIndex: number, nameIndex: number) => {
        const updated = [...pins];
        updated[pinIndex].names.splice(nameIndex, 1);
        setPins(updated);
    };

    const removePin = (pinIndex: number) => {
        setPins((prev) => prev.filter((_, i) => i !== pinIndex));
    };

    const savePins = async () => {
        if (!user) return;
        try {
            await addDoc(collection(db, 'maps'), {
                userId: user.uid,
                mapName: 'My Map',
                timestamp: serverTimestamp(),
                pins: pins,
            });
            alert('Térkép elmentve!');
        } catch (error) {
            console.error('Error saving map:', error);
            alert('Hiba történt a térkép mentésekor. Próbáld újra később.');
        }
    };

    const getDistance = (
        lat1: number,
        lng1: number,
        lat2: number,
        lng2: number
    ) => {
        const R = 6_371_000;
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

    const exportDistances = async () => {
        const points: { name: string; lat: number; lng: number }[] = [];
        pins.forEach((pin) =>
            pin.names.filter(n => n.trim()).forEach((n) =>
                points.push({name: n, lat: pin.lat, lng: pin.lng})
            )
        );

        const workbook = new ExcelJS.Workbook();
        const worksheet = workbook.addWorksheet('Distances');
        worksheet.addRow(['frombetu', 'tobetu', 'distance(m)']);

        for (let i = 0; i < points.length; i++) {
            for (let j = i + 1; j < points.length; j++) {
                const dist = getDistance(
                    points[i].lat,
                    points[i].lng,
                    points[j].lat,
                    points[j].lng
                );
                worksheet.addRow([
                    points[i].name,
                    points[j].name,
                    Number(dist.toFixed(2)),
                ]);
            }
        }

        const buffer = await workbook.xlsx.writeBuffer();
        const blob = new Blob([buffer], {
            type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        });

        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = 'distances.xlsx';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
    };

    if (loadError) return <div>Hiba a betöltéskor</div>;
    if (!isLoaded)
        return (
            <div className="flex justify-center items-center h-[400px]">Betöltés...</div>
        );

    return (
        <div className="h-[80vh] flex">
            <div className="flex-[4]">
                <GoogleMap
                    mapContainerStyle={{width: '100%', height: '100%'}}
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
                            position={{lat: pin.lat, lng: pin.lng}}
                            label={
                                pin.names.join(', ') || ''
                            }
                            icon={{
                                url: 'http://maps.google.com/mapfiles/ms/icons/red-dot.png',
                                labelOrigin: new google.maps.Point(16, -16), // move label upward
                            }}
                        />
                    ))}
                </GoogleMap>
            </div>

            <div
                className="flex-[1] flex flex-col p-4 gap-4 h-full overflow-hidden bg-gray-50 border-l border-gray-200">
                {user && (
                    <div className="flex flex-col gap-2">
                        <button
                            className="px-4 py-2 bg-blue-600 text-white rounded"
                            onClick={savePins}
                        >
                            Térkép mentése db-be
                        </button>
                        <button
                            className="px-4 py-2 bg-blue-600 text-white rounded"
                            onClick={exportDistances}
                        >
                            Exportálás Excelbe
                        </button>
                    </div>
                )}

                <div className="flex-1 overflow-y-auto pr-1">
                    {pins.length === 0 ? (
                            <div className="text-gray-500 text-center mt-4">
                                Nincsenek állomások. Kattints a térképre egy új állomás hozzáadásához.
                            </div>
                        ) :
                        pins.map((pin, pinIndex) => (
                            <div
                                key={pinIndex}
                                data-pin={pinIndex}
                                className="relative mt-4 border rounded p-3 bg-white shadow"
                            >
                                <button
                                    onClick={() => removePin(pinIndex)}
                                    className="absolute top-1 right-1 text-gray-500 hover:text-red-600"
                                    aria-label="Remove"
                                >
                                    <X className="w-4 h-4"/>
                                </button>
                                <label className="text-sm font-semibold text-gray-700 mb-1 block">
                                    {pinIndex + 1}. állomás nevei:
                                </label>
                                <div className="flex flex-col gap-1">
                                    {pin.names.map((name, nameIndex) => (
                                        <div key={nameIndex} className="flex gap-2 items-center">
                                            <input
                                                type="text"
                                                value={name}
                                                className="w-full border rounded p-2 text-sm"
                                                onChange={(e) =>
                                                    updateSingleName(pinIndex, nameIndex, e.target.value)
                                                }
                                                onKeyDown={(e) => {
                                                    if (e.key === 'Enter' && name.trim() !== '') {
                                                        e.preventDefault();
                                                        addNameField(pinIndex);
                                                        setTimeout(() => {
                                                            const inputs = document.querySelectorAll<HTMLInputElement>(
                                                                `[data-pin="${pinIndex}"] input[type="text"]`
                                                            );
                                                            inputs[inputs.length - 1]?.focus();
                                                        }, 0);
                                                    }
                                                }}
                                                placeholder={`${nameIndex + 1}. állomásnév`}
                                            />
                                            <button
                                                onClick={() => removeNameField(pinIndex, nameIndex)}
                                                className="text-gray-400 hover:text-red-600 text-sm"
                                                title="Remove name"
                                            >
                                                <X className="w-4 h-4"/>
                                            </button>
                                        </div>
                                    ))}
                                    <button
                                        onClick={() => addNameField(pinIndex)}
                                        className="text-blue-600 hover:underline text-sm mt-1 self-start"
                                    >
                                        + Állomásnév hozzáadása
                                    </button>
                                </div>
                            </div>
                        ))}
                </div>
            </div>
        </div>
    );
}
