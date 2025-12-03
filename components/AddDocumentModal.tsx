
import React, { useState, useEffect } from 'react';
import { createDocument, getAllModuleTypes, getAllClients } from '../services/supabaseService';
import { type ModuleType, type Client, type Document } from '../types';
import Spinner from './Spinner';
import FileDropzone from './FileDropzone';

interface AddDocumentModalProps {
    onClose: () => void;
    onDocumentAdded: () => void;
}

const AddDocumentModal: React.FC<AddDocumentModalProps> = ({ onClose, onDocumentAdded }) => {
    const [uploadContext, setUploadContext] = useState<'moduleType' | 'client'>('moduleType');
    const [selectedTargetId, setSelectedTargetId] = useState('');
    const [documentType, setDocumentType] = useState<Document['type']>('manual');
    const [selectedFiles, setSelectedFiles] = useState<File[]>([]);

    const [moduleTypes, setModuleTypes] = useState<ModuleType[]>([]);
    const [clients, setClients] = useState<Client[]>([]);
    
    const [isLoading, setIsLoading] = useState(false);
    const [isDataLoading, setIsDataLoading] = useState(true);
    const [error, setError] = useState('');

    useEffect(() => {
        const fetchData = async () => {
            setIsDataLoading(true);
            try {
                const [moduleTypeData, clientData] = await Promise.all([
                    getAllModuleTypes(),
                    getAllClients()
                ]);
                setModuleTypes(moduleTypeData);
                setClients(clientData);
            } catch (err) {
                 setError('No se pudieron cargar los datos.');
            } finally {
                setIsDataLoading(false);
            }
        };
        fetchData();
    }, []);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedTargetId || !selectedFiles || selectedFiles.length === 0) {
            setError('Por favor, completa todos los campos.');
            return;
        }
        setError('');
        setIsLoading(true);

        try {
            const uploadPromises = selectedFiles.map((file: File) => 
                createDocument(selectedTargetId, uploadContext, documentType, file)
            );

            await Promise.all(uploadPromises);
            
            onDocumentAdded();
            onClose();
        } catch (err) {
            setError('Hubo un error al cargar los documentos.');
            console.error(err);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-60 z-50 flex justify-center items-center" onClick={onClose}>
            <div className="bg-white rounded-lg shadow-xl w-full max-w-lg p-6" onClick={e => e.stopPropagation()}>
                <h2 className="text-xl font-bold text-slate-800 mb-4">Cargar Documento</h2>
                
                <form onSubmit={handleSubmit} className="space-y-4">
                    
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Tipo de Asociación</label>
                        <div className="flex space-x-4 mb-2">
                            <label className="flex items-center cursor-pointer">
                                <input type="radio" name="context" value="moduleType" checked={uploadContext === 'moduleType'} onChange={() => { setUploadContext('moduleType'); setSelectedTargetId(''); }} className="mr-2" />
                                Modelo del Catálogo (Genérico)
                            </label>
                            <label className="flex items-center cursor-pointer">
                                <input type="radio" name="context" value="client" checked={uploadContext === 'client'} onChange={() => { setUploadContext('client'); setSelectedTargetId(''); }} className="mr-2" />
                                Cliente Específico (Contrato)
                            </label>
                        </div>
                        <p className="text-xs text-slate-500 mb-2">
                            {uploadContext === 'moduleType' 
                                ? 'Los documentos cargados al catálogo aparecerán automáticamente en el perfil de todos los clientes que tengan este modelo.' 
                                : 'Documentos privados exclusivos para un cliente.'}
                        </p>
                    </div>

                    {uploadContext === 'moduleType' ? (
                        <div>
                            <label className="block text-sm font-medium text-slate-600">Seleccionar Modelo del Catálogo</label>
                            <select value={selectedTargetId} onChange={e => setSelectedTargetId(e.target.value)} disabled={isDataLoading} className="mt-1 block w-full px-3 py-2 bg-white border border-slate-300 rounded-md shadow-sm" required>
                                <option value="">Seleccione un modelo...</option>
                                {moduleTypes.map(m => (
                                    <option key={m.id} value={m.id}>{m.name}</option>
                                ))}
                            </select>
                        </div>
                    ) : (
                        <div>
                            <label className="block text-sm font-medium text-slate-600">Seleccionar Cliente</label>
                            <select value={selectedTargetId} onChange={e => setSelectedTargetId(e.target.value)} disabled={isDataLoading} className="mt-1 block w-full px-3 py-2 bg-white border border-slate-300 rounded-md shadow-sm" required>
                                <option value="">Seleccione un cliente...</option>
                                {clients.map(c => (
                                    <option key={c.id} value={c.id}>{c.name}</option>
                                ))}
                            </select>
                        </div>
                    )}
                    
                    <div>
                        <label className="block text-sm font-medium text-slate-600">Tipo de Documento</label>
                        <select value={documentType} onChange={e => setDocumentType(e.target.value as Document['type'])} className="mt-1 block w-full px-3 py-2 bg-white border border-slate-300 rounded-md shadow-sm">
                            <option value="manual">Manual / Instructivo</option>
                            <option value="warranty">Garantía / Acta</option>
                            <option value="plan">Plano Técnico</option>
                            <option value="contract">Contrato</option>
                            <option value="other">Otro</option>
                        </select>
                    </div>
                    
                    <div>
                        <label className="block text-sm font-medium text-slate-600 mb-2">Archivos</label>
                        <FileDropzone 
                            onFilesSelected={(files) => setSelectedFiles(files)}
                            accept={{ 'application/pdf': [], 'image/*': [] }}
                            maxFiles={5}
                        />
                    </div>

                    {error && <p className="text-red-500 text-sm">{error}</p>}

                    <div className="flex justify-end space-x-3 pt-4">
                        <button type="button" onClick={onClose} className="px-4 py-2 text-sm text-slate-700 hover:bg-slate-100 rounded-md">Cancelar</button>
                        <button type="submit" disabled={isLoading} className="px-4 py-2 text-sm bg-sky-600 text-white rounded-md hover:bg-sky-700 disabled:opacity-50 flex items-center">
                            {isLoading ? <Spinner /> : 'Cargar'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default AddDocumentModal;
