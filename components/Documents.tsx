import React, { useState, useEffect } from 'react';
import { getAllDocuments, updateDocument, deleteDocument, getAllModuleTypes, duplicateDocumentRecord } from '../services/supabaseService';
import { type Document, type ModuleType } from '../types';
import Spinner from './Spinner';
import AddDocumentModal from './AddDocumentModal';
import FileDropzone from './FileDropzone';
import ConfirmModal from './ConfirmModal';

interface PopulatedDocument extends Document { moduleSerial: string; clientName: string; }

const Documents: React.FC = () => {
    const [documents, setDocuments] = useState<PopulatedDocument[]>([]);
    const [loading, setLoading] = useState(true);
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    
    // Editing
    const [docToEdit, setDocToEdit] = useState<Document | null>(null);

    const fetchDocuments = async () => { setLoading(true); setDocuments(await getAllDocuments()); setLoading(false); };
    useEffect(() => { fetchDocuments(); }, []);

    if (loading) return <div className="flex justify-center items-center h-full"><Spinner /></div>;

    return (
        <div>
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
                <h2 className="text-4xl md:text-7xl font-black text-slate-800 tracking-tight">Biblioteca</h2>
                <button onClick={() => setIsAddModalOpen(true)} className="bg-sky-600 text-white px-6 py-3 rounded-xl shadow-lg font-bold hover:bg-sky-700 transition-colors self-end md:self-auto">Cargar Documento</button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                {documents.map(doc => (
                    <div key={doc.id} className="bg-white rounded-2xl p-6 shadow-sm border hover:shadow-xl transition-all text-center relative group">
                         <button 
                            onClick={(e) => { e.stopPropagation(); setDocToEdit(doc); }}
                            className="absolute top-2 right-2 p-2 text-slate-300 hover:text-sky-600 transition-colors bg-white rounded-full hover:bg-slate-50 border border-transparent hover:border-slate-200 shadow-sm"
                            title="Editar Documento"
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0115.75 21H5.25A2.25 2.25 0 013 18.75V8.25A2.25 2.25 0 015.25 6H10" />
                            </svg>
                        </button>

                        <div className="h-20 w-20 bg-slate-50 rounded-2xl flex items-center justify-center mb-4 mx-auto"><span className="text-4xl">📄</span></div>
                        <h3 className="text-lg font-bold truncate" title={doc.name}>{doc.name}</h3>
                        <p className="text-xs text-slate-400 mt-1">{new Date(doc.uploadedAt).toLocaleDateString()}</p>
                        {doc.version && <span className="inline-block bg-sky-50 text-sky-700 text-[10px] px-2 py-0.5 rounded-full mt-1">v{doc.version}</span>}
                        <a href={doc.url} target="_blank" rel="noopener noreferrer" className="block w-full py-2 mt-4 border rounded text-sky-600 font-bold hover:bg-sky-50">Ver Archivo</a>
                    </div>
                ))}
            </div>
            {isAddModalOpen && <AddDocumentModal onClose={() => setIsAddModalOpen(false)} onDocumentAdded={fetchDocuments} />}
            {docToEdit && <EditDocumentModal document={docToEdit} onClose={() => setDocToEdit(null)} onSuccess={() => { setDocToEdit(null); fetchDocuments(); }} />}
        </div>
    );
};

const EditDocumentModal: React.FC<{ document: Document; onClose: () => void; onSuccess: () => void }> = ({ document, onClose, onSuccess }) => {
    const [name, setName] = useState(document.name);
    const [version, setVersion] = useState(document.version || '');
    const [type, setType] = useState<Document['type']>(document.type);
    
    // Changed to array to support multi-select
    const [selectedModuleTypeIds, setSelectedModuleTypeIds] = useState<string[]>(document.moduleTypeId ? [document.moduleTypeId] : []);
    
    const [moduleTypes, setModuleTypes] = useState<ModuleType[]>([]);
    const [newFile, setNewFile] = useState<File | null>(null);
    const [loading, setLoading] = useState(false);
    const [isDataLoading, setIsDataLoading] = useState(true);
    const [isDeleting, setIsDeleting] = useState(false);
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

    useEffect(() => {
        const loadTypes = async () => {
            setIsDataLoading(true);
            try {
                const types = await getAllModuleTypes();
                setModuleTypes(types);
            } catch (e) { console.error("Error loading types"); }
            finally { setIsDataLoading(false); }
        };
        loadTypes();
    }, []);

    const formatBytes = (bytes: number, decimals = 2) => {
        if (!+bytes) return '0 Bytes';
        const k = 1024;
        const dm = decimals < 0 ? 0 : decimals;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return `${parseFloat((bytes / Math.pow(k, i)).toFixed(dm))} ${sizes[i]}`;
    };

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

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        
        if (selectedModuleTypeIds.length === 0) { 
            alert('Por favor, selecciona al menos un modelo del catálogo.'); 
            return; 
        }

        setLoading(true);
        try {
            // 1. Update the MAIN document (current ID)
            // It takes the FIRST selected ID as its primary association
            const mainTargetId = selectedModuleTypeIds[0];
            
            const updates: Partial<Document> = { 
                name, 
                version, 
                type,
                moduleTypeId: mainTargetId
            };
            
            // This returns the new URL if updated, or null
            const updatedUrl = await updateDocument(document.id, updates, newFile || undefined);
            const finalUrl = updatedUrl || document.url; // Use new URL if uploaded, else keep old

            // 2. If multiple models were selected, we need to CLONE this document for the others
            // Because our DB is 1 document row -> 1 moduleType
            if (selectedModuleTypeIds.length > 1) {
                const clones = selectedModuleTypeIds.slice(1);
                const clonePromises = clones.map(targetId => 
                    duplicateDocumentRecord({
                        name,
                        type,
                        version,
                        url: finalUrl
                    }, targetId)
                );
                await Promise.all(clonePromises);
            }

            onSuccess();
        } catch (error: any) {
            console.error(error);
            alert("Error al actualizar documento: " + (error.message || "Error desconocido"));
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async () => {
        setShowDeleteConfirm(false);
        setIsDeleting(true);
        try {
            await deleteDocument(document.id);
            onSuccess();
        } catch (error: any) {
            console.error(error);
            alert("Error al eliminar documento: " + (error.message || "Permisos insuficientes."));
            setIsDeleting(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-60 z-50 flex justify-center items-center" onClick={onClose}>
            <div className="bg-white rounded-lg shadow-xl w-full max-w-md p-6 max-h-[90vh] flex flex-col" onClick={e => e.stopPropagation()}>
                <h3 className="text-lg font-bold mb-4">Editar Datos Documento</h3>
                <form onSubmit={handleSubmit} className="space-y-4 flex-1 overflow-y-auto pr-2">
                    <div>
                        <label className="block text-sm font-medium text-slate-700">Nombre</label>
                        <input type="text" value={name} onChange={e => setName(e.target.value)} className="w-full border p-2 rounded mt-1" required />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-slate-700">Versión</label>
                        <input type="text" value={version} onChange={e => setVersion(e.target.value)} className="w-full border p-2 rounded mt-1" />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-slate-700">Categoría</label>
                        <select value={type} onChange={e => setType(e.target.value as any)} className="w-full border p-2 rounded mt-1">
                             <option value="manual">Manual</option><option value="warranty">Garantía</option><option value="plan">Plano</option><option value="contract">Contrato</option>
                        </select>
                    </div>
                    
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-2">Asociar a Modelos (Catálogo)</label>
                        <div className="border rounded-md p-3 max-h-48 overflow-y-auto bg-slate-50">
                            {isDataLoading ? (
                                <div className="text-center py-4"><Spinner /></div>
                            ) : (
                                <>
                                    <div className="flex items-center mb-2 pb-2 border-b border-slate-200 sticky top-0 bg-slate-50 z-10">
                                        <input 
                                            type="checkbox" 
                                            id="selectAllEdit" 
                                            checked={moduleTypes.length > 0 && selectedModuleTypeIds.length === moduleTypes.length}
                                            onChange={handleSelectAllModuleTypes}
                                            className="h-4 w-4 text-sky-600 rounded border-slate-300 focus:ring-sky-500 cursor-pointer"
                                        />
                                        <label htmlFor="selectAllEdit" className="ml-2 text-sm font-bold text-slate-700 cursor-pointer select-none">Seleccionar Todos</label>
                                    </div>
                                    <div className="space-y-1">
                                        {moduleTypes.map(m => (
                                            <div key={m.id} className="flex items-center hover:bg-slate-100 p-1 rounded transition-colors">
                                                <input 
                                                    type="checkbox" 
                                                    id={`mt-edit-${m.id}`}
                                                    checked={selectedModuleTypeIds.includes(m.id)}
                                                    onChange={() => handleModuleTypeToggle(m.id)}
                                                    className="h-4 w-4 text-sky-600 rounded border-slate-300 focus:ring-sky-500 cursor-pointer"
                                                />
                                                <label htmlFor={`mt-edit-${m.id}`} className="ml-2 text-sm text-slate-600 cursor-pointer select-none flex-1">
                                                    {m.name}
                                                </label>
                                            </div>
                                        ))}
                                    </div>
                                </>
                            )}
                        </div>
                        <p className="text-xs text-slate-500 mt-1">Si selecciona múltiples modelos, se creará una copia del documento para cada uno.</p>
                    </div>

                    <div>
                         <label className="block text-sm font-medium text-slate-700 mb-1">Reemplazar Archivo (Opcional)</label>
                         <FileDropzone onFilesSelected={f => setNewFile(f[0])} maxFiles={1} />
                         {newFile && (
                            <div className="flex items-center justify-between p-3 bg-sky-50 border border-sky-200 rounded-md mt-2">
                                <div>
                                    <p className="text-sm font-bold text-sky-800 truncate" title={newFile.name}>{newFile.name}</p>
                                    <p className="text-xs text-sky-600">{formatBytes(newFile.size)}</p>
                                </div>
                                <button type="button" onClick={() => setNewFile(null)} className="text-sky-500 hover:text-red-500">
                                    ✕
                                </button>
                            </div>
                         )}
                    </div>
                </form>

                <div className="flex justify-between items-center pt-4 border-t border-slate-100 mt-2 shrink-0">
                        <button 
                        type="button" 
                        onClick={() => setShowDeleteConfirm(true)} 
                        disabled={isDeleting}
                        className="text-red-600 text-sm font-bold hover:text-red-800 border border-transparent hover:bg-red-50 rounded px-2 py-1"
                    >
                        {isDeleting ? 'Eliminando...' : 'Eliminar'}
                    </button>
                    <div className="flex gap-2">
                            <button type="button" onClick={onClose} className="px-4 py-2 border rounded">Cancelar</button>
                            <button onClick={handleSubmit} disabled={loading} className="px-4 py-2 bg-sky-600 text-white rounded">{loading ? <Spinner /> : 'Guardar'}</button>
                    </div>
                </div>
            </div>
            
            <ConfirmModal 
                isOpen={showDeleteConfirm}
                title="Eliminar Documento"
                message="¿Estás seguro de que deseas eliminar este documento permanentemente?"
                confirmText="Eliminar"
                isDestructive={true}
                onConfirm={handleDelete}
                onCancel={() => setShowDeleteConfirm(false)}
            />
        </div>
    );
};

export default Documents;