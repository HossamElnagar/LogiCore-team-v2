export interface ShipmentSummary {
  _id: string;
  trackingNumber: string;
  customerName: string;
  customerPhone: string;
  pickupAddress: string;
  deliveryAddress: string;
  currentLocation?: string;
  status: string;
  paymentMethod?: string;
  codAmount?: number;
  assignedDriver?: string;
  estimatedDeliveryTime?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface ShipmentTimelineEntry {
  _id: string;
  shipmentId: string;
  eventType: string;
  note?: string;
  createdAt?: string;
}

export interface ShipmentDetailResponse {
  shipment: ShipmentSummary;
  timeline: ShipmentTimelineEntry[];
}

export interface ShipmentListResponse {
  success: boolean;
  data: ShipmentSummary[];
}

export interface ShipmentDetailApiResponse {
  success: boolean;
  data: ShipmentDetailResponse;
}

export interface UpdateShipmentStatusPayload {
  status: string;
  note?: string;
  actorId?: string;
}
