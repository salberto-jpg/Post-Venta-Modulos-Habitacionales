import { supabase } from './supabaseClient';
import { type Client, type Module, type Ticket, type Document, type ModuleType, TicketStatus, Priority } from '../types';

// Helper para subir archivos a Supabase Storage
export const uploadFileToStorage = async (file: File, bucket: string, path: string): Promise<string> => {
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
    const { count: newTickets } = await supabase.from('tickets').select('*', { count: 'exact', head: true }).eq('status', TicketStatus.New);
    const { count: inProgress } = await supabase.from('tickets').select('*', { count: 'exact', head: true }).eq('status', TicketStatus.InProgress);
    const { count: totalClients } = await supabase.from('clients').select('*', { count: 'exact', head: true });
    const { count: totalModules } = await supabase.from('modules').select('*', { count: 'exact', head: true });
    return { newTickets: newTickets || 0, pendingMaintenance: (newTickets || 0) + (inProgress || 0), totalClients: totalClients || 0, totalModules: totalModules || 0 };
};

export const getRecentTickets = async (limit = 5): Promise<Ticket[]> => {
    const { data } = await supabase.from('tickets').select('*').order('createdAt', { ascending: false }).limit(limit);
    return (data as Ticket[]) || [];
};

export const getAllTickets = async (): Promise<Ticket[]> => {
    const { data } = await supabase.from('tickets').select('*').order('createdAt', { ascending: false });
    return (data as Ticket[]) || [];
};

export const createTicket = async (data: any): Promise<Ticket> => {
    let clientName = 'N/A'; let moduleSerial = 'N/A';
    if (data.clientId) {
        const { data: client } = await supabase.from('clients').select('name').eq('id', data.clientId).single();
        if (client) clientName = client.name;
    }
    if (data.moduleId) {
        const { data: module } = await supabase.from('modules').select('serialNumber').eq('id', data.moduleId).single();
        if (module) moduleSerial = module.serialNumber;
    }
    const newTicket = { ...data, status: TicketStatus.New, clientName, moduleSerial, createdAt: new Date().toISOString() };
    const { data: created, error } = await supabase.from('tickets').insert(newTicket).select().single();
    if (error) throw error;
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
    console.log("Intentando borrar ticket:", id);
    const { error } = await supabase.from('tickets').delete().eq('id', id);
    
    if (error) {
        console.error("Error BD borrando ticket:", error);
        throw new Error(`Error Supabase: ${error.message} (Código: ${error.code})`);
    }
};

export const scheduleTicket = async (ticketId: string, date: string): Promise<void> => {
    await supabase.from('tickets').update({ status: TicketStatus.Scheduled, scheduledDate: date }).eq('id', ticketId);
};

// --- CLIENTS ---
export const getAllClients = async (): Promise<Client[]> => {
    const { data } = await supabase.from('clients').select('*');
    return (data as Client[]) || [];
};

export const getAllClientsSummary = async () => {
    const clients = await getAllClients();
    const { data: modules } = await supabase.from('modules').select('clientId');
    const { data: tickets } = await supabase.from('tickets').select('clientId, status');
    return clients.map(client => ({
        ...client,
        moduleCount: modules?.filter((m: any) => m.clientId === client.id).length || 0,
        activeTickets: tickets?.filter((t: any) => t.clientId === client.id && t.status !== TicketStatus.Closed).length || 0
    }));
};

export const getClientDossier = async (clientId: string) => {
    const { data: client } = await supabase.from('clients').select('*').eq('id', clientId).single();
    const { data: modules } = await supabase.from('modules').select('*').eq('clientId', clientId);
    const { data: tickets } = await supabase.from('tickets').select('*').eq('clientId', clientId).order('createdAt', { ascending: false });
    
    const { data: allDocs } = await supabase.from('documents').select('*');
    const moduleInstanceIds = modules?.map((m: any) => m.id) || [];
    
    const documents = allDocs?.filter((d: any) => 
        d.clientId === clientId || 
        moduleInstanceIds.includes(d.moduleId)
    ) || [];
    
    return { client: client as Client, modules: (modules || []) as Module[], tickets: (tickets || []) as Ticket[], documents: (documents || []) as Document[] };
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

// *** BORRADO EN CASCADA MANUAL DE CLIENTE ***
export const deleteClient = async (id: string): Promise<void> => {
    console.log("Iniciando proceso de borrado para Cliente ID:", id);

    try {
        // 1. Obtener módulos para saber qué borrar
        const { data: modules, error: modError } = await supabase.from('modules').select('id').eq('clientId', id);
        if (modError) console.error("Error obteniendo módulos del cliente (puede que no tenga):", modError);
        
        const moduleIds = modules?.map((m: any) => m.id) || [];
        console.log(`Encontrados ${moduleIds.length} módulos asociados.`);

        // 2. Borrar Tickets directos del cliente
        const { error: tErr } = await supabase.from('tickets').delete().eq('clientId', id);
        if (tErr) console.warn("Error limpiando tickets cliente:", tErr);

        // 3. Borrar Documentos directos del cliente
        const { error: dErr } = await supabase.from('documents').delete().eq('clientId', id);
        if (dErr) console.warn("Error limpiando docs cliente:", dErr);

        // 4. Si tiene módulos, borrar sus dependencias
        if (moduleIds.length > 0) {
            console.log("Borrando dependencias de módulos...");
            
            // Usamos Promise.all para intentar borrar en paralelo y no bloquear si uno falla
            await Promise.all([
                supabase.from('tickets').delete().in('moduleId', moduleIds),
                supabase.from('documents').delete().in('moduleId', moduleIds)
            ]);

            // Borrar los módulos en sí
            const { error: mDelErr } = await supabase.from('modules').delete().in('id', moduleIds);
            if (mDelErr) console.error("Error borrando módulos:", mDelErr);
        }

        // 5. Finalmente borrar el Cliente
        console.log("Borrando registro de cliente final...");
        const { error } = await supabase.from('clients').delete().eq('id', id);
        
        if (error) {
            console.error("CRITICAL: Error borrando cliente:", error);
            throw new Error(error.message);
        }
        console.log("Cliente borrado con éxito.");

    } catch (err: any) {
        console.error("Excepción en deleteClient:", err);
        throw new Error(err.message || "Fallo en cascada manual");
    }
};

// --- MODULES ---
export const getModuleDossier = async (moduleId: string) => {
    const { data: moduleData } = await supabase.from('modules').select('*').eq('id', moduleId).single();
    const { data: tickets } = await supabase.from('tickets').select('*').eq('moduleId', moduleId).order('createdAt', { ascending: false });
    
    const { data: documents } = await supabase.from('documents').select('*');
    const filteredDocs = documents?.filter((d: any) => 
        d.moduleId === moduleId || 
        (d.moduleTypeId === moduleData.moduleTypeId && d.type !== 'contract')
    ) || [];

    return { module: moduleData as Module, tickets: (tickets || []) as Ticket[], documents: filteredDocs as Document[] };
};

export const addModuleToClient = async (
    clientId: string, 
    moduleTypeId: string, 
    serialNumber: string, 
    installationDate: string, 
    lat?: number, 
    lng?: number,
    address?: string // Added address parameter
): Promise<Module> => {
    const { data: type } = await supabase.from('module_types').select('name').eq('id', moduleTypeId).single();
    const newModule = {
        clientId, 
        moduleTypeId, 
        modelName: type?.name || 'Desconocido', 
        serialNumber, 
        installationDate, 
        latitude: lat, 
        longitude: lng,
        address, // Save address
        warrantyExpiration: new Date(new Date(installationDate).setFullYear(new Date(installationDate).getFullYear() + 1)).toISOString().split('T')[0],
        createdAt: new Date().toISOString()
    };
    const { data, error } = await supabase.from('modules').insert(newModule).select().single();
    if (error) throw error;
    return data as Module;
};

export const updateModule = async (id: string, moduleData: Partial<Module>): Promise<void> => {
    await supabase.from('modules').update(moduleData).eq('id', id);
};

// *** BORRADO EN CASCADA MANUAL DE MODULO ***
export const deleteModule = async (id: string): Promise<void> => {
    console.log("Iniciando borrado módulo:", id);
    // 1. Borrar Tickets asociados al módulo
    await supabase.from('tickets').delete().eq('moduleId', id);
    
    // 2. Borrar Documentos asociados al módulo
    await supabase.from('documents').delete().eq('moduleId', id);

    // 3. Borrar el Módulo
    const { error } = await supabase.from('modules').delete().eq('id', id);
    if (error) {
        console.error("Error borrando módulo:", error);
        throw new Error(error.message);
    }
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
    const { data } = await supabase.from('module_types').select('*');
    return (data as ModuleType[]) || [];
};

export const createModuleType = async (data: any, imageFile?: File): Promise<ModuleType> => {
    let imageUrl = '';
    if (imageFile) imageUrl = await uploadFileToStorage(imageFile, 'files', `module_types/${Date.now()}_${imageFile.name}`);
    const { data: created, error } = await supabase.from('module_types').insert({ ...data, imageUrl, createdAt: new Date().toISOString() }).select().single();
    if (error) throw error;
    return created as ModuleType;
};

export const updateModuleType = async (id: string, data: Partial<ModuleType>, imageFile?: File): Promise<void> => {
    const updateData: any = { ...data };
    if (imageFile) updateData.imageUrl = await uploadFileToStorage(imageFile, 'files', `module_types/${Date.now()}_${imageFile.name}`);
    await supabase.from('module_types').update(updateData).eq('id', id);
};

export const deleteModuleType = async (id: string): Promise<void> => {
    // Check usage
    const { count } = await supabase.from('modules').select('*', { count: 'exact', head: true }).eq('moduleTypeId', id);
    if (count && count > 0) throw new Error(`Hay ${count} módulos de este tipo en uso. Elimínelos primero.`);

    // Delete
    const { error } = await supabase.from('module_types').delete().eq('id', id);
    if (error) throw new Error(error.message);
};

// --- DOCUMENTS ---
export const getAllDocuments = async (): Promise<any[]> => {
    const { data: docs } = await supabase.from('documents').select('*').order('uploadedAt', { ascending: false });
    return docs || [];
};

export const getDocumentsByModuleType = async (moduleTypeId: string): Promise<Document[]> => {
    const { data } = await supabase.from('documents').select('*').eq('moduleTypeId', moduleTypeId);
    return (data as Document[]) || [];
};

export const createDocument = async (targetId: string, targetType: string, type: string, file: File, version?: string): Promise<Document> => {
    const url = await uploadFileToStorage(file, 'files', `documents/${Date.now()}_${file.name}`);
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

// Updated: Returns the new URL if a file was uploaded, otherwise null
export const updateDocument = async (id: string, data: Partial<Document>, newFile?: File): Promise<string | null> => {
    const updateData: any = { ...data };
    let returnUrl = null;
    if (newFile) {
        const url = await uploadFileToStorage(newFile, 'files', `documents/${Date.now()}_${newFile.name}`);
        updateData.url = url;
        updateData.name = newFile.name;
        returnUrl = url;
    }
    const { error } = await supabase.from('documents').update(updateData).eq('id', id);
    if (error) throw error;
    return returnUrl;
};

// New function to clone a document to another model (create a new registry pointing to same URL)
export const duplicateDocumentRecord = async (data: { name: string, type: string, version?: string, url: string }, targetModuleTypeId: string) => {
    const newDoc = {
        name: data.name,
        type: data.type,
        version: data.version || null,
        url: data.url,
        uploadedAt: new Date().toISOString(),
        moduleTypeId: targetModuleTypeId,
        moduleId: null, 
        clientId: null
    };
    const { error } = await supabase.from('documents').insert(newDoc);
    if (error) throw error;
};

export const deleteDocument = async (id: string): Promise<void> => {
    const { error } = await supabase.from('documents').delete().eq('id', id);
    if (error) throw new Error(error.message);
};