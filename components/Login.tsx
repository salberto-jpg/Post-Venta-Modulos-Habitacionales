
import React, { useState } from 'react';
import { signIn } from '../services/supabaseService';
import Spinner from './Spinner';

interface LoginProps {
    onLoginSuccess: () => void;
}

const Login: React.FC<LoginProps> = ({ onLoginSuccess }) => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError('');
        try {
            await signIn(email, password);
            onLoginSuccess();
        } catch (err: any) {
            console.error(err);
            if (err.message === 'Invalid login credentials') {
                setError('Credenciales incorrectas. Si es la primera vez, asegúrese de haber creado el usuario y ejecutado el script SQL.');
            } else if (err.message && err.message.includes('Email not confirmed')) {
                setError('Tu correo electrónico no ha sido confirmado.');
            } else {
                // Fix: Ensure we don't render [object Object]
                const msg = err?.message || (typeof err === 'object' ? JSON.stringify(err) : String(err));
                setError(msg || 'Error de autenticación desconocido.');
            }
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-slate-200 flex flex-col justify-center items-center p-4">
            <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden">
                <div className="bg-slate-800 p-10 flex justify-center items-center">
                    <img 
                        src="https://metallo.com.ar/wp-content/uploads/2024/09/LOGO-GREEN-BOX_Mesa-de-trabajo-1.png" 
                        alt="Green Box Logo" 
                        className="w-full max-w-[280px] h-auto object-contain bg-white rounded-xl p-4 shadow-lg" 
                    />
                </div>
                
                <div className="p-8">
                    <form onSubmit={handleSubmit} className="space-y-6">
                        <div>
                            <label className="block text-sm font-bold text-slate-700 mb-1">Correo Electrónico</label>
                            <input 
                                type="email" 
                                value={email} 
                                onChange={e => setEmail(e.target.value)}
                                className="w-full px-4 py-3 rounded-lg border border-slate-300 focus:ring-2 focus:ring-sky-500 focus:border-sky-500 outline-none transition-all"
                                placeholder="usuario@greenbox.com"
                                required 
                            />
                        </div>
                        
                        <div>
                            <label className="block text-sm font-bold text-slate-700 mb-1">Contraseña</label>
                            <input 
                                type="password" 
                                value={password} 
                                onChange={e => setPassword(e.target.value)}
                                className="w-full px-4 py-3 rounded-lg border border-slate-300 focus:ring-2 focus:ring-sky-500 focus:border-sky-500 outline-none transition-all"
                                placeholder="••••••••"
                                required 
                            />
                        </div>

                        {error && (
                            <div className="bg-red-50 text-red-600 p-3 rounded-lg text-xs font-medium border border-red-200 flex items-start animate-in fade-in slide-in-from-top-2">
                                <svg className="h-5 w-5 mr-2 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                                <span className="break-words">{error}</span>
                            </div>
                        )}

                        <button 
                            type="submit" 
                            disabled={loading}
                            className="w-full bg-slate-900 hover:bg-slate-800 text-white font-bold py-3 rounded-lg shadow-lg hover:shadow-xl transition-all flex justify-center items-center"
                        >
                            {loading ? <Spinner /> : 'Iniciar Sesión'}
                        </button>
                    </form>
                    
                    <div className="mt-6 text-center text-xs text-slate-400">
                        &copy; {new Date().getFullYear()} Green Box Módulos. Acceso restringido.
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Login;
