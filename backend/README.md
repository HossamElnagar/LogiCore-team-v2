# LogiCore 🚚

> **From Shipment Tracking... to Operational Intelligence.**

LogiCore is a modern, event-driven logistics operations platform designed to provide companies with complete visibility over shipments, drivers, fleets, warehouses, incidents, and analytics in one centralized system.

Rather than using disconnected spreadsheets, phone calls, and multiple tools, LogiCore creates a **single source of truth** for the entire logistics ecosystem.

---

## 📋 Overview

Modern logistics operations often suffer from:

- ❌ Fragmented systems
- ❌ Poor visibility
- ❌ Delayed responses
- ❌ Manual workflows
- ❌ Operational incidents
- ❌ Lack of traceability

LogiCore solves these problems through a **scalable, multi-tenant, real-time architecture** that transforms operational data into actionable intelligence.

---

## ✨ Key Features

### 📦 Shipment Management
- Create and manage shipments
- Track shipment lifecycle
- ETA monitoring
- Shipment status updates
- Real-time progress visibility

### 🚗 Driver & Fleet Management
- Driver profiles
- Vehicle management
- Driver assignment
- Availability tracking
- Performance monitoring

### 🏭 Warehouse Operations
- Loading and unloading workflows
- Hub management
- Internal logistics processes
- Inventory movement visibility

### ⚡ Smart Incident Engine

> Detect and manage operational issues before they become business losses.

| Incident Type | Description |
|---|---|
| 🕐 Delivery Delays | Proactive delay detection |
| 🗺️ Route Risks | Real-time route monitoring |
| 🔁 Repeated Failures | Pattern recognition |
| 👤 Driver Incidents | Driver behavior tracking |
| 🔧 Vehicle Breakdowns | Fleet health monitoring |

---

## 📍 Shipment Timeline

Every action creates an **immutable timeline event**.

```
Shipment Created
      ↓
Assigned To Driver
      ↓
Picked Up
      ↓
Delayed
      ↓
Arrived At Hub
      ↓
Delivered ✅
```

**Benefits:**
- Full audit trail
- SLA tracking
- Historical analytics
- AI-ready data

---

## 🔴 Real-Time Operations

Powered by **Socket.io**:

- Live shipment updates
- Driver monitoring
- Instant notifications
- Incident alerts
- Real-time dashboards

> No page refresh required.

---

## ⚙️ Event-Driven Architecture

Events drive everything.

```
Shipment Delivered Event
          ↓
   Update Timeline
          ↓
Recalculate Driver Metrics
          ↓
   Send Notifications
          ↓
   Refresh Analytics
          ↓
 Check Incident Rules
```

This architecture enables:

- ✅ Scalability
- ✅ Decoupled services
- ✅ Better maintainability
- ✅ Faster development

---

## 🔐 Security

Security is built into every layer of the platform.

### Authentication
- JWT Authentication (Access Token + Refresh Token)
- Token versioning
- Refresh token rotation

### Authorization — Role-Based Access Control (RBAC)

| Role | Access Level |
|---|---|
| Owner | Full platform control |
| Admin | Company-wide management |
| Dispatcher | Shipment & driver operations |
| Warehouse Operator | Warehouse workflows |
| Driver | Personal assignments |

### Additional Security
- Company data isolation
- Multi-tenant architecture
- Password hashing with **bcrypt**
- Request validation using **Joi**
- CORS protection
- Helmet middleware
- Rate limiting
- CSRF protection
- XSS protection
- OWASP Top 10 best practices

---

## 🏗️ Architecture

LogiCore follows a clean layered architecture:

```
      Routes
        ↓
   Middlewares
        ↓
   Controllers
        ↓
     Services
        ↓
  Repositories
        ↓
     MongoDB
```

This separation improves:

- Maintainability
- Testability
- Scalability
- Code reusability

---

## 🗂️ Entity Relationship

```
Company
│
├── Users
├── Drivers
├── Vehicles
├── Warehouses
├── Shipments
│      ├── Shipment Timeline
│      └── Analytics
├── Incidents
└── Notifications
```

> Everything is connected and fully traceable.

---

## 🛠️ Tech Stack

### Backend
![Node.js](https://img.shields.io/badge/Node.js-339933?style=flat&logo=nodedotjs&logoColor=white)
![TypeScript](https://img.shields.io/badge/TypeScript-3178C6?style=flat&logo=typescript&logoColor=white)
![Express.js](https://img.shields.io/badge/Express.js-000000?style=flat&logo=express&logoColor=white)
![MongoDB](https://img.shields.io/badge/MongoDB-47A248?style=flat&logo=mongodb&logoColor=white)
![Socket.io](https://img.shields.io/badge/Socket.io-010101?style=flat&logo=socketdotio&logoColor=white)
![JWT](https://img.shields.io/badge/JWT-000000?style=flat&logo=jsonwebtokens&logoColor=white)

| Technology | Purpose |
|---|---|
| Node.js | Runtime environment |
| TypeScript | Type-safe development |
| Express.js | Web framework |
| MongoDB + Mongoose | Database & ODM |
| Socket.io | Real-time communication |
| JWT | Authentication |
| Joi | Request validation |

### Frontend
![React](https://img.shields.io/badge/React-61DAFB?style=flat&logo=react&logoColor=black)
![Redux](https://img.shields.io/badge/Redux_Toolkit-764ABC?style=flat&logo=redux&logoColor=white)
![TailwindCSS](https://img.shields.io/badge/Tailwind_CSS-06B6D4?style=flat&logo=tailwindcss&logoColor=white)

| Technology | Purpose |
|---|---|
| React | UI framework |
| Redux Toolkit | State management |
| TypeScript | Type safety |
| Tailwind CSS | Styling |
| OpenStreetMap | Maps integration |

### Security
| Tool | Purpose |
|---|---|
| Helmet | HTTP security headers |
| Bcrypt | Password hashing |
| Rate Limiter | Request throttling |
| CSRF Protection | Cross-site request forgery prevention |

---

## 🌐 Multi-Tenant Architecture

> One platform. Multiple companies. Unlimited scalability.

- Complete tenant isolation
- Independent data ownership
- Secure access control
- Company-specific users and operations

---

## 📁 Folder Structure

```
src
│
├── routes
├── middlewares
├── controllers
├── services
├── repositories
├── models
├── validations
├── sockets
├── events
├── listeners
├── utils
├── configs
├── types
└── app.ts
```

---

## 🤖 Future AI Layer

LogiCore is designed to support AI-powered capabilities:

- 🔮 Delay prediction
- 🗺️ Route risk analysis
- 👤 Driver scoring
- 💡 Operational recommendations
- 🤖 AI assistant
- 📊 Predictive analytics

---

## 💡 Why LogiCore?

> Because logistics companies don't need more dashboards. They need **operational intelligence**.

| Instead of... | LogiCore provides... |
|---|---|
| More data | Better decisions |
| Disconnected systems | One connected platform |
| Just tracking | Complete operational visibility |

---

## 🎯 Built For

- 🚛 Logistics Companies
- 🚌 Transportation Providers
- 🚗 Fleet Operators
- 🏭 Warehouses
- 🔗 Supply Chain Organizations

---

## 📄 License

This project is licensed under the **MIT License**.

---

## 👨‍💻 Author

**Hossam Hasan Ismail Mohammad**
*Junior DevOps Engineer | Full Stack Developer*

[![GitHub](https://img.shields.io/badge/GitHub-181717?style=flat&logo=github&logoColor=white)](https://github.com/HossamElnagar)
[![LinkedIn](https://img.shields.io/badge/LinkedIn-0A66C2?style=flat&logo=linkedin&logoColor=white)](https://www.linkedin.com/in/hossam-hassan-b632933a5/)

---

<div align="center">

**LogiCore** — *From Shipment Tracking to Operational Intelligence* 🚀

</div>
