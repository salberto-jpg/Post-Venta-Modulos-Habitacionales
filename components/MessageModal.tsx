
import React from 'react';

export type MessageType = 'success' | 'error' | 'warning' | 'info';

interface MessageModalProps {
    isOpen: boolean;
    onClose: () => void;
    title: string;
    message: string;
    type?: MessageType;
    onConfirm?: () => void; // Si existe, muestra botón de confirmar y cancelar
    confirmText?: string;
    cancelText?: string;
}

const MessageModal: React.FC<MessageModalProps> = ({ 
    isOpen, onClose, title, message, type = 'info', 
    onConfirm, confirmText = 'Aceptar', cancelText = 'Cancelar' 
}) => {
    if (!isOpen) return null;

    // Configuración visual según el tipo
    const config = {
        success: {
            bgIcon: 'bg-emerald-100',
            textIcon: 'text-emerald-600',
            icon: (
                <svg className="h-10 w-10" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
            ),
            btnColor: 'bg-emerald-600 hover:bg-emerald-700'
        },
        error: {
            bgIcon: 'bg-red-100',
            textIcon: 'text-red-600',
            icon: (
                <svg className="h-10 w-10" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
            ),
            btnColor: 'bg-red-600 hover:bg-red-700'
        },
        warning: {
            bgIcon: 'bg-amber-100',
            textIcon: 'text-amber-600',
            icon: (
                <svg className="h-10 w-10" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
            ),
            btnColor: 'bg-amber-600 hover:bg-amber-700'
        },
        info: {
            bgIcon: 'bg-sky-100',
            textIcon: 'text-sky-600',
            icon: (
                <svg className="h-10 w-10" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
            ),
            btnColor: 'bg-sky-600 hover:bg-sky-700'
        }
    };

    const style = config[type];

    return (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[100] flex justify-center items-center p-4 animate-in fade-in duration-200" onClick={!onConfirm ? onClose : undefined}>
            <div 
                className="bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden transform transition-all scale-100 animate-in zoom-in-95 duration-200 border border-slate-100" 
                onClick={e => e.stopPropagation()}
            >
                <div className="p-6 text-center">
                    <div className={`mx-auto flex items-center justify-center h-20 w-20 rounded-full ${style.bgIcon} ${style.textIcon} mb-5 shadow-inner`}>
                        {style.icon}
                    </div>
                    
                    <h3 className="text-xl font-black text-slate-800 mb-2 leading-tight">
                        {title}
                    </h3>
                    
                    <p className="text-slate-500 text-sm leading-relaxed mb-6">
                        {message}
                    </p>

                    <div className={`flex gap-3 ${onConfirm ? 'justify-between' : 'justify-center'}`}>
                        {onConfirm && (
                            <button
                                onClick={onClose}
                                className="w-full px-4 py-3 bg-white text-slate-700 font-bold rounded-xl border border-slate-300 hover:bg-slate-50 transition-colors shadow-sm"
                            >
                                {cancelText}
                            </button>
                        )}
                        <button
                            onClick={() => {
                                if (onConfirm) onConfirm();
                                else onClose();
                            }}
                            className={`w-full px-4 py-3 text-white font-bold rounded-xl shadow-md transition-transform active:scale-95 ${style.btnColor}`}
                        >
                            {confirmText}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default MessageModal;
