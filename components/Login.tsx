
import React, { useState } from 'react';
import { signIn, signUp } from '../services/supabaseService';
import Spinner from './Spinner';

interface LoginProps {
    onLoginSuccess: () => void;
}

const Login: React.FC<LoginProps> = ({ onLoginSuccess }) => {
    const [isSignUp, setIsSignUp] = useState(false);
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [fullName, setFullName] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError('');
        try {
            if (isSignUp) {
                const data = await signUp(email, password, fullName);
                // Si Supabase devuelve una sesión, el usuario entró directo (Confirm email disabled)
                if (data.session) {
                    onLoginSuccess();
                } else {
                    // Si no hay sesión, se requiere confirmación
                    alert('Cuenta creada exitosamente. Se ha enviado un correo de confirmación a tu email. Por favor verifícalo antes de iniciar sesión.');
                    setIsSignUp(false);
                }
            } else {
                await signIn(email, password);
                onLoginSuccess();
            }
        } catch (err: any) {
            console.error(err);
            // Manejo de errores específicos de Supabase
            if (err.message === 'Invalid login credentials') {
                setError('Credenciales incorrectas. Verifique su correo y contraseña.');
            } else if (err.message.includes('Email not confirmed')) {
                setError('Tu correo electrónico no ha sido confirmado. Por favor revisa tu bandeja de entrada y confirma tu cuenta.');
            } else {
                setError(err.message || 'Error de autenticación.');
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
                        {isSignUp && (
                            <div>
                                <label className="block text-sm font-bold text-slate-700 mb-1">Nombre Completo</label>
                                <input 
                                    type="text" 
                                    value={fullName} 
                                    onChange={e => setFullName(e.target.value)}
                                    className="w-full px-4 py-3 rounded-lg border border-slate-300 focus:ring-2 focus:ring-sky-500 focus:border-sky-500 outline-none transition-all"
                                    placeholder="Juan Pérez"
                                    required 
                                />
                            </div>
                        )}

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
                            <div className="bg-red-50 text-red-600 p-3 rounded-lg text-sm border border-red-200 flex items-center">
                                <svg className="h-5 w-5 mr-2 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                                {error}
                            </div>
                        )}

                        <button 
                            type="submit" 
                            disabled={loading}
                            className="w-full bg-sky-600 hover:bg-sky-700 text-white font-bold py-3 rounded-lg shadow-lg hover:shadow-xl transition-all flex justify-center items-center"
                        >
                            {loading ? <Spinner /> : (isSignUp ? 'Registrarse' : 'Ingresar al Sistema')}
                        </button>
                    </form>
                    
                    <div className="mt-4 text-center">
                        <button 
                            onClick={() => { setIsSignUp(!isSignUp); setError(''); }}
                            className="text-sky-600 hover:text-sky-800 text-sm font-bold hover:underline"
                        >
                            {isSignUp ? '¿Ya tienes cuenta? Inicia Sesión' : '¿No tienes cuenta? Regístrate'}
                        </button>
                    </div>

                    <div className="mt-6 text-center text-xs text-slate-400">
                        &copy; {new Date().getFullYear()} Green Box Módulos. Todos los derechos reservados.
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Login;
