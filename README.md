# ZestFoot Main Server (Backend & AI Microservice)

This repository contains the backend systems for ZestFoot, which includes a NestJS server (with Prisma/CQRS, QuestDB, Redis, and PostgreSQL integration) and a Python Ollama AI microservice.

## Directory Structure
- `/src`: NestJS source code (controllers, modules, services, DTOs).
- `/prisma`: Database schema and migrations.
- `/python-service`: Python AI microservice (Ollama chatbot, demand forecasting, customer scoring, recommendations).
- `docker-compose.yml`: Local infrastructure setup (PostgreSQL, QuestDB, Redis).

## Getting Started

### 1. Requirements
- Node.js (v18+)
- Docker Desktop
- Python (v3.10+)

### 2. Run Local Infrastructure
Start PostgreSQL, QuestDB, and Redis using Docker Compose:
```bash
docker compose up -d
```

### 3. Setup NestJS Backend
Install dependencies:
```bash
npm install --legacy-peer-deps
```

Configure `.env` using your PostgreSQL credentials.

Generate Prisma client and run migrations:
```bash
npx prisma generate
npx prisma db push
```

Start the NestJS development server:
```bash
npm run start:dev
```

### 4. Setup Python AI Microservice
Install dependencies inside `/python-service` (recommend using a virtual environment):
```bash
pip install -r python-service/requirements.txt
```

Start the Python service:
```bash
python python-service/app_service.py
```
*(Starts a FastAPI server on port 8000).*

### 5. Running Concurrently
You can start both NestJS and Python service together using:
```bash
npm run dev
```
