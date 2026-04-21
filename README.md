# 📂 IntelliDocX - Enterprise AI-Dynamic Document Ecosystem

![Banner](https://img.shields.io/badge/Status-Enterprise%20Grade-blueviolet?style=for-the-badge)
![Tech Stack](https://img.shields.io/badge/Stack-React%20%7C%20Node%20%7C%20Python%20%7C%20Solidity-blue?style=for-the-badge)
![Security](https://img.shields.io/badge/Security-Blockchain%20Verified-green?style=for-the-badge)

**IntelliDocX** is a next-generation Document Management System (DMS) that transforms passive storage into active intelligence. By converging **Artificial Intelligence**, **Private Blockchain**, and **Automated Workflows**, IntelliDocX provides an immutable, smart, and highly efficient ecosystem for enterprise documents.

---

## 🌟 The Core Vision
Traditional DMS solutions are passive digital filing cabinets that are insecure and rely totally on human effort for categorization and routing. IntelliDocX fixes this by providing:
- **AI-Driven Processing**: Automatically categorizes, tags, and makes content deeply searchable via vector embeddings.
- **Tamper-Proof Archiving**: Uses a Ethereum blockchain architecture to create an immutable audit trail of document history.
- **Automated Workflows**: Orchestrates complex approval workflows from simple uploads, equipped with SLA monitoring.

---

## 🏗️ Technical Architecture & Stack

IntelliDocX uses a state-of-the-art **Microservices-ready** architecture, ensuring maximum scalability and resilience.

### Frontend Application
* **Framework**: React 18, Vite.js, TypeScript.
* **State Management**: Redux Toolkit (RTK) + React Query.
* **Component Library**: Radix UI, Tailwind CSS, Framer Motion for dynamic animations.
* **Styling**: Complete glassmorphism interface, light/dark mode dynamic switching, modern curated typography.
* **Real-time**: Socket.IO client for live updates to documents and workflows without refresh.

### Backend API Services
* **Framework**: Node.js, Express.js (TypeScript).
* **Database & ORM**: PostgreSQL paired with Prisma ORM.
* **Security & Auth**: JWT (Access+Refresh Rotation), Two-Factor Authentication (2FA) via `speakeasy`, Helmet.js, rate limiting.
* **Caching & Queueing**: Redis v4 (for caching high-read routes `docs:list:...`) and BullMQ for background task processing.
* **Real-time Event Engine**: Socket.IO server pushing changes immediately to relevant tenant organizations.

### AI Processing Engine
* **Technology**: Python 3, FastAPI, PyTorch.
* **Capabilities**: 
  - PyTesseract (OCR) for extracting text.
  - NLP model inference (Transformers) for document semantic categorization.
  - Elasticsearch for high-speed indexing and vector-based meaning queries.
  - Groq AI SDK for real-time document summarization and chat logic.

### Distributed Ledger & Storage
* **Blockchain Notary**: Solidity smart contracts, Hardhat, Ganache (Local Ethereum Node) to record immutable document hashes.
* **File Storage**: MinIO (S3-compatible Object Storage), ensuring large physical files are kept securely off the database.

---

## 👥 Comprehensive User Roles & Permissions (RBAC)

IntelliDocX implements strict Level-Based Role-Based Access Control (RBAC) isolating duties effectively across the organization:

1. **SUPER_ADMIN (Level 100)**: Ultimate system access. Can bypass all manual approvals, purge system vaults, setup organizational tenants, and manage admin users.
2. **ADMIN (Level 90)**: Organizational administrators. Can access the Admin Dashboard, manage global users, configure document templates, and access system-wide Audit Logs.
3. **MANAGER (Level 80)**: Department heads. Access to Manager Dashboard. Responsible for advancing Multi-Step approval workflows. Can enforce SLAs and view departmental analytics.
4. **HR_MANAGER (Level 75)**: HR specialists who exclusively manage employee resumes, offer letters, payroll info, and onboarding compliance routes.
5. **IT_MANAGER (Level 75)**: IT resolution team holding the queue for user-submitted IT Tickets and infrastructure monitoring.
6. **TEAM_LEAD (Level 60)**: Operational team administrators holding early-stage workflow escalation duties.
7. **EMPLOYEE (Level 40)**: Core staff users. Can upload personal files, check their document status on "My Approvals", download verified documents, and engage with AI for document chat.
8. **GUEST (Level 10)**: Read-only external participants limited to viewing specifically shared files/links.

---

## ⚡ Major Features (End-to-End)

### 🧠 Auto-Intelligence & Categorization
Upload any document, and the Python-driven AI engine (FastAPI + Groq) automatically parses it. Whether it's an **Invoice**, **Contract**, **HR Policy**, or **Legal Report**, the AI detects it without manual input.

### ⛓️ Immutable Blockchain Integrity Notary
Every document uploaded and successfully verified is "anchored" onto the private Ethereum ledger. 
- **Verifiable Integrity**: Calculate the current cryptographic hash of a document and compare it to the blockchain to instantly verify it has never been altered.
- **Audit Trails**: A resilient logging system mapping document lifecycle changes onto immutable blocks.

### 🌊 Dynamic Workflow Engine (SLAs & Escalations)
Uploading a document sets off an automated approval pipeline.
- Workflows dynamically adapt to transition through **Pending Review -> Under Review -> Approved**.
- SLA Timers: If an approval sits past a defined timeframe, it is highlighted or escalated.

### 💬 IntelliBot: AI Document Interrogation
A smart AI chat system tied to individual documents. Instead of reading a 50-page contract, employees can ask "What are the termination conditions?" and receive a contextualized summary generated instantly.

---

## 🛠️ Minor & Quality of Life Features

* **Real-time Semantic Searching**: Search for "financial results" and the system will locate "Q3 Revenue Report" because it understands meanings, not just exact strings.
* **Redis Auto-Invalidation**: Whenever an item is hard-deleted, bulk-deleted, or withdrawn from the UI, the specific organization's Redis cache is immediately invalidated to prevent stale data ghosting.
* **Two-Factor Authentication (2FA)**: Fully functional QR code generation and verification utilizing `speakeasy` for uncompromising account security.
* **Zero-Touch Analytics**: Dashboards that populate multi-colored charts covering System Usage, SLA Compliance, and Storage Quotas immediately on login.
* **Bulk Asset Purging**: Admins can wipe or mass-delete documents instantly across DB and MinIO with a single click.
* **Blob-Based Local Downloads**: Viewing a document requests real-time blobs authorized by JWT Interceptors, allowing preview popups without messy physical downloads.
* **IT Ticket Generation**: Native button capabilities to route an unresolved document issue instantly into an IT Ticket support queue without leaving the page.
* **Optimistic UI Updates**: Using React best practices, the interface will remove documents immediately from the DOM while the async delete is being confirmed to ensure zero UI lag.
* **Role-Based Redirects**: Smart session routing ensuring if an HR member logs in, they land directly on `/dashboard/hr` immediately.

---

## 🚀 Deployment & Local Setup

### 🐳 The Dockerized Way (Recommended)
The entire ecosystem spans across 6+ dependent services. Docker encapsulates this effortlessly.

1.  **Clone & Configure:**
    ```bash
    git clone https://github.com/sanjaykumar258/Final_project.git
    cd Final_project
    cp .env.example .env
    ```
2.  **Spin Up Infrastructure:**
    ```bash
    docker-compose up -d
    ```
3.  **Prepare Database & Seed:**
    ```bash
    cd backend
    npx prisma migrate dev
    npx prisma db seed
    ```

### 🛠️ Manual Development Setup
If you need hot-reloading across custom service adjustments:
*   **Backend:** `cd backend && npm install && npm run dev` (Port 5000)
*   **Frontend:** `cd frontend && npm install && npm run dev` (Port 5173)
*   **AI Service:** `cd ai-service && pip install -r requirements.txt && uvicorn app.main:app --reload` (Port 8000)
*   **Dependencies:** Postgres, Redis, MinIO, and Elasticsearch must be running.

---

*IntelliDocX is more than a passive storage box—it's the smart, resilient backbone of digital trust and automated intelligence.*
