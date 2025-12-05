import React, { useState, useEffect } from 'react';
import { getApiConfig, saveApiConfig } from '../services/googleCalendarService';

interface ApiSettingsModalProps {
    onClose: () => void;
    onSaved: () => void;
}

const ApiSettingsModal: React.FC<ApiSettingsModalProps> = ({ onClose, onSaved }) => {
    const [clientId, setClientId] = useState('');
    const [apiKey, setApiKey] = useState('');
    const [showHelp, setShowHelp] = useState(true); 
    const [currentOrigin, setCurrentOrigin] = useState('');

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
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg p-6 m-4 max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
                <div className="flex justify-between items-center mb-6 border-b border-slate-100 pb-4">
                    <h2 className="text-xl font-bold text-slate-800 flex items-center">
                        <span className="text-2xl mr-2">⚙️</span> Configuración Google API
                    </h2>
                    <button onClick={onClose} className="text-slate-400 hover:text-slate-600">✕</button>
                </div>

                {/* SOLUCIÓN ERROR 403 - USUARIOS DE PRUEBA */}
                <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 mb-4">
                    <h3 className="text-sm font-bold text-amber-800 mb-2 flex items-center">
                        <span className="mr-2">🛑</span> ¿Sigue el Error 403?
                    </h3>
                    <p className="text-xs text-amber-900 mb-2 leading-relaxed">
                        Si la API está habilitada pero sigues viendo error 403, es porque tu proyecto está en modo <strong>"Testing"</strong>.
                        Debes agregar tu email (el que usas para loguearte) a la lista de "Test Users".
                    </p>
                    <a 
                        href="https://console.cloud.google.com/apis/credentials/consent" 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="block w-full text-center bg-white text-amber-700 border border-amber-300 px-3 py-2 rounded text-xs font-bold hover:bg-amber-100 shadow-sm"
                    >
                        1. Ir a Pantalla de Consentimiento OAuth &rarr;
                    </a>
                    <div className="mt-2 text-xs text-amber-800">
                        2. Baja hasta <strong>"Test users"</strong> &rarr; Click <strong>"+ ADD USERS"</strong> &rarr; Escribe tu email.
                    </div>
                </div>

                <div className="bg-slate-50 border border-slate-200 rounded-lg p-4 mb-6">
                    <h3 className="text-sm font-bold text-slate-700 mb-2 flex items-center">
                        Validación de Origen
                    </h3>
                    <div className="mb-2">
                        <label className="text-xs font-bold text-slate-500 uppercase">Tu URL (Pegar en Google Cloud - Client ID):</label>
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