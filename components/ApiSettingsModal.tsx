
import React, { useState, useEffect } from 'react';
import { getApiConfig, saveApiConfig } from '../services/googleCalendarService';

interface ApiSettingsModalProps {
    onClose: () => void;
    onSaved: () => void;
}

const ApiSettingsModal: React.FC<ApiSettingsModalProps> = ({ onClose, onSaved }) => {
    const [clientId, setClientId] = useState('');
    const [apiKey, setApiKey] = useState('');
    const [currentOrigin, setCurrentOrigin] = useState('');
    const [activeTab, setActiveTab] = useState<'config' | 'guide'>('config');

    useEffect(() => {
        const config = getApiConfig();
        setClientId(config.clientId);
        setApiKey(config.apiKey);
        if (typeof window !== 'undefined') {
            const origin = window.location.origin.replace(/\/$/, "");
            setCurrentOrigin(origin);
        }
    }, []);

    const handleSave = (e: React.FormEvent) => {
        e.preventDefault();
        saveApiConfig(clientId, apiKey);
        onSaved();
        onClose();
    };

    const isClientIdValid = !clientId || clientId.includes('.apps.googleusercontent.com');
    const isApiKeyValid = !apiKey || apiKey.startsWith('AIza');
    const isValid = clientId && apiKey && isClientIdValid && isApiKeyValid;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-60 z-[60] flex justify-center items-center" onClick={onClose}>
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl p-0 m-4 max-h-[90vh] overflow-hidden flex flex-col" onClick={e => e.stopPropagation()}>
                
                {/* Header */}
                <div className="bg-slate-50 border-b border-slate-200 p-5 flex justify-between items-center">
                    <h2 className="text-xl font-black text-slate-800 flex items-center">
                        <span className="text-2xl mr-3">⚙️</span> Configuración de APIs
                    </h2>
                    <button onClick={onClose} className="text-slate-400 hover:text-slate-600 p-1 hover:bg-slate-200 rounded-full transition-colors">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>

                {/* Tabs */}
                <div className="flex border-b border-slate-200 bg-white px-6">
                    <button 
                        onClick={() => setActiveTab('config')}
                        className={`px-4 py-3 text-sm font-bold border-b-2 transition-colors ${activeTab === 'config' ? 'border-sky-600 text-sky-700' : 'border-transparent text-slate-500 hover:text-slate-700'}`}
                    >
                        Credenciales
                    </button>
                    <button 
                        onClick={() => setActiveTab('guide')}
                        className={`px-4 py-3 text-sm font-bold border-b-2 transition-colors flex items-center ${activeTab === 'guide' ? 'border-sky-600 text-sky-700' : 'border-transparent text-slate-500 hover:text-slate-700'}`}
                    >
                        <span className="bg-amber-100 text-amber-700 text-[10px] px-1.5 py-0.5 rounded-full mr-2">!</span>
                        Guía de Errores
                    </button>
                </div>

                <div className="p-6 overflow-y-auto bg-slate-50/50 flex-1">
                    
                    {activeTab === 'config' ? (
                        <form onSubmit={handleSave} className="space-y-6">
                            
                            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                                <div className="mb-2">
                                    <label className="text-xs font-bold text-blue-800 uppercase tracking-wider">Tu URL Autorizada:</label>
                                    <p className="text-xs text-blue-600 mb-2">Copia esto en "Orígenes de JavaScript autorizados" en tu consola de Google.</p>
                                    <div className="bg-white border border-blue-200 rounded p-2 flex justify-between items-center shadow-sm">
                                        <code className="text-xs font-mono text-slate-800 break-all select-all font-bold">{currentOrigin}</code>
                                        <button 
                                            type="button"
                                            onClick={() => navigator.clipboard.writeText(currentOrigin)}
                                            className="ml-2 text-xs bg-blue-100 hover:bg-blue-200 text-blue-700 px-3 py-1.5 rounded-md font-bold transition-colors shadow-sm shrink-0"
                                        >
                                            COPIAR
                                        </button>
                                    </div>
                                </div>
                            </div>

                            <div className="space-y-4">
                                <div>
                                    <label className="block text-sm font-bold text-slate-700 mb-1">Google Maps API Key</label>
                                    <input 
                                        type="text" 
                                        value={apiKey}
                                        onChange={e => setApiKey(e.target.value)}
                                        placeholder="Ej: AIzaSy..."
                                        className={`w-full border rounded-xl p-3 focus:ring-2 focus:ring-sky-500 focus:border-sky-500 text-sm font-mono text-slate-600 shadow-sm transition-all ${!isApiKeyValid ? 'border-red-300 bg-red-50 focus:ring-red-200' : 'border-slate-300'}`}
                                    />
                                    {!isApiKeyValid && apiKey && <p className="text-xs text-red-500 mt-1 font-medium">⚠️ Debe comenzar con "AIza"</p>}
                                    <p className="text-xs text-slate-400 mt-1">Usada para Mapas, Rutas y Búsqueda de Direcciones.</p>
                                </div>

                                <div>
                                    <label className="block text-sm font-bold text-slate-700 mb-1">Google OAuth Client ID</label>
                                    <input 
                                        type="text" 
                                        value={clientId}
                                        onChange={e => setClientId(e.target.value)}
                                        placeholder="Ej: 123456...apps.googleusercontent.com"
                                        className={`w-full border rounded-xl p-3 focus:ring-2 focus:ring-sky-500 focus:border-sky-500 text-sm font-mono text-slate-600 shadow-sm transition-all ${!isClientIdValid ? 'border-red-300 bg-red-50 focus:ring-red-200' : 'border-slate-300'}`}
                                    />
                                    {!isClientIdValid && clientId && <p className="text-xs text-red-500 mt-1 font-medium">⚠️ Debe terminar en .apps.googleusercontent.com</p>}
                                    <p className="text-xs text-slate-400 mt-1">Usada para sincronizar con Google Calendar.</p>
                                </div>
                            </div>

                            <div className="pt-4 border-t border-slate-200 flex justify-end gap-3">
                                <button type="button" onClick={onClose} className="px-5 py-2.5 text-slate-600 font-bold hover:bg-slate-100 rounded-xl transition-colors">Cancelar</button>
                                <button 
                                    type="submit" 
                                    disabled={!isValid}
                                    className="px-6 py-2.5 bg-sky-600 text-white font-bold rounded-xl hover:bg-sky-700 shadow-md hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed transition-all transform active:scale-95"
                                >
                                    Guardar Configuración
                                </button>
                            </div>
                        </form>
                    ) : (
                        <div className="space-y-6">
                            
                            {/* ERROR CRÍTICO MAPS */}
                            <div className="bg-white border-l-4 border-red-500 rounded-r-lg shadow-sm p-4">
                                <h3 className="text-sm font-bold text-red-800 flex items-center mb-2">
                                    <span className="mr-2">🚫</span> Error: "This API project is not authorized..."
                                </h3>
                                <p className="text-sm text-slate-600 mb-3">
                                    Este error ocurre porque no has habilitado las APIs necesarias en la consola de Google Cloud.
                                </p>
                                <div className="bg-slate-50 p-3 rounded border border-slate-200">
                                    <p className="text-xs font-bold text-slate-700 mb-2 uppercase tracking-wide">Solución: Habilita estas 3 APIs</p>
                                    <ul className="text-sm text-slate-700 space-y-2">
                                        <li className="flex items-center">
                                            <span className="w-4 h-4 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center text-[10px] mr-2 font-bold">1</span>
                                            <strong>Maps Embed API</strong> <span className="text-xs text-slate-400 ml-1">(Para ver el mapa en Tickets)</span>
                                        </li>
                                        <li className="flex items-center">
                                            <span className="w-4 h-4 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center text-[10px] mr-2 font-bold">2</span>
                                            <strong>Maps JavaScript API</strong> <span className="text-xs text-slate-400 ml-1">(Para seleccionar ubicación)</span>
                                        </li>
                                        <li className="flex items-center">
                                            <span className="w-4 h-4 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center text-[10px] mr-2 font-bold">3</span>
                                            <strong>Places API</strong> <span className="text-xs text-slate-400 ml-1">(Para buscar direcciones)</span>
                                        </li>
                                    </ul>
                                </div>
                                <div className="mt-3">
                                    <a href="https://console.cloud.google.com/apis/library" target="_blank" className="text-xs font-bold text-sky-600 hover:underline flex items-center">
                                        Ir a la Biblioteca de APIs de Google &rarr;
                                    </a>
                                </div>
                            </div>

                            {/* ERROR FACTURACIÓN */}
                            <div className="bg-white border-l-4 border-amber-500 rounded-r-lg shadow-sm p-4">
                                <h3 className="text-sm font-bold text-amber-800 flex items-center mb-1">
                                    <span className="mr-2">💳</span> Error: Mapa en Gris / "Development Purpose"
                                </h3>
                                <p className="text-xs text-slate-600">
                                    Google Maps requiere una cuenta de facturación vinculada al proyecto, incluso para usar el nivel gratuito. Asegúrate de haber agregado una tarjeta en Google Cloud Billing.
                                </p>
                            </div>

                            {/* ERROR CALENDAR */}
                            <div className="bg-white border-l-4 border-slate-500 rounded-r-lg shadow-sm p-4">
                                <h3 className="text-sm font-bold text-slate-800 flex items-center mb-1">
                                    <span className="mr-2">📅</span> Error: Calendario no conecta (403/400)
                                </h3>
                                <p className="text-xs text-slate-600 mb-2">
                                    1. Verifica que tu email esté agregado como "Test User" en la pantalla de consentimiento OAuth.<br/>
                                    2. Asegúrate de haber copiado la URL exacta (http vs https) en los orígenes autorizados.
                                </p>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default ApiSettingsModal;
