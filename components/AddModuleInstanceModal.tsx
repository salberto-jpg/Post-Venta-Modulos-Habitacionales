
import React, { useState, useEffect } from 'react';
import { getAllModuleTypes, addModuleToClient } from '../services/supabaseService';
import { type ModuleType } from '../types';
import Spinner from './Spinner';

interface AddModuleInstanceModalProps {
    clientId: string;
    onClose: () => void;
    onSuccess: () => void;
}

const AddModuleInstanceModal: React.FC<AddModuleInstanceModalProps> = ({ clientId, onClose, onSuccess }) => {
    const [moduleTypes, setModuleTypes] = useState<ModuleType[]>([]);
    const [selectedTypeId, setSelectedTypeId] = useState('');
    const [serialNumber, setSerialNumber] = useState('');
    const [installDate, setInstallDate] = useState('');
    const [loadingTypes, setLoadingTypes] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    
    // Geolocation
    const [latitude, setLatitude] = useState('');
    const [longitude, setLongitude] = useState('');
    const [isGettingLocation, setIsGettingLocation] = useState(false);
    const [geoError, setGeoError] = useState('');

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

    const handleGetLocation = () => {
        if (!navigator.geolocation) {
            setGeoError('Geolocalización no soportada');
            return;
        }
        setIsGettingLocation(true);
        navigator.geolocation.getCurrentPosition(
            (pos) => {
                setLatitude(pos.coords.latitude.toFixed(6));
                setLongitude(pos.coords.longitude.toFixed(6));
                setIsGettingLocation(false);
                setGeoError('');
            },
            (err) => {
                setGeoError('Error obteniendo ubicación');
                setIsGettingLocation(false);
            }
        );
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setSubmitting(true);
        try {
            await addModuleToClient(
                clientId, 
                selectedTypeId, 
                serialNumber, 
                installDate, 
                latitude ? parseFloat(latitude) : undefined, 
                longitude ? parseFloat(longitude) : undefined
            );
            onSuccess();
        } catch (error) {
            console.error(error);
            alert("Error al asociar módulo");
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-60 z-50 flex justify-center items-center" onClick={onClose}>
            <div className="bg-white rounded-lg shadow-xl w-full max-w-md mx-4 p-6" onClick={e => e.stopPropagation()}>
                <h2 className="text-xl font-bold text-slate-800 mb-4">Asociar Módulo al Cliente</h2>
                
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

                    <div className="pt-2 border-t border-slate-100 mt-2">
                        <label className="block text-sm font-medium text-slate-700 mb-2">Ubicación de Instalación</label>
                        <div className="flex space-x-2 mb-2">
                            <input 
                                type="text" 
                                placeholder="Lat" 
                                value={latitude} 
                                onChange={e => setLatitude(e.target.value)}
                                className="block w-1/2 px-3 py-2 text-sm bg-white border border-slate-300 rounded-md" 
                            />
                            <input 
                                type="text" 
                                placeholder="Lng" 
                                value={longitude} 
                                onChange={e => setLongitude(e.target.value)}
                                className="block w-1/2 px-3 py-2 text-sm bg-white border border-slate-300 rounded-md" 
                            />
                        </div>
                        <button 
                            type="button" 
                            onClick={handleGetLocation} 
                            className="text-xs text-sky-600 hover:text-sky-800 font-medium flex items-center"
                        >
                            <svg className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                            {isGettingLocation ? 'Obteniendo...' : 'Usar mi ubicación actual'}
                        </button>
                        {geoError && <p className="text-xs text-red-500 mt-1">{geoError}</p>}
                    </div>

                    <div className="flex justify-end space-x-3 pt-4 border-t border-slate-100 mt-4">
                        <button type="button" onClick={onClose} className="px-4 py-2 text-sm text-slate-700 hover:bg-slate-100 rounded-md">Cancelar</button>
                        <button type="submit" disabled={submitting} className="px-4 py-2 text-sm bg-sky-600 text-white rounded-md hover:bg-sky-700 disabled:opacity-50">
                            {submitting ? <Spinner /> : 'Registrar Módulo'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default AddModuleInstanceModal;
