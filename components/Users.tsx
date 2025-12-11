
import React, { useState, useEffect } from 'react';
import { getAllProfiles } from '../services/supabaseService';
import { createClient } from '@supabase/supabase-js';
import { supabase, SUPABASE_URL, SUPABASE_ANON_KEY } from '../services/supabaseClient';
import { type UserProfile } from '../types';
import Spinner from './Spinner';

interface UsersProps {
    userProfile: UserProfile | null;
}

const Users: React.FC<UsersProps> = ({ userProfile }) => {
    const [users, setUsers] = useState<UserProfile[]>([]);
    const [loading, setLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [newUserEmail, setNewUserEmail] = useState('');
    const [newUserPassword, setNewUserPassword] = useState('');
    const [newUserFullName, setNewUserFullName] = useState('');
    const [isCreating, setIsCreating] = useState(false);
    const [error, setError] = useState('');

    const fetchUsers = async () => {
        setLoading(true);
        try {
            const profiles = await getAllProfiles();
            setUsers(profiles);
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchUsers();
    }, []);

    // Función de respaldo: Asegurar que el perfil exista en public.profiles
    const ensureProfileExists = async (user: any, fullName: string) => {
        try {
            // 1. Verificar si ya existe
            const { data: existing } = await supabase
                .from('profiles')
                .select('id')
                .eq('id', user.id)
                .maybeSingle();

            if (existing) return true;

            console.log("Perfil no encontrado. Creando manualmente...");

            // 2. Crear si no existe
            const { error: insertError } = await supabase
                .from('profiles')
                .insert({
                    id: user.id,
                    email: user.email,
                    full_name: fullName,
                    role: 'user',
                    must_change_password: true
                });

            if (insertError) {
                console.error("Error creando perfil manual:", insertError);
                return false;
            }
            return true;
        } catch (e) {
            console.error("Excepción en ensureProfileExists:", e);
            return false;
        }
    };

    const handleCreateUser = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setIsCreating(true);

        try {
            // Cliente temporal para registro
            const tempClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
                auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false }
            });

            // 1. Intentar registro
            const { data, error: signUpError } = await tempClient.auth.signUp({
                email: newUserEmail,
                password: newUserPassword,
                options: {
                    data: {
                        full_name: newUserFullName,
                        must_change_password: true
                    }
                }
            });

            let createdUser = data.user;

            // 2. Estrategia de Recuperación: Si falla el mail, intentamos login para obtener el usuario
            if (!createdUser && signUpError && signUpError.message.includes("confirmation email")) {
                console.warn("Fallo SMTP detectado. Intentando recuperar usuario vía login...");
                // Intentamos loguearnos para ver si el usuario se creó "por atrás"
                const { data: loginData } = await tempClient.auth.signInWithPassword({
                    email: newUserEmail,
                    password: newUserPassword
                });
                
                // Si logramos entrar (significa que Auto Confirm está ON o no se requería confirmación real)
                if (loginData.user) {
                    createdUser = loginData.user;
                }
            }

            // 3. Procesar éxito (Total o Recuperado)
            if (createdUser) {
                const profileOk = await ensureProfileExists(createdUser, newUserFullName);
                
                if (signUpError) {
                    alert(`⚠️ Aviso: El usuario se creó, pero el sistema de correos reportó un fallo ("${signUpError.message}").\n\n${profileOk ? 'El perfil fue validado correctamente.' : 'Atención: El perfil podría no aparecer en la lista.'}`);
                } else {
                    alert(`✅ Usuario ${newUserFullName} creado correctamente.`);
                }
                
                finishCreation();
                return;
            }

            // 4. Fallo total - Manejo específico de errores
            if (signUpError) {
                console.error("Detalle Error Supabase:", signUpError);

                if (signUpError.message.includes("confirmation email")) {
                    throw new Error(
                        `Error Crítico de SMTP (Correos):\n` +
                        `El usuario no pudo ser finalizado porque Supabase falló al enviar el email de confirmación y su configuración requiere validación.\n\n` +
                        `Solución:\n` +
                        `1. Revise los logs de Supabase o límites de correo.\n` +
                        `2. Desactive "Confirm Email" en Supabase Auth si es un entorno de pruebas.\n` +
                        `3. O cree el usuario manualmente desde el panel de Supabase.`
                    );
                }
                
                if (signUpError.message.includes("already registered")) {
                    throw new Error("Este correo electrónico ya está registrado en el sistema.");
                }

                throw signUpError;
            }
            
            throw new Error("Error desconocido: No se recibieron datos del usuario.");

        } catch (err: any) {
            console.error("Error en creación:", err);
            const msg = err.message || (typeof err === 'object' ? JSON.stringify(err) : String(err));
            setError(msg);
        } finally {
            setIsCreating(false);
        }
    };

    const finishCreation = () => {
        setIsModalOpen(false);
        setNewUserEmail('');
        setNewUserPassword('');
        setNewUserFullName('');
        setTimeout(fetchUsers, 1500);
    };

    if (loading) return <div className="flex justify-center items-center h-full"><Spinner /></div>;

    return (
        <div>
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
                <div>
                    <h2 className="text-4xl md:text-7xl font-black text-slate-800 tracking-tight">Usuarios</h2>
                    <p className="text-slate-500 font-medium mt-1">Gestión de acceso y administradores</p>
                </div>
                {userProfile?.role === 'admin' && (
                    <button 
                        onClick={() => setIsModalOpen(true)} 
                        className="bg-slate-900 text-white px-6 py-3 rounded-xl font-bold shadow-lg hover:bg-slate-700 transition-colors self-end md:self-auto flex items-center"
                    >
                        <span className="text-xl mr-2">+</span> Nuevo Usuario
                    </button>
                )}
            </div>

            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
                <table className="min-w-full divide-y divide-slate-200">
                    <thead className="bg-slate-50">
                        <tr>
                            <th scope="col" className="px-6 py-4 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">Nombre</th>
                            <th scope="col" className="px-6 py-4 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">Email</th>
                            <th scope="col" className="px-6 py-4 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">Rol</th>
                            <th scope="col" className="px-6 py-4 text-right text-xs font-bold text-slate-500 uppercase tracking-wider">Estado</th>
                        </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-slate-200">
                        {users.map((user) => (
                            <tr key={user.id} className="hover:bg-slate-50 transition-colors">
                                <td className="px-6 py-4 whitespace-nowrap">
                                    <div className="flex items-center">
                                        <div className="flex-shrink-0 h-10 w-10 bg-sky-100 rounded-full flex items-center justify-center text-sky-700 font-bold text-lg border border-sky-200">
                                            {user.name?.charAt(0).toUpperCase() || 'U'}
                                        </div>
                                        <div className="ml-4">
                                            <div className="text-sm font-bold text-slate-900">{user.name || 'Sin nombre'}</div>
                                            <div className="text-xs text-slate-500">ID: {user.id.substring(0, 8)}...</div>
                                        </div>
                                    </div>
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap">
                                    <div className="text-sm text-slate-600 font-medium">{user.email}</div>
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap">
                                    <span className="px-3 py-1 inline-flex text-xs leading-5 font-bold rounded-full bg-slate-100 text-slate-800 border border-slate-200 uppercase">
                                        {user.role}
                                    </span>
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-right">
                                    <span className="text-emerald-600 font-bold text-xs flex items-center justify-end">
                                        <span className="w-2 h-2 bg-emerald-500 rounded-full mr-2"></span>
                                        Activo
                                    </span>
                                </td>
                            </tr>
                        ))}
                        {users.length === 0 && (
                            <tr>
                                <td colSpan={4} className="px-6 py-10 text-center text-slate-500">
                                    No se encontraron usuarios.
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>

            {/* Modal Crear Usuario */}
            {isModalOpen && (
                <div className="fixed inset-0 bg-black bg-opacity-60 z-50 flex justify-center items-center backdrop-blur-sm" onClick={() => setIsModalOpen(false)}>
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-8 m-4" onClick={e => e.stopPropagation()}>
                        <div className="flex justify-between items-center mb-6">
                            <h3 className="text-2xl font-black text-slate-800">Registrar Usuario</h3>
                            <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-600">✕</button>
                        </div>
                        
                        <div className="bg-slate-50 border border-slate-100 p-4 rounded-lg mb-6 text-xs text-slate-600">
                            Complete los datos para dar de alta un nuevo acceso al sistema.
                        </div>

                        <form onSubmit={handleCreateUser} className="space-y-5">
                            <div>
                                <label className="block text-sm font-bold text-slate-700 mb-1">Nombre Completo</label>
                                <input 
                                    type="text" 
                                    value={newUserFullName} 
                                    onChange={e => setNewUserFullName(e.target.value)} 
                                    className="w-full border-slate-300 border p-3 rounded-xl focus:ring-2 focus:ring-sky-500 outline-none transition-all" 
                                    placeholder="Juan Pérez"
                                    required 
                                />
                            </div>
                            
                            <div>
                                <label className="block text-sm font-bold text-slate-700 mb-1">Correo Electrónico</label>
                                <input 
                                    type="email" 
                                    value={newUserEmail} 
                                    onChange={e => setNewUserEmail(e.target.value)} 
                                    className="w-full border-slate-300 border p-3 rounded-xl focus:ring-2 focus:ring-sky-500 outline-none transition-all" 
                                    placeholder="usuario@empresa.com"
                                    required 
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-bold text-slate-700 mb-1">Contraseña</label>
                                <input 
                                    type="password" 
                                    value={newUserPassword} 
                                    onChange={e => setNewUserPassword(e.target.value)} 
                                    className="w-full border-slate-300 border p-3 rounded-xl focus:ring-2 focus:ring-sky-500 outline-none transition-all" 
                                    placeholder="Min. 6 caracteres"
                                    required 
                                    minLength={6}
                                />
                            </div>

                            {error && (
                                <div className="bg-red-50 text-red-700 text-xs p-4 rounded-lg border border-red-200 whitespace-pre-wrap font-medium leading-relaxed break-words">
                                    {error}
                                </div>
                            )}

                            <div className="flex justify-end gap-3 pt-4 border-t border-slate-100 mt-2">
                                <button type="button" onClick={() => setIsModalOpen(false)} className="px-5 py-2.5 text-sm font-bold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors">Cancelar</button>
                                <button type="submit" disabled={isCreating} className="px-6 py-2.5 text-sm font-bold bg-slate-900 text-white rounded-xl hover:bg-slate-700 shadow-md transition-all disabled:opacity-70">
                                    {isCreating ? <Spinner /> : 'Crear Usuario'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Users;
