import React, { useState, useEffect } from 'react';
import { getAllModuleTypes, addModuleToClient, updateModule } from '../services/supabaseService';
import { getApiConfig } from '../services/googleCalendarService';
import { type ModuleType, type Module } from '../types';
import Spinner from './Spinner';
import LocationPickerModal from './LocationPickerModal';

interface AddModuleInstanceModalProps {
    clientId: string;
    onClose: () => void;
    onSuccess: () => void;
    moduleToEdit?: Module;
}

const AddModuleInstanceModal: React.FC<AddModuleInstanceModalProps> = ({ clientId, onClose, onSuccess, moduleToEdit }) => {
    const [moduleTypes, setModuleTypes] = useState<ModuleType[]>([]);
    const [selectedTypeId, setSelectedTypeId] = useState('');
    const [serialNumber, setSerialNumber] = useState('');
    const [installDate, setInstallDate] = useState('');
    const [loadingTypes, setLoadingTypes] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    
    // Geolocation & Address
    const [latitude, setLatitude] = useState('');
    const [longitude, setLongitude] = useState('');
    const [address, setAddress] = useState('');
    const [isGettingLocation, setIsGettingLocation] = useState(false);
    const [geoError, setGeoError] = useState('');
    
    // Map Picker
    const [showMapPicker, setShowMapPicker] = useState(false);

    useEffect(() => {
        const fetchTypes = async () => {
            try {
                const types = await getAllModuleTypes();
                setModuleTypes(types);
            } catch (e) {
                console.error(e);
            } finally {
                setLoadingTypes(false);
            }
        };
        fetchTypes();
    }, []);

    useEffect(() => {
        if (moduleToEdit) {
            setSelectedTypeId(moduleToEdit.moduleTypeId);
            setSerialNumber(moduleToEdit.serialNumber);
            setInstallDate(new Date(moduleToEdit.installationDate).toISOString().split('T')[0]);
            if (moduleToEdit.latitude) setLatitude(moduleToEdit.latitude.toString());
            if (moduleToEdit.longitude) setLongitude(moduleToEdit.longitude.toString());
            if (moduleToEdit.address) setAddress(moduleToEdit.address);
        }
    }, [moduleToEdit]);

    // Helper para cargar el script de Google Maps si no está presente
    const loadGoogleMapsScript = (apiKey: string): Promise<void> => {
        if (typeof window !== 'undefined' && window.google && window.google.maps) {
            return Promise.resolve();
        }
        return new Promise((resolve, reject) => {
            const scriptId = 'google-maps-script-loader';
            if (document.getElementById(scriptId)) {
                // Si ya se está cargando, esperar un poco (simple workaround) o simplemente resolver
                // En un caso real usaríamos un singleton de carga, pero esto funciona para este contexto
                setTimeout(resolve, 500); 
                return;
            }
            const script = document.createElement('script');
            script.id = scriptId;
            script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=places`;
            script.async = true;
            script.defer = true;
            script.onload = () => resolve();
            script.onerror = (e) => reject(e);
            document.body.appendChild(script);
        });
    };

    // Función para obtener dirección legible usando el Geocoder de la API JS (Evita CORS)
    const fetchAddressFromCoords = async (lat: number, lng: number) => {
        const { apiKey } = getApiConfig();
        if (!apiKey) return;

        try {
            await loadGoogleMapsScript(apiKey);
            
            const geocoder = new window.google.maps.Geocoder();
            geocoder.geocode({ location: { lat, lng } }, (results: any, status: any) => {
                if (status === 'OK' && results && results[0]) {
                    setAddress(results[0].formatted_address);
                    setGeoError(''); // Limpiar errores si tuvo éxito
                } else {
                    console.error("Geocoder failed due to: " + status);
                    // No mostramos error al usuario para no interrumpir, pero logueamos
                }
            });
        } catch (error) {
            console.error("Error loading Maps API or Geocoding:", error);
        }
    };

    const handleGetLocation = () => {
        if (!navigator.geolocation) {
            setGeoError('Geolocalización no soportada');
            return;
        }
        setIsGettingLocation(true);
        navigator.geolocation.getCurrentPosition(
            (pos) => {
                const lat = pos.coords.latitude;
                const lng = pos.coords.longitude;
                setLatitude(lat.toFixed(6));
                setLongitude(lng.toFixed(6));
                setIsGettingLocation(false);
                setGeoError('');
                
                // Auto-fetch address text
                fetchAddressFromCoords(lat, lng);
            },
            (err) => {
                console.error(err);
                setGeoError('Error obteniendo ubicación GPS. Verifique permisos.');
                setIsGettingLocation(false);
            }
        );
    };

    const handleMapSelection = (lat: number, lng: number, addr: string) => {
        setLatitude(lat.toFixed(6));
        setLongitude(lng.toFixed(6));
        setAddress(addr);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setSubmitting(true);
        try {
            if (moduleToEdit) {
                await updateModule(moduleToEdit.id, {
                    moduleTypeId: selectedTypeId,
                    serialNumber,
                    installationDate: installDate,
                    latitude: latitude ? parseFloat(latitude) : undefined, 
                    longitude: longitude ? parseFloat(longitude) : undefined,
                    address
                });
            } else {
                await addModuleToClient(
                    clientId, 
                    selectedTypeId, 
                    serialNumber, 
                    installDate, 
                    latitude ? parseFloat(latitude) : undefined, 
                    longitude ? parseFloat(longitude) : undefined,
                    address
                );
            }
            onSuccess();
        } catch (error) {
            console.error(error);
            alert("Error al guardar módulo");
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-60 z-50 flex justify-center items-center" onClick={onClose}>
            <div className="bg-white rounded-lg shadow-xl w-full max-w-md mx-4 p-6 overflow-y-auto max-h-[90vh]" onClick={e => e.stopPropagation()}>
                <h2 className="text-xl font-bold text-slate-800 mb-4">{moduleToEdit ? 'Editar Módulo' : 'Asociar Módulo al Cliente'}</h2>
                
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-slate-700">Modelo (Catálogo)</label>
                        <select 
                            value={selectedTypeId} 
                            onChange={e => setSelectedTypeId(e.target.value)}
                            className="mt-1 block w-full px-3 py-2 bg-white border border-slate-300 rounded-md shadow-sm"
                            required
                            disabled={loadingTypes}
                        >
                            <option value="">Seleccione un modelo...</option>
                            {moduleTypes.map(mt => (
                                <option key={mt.id} value={mt.id}>{mt.name}</option>
                            ))}
                        </select>
                    </div>

                    <div>
                        <label className="block text-sm font-bold text-slate-700">N° Serie / ID Trazabilidad (Único)</label>
                        <input 
                            type="text" 
                            value={serialNumber} 
                            onChange={e => setSerialNumber(e.target.value)}
                            className="mt-1 block w-full px-3 py-2 bg-white border border-slate-300 rounded-md shadow-sm"
                            required
                            placeholder="Ej: MOD-2023-001"
                        />
                        <p className="text-xs text-slate-500 mt-1">Este ID vincula la fabricación con el post-venta.</p>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-slate-700">Fecha de Instalación</label>
                        <input 
                            type="date" 
                            value={installDate} 
                            onChange={e => setInstallDate(e.target.value)}
                            className="mt-1 block w-full px-3 py-2 bg-white border border-slate-300 rounded-md shadow-sm"
                            required
                        />
                    </div>

                    <div className="pt-4 border-t border-slate-100 mt-2">
                        <label className="block text-sm font-bold text-slate-700 mb-2">Ubicación de Instalación</label>
                        
                        {/* Address Field */}
                        <div className="mb-3">
                            <label className="block text-xs font-medium text-slate-500 mb-1">Dirección / Descripción del Lugar</label>
                            <textarea
                                value={address}
                                onChange={e => setAddress(e.target.value)}
                                className="block w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-md shadow-sm focus:ring-sky-500 focus:border-sky-500"
                                placeholder="Ej: Calle 123, Barrio Norte (o autocompletar con GPS)"
                                rows={2}
                            />
                        </div>

                        <div className="flex space-x-2 mb-3">
                            <div className="w-1/2">
                                <label className="block text-xs text-slate-400 mb-1">Latitud</label>
                                <input 
                                    type="text" 
                                    placeholder="-34.60..." 
                                    value={latitude} 
                                    onChange={e => setLatitude(e.target.value)}
                                    className="block w-full px-3 py-2 text-sm bg-slate-50 border border-slate-300 rounded-md" 
                                />
                            </div>
                            <div className="w-1/2">
                                <label className="block text-xs text-slate-400 mb-1">Longitud</label>
                                <input 
                                    type="text" 
                                    placeholder="-58.38..." 
                                    value={longitude} 
                                    onChange={e => setLongitude(e.target.value)}
                                    className="block w-full px-3 py-2 text-sm bg-slate-50 border border-slate-300 rounded-md" 
                                />
                            </div>
                        </div>

                        <div className="flex flex-col gap-2">
                            <button 
                                type="button" 
                                onClick={handleGetLocation} 
                                className="w-full flex items-center justify-center px-4 py-2 border border-sky-200 bg-sky-50 text-sky-700 rounded-md hover:bg-sky-100 transition-colors text-sm font-bold"
                            >
                                <svg className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                                {isGettingLocation ? 'Obteniendo GPS...' : 'Usar mi ubicación actual'}
                            </button>
                            
                            <button 
                                type="button" 
                                onClick={() => setShowMapPicker(true)} 
                                className="w-full flex items-center justify-center px-4 py-2 border border-slate-300 bg-white text-slate-700 rounded-md hover:bg-slate-50 transition-colors text-sm font-medium"
                            >
                                <svg className="h-5 w-5 mr-2 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" /></svg>
                                Seleccionar en Mapa
                            </button>
                        </div>
                        {geoError && <p className="text-xs text-red-500 mt-2 text-center">{geoError}</p>}
                    </div>

                    <div className="flex justify-end space-x-3 pt-4 border-t border-slate-100 mt-4">
                        <button type="button" onClick={onClose} className="px-4 py-2 text-sm text-slate-700 hover:bg-slate-100 rounded-md">Cancelar</button>
                        <button type="submit" disabled={submitting} className="px-4 py-2 text-sm bg-sky-600 text-white rounded-md hover:bg-sky-700 disabled:opacity-50 font-bold shadow-sm">
                            {submitting ? <Spinner /> : (moduleToEdit ? 'Guardar Cambios' : 'Registrar Módulo')}
                        </button>
                    </div>
                </form>
            </div>
            
            {showMapPicker && (
                <LocationPickerModal 
                    onClose={() => setShowMapPicker(false)}
                    onLocationSelected={handleMapSelection}
                    initialLat={latitude ? parseFloat(latitude) : undefined}
                    initialLng={longitude ? parseFloat(longitude) : undefined}
                />
            )}
        </div>
    );
};

export default AddModuleInstanceModal;