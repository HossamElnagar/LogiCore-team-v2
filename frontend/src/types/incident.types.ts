import { UserRole } from "./user.types";

export type IncidentStatus = "OPEN" | "IN_PROGRESS" | "RESOLVED" | "CLOSED";
export type IncidentSeverity = "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
export type IncidentEntityType = "SHIPMENT" | "VEHICLE" | "DRIVER" | "WAREHOUSE";

export interface IncidentUser {
  _id: string;
  userName?: string;
  name?: string;
  email: string;
  role: UserRole | string;
  phone?: string;
  isOnline?: boolean;
}

export interface IncidentShipment {
  _id: string;
  trackingNumber: string;
  customerName?: string;
  deliveryAddress?: string;
  status?: string;
}

export interface Incident {
  _id: string;
  companyId: string;
  title: string;
  description: string;
  severity: IncidentSeverity;
  status: IncidentStatus;
  reason?: string;
  relatedEntityType?: IncidentEntityType | string;
  relatedEntityId?: string;
  reportedBy?: string | IncidentUser;
  assignedTo?: string | IncidentUser;
  chatRoomId?: string;
  shipmentId?: string | IncidentShipment;
  escalatedByManager?: boolean;
  escalatedBy?: string | IncidentUser;
  attachments?: string[];
  proofImage?: string;
  resolvedAt?: string;
  metadata?: {
    driverLat?: number;
    driverLng?: number;
    vehicleNumber?: string;
    vehicleType?: string;
    branchName?: string;
    branchLocation?: string;
    [key: string]: unknown;
  };
  createdAt: string;
  updatedAt: string;
}

export interface ChatMessage {
  _id?: string;
  roomId: string;
  senderId: string;
  senderName: string;
  senderRole: string;
  text: string;
  proofDocUrl?: string;
  timestamp?: string | number | Date;
  createdAt?: string;
}

export interface BranchManager {
  _id: string;
  userName: string;
  email: string;
  phone?: string;
  role: UserRole | string;
  isOnline?: boolean;
  departmentId?: string | { _id: string; name?: string; location?: string };
  branchName?: string;
  branchLocation?: string;
  lastSeen?: string;
}

export interface EscalationEvent {
  incidentId: string;
  managerId: string;
  issueTitle: string;
  chatRoomId?: string;
  escalatedBy?: string;
  timestamp?: string;
}

export interface IncidentChatRoom {
  _id: string;
  companyId: string;
  type: "INCIDENT" | "DIRECT" | "GROUP";
  participants: (string | IncidentUser)[];
  incidentId?: string | {
    _id: string;
    title: string;
    severity: IncidentSeverity;
    status: IncidentStatus;
    description?: string;
    reportedBy?: string | { _id: string; userName: string };
  };
  title?: string | null;
  createdById?: string | IncidentUser | null;
  createdAt?: string;
  updatedAt?: string;
}
