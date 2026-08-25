import api from "../../api/axios";
import type { Incident, IncidentChatRoom, ChatMessage, BranchManager } from "../../types/incident.types";

export const incidentService = {
  listIncidents: async (): Promise<Incident[]> => {
    const response = await api.get<{ success: boolean; data: Incident[] }>('/incidents');
    return response.data.data || [];
  },
  
  getIncidentById: async (id: string): Promise<Incident> => {
    const response = await api.get<{ success: boolean; data: Incident }>(`/incidents/${id}`);
    return response.data.data;
  },
  
  createIncident: async (payload: Record<string, unknown>): Promise<Incident> => {
    const response = await api.post<{ success: boolean; data: Incident }>('/incidents', payload);
    return response.data.data;
  },

  createDriverIncident: async (payload: Record<string, unknown>): Promise<Incident> => {
    const response = await api.post<{ success: boolean; data: { incident: Incident } | Incident }>('/incidents/driver', payload);
    const data = response.data.data as any;
    // Backend returns { incident, shipment, timeline } — extract incident
    return data?.incident ?? data;
  },
  
  updateIncidentStatus: async (id: string, status: string): Promise<Incident> => {
    const response = await api.patch<{ success: boolean; data: Incident }>(`/incidents/${id}/status`, { status });
    return response.data.data;
  },

  getIncidentChatRoom: async (incidentId: string): Promise<IncidentChatRoom> => {
    const response = await api.post<{ success: boolean; data: IncidentChatRoom }>(`/chat-rooms/incident/${incidentId}`);
    return response.data.data;
  },

  getChatRooms: async (type?: string): Promise<IncidentChatRoom[]> => {
    const url = type ? `/chat-rooms?type=${type}` : "/chat-rooms";
    const response = await api.get<{ success: boolean; data: IncidentChatRoom[] }>(url);
    return response.data.data || [];
  },

  getRoomMessages: async (roomId: string): Promise<ChatMessage[]> => {
    const response = await api.get<{ success: boolean; data: ChatMessage[] }>(`/chat-rooms/${roomId}/messages`);
    return response.data.data || [];
  },

  resolveChatRoom: async (roomId: string): Promise<Record<string, unknown>> => {
    const response = await api.post<{ success: boolean; data: Record<string, unknown> }>(`/chat-rooms/${roomId}/resolve`);
    return response.data.data;
  },

  escalateToManager: async (incidentId: string, managerIds: string | string[], issueTitle: string): Promise<Record<string, unknown>> => {
    const normalizedManagerIds = Array.isArray(managerIds) ? managerIds : [managerIds];
    const response = await api.post<{ success: boolean; data: Record<string, unknown> }>(`/incidents/${incidentId}/escalate-to-manager`, {
      managerIds: normalizedManagerIds,
      issueTitle,
    });
    return response.data.data;
  },

  getCompanyUsers: async (companyId: string): Promise<BranchManager[]> => {
    const response = await api.get<{ success: boolean; data: BranchManager[] }>(`/users/company/${companyId}`);
    return response.data.data || [];
  },
};