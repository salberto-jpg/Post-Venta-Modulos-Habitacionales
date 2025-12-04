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
    const [photoPreviews, setPhotoPreviews] = useState<string[]>([]);
    const [clients, setClients] = useState<Client[]>([]);
    const [modules, setModules] = useState<Module[]>([]);
    const [isLoading, setIsLoading] = useState(false);

    useEffect(() => { getAllClients().then(setClients); }, []);
    useEffect(() => { if (selectedClientId) getModulesByClientId(selectedClientId).then(setModules); }, [selectedClientId]);

    const handleFilesSelected = (files: File[]) => {
        files.forEach(file => { const r = new FileReader(); r.onloadend = () => setPhotoPreviews(prev => [...prev, r.result as string]); r.readAsDataURL(file); });
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault(); setIsLoading(true);
        try { await createTicket({ title, description, clientId: selectedClientId, moduleId: selectedModuleId, priority, photos: photoPreviews }); onTicketAdded(); onClose(); } catch (e) { console.error(e); } finally { setIsLoading(false); }
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-60 z-50 flex justify-center items-center" onClick={onClose}>
            <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl p-6" onClick={e => e.stopPropagation()}>
                <h2 className="text-2xl font-bold mb-4">Nuevo Ticket</h2>
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                        <select value={selectedClientId} onChange={e => setSelectedClientId(e.target.value)} className="border p-2 rounded w-full" required><option value="">Cliente</option>{clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}</select>
                        <select value={selectedModuleId} onChange={e => setSelectedModuleId(e.target.value)} className="border p-2 rounded w-full" required disabled={!selectedClientId}><option value="">Módulo</option>{modules.map(m => <option key={m.id} value={m.id}>{m.modelName} - {m.serialNumber}</option>)}</select>
                    </div>
                    <input type="text" placeholder="Título" value={title} onChange={e => setTitle(e.target.value)} className="border p-2 rounded w-full" required />
                    <select value={priority} onChange={e => setPriority(e.target.value as Priority)} className="border p-2 rounded w-full"><option value="Baja">Baja</option><option value="Media">Media</option><option value="Alta">Alta</option></select>
                    <textarea placeholder="Descripción" value={description} onChange={e => setDescription(e.target.value)} rows={4} className="border p-2 rounded w-full" required />
                    <FileDropzone onFilesSelected={handleFilesSelected} accept={{ 'image/*': [] }} maxFiles={5} />
                    <div className="flex justify-end gap-2 pt-4"><button type="button" onClick={onClose} className="px-4 py-2 border rounded">Cancelar</button><button type="submit" disabled={isLoading} className="px-4 py-2 bg-sky-600 text-white rounded">{isLoading ? <Spinner /> : 'Crear'}</button></div>
                </form>
            </div>
        </div>
    );
};
export default AddTicketModal;