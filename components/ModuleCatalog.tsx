
import React, { useState, useEffect } from 'react';
import { getAllModuleTypes, createModuleType } from '../services/supabaseService';
import { type ModuleType } from '../types';
import Spinner from './Spinner';
import ModuleTypeDetails from './ModuleTypeDetails';

const ModuleCatalog: React.FC = () => {
    const [moduleTypes, setModuleTypes] = useState<ModuleType[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedModuleType, setSelectedModuleType] = useState<ModuleType | null>(null);
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
    
    // Create Form State
    const [newModelName, setNewModelName] = useState('');
    const [newModelDesc, setNewModelDesc] = useState('');
    const [selectedFile, setSelectedFile] = useState<File | null>(null);
    const [isCreating, setIsCreating] = useState(false);

    const fetchModuleTypes = async () => {
        setLoading(true);
        try {
            const data = await getAllModuleTypes();
            setModuleTypes(data);
        } catch (error) {
            console.error("Error fetching module types:", error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchModuleTypes();
    }, []);

    const handleCreateSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsCreating(true);
        try {
            await createModuleType({ name: newModelName, description: newModelDesc }, selectedFile || undefined);
            await fetchModuleTypes();
            setIsCreateModalOpen(false);
            setNewModelName('');
            setNewModelDesc('');
            setSelectedFile(null);
        } catch (error) {
            console.error(error);
        } finally {
            setIsCreating(false);
        }
    };

    if (loading) {
        return <div className="flex justify-center items-center h-full"><Spinner /></div>;
    }

    if (selectedModuleType) {
        return <ModuleTypeDetails moduleType={selectedModuleType} onBack={() => setSelectedModuleType(null)} />;
    }

    return (
        <div>
            <div className="flex justify-between items-center mb-6">
                <h2 className="text-3xl font-bold text-slate-800">Catálogo de Modelos</h2>
                <button
                    onClick={() => setIsCreateModalOpen(true)}
                    className="flex items-center bg-sky-600 text-white px-4 py-2 rounded-md shadow-sm hover:bg-sky-700 transition-colors"
                >
                    <PlusIcon className="h-5 w-5 mr-2" />
                    Nuevo Modelo
                </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {moduleTypes.map(model => (
                    <div 
                        key={model.id} 
                        onClick={() => setSelectedModuleType(model)}
                        className="bg-white rounded-lg shadow-md overflow-hidden border border-slate-200 hover:shadow-lg hover:border-sky-300 transition-all cursor-pointer group flex flex-col h-full"
                    >
                        <div className="h-48 bg-slate-100 relative overflow-hidden flex items-center justify-center">
                            {model.imageUrl ? (
                                <img src={model.imageUrl} alt={model.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                            ) : (
                                <CubeIcon className="h-16 w-16 text-slate-300" />
                            )}
                        </div>
                        <div className="p-6 flex-1 flex flex-col">
                            <h3 className="text-xl font-bold text-slate-800 mb-2">{model.name}</h3>
                            <p className="text-slate-600 text-sm line-clamp-3 flex-1">{model.description}</p>
                            <div className="mt-4 pt-4 border-t border-slate-100 flex justify-end">
                                <span className="text-sm font-medium text-sky-600 group-hover:underline">Gestionar Documentos &rarr;</span>
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            {/* Create Modal */}
            {isCreateModalOpen && (
                <div className="fixed inset-0 bg-black bg-opacity-60 z-50 flex justify-center items-center" onClick={() => setIsCreateModalOpen(false)}>
                    <div className="bg-gradient-to-b from-slate-50 to-slate-100 rounded-lg shadow-xl w-full max-w-md mx-4 p-6" onClick={e => e.stopPropagation()}>
                        <h3 className="text-xl font-bold text-slate-800 mb-4">Crear Nuevo Modelo</h3>
                        <form onSubmit={handleCreateSubmit} className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-slate-700">Nombre del Modelo</label>
                                <input 
                                    type="text" 
                                    value={newModelName} 
                                    onChange={e => setNewModelName(e.target.value)}
                                    className="mt-1 block w-full px-3 py-2 bg-white border border-slate-300 rounded-md shadow-sm focus:ring-sky-500 focus:border-sky-500"
                                    required 
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-700">Descripción</label>
                                <textarea 
                                    value={newModelDesc} 
                                    onChange={e => setNewModelDesc(e.target.value)}
                                    rows={3}
                                    className="mt-1 block w-full px-3 py-2 bg-white border border-slate-300 rounded-md shadow-sm focus:ring-sky-500 focus:border-sky-500"
                                    required 
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-700">Imagen de Portada</label>
                                <input 
                                    type="file" 
                                    accept="image/*"
                                    onChange={e => setSelectedFile(e.target.files ? e.target.files[0] : null)}
                                    className="mt-1 block w-full text-sm text-slate-500
                                        file:mr-4 file:py-2 file:px-4
                                        file:rounded-full file:border-0
                                        file:text-sm file:font-semibold
                                        file:bg-sky-50 file:text-sky-700
                                        hover:file:bg-sky-100"
                                />
                            </div>
                            <div className="flex justify-end space-x-3 pt-2">
                                <button type="button" onClick={() => setIsCreateModalOpen(false)} className="px-4 py-2 text-sm text-slate-700 hover:bg-slate-200 rounded-md">Cancelar</button>
                                <button type="submit" disabled={isCreating} className="px-4 py-2 text-sm bg-sky-600 text-white rounded-md hover:bg-sky-700 disabled:opacity-50 flex items-center">
                                    {isCreating ? <Spinner /> : 'Guardar'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

const CubeIcon: React.FC<{className?: string}> = ({className}) => (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={className}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M21 7.5l-9-5.25L3 7.5m18 0l-9 5.25m9-5.25v9l-9 5.25M3 7.5l9 5.25M3 7.5v9l9 5.25m0-9v9" />
    </svg>
);

const PlusIcon: React.FC<{ className?: string }> = ({ className }) => (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={className}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
    </svg>
);

export default ModuleCatalog;
