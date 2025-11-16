import { File, Edit, Plus, Save, Trash, X, Zap} from '@mynaui/icons-react';
import {GoogleMap, Libraries, Marker, useJsApiLoader} from '@react-google-maps/api';
import ExcelJS from 'exceljs';
import {
    addDoc,
    collection,
    deleteDoc,
    doc,
    getDoc,
    getDocs,
    query,
    serverTimestamp,
    updateDoc,
    where
} from 'firebase/firestore';
import {useCallback, useEffect, useRef, useState} from 'react';
import {useAuth} from '../contexts/AuthContext.tsx';
import {db} from '../firebase';

interface Pin {
    lat: number;
    lng: number;
    names: string[];
    notes?: string;
}

interface MapDoc {
    userId: string;
    mapName: string;
    pins: Pin[];
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

// Helper function to refresh the list of saved maps
const fetchSavedMaps = async (userId: string) => {
    const q = query(collection(db, 'maps'), where('userId', '==', userId));
    const snap = await getDocs(q);
    return snap.docs.map(d => {
        const data = d.data() as MapDoc;
        return {id: d.id, mapName: data.mapName};
    });
};

export default function Map() {
    const {user} = useAuth();
    const [pins, setPins] = useState<Pin[]>([]);
    // Track the name of the map being edited
    const [mapName, setMapName] = useState('Új Térkép');
    // Track the ID of the map being edited (null if new)
    const [currentMapId, setCurrentMapId] = useState<string | null>(null);
    const [savedMaps, setSavedMaps] = useState<{ id: string; mapName: string }[]>([]);
    // This is used to select the map in the dropdown to load/delete
    const [selectedMapId, setSelectedMapId] = useState('');

    // Fix scrollRef initialization
    const scrollRef = useRef<HTMLDivElement | null>(null);

    // Ref to store the Google Map instance
    const mapRef = useRef<google.maps.Map | null>(null);

    const {isLoaded, loadError} = useJsApiLoader({
        id: 'google-map-script',
        googleMapsApiKey: import.meta.env.PROD
            ? import.meta.env.VITE_GOOGLE_MAPS_API_KEY
            : '',
        libraries,
    });

    // Initial fetch of saved maps list
    useEffect(() => {
        if (!user) {
            setSavedMaps([]);
            return;
        }
        fetchSavedMaps(user.uid).then(maps => {
            setSavedMaps(maps);
            // Default select the first map if available
            if (maps.length > 0) {
                setSelectedMapId(maps[0].id);
            }
        }).catch(console.error);
    }, [user]);

    // 2. Capture the map instance when it loads
    const onLoad = useCallback((map: google.maps.Map) => {
        mapRef.current = map;
    }, []);

    const onUnmount = useCallback(() => {
        mapRef.current = null;
    }, []);

    const handleMapClick = (e: google.maps.MapMouseEvent) => {
        if (!user || !e.latLng) return;
        const newPin: Pin = {
            lat: e.latLng.lat(),
            lng: e.latLng.lng(),
            names: [''],
        };

        setPins((prev) => [...prev, newPin]);

        scrollRef.current?.scrollTo({
            top: scrollRef.current.scrollHeight,
            behavior: 'smooth',
        });
    };

    const createNewMap = () => {
        const newName = window.prompt('Add meg az új térkép nevét:', 'Új Térkép');
        if (!newName || !newName.trim()) {
            return;
        }

        setPins([]);
        setMapName(newName.trim());
        setCurrentMapId(null);
        setSelectedMapId(''); // Deselect saved map
    };

    const saveCurrentMap = async () => {
        if (!user) return;
        if (!mapName.trim()) {
            alert('Add meg a térkép nevét!');
            return;
        }

        try {
            if (currentMapId) {
                // Scenario 1: Update existing map
                const docRef = doc(db, 'maps', currentMapId);
                await updateDoc(docRef, {
                    mapName: mapName.trim(),
                    pins,
                });
                alert('Módosítások mentve!');
            } else {
                // Scenario 2: Save new map
                const q = query(
                    collection(db, 'maps'),
                    where('userId', '==', user.uid),
                    where('mapName', '==', mapName.trim())
                );
                const snap = await getDocs(q);
                if (snap.docs.length > 0) {
                    alert('Már létezik ilyen nevű térkép. Használj egyedi nevet, vagy nevezd át előbb!');
                    return;
                }

                const newDocRef = await addDoc(collection(db, 'maps'), {
                    userId: user.uid,
                    mapName: mapName.trim(),
                    timestamp: serverTimestamp(),
                    pins,
                });

                setCurrentMapId(newDocRef.id);
                alert('Térkép sikeresen elmentve!');
            }

            // Refresh the saved maps list
            const refreshedMaps = await fetchSavedMaps(user.uid);
            setSavedMaps(refreshedMaps);

            // Set the newly saved/updated map as selected
            const newId = currentMapId || refreshedMaps.find(m => m.mapName === mapName.trim())?.id;
            if (newId) {
                setSelectedMapId(newId);
                setCurrentMapId(newId);
            }

        } catch (error) {
            console.error('Error saving map:', error);
            alert('Hiba történt a térkép mentésekor. Próbáld újra később.');
        }
    };

    const renameCurrentMap = async () => {
        if (!user || !currentMapId) {
            alert('Nincs betöltve térkép az átnevezéshez.');
            return;
        }
        const newName = window.prompt('Írd be az új nevet:', mapName);

        if (newName && newName.trim() && newName.trim() !== mapName) {
            try {
                const docRef = doc(db, 'maps', currentMapId);
                await updateDoc(docRef, {mapName: newName.trim()});
                setMapName(newName.trim());

                // Refresh saved maps list
                setSavedMaps(await fetchSavedMaps(user.uid));
            } catch (error) {
                console.error('Error renaming map:', error);
                alert('Hiba történt az átnevezéskor.');
            }
        }
    };

    const deleteMap = async () => {
        if (!user || !selectedMapId) {
            alert('Válassz ki egy térképet a törléshez.');
            return;
        }

        const mapToDelete = savedMaps.find(m => m.id === selectedMapId)?.mapName || 'ezt a térképet';
        const confirmDelete = window.confirm(`Biztosan törölni szeretnéd a(z) "${mapToDelete}" térképet?`);

        if (confirmDelete) {
            try {
                await deleteDoc(doc(db, 'maps', selectedMapId));

                // Reset state if we deleted the currently loaded map
                if (currentMapId === selectedMapId) {
                    setPins([]);
                    setMapName('Új Térkép');
                    setCurrentMapId(null);
                }

                // Refresh saved maps list
                const refreshedMaps = await fetchSavedMaps(user.uid);
                setSavedMaps(refreshedMaps);
                setSelectedMapId(refreshedMaps.length > 0 ? refreshedMaps[0].id : '');
            } catch (error) {
                console.error('Error deleting map:', error);
                alert('Hiba történt a térkép törlésekor.');
            }
        }
    };


    const handleMarkerDragEnd = useCallback((index: number, e: google.maps.MapMouseEvent) => {
        setPins(prevPins => {
            const updatedPins = [...prevPins];
            // Update the latitude and longitude for the pin at the given index
            if (e.latLng) {
                updatedPins[index] = {
                    ...updatedPins[index],
                    lat: e.latLng.lat(),
                    lng: e.latLng.lng(),
                };
            }

            return updatedPins;
        });
    }, []);

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

    const goToPin = (pinIndex: number) => {
        const pin = pins[pinIndex];
        const map = mapRef.current;

        if (!map) {
            console.error('Google Map instance not loaded.');
            return;
        }

        map.setCenter({lat: pin.lat, lng: pin.lng});
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

    const loadMap = async (id: string) => {
        if (!user || !id) return;
        setSelectedMapId(id);

        try {
            const snap = await getDoc(doc(db, 'maps', id));
            if (snap.exists()) {
                const data = snap.data() as MapDoc;
                setPins(data.pins || []);
                setMapName(data.mapName || '');
                // Set the current ID being edited
                setCurrentMapId(id);
            }
        } catch (error) {
            console.error('Error loading map:', error);
            alert('Hiba történt a térkép betöltésekor.');
        }
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
                            draggable={true}
                            onDragEnd={(e) => handleMarkerDragEnd(index, e)}
                        />
                    ))}
                </GoogleMap>
            </div>

            <div
                className="flex-[1] flex flex-col p-4 pt-0 gap-4 h-full overflow-hidden bg-gray-50 border-l border-gray-200">
                {user && (
                    <div className="flex flex-col gap-3">
                        {/* Current Map Name and Status */}

                        <div className='flex flex-row items-center justify-between'>
                            <div className="flex flex-col gap-1">
                                <h2 className="text-xl font-bold text-gray-800">
                                    {mapName}
                                </h2>
                                <span className={`text-sm ${currentMapId ? 'text-green-600' : 'text-yellow-600'}`}>
                                {currentMapId ? 'Betöltött/Mentett térkép' : 'Új térkép (Nincs mentve)'}
                             </span>
                            </div>
                            {currentMapId && (
                                <button
                                    className="px-3 py-2 bg-yellow-500 text-white rounded hover:bg-yellow-400"
                                    onClick={renameCurrentMap}
                                    title="Térkép átnevezése"
                                >
                                    <Edit className="w-5 h-5"/>
                                </button>
                            )}
                        </div>

                        <div className="flex gap-2">
                            {/*<label*/}
                            {/*    // type="text"*/}
                            {/*    // value={mapName}*/}
                            {/*    // onChange={(e) => setMapName(e.target.value)}*/}
                            {/*    // placeholder="Térkép neve"*/}
                            {/*    className="rounded p-2 flex-grow"*/}
                            {/*>*/}
                            {/*    {mapName}*/}
                            {/*</label>*/}

                        </div>

                        {/* Action Buttons */}
                        <div className="grid grid-cols-2 gap-2">
                            <button
                                className="flex col-span-2 items-center justify-center gap-2 px-4 py-2 bg-green-600 text-white rounded hover:bg-green-500 disabled:opacity-50 disabled:cursor-not-allowed"
                                onClick={saveCurrentMap}
                                disabled={pins.length === 0 || !mapName.trim()}
                            >
                                <Save className="w-5 h-5"/> {currentMapId ? 'Módosítások mentése' : 'Mentés'}
                            </button>
                            <button
                                className="flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded"
                                onClick={createNewMap}
                            >
                                <Plus className="w-5 h-5"/> Új Térkép
                            </button>
                            <button
                                className="flex items-center justify-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded disabled:opacity-50 disabled:hover:bg-indigo-600"
                                onClick={exportDistances}
                                disabled={pins.length < 2}
                            >
                                <Zap className="w-5 h-5"/> Exportálás
                            </button>
                        </div>

                        {/* Load/Delete Workflow */}
                        {savedMaps.length > 0 && (
                            <div className="flex flex-col gap-2 border-t pt-3 mt-3">
                                <label className="text-sm font-semibold text-gray-700">Térkép betöltése/törlése:</label>
                                <div className="flex gap-2">
                                    <select
                                        value={selectedMapId}
                                        onChange={(e) => setSelectedMapId(e.target.value)}
                                        className="border rounded p-2 w-12 flex-grow"
                                    >
                                        {savedMaps.map((m) => (
                                            <option key={m.id} value={m.id}>
                                                {m.mapName}
                                            </option>
                                        ))}
                                    </select>
                                    <button
                                        className="px-3 py-2 bg-gray-500 text-white rounded hover:bg-gray-400"
                                        onClick={() => loadMap(selectedMapId)}
                                        disabled={!selectedMapId}
                                        title="Betöltés"
                                    >
                                        <File className="w-5 h-5"/>
                                    </button>
                                    <button
                                        className="px-3 py-2 bg-red-600 text-white rounded hover:bg-red-500"
                                        onClick={deleteMap}
                                        disabled={!selectedMapId}
                                        title="Törlés"
                                    >
                                        <Trash className="w-5 h-5"/>
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                )}

                <div ref={scrollRef} className="flex-1 overflow-y-auto mt-4">
                    <button
                        className="p-2 w-full bg-red-600 hover:bg-red-500 text-white rounded mb-4 disabled:opacity-50 disabled:hover:bg-red-600"
                        disabled={pins.length === 0}
                        onClick={() => {
                            if (confirm("Biztos, hogy az összes állomást törölni szeretnéd a térképről?"))
                                setPins([])
                        }}>Összes Állomás Törlése a Térképről
                    </button>
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
                                <label
                                    className="text-sm font-semibold text-gray-700 hover:text-blue-600 mb-2 block cursor-pointer"
                                    onClick={() => goToPin(pinIndex)} // The onClick handler triggers map centering
                                >
                                    {pinIndex + 1}. állomás nevei:
                                </label>

                                <button
                                    onClick={() => removePin(pinIndex)}
                                    className="absolute top-1 right-1 text-gray-500 hover:text-red-600"
                                    aria-label="Remove"
                                >
                                    <Trash className="w-4 h-4 m-2"/>
                                </button>

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