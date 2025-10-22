# ClaudeLens - Key Configuration Files Reference

This document provides a quick reference to the most important files in the ClaudeLens project structure for understanding the architecture and replicating patterns.

## Absolute Paths to Key Files in ClaudeLens

### Backend Core Files
- `/Users/sjafferali/github/personal/claudelens/backend/app/main.py` - FastAPI application setup, middleware, exception handlers, lifespan management
- `/Users/sjafferali/github/personal/claudelens/backend/app/core/config.py` - Pydantic Settings configuration
- `/Users/sjafferali/github/personal/claudelens/backend/app/core/database.py` - MongoDB connection management (Motor async driver)
- `/Users/sjafferali/github/personal/claudelens/backend/app/core/exceptions.py` - Custom exception classes
- `/Users/sjafferali/github/personal/claudelens/backend/pyproject.toml` - Python dependencies (Poetry)

### Backend API Structure
- `/Users/sjafferali/github/personal/claudelens/backend/app/api/api_v1/` - API v1 router and endpoints
- `/Users/sjafferali/github/personal/claudelens/backend/app/models/` - Pydantic data models
- `/Users/sjafferali/github/personal/claudelens/backend/app/middleware/` - Custom middleware implementations
- `/Users/sjafferali/github/personal/claudelens/backend/app/services/` - Business logic services
- `/Users/sjafferali/github/personal/claudelens/backend/app/core/db_init.py` - Database initialization with validators

### Frontend Core Files
- `/Users/sjafferali/github/personal/claudelens/frontend/vite.config.ts` - Vite build configuration with API proxy
- `/Users/sjafferali/github/personal/claudelens/frontend/tsconfig.json` - TypeScript configuration
- `/Users/sjafferali/github/personal/claudelens/frontend/tailwind.config.js` - Tailwind CSS theming
- `/Users/sjafferali/github/personal/claudelens/frontend/package.json` - npm dependencies
- `/Users/sjafferali/github/personal/claudelens/frontend/.eslintrc.json` - ESLint configuration

### Docker & Infrastructure
- `/Users/sjafferali/github/personal/claudelens/docker/Dockerfile` - Multi-stage production build
- `/Users/sjafferali/github/personal/claudelens/docker/docker-compose.dev.yml` - Development environment
- `/Users/sjafferali/github/personal/claudelens/docker/nginx.conf` - Nginx reverse proxy
- `/Users/sjafferali/github/personal/claudelens/docker/supervisord.conf` - Process supervision
- `/Users/sjafferali/github/personal/claudelens/docker/entrypoint.sh` - Container startup script

### Docker Compose Files
- `/Users/sjafferali/github/personal/claudelens/docker-compose.yml` - Production configuration
- `/Users/sjafferali/github/personal/claudelens/docker-compose.override.yml` - Development overrides

### CI/CD & Quality
- `/Users/sjafferali/github/personal/claudelens/.github/workflows/main.yml` - Main CI/CD pipeline (tests + Docker build/push)
- `/Users/sjafferali/github/personal/claudelens/.github/workflows/security.yml` - Security scanning (CodeQL)
- `/Users/sjafferali/github/personal/claudelens/.pre-commit-config.yaml` - Pre-commit hooks configuration
- `/Users/sjafferali/github/personal/claudelens/backend/pytest.ini` - Backend test configuration
- `/Users/sjafferali/github/personal/claudelens/frontend/vitest.config.ts` - Frontend test configuration

### CLI Tool
- `/Users/sjafferali/github/personal/claudelens/cli/pyproject.toml` - CLI dependencies
- `/Users/sjafferali/github/personal/claudelens/cli/claudelens_cli/cli.py` - Main CLI entry
- `/Users/sjafferali/github/personal/claudelens/cli/claudelens_cli/commands/sync.py` - Sync command
- `/Users/sjafferali/github/personal/claudelens/cli/claudelens_cli/core/sync_engine.py` - Sync logic

### Scripts
- `/Users/sjafferali/github/personal/claudelens/scripts/dev.sh` - Development environment setup
- `/Users/sjafferali/github/personal/claudelens/scripts/build.sh` - Production build
- `/Users/sjafferali/github/personal/claudelens/scripts/run_ci_checks.sh` - Local CI check runner

### Configuration & Environment
- `/Users/sjafferali/github/personal/claudelens/.env.example` - Environment variable template
- `/Users/sjafferali/github/personal/claudelens/backend/.env` - Backend development environment
- `/Users/sjafferali/github/personal/claudelens/frontend/.env.example` - Frontend environment template
- `/Users/sjafferali/github/personal/claudelens/.gitignore` - Git ignore patterns

---

## Critical Configuration File Contents Quick Reference

### docker-compose.yml Structure
```yaml
version: '3.8'
services:
  claudelens:
    image: sjafferali/claudelens:latest
    ports: ["3000:8080"]
    environment:
      - MONGODB_URL=mongodb://admin:password@mongodb:27017/claudelens
      - API_KEY=secure-key
      - DEBUG=false
      - DATABASE_NAME=claudelens
    depends_on:
      - mongodb
  mongodb:
    image: mongo:7.0
    ports: ["27017:27017"]
    environment:
      - MONGO_INITDB_ROOT_USERNAME=admin
      - MONGO_INITDB_ROOT_PASSWORD=password
```

### Dockerfile Pattern (Multi-stage)
```dockerfile
# Stage 1: Frontend builder (Node.js 20-alpine)
# Stage 2: Backend builder (Python 3.11-slim)
# Stage 3: Final image (Python 3.11-slim + nginx + supervisor)
```

### FastAPI Main App Pattern
```python
# 1. Lifespan context manager for startup/shutdown
# 2. Middleware stack (order matters - added last runs first)
# 3. Exception handlers for custom errors
# 4. Include routers with prefixes
# 5. WebSocket endpoints at root level
```

### Backend pyproject.toml Key Sections
```toml
[tool.poetry.dependencies]
python = "^3.11"
fastapi, uvicorn, motor, pydantic, pydantic-settings
pymongo, websockets, httpx, aiofiles
[tool.poetry.group.dev.dependencies]
pytest, pytest-asyncio, pytest-cov, ruff, mypy, black
```

### Frontend package.json Key Sections
```json
{
  "scripts": {
    "dev": "vite",
    "build": "tsc && vite build",
    "lint": "eslint . --ext ts,tsx",
    "format": "prettier --write",
    "test": "vitest"
  },
  "dependencies": {
    "react": "^18.2.0",
    "@tanstack/react-query": "^5.0.0",
    "zustand": "^4.4.0",
    "tailwindcss": "^3.3.5"
  }
}
```

### GitHub Actions Main.yml Pattern
```yaml
name: Main Branch CI/CD
on:
  push:
    branches: [main]
    tags: ['v*']
jobs:
  backend-tests: # pytest with coverage
  cli-tests: # pytest with coverage
  frontend-tests: # vitest with coverage
  python-lint: # ruff + mypy
  frontend-lint: # eslint + prettier
  security-scan: # trivy
  dependency-check: # safety + npm audit
  docker-build: # multi-platform build
  docker-push: # after tests pass
```

---

## Learning Path for Gate Access Controller

### Phase 1: Foundation (Replicate Core Patterns)
1. Study: `/Users/sjafferali/github/personal/claudelens/docker/Dockerfile` - Multi-stage build
2. Study: `/Users/sjafferali/github/personal/claudelens/backend/app/main.py` - FastAPI setup
3. Study: `/Users/sjafferali/github/personal/claudelens/backend/app/core/config.py` - Configuration
4. Study: `/Users/sjafferali/github/personal/claudelens/.github/workflows/main.yml` - CI/CD

### Phase 2: Backend (API Development)
1. Study: `/Users/sjafferali/github/personal/claudelens/backend/app/api/api_v1/` - Endpoint structure
2. Study: `/Users/sjafferali/github/personal/claudelens/backend/app/models/` - Data models
3. Study: `/Users/sjafferali/github/personal/claudelens/backend/app/middleware/` - Authentication, rate limiting
4. Copy: Backend pyproject.toml structure

### Phase 3: Frontend (UI Development)
1. Study: `/Users/sjafferali/github/personal/claudelens/frontend/vite.config.ts` - Build config
2. Study: `/Users/sjafferali/github/personal/claudelens/frontend/src/components/` - Component structure
3. Study: `/Users/sjafferali/github/personal/claudelens/frontend/src/store/` - State management
4. Copy: Frontend package.json structure

### Phase 4: Deployment
1. Study: `/Users/sjafferali/github/personal/claudelens/docker-compose.yml` - Deployment config
2. Study: `/Users/sjafferali/github/personal/claudelens/docker/nginx.conf` - Reverse proxy
3. Study: `/Users/sjafferali/github/personal/claudelens/scripts/dev.sh` - Development scripts

### Phase 5: Quality & Testing
1. Study: `/Users/sjafferali/github/personal/claudelens/.pre-commit-config.yaml` - Quality hooks
2. Study: `/Users/sjafferali/github/personal/claudelens/backend/pytest.ini` - Test setup
3. Study: `/Users/sjafferali/github/personal/claudelens/frontend/vitest.config.ts` - Frontend tests

---

## Copy-Paste Templates for Gate Access Controller

### Start with these files as templates:
1. `docker/Dockerfile` - Multi-stage build pattern
2. `docker-compose.yml` - Service orchestration
3. `backend/pyproject.toml` - Backend dependencies
4. `frontend/package.json` - Frontend dependencies
5. `.github/workflows/main.yml` - CI/CD pipeline
6. `.pre-commit-config.yaml` - Code quality
7. `backend/app/main.py` - FastAPI setup pattern
8. `backend/app/core/config.py` - Configuration management

---

## Directory Size Comparison

The `claudelens` directory is comprehensive:
- **Total files**: ~400+ (including node_modules, cache, compiled)
- **Source files**: ~150 (backend, frontend, cli, tests)
- **Backend** (~500KB): Python FastAPI + models + middleware
- **Frontend** (~50MB with node_modules): React + TypeScript + dependencies
- **Documentation**: Extensive in docs/ directory

---

## Important Notes for Replication

### Do Copy:
1. Multi-stage Docker build approach
2. Pydantic Settings configuration pattern
3. Middleware stack pattern (order matters)
4. API router structure with versioning
5. GitHub Actions workflow structure
6. Pre-commit hooks configuration
7. Poetry + pyproject.toml pattern
8. Environment variable management (.env)

### Don't Copy Directly:
1. Claude-specific data models (adapt to access control)
2. Analytics-specific endpoints (replace with gate-specific)
3. Conversation-specific UI components
4. LLM-related libraries (TikToken, LiteLLM)

### Adapt For Gate Access Controller:
1. Data models: User → Staff, Session → AccessEvent, Message → AccessLog
2. APIs: Analytics → Audit, Search → Query, Sessions → AccessSessions
3. UI: Dashboard shows gate activity instead of conversations
4. CLI: Sync gate events instead of conversations
5. Database: Access logs instead of conversation history

---

## Quick File Reference by Use Case

### "How do I setup environment variables?"
- `/Users/sjafferali/github/personal/claudelens/.env.example`
- `/Users/sjafferali/github/personal/claudelens/backend/app/core/config.py`

### "How do I structure the API?"
- `/Users/sjafferali/github/personal/claudelens/backend/app/api/api_v1/`
- `/Users/sjafferali/github/personal/claudelens/backend/app/main.py`

### "How do I add middleware?"
- `/Users/sjafferali/github/personal/claudelens/backend/app/middleware/`
- `/Users/sjafferali/github/personal/claudelens/backend/app/main.py` (see add_middleware calls)

### "How do I build Docker images?"
- `/Users/sjafferali/github/personal/claudelens/docker/Dockerfile`
- `/Users/sjafferali/github/personal/claudelens/docker-compose.yml`

### "How do I setup CI/CD?"
- `/Users/sjafferali/github/personal/claudelens/.github/workflows/main.yml`
- `/Users/sjafferali/github/personal/claudelens/.github/workflows/security.yml`

### "How do I test?"
- `/Users/sjafferali/github/personal/claudelens/backend/pytest.ini`
- `/Users/sjafferali/github/personal/claudelens/frontend/vitest.config.ts`

### "How do I manage code quality?"
- `/Users/sjafferali/github/personal/claudelens/.pre-commit-config.yaml`
- `/Users/sjafferali/github/personal/claudelens/scripts/run_ci_checks.sh`

