import { supabase } from './supabaseClient';
import { type Client, type Module, type Ticket, type Document, type ModuleType, TicketStatus, Priority } from '../types';

// Helper para subir archivos a Supabase Storage
const uploadFileToStorage = async (file: File, bucket: string, path: string): Promise<string> => {
    try {
        const { data, error } = await supabase.storage
            .from(bucket)
            .upload(path, file, { cacheControl: '3600', upsert: false });
        if (error) throw error;
        const { data: { publicUrl } } = supabase.storage.from(bucket).getPublicUrl(path);
        return publicUrl;
    } catch (e) {
        console.error("Storage upload failed", e);
        alert("Error al subir archivo a Supabase.");
        return '';
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
    
    const moduleInstanceIds = modules?.map((m: any) => m.id) || [];
    const moduleTypeIds = [...new Set(modules?.map((m: any) => m.moduleTypeId) || [])];
    const safeModuleIds = moduleInstanceIds.length > 0 ? moduleInstanceIds.join(',') : '00000000-0000-0000-0000-000000000000';
    const safeTypeIds = moduleTypeIds.length > 0 ? moduleTypeIds.join(',') : '00000000-0000-0000-0000-000000000000';
    const orCondition = `clientId.eq.${clientId},moduleId.in.(${safeModuleIds}),moduleTypeId.in.(${safeTypeIds})`;
    
    const { data: documents } = await supabase.from('documents').select('*').or(orCondition);
    
    return { client: client as Client, modules: (modules || []) as Module[], tickets: (tickets || []) as Ticket[], documents: (documents || []) as Document[] };
};

export const createClient = async (clientData: any): Promise<Client> => {
    const { data, error } = await supabase.from('clients').insert({ ...clientData, createdAt: new Date().toISOString() }).select().single();
    if (error) throw error;
    return data as Client;
};

export const updateClient = async (id: string, clientData: Partial<Client>): Promise<void> => {
    await supabase.from('clients').update(clientData).eq('id', id);
};

// --- MODULES ---
export const getModuleDossier = async (moduleId: string) => {
    const { data: moduleData } = await supabase.from('modules').select('*').eq('id', moduleId).single();
    const { data: tickets } = await supabase.from('tickets').select('*').eq('moduleId', moduleId).order('createdAt', { ascending: false });
    const typeId = moduleData.moduleTypeId;
    const orCondition = `moduleId.eq.${moduleId},moduleTypeId.eq.${typeId}`;
    const { data: documents } = await supabase.from('documents').select('*').or(orCondition);
    return { module: moduleData as Module, tickets: (tickets || []) as Ticket[], documents: (documents || []) as Document[] };
};

export const addModuleToClient = async (clientId: string, moduleTypeId: string, serialNumber: string, installationDate: string, lat?: number, lng?: number): Promise<Module> => {
    const { data: type } = await supabase.from('module_types').select('name').eq('id', moduleTypeId).single();
    const newModule = {
        clientId, moduleTypeId, modelName: type?.name || 'Desconocido', serialNumber, installationDate, latitude: lat, longitude: lng,
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
