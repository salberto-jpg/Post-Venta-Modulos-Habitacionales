import React, { useState, useEffect } from 'react';
import { getClientDossier, deleteClient, deleteDocument } from '../services/supabaseService';
import { type Client, type Module } from '../types';
import Spinner from './Spinner';
import AddModuleInstanceModal from './AddModuleInstanceModal';
import ModuleInstanceDetails from './ModuleInstanceDetails';
import AddClientModal from './AddClientModal';
import ConfirmModal from './ConfirmModal';

interface ClientDetailsProps { client: Client; onBack: () => void; }

const ClientDetails: React.FC<ClientDetailsProps> = ({ client: initialClient, onBack }) => {
    const [clientData, setClientData] = useState<Client>(initialClient);
    const [dossierData, setDossierData] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState('modules');
    const [isAddModOpen, setIsAddModOpen] = useState(false);
    const [selectedModule, setSelectedModule] = useState<Module | null>(null);
    const [isEditOpen, setIsEditOpen] = useState(false);
    const [isDeleting, setIsDeleting] = useState(false);

    // Modal States
    const [showDeleteClientConfirm, setShowDeleteClientConfirm] = useState(false);
    const [docToDelete, setDocToDelete] = useState<{id: string, name: string} | null>(null);

    const fetchDossier = async () => {
        setLoading(true);
        try {
            const data = await getClientDossier(clientData.id);
            setDossierData(data);
            setClientData(data.client);
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { 
        fetchDossier(); 
    }, [initialClient.id]);

    const handleDeleteClient = async () => {
        setShowDeleteClientConfirm(false);
        setIsDeleting(true);
        try {
            await deleteClient(clientData.id);
            onBack();
        } catch (e: any) {
            console.error(e);
            alert("Error al eliminar: " + (e.message || "Error desconocido."));
            setIsDeleting(false);
        }
    };

    const handleDeleteDocument = async () => {
        if (!docToDelete) return;
        try {
            await deleteDocument(docToDelete.id);
            setDocToDelete(null);
            fetchDossier();
        } catch (error: any) {
            console.error("Error deleting document:", error);
            alert("No se pudo eliminar el documento.");
        }
    };

    if (loading) return <div className="flex justify-center p-10"><Spinner /></div>;
    if (selectedModule) return <ModuleInstanceDetails moduleInstance={selectedModule} history={dossierData.tickets.filter((t:any) => t.moduleId === selectedModule.id)} onBack={() => setSelectedModule(null)} />;

    return (
        <div className="flex flex-col h-full bg-slate-50 rounded-lg shadow-sm border">
            <div className="p-6 bg-white border-b">
                <div className="flex justify-between items-center mb-4">
                    <button onClick={onBack} className="text-sm text-slate-500 hover:text-sky-600">&larr; Volver</button>
                    <div className="flex gap-2">
                        <button 
                            onClick={() => setShowDeleteClientConfirm(true)} 
                            disabled={isDeleting}
                            className="text-sm text-red-600 font-medium border border-red-200 bg-red-50 hover:bg-red-100 px-3 py-1 rounded flex items-center"
                        >
                            {isDeleting ? <span className="flex items-center"><Spinner /> Borrando...</span> : 'Eliminar Cliente'}
                        </button>
                        <button onClick={() => setIsEditOpen(true)} className="text-sm text-sky-600 font-medium border px-3 py-1 rounded hover:bg-slate-50">Editar</button>
                    </div>
                </div>
                <h1 className="text-3xl font-bold text-slate-800">{clientData.name}</h1>
                <div className="mt-2 grid grid-cols-3 gap-4 text-sm"><p>Email: {clientData.email}</p><p>Tel: {clientData.phone}</p><p>Dirección: {clientData.address}</p></div>
            </div>
            <div className="flex border-b bg-white px-6"><button onClick={() => setActiveTab('modules')} className={`px-6 py-4 font-medium border-b-2 ${activeTab === 'modules' ? 'border-sky-600 text-sky-600' : 'border-transparent'}`}>Módulos</button><button onClick={() => setActiveTab('docs')} className={`px-6 py-4 font-medium border-b-2 ${activeTab === 'docs' ? 'border-sky-600 text-sky-600' : 'border-transparent'}`}>Documentos</button></div>
            <div className="p-6 flex-1 overflow-y-auto">
                {activeTab === 'modules' && (
                    <div>
                        <div className="flex justify-end mb-4"><button onClick={() => setIsAddModOpen(true)} className="bg-sky-600 text-white px-4 py-2 rounded hover:bg-sky-700">Asociar Módulo</button></div>
                        <div className="grid grid-cols-2 gap-6">{dossierData.modules.map((m:any) => (<div key={m.id} onClick={() => setSelectedModule(m)} className="bg-white p-5 rounded-lg border shadow-sm cursor-pointer hover:shadow-md"><h3 className="text-lg font-bold">{m.modelName}</h3><p className="text-sm text-slate-500">Serial: {m.serialNumber}</p></div>))}</div>
                    </div>
                )}
                {activeTab === 'docs' && (
                    <div className="grid grid-cols-3 gap-4">
                        {dossierData.documents.map((d:any) => (
                            <div key={d.id} className="bg-white p-4 rounded border flex justify-between items-start relative">
                                <div>
                                    <h4 className="font-bold truncate pr-6" title={d.name}>{d.name}</h4>
                                    <a href={d.url} target="_blank" className="text-sky-600 text-sm hover:underline">Ver Archivo</a>
                                </div>
                                <button 
                                    onClick={(e) => { e.preventDefault(); e.stopPropagation(); setDocToDelete({id: d.id, name: d.name}); }}
                                    className="text-red-500 hover:text-red-700 p-1 bg-white hover:bg-red-50 rounded border border-transparent hover:border-red-100 absolute top-2 right-2"
                                    title="Eliminar documento"
                                >
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                    </svg>
                                </button>
                            </div>
                        ))}
                    </div>
                )}
            </div>
            {isAddModOpen && <AddModuleInstanceModal clientId={clientData.id} onClose={() => setIsAddModOpen(false)} onSuccess={() => { setIsAddModOpen(false); fetchDossier(); }} />}
            {isEditOpen && <AddClientModal onClose={() => setIsEditOpen(false)} onClientAdded={() => { setIsEditOpen(false); fetchDossier(); }} clientToEdit={clientData} />}
            
            <ConfirmModal 
                isOpen={showDeleteClientConfirm}
                title="Eliminar Cliente"
                message={`¿Estás seguro de que deseas eliminar a ${clientData.name}?\n\nEsta acción borrará PERMANENTEMENTE:\n• El cliente\n• Todos sus módulos\n• Todos sus tickets\n• Todos sus documentos`}
                confirmText="Sí, Eliminar Todo"
                isDestructive={true}
                onConfirm={handleDeleteClient}
                onCancel={() => setShowDeleteClientConfirm(false)}
            />

            <ConfirmModal 
                isOpen={!!docToDelete}
                title="Eliminar Documento"
                message={`¿Eliminar el documento "${docToDelete?.name}"?`}
                confirmText="Eliminar"
                isDestructive={true}
                onConfirm={handleDeleteDocument}
                onCancel={() => setDocToDelete(null)}
            />
        </div>
    );
};
export default ClientDetails;