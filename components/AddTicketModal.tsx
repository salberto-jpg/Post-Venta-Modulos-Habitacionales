import React, { useState, useEffect } from 'react';
import { createTicket, getAllClients, getModulesByClientId } from '../services/supabaseService';
import { type Client, type Module, Priority } from '../types';
import Spinner from './Spinner';
import FileDropzone from './FileDropzone';

interface AddTicketModalProps { onClose: () => void; onTicketAdded: () => void; }

const AddTicketModal: React.FC<AddTicketModalProps> = ({ onClose, onTicketAdded }) => {
    const [title, setTitle] = useState('');
    const [description, setDescription] = useState('');
    const [selectedClientId, setSelectedClientId] = useState('');
    const [selectedModuleId, setSelectedModuleId] = useState('');
    const [priority, setPriority] = useState<Priority>(Priority.Medium);
    
    // Store original files for display info, and base64 for upload
    const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
    const [photoPreviews, setPhotoPreviews] = useState<string[]>([]);
    
    const [clients, setClients] = useState<Client[]>([]);
    const [modules, setModules] = useState<Module[]>([]);
    const [isLoading, setIsLoading] = useState(false);

    useEffect(() => { getAllClients().then(setClients); }, []);
    useEffect(() => { if (selectedClientId) getModulesByClientId(selectedClientId).then(setModules); }, [selectedClientId]);

    const handleFilesSelected = (files: File[]) => {
        // Add files to state
        setSelectedFiles(prev => [...prev, ...files]);

        // Create previews
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

    const formatBytes = (bytes: number) => {
        if (!+bytes) return '0 Bytes';
        const k = 1024;
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${['Bytes', 'KB', 'MB', 'GB'][i]}`;
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault(); setIsLoading(true);
        try { 
            // Note: In a real app we might upload files to storage here instead of sending base64
            // But preserving existing logic for now, just enhancing UX
            await createTicket({ title, description, clientId: selectedClientId, moduleId: selectedModuleId, priority, photos: photoPreviews }); 
            onTicketAdded(); 
            onClose(); 
        } catch (e) { console.error(e); } finally { setIsLoading(false); }
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-60 z-50 flex justify-center items-center" onClick={onClose}>
            <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl p-6 max-h-[90vh] flex flex-col" onClick={e => e.stopPropagation()}>
                <h2 className="text-2xl font-bold mb-4">Nuevo Ticket</h2>
                <form onSubmit={handleSubmit} className="space-y-4 flex-1 overflow-y-auto pr-2">
                    <div className="grid grid-cols-2 gap-4">
                        <select value={selectedClientId} onChange={e => setSelectedClientId(e.target.value)} className="border p-2 rounded w-full" required><option value="">Cliente</option>{clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}</select>
                        <select value={selectedModuleId} onChange={e => setSelectedModuleId(e.target.value)} className="border p-2 rounded w-full" required disabled={!selectedClientId}><option value="">Módulo</option>{modules.map(m => <option key={m.id} value={m.id}>{m.modelName} - {m.serialNumber}</option>)}</select>
                    </div>
                    <input type="text" placeholder="Título" value={title} onChange={e => setTitle(e.target.value)} className="border p-2 rounded w-full" required />
                    <select value={priority} onChange={e => setPriority(e.target.value as Priority)} className="border p-2 rounded w-full"><option value="Baja">Baja</option><option value="Media">Media</option><option value="Alta">Alta</option></select>
                    <textarea placeholder="Descripción" value={description} onChange={e => setDescription(e.target.value)} rows={4} className="border p-2 rounded w-full" required />
                    
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Fotos</label>
                        <FileDropzone onFilesSelected={handleFilesSelected} accept={{ 'image/*': [] }} maxFiles={5} />
                        
                        {/* Enhanced Photo Preview List */}
                        {selectedFiles.length > 0 && (
                            <div className="grid grid-cols-1 gap-2 mt-3">
                                {selectedFiles.map((file, index) => (
                                    <div key={index} className="flex items-center p-2 border border-slate-200 rounded-lg bg-slate-50 relative group">
                                        <img 
                                            src={photoPreviews[index]} 
                                            alt="Preview" 
                                            className="h-12 w-12 object-cover rounded border border-slate-300 mr-3"
                                        />
                                        <div className="flex-1 min-w-0">
                                            <p className="text-sm font-semibold text-slate-700 truncate">{file.name}</p>
                                            <p className="text-xs text-slate-500">{formatBytes(file.size)}</p>
                                        </div>
                                        <button 
                                            type="button"
                                            onClick={() => handleRemoveFile(index)}
                                            className="ml-2 bg-white text-slate-400 hover:text-red-500 p-1.5 rounded-full border border-slate-200 hover:border-red-200 shadow-sm transition-colors"
                                            title="Eliminar foto"
                                        >
                                            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                                                <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                                            </svg>
                                        </button>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    <div className="flex justify-end gap-2 pt-4"><button type="button" onClick={onClose} className="px-4 py-2 border rounded">Cancelar</button><button type="submit" disabled={isLoading} className="px-4 py-2 bg-sky-600 text-white rounded">{isLoading ? <Spinner /> : 'Crear'}</button></div>
                </form>
            </div>
        </div>
    );
};
export default AddTicketModal;