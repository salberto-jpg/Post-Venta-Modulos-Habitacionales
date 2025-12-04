import React, { useState, useEffect } from 'react';
import { getClientDossier, getAllModuleTypes } from '../services/supabaseService';
import { type Client, type Module, type Ticket, type Document } from '../types';
import Spinner from './Spinner';
import AddModuleInstanceModal from './AddModuleInstanceModal';
import ModuleInstanceDetails from './ModuleInstanceDetails';
import AddClientModal from './AddClientModal';

interface ClientDetailsProps { client: Client; onBack: () => void; }

const ClientDetails: React.FC<ClientDetailsProps> = ({ client, onBack }) => {
    const [data, setData] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState('modules');
    const [isAddModOpen, setIsAddModOpen] = useState(false);
    const [selectedModule, setSelectedModule] = useState<Module | null>(null);
    const [isEditOpen, setIsEditOpen] = useState(false);

    useEffect(() => { getClientDossier(client.id).then(setData).finally(() => setLoading(false)); }, [client.id]);

    if (loading) return <div className="flex justify-center p-10"><Spinner /></div>;
    if (selectedModule) return <ModuleInstanceDetails moduleInstance={selectedModule} history={data.tickets.filter((t:any) => t.moduleId === selectedModule.id)} onBack={() => setSelectedModule(null)} />;

    return (
        <div className="flex flex-col h-full bg-slate-50 rounded-lg shadow-sm border">
            <div className="p-6 bg-white border-b">
                <div className="flex justify-between items-center mb-4"><button onClick={onBack} className="text-sm text-slate-500">&larr; Volver</button><button onClick={() => setIsEditOpen(true)} className="text-sm text-sky-600 font-medium border px-3 py-1 rounded">Editar</button></div>
                <h1 className="text-3xl font-bold text-slate-800">{client.name}</h1>
                <div className="mt-2 grid grid-cols-3 gap-4 text-sm"><p>Email: {client.email}</p><p>Tel: {client.phone}</p><p>Dirección: {client.address}</p></div>
            </div>
            <div className="flex border-b bg-white px-6"><button onClick={() => setActiveTab('modules')} className={`px-6 py-4 font-medium border-b-2 ${activeTab === 'modules' ? 'border-sky-600 text-sky-600' : 'border-transparent'}`}>Módulos</button><button onClick={() => setActiveTab('docs')} className={`px-6 py-4 font-medium border-b-2 ${activeTab === 'docs' ? 'border-sky-600 text-sky-600' : 'border-transparent'}`}>Documentos</button></div>
            <div className="p-6 flex-1 overflow-y-auto">
                {activeTab === 'modules' && (
                    <div>
                        <div className="flex justify-end mb-4"><button onClick={() => setIsAddModOpen(true)} className="bg-sky-600 text-white px-4 py-2 rounded">Asociar Módulo</button></div>
                        <div className="grid grid-cols-2 gap-6">{data.modules.map((m:any) => (<div key={m.id} onClick={() => setSelectedModule(m)} className="bg-white p-5 rounded-lg border shadow-sm cursor-pointer hover:shadow-md"><h3 className="text-lg font-bold">{m.modelName}</h3><p className="text-sm text-slate-500">Serial: {m.serialNumber}</p></div>))}</div>
                    </div>
                )}
                {activeTab === 'docs' && (
                    <div className="grid grid-cols-3 gap-4">{data.documents.map((d:any) => (<div key={d.id} className="bg-white p-4 rounded border"><h4 className="font-bold">{d.name}</h4><a href={d.url} target="_blank" className="text-sky-600 text-sm">Ver</a></div>))}</div>
                )}
            </div>
            {isAddModOpen && <AddModuleInstanceModal clientId={client.id} onClose={() => setIsAddModOpen(false)} onSuccess={() => { setIsAddModOpen(false); }} />}
            {isEditOpen && <AddClientModal onClose={() => setIsEditOpen(false)} onClientAdded={() => { setIsEditOpen(false); }} clientToEdit={client} />}
        </div>
    );
};
export default ClientDetails;