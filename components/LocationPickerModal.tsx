import React, { useEffect, useRef, useState } from 'react';
import { getApiConfig } from '../services/googleCalendarService';

interface LocationPickerModalProps {
    onClose: () => void;
    onLocationSelected: (lat: number, lng: number, address: string) => void;
    initialLat?: number;
    initialLng?: number;
}

const LocationPickerModal: React.FC<LocationPickerModalProps> = ({ onClose, onLocationSelected, initialLat, initialLng }) => {
    const mapRef = useRef<HTMLDivElement>(null);
    const [mapInstance, setMapInstance] = useState<any>(null);
    const [markerInstance, setMarkerInstance] = useState<any>(null);
    const [error, setError] = useState('');
    const [isLoading, setIsLoading] = useState(true);

    const defaultLat = -34.6037; // Buenos Aires default
    const defaultLng = -58.3816;

    useEffect(() => {
        const { apiKey } = getApiConfig();
        if (!apiKey) {
            setError('No se ha configurado la API Key de Google Maps.');
            setIsLoading(false);
            return;
        }

        const loadMap = () => {
            if (typeof window.google === 'undefined' || !window.google.maps) {
                // If script is not loaded, we load it dynamically
                const script = document.createElement('script');
                script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=places`;
                script.async = true;
                script.defer = true;
                script.onload = initMap;
                script.onerror = () => {
                    setError('Error al cargar Google Maps. Verifica tu API Key y que "Maps JavaScript API" esté habilitada en Google Cloud.');
                    setIsLoading(false);
                };
                document.body.appendChild(script);
            } else {
                initMap();
            }
        };

        const initMap = () => {
            if (!mapRef.current) return;

            try {
                const startPos = { 
                    lat: initialLat || defaultLat, 
                    lng: initialLng || defaultLng 
                };

                const map = new window.google.maps.Map(mapRef.current, {
                    center: startPos,
                    zoom: initialLat ? 15 : 10,
                    mapTypeControl: false,
                    streetViewControl: false,
                });

                const marker = new window.google.maps.Marker({
                    position: startPos,
                    map: map,
                    draggable: true,
                    animation: window.google.maps.Animation.DROP,
                });

                // Event listener for clicks on map
                map.addListener("click", (e: any) => {
                    const clickedLat = e.latLng.lat();
                    const clickedLng = e.latLng.lng();
                    marker.setPosition({ lat: clickedLat, lng: clickedLng });
                });

                setMapInstance(map);
                setMarkerInstance(marker);
                setIsLoading(false);

            } catch (err) {
                console.error("Error initializing map:", err);
                setError("Error inicializando el mapa.");
                setIsLoading(false);
            }
        };

        loadMap();
    }, []);

    const handleConfirm = () => {
        if (markerInstance) {
            const pos = markerInstance.getPosition();
            const lat = pos.lat();
            const lng = pos.lng();
            
            // Reverse geocoding to get address
            const geocoder = new window.google.maps.Geocoder();
            geocoder.geocode({ location: { lat, lng } }, (results: any, status: any) => {
                let address = "Ubicación seleccionada en mapa";
                if (status === "OK" && results[0]) {
                    address = results[0].formatted_address;
                }
                onLocationSelected(lat, lng, address);
                onClose();
            });
        }
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-60 z-[70] flex justify-center items-center">
            <div className="bg-white rounded-lg shadow-xl w-full max-w-3xl h-[80vh] flex flex-col m-4 overflow-hidden relative">
                <div className="p-4 border-b border-slate-200 flex justify-between items-center bg-slate-50">
                    <h3 className="font-bold text-slate-800">Seleccionar Ubicación</h3>
                    <button onClick={onClose} className="text-slate-400 hover:text-slate-600">✕</button>
                </div>

                <div className="flex-1 relative bg-slate-100">
                    {isLoading && (
                        <div className="absolute inset-0 flex items-center justify-center z-10 bg-slate-50">
                            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-sky-600"></div>
                        </div>
                    )}
                    
                    {error ? (
                        <div className="flex items-center justify-center h-full p-6 text-center">
                            <div className="bg-red-50 text-red-600 p-4 rounded-lg border border-red-200">
                                <p className="font-bold mb-2">Error de Mapa</p>
                                <p className="text-sm">{error}</p>
                            </div>
                        </div>
                    ) : (
                        <div ref={mapRef} className="w-full h-full" />
                    )}
                </div>

                <div className="p-4 border-t border-slate-200 flex justify-between items-center bg-white">
                    <p className="text-xs text-slate-500 hidden sm:block">Arrastra el marcador o haz clic en el mapa.</p>
                    <div className="flex gap-2">
                        <button onClick={onClose} className="px-4 py-2 text-sm border rounded hover:bg-slate-50">Cancelar</button>
                        <button onClick={handleConfirm} disabled={!!error} className="px-6 py-2 text-sm bg-sky-600 text-white rounded font-bold hover:bg-sky-700 disabled:opacity-50">
                            Confirmar Ubicación
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default LocationPickerModal;