
import React, { useState, useEffect } from 'react';
import { createTicket, getAllClients, getModulesByClientId } from '../services/supabaseService';
import { type Client, type Module, Priority } from '../types';
import Spinner from './Spinner';
import FileDropzone from './FileDropzone';

interface AddTicketModalProps {
    onClose: () => void;
    onTicketAdded: () => void;
}

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
    const [isClientsLoading, setIsClientsLoading] = useState(true);
    const [isModulesLoading, setIsModulesLoading] = useState(false);
    const [error, setError] = useState('');

    useEffect(() => {
        const fetchClients = async () => {
            setIsClientsLoading(true);
            try {
                const clientData = await getAllClients();
                setClients(clientData);
            } catch (err) {
                setError('No se pudieron cargar los clientes.');
            } finally {
                setIsClientsLoading(false);
            }
        };
        fetchClients();
    }, []);

    useEffect(() => {
        if (!selectedClientId) {
            setModules([]);
            setSelectedModuleId('');
            return;
        }

        const fetchModules = async () => {
            setIsModulesLoading(true);
            try {
                const moduleData = await getModulesByClientId(selectedClientId);
                setModules(moduleData);
            } catch (err) {
                 setError('No se pudieron cargar los módulos para este cliente.');
            } finally {
                setIsModulesLoading(false);
            }
        };
        fetchModules();
    }, [selectedClientId]);

    const handleFilesSelected = (files: File[]) => {
        files.forEach(file => {
            const reader = new FileReader();
            reader.onloadend = () => {
                setPhotoPreviews(prevPreviews => [...prevPreviews, reader.result as string]);
            };
            reader.readAsDataURL(file);
        });
    };

    const handleRemovePhoto = (indexToRemove: number) => {
        setPhotoPreviews(previews => previews.filter((_, index) => index !== indexToRemove));
    };


    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!title || !description || !selectedClientId || !selectedModuleId) {
            setError('Por favor, completa todos los campos requeridos.');
            return;
        }
        setError('');
        setIsLoading(true);

        try {
            await createTicket({
                title,
                description,
                clientId: selectedClientId,
                moduleId: selectedModuleId,
                priority,
                photos: photoPreviews,
            });
            onTicketAdded();
            onClose();
        } catch (err) {
            setError('Hubo un error al crear el ticket. Inténtalo de nuevo.');
            console.error(err);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-60 z-50 flex justify-center items-center" onClick={onClose}>
            <div className="bg-gradient-to-b from-slate-50 to-slate-100 rounded-lg shadow-xl w-full max-w-2xl mx-4 my-8 overflow-hidden border border-slate-300" onClick={e => e.stopPropagation()}>
                <form onSubmit={handleSubmit}>
                    <div className="p-6 border-b border-slate-200">
                        <div className="flex justify-between items-start">
                            <h2 className="text-2xl font-bold text-slate-800">Crear Nuevo Ticket</h2>
                            <button type="button" onClick={onClose} className="text-slate-400 hover:text-slate-600">
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                                </svg>
                            </button>
                        </div>
                    </div>

                    <div className="p-6 max-h-[60vh] overflow-y-auto space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                             <div>
                                <label htmlFor="client" className="block text-sm font-medium text-slate-600">Cliente</label>
                                <select id="client" value={selectedClientId} onChange={e => setSelectedClientId(e.target.value)} disabled={isClientsLoading} className="mt-1 block w-full px-3 py-2 bg-white border border-slate-300 rounded-md shadow-sm focus:outline-none focus:ring-sky-500 focus:border-sky-500" required>
                                    <option value="" disabled>{isClientsLoading ? 'Cargando clientes...' : 'Selecciona un cliente'}</option>
                                    {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                                </select>
                            </div>

                             <div>
                                <label htmlFor="module" className="block text-sm font-medium text-slate-600">Módulo (Serial)</label>
                                <select id="module" value={selectedModuleId} onChange={e => setSelectedModuleId(e.target.value)} disabled={!selectedClientId || isModulesLoading} className="mt-1 block w-full px-3 py-2 bg-white border border-slate-300 rounded-md shadow-sm focus:outline-none focus:ring-sky-500 focus:border-sky-500 disabled:bg-slate-100" required>
                                    <option value="" disabled>{isModulesLoading ? 'Cargando módulos...' : (selectedClientId ? 'Selecciona un módulo' : 'Primero selecciona un cliente')}</option>
                                    {modules.map(m => <option key={m.id} value={m.id}>{m.modelName} - {m.serialNumber}</option>)}
                                </select>
                            </div>
                        </div>
                        
                        <div>
                            <label htmlFor="title" className="block text-sm font-medium text-slate-600">Título del Ticket</label>
                            <input type="text" id="title" value={title} onChange={e => setTitle(e.target.value)} className="mt-1 block w-full px-3 py-2 bg-white border border-slate-300 rounded-md shadow-sm focus:outline-none focus:ring-sky-500 focus:border-sky-500" required />
                        </div>

                         <div>
                            <label htmlFor="priority" className="block text-sm font-medium text-slate-600">Prioridad</label>
                            <select id="priority" value={priority} onChange={e => setPriority(e.target.value as Priority)} className="mt-1 block w-full px-3 py-2 bg-white border border-slate-300 rounded-md shadow-sm focus:outline-none focus:ring-sky-500 focus:border-sky-500" required>
                                {Object.values(Priority).map(p => <option key={p} value={p}>{p}</option>)}
                            </select>
                        </div>
                        
                        <div>
                            <label htmlFor="description" className="block text-sm font-medium text-slate-600">Descripción del Problema</label>
                            <textarea id="description" value={description} onChange={e => setDescription(e.target.value)} rows={4} className="mt-1 block w-full px-3 py-2 bg-white border border-slate-300 rounded-md shadow-sm focus:outline-none focus:ring-sky-500 focus:border-sky-500" required />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-slate-600">Fotos</label>
                            <div className="mt-1">
                                <FileDropzone 
                                    onFilesSelected={handleFilesSelected}
                                    accept={{ 'image/*': [] }}
                                    maxFiles={5}
                                    multiple={true}
                                />
                            </div>
                            {photoPreviews.length > 0 && (
                                <div className="mt-4 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                                    {photoPreviews.map((preview, index) => (
                                        <div key={index} className="relative group">
                                            <img src={preview} alt={`Preview ${index + 1}`} className="h-28 w-full object-cover rounded-md border border-slate-200" />
                                            <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-50 flex items-center justify-center transition-opacity">
                                                 <button
                                                    type="button"
                                                    onClick={() => handleRemovePhoto(index)}
                                                    className="h-8 w-8 bg-red-600 rounded-full flex items-center justify-center text-white opacity-0 group-hover:opacity-100 transform scale-75 group-hover:scale-100 transition-all"
                                                    aria-label="Remove image"
                                                >
                                                    <svg className="h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                                                        <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                                                    </svg>
                                                </button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>

                        {error && <p className="text-red-500 text-sm text-center">{error}</p>}
                    </div>

                    <div className="p-6 bg-slate-100 border-t border-slate-300 flex justify-end items-center space-x-3">
                        <button type="button" onClick={onClose} className="px-4 py-2 text-sm font-medium rounded-md bg-white text-slate-700 hover:bg-slate-50 border border-slate-300">
                            Cancelar
                        </button>
                        <button type="submit" disabled={isLoading} className="px-4 py-2 text-sm font-medium rounded-md bg-sky-600 text-white shadow-sm hover:bg-sky-700 disabled:bg-sky-400 disabled:cursor-not-allowed flex items-center">
                            {isLoading ? <Spinner /> : 'Crear Ticket'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default AddTicketModal;
