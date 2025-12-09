
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
    
    // DEMO MODE STATES
    const [isDemoMode, setIsDemoMode] = useState(false);
    const [demoMarkerPosition, setDemoMarkerPosition] = useState<{x: number, y: number} | null>(null);

    const defaultLat = -34.6037; // Buenos Aires default
    const defaultLng = -58.3816;

    useEffect(() => {
        const { apiKey } = getApiConfig();
        if (!apiKey) {
            // ACTIVAR MODO DEMO SI NO HAY KEY
            setIsDemoMode(true);
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
                    // Fallback a demo si falla la carga
                    console.warn("Fallo carga de Maps, activando demo mode");
                    setIsDemoMode(true);
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
                setIsDemoMode(true);
                setIsLoading(false);
            }
        };

        loadMap();
    }, []);

    const handleConfirm = () => {
        if (isDemoMode) {
            // En modo demo devolvemos una ubicación fija simulada
            onLocationSelected(-34.6037, -58.3816, "Ubicación Simulada (Demo Mode), Buenos Aires");
            onClose();
            return;
        }

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
    
    // Manejar click en la imagen de mapa falso
    const handleDemoMapClick = (e: React.MouseEvent<HTMLDivElement>) => {
        const rect = e.currentTarget.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        setDemoMarkerPosition({ x, y });
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-60 z-[70] flex justify-center items-center">
            <div className="bg-white rounded-lg shadow-xl w-full max-w-3xl h-[80vh] flex flex-col m-4 overflow-hidden relative">
                <div className="p-4 border-b border-slate-200 flex justify-between items-center bg-slate-50">
                    <h3 className="font-bold text-slate-800">Seleccionar Ubicación {isDemoMode && <span className="text-amber-600 bg-amber-100 text-xs px-2 py-0.5 rounded ml-2">MODO DEMO</span>}</h3>
                    <button onClick={onClose} className="text-slate-400 hover:text-slate-600">✕</button>
                </div>

                <div className="flex-1 relative bg-slate-100 overflow-hidden">
                    {isLoading && (
                        <div className="absolute inset-0 flex items-center justify-center z-10 bg-slate-50">
                            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-sky-600"></div>
                        </div>
                    )}
                    
                    {isDemoMode ? (
                        <div 
                            className="w-full h-full bg-cover bg-center relative cursor-crosshair group"
                            style={{
                                backgroundImage: `url('https://upload.wikimedia.org/wikipedia/commons/thumb/b/bd/Google_Maps_Bremen.png/1200px-Google_Maps_Bremen.png')`,
                            }}
                            onClick={handleDemoMapClick}
                        >
                            <div className="absolute top-4 left-1/2 transform -translate-x-1/2 bg-white/90 backdrop-blur px-4 py-2 rounded-full shadow-lg border border-slate-200 text-xs font-bold text-slate-600 z-10">
                                Haz clic en cualquier lugar para simular una ubicación
                            </div>

                            {demoMarkerPosition && (
                                <div 
                                    className="absolute transform -translate-x-1/2 -translate-y-full text-4xl drop-shadow-md transition-all duration-200"
                                    style={{ left: demoMarkerPosition.x, top: demoMarkerPosition.y }}
                                >
                                    📍
                                </div>
                            )}
                        </div>
                    ) : (
                        <div ref={mapRef} className="w-full h-full" />
                    )}
                </div>

                <div className="p-4 border-t border-slate-200 flex justify-between items-center bg-white">
                    <p className="text-xs text-slate-500 hidden sm:block">
                        {isDemoMode ? 'Simulación: El mapa real requiere configuración de API.' : 'Arrastra el marcador o haz clic en el mapa.'}
                    </p>
                    <div className="flex gap-2">
                        <button onClick={onClose} className="px-4 py-2 text-sm border rounded hover:bg-slate-50">Cancelar</button>
                        <button 
                            onClick={handleConfirm} 
                            disabled={!isDemoMode && !markerInstance} 
                            className="px-6 py-2 text-sm bg-sky-600 text-white rounded font-bold hover:bg-sky-700 disabled:opacity-50"
                        >
                            Confirmar Ubicación
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default LocationPickerModal;
