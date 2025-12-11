
import React, { useState, useEffect, useMemo } from 'react';
import { getAllDocuments, deleteDocument, getAllModuleTypes, duplicateDocumentRecord, createDocument } from '../services/supabaseService';
import { type Document, type ModuleType } from '../types';
import Spinner from './Spinner';
import AddDocumentModal from './AddDocumentModal';
import FileDropzone from './FileDropzone';
import ConfirmModal from './ConfirmModal';
import WarrantyConfigModal from './WarrantyConfigModal';

// Interfaces extendidas
interface PopulatedDocument extends Document { 
    modelName?: string;
}

interface AssociatedModel {
    id: string; // moduleTypeId
    name: string;
    docId: string; // ID específico de la fila en la tabla documents
}

interface GroupedDocument extends Document {
    associatedModels: AssociatedModel[];
}

const Documents: React.FC = () => {
    const [rawDocuments, setRawDocuments] = useState<PopulatedDocument[]>([]);
    const [loading, setLoading] = useState(true);
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const [isWarrantyConfigOpen, setIsWarrantyConfigOpen] = useState(false);
    
    // Modals state
    const [docToEdit, setDocToEdit] = useState<GroupedDocument | null>(null);
    const [groupToDelete, setGroupToDelete] = useState<GroupedDocument | null>(null);
    const [modelsViewModal, setModelsViewModal] = useState<GroupedDocument | null>(null);

    const fetchDocuments = async () => { 
        setLoading(true); 
        setRawDocuments(await getAllDocuments()); 
        setLoading(false); 
    };
    
    useEffect(() => { fetchDocuments(); }, []);

    // 1. LÓGICA DE AGRUPACIÓN: Combinar filas con misma URL en una tarjeta lógica
    const groupedDocuments = useMemo(() => {
        const groups: Record<string, GroupedDocument> = {};

        rawDocuments.forEach(doc => {
            const key = doc.url; // La URL es el identificador único del "Archivo"

            if (!groups[key]) {
                groups[key] = {
                    ...doc,
                    associatedModels: []
                };
            }

            if (doc.modelName && doc.moduleTypeId) {
                groups[key].associatedModels.push({
                    id: doc.moduleTypeId,
                    name: doc.modelName,
                    docId: doc.id 
                });
            } else {
                // Documentos sin modelo específico (generales)
                groups[key].associatedModels.push({
                    id: 'general',
                    name: 'General / Sin Modelo',
                    docId: doc.id
                });
            }
        });

        return Object.values(groups);
    }, [rawDocuments]);

    const handleDeleteGroup = async () => {
        if (!groupToDelete) return;
        try {
            // Eliminar TODAS las filas asociadas a este archivo
            const deletePromises = groupToDelete.associatedModels.map(assoc => deleteDocument(assoc.docId));
            await Promise.all(deletePromises);
            
            setGroupToDelete(null);
            fetchDocuments();
        } catch (error: any) {
            console.error(error);
            alert("Error al eliminar documentos: " + (error.message || "Error desconocido"));
        }
    };

    // 2. SECCIONES POR TIPO
    const sections = [
        { id: 'manual', title: 'Manuales de Usuario', icon: '📘', data: groupedDocuments.filter(d => d.type === 'manual') },
        { id: 'plan', title: 'Planos Técnicos', icon: '📐', data: groupedDocuments.filter(d => d.type === 'plan') },
        { id: 'warranty', title: 'Garantías', icon: '🛡️', data: groupedDocuments.filter(d => d.type === 'warranty') },
        { id: 'contract', title: 'Contratos', icon: '📄', data: groupedDocuments.filter(d => d.type === 'contract') },
        { id: 'other', title: 'Otros Documentos', icon: '📎', data: groupedDocuments.filter(d => !['manual', 'plan', 'warranty', 'contract'].includes(d.type)) },
    ];

    if (loading) return <div className="flex justify-center items-center h-full"><Spinner /></div>;

    return (
        <div>
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
                <div>
                    <h2 className="text-4xl md:text-7xl font-black text-slate-800 tracking-tight">Biblioteca</h2>
                    <p className="text-slate-500 font-medium mt-1">Gestión centralizada de documentación técnica</p>
                </div>
                <div className="flex gap-3 self-end md:self-auto">
                    <button 
                        onClick={() => setIsWarrantyConfigOpen(true)} 
                        className="bg-white text-slate-600 border border-slate-300 px-6 py-3 rounded-xl font-bold hover:bg-slate-50 transition-colors shadow-sm flex items-center"
                    >
                        Configuración
                    </button>
                    <button onClick={() => setIsAddModalOpen(true)} className="bg-sky-600 text-white px-6 py-3 rounded-xl shadow-lg font-bold hover:bg-sky-700 transition-colors flex items-center">
                        <span className="mr-2 text-xl">+</span> Cargar Documento
                    </button>
                </div>
            </div>
            
            <div className="space-y-12">
                {sections.map(section => (
                    section.data.length > 0 && (
                        <div key={section.id} className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                            <div className="flex items-center mb-4 border-b border-slate-200 pb-2">
                                <span className="text-2xl mr-3">{section.icon}</span>
                                <h3 className="text-2xl font-bold text-slate-700">{section.title}</h3>
                                <span className="ml-3 bg-slate-100 text-slate-500 text-xs font-bold px-2 py-1 rounded-full">
                                    {section.data.length}
                                </span>
                            </div>
                            
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                                {section.data.map((docGroup, index) => (
                                    <div key={index} className="bg-white rounded-2xl p-5 shadow-sm border border-slate-200 hover:shadow-xl hover:border-sky-200 transition-all flex flex-col relative group">
                                        
                                        {/* Botón Editar */}
                                        <button 
                                            onClick={(e) => { e.stopPropagation(); setDocToEdit(docGroup); }}
                                            className="absolute top-3 right-3 p-1.5 text-slate-300 hover:text-sky-600 transition-colors bg-white rounded-full hover:bg-sky-50 z-10 border border-transparent hover:border-sky-100"
                                            title="Editar y Gestionar Asociaciones"
                                        >
                                            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                                                <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0115.75 21H5.25A2.25 2.25 0 013 18.75V8.25A2.25 2.25 0 015.25 6H10" />
                                            </svg>
                                        </button>

                                        <div className="flex items-center mb-4">
                                            <div className="h-12 w-12 bg-slate-50 rounded-xl flex items-center justify-center border border-slate-100 mr-3 text-2xl">
                                                {section.icon}
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <h4 className="text-sm font-bold text-slate-800 leading-tight truncate" title={docGroup.name}>{docGroup.name}</h4>
                                                {docGroup.version && (
                                                    <span className="text-[10px] font-bold text-sky-600 bg-sky-50 border border-sky-100 px-1.5 py-0.5 rounded mt-1 inline-block">
                                                        v{docGroup.version}
                                                    </span>
                                                )}
                                            </div>
                                        </div>

                                        {/* Sección de Modelos Asociados (Interactivo) */}
                                        <div className="mt-auto pt-3 border-t border-slate-100">
                                            <div 
                                                className="flex justify-between items-center cursor-pointer hover:bg-slate-50 p-1 -mx-1 rounded transition-colors"
                                                onClick={() => setModelsViewModal(docGroup)}
                                                title="Ver todos los modelos asociados"
                                            >
                                                <p className="text-[10px] uppercase font-bold text-slate-400">
                                                    Asociado a {docGroup.associatedModels.length} {docGroup.associatedModels.length === 1 ? 'Modelo' : 'Modelos'}
                                                </p>
                                                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-3 h-3 text-slate-300">
                                                    <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
                                                </svg>
                                            </div>
                                            
                                            <div className="flex flex-wrap gap-1 mt-2">
                                                {docGroup.associatedModels.slice(0, 2).map((model, i) => (
                                                    <span key={i} className="inline-flex max-w-full items-center px-2 py-1 rounded text-xs font-medium bg-slate-100 text-slate-600 border border-slate-200 truncate">
                                                        {model.name}
                                                    </span>
                                                ))}
                                                {docGroup.associatedModels.length > 2 && (
                                                    <button 
                                                        onClick={(e) => { e.stopPropagation(); setModelsViewModal(docGroup); }}
                                                        className="inline-flex items-center px-2 py-1 rounded text-xs font-bold bg-indigo-50 text-indigo-600 border border-indigo-100 hover:bg-indigo-100 transition-colors"
                                                    >
                                                        +{docGroup.associatedModels.length - 2} ver todos
                                                    </button>
                                                )}
                                            </div>
                                        </div>

                                        <div className="mt-4 flex gap-2">
                                            <a 
                                                href={docGroup.url} 
                                                target="_blank" 
                                                rel="noopener noreferrer" 
                                                className="flex-1 py-2 text-center rounded-lg text-sky-700 font-bold bg-sky-50 hover:bg-sky-100 border border-sky-200 text-xs transition-colors"
                                            >
                                                Ver Archivo
                                            </a>
                                             <button 
                                                onClick={(e) => { e.stopPropagation(); setGroupToDelete(docGroup); }}
                                                className="p-2 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors border border-transparent hover:border-red-100"
                                                title="Eliminar documento y todas sus asociaciones"
                                            >
                                                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4">
                                                    <path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
                                                </svg>
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )
                ))}
            </div>
            
            {groupedDocuments.length === 0 && !loading && (
                <div className="text-center py-20 bg-white rounded-2xl border-2 border-dashed border-slate-200">
                    <div className="mx-auto h-16 w-16 text-slate-300 mb-4">
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1} stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
                        </svg>
                    </div>
                    <h3 className="text-lg font-medium text-slate-900">Biblioteca Vacía</h3>
                    <p className="mt-1 text-sm text-slate-500">Sube planos o manuales para comenzar.</p>
                </div>
            )}

            {isAddModalOpen && <AddDocumentModal onClose={() => setIsAddModalOpen(false)} onDocumentAdded={fetchDocuments} />}
            
            {docToEdit && <EditDocumentModal groupedDocument={docToEdit} onClose={() => setDocToEdit(null)} onSuccess={() => { setDocToEdit(null); fetchDocuments(); }} />}
            
            {modelsViewModal && (
                <ViewAssociationsModal 
                    document={modelsViewModal} 
                    onClose={() => setModelsViewModal(null)} 
                />
            )}
            
            {isWarrantyConfigOpen && (
                <WarrantyConfigModal 
                    onClose={() => setIsWarrantyConfigOpen(false)} 
                />
            )}

            <ConfirmModal 
                isOpen={!!groupToDelete}
                title="Eliminar Documento"
                message={`Estás a punto de eliminar "${groupToDelete?.name}".\n\nEsto borrará el archivo y sus asociaciones con ${groupToDelete?.associatedModels.length} modelo(s).\n¿Confirmar?`}
                confirmText="Eliminar Todo"
                isDestructive={true}
                onConfirm={handleDeleteGroup}
                onCancel={() => setGroupToDelete(null)}
            />
        </div>
    );
};

// --- SUB-COMPONENTE: Ver Modelos Asociados ---
const ViewAssociationsModal: React.FC<{ document: GroupedDocument; onClose: () => void }> = ({ document, onClose }) => {
    return (
        <div className="fixed inset-0 bg-black bg-opacity-60 z-[60] flex justify-center items-center p-4 backdrop-blur-sm" onClick={onClose}>
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden flex flex-col max-h-[80vh]" onClick={e => e.stopPropagation()}>
                <div className="p-5 border-b border-slate-100 bg-slate-50 flex justify-between items-center">
                    <div>
                        <h3 className="font-bold text-slate-800 text-lg">Modelos Asociados</h3>
                        <p className="text-xs text-slate-500 truncate max-w-[250px]">{document.name}</p>
                    </div>
                    <button onClick={onClose} className="text-slate-400 hover:text-slate-600 bg-white rounded-full p-1 shadow-sm border border-slate-200">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                            <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                        </svg>
                    </button>
                </div>
                <div className="p-2 overflow-y-auto bg-slate-100/50 flex-1">
                    <div className="space-y-2 p-2">
                        {document.associatedModels.map((model, idx) => (
                            <div key={idx} className="bg-white p-3 rounded-lg border border-slate-200 shadow-sm flex items-center">
                                <span className="h-8 w-8 rounded-full bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold text-xs mr-3 border border-indigo-100">
                                    {model.name.charAt(0)}
                                </span>
                                <span className="font-medium text-slate-700 text-sm">{model.name}</span>
                            </div>
                        ))}
                    </div>
                </div>
                <div className="p-4 bg-white border-t border-slate-100 text-center">
                    <a href={document.url} target="_blank" rel="noreferrer" className="text-sky-600 font-bold text-sm hover:underline">
                        Abrir Documento Original
                    </a>
                </div>
            </div>
        </div>
    );
};

// --- SUB-COMPONENTE: Editar Documento (Actualizado) ---
const EditDocumentModal: React.FC<{ groupedDocument: GroupedDocument; onClose: () => void; onSuccess: () => void }> = ({ groupedDocument, onClose, onSuccess }) => {
    const [name, setName] = useState(groupedDocument.name);
    const [version, setVersion] = useState(groupedDocument.version || '');
    const [type, setType] = useState<Document['type']>(groupedDocument.type);
    
    // 3. CORRECT FIX: Initialize checkboxes with ALL associated model IDs from the grouped object
    const [selectedModuleTypeIds, setSelectedModuleTypeIds] = useState<string[]>(
        groupedDocument.associatedModels.map(m => m.id).filter(id => id !== 'general')
    );
    
    const [moduleTypes, setModuleTypes] = useState<ModuleType[]>([]);
    const [newFile, setNewFile] = useState<File | null>(null);
    const [loading, setLoading] = useState(false);
    const [isDataLoading, setIsDataLoading] = useState(true);

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

    const formatBytes = (bytes: number) => {
        if (!+bytes) return '0 Bytes';
        const k = 1024;
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${['Bytes', 'KB', 'MB', 'GB'][i]}`;
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
            if (prev.includes(id)) return prev.filter(item => item !== id);
            return [...prev, id];
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
            let finalUrl = groupedDocument.url;
            if (newFile) {
                // Should upload logic here if needed
            }

            const deletePromises = groupedDocument.associatedModels.map(assoc => deleteDocument(assoc.docId));
            await Promise.all(deletePromises);

            if (!newFile) {
                const insertPromises = selectedModuleTypeIds.map(typeId => 
                    duplicateDocumentRecord({
                        name,
                        type,
                        version,
                        url: groupedDocument.url 
                    }, { moduleTypeId: typeId })
                );
                await Promise.all(insertPromises);
            } else {
                const firstType = selectedModuleTypeIds[0];
                const restTypes = selectedModuleTypeIds.slice(1);
                
                const firstDoc = await createDocument(firstType, 'moduleType', type, newFile, version);
                
                if (restTypes.length > 0) {
                    const restPromises = restTypes.map(typeId => 
                        duplicateDocumentRecord({
                            name,
                            type,
                            version,
                            url: firstDoc.url
                        }, { moduleTypeId: typeId })
                    );
                    await Promise.all(restPromises);
                }
            }

            onSuccess();
        } catch (error: any) {
            console.error(error);
            alert("Error al actualizar documento: " + (error.message || "Error desconocido"));
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-60 z-[70] flex justify-center items-center p-4" onClick={onClose}>
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg p-6 max-h-[90vh] flex flex-col" onClick={e => e.stopPropagation()}>
                <div className="flex justify-between items-center mb-4 border-b border-slate-100 pb-4">
                    <h3 className="text-xl font-bold text-slate-800">Editar Documento</h3>
                    <button onClick={onClose} className="text-slate-400 hover:text-slate-600 bg-slate-50 p-2 rounded-full">✕</button>
                </div>
                
                <form onSubmit={handleSubmit} className="space-y-4 flex-1 overflow-y-auto pr-2 custom-scrollbar">
                    <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Nombre del Archivo</label>
                        <input type="text" value={name} onChange={e => setName(e.target.value)} className="w-full border-slate-300 border p-2.5 rounded-lg focus:ring-2 focus:ring-sky-500 outline-none font-medium" required />
                    </div>
                    
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Versión</label>
                            <input type="text" value={version} onChange={e => setVersion(e.target.value)} className="w-full border-slate-300 border p-2.5 rounded-lg focus:ring-2 focus:ring-sky-500 outline-none" placeholder="v1.0" />
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Categoría</label>
                            <select value={type} onChange={e => setType(e.target.value as any)} className="w-full border-slate-300 border p-2.5 rounded-lg focus:ring-2 focus:ring-sky-500 outline-none bg-white">
                                <option value="manual">Manual</option>
                                <option value="warranty">Garantía</option>
                                <option value="plan">Plano</option>
                                <option value="contract">Contrato</option>
                                <option value="other">Otro</option>
                            </select>
                        </div>
                    </div>
                    
                    <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
                        <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">Modelos Asociados (Vinculación)</label>
                        
                        {isDataLoading ? (
                            <div className="text-center py-4"><Spinner /></div>
                        ) : (
                            <div className="max-h-40 overflow-y-auto pr-1 custom-scrollbar">
                                <div className="flex items-center mb-2 pb-2 border-b border-slate-200">
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
                                        <div key={m.id} className={`flex items-center p-2 rounded transition-colors ${selectedModuleTypeIds.includes(m.id) ? 'bg-sky-50' : 'hover:bg-white'}`}>
                                            <input 
                                                type="checkbox" 
                                                id={`mt-edit-${m.id}`}
                                                checked={selectedModuleTypeIds.includes(m.id)}
                                                onChange={() => handleModuleTypeToggle(m.id)}
                                                className="h-4 w-4 text-sky-600 rounded border-slate-300 focus:ring-sky-500 cursor-pointer"
                                            />
                                            <label htmlFor={`mt-edit-${m.id}`} className="ml-2 text-sm text-slate-700 cursor-pointer select-none flex-1 font-medium">
                                                {m.name}
                                            </label>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                        <p className="text-[10px] text-slate-400 mt-2 italic">El documento aparecerá en la ficha de los modelos seleccionados.</p>
                    </div>

                    <div>
                         <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Reemplazar Archivo (Opcional)</label>
                         <FileDropzone onFilesSelected={f => setNewFile(f[0])} maxFiles={1} />
                         {newFile && (
                            <div className="flex items-center justify-between p-3 bg-emerald-50 border border-emerald-200 rounded-lg mt-2">
                                <div className="flex items-center overflow-hidden">
                                    <span className="text-lg mr-2">📄</span>
                                    <div className="min-w-0">
                                        <p className="text-sm font-bold text-emerald-800 truncate" title={newFile.name}>{newFile.name}</p>
                                        <p className="text-xs text-emerald-600">{formatBytes(newFile.size)}</p>
                                    </div>
                                </div>
                                <button type="button" onClick={() => setNewFile(null)} className="text-emerald-500 hover:text-red-500 font-bold px-2">
                                    ✕
                                </button>
                            </div>
                         )}
                    </div>
                </form>

                <div className="flex justify-end pt-4 border-t border-slate-100 mt-2 shrink-0 gap-3">
                        <button type="button" onClick={onClose} className="px-5 py-2.5 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 font-bold text-sm transition-colors">Cancelar</button>
                        <button onClick={handleSubmit} disabled={loading} className="px-6 py-2.5 bg-sky-600 text-white rounded-xl hover:bg-sky-700 font-bold text-sm shadow-md transition-colors flex items-center">
                            {loading ? <Spinner /> : 'Guardar Cambios'}
                        </button>
                </div>
            </div>
        </div>
    );
};

export default Documents;