
import React, { useState, useEffect } from 'react';
import { createTicket, getAllClients, getModulesByClientId } from '../services/supabaseService';
import { type Client, type Module, Priority } from '../types';
import Spinner from './Spinner';
import FileDropzone from './FileDropzone';
import VoiceRecorder from './VoiceRecorder';

interface AddTicketModalProps { onClose: () => void; onTicketAdded: () => void; }

const AFFECTED_PARTS = [
    'Techo',
    'Laterales',
    'Instalación Eléctrica',
    'Instalación de Agua',
    'Cloacas',
    'Aberturas',
    'Pisos',
    'Mobiliario',
    'Otros'
];

const AddTicketModal: React.FC<AddTicketModalProps> = ({ onClose, onTicketAdded }) => {
    const [title, setTitle] = useState('');
    const [description, setDescription] = useState('');
    const [selectedClientId, setSelectedClientId] = useState('');
    const [selectedModuleId, setSelectedModuleId] = useState('');
    const [affectedPart, setAffectedPart] = useState('Otros');
    
    // Store original files for display info, and base64 for upload
    const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
    const [photoPreviews, setPhotoPreviews] = useState<string[]>([]);
    
    // Audio State
    const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
    
    const [clients, setClients] = useState<Client[]>([]);
    const [modules, setModules] = useState<Module[]>([]);
    const [selectedModule, setSelectedModule] = useState<Module | null>(null);
    const [isLoading, setIsLoading] = useState(false);

    useEffect(() => { getAllClients().then(setClients); }, []);
    
    useEffect(() => { 
        if (selectedClientId) {
            getModulesByClientId(selectedClientId).then(setModules); 
        } else {
            setModules([]);
        }
        setSelectedModuleId('');
        setSelectedModule(null);
    }, [selectedClientId]);

    const handleModuleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        const id = e.target.value;
        setSelectedModuleId(id);
        const mod = modules.find(m => m.id === id) || null;
        setSelectedModule(mod);
    };

    const handleFilesSelected = (files: File[]) => {
        setSelectedFiles(prev => [...prev, ...files]);
        files.forEach(file => { 
            const r = new FileReader(); 
            r.onloadend = () => setPhotoPreviews(prev => [...prev, r.result as string]); 
            r.readAsDataURL(file); 
        });
    };

    const handleRemoveFile = (index: number) => {
        setSelectedFiles(prev => prev.filter((_, i) => i !== index));
        setPhotoPreviews(prev => prev.filter((_, i) => i !== index));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault(); setIsLoading(true);
        try { 
            await createTicket({ 
                title, 
                description, 
                clientId: selectedClientId, 
                moduleId: selectedModuleId, 
                priority: Priority.Medium, 
                affectedPart: affectedPart,
                photos: photoPreviews 
            }, audioBlob || undefined); 
            onTicketAdded(); 
            onClose(); 
        } catch (e) { console.error(e); } finally { setIsLoading(false); }
    };

    return (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex justify-center items-center p-4 transition-opacity" onClick={onClose}>
            <div className="bg-white rounded-3xl shadow-2xl w-full max-w-2xl overflow-hidden transform transition-all border border-slate-100 flex flex-col max-h-[95vh]" onClick={e => e.stopPropagation()}>
                
                {/* Premium Header */}
                <div className="bg-slate-900 px-8 py-6 text-white shrink-0 relative overflow-hidden">
                    <div className="absolute top-0 right-0 p-4 opacity-10">
                        <svg className="w-32 h-32 text-white" fill="currentColor" viewBox="0 0 24 24"><path d="M20 2H4c-1.1 0-1.99.9-1.99 2L2 22l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm-7 9h-2V5h2v6zm0 4h-2v-2h2v2z"/></svg>
                    </div>
                    <h2 className="text-3xl font-black tracking-tight relative z-10">Nuevo Ticket</h2>
                    <p className="text-slate-400 text-sm font-medium mt-1 relative z-10">Reporte de incidente o solicitud de servicio</p>
                    <button onClick={onClose} className="absolute top-6 right-6 text-slate-400 hover:text-white transition-colors z-20">
                        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-8 space-y-6">
                    
                    {/* Selections Grid */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-1">
                            <label className="text-xs font-bold text-slate-500 uppercase tracking-wider ml-1">Cliente</label>
                            <div className="relative">
                                <select 
                                    value={selectedClientId} 
                                    onChange={e => setSelectedClientId(e.target.value)} 
                                    className="w-full bg-slate-50 border border-slate-200 text-slate-800 font-medium rounded-xl px-4 py-3 appearance-none focus:outline-none focus:ring-2 focus:ring-sky-500 transition-shadow cursor-pointer"
                                    required
                                >
                                    <option value="">Seleccionar Cliente...</option>
                                    {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                                </select>
                                <ChevronDown className="absolute right-4 top-4 text-slate-400 pointer-events-none w-5 h-5" />
                            </div>
                        </div>

                        <div className="space-y-1">
                            <label className="text-xs font-bold text-slate-500 uppercase tracking-wider ml-1">Módulo</label>
                            <div className="relative">
                                <select 
                                    value={selectedModuleId} 
                                    onChange={handleModuleChange} 
                                    className="w-full bg-slate-50 border border-slate-200 text-slate-800 font-medium rounded-xl px-4 py-3 appearance-none focus:outline-none focus:ring-2 focus:ring-sky-500 transition-shadow disabled:opacity-50 cursor-pointer"
                                    required 
                                    disabled={!selectedClientId}
                                >
                                    <option value="">Seleccionar Módulo...</option>
                                    {modules.map(m => <option key={m.id} value={m.id}>{m.modelName} - {m.serialNumber}</option>)}
                                </select>
                                <ChevronDown className="absolute right-4 top-4 text-slate-400 pointer-events-none w-5 h-5" />
                            </div>
                        </div>
                    </div>

                    {/* Location Feedback Pill */}
                    {selectedModule && (
                        <div className={`rounded-lg px-4 py-2 flex items-center text-sm font-medium ${selectedModule.latitude ? 'bg-emerald-50 text-emerald-700 border border-emerald-100' : 'bg-amber-50 text-amber-700 border border-amber-100'}`}>
                            {selectedModule.latitude ? '📍 Ubicación GPS vinculada al módulo.' : '⚠️ Este módulo no tiene GPS configurado.'}
                        </div>
                    )}

                    {/* Title & Part */}
                    <div className="grid grid-cols-3 gap-6">
                        <div className="col-span-2 space-y-1">
                            <label className="text-xs font-bold text-slate-500 uppercase tracking-wider ml-1">Asunto</label>
                            <input 
                                type="text" 
                                placeholder="Ej: Filtración en techo" 
                                value={title} 
                                onChange={e => setTitle(e.target.value)} 
                                className="w-full bg-slate-50 border border-slate-200 text-slate-800 font-bold rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-sky-500 transition-shadow" 
                                required 
                            />
                        </div>
                        <div className="space-y-1">
                            <label className="text-xs font-bold text-slate-500 uppercase tracking-wider ml-1">Parte Afectada</label>
                            <div className="relative">
                                <select 
                                    value={affectedPart} 
                                    onChange={e => setAffectedPart(e.target.value)} 
                                    className="w-full bg-slate-50 border border-slate-200 text-slate-700 font-medium rounded-xl px-4 py-3 appearance-none focus:outline-none focus:ring-2 focus:ring-sky-500 cursor-pointer"
                                >
                                    {AFFECTED_PARTS.map(part => <option key={part} value={part}>{part}</option>)}
                                </select>
                                <ChevronDown className="absolute right-4 top-4 text-slate-400 pointer-events-none w-5 h-5" />
                            </div>
                        </div>
                    </div>

                    {/* MAIN DESCRIPTION CARD WITH INTEGRATED VOICE */}
                    <div className="space-y-1">
                        <label className="text-xs font-bold text-slate-500 uppercase tracking-wider ml-1">Descripción y Detalles</label>
                        
                        <div className="bg-slate-50 border border-slate-200 rounded-2xl p-2 focus-within:ring-2 focus-within:ring-sky-500 focus-within:bg-white transition-all shadow-sm relative group">
                            
                            <textarea 
                                placeholder="Describe el problema en detalle..." 
                                value={description} 
                                onChange={e => setDescription(e.target.value)} 
                                rows={5} 
                                className="w-full bg-transparent border-none focus:ring-0 p-3 text-slate-700 leading-relaxed resize-none placeholder-slate-400" 
                                required 
                            />
                            
                            <div className="border-t border-slate-200/60 pt-2 px-2 flex justify-between items-center bg-white/50 rounded-b-xl">
                                <div className="text-xs text-slate-400 font-medium pl-2">
                                    {description.length > 0 ? `${description.length} caracteres` : 'Escribe o graba un audio'}
                                </div>
                                
                                {/* THE BIG MICROPHONE INTEGRATION */}
                                <div className="flex-shrink-0">
                                    <VoiceRecorder 
                                        onAudioRecorded={setAudioBlob} 
                                        onDelete={() => setAudioBlob(null)}
                                        variant="large" 
                                    />
                                </div>
                            </div>
                        </div>
                    </div>
                    
                    {/* Photos */}
                    <div className="space-y-2">
                        <label className="text-xs font-bold text-slate-500 uppercase tracking-wider ml-1">Evidencia Fotográfica</label>
                        <FileDropzone onFilesSelected={handleFilesSelected} accept={{ 'image/*': [] }} maxFiles={5} />
                        
                        {selectedFiles.length > 0 && (
                            <div className="grid grid-cols-4 gap-3 mt-3">
                                {selectedFiles.map((file, index) => (
                                    <div key={index} className="relative group aspect-square rounded-xl overflow-hidden border border-slate-200 shadow-sm">
                                        <img src={photoPreviews[index]} alt="Preview" className="w-full h-full object-cover" />
                                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                            <button 
                                                type="button"
                                                onClick={() => handleRemoveFile(index)}
                                                className="bg-white text-red-500 p-2 rounded-full shadow-lg hover:bg-red-50 transition-transform hover:scale-110"
                                            >
                                                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                </form>

                {/* Footer Actions */}
                <div className="p-6 bg-slate-50 border-t border-slate-200 flex justify-end gap-3 shrink-0">
                    <button type="button" onClick={onClose} className="px-6 py-3 rounded-xl font-bold text-slate-500 hover:text-slate-800 hover:bg-slate-200 transition-colors">Cancelar</button>
                    <button 
                        onClick={handleSubmit as any} 
                        disabled={isLoading} 
                        className="px-8 py-3 bg-sky-600 text-white rounded-xl font-bold shadow-lg hover:bg-sky-500 hover:shadow-sky-200/50 transition-all transform active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
                    >
                        {isLoading ? <Spinner /> : 'Crear Ticket'}
                    </button>
                </div>
            </div>
        </div>
    );
};

const ChevronDown: React.FC<{ className?: string }> = ({ className }) => (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
    </svg>
);

export default AddTicketModal;
