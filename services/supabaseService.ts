
import { supabase } from './supabaseClient';
import { type Client, type Module, type Ticket, type Document, type ModuleType, TicketStatus, Priority, type UserProfile, type UserRole } from '../types';

// --- AUTHENTICATION ---

export const signIn = async (email: string, password: string) => {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;
    return data;
};

export const signUp = async (email: string, password: string, fullName: string) => {
    const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
            data: {
                full_name: fullName,
            }
        }
    });
    if (error) throw error;
    return data;
};

export const signOut = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
};

export const updateUserPassword = async (newPassword: string): Promise<void> => {
    const { error: authError } = await supabase.auth.updateUser({ password: newPassword });
    if (authError) throw authError;

    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
        const { error: dbError } = await supabase
            .from('profiles')
            .update({ must_change_password: false })
            .eq('id', user.id);
        
        if (dbError) console.error("Error updating profile flag:", dbError);
    }
};

export const getCurrentUserProfile = async (): Promise<UserProfile | null> => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return null;

    const { data: profile, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();

    if (error || !profile) {
        return {
            id: user.id,
            email: user.email || '',
            role: 'admin', 
            name: user.user_metadata?.full_name || 'Usuario',
            mustChangePassword: false 
        };
    }

    return {
        id: user.id,
        email: user.email || '',
        role: profile.role as UserRole,
        name: profile.full_name,
        mustChangePassword: profile.must_change_password
    };
};

export const getAllProfiles = async (): Promise<UserProfile[]> => {
    const { data, error } = await supabase.from('profiles').select('*');
    if (error) {
        console.warn("Error al obtener perfiles:", error);
        return [];
    }
    return data.map((p: any) => ({
        id: p.id,
        email: p.email || 'N/A', 
        role: p.role || 'user',
        name: p.full_name || 'Sin Nombre'
    }));
};

const sanitizeFileName = (name: string) => {
    return name.normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-zA-Z0-9.-]/g, "_");
};

export const uploadFileToStorage = async (file: File | Blob, bucket: string, path: string): Promise<string> => {
    try {
        const { data, error } = await supabase.storage
            .from(bucket)
            .upload(path, file, { cacheControl: '3600', upsert: false });
        if (error) throw error;
        const { data: { publicUrl } } = supabase.storage.from(bucket).getPublicUrl(path);
        return publicUrl;
    } catch (e) {
        console.error("Storage upload failed", e);
        return 'https://via.placeholder.com/150';
    }
};

// --- TICKETS ---
export const getDashboardStats = async () => {
    try {
        const { count: newTickets, error: e1 } = await supabase.from('tickets').select('*', { count: 'exact', head: true }).eq('status', TicketStatus.New);
        if (e1) console.error("Error stats tickets:", e1);

        const { count: scheduled } = await supabase.from('tickets').select('*', { count: 'exact', head: true }).eq('status', TicketStatus.Scheduled);
        const { count: totalClients } = await supabase.from('clients').select('*', { count: 'exact', head: true });
        const { count: totalModules } = await supabase.from('modules').select('*', { count: 'exact', head: true });
        
        return { 
            newTickets: newTickets || 0,
            pendingMaintenance: scheduled || 0,
            totalClients: totalClients || 0, 
            totalModules: totalModules || 0 
        };
    } catch (e) {
        console.error("Stats fetch crashed", e);
        return { newTickets: 0, pendingMaintenance: 0, totalClients: 0, totalModules: 0 };
    }
};

export const getRecentTickets = async (limit = 5): Promise<Ticket[]> => {
    const { data, error } = await supabase
        .from('tickets')
        .select('*, modules ( warrantyExpiration )')
        .order('createdAt', { ascending: false })
        .limit(limit);
        
    if (error) {
        console.error("Error getRecentTickets:", error);
        return [];
    }

    if (data) {
        return data.map((t: any) => ({
            ...t,
            warrantyExpiration: t.modules?.warrantyExpiration
        })) as Ticket[];
    }
    return [];
};

export const getAllTickets = async (): Promise<Ticket[]> => {
    const { data, error } = await supabase
        .from('tickets')
        .select('*, modules ( warrantyExpiration )')
        .order('createdAt', { ascending: false });
        
    if (error) {
        console.error("Error getAllTickets:", error);
        return [];
    }
        
    if (data) {
        return data.map((t: any) => ({
            ...t,
            warrantyExpiration: t.modules?.warrantyExpiration
        })) as Ticket[];
    }
    return [];
};

export const createTicket = async (data: any, audioBlob?: Blob): Promise<Ticket> => {
    let clientName = 'N/A'; let moduleSerial = 'N/A';
    
    if (data.clientId) {
        const { data: client } = await supabase.from('clients').select('name').eq('id', data.clientId).single();
        if (client) clientName = client.name;
    }
    
    if (data.moduleId) {
        const { data: module } = await supabase.from('modules').select('serialNumber, latitude, longitude, address').eq('id', data.moduleId).single();
        if (module) {
            moduleSerial = module.serialNumber;
            if (!data.latitude && module.latitude) data.latitude = module.latitude;
            if (!data.longitude && module.longitude) data.longitude = module.longitude;
            if (!data.address && module.address) data.address = module.address;
        }
    }

    let audioUrl = null;
    if (audioBlob) {
        const fileName = `tickets/audio/${Date.now()}_voice_note.webm`;
        audioUrl = await uploadFileToStorage(audioBlob, 'files', fileName);
    }

    const newTicket = { 
        ...data, 
        audioUrl,
        status: TicketStatus.New, 
        clientName, 
        moduleSerial, 
        createdAt: new Date().toISOString() 
    };

    const { data: created, error } = await supabase.from('tickets').insert(newTicket).select().single();
    if (error) {
        console.error("Error creando ticket:", error);
        throw error;
    }
    return created as Ticket;
};

export const updateTicketStatus = async (ticketId: string, status: TicketStatus): Promise<void> => {
    const updateData: any = { status };
    if (status !== TicketStatus.Scheduled) updateData.scheduledDate = null;
    await supabase.from('tickets').update(updateData).eq('id', ticketId);
};

export const updateTicket = async (id: string, data: Partial<Ticket>): Promise<void> => {
    const { error } = await supabase.from('tickets').update(data).eq('id', id);
    if (error) throw error;
};

export const deleteTicket = async (id: string): Promise<void> => {
    const { error } = await supabase.from('tickets').delete().eq('id', id);
    if (error) throw new Error(`Error Supabase: ${error.message} (Código: ${error.code})`);
};

export const scheduleTicket = async (ticketId: string, date: string): Promise<void> => {
    await supabase.from('tickets').update({ status: TicketStatus.Scheduled, scheduledDate: date }).eq('id', ticketId);
};

// --- CLIENTS ---
export const getAllClients = async (): Promise<Client[]> => {
    const { data, error } = await supabase.from('clients').select('*');
    if (error) console.error("Error getAllClients:", error);
    return (data as Client[]) || [];
};

export const getAllClientsSummary = async () => {
    const clients = await getAllClients();
    if (!clients.length) return [];

    try {
        const { data: modules } = await supabase.from('modules').select('clientId');
        const { data: tickets } = await supabase.from('tickets').select('clientId, status');
        
        return clients.map(client => ({
            ...client,
            moduleCount: modules?.filter((m: any) => m.clientId === client.id).length || 0,
            activeTickets: tickets?.filter((t: any) => t.clientId === client.id && t.status !== TicketStatus.Closed).length || 0
        }));
    } catch (e) {
        console.error("Error summary clients", e);
        return clients.map(c => ({...c, moduleCount: 0, activeTickets: 0}));
    }
};

export const getClientDossier = async (clientId: string) => {
    const { data: client } = await supabase.from('clients').select('*').eq('id', clientId).single();
    const { data: modules } = await supabase.from('modules').select('*').eq('clientId', clientId);
    
    let tickets: any[] = [];
    const { data: ticketsData, error: ticketError } = await supabase
        .from('tickets')
        .select('*, modules ( warrantyExpiration )')
        .eq('clientId', clientId)
        .order('createdAt', { ascending: false });
    
    if (!ticketError && ticketsData) {
        tickets = ticketsData.map((t: any) => ({
            ...t,
            warrantyExpiration: t.modules?.warrantyExpiration
        }));
    } else {
        const { data: simpleTickets } = await supabase.from('tickets').select('*').eq('clientId', clientId);
        tickets = simpleTickets || [];
    }
    
    const { data: allDocs } = await supabase.from('documents').select('*');
    const moduleInstanceIds = modules?.map((m: any) => m.id) || [];
    
    const documents = allDocs?.filter((d: any) => 
        d.clientId === clientId || 
        moduleInstanceIds.includes(d.moduleId)
    ) || [];
    
    return { client: client as Client, modules: (modules || []) as Module[], tickets: (tickets as Ticket[]), documents: (documents || []) as Document[] };
};

export const createClient = async (clientData: any): Promise<Client> => {
    const { data, error } = await supabase.from('clients').insert({ ...clientData, createdAt: new Date().toISOString() }).select().single();
    if (error) throw error;
    return data as Client;
};

export const updateClient = async (id: string, clientData: Partial<Client>): Promise<void> => {
    const { error } = await supabase.from('clients').update(clientData).eq('id', id);
    if (error) throw error;
};

export const deleteClient = async (id: string): Promise<void> => {
    try {
        const { data: modules } = await supabase.from('modules').select('id').eq('clientId', id);
        const moduleIds = modules?.map((m: any) => m.id) || [];
        
        await supabase.from('tickets').delete().eq('clientId', id);
        await supabase.from('documents').delete().eq('clientId', id);
        
        if (moduleIds.length > 0) {
            await supabase.from('tickets').delete().in('moduleId', moduleIds);
            await supabase.from('documents').delete().in('moduleId', moduleIds);
            await supabase.from('modules').delete().in('id', moduleIds);
        }
        
        const { error } = await supabase.from('clients').delete().eq('id', id);
        if (error) throw error;
    } catch (err: any) {
        throw new Error(err.message || "Fallo en borrado de cliente");
    }
};

// --- MODULES ---
export const getModuleDossier = async (moduleId: string) => {
    const { data: moduleData } = await supabase.from('modules').select('*').eq('id', moduleId).single();
    const { data: tickets } = await supabase.from('tickets').select('*').eq('moduleId', moduleId).order('createdAt', { ascending: false });
    const { data: documents } = await supabase.from('documents').select('*');
    
    // Filter documents safely
    const filteredDocs = documents?.filter((d: any) => 
        d.moduleId === moduleId || 
        (moduleData && d.moduleTypeId === moduleData.moduleTypeId && d.type !== 'contract')
    ) || [];
    
    return { module: moduleData as Module, tickets: (tickets || []) as Ticket[], documents: filteredDocs as Document[] };
};

export const addModuleToClient = async (clientId: string, moduleTypeId: string, serialNumber: string, installationDate: string, lat?: number, lng?: number, address?: string, deliveryDate?: string, warrantyExpiration?: string): Promise<Module> => {
    const { data: type } = await supabase.from('module_types').select('name').eq('id', moduleTypeId).single();
    const newModule = {
        clientId, 
        moduleTypeId, 
        modelName: type?.name || 'Desconocido', 
        serialNumber, 
        installationDate, 
        deliveryDate: deliveryDate || null,
        latitude: lat, 
        longitude: lng,
        address,
        warrantyExpiration: warrantyExpiration || new Date(new Date(installationDate).setFullYear(new Date(installationDate).getFullYear() + 1)).toISOString().split('T')[0],
        createdAt: new Date().toISOString()
    };
    const { data, error } = await supabase.from('modules').insert(newModule).select().single();
    if (error) throw error;
    return data as Module;
};

export const updateModule = async (id: string, moduleData: Partial<Module>): Promise<void> => {
    const { error } = await supabase.from('modules').update(moduleData).eq('id', id);
    if (error) throw error;
};

export const deleteModule = async (id: string): Promise<void> => {
    await supabase.from('tickets').delete().eq('moduleId', id);
    await supabase.from('documents').delete().eq('moduleId', id);
    const { error } = await supabase.from('modules').delete().eq('id', id);
    if (error) throw new Error(error.message);
};

export const getModulesByClientId = async (clientId: string): Promise<Module[]> => {
    const { data } = await supabase.from('modules').select('*').eq('clientId', clientId);
    return (data as Module[]) || [];
};

export const getAllModulesPopulated = async (): Promise<any[]> => {
    const { data: modules } = await supabase.from('modules').select(`*, clients (name)`);
    return modules?.map((m: any) => ({ ...m, clientName: m.clients?.name || 'Desconocido' })) || [];
};

// --- MODULE TYPES ---
export const getAllModuleTypes = async (): Promise<ModuleType[]> => {
    const { data, error } = await supabase.from('module_types').select('*');
    if (error) console.error("Error fetching module types", error);
    return (data as ModuleType[]) || [];
};

export const createModuleType = async (data: any, imageFile?: File): Promise<ModuleType> => {
    let imageUrl = '';
    if (imageFile) imageUrl = await uploadFileToStorage(imageFile, 'files', `module_types/${Date.now()}_${sanitizeFileName(imageFile.name)}`);
    const { data: created, error } = await supabase.from('module_types').insert({ ...data, imageUrl, createdAt: new Date().toISOString() }).select().single();
    if (error) throw error;
    return created as ModuleType;
};

export const updateModuleType = async (id: string, data: Partial<ModuleType>, imageFile?: File): Promise<void> => {
    const updateData: any = { ...data };
    if (imageFile) updateData.imageUrl = await uploadFileToStorage(imageFile, 'files', `module_types/${Date.now()}_${sanitizeFileName(imageFile.name)}`);
    await supabase.from('module_types').update(updateData).eq('id', id);
};

export const deleteModuleType = async (id: string): Promise<void> => {
    const { count } = await supabase.from('modules').select('*', { count: 'exact', head: true }).eq('moduleTypeId', id);
    if (count && count > 0) throw new Error(`Hay ${count} módulos de este tipo en uso. Elimínelos primero.`);
    const { error } = await supabase.from('module_types').delete().eq('id', id);
    if (error) throw new Error(error.message);
};

// --- DOCUMENTS ---
export const getAllDocuments = async (): Promise<any[]> => {
    const { data: docs, error } = await supabase.from('documents').select('*').order('uploadedAt', { ascending: false });
    if (error) {
        console.error("Error fetching docs:", error);
        return [];
    }
    
    // Attempt to map type names, handle errors if types missing
    try {
        const { data: types } = await supabase.from('module_types').select('id, name');
        const typeMap = new Map(types?.map((t: any) => [t.id, t.name]) || []);

        return docs.map((d: any) => ({
            ...d,
            modelName: d.moduleTypeId ? typeMap.get(d.moduleTypeId) : null
        }));
    } catch (e) {
        return docs;
    }
};

export const getDocumentsByModuleType = async (moduleTypeId: string): Promise<Document[]> => {
    const { data } = await supabase.from('documents').select('*').eq('moduleTypeId', moduleTypeId);
    return (data as Document[]) || [];
};

export const createDocument = async (targetId: string, targetType: string, type: string, file: File, version?: string): Promise<Document> => {
    const safeFileName = sanitizeFileName(file.name);
    const url = await uploadFileToStorage(file, 'files', `documents/${Date.now()}_${safeFileName}`);
    const newDocument: any = {
        name: file.name, type, version: version || null, url, uploadedAt: new Date().toISOString(),
        moduleId: targetType === 'module' ? targetId : null,
        moduleTypeId: targetType === 'moduleType' ? targetId : null,
        clientId: targetType === 'client' ? targetId : null
    };
    if (targetType === 'module') {
        const { data: moduleData } = await supabase.from('modules').select('clientId, moduleTypeId').eq('id', targetId).single();
        if (moduleData) { newDocument.clientId = moduleData.clientId; newDocument.moduleTypeId = moduleData.moduleTypeId; }
    }
    const { data, error } = await supabase.from('documents').insert(newDocument).select().single();
    if (error) throw error;
    return data as Document;
};

export const updateDocument = async (id: string, data: Partial<Document>, newFile?: File): Promise<string | null> => {
    const updateData: any = { ...data };
    let returnUrl = null;
    if (newFile) {
        const safeFileName = sanitizeFileName(newFile.name);
        const url = await uploadFileToStorage(newFile, 'files', `documents/${Date.now()}_${safeFileName}`);
        updateData.url = url;
        updateData.name = newFile.name;
        returnUrl = url;
    }
    const { error } = await supabase.from('documents').update(updateData).eq('id', id);
    if (error) throw error;
    return returnUrl;
};

export const duplicateDocumentRecord = async (data: { name: string, type: string, version?: string, url: string }, targetIds: { moduleTypeId?: string, clientId?: string, moduleId?: string }) => {
    const newDoc = {
        name: data.name, 
        type: data.type, 
        version: data.version || null, 
        url: data.url, 
        uploadedAt: new Date().toISOString(),
        moduleTypeId: targetIds.moduleTypeId || null, 
        moduleId: targetIds.moduleId || null, 
        clientId: targetIds.clientId || null
    };
    const { error } = await supabase.from('documents').insert(newDoc);
    if (error) throw error;
};

export const deleteDocument = async (id: string): Promise<void> => {
    const { error } = await supabase.from('documents').delete().eq('id', id);
    if (error) throw new Error(error.message);
};
