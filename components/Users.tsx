
import React, { useState, useEffect } from 'react';
import { getAllProfiles, updateUserProfile, deleteUser } from '../services/supabaseService';
import { createClient } from '@supabase/supabase-js';
import { supabase, SUPABASE_URL, SUPABASE_ANON_KEY } from '../services/supabaseClient';
import { type UserProfile, type UserRole } from '../types';
import Spinner from './Spinner';
import ConfirmModal from './ConfirmModal';

interface UsersProps {
    userProfile: UserProfile | null;
}

const Users: React.FC<UsersProps> = ({ userProfile }) => {
    const [users, setUsers] = useState<UserProfile[]>([]);
    const [loading, setLoading] = useState(true);
    
    // Create Modal State
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [newUserEmail, setNewUserEmail] = useState('');
    const [newUserPassword, setNewUserPassword] = useState('');
    const [newUserFullName, setNewUserFullName] = useState('');
    const [isCreating, setIsCreating] = useState(false);
    
    // Edit Modal State
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [userToEdit, setUserToEdit] = useState<UserProfile | null>(null);
    const [editName, setEditName] = useState('');
    const [editRole, setEditRole] = useState<UserRole>('user');
    const [isUpdating, setIsUpdating] = useState(false);

    // Delete Modal State
    const [userToDelete, setUserToDelete] = useState<UserProfile | null>(null);
    const [isDeleting, setIsDeleting] = useState(false);

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

    // --- CREATE LOGIC ---
    const ensureProfileExists = async (user: any, fullName: string) => {
        try {
            const { data: existing } = await supabase.from('profiles').select('id').eq('id', user.id).maybeSingle();
            if (existing) return true;
            
            // Si el perfil no existe, lo creamos manualmente
            const { error: insertError } = await supabase.from('profiles').insert({
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
            // Cliente temporal para no cerrar la sesión del admin actual
            const tempClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, { 
                auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false } 
            });

            // 1. Intentar registro
            const { data, error: signUpError } = await tempClient.auth.signUp({
                email: newUserEmail, 
                password: newUserPassword,
                options: { data: { full_name: newUserFullName, must_change_password: true } }
            });

            let createdUser = data.user;
            let smtpErrorDetected = false;

            // 2. Análisis de Errores
            if (signUpError) {
                const msg = signUpError.message.toLowerCase();

                // Caso 1: Supabase devuelve el usuario pero avisa que falló el correo (Warning)
                if (createdUser && (msg.includes("confirmation email") || msg.includes("error sending"))) {
                    smtpErrorDetected = true;
                    console.warn("Usuario creado en Auth, pero falló SMTP:", msg);
                } 
                // Caso 2: Bloqueos reales
                else if (msg.includes("signups not allowed")) {
                    throw new Error("Supabase tiene bloqueado el registro de usuarios. Active 'Allow new users to sign up' en Authentication > Settings.");
                } else if (msg.includes("already registered")) {
                    throw new Error("Este correo ya está registrado.");
                } else {
                    // Si no hay usuario y hay error, fallamos.
                    throw signUpError;
                }
            }

            // 3. Creación del Perfil (Si el usuario existe en Auth)
            if (createdUser) {
                const profileOk = await ensureProfileExists(createdUser, newUserFullName);
                
                if (profileOk) {
                    if (smtpErrorDetected) {
                        alert(
                            `⚠️ ATENCIÓN: ERROR DE SMTP\n\n` +
                            `El usuario "${newUserFullName}" fue creado exitosamente en la base de datos.\n` +
                            `SIN EMBARGO, el sistema no pudo enviar el correo de confirmación.\n\n` +
                            `Causa Técnica: ${signUpError?.message}\n\n` +
                            `SOLUCIÓN:\n` +
                            `1. Revise la configuración SMTP en Supabase (Password de aplicación incorrecto).\n` +
                            `2. O puede confirmar el usuario manualmente desde el panel de Supabase.`
                        );
                    } else {
                        alert(`✅ Usuario creado correctamente.\nSe ha enviado un correo de confirmación a ${newUserEmail}.`);
                    }
                    finishCreation();
                    return;
                } else {
                    throw new Error("El usuario se creó en Auth, pero falló la creación del perfil en la base de datos.");
                }
            }

            throw new Error("No se pudo crear el usuario (Respuesta vacía de Supabase).");

        } catch (err: any) {
            console.error("Error creación:", err);
            const displayMsg = err.message || JSON.stringify(err);
            setError(displayMsg);
        } finally { 
            setIsCreating(false); 
        }
    };

    const finishCreation = () => {
        setIsModalOpen(false); setNewUserEmail(''); setNewUserPassword(''); setNewUserFullName('');
        setTimeout(fetchUsers, 1500);
    };

    // --- EDIT LOGIC ---
    const openEditModal = (user: UserProfile) => {
        setUserToEdit(user);
        setEditName(user.name || '');
        setEditRole(user.role);
        setIsEditModalOpen(true);
    };

    const handleUpdateUser = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!userToEdit) return;
        setIsUpdating(true);
        try {
            await updateUserProfile(userToEdit.id, { name: editName, role: editRole });
            await fetchUsers();
            setIsEditModalOpen(false);
            setUserToEdit(null);
        } catch (error: any) {
            console.error(error);
            alert("Error al actualizar usuario: " + error.message);
        } finally {
            setIsUpdating(false);
        }
    };

    // --- DELETE LOGIC ---
    const handleDeleteUser = async () => {
        if (!userToDelete) return;
        setIsDeleting(true);
        try {
            await deleteUser(userToDelete.id);
            await fetchUsers();
            setUserToDelete(null);
        } catch (error: any) {
            console.error(error);
            alert("Error al eliminar usuario: " + error.message);
        } finally {
            setIsDeleting(false);
        }
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
                            <th scope="col" className="px-6 py-4 text-right text-xs font-bold text-slate-500 uppercase tracking-wider">Acciones</th>
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
                                    <span className={`px-3 py-1 inline-flex text-xs leading-5 font-bold rounded-full uppercase border ${user.role === 'admin' ? 'bg-violet-100 text-violet-800 border-violet-200' : 'bg-slate-100 text-slate-800 border-slate-200'}`}>
                                        {user.role}
                                    </span>
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                    {userProfile?.role === 'admin' && (
                                        <div className="flex justify-end gap-2">
                                            <button onClick={() => openEditModal(user)} className="text-sky-600 hover:text-sky-900 p-2 hover:bg-sky-50 rounded-lg transition-colors" title="Editar">
                                                <PencilIcon className="h-5 w-5" />
                                            </button>
                                            {user.id !== userProfile.id && (
                                                <button onClick={() => setUserToDelete(user)} className="text-red-400 hover:text-red-700 p-2 hover:bg-red-50 rounded-lg transition-colors" title="Eliminar">
                                                    <TrashIcon className="h-5 w-5" />
                                                </button>
                                            )}
                                        </div>
                                    )}
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
                            Complete los datos para dar de alta un nuevo acceso al sistema. Se enviará un correo de confirmación.
                        </div>

                        <form onSubmit={handleCreateUser} className="space-y-5">
                            <div>
                                <label className="block text-sm font-bold text-slate-700 mb-1">Nombre Completo</label>
                                <input type="text" value={newUserFullName} onChange={e => setNewUserFullName(e.target.value)} className="w-full border-slate-300 border p-3 rounded-xl focus:ring-2 focus:ring-sky-500 outline-none transition-all" placeholder="Juan Pérez" required />
                            </div>
                            <div>
                                <label className="block text-sm font-bold text-slate-700 mb-1">Correo Electrónico</label>
                                <input type="email" value={newUserEmail} onChange={e => setNewUserEmail(e.target.value)} className="w-full border-slate-300 border p-3 rounded-xl focus:ring-2 focus:ring-sky-500 outline-none transition-all" placeholder="usuario@empresa.com" required />
                            </div>
                            <div>
                                <label className="block text-sm font-bold text-slate-700 mb-1">Contraseña</label>
                                <input type="password" value={newUserPassword} onChange={e => setNewUserPassword(e.target.value)} className="w-full border-slate-300 border p-3 rounded-xl focus:ring-2 focus:ring-sky-500 outline-none transition-all" placeholder="Min. 6 caracteres" required minLength={6} />
                            </div>
                            
                            {error && (
                                <div className="bg-red-50 text-red-700 text-xs p-4 rounded-lg border border-red-200 whitespace-pre-wrap font-medium leading-relaxed shadow-sm">
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

            {/* Modal Editar Usuario */}
            {isEditModalOpen && userToEdit && (
                <div className="fixed inset-0 bg-black bg-opacity-60 z-50 flex justify-center items-center backdrop-blur-sm" onClick={() => setIsEditModalOpen(false)}>
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-8 m-4" onClick={e => e.stopPropagation()}>
                        <div className="flex justify-between items-center mb-6">
                            <h3 className="text-2xl font-black text-slate-800">Editar Usuario</h3>
                            <button onClick={() => setIsEditModalOpen(false)} className="text-slate-400 hover:text-slate-600">✕</button>
                        </div>
                        
                        <form onSubmit={handleUpdateUser} className="space-y-5">
                            <div>
                                <label className="block text-sm font-bold text-slate-700 mb-1">Correo Electrónico</label>
                                <input type="email" value={userToEdit.email} disabled className="w-full border-slate-200 bg-slate-100 border p-3 rounded-xl text-slate-500 cursor-not-allowed" />
                                <p className="text-[10px] text-slate-400 mt-1">El correo no se puede cambiar directamente.</p>
                            </div>
                            <div>
                                <label className="block text-sm font-bold text-slate-700 mb-1">Nombre Completo</label>
                                <input type="text" value={editName} onChange={e => setEditName(e.target.value)} className="w-full border-slate-300 border p-3 rounded-xl focus:ring-2 focus:ring-sky-500 outline-none transition-all" required />
                            </div>
                            <div>
                                <label className="block text-sm font-bold text-slate-700 mb-1">Rol de Acceso</label>
                                <select value={editRole} onChange={e => setEditRole(e.target.value as UserRole)} className="w-full border-slate-300 border p-3 rounded-xl focus:ring-2 focus:ring-sky-500 outline-none transition-all bg-white">
                                    <option value="user">Usuario (Estándar)</option>
                                    <option value="admin">Administrador</option>
                                </select>
                            </div>
                            <div className="flex justify-end gap-3 pt-4 border-t border-slate-100 mt-2">
                                <button type="button" onClick={() => setIsEditModalOpen(false)} className="px-5 py-2.5 text-sm font-bold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors">Cancelar</button>
                                <button type="submit" disabled={isUpdating} className="px-6 py-2.5 text-sm font-bold bg-sky-600 text-white rounded-xl hover:bg-sky-700 shadow-md transition-all disabled:opacity-70">
                                    {isUpdating ? <Spinner /> : 'Guardar Cambios'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            <ConfirmModal 
                isOpen={!!userToDelete}
                title="Eliminar Usuario"
                message={`¿Estás seguro de que deseas eliminar al usuario "${userToDelete?.name}"?\n\nPerderá el acceso a la aplicación inmediatamente.`}
                confirmText="Sí, Eliminar"
                isDestructive={true}
                onConfirm={handleDeleteUser}
                onCancel={() => setUserToDelete(null)}
            />
        </div>
    );
};

const PencilIcon: React.FC<{className?: string}> = ({className}) => (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={className}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0115.75 21H5.25A2.25 2.25 0 013 18.75V8.25A2.25 2.25 0 015.25 6H10" />
    </svg>
);

const TrashIcon: React.FC<{className?: string}> = ({className}) => (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={className}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
    </svg>
);

export default Users;
