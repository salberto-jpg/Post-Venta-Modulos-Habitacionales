
import React, { useState, useEffect } from 'react';
import { createClient, updateClient } from '../services/supabaseService';
import { type Client } from '../types';
import Spinner from './Spinner';

interface AddClientModalProps {
    onClose: () => void;
    onClientAdded: () => void;
    clientToEdit?: Client | null;
}

const AddClientModal: React.FC<AddClientModalProps> = ({ onClose, onClientAdded, clientToEdit }) => {
    // General Info
    const [name, setName] = useState('');
    const [fantasyName, setFantasyName] = useState('');
    
    // Contact
    const [email, setEmail] = useState('');
    const [phone, setPhone] = useState('');
    const [secondaryPhone, setSecondaryPhone] = useState('');
    const [website, setWebsite] = useState('');

    // Tax Info
    const [cuit, setCuit] = useState('');
    const [taxCondition, setTaxCondition] = useState('');

    // Location
    const [address, setAddress] = useState('');
    const [city, setCity] = useState('');
    const [province, setProvince] = useState('');
    const [country, setCountry] = useState('');
    const [zipCode, setZipCode] = useState('');
    
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');

    useEffect(() => {
        if (clientToEdit) {
            setName(clientToEdit.name);
            setFantasyName(clientToEdit.fantasyName || '');
            setEmail(clientToEdit.email);
            setPhone(clientToEdit.phone);
            setSecondaryPhone(clientToEdit.secondaryPhone || '');
            setWebsite(clientToEdit.website || '');
            setCuit(clientToEdit.cuit || '');
            setTaxCondition(clientToEdit.taxCondition || '');
            setAddress(clientToEdit.address || '');
            setCity(clientToEdit.city || '');
            setProvince(clientToEdit.province || '');
            setCountry(clientToEdit.country || '');
            setZipCode(clientToEdit.zipCode || '');
        }
    }, [clientToEdit]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!name || !email) {
            setError('Por favor, completa los campos obligatorios (Razón Social y Email).');
            return;
        }
        setError('');
        setIsLoading(true);

        const clientData: Partial<Client> = {
            name,
            fantasyName,
            email,
            phone,
            secondaryPhone,
            website,
            cuit,
            taxCondition,
            address,
            city,
            province,
            country,
            zipCode
        };

        try {
            if (clientToEdit) {
                await updateClient(clientToEdit.id, clientData);
            } else {
                await createClient(clientData as any);
            }
            onClientAdded();
            onClose();
        } catch (err) {
            setError('Hubo un error al guardar el cliente. Inténtalo de nuevo.');
            console.error(err);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-60 z-50 flex justify-center items-center" onClick={onClose}>
            <div className="bg-white rounded-lg shadow-xl w-full max-w-4xl mx-4 max-h-[90vh] flex flex-col overflow-hidden" onClick={e => e.stopPropagation()}>
                <div className="p-6 border-b border-slate-200 bg-slate-50 flex justify-between items-center shrink-0">
                    <div>
                        <h2 className="text-2xl font-bold text-slate-800">
                            {clientToEdit ? 'Editar Perfil de Cliente' : 'Alta de Nuevo Cliente'}
                        </h2>
                        <p className="text-sm text-slate-500 mt-1">Complete la ficha técnica del cliente.</p>
                    </div>
                    <button type="button" onClick={onClose} className="text-slate-400 hover:text-slate-600">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6">
                    <div className="space-y-8">
                        
                        {/* 1. Datos Generales */}
                        <section>
                            <h3 className="text-lg font-semibold text-slate-700 mb-4 border-b pb-2">1. Identificación</h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div>
                                    <label className="block text-sm font-medium text-slate-600">Razón Social / Nombre Completo *</label>
                                    <input type="text" value={name} onChange={e => setName(e.target.value)} className="mt-1 block w-full px-3 py-2 bg-white border border-slate-300 rounded-md shadow-sm focus:ring-sky-500 focus:border-sky-500" required />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-slate-600">Nombre de Fantasía</label>
                                    <input type="text" value={fantasyName} onChange={e => setFantasyName(e.target.value)} className="mt-1 block w-full px-3 py-2 bg-white border border-slate-300 rounded-md shadow-sm focus:ring-sky-500 focus:border-sky-500" />
                                </div>
                            </div>
                        </section>

                        {/* 2. Datos Fiscales y Contacto */}
                        <section>
                            <h3 className="text-lg font-semibold text-slate-700 mb-4 border-b pb-2">2. Datos Fiscales y Contacto</h3>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                <div>
                                    <label className="block text-sm font-medium text-slate-600">CUIT / ID Fiscal</label>
                                    <input type="text" value={cuit} onChange={e => setCuit(e.target.value)} className="mt-1 block w-full px-3 py-2 bg-white border border-slate-300 rounded-md shadow-sm focus:ring-sky-500 focus:border-sky-500" />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-slate-600">Condición IVA</label>
                                    <select value={taxCondition} onChange={e => setTaxCondition(e.target.value)} className="mt-1 block w-full px-3 py-2 bg-white border border-slate-300 rounded-md shadow-sm focus:ring-sky-500 focus:border-sky-500">
                                        <option value="">Seleccione...</option>
                                        <option value="Responsable Inscripto">Responsable Inscripto</option>
                                        <option value="Monotributista">Monotributista</option>
                                        <option value="Exento">Exento</option>
                                        <option value="Consumidor Final">Consumidor Final</option>
                                        <option value="Exterior">Cliente del Exterior</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-slate-600">Email Principal *</label>
                                    <input type="email" value={email} onChange={e => setEmail(e.target.value)} className="mt-1 block w-full px-3 py-2 bg-white border border-slate-300 rounded-md shadow-sm focus:ring-sky-500 focus:border-sky-500" required />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-slate-600">Teléfono Principal</label>
                                    <input type="tel" value={phone} onChange={e => setPhone(e.target.value)} className="mt-1 block w-full px-3 py-2 bg-white border border-slate-300 rounded-md shadow-sm focus:ring-sky-500 focus:border-sky-500" />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-slate-600">Teléfono Secundario</label>
                                    <input type="tel" value={secondaryPhone} onChange={e => setSecondaryPhone(e.target.value)} className="mt-1 block w-full px-3 py-2 bg-white border border-slate-300 rounded-md shadow-sm focus:ring-sky-500 focus:border-sky-500" />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-slate-600">Sitio Web</label>
                                    <input type="url" value={website} onChange={e => setWebsite(e.target.value)} placeholder="https://" className="mt-1 block w-full px-3 py-2 bg-white border border-slate-300 rounded-md shadow-sm focus:ring-sky-500 focus:border-sky-500" />
                                </div>
                            </div>
                        </section>

                        {/* 3. Ubicación */}
                        <section>
                            <h3 className="text-lg font-semibold text-slate-700 mb-4 border-b pb-2">3. Ubicación</h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-4">
                                <div className="md:col-span-2">
                                    <label className="block text-sm font-medium text-slate-600">Dirección (Calle, Número, Piso)</label>
                                    <input type="text" value={address} onChange={e => setAddress(e.target.value)} className="mt-1 block w-full px-3 py-2 bg-white border border-slate-300 rounded-md shadow-sm focus:ring-sky-500 focus:border-sky-500" />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-slate-600">País</label>
                                    <input type="text" value={country} onChange={e => setCountry(e.target.value)} className="mt-1 block w-full px-3 py-2 bg-white border border-slate-300 rounded-md shadow-sm focus:ring-sky-500 focus:border-sky-500" />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-slate-600">Provincia / Estado</label>
                                    <input type="text" value={province} onChange={e => setProvince(e.target.value)} className="mt-1 block w-full px-3 py-2 bg-white border border-slate-300 rounded-md shadow-sm focus:ring-sky-500 focus:border-sky-500" />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-slate-600">Localidad</label>
                                    <input type="text" value={city} onChange={e => setCity(e.target.value)} className="mt-1 block w-full px-3 py-2 bg-white border border-slate-300 rounded-md shadow-sm focus:ring-sky-500 focus:border-sky-500" />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-slate-600">Código Postal</label>
                                    <input type="text" value={zipCode} onChange={e => setZipCode(e.target.value)} className="mt-1 block w-full px-3 py-2 bg-white border border-slate-300 rounded-md shadow-sm focus:ring-sky-500 focus:border-sky-500" />
                                </div>
                            </div>
                        </section>

                        {error && <p className="text-red-500 text-sm text-center font-medium bg-red-50 p-2 rounded">{error}</p>}
                    </div>
                </form>

                <div className="p-6 bg-slate-50 border-t border-slate-300 flex justify-end items-center space-x-3 shrink-0">
                    <button type="button" onClick={onClose} className="px-6 py-2.5 text-sm font-medium rounded-md bg-white text-slate-700 hover:bg-slate-100 border border-slate-300 transition-colors">
                        Cancelar
                    </button>
                    <button onClick={handleSubmit} disabled={isLoading} className="px-6 py-2.5 text-sm font-medium rounded-md bg-sky-600 text-white shadow-sm hover:bg-sky-700 disabled:bg-sky-400 disabled:cursor-not-allowed flex items-center transition-colors">
                        {isLoading ? <Spinner /> : (clientToEdit ? 'Guardar Cambios' : 'Registrar Cliente')}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default AddClientModal;
