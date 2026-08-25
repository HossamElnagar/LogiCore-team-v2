# LogiCore Operational Command Center Platform

## PLAN.md

> **Note:** This is Version 1.4 of the master project plan. It is
> intentionally structured to serve as the authoritative planning
> document for a Spec Kit workflow, combining a production-ready cloud deployment roadmap with localized Docker/Kubernetes staging blueprints.

# Table of Contents

1.  Executive Summary
2.  Vision
3.  Mission
4.  Business Objectives
5.  Product Scope
6.  Stakeholders
7.  Business Capabilities
8.  Technology Stack
9.  High-Level Architecture
10. Frontend Architecture
11. Backend Architecture
12. Database Architecture
13. Security Architecture
14. Communication Architecture
15. Financial Architecture
16. Development Workflow
17. Project Phases
18. Milestones
19. Risks
20. Future Roadmap

# Executive Summary

LogiCore is a cloud-native Operational Command Center built for
logistics companies. It unifies shipment operations, dispatching, live
tracking, finance, customer communication, analytics, and executive
decision-making into one multi-tenant SaaS platform.

The platform targets organizations that currently depend on
spreadsheets, fragmented WhatsApp groups, phone calls, and disconnected
legacy systems.

Its objectives are to improve operational efficiency, automate logistics
workflows, increase financial transparency, and provide executives with
real-time operational visibility.

# Vision

Build the most intelligent operational platform for logistics companies
in the MENA region.

# Mission

Digitize logistics operations through secure, scalable, real-time
software.

# Business Objectives

-   Reduce operational delays.
-   Improve SLA compliance.
-   Automate dispatching.
-   Increase customer transparency.
-   Provide complete COD reconciliation.
-   Enable executive decision support.

# Product Scope

## In Scope

-   Multi-tenant SaaS
-   Authentication & RBAC
-   Company Management
-   Shipment Lifecycle
-   Driver Operations
-   Route Optimization
-   Incident Management
-   WhatsApp Automation
-   COD Finance
-   Dashboards
-   Reports
-   Notifications

## Out of Scope (Initial Release)

-   AI Prediction
-   Native Mobile Apps
-   ERP Integrations
-   Warehouse Robotics

# Stakeholders

-   Company Owner
-   Operations Manager
-   Dispatcher
-   Driver
-   Finance Officer
-   Customer Support
-   Customer
-   Platform Administrator

# Business Capabilities

-   Identity & Access
-   Multi-Tenant Management
-   Shipment Operations
-   Fleet Operations
-   Financial Operations
-   Communication Center
-   Operations Intelligence
-   Administration
-   Enterprise Security
-   DevOps

# Technology Stack

## Frontend

-   React
-   TypeScript
-   Redux Toolkit
-   React Router
-   Bootstrap
-   React Leaflet
-   Socket.io Client

## Backend

-   Node.js
-   Express.js
-   TypeScript
-   MongoDB
-   Mongoose
-   JWT
-   Joi
-   Socket.io
-   node-cron

## DevOps

-   Docker
-   Kubernetes (Minikube Local Development & AWS EKS Production Setup)
-   Helm Charts
-   GitHub Actions (CI/CD)
-   AWS (EKS, VPC, S3, DocumentDB)
-   Terraform
-   Prometheus & Grafana (Observability stack)

## Integrations

-   Paymob
-   Vodafone Cash
-   InstaPay
-   whatsapp-web.js
-   OpenStreetMap
-   OSRM
-   PeerJS

# High-Level Architecture

Client → REST API → Controllers → Services → Repositories → MongoDB

Parallel services: - Socket.io - Background Workers - Notifications -
Payment Providers - Maps - WhatsApp

# Frontend Architecture

Feature-based architecture with reusable components, protected routing,
Redux Toolkit state management, responsive UI, offline synchronization
(IndexedDB), maps, notifications, and dashboards.

### Interactive Prototype Enhancements
- Global Arabic/English toggle with `dir="rtl"` and Cairo/Tajawal font swap
- Role-based login experience for `COMPANY_ADMIN`, `DEPARTMENT_MANAGER`, `ACCOUNTANT`, and `DRIVER`
- Owner-only departments provisioning panel for branches, hubs, and support centers
- Manager-only staff provisioning form scoped to the company workspace
- Live incident chat drawers for CS↔Driver ground exceptions and Owner↔Manager escalations

# Backend Architecture

Layered Architecture: - Controllers - Services - Repositories - Models -
Middlewares - Validators - Workers - Socket Gateway

# Database Architecture

Collections include:
- Companies
- Users (Includes embedded `unreconciledCash` ledger to track Driver COD in the street, eliminating the need for a bloated heavy relational wallet collection)
- Departments (Branches / hubs / support centers under each company)
- Shipments
- ShipmentTimelines
- Incidents
- Notifications
- Payments (For Paymob Subscription Transactions)
- Settlements (For Driver COD Daily Cash Out)
- ChatRooms (NEW: Structured chat room entity backing all messaging)
- Messages (UPDATED: Now keyed to a ChatRoom via roomId instead of shipmentId)
- AuditLogs
- Subscriptions (To track Company plan states & expiry)

### New Domain Models
- **Department:** `companyId`, `name`, `type` (`WAREHOUSE`, `CS`, `HUB`, `FINANCE`, `FLEET`), `location`, `managerId`
- **User:** `departmentId` pointer for tenant-scoped team assignment, `unreconciledCash` (running virtual wallet ledger tracking physical cash currently held by the driver)
- **ChatRoom:**
  * `companyId` — tenant isolation
  * `type` (`DIRECT` | `GROUP` | `INCIDENT`) — distinguishes 1-to-1 fleet chats, group fleet channels, and CS-driven incident decision rooms
  * `participants` (Array of User ObjectIds) — the current members of the room, dynamically injectable by CS agents for INCIDENT rooms
  * `incidentId` (Optional ObjectId ref Incident) — set only for INCIDENT-type rooms, linking the room back to its originating incident
- **Message:**
  * `roomId` (ObjectId ref ChatRoom) — replaces the previous flat shipmentId, making the room the source of truth for conversations
  * `senderId`, `senderName`, `senderRole`, `text`, `proofDocUrl`, `timestamp`
- **Incident:**
  * `chatRoomId` (ObjectId ref ChatRoom) — ties the incident directly to its live decision room
  * `shipmentId` (ObjectId ref Shipment) — direct reference retained on the incident itself to keep querying fast and simple
  * `escalatedByManager` (Boolean, default false, indexed) — flags that a CS_MANAGER has escalated the incident to the Owner/Super Admin
  * `escalatedBy` (ObjectId ref User, default null) — records who performed the escalation
  * `attachments` (Array of Strings) — photo/document proof paths collected from drivers or CS agents
- **Settlement:**
  * `shipmentIds` (Array of ObjectIds ref Shipment) — permanently links every COD shipment reconciled and cleared within that settlement session, preventing a shipment from being double-settled
- **Shipment:**
  * Removed: the large embedded `incidentDetails` object to eliminate data redundancy.
  * Added: `activeIncidentId` (ObjectId ref Incident, default null) — a clean pointer to whichever incident is currently open against the shipment, if any

*Indexes shall be defined for high-frequency query paths, including `ChatRooms.participants`, `ChatRooms.incidentId`, `Messages.roomId`, `Incidents.escalatedByManager`, `Incidents.shipmentId`, and `Settlements.shipmentIds`.*

# Security Architecture

-   JWT
-   Refresh Tokens
-   RBAC
-   CSRF
-   SSRF Protection
-   Helmet
-   Rate Limiting
-   Secure Cookies
-   OWASP Top 10

# Communication Architecture

All conversations are now backed by the `ChatRoom` entity rather than being scoped directly to a shipment. This makes it possible to represent multi-party incident discussions and driver/manager 1-to-1 or group chats as first-class, independently addressable rooms.

The platform exposes two distinct, purpose-built communication channels:

### Incident Decision Rooms (CS-Driven)
- Opened automatically as an `INCIDENT`-type `ChatRoom` whenever a `CS_AGENT` picks up an incident.
- CS agents hold exclusive power to dynamically "inject" (invite) participants into the live room — the driver, the driver's manager, or the Owner/Super Admin during escalation — via `invite_staff_to_chat` and `join_incident_chat`.
- Rooms carry an `incidentId` back-reference so the room's lifecycle is tied to the incident's resolution state.

### Direct/Group Fleet Channels (Manager-Driven)
- Private `DIRECT` (1-to-1) or `GROUP` chats between a `DRIVER_MANAGER` and their Field Drivers for day-to-day dispatch coordination.
- Created and owned by the Driver Manager, with no `incidentId` and no CS involvement — these channels are completely bypassed from the CS Incident Queue.

### Socket.io Events
- `create_chat_room` — provisions a new `DIRECT`, `GROUP`, or `INCIDENT` room
- `join_incident_chat` — joins a participant to an incident room's socket namespace
- `invite_staff_to_chat` — CS-exclusive dynamic injection of a driver, manager, or owner into a live incident room
- `send_message` — sends a message scoped to a `roomId` (replaces the old shipment-scoped message events)
- `resolve_incident_chat` — resolution handshake that closes out an incident room once the incident is marked resolved
- Multipart proof uploads through Multer into `uploads/incidents/`
- WhatsApp Automation
- Notifications
- WebRTC
- PeerJS

# Financial Architecture

-   COD Reconciliation
-   Courier Settlement
-   Paymob
-   Vodafone Cash
-   InstaPay
-   Subscription Plans (BASIC, PRO, ENTERPRISE)

### EOD (End of Day) Settlement Cycle
1. **Bulk Ingest:** Accountants bulk-import warehouse manifest data through the **Bulk CSV Ingest Area**.
2. **Collection:** Drivers carry out delivery tasks. To mark a task as completed/delivered, they must perform the OTP handshake with the customer. Once the correct OTP is verified, the shipment's status updates to `DELIVERED` and its `codAmount` is automatically added to the driver's running `unreconciledCash` ledger in their User document.
3. **Matching:** At end of day, the accountant matches collected cash against expected cash on the **Daily Cash Settlement Grid**.
4. **Settle:** On clicking "Settle", the matched `shipmentIds` are permanently attached to the newly created `Settlement` record, and the Driver's `unreconciledCash` is decremented accordingly. Since `shipmentIds` is a persistent array on the `Settlement` document, any shipment already tied to a prior settlement cannot be settled a second time.

# Development Workflow

Spec Kit lifecycle:

Constitution → Specify → Clarify → Plan → Tasks → Implement → Validate →
Document

# Project Phases

## Phase 0 --- Foundation

Engineering standards, architecture, coding conventions, testing
strategy.

## Phase 1 --- Identity & Multi-Tenant Platform
Hybrid Authentication (Traditional bcrypt + Google OAuth Gmail Sign-In), JWT & Refresh Tokens, Multi-Tenancy Isolation, Automatic Company Workspace Provisioning with Dynamic Slugs, and Subscription Plan Initialization. Also includes the Multi-Tenant User Provisioning system, ensuring users are isolated at the database level by `companyId` and restricted to their own organizational workspace.

## Phase 2 --- Logistics Operations Core & RBAC
Shipment lifecycle, timeline, audit trail, automated incidents, and Role-Based Access Control (RBAC) middleware. Predefined access layers restrict route ingress based on user role, with each role scoped to a dedicated view:

- **OWNER** — Executive Dashboard with an Escalation Hub surfacing only incidents flagged `escalatedByManager: true`, kept free of daily driver/manager chat clutter.
- **CS_MANAGER** — Global Incident Queue monitoring across the company, plus the exclusive "Escalate to Owner" action that sets `escalatedByManager` and `escalatedBy` on an Incident.
- **CS_AGENT** — Live Representative Tracker, Incident Queue, and the Dynamic Room with Participant Injection (`invite_staff_to_chat`) for incident decision rooms.
- **FINANCE_MANAGER & ACCOUNTANT** — Bulk CSV Ingest area and the Daily Cash Settlement Grid for EOD reconciliation.
- **DRIVER_MANAGER** — Fleet Profile Explorer and the Direct Multi-Channel chat client for 1-to-1/group dispatch communication with drivers.
- **DRIVER** — Tasklist and a "Create Incident" action with photo upload that automatically fires a WebSocket trigger opening the incident in the CS queue.

## Phase 3 --- Fleet Operations
Driver dashboard, live tracking, route optimization, offline mode, and dual-channel (WhatsApp + Gmail SMTP via Nodemailer) OTP triggering workflow. When status shifts to `OUT_FOR_DELIVERY`, a secure 4-digit code (5-min TTL) is dispatched. Includes rate-limiting lockout protection (locks shipment delivery attempts after 3 failed inputs) to secure the handshake.

## Phase 4 --- Financial Operations & Subscriptions
COD Virtual Wallet integration tracking driver `unreconciledCash` embedded within the User document. Immediate routing of validated COD amounts to driver running ledgers upon customer OTP validation. Courier Daily Settlement Engine (vault transfers), SaaS Subscription billing lifecycle automation, Paymob Webhooks integration, and local payment disbursal channels configuration (InstaPay, Vodafone Cash).

## Phase 5 --- Communication Center (ChatRoom Architecture)
Transitions the platform from shipment-scoped messaging to the new `ChatRoom` domain model. Socket.io live event bus for instant notifications, with real-time collaborative chats scoped to a `roomId` rather than a `shipmentId`:

- **Room provisioning:** `create_chat_room` creates `DIRECT`, `GROUP`, or `INCIDENT` rooms as appropriate; `INCIDENT` rooms are auto-created against the originating Incident and store its `incidentId`.
- **Dynamic participant injection:** CS agents use `invite_staff_to_chat` to pull a driver, driver manager, or Owner into a live incident room mid-conversation, and `join_incident_chat` to attach the invited party's socket session to the room.
- **Messaging:** `send_message` persists a Message keyed by `roomId`, decoupling chat history from any single shipment and enabling multi-party incident chats and direct/group fleet channels alike.
- **Incident resolution flow:** a resolution handshake (`resolve_incident_chat`) closes out the room once the linked Incident is marked resolved.
- Multer multipart/form file upload middleware (`uploads/incidents/`) for proof-of-delivery/damage attachments, persisted on `Incident.attachments`.
- Zero-cost Peer-to-Peer crisis calling via PeerJS.

Also includes the Dual-Ingress Incident Management pipeline:
- **Ground Ingress (Drivers):** Backend Haversine distance validation (must be within 150m of target coords) and mandatory photo upload.
- **Administrative Ingress (Managers):** Enforces multi-tenant isolation but bypasses geo-fence and photo upload rules.

## Phase 6 --- Frontend Experience

Responsive dashboards, UX, accessibility, performance.

## Phase 7 --- Analytics

KPIs, SLA, executive dashboards, reports.

## Phase 8 --- Administration

Users, companies, audit logs, feature flags.

## Phase 9 --- Security

Hardening, monitoring, OWASP validation.

## Phase 10 --- DevOps, Dockerization & Production Deployment

### 1. Dockerization & Local Staging
- [ ] Create optimized, production-ready `Dockerfile` for Backend (Node.js/Express).
- [ ] Create `Dockerfile` for Frontend (React/Vite) using Multi-stage build with Nginx for optimized production serving and custom Single Page Application (SPA) routing config.
- [ ] Build and tag Docker images locally.
- [ ] Push build artifacts to Docker Hub under staging namespaces: `hossam9hassan/tracker-backend:v1.0` and `hossam9hassan/tracker-frontend:v1.0`.

### 2. Local Kubernetes Manifests (Declarative Setup & Helm Templates)
- [ ] Implement `backend-deployment.yaml` and `backend-service.yaml` inside `track-system/templates` with active Prometheus scraping rules configured for endpoint `/metrics` on port `8000`.
- [ ] Implement `frontend-deployment.yaml` and `frontend-service.yaml` referencing `hossam9hassan/tracker-frontend:v1.0`.
- [ ] Deploy staging manifests to local cluster (Minikube) in namespace `app` using the Helm Chart.
- [ ] Verify pods, services, PVCs, and apply local Port-Forward to validate system communication and Prometheus metrics scraping.

### 3. Production Cloud Deployment (AWS & CI/CD Pipeline)
- [ ] Write declarative Infrastructure as Code (IaC) using Terraform to provision AWS resources (VPC, EKS Cluster, DocumentDB, S3 Buckets, IAM roles).
- [ ] Set up GitHub Actions CI/CD workflows to automatically trigger on push to `main`, run Jest integration tests, rebuild Docker images, push to AWS ECR, and update the Helm Chart on EKS.
- [ ] Configure production DNS routing using AWS Route 53, and secure ingress traffic with ALB Ingress Controller, TLS certificates, and AWS WAF protection.
- [ ] Establish automated database backup retention policies (AWS Backup) and centralized cluster monitoring with persistent Prometheus and Grafana instances.

# Milestones

-   Foundation Complete
-   Authentication MVP
-   Logistics Core MVP
-   Fleet Operations MVP
-   Financial Module Complete
-   Communication Center Complete
-   Dashboard Complete
-   Security Review Complete
-   Local Kubernetes Staging Verified
-   Production Cloud Deployment Live
-   Graduation Demo Ready

# Risks

-   Third-party API downtime
-   Connectivity issues
-   Payment failures
-   GPS inaccuracies
-   Security vulnerabilities

Mitigation strategies must be documented during implementation.

# Future Roadmap

-   AI Route Optimization
-   Predictive Analytics
-   Mobile Applications
-   ERP Integrations
-   IoT Devices
-   Warehouse Automation
-   Business Intelligence

The following roadmap outlines the strategic evolution of the LogiCore
Operational Command Center Platform beyond the initial production
release. Each milestone represents a future capability designed to
increase business value, operational efficiency, scalability, and
competitive advantage.

------------------------------------------------------------------------

# Phase 11 --- Artificial Intelligence

## AI Route Optimization

Implement machine learning algorithms that continuously optimize
delivery routes based on historical traffic, weather conditions,
delivery density, and courier performance.

### Objectives

-   Reduce fuel consumption
-   Improve delivery times
-   Increase courier productivity
-   Lower operational costs

Future Technologies: - Python - FastAPI - TensorFlow / PyTorch -
Scikit-learn

------------------------------------------------------------------------

## Predictive Analytics

Build predictive models capable of forecasting:

-   Delivery delays
-   Shipment demand
-   Courier workload
-   Seasonal shipment volume
-   Customer behavior
-   SLA violations

Expected Benefits

-   Better planning
-   Higher customer satisfaction
-   Lower operational risks

------------------------------------------------------------------------

# Phase 12 --- Mobile Ecosystem

Develop native mobile applications.

## Driver Application

Features

-   Offline Mode
-   Live Navigation
-   QR Code Scanning
-   Barcode Scanner
-   Digital Signature
-   Push Notifications
-   Cash Reconciliation

## Manager Application

Features

-   Live Dashboard
-   Incident Management
-   Decision Room
-   Financial Overview
-   Notifications

## Customer Application

Features

-   Shipment Tracking
-   Delivery Notifications
-   Payment
-   Support Chat

------------------------------------------------------------------------

# Phase 13 --- ERP Integrations

Integrate with enterprise resource planning systems.

Potential Integrations

-   SAP
-   Oracle ERP
-   Microsoft Dynamics 365
-   Odoo
-   Zoho

Capabilities

-   Orders Synchronization
-   Inventory Updates
-   Financial Data Exchange
-   Procurement
-   Accounting

------------------------------------------------------------------------

# Phase 14 --- IoT Platform

Introduce Internet of Things (IoT) capabilities.

Supported Devices

-   GPS Trackers
-   Smart Locks
-   Temperature Sensors
-   Fuel Sensors
-   Vehicle Telemetry
-   RFID Readers

Business Benefits

-   Real-time monitoring
-   Theft prevention
-   Cold-chain monitoring
-   Fuel diagnostics

------------------------------------------------------------------------

# Phase 15 --- Warehouse Automation

Expand LogiCore into warehouse operations.

Modules

-   Warehouse Management System (WMS)
-   Inventory Tracking
-   Barcode Management
-   QR Code Operations
-   Picking & Packing
-   Dock Scheduling
-   Stock Transfers

Future Enhancements

-   Robotics Integration
-   Automated Conveyor Systems
-   Smart Warehouses

------------------------------------------------------------------------

# Phase 16 --- Business Intelligence

Develop a comprehensive Business Intelligence platform.

Executive Dashboards

-   Revenue
-   Deliveries
-   SLA Performance
-   Courier Productivity
-   Customer Satisfaction
-   Financial KPIs

Reports

-   Daily
-   Weekly
-   Monthly
-   Quarterly
-   Annual

Visualization

-   Charts
-   Heat Maps
-   Geo Analytics
-   Operational KPIs

------------------------------------------------------------------------

# Long-Term Vision

Transform LogiCore into a complete enterprise logistics ecosystem that
combines operations management, financial control, intelligent
analytics, customer engagement, and AI-driven decision support into a
unified SaaS platform serving logistics companies across the MENA region
and beyond.

------------------------------------------------------------------------

## Success Criteria

-   Multi-country deployment
-   Multi-language support
-   AI-assisted operations
-   Enterprise-grade integrations
-   High availability architecture
-   Scalable cloud-native infrastructure
-   Predictive decision support
-   Industry-leading customer experience

# ENTERPRISE_EXPANSION.md

# Enterprise Expansion Roadmap

This document extends the LogiCore master plan with advanced enterprise
capabilities intended for future releases after the core platform
reaches production maturity.

------------------------------------------------------------------------

# Multi-Region Deployment

## Objective

Expand LogiCore into multiple countries while maintaining complete
tenant isolation.

### Features

-   Multi-region deployments
-   Regional databases
-   Automatic failover
-   Global load balancing
-   CDN support
-   Disaster recovery

Expected Benefits

-   Lower latency
-   Higher availability
-   Regulatory compliance

------------------------------------------------------------------------

# Microservices Architecture

## Objective

Gradually migrate from a modular monolith to an event-driven
microservices architecture.

Potential Services

-   Identity Service
-   Shipment Service
-   Fleet Service
-   Finance Service
-   Notification Service
-   Chat Service
-   Tracking Service
-   Analytics Service

Technologies

-   Docker
-   Kubernetes
-   RabbitMQ / Kafka
-   API Gateway

------------------------------------------------------------------------

# Event-Driven Architecture

Every business action becomes an event.

Examples

-   ShipmentCreated
-   ShipmentDelivered
-   IncidentCreated
-   PaymentCompleted
-   DriverAssigned

Benefits

-   Loose coupling
-   Better scalability
-   Easier integrations

------------------------------------------------------------------------

# Public Developer Platform

Provide APIs for partners.

Components

-   API Gateway
-   API Keys
-   Rate Limiting
-   SDKs
-   Webhooks
-   Developer Portal

------------------------------------------------------------------------

# Customer Self-Service Portal

Allow customers to manage shipments without contacting support.

Features

-   Shipment Tracking
-   Invoice Downloads
-   Support Tickets
-   Returns
-   Notifications
-   Payment History

------------------------------------------------------------------------

# ESG & Sustainability

Support environmental reporting.

KPIs

-   CO₂ emissions
-   Fuel consumption
-   Green delivery score
-   Electric fleet adoption

------------------------------------------------------------------------

# AI Copilot

Future AI assistant for managers.

Capabilities

-   Incident summaries
-   Route recommendations
-   Financial insights
-   Operational reports
-   Natural language queries

------------------------------------------------------------------------

# Digital Twin

Create a live digital representation of the logistics network.

Visualize

-   Vehicles
-   Warehouses
-   Shipments
-   Drivers
-   Incidents

------------------------------------------------------------------------

# Advanced Security

Future improvements

-   MFA
-   Passkeys
-   Device Trust
-   Zero Trust
-   SIEM Integration
-   SOC Monitoring

------------------------------------------------------------------------

# Enterprise Reporting

Executive dashboards including

-   Revenue Forecasts
-   SLA Trends
-   Driver Performance
-   Customer Satisfaction
-   Financial Forecasting
-   Operational Efficiency

------------------------------------------------------------------------

# Internationalization

Support

-   Arabic (RTL)
-   English

Future

-   French
-   Spanish
-   German
-   Turkish

------------------------------------------------------------------------

# Long-Term Product Vision

LogiCore aims to become a complete Enterprise Logistics Operating System
that combines logistics operations, finance, customer communication,
AI-driven analytics, and business intelligence into a unified
cloud-native SaaS platform serving organizations worldwide.

------------------------------------------------------------------------

# Final Vision Statement

Build a platform that enables logistics companies to operate faster,
smarter, and more efficiently while reducing operational costs,
increasing customer satisfaction, and providing executives with complete
visibility over every shipment, vehicle, employee, and financial
transaction in real time.