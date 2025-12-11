
import React, { useState, useEffect } from 'react';
import { getAllDocuments, duplicateDocumentRecord } from '../services/supabaseService';
import { type Document } from '../types';
import Spinner from './Spinner';

interface LinkDocumentModalProps {
    onClose: () => void;
    onDocumentLinked: () => void;
    targetClientId?: string;
    targetModuleId?: string;
}

const LinkDocumentModal: React.FC<LinkDocumentModalProps> = ({ onClose, onDocumentLinked, targetClientId, targetModuleId }) => {
    const [documents, setDocuments] = useState<any[]>([]);
    const [filteredDocs, setFilteredDocs] = useState<any[]>([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedDocIds, setSelectedDocIds] = useState<string[]>([]);
    const [loading, setLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);

    useEffect(() => {
        const fetchDocs = async () => {
            setLoading(true);
            try {
                // Fetch all documents. 
                // In a real app, you might want to fetch only "templates" or unique by URL.
                const allDocs = await getAllDocuments();
                
                // Deduplicate by URL to show unique files available in the system
                const uniqueDocs = new Map();
                allDocs.forEach((doc: any) => {
                    if (!uniqueDocs.has(doc.url)) {
                        uniqueDocs.set(doc.url, doc);
                    }
                });
                
                setDocuments(Array.from(uniqueDocs.values()));
                setFilteredDocs(Array.from(uniqueDocs.values()));
            } catch (e) {
                console.error(e);
            } finally {
                setLoading(false);
            }
        };
        fetchDocs();
    }, []);

    useEffect(() => {
        if (searchTerm.trim() === '') {
            setFilteredDocs(documents);
        } else {
            const lowerTerm = searchTerm.toLowerCase();
            setFilteredDocs(documents.filter(d => 
                d.name.toLowerCase().includes(lowerTerm) || 
                d.type.toLowerCase().includes(lowerTerm)
            ));
        }
    }, [searchTerm, documents]);

    const toggleSelection = (id: string) => {
        setSelectedDocIds(prev => 
            prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]
        );
    };

    const handleSave = async () => {
        if (selectedDocIds.length === 0) return;
        setIsSaving(true);
        try {
            const docsToLink = documents.filter(d => selectedDocIds.includes(d.id));
            
            const promises = docsToLink.map(doc => 
                duplicateDocumentRecord(
                    { name: doc.name, type: doc.type, version: doc.version, url: doc.url }, 
                    { clientId: targetClientId, moduleId: targetModuleId }
                )
            );

            await Promise.all(promises);
            onDocumentLinked();
            onClose();
        } catch (error) {
            console.error("Error linking documents:", error);
            alert("Hubo un error al vincular los documentos.");
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-60 z-[80] flex justify-center items-center p-4 backdrop-blur-sm" onClick={onClose}>
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl h-[80vh] flex flex-col overflow-hidden" onClick={e => e.stopPropagation()}>
                <div className="p-6 border-b border-slate-200 bg-slate-50 flex justify-between items-center">
                    <div>
                        <h2 className="text-xl font-black text-slate-800">Biblioteca de Documentos</h2>
                        <p className="text-sm text-slate-500">Selecciona documentos existentes para vincular</p>
                    </div>
                    <button onClick={onClose} className="text-slate-400 hover:text-slate-600 bg-white p-2 rounded-full border border-slate-200 hover:bg-slate-100 transition-colors">✕</button>
                </div>

                <div className="p-4 border-b border-slate-100 bg-white">
                    <input 
                        type="text" 
                        placeholder="Buscar por nombre o tipo..." 
                        value={searchTerm}
                        onChange={e => setSearchTerm(e.target.value)}
                        className="w-full border border-slate-300 rounded-xl px-4 py-2.5 focus:ring-2 focus:ring-sky-500 outline-none text-sm"
                    />
                </div>

                <div className="flex-1 overflow-y-auto p-4 bg-slate-50">
                    {loading ? (
                        <div className="flex justify-center py-10"><Spinner /></div>
                    ) : filteredDocs.length === 0 ? (
                        <p className="text-center text-slate-500 py-10">No se encontraron documentos.</p>
                    ) : (
                        <div className="grid grid-cols-1 gap-3">
                            {filteredDocs.map(doc => {
                                const isSelected = selectedDocIds.includes(doc.id);
                                return (
                                    <div 
                                        key={doc.id} 
                                        onClick={() => toggleSelection(doc.id)}
                                        className={`flex items-center p-3 rounded-xl border cursor-pointer transition-all ${isSelected ? 'bg-sky-50 border-sky-500 ring-1 ring-sky-500' : 'bg-white border-slate-200 hover:border-sky-300'}`}
                                    >
                                        <div className={`w-5 h-5 rounded border flex items-center justify-center mr-4 ${isSelected ? 'bg-sky-500 border-sky-500' : 'border-slate-300 bg-white'}`}>
                                            {isSelected && <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <h4 className="font-bold text-slate-800 text-sm truncate">{doc.name}</h4>
                                            <div className="flex items-center mt-1 space-x-2">
                                                <span className="text-[10px] uppercase font-bold bg-slate-100 text-slate-500 px-2 py-0.5 rounded">{doc.type}</span>
                                                {doc.modelName && <span className="text-[10px] text-slate-400">Ref: {doc.modelName}</span>}
                                            </div>
                                        </div>
                                        <div className="ml-2">
                                            <a href={doc.url} target="_blank" rel="noreferrer" onClick={e => e.stopPropagation()} className="text-xs text-sky-600 hover:underline">Ver</a>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>

                <div className="p-5 border-t border-slate-200 bg-white flex justify-end gap-3">
                    <button onClick={onClose} className="px-5 py-2.5 text-sm font-bold text-slate-600 hover:bg-slate-50 rounded-xl transition-colors">Cancelar</button>
                    <button 
                        onClick={handleSave} 
                        disabled={isSaving || selectedDocIds.length === 0}
                        className="px-6 py-2.5 text-sm font-bold bg-slate-900 text-white rounded-xl hover:bg-sky-600 shadow-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
                    >
                        {isSaving ? <Spinner /> : `Vincular (${selectedDocIds.length})`}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default LinkDocumentModal;
