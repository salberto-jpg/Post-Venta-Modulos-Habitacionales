
import React, { useState, useEffect } from 'react';

interface WarrantyConfigModalProps {
    onClose: () => void;
}

const WarrantyConfigModal: React.FC<WarrantyConfigModalProps> = ({ onClose }) => {
    const [warrantyMonths, setWarrantyMonths] = useState<number>(12);

    useEffect(() => {
        const stored = localStorage.getItem('default_warranty_months');
        if (stored) {
            setWarrantyMonths(parseInt(stored));
        }
    }, []);

    const handleSave = () => {
        localStorage.setItem('default_warranty_months', warrantyMonths.toString());
        alert("Configuración guardada correctamente.");
        onClose();
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-60 z-[90] flex justify-center items-center p-4 backdrop-blur-sm" onClick={onClose}>
            <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm overflow-hidden" onClick={e => e.stopPropagation()}>
                <div className="bg-slate-50 border-b border-slate-200 p-5">
                    <h3 className="font-black text-slate-800 text-lg">Configuración de Garantía</h3>
                    <p className="text-xs text-slate-500">Afecta a nuevos módulos registrados.</p>
                </div>
                
                <div className="p-6">
                    <label className="block text-sm font-bold text-slate-700 mb-2">Duración por Defecto (Meses)</label>
                    <div className="flex items-center">
                        <input 
                            type="number" 
                            min="0"
                            max="120"
                            value={warrantyMonths}
                            onChange={(e) => setWarrantyMonths(parseInt(e.target.value) || 0)}
                            className="w-full border-slate-300 border p-3 rounded-l-xl focus:ring-2 focus:ring-sky-500 outline-none text-center font-bold text-lg"
                        />
                        <span className="bg-slate-100 border-y border-r border-slate-300 px-4 py-3 rounded-r-xl text-slate-600 font-medium">Meses</span>
                    </div>
                    <p className="text-xs text-slate-400 mt-2 bg-blue-50 text-blue-700 p-2 rounded border border-blue-100">
                        ℹ️ Esta configuración se usará para calcular automáticamente la fecha de vencimiento al ingresar la fecha de entrega de un módulo.
                    </p>
                </div>

                <div className="p-5 border-t border-slate-200 bg-slate-50 flex justify-end gap-3">
                    <button onClick={onClose} className="px-4 py-2 text-sm font-bold text-slate-600 hover:bg-slate-200 rounded-lg transition-colors">Cancelar</button>
                    <button onClick={handleSave} className="px-6 py-2 text-sm font-bold bg-sky-600 text-white rounded-lg hover:bg-sky-700 shadow-md transition-colors">Guardar</button>
                </div>
            </div>
        </div>
    );
};

export default WarrantyConfigModal;
