
import React, { useState, useEffect } from 'react';
import { createDocument, getAllModulesPopulated } from '../services/supabaseService';
import { type Module, type Document } from '../types';
import Spinner from './Spinner';

interface AddDocumentModalProps {
    onClose: () => void;
    onDocumentAdded: () => void;
}

const AddDocumentModal: React.FC<AddDocumentModalProps> = ({ onClose, onDocumentAdded }) => {
    const [selectedModuleId, setSelectedModuleId] = useState('');
    const [documentType, setDocumentType] = useState<Document['type']>('manual');
    const [selectedFiles, setSelectedFiles] = useState<FileList | null>(null);

    const [modules, setModules] = useState<(Module & { clientName: string })[]>([]);
    
    const [isLoading, setIsLoading] = useState(false);
    const [isModulesLoading, setIsModulesLoading] = useState(true);
    const [error, setError] = useState('');

    useEffect(() => {
        const fetchModules = async () => {
            setIsModulesLoading(true);
            try {
                const moduleData = await getAllModulesPopulated();
                setModules(moduleData);
            } catch (err) {
                 setError('No se pudieron cargar los módulos.');
            } finally {
                setIsModulesLoading(false);
            }
        };
        fetchModules();
    }, []);

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files.length > 0) {
            setSelectedFiles(e.target.files);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedModuleId || !selectedFiles || selectedFiles.length === 0) {
            setError('Por favor, selecciona un módulo y al menos un archivo.');
            return;
        }
        setError('');
        setIsLoading(true);

        try {
            // Upload multiple files
            const uploadPromises = Array.from(selectedFiles).map((file: File) => 
                createDocument(selectedModuleId, 'module', documentType, file)
            );

            await Promise.all(uploadPromises);
            
            onDocumentAdded();
            onClose();
        } catch (err) {
            setError('Hubo un error al cargar los documentos. Inténtalo de nuevo.');
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
                            <h2 className="text-2xl font-bold text-slate-800">Cargar Documento a Módulo</h2>
                            <button type="button" onClick={onClose} className="text-slate-400 hover:text-slate-600">
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                                </svg>
                            </button>
                        </div>
                    </div>

                    <div className="p-6 max-h-[60vh] overflow-y-auto space-y-4">
                        <div className="bg-sky-50 border-l-4 border-sky-400 p-4 mb-4">
                            <p className="text-sm text-sky-700">
                                Sube documentos específicos (Actas, Fotos, Garantías firmadas) asociados a un módulo instalado.
                                Puedes subir múltiples archivos (PDF o Imágenes).
                            </p>
                        </div>

                         <div>
                            <label htmlFor="module" className="block text-sm font-medium text-slate-600">Seleccionar Módulo Instalado</label>
                            <select 
                                id="module" 
                                value={selectedModuleId} 
                                onChange={e => setSelectedModuleId(e.target.value)} 
                                disabled={isModulesLoading} 
                                className="mt-1 block w-full px-3 py-2 bg-white border border-slate-300 rounded-md shadow-sm focus:outline-none focus:ring-sky-500 focus:border-sky-500 disabled:bg-slate-100"
                                required
                            >
                                <option value="">{isModulesLoading ? 'Cargando módulos...' : 'Seleccione un módulo...'}</option>
                                {modules.map(m => (
                                    <option key={m.id} value={m.id}>
                                        {m.serialNumber} - {m.modelName} (Cliente: {m.clientName})
                                    </option>
                                ))}
                            </select>
                        </div>
                        
                        <div>
                            <label htmlFor="docType" className="block text-sm font-medium text-slate-600">Tipo de Documento</label>
                            <select id="docType" value={documentType} onChange={e => setDocumentType(e.target.value as Document['type'])} className="mt-1 block w-full px-3 py-2 bg-white border border-slate-300 rounded-md shadow-sm focus:outline-none focus:ring-sky-500 focus:border-sky-500" required>
                                <option value="contract">Contrato / Legal</option>
                                <option value="manual">Manual Específico</option>
                                <option value="warranty">Acta de Garantía</option>
                                <option value="other">Otro / Imagen</option>
                            </select>
                        </div>
                        
                        <div>
                            <label htmlFor="fileUpload" className="block text-sm font-medium text-slate-600">Archivos (PDF o Imágenes)</label>
                            <div className="mt-1 flex justify-center px-6 pt-5 pb-6 border-2 border-slate-300 border-dashed rounded-md bg-white hover:bg-slate-50 transition-colors">
                                <div className="space-y-1 text-center">
                                    <svg className="mx-auto h-12 w-12 text-slate-400" stroke="currentColor" fill="none" viewBox="0 0 48 48" aria-hidden="true">
                                        <path d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                                    </svg>
                                    <div className="flex text-sm text-slate-600 justify-center">
                                        <label htmlFor="file-upload" className="relative cursor-pointer rounded-md font-medium text-sky-600 hover:text-sky-500 focus-within:outline-none">
                                            <span>Seleccionar archivos</span>
                                            <input 
                                                id="file-upload" 
                                                name="file-upload" 
                                                type="file" 
                                                className="sr-only" 
                                                accept=".pdf,image/*" 
                                                multiple 
                                                onChange={handleFileChange} 
                                                required 
                                            />
                                        </label>
                                    </div>
                                    <p className="text-xs text-slate-500">
                                        PDF, PNG, JPG hasta 10MB
                                    </p>
                                </div>
                            </div>
                            {selectedFiles && selectedFiles.length > 0 && (
                                <div className="mt-2 text-sm text-slate-600">
                                    <p className="font-semibold">Archivos seleccionados ({selectedFiles.length}):</p>
                                    <ul className="list-disc pl-5 max-h-24 overflow-y-auto">
                                        {Array.from(selectedFiles).map((f: File, i) => (
                                            <li key={i}>{f.name}</li>
                                        ))}
                                    </ul>
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
                            {isLoading ? <Spinner /> : 'Cargar Documentos'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default AddDocumentModal;
