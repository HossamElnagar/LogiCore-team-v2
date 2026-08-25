export enum ShipmentStatus {
  CREATED = "CREATED",
  ASSIGNED = "ASSIGNED",
  PICKED_UP = "PICKED_UP",
  IN_TRANSIT = "IN_TRANSIT",
  DELAYED = "DELAYED",
  ARRIVED_HUB = "ARRIVED_HUB",
  OUT_FOR_DELIVERY = "OUT_FOR_DELIVERY",
  DELIVERED = "DELIVERED",
  INCIDENT = "INCIDENT",
  CANCELLED = "CANCELLED",
}

/**
 * Structured reasons for delivery exceptions (incidents).
 * Maps 1:1 to the architectural blueprint's incident categories.
 */
export enum IncidentReason {
  CLIENT_REFUSED = "CLIENT_REFUSED",
  WRONG_ADDRESS = "WRONG_ADDRESS",
  NO_ANSWER = "NO_ANSWER",
  DAMAGED = "DAMAGED",
}

export enum ShipmentEventType {
  CREATED = "CREATED",
  ASSIGNED_DRIVER = "ASSIGNED_DRIVER",
  PICKED_UP = "PICKED_UP",
  IN_TRANSIT = "IN_TRANSIT",
  DELAYED = "DELAYED",
  ARRIVED_HUB = "ARRIVED_HUB",
  OUT_FOR_DELIVERY = "OUT_FOR_DELIVERY",
  DELIVERED = "DELIVERED",
  CANCELLED = "CANCELLED",
  INCIDENT_TRIGGERED = "INCIDENT_TRIGGERED" // مضاف لدعم نظام الحوادث التلقائي للـ SLA
}

export enum PaymentMethod {
  CASH_ON_DELIVERY = "COD",
  PREPAID_ONLINE = "ONLINE"
}