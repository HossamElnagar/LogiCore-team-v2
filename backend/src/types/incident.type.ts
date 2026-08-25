export enum IncidentSeverity {
  LOW = "LOW",
  MEDIUM = "MEDIUM",
  HIGH = "HIGH",
  CRITICAL = "CRITICAL",
}

export enum IncidentStatus {
  OPEN = "OPEN",
  IN_PROGRESS = "IN_PROGRESS",
  RESOLVED = "RESOLVED",
  CLOSED = "CLOSED",
}

export enum IncidentEntityType {
  SHIPMENT = "SHIPMENT",
  VEHICLE = "VEHICLE",
  DRIVER = "DRIVER",
  WAREHOUSE = "WAREHOUSE",
}