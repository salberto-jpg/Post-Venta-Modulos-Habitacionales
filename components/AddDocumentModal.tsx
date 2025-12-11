
import React, { useState, useEffect } from 'react';
import { createDocument, getAllModuleTypes } from '../services/supabaseService';
import { type ModuleType, type Document } from '../types';
import Spinner from './Spinner';
import FileDropzone from './FileDropzone';

interface AddDocumentModalProps { 
    onClose: () => void; 
    onDocumentAdded: () => void; 
    initialTargetId?: string; 
    initialType?: string; 
    lockModelSelection?: boolean;
    context?: 'moduleType' | 'client' | 'module'; // New Prop to handle different contexts
}

const AddDocumentModal: React.FC<AddDocumentModalProps> = ({ 
    onClose, 
    onDocumentAdded, 
    initialTargetId, 
    initialType, 
    lockModelSelection = false,
    context = 'moduleType'
}) => {
    // For Module Types (Multi Select) - Default to initialTargetId if present
    const [selectedModuleTypeIds, setSelectedModuleTypeIds] = useState<string[]>(initialTargetId ? [initialTargetId] : []);
    
    // Use initialType if provided, else default to 'manual'
    const [documentType, setDocumentType] = useState<Document['type']>((initialType as Document['type']) || 'manual');
    
    const [version, setVersion] = useState('');
    const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
    
    const [moduleTypes, setModuleTypes] = useState<ModuleType[]>([]);
    
    const [isLoading, setIsLoading] = useState(false);
    const [isDataLoading, setIsDataLoading] = useState(true);
    const [error, setError] = useState('');

    useEffect(() => {
        // Only fetch module types if we are in that context
        if (context === 'moduleType') {
            const fetchData = async () => {
                setIsDataLoading(true);
                try {
                    const moduleTypeData = await getAllModuleTypes();
                    setModuleTypes(moduleTypeData);
                } catch (err) { 
                    setError('No se pudieron cargar los modelos.'); 
                } finally { 
                    setIsDataLoading(false); 
                }
            };
            fetchData();
        } else {
            setIsDataLoading(false);
        }
    }, [context]);

    const handleSelectAllModuleTypes = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.checked) {
            setSelectedModuleTypeIds(moduleTypes.map(m => m.id));
        } else {
            setSelectedModuleTypeIds([]);
        }
    };

    const handleModuleTypeToggle = (id: string) => {
        setSelectedModuleTypeIds(prev => {
            if (prev.includes(id)) {
                return prev.filter(item => item !== id);
            } else {
                return [...prev, id];
            }
        });
    };

    const handleRemoveFile = (index: number) => {
        setSelectedFiles(prev => prev.filter((_, i) => i !== index));
    };

    const formatBytes = (bytes: number, decimals = 2) => {
        if (!+bytes) return '0 Bytes';
        const k = 1024;
        const dm = decimals < 0 ? 0 : decimals;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return `${parseFloat((bytes / Math.pow(k, i)).toFixed(dm))} ${sizes[i]}`;
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        
        if (context === 'moduleType' && selectedModuleTypeIds.length === 0) { 
            setError('Seleccione al menos un modelo del catálogo.'); return; 
        }
        if ((context === 'client' || context === 'module') && !initialTargetId) {
            setError('Error de contexto: No se identificó el destino (Cliente/Módulo).'); return;
        }

        if (!selectedFiles || selectedFiles.length === 0) { setError('Falta seleccionar el archivo.'); return; }
        
        setError(''); 
        setIsLoading(true);
        
        try {
            const uploadPromises = [];

            for (const file of selectedFiles) {
                if (context === 'moduleType') {
                    // Multi-upload for module types
                    for (const typeId of selectedModuleTypeIds) {
                        uploadPromises.push(createDocument(typeId, 'moduleType', documentType, file, version));
                    }
                } else {
                    // Single upload for Client or specific Module instance
                    uploadPromises.push(createDocument(initialTargetId!, context, documentType, file, version));
                }
            }

            await Promise.all(uploadPromises);
            onDocumentAdded(); 
            onClose();
        } catch (err) { 
            setError('Error al cargar el documento.'); 
            console.error(err);
        } finally { 
            setIsLoading(false); 
        }
    };

    // UI Logic for different contexts
    const isGenericUpload = context === 'moduleType';
    const titleText = context === 'client' ? 'Documento del Cliente' : context === 'module' ? 'Documento del Módulo' : 'Cargar Documento';

    // Find the name of the locked model if applicable (only for moduleType context lock)
    const lockedModelName = lockModelSelection && initialTargetId && isGenericUpload
        ? moduleTypes.find(m => m.id === initialTargetId)?.name 
        : 'Modelo Seleccionado';

    return (
        <div className="fixed inset-0 bg-black bg-opacity-60 z-50 flex justify-center items-center" onClick={onClose}>
            <div className="bg-white rounded-lg shadow-xl w-full max-w-lg p-6 max-h-[90vh] flex flex-col" onClick={e => e.stopPropagation()}>
                <div className="flex justify-between items-center mb-4">
                    <h2 className="text-xl font-bold text-slate-800">{titleText}</h2>
                    <button onClick={onClose} className="text-slate-400 hover:text-slate-600">✕</button>
                </div>
                
                <form onSubmit={handleSubmit} className="space-y-4 flex-1 overflow-y-auto pr-2">
                    
                    {/* Module Type Selector (Only visible if context is moduleType) */}
                    {isGenericUpload && (
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-2">Asociar a Modelo</label>
                            
                            {lockModelSelection ? (
                                <div className="bg-slate-100 border border-slate-300 rounded-md p-3 text-slate-700 font-medium flex items-center">
                                    <span className="bg-sky-100 text-sky-800 text-xs px-2 py-1 rounded mr-2 uppercase font-bold">Fijo</span>
                                    {isDataLoading ? 'Cargando...' : lockedModelName}
                                </div>
                            ) : (
                                <div className="border rounded-md p-3 max-h-56 overflow-y-auto bg-slate-50">
                                    {isDataLoading ? (
                                        <div className="text-center py-4"><Spinner /></div>
                                    ) : (
                                        <>
                                            <div className="flex items-center mb-2 pb-2 border-b border-slate-200 sticky top-0 bg-slate-50 z-10">
                                                <input 
                                                    type="checkbox" 
                                                    id="selectAll" 
                                                    checked={moduleTypes.length > 0 && selectedModuleTypeIds.length === moduleTypes.length}
                                                    onChange={handleSelectAllModuleTypes}
                                                    className="h-4 w-4 text-sky-600 rounded border-slate-300 focus:ring-sky-500 cursor-pointer"
                                                />
                                                <label htmlFor="selectAll" className="ml-2 text-sm font-bold text-slate-700 cursor-pointer select-none">Seleccionar Todos</label>
                                            </div>
                                            <div className="space-y-1">
                                                {moduleTypes.map(m => (
                                                    <div key={m.id} className="flex items-center hover:bg-slate-100 p-1 rounded transition-colors">
                                                        <input 
                                                            type="checkbox" 
                                                            id={`mt-${m.id}`}
                                                            checked={selectedModuleTypeIds.includes(m.id)}
                                                            onChange={() => handleModuleTypeToggle(m.id)}
                                                            className="h-4 w-4 text-sky-600 rounded border-slate-300 focus:ring-sky-500 cursor-pointer"
                                                        />
                                                        <label htmlFor={`mt-${m.id}`} className="ml-2 text-sm text-slate-600 cursor-pointer select-none flex-1">
                                                            {m.name}
                                                        </label>
                                                    </div>
                                                ))}
                                            </div>
                                        </>
                                    )}
                                </div>
                            )}
                            {!lockModelSelection && <p className="text-xs text-slate-500 mt-1">El documento se vinculará a todos los modelos seleccionados.</p>}
                        </div>
                    )}

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {!lockModelSelection && (
                            <div>
                                <label className="block text-sm font-medium text-slate-700">Tipo Documento</label>
                                <select value={documentType} onChange={e => setDocumentType(e.target.value as Document['type'])} className="mt-1 block w-full px-3 py-2 bg-white border border-slate-300 rounded-md focus:ring-sky-500 focus:border-sky-500">
                                    <option value="manual">Manual</option>
                                    <option value="warranty">Garantía</option>
                                    <option value="plan">Plano</option>
                                    <option value="contract">Contrato</option>
                                    <option value="other">Otro</option>
                                </select>
                            </div>
                        )}
                        <div className={lockModelSelection ? "md:col-span-2" : ""}>
                            <label className="block text-sm font-medium text-slate-700">Versión (Opcional)</label>
                            <input 
                                type="text" 
                                value={version} 
                                onChange={e => setVersion(e.target.value)}
                                placeholder="v1.0" 
                                className="mt-1 block w-full px-3 py-2 bg-white border border-slate-300 rounded-md focus:ring-sky-500 focus:border-sky-500" 
                            />
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Archivos</label>
                        <FileDropzone onFilesSelected={(files) => setSelectedFiles(prev => [...prev, ...files])} accept={{ 'application/pdf': [], 'image/*': [] }} maxFiles={5} multiple={true} />
                        
                        {/* File Details List */}
                        {selectedFiles.length > 0 && (
                            <div className="mt-3 space-y-2">
                                <p className="text-xs font-bold text-slate-500 uppercase">Archivos listos para subir:</p>
                                {selectedFiles.map((file, idx) => (
                                    <div key={idx} className="flex items-center justify-between p-3 bg-slate-50 border border-slate-200 rounded-md shadow-sm">
                                        <div className="flex items-center overflow-hidden">
                                            <div className="bg-white p-2 rounded border border-slate-200 mr-3 shrink-0">
                                                {file.type.startsWith('image/') ? (
                                                    <span className="text-xl">🖼️</span>
                                                ) : (
                                                    <span className="text-xl">📄</span>
                                                )}
                                            </div>
                                            <div className="min-w-0">
                                                <p className="text-sm font-semibold text-slate-700 truncate" title={file.name}>{file.name}</p>
                                                <p className="text-xs text-slate-500">{formatBytes(file.size)}</p>
                                            </div>
                                        </div>
                                        <button 
                                            type="button" 
                                            onClick={() => handleRemoveFile(idx)}
                                            className="text-slate-400 hover:text-red-500 p-1 rounded-full hover:bg-red-50 transition-colors ml-2"
                                        >
                                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                                                <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                                            </svg>
                                        </button>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                    
                    {error && <div className="bg-red-50 text-red-600 text-sm p-3 rounded-md border border-red-100">{error}</div>}
                </form>

                <div className="flex justify-end space-x-3 pt-4 border-t border-slate-100 flex-shrink-0 mt-4">
                    <button type="button" onClick={onClose} className="px-4 py-2 text-sm rounded-md bg-white border border-slate-300 text-slate-700 hover:bg-slate-50 font-medium">Cancelar</button>
                    <button onClick={handleSubmit} disabled={isLoading || selectedFiles.length === 0} className="px-6 py-2 text-sm bg-sky-600 text-white rounded-md hover:bg-sky-700 disabled:opacity-50 font-bold shadow-sm flex items-center">
                        {isLoading ? <Spinner /> : `Cargar ${selectedFiles.length > 0 ? `(${selectedFiles.length})` : ''}`}
                    </button>
                </div>
            </div>
        </div>
    );
};
export default AddDocumentModal;
