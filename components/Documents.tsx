import React, { useState, useEffect } from 'react';
import { getAllDocuments } from '../services/supabaseService';
import { type Document } from '../types';
import Spinner from './Spinner';
import AddDocumentModal from './AddDocumentModal';

interface PopulatedDocument extends Document { moduleSerial: string; clientName: string; }

const Documents: React.FC = () => {
    const [documents, setDocuments] = useState<PopulatedDocument[]>([]);
    const [loading, setLoading] = useState(true);
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);

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
                    <div key={doc.id} className="bg-white rounded-2xl p-6 shadow-sm border hover:shadow-xl transition-all text-center">
                        <div className="h-20 w-20 bg-slate-50 rounded-2xl flex items-center justify-center mb-4 mx-auto"><span className="text-4xl">📄</span></div>
                        <h3 className="text-lg font-bold truncate" title={doc.name}>{doc.name}</h3>
                        <p className="text-xs text-slate-400 mt-1">{new Date(doc.uploadedAt).toLocaleDateString()}</p>
                        <a href={doc.url} target="_blank" rel="noopener noreferrer" className="block w-full py-2 mt-4 border rounded text-sky-600 font-bold hover:bg-sky-50">Ver Archivo</a>
                    </div>
                ))}
            </div>
            {isAddModalOpen && <AddDocumentModal onClose={() => setIsAddModalOpen(false)} onDocumentAdded={fetchDocuments} />}
        </div>
    );
};
export default Documents;