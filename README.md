# Military Asset Management System (MAMS) - Secure Command & Control

A secure, role-based web application designed to manage military inventory, track equipment transfers across bases, and maintain immutable audit logs of all logistical operations.

## Project Objective

This project was built to demonstrate full-stack architectural integration, specifically focusing on **Role-Based Access Control (RBAC)**, relational database design, and secure API communication. It serves as a prototype for a high-security logistics dashboard.

## Architecture & Tech Stack

* **Frontend:** React (Vite), Tailwind CSS v4, Recharts, React Router
* **Backend:** Node.js, Express.js
* **Database:** PostgreSQL (Hosted on Supabase)
* **Authentication:** JSON Web Tokens (JWT), bcryptjs
* **Security:** Helmet.js, CORS

## Core Features

1. **Role-Based Access Control (RBAC):**
   * **ADMIN:** Full access. Can view all bases, execute purchases, and override transfers.
   * **BASE_COMMANDER:** Scoped access. Can only initiate transfers *from* their assigned base and view inventory specific to their base.
   * **LOGISTICS_OFFICER:** Operational access. Can execute purchases and view global inventory, but cannot initiate base-to-base transfers.
2. **Secure Asset Transfers:** Transactional database operations (`BEGIN`, `COMMIT`, `ROLLBACK`) ensure that inventory levels are never corrupted during base-to-base transfers.
3. **Immutable Audit Logging:** Every critical action (Purchases, Transfers) is automatically recorded in an `audit_logs` table with the executing user's ID, action type, and detailed payload.
4. **Dynamic Dashboard:** The UI automatically adapts based on the decoded JWT payload, hiding or showing specific controls based on user authorization.

## Database Schema

The PostgreSQL database relies on the following core relational structure:
* `users`: Stores credentials, hashed passwords, roles, and assigned `base_id`.
* `bases`: Represents physical locations/commands.
* `equipment_types`: Catalog of available assets.
* `inventory`: Junction table mapping `quantity` of `equipment_types` to specific `bases`.
* `purchases` & `transfers`: Transactional records of asset movement.
* `audit_logs`: Append-only security tracking.

## Local Development Setup

### Prerequisites
* Node.js (v18+)
* PostgreSQL / Supabase instance

### 1. Clone & Install
```bash
git clone [https://github.com/yourusername/military-asset-management.git](https://github.com/yourusername/military-asset-management.git)
cd military-asset-management

# Install backend dependencies
cd backend
npm install

# Install frontend dependencies
cd ../frontend
npm install