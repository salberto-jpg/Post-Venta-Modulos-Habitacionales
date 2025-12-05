import React, { useState, useEffect } from 'react';
import { getApiConfig, saveApiConfig } from '../services/googleCalendarService';

interface ApiSettingsModalProps {
    onClose: () => void;
    onSaved: () => void;
}

const ApiSettingsModal: React.FC<ApiSettingsModalProps> = ({ onClose, onSaved }) => {
    const [clientId, setClientId] = useState('');
    const [apiKey, setApiKey] = useState('');
    const [showHelp, setShowHelp] = useState(true); // Default to open for help
    const [currentOrigin, setCurrentOrigin] = useState('');

    useEffect(() => {
        const config = getApiConfig();
        setClientId(config.clientId);
        setApiKey(config.apiKey);
        if (typeof window !== 'undefined') {
            // Remove trailing slash if present for consistency
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

    // Validations
    const isClientIdValid = !clientId || clientId.includes('.apps.googleusercontent.com');
    const isApiKeyValid = !apiKey || apiKey.startsWith('AIza');
    const isValid = clientId && apiKey && isClientIdValid && isApiKeyValid;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-60 z-[60] flex justify-center items-center" onClick={onClose}>
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg p-6 m-4 max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
                <div className="flex justify-between items-center mb-6 border-b border-slate-100 pb-4">
                    <h2 className="text-xl font-bold text-slate-800 flex items-center">
                        <span className="text-2xl mr-2">⚙️</span> Configuración Google API
                    </h2>
                    <button onClick={onClose} className="text-slate-400 hover:text-slate-600">✕</button>
                </div>

                {/* Error 403 / API no habilitada */}
                <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 mb-4">
                    <h3 className="text-sm font-bold text-amber-800 mb-2 flex items-center">
                        <span className="mr-2">🔌</span> Paso Crucial: Habilitar API
                    </h3>
                    <p className="text-xs text-amber-800 mb-2">
                        Si ves un <strong>Error 403</strong>, es porque falta "encender" el servicio de Calendario.
                    </p>
                    <a 
                        href="https://console.cloud.google.com/apis/library/calendar-json.googleapis.com" 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="inline-block bg-white text-amber-700 border border-amber-300 px-3 py-1.5 rounded text-xs font-bold hover:bg-amber-50"
                    >
                        Click aquí para habilitar Google Calendar API →
                    </a>
                </div>

                {/* Error 400 / Origen */}
                <div className="bg-slate-50 border border-slate-200 rounded-lg p-4 mb-6">
                    <h3 className="text-sm font-bold text-slate-700 mb-2 flex items-center">
                        <svg className="w-4 h-4 mr-1 text-slate-500" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" /></svg>
                        Validación de Origen (Error 400)
                    </h3>
                    <div className="mb-2">
                        <label className="text-xs font-bold text-slate-500 uppercase">Tu URL actual (Pegar en Google Cloud):</label>
                        <div className="bg-white border border-slate-300 rounded p-2 flex justify-between items-center mt-1">
                            <code className="text-xs font-mono text-slate-800 break-all select-all font-bold">{currentOrigin}</code>
                            <button 
                                onClick={() => navigator.clipboard.writeText(currentOrigin)}
                                className="ml-2 text-xs bg-slate-100 hover:bg-slate-200 text-slate-700 px-2 py-1 rounded font-bold transition-colors shadow-sm shrink-0"
                            >
                                COPIAR
                            </button>
                        </div>
                    </div>
                </div>

                <form onSubmit={handleSave} className="space-y-5">
                    <div>
                        <label className="block text-sm font-bold text-slate-700 mb-1">Google Cloud Client ID</label>
                        <input 
                            type="text" 
                            value={clientId}
                            onChange={e => setClientId(e.target.value)}
                            placeholder="Ej: 123456...apps.googleusercontent.com"
                            className={`w-full border rounded-lg p-2.5 focus:ring-2 focus:ring-sky-500 text-sm font-mono text-slate-600 ${!isClientIdValid ? 'border-red-500 bg-red-50' : 'border-slate-300'}`}
                        />
                        {!isClientIdValid && <p className="text-xs text-red-500 mt-1">⚠️ Debe terminar en .apps.googleusercontent.com</p>}
                    </div>
                    
                    <div>
                        <label className="block text-sm font-bold text-slate-700 mb-1">Google Cloud API Key</label>
                        <input 
                            type="text" 
                            value={apiKey}
                            onChange={e => setApiKey(e.target.value)}
                            placeholder="Ej: AIzaSy..."
                            className={`w-full border rounded-lg p-2.5 focus:ring-2 focus:ring-sky-500 text-sm font-mono text-slate-600 ${!isApiKeyValid ? 'border-red-500 bg-red-50' : 'border-slate-300'}`}
                        />
                         {!isApiKeyValid && <p className="text-xs text-red-500 mt-1">⚠️ Generalmente empieza con "AIza"</p>}
                    </div>

                    <div className="bg-blue-50 p-4 rounded-lg text-sm text-blue-800 border border-blue-100">
                        <button 
                            type="button" 
                            onClick={() => setShowHelp(!showHelp)}
                            className="font-bold underline mb-2 flex items-center w-full justify-between"
                        >
                            <span>▶ Pasos para configurar</span>
                            <span className="text-xs">{showHelp ? 'Ocultar' : 'Mostrar'}</span>
                        </button>
                        
                        {showHelp && (
                            <ul className="list-decimal list-inside space-y-2 text-xs mt-2 ml-1 text-blue-900">
                                <li>Ve a <a href="https://console.cloud.google.com/" target="_blank" className="underline font-bold">Google Cloud Console</a>.</li>
                                <li><strong>Habilita la API:</strong> Busca "Google Calendar API" y dale a "Enable".</li>
                                <li>Entra en <strong>Credenciales</strong>.</li>
                                <li>Crea una API Key y un Client ID (OAuth).</li>
                                <li>En el Client ID, pega la URL de arriba en "Orígenes autorizados de JavaScript".</li>
                                <li>En "Pantalla de consentimiento OAuth", añade tu email en "Test Users".</li>
                            </ul>
                        )}
                    </div>

                    <div className="flex justify-end gap-3 pt-2">
                        <button type="button" onClick={onClose} className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg">Cancelar</button>
                        <button 
                            type="submit" 
                            disabled={!isValid}
                            className="px-6 py-2 bg-sky-600 text-white font-bold rounded-lg hover:bg-sky-700 shadow-md disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            Guardar y Reintentar
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default ApiSettingsModal;