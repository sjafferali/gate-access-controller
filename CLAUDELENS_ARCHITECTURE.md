# ClaudeLens Architecture & Project Structure Summary

## Project Overview

**ClaudeLens** is a comprehensive analytics platform for archiving, searching, and visualizing Claude conversation history. It's a full-stack application with a modern architecture designed for both local development and production deployment.

### Key Statistics
- **67+ REST API endpoints** organized into analytics, search, sessions, messages, projects, ingestion, WebSocket, and health/status categories
- **Multi-component architecture** with separate frontend, backend, CLI, and infrastructure
- **Production-ready** with Docker containerization, CI/CD pipelines, and comprehensive testing
- **Type-safe** implementation using TypeScript and Python with strong type hints

---

## Project Directory Structure

```
claudelens/
├── backend/                    # FastAPI Python backend (port 8000)
│   ├── app/
│   │   ├── api/               # API endpoints (v1 route structure)
│   │   │   └── api_v1/
│   │   │       ├── endpoints/ # Individual endpoint modules (analytics, search, sessions, etc.)
│   │   │       └── api.py     # Router configuration
│   │   ├── models/            # Pydantic/MongoDB data models
│   │   ├── services/          # Business logic and utilities
│   │   ├── middleware/        # Request processing middleware
│   │   ├── core/              # Core utilities (config, database, exceptions, logging)
│   │   └── main.py            # FastAPI application entry point
│   ├── migrations/            # Database migration scripts
│   ├── scripts/               # Utility scripts for data generation, etc.
│   ├── tests/                 # Backend unit and integration tests
│   ├── pyproject.toml         # Poetry dependencies (Python 3.11+)
│   ├── poetry.lock            # Locked dependencies
│   └── pytest.ini             # Test configuration
│
├── frontend/                  # React + TypeScript frontend (port 5173 dev, port 3000 prod)
│   ├── src/
│   │   ├── components/        # React components (UI, layout, auth, settings, etc.)
│   │   ├── pages/             # Page components
│   │   ├── api/               # API client functions
│   │   ├── services/          # Frontend business logic
│   │   ├── hooks/             # Custom React hooks
│   │   ├── store/             # State management (Zustand)
│   │   ├── contexts/          # React contexts
│   │   ├── types/             # TypeScript type definitions
│   │   ├── styles/            # Global styles
│   │   └── utils/             # Utility functions
│   ├── public/                # Static public assets
│   ├── dist/                  # Production build output
│   ├── package.json           # npm dependencies
│   ├── vite.config.ts         # Vite build configuration
│   ├── tailwind.config.js     # Tailwind CSS configuration
│   ├── tsconfig.json          # TypeScript configuration
│   ├── vitest.config.ts       # Testing configuration (Vitest)
│   └── .eslintrc.json         # ESLint configuration
│
├── cli/                       # Python CLI tool for syncing
│   ├── claudelens_cli/
│   │   ├── cli.py             # Main CLI entry point
│   │   ├── commands/          # CLI command modules (sync, config, status)
│   │   ├── core/
│   │   │   ├── sync_engine.py # Synchronization logic
│   │   │   ├── watcher.py     # File system watcher
│   │   │   ├── claude_parser.py # Claude data parsing
│   │   │   ├── config.py      # Configuration management
│   │   │   └── retry.py       # Retry logic
│   │   └── __main__.py        # CLI entry point
│   ├── tests/                 # CLI tests
│   ├── pyproject.toml         # Poetry configuration
│   └── README.md
│
├── docker/                    # Docker-related files
│   ├── Dockerfile             # Multi-stage production image
│   ├── docker-compose.dev.yml # Development environment
│   ├── nginx.conf             # Nginx reverse proxy configuration
│   ├── supervisord.conf       # Process supervisor configuration
│   ├── entrypoint.sh          # Container startup script
│   └── init-mongo.js          # MongoDB initialization
│
├── scripts/                   # Development helper scripts
│   ├── dev.sh                 # Development environment setup
│   ├── build.sh               # Production build script
│   └── run_ci_checks.sh       # CI check runner
│
├── .github/workflows/         # GitHub Actions CI/CD pipelines
│   ├── main.yml               # Main branch CI/CD (tests + Docker build/push)
│   ├── security.yml           # Security scanning (CodeQL, dependency review)
│   ├── pr.yml                 # Pull request checks
│   └── auto-merge-dependabot.yml # Dependabot auto-merge
│
├── docs/                      # Documentation
│   ├── README.md              # Main documentation
│   ├── API.md                 # API reference
│   ├── CLI.md                 # CLI documentation
│   ├── CONFIGURATION.md       # Configuration guide
│   ├── data-model.md          # Data model documentation
│   ├── analytics.md           # Analytics features
│   ├── UI-GUIDE.md            # UI/UX walkthrough
│   ├── MCP-*.md               # Model Context Protocol documentation
│   └── images/                # Documentation images
│
├── docker-compose.yml         # Production docker-compose
├── docker-compose.override.yml # Development overrides
├── .env.example               # Environment variable template
├── .pre-commit-config.yaml    # Pre-commit hooks configuration
├── .gitignore                 # Git ignore patterns
└── README.md                  # Project README
```

---

## Technology Stack

### Frontend
| Category | Technology |
|----------|-----------|
| **Framework** | React 18 + TypeScript |
| **Build Tool** | Vite 6 |
| **Styling** | TailwindCSS 3 + PostCSS |
| **State Management** | Zustand 4 |
| **API Client** | Axios + React Query |
| **Charts/Graphs** | Recharts 3, ReactFlow 11, Dagre |
| **UI Components** | Lucide React icons, Framer Motion animations |
| **Routing** | React Router 6 |
| **Testing** | Vitest 3, Testing Library |
| **Linting** | ESLint 8 + TypeScript |
| **Formatting** | Prettier 3 |
| **Code Quality** | TypeScript strict mode |

### Backend
| Category | Technology |
|----------|-----------|
| **Framework** | FastAPI 0.116+ |
| **Python Version** | 3.11+ (Poetry managed) |
| **Async Driver** | Motor 3 (async MongoDB) |
| **Database** | MongoDB 7.0 |
| **Data Validation** | Pydantic 2 |
| **Web Server** | Uvicorn 0.35+ |
| **WebSocket** | WebSockets 12 |
| **Authentication** | Python-Jose, Passlib, Authlib |
| **HTTP Client** | HTTPX 0.28 |
| **Token Counting** | TikToken + LiteLLM |
| **Logging** | Python logging with structured logs |
| **Testing** | Pytest 8 + Pytest-asyncio |
| **Linting** | Ruff + Black + MyPy |

### CLI
| Category | Technology |
|----------|-----------|
| **Framework** | Click 8 (command-line framework) |
| **File Watching** | Watchdog 6 |
| **Data Validation** | Pydantic 2 |
| **HTTP Client** | HTTPX 0.28 |
| **Output Formatting** | Rich 13 (terminal UI) |
| **Environment** | Python-dotenv |
| **Testing** | Pytest 8 |
| **Linting** | Ruff + Black |

### Infrastructure
| Component | Technology |
|-----------|-----------|
| **Containerization** | Docker + Docker Compose |
| **Reverse Proxy** | Nginx |
| **Process Manager** | Supervisor |
| **Database** | MongoDB 7.0 with authentication |
| **CI/CD** | GitHub Actions |
| **Container Registry** | Docker Hub |
| **Security Scanning** | Trivy, CodeQL, Dependabot |
| **Dependency Management** | Poetry (Python), npm (Node) |

---

## Docker & Deployment Architecture

### Multi-Stage Docker Build Process

**Stage 1: Frontend Builder**
- Node.js 20-alpine
- Installs npm dependencies and builds with Vite
- Output: `/app/frontend/dist` (optimized static files)

**Stage 2: Backend Builder**
- Python 3.11-slim
- Installs Poetry and dependencies (production only)
- Outputs compiled packages to system site-packages

**Stage 3: Final Production Image**
- Python 3.11-slim base
- Includes: Nginx, Supervisor, curl
- Non-root user (appuser:1000) for security
- Combines frontend dist and backend app
- Health checks enabled
- Exposed port: 8080

### Docker Compose Configuration

**Production (docker-compose.yml)**
```yaml
Services:
  - claudelens: Main application (port 3000:8080)
  - mongodb: Database (port 27017)
Volumes:
  - mongodb_data: Persistent database storage
Environment:
  - MONGODB_URL: Connection string with auth
  - API_KEY: Security token
  - DEBUG: Toggle debug mode
  - DATABASE_NAME: Target database
```

**Development Overrides (docker-compose.override.yml)**
```yaml
Services:
  - mongo-express: MongoDB UI (port 8081)
Volumes:
  - ./backend:/app/backend (live reload)
  - ./frontend/dist:/app/frontend/dist (for testing)
Environment:
  - DEBUG=true
  - LOG_LEVEL=debug
```

### Nginx Configuration
- **Frontend Static Files**: Cached with 1-year expiry for assets (*.js, *.css, etc.)
- **API Proxy**: `/api` → localhost:8000 (backend)
- **WebSocket Proxy**: `/ws` → localhost:8000 (persistent connections)
- **Health Check**: `/health` endpoint
- **Security Headers**: X-Frame-Options, X-Content-Type-Options, X-XSS-Protection
- **Compression**: Gzip on for content < 1KB
- **Client Max Body Size**: 50MB

---

## Backend Architecture

### Application Startup (Lifespan)

1. **Startup Phase**
   - Connect to MongoDB with configured pool sizes
   - Initialize database (create collections, indexes, validators)
   - Start background tasks

2. **Shutdown Phase**
   - Stop background tasks gracefully
   - Disconnect from MongoDB

### Middleware Stack (Order Matters - Added Last Runs First)
1. **ForwardedHeadersMiddleware** - Handles proxy headers (X-Forwarded-*)
2. **SessionMiddleware** - Session management for OAuth/OIDC
3. **CORSMiddleware** - Cross-origin resource sharing
4. **GZipMiddleware** - Compression
5. **LoggingMiddleware** - Request/response logging
6. **RateLimitTrackingMiddleware** - Rate limiting (500 requests/60 sec)
7. **AuthenticationMiddleware** - API key and authentication

### Exception Handlers
- **NotFoundError** → 404 JSON response
- **ValidationError** → 400 JSON response
- **AuthenticationError** → 401 JSON response
- **Global Exception Handler** → 500 (debug mode shows error, production shows generic message)

### API Router Structure
```
/api/v1/
├── /analytics/        # Cost, tokens, tools, flow, benchmarks, health
├── /search/           # Full-text, code search, suggestions
├── /sessions/         # Session management and querying
├── /messages/         # Message CRUD and retrieval
├── /projects/         # Project management and stats
├── /ingest/           # Batch message ingestion
├── /auth/             # Authentication endpoints
├── /users/            # User management
├── /backup/           # Backup operations
├── /restore/          # Restore operations
├── /import-export/    # Import/export operations
├── /rate-limits/      # Rate limit status
├── /admin/            # Administrative endpoints
└── /prompts/          # Prompt templates
```

### Core Modules

**config.py**
- Pydantic Settings for environment variable configuration
- Defaults for development, overridable in production
- Key settings:
  - `MONGODB_URL`: Database connection string
  - `API_KEY`: Security token for API access
  - `BACKEND_CORS_ORIGINS`: CORS allowlist
  - `LOG_LEVEL`: Logging verbosity
  - `MAX/MIN_CONNECTIONS_COUNT`: Connection pool sizing

**database.py**
- Motor async MongoDB client wrapper
- Connection pooling with configurable sizes
- Graceful connection management
- Testcontainer support for testing

**exceptions.py**
- Custom exception classes for domain errors
- NotFoundError, ValidationError, AuthenticationError
- Structured error responses

**logging.py**
- Structured logging setup
- Configurable log levels
- JSON formatting option for production

### Data Models
Located in `backend/app/models/`:
- **Session**: Conversation sessions with metadata
- **Message**: Individual messages with cost, tokens, content
- **Project**: Project organization units
- **User**: User accounts and ownership
- **RateLimitUsage**: Rate limit tracking
- **Prompt**: Prompt templates
- **AISettings**: AI configuration
- **RateLimitSettings**: Rate limit configuration
- And more for backups, exports, imports, etc.

---

## Frontend Architecture

### Component Organization
```
components/
├── layout/          # Main layout wrappers
├── common/          # Reusable UI components (Button, Card, Loading)
├── ui/              # Shadcn-style UI primitives
├── auth/            # Authentication UI
├── settings/        # Settings pages
├── admin/           # Admin panels
├── usage/           # Usage/analytics displays
├── backup/          # Backup management UI
├── import-export/   # Data import/export UI
└── prompts/         # Prompt management UI
```

### State Management
- **Zustand Store**: Global state for user, auth, UI state
- **React Query**: Server state, API caching, and synchronization
- **React Context**: Theme, user context, auth context
- **localStorage**: Persistent local preferences

### API Integration
- **Axios**: HTTP client with interceptors for auth headers
- **Base URL**: `/api/v1` in production, proxied in dev via Vite
- **WebSocket**: Direct ws:// connections for real-time updates

### Features
- **Real-time Updates**: WebSocket connections for live stats
- **Search & Suggestions**: Full-text search with autocomplete
- **Analytics Dashboards**: Interactive charts (Recharts), flow diagrams (ReactFlow)
- **Dark/Light Theme**: Tailwind dark mode support
- **Responsive Design**: Mobile-first with breakpoints
- **Accessibility**: ARIA labels, keyboard navigation, screen reader support

---

## CLI Tool Architecture

### Command Structure
```
claudelens/
├── config    # Configuration management
├── sync      # Synchronization engine
└── status    # Status reporting
```

### Core Modules
- **sync_engine.py**: Main synchronization logic
- **watcher.py**: File system monitoring with Watchdog
- **claude_parser.py**: Parsing Claude conversation files
- **config.py**: Local configuration management (TOML)
- **data_handlers.py**: Data transformation and validation
- **retry.py**: Exponential backoff retry logic

### Features
- Multi-directory support
- Watch mode for continuous sync
- Deduplication and validation
- Dry-run mode for testing
- Detailed status reporting
- Batch ingestion optimization

---

## CI/CD Pipeline (GitHub Actions)

### Main Workflow (main.yml)
**Triggers**: Push to main branch, version tags

**Jobs** (Parallel Execution):
1. **backend-tests**: Pytest with coverage
2. **cli-tests**: CLI pytest with coverage
3. **frontend-tests**: Vitest with coverage
4. **python-lint**: Ruff + MyPy checks
5. **frontend-lint**: ESLint + Prettier + TypeScript
6. **security-scan**: Trivy vulnerability scanner
7. **dependency-check**: Safety (Python) + npm audit
8. **docker-build**: Multi-platform build (linux/amd64)
9. **docker-push**: Push to Docker Hub (after tests pass)
10. **build-cli**: Build CLI binaries for each OS (on version tags)

### Security Workflow (security.yml)
- **Scheduled**: Weekly on Mondays
- **CodeQL Analysis**: JavaScript and Python
- **Dependency Review**: High-severity vulnerability detection

### Code Quality Gates
- 0% tolerance for ESLint warnings
- Ruff critical errors only (E, F, I)
- MyPy type checking with strict settings
- Coverage reports uploaded to Codecov

---

## Configuration Management

### Environment Variables

**Application (backend/.env)**
```
# Database
MONGODB_URL=mongodb://user:pass@host:27017/db
DATABASE_NAME=claudelens

# Security
API_KEY=your-secure-api-key
SECRET_KEY=minimum-32-chars

# Application
DEBUG=false
LOG_LEVEL=INFO

# Connection Pooling
MAX_CONNECTIONS_COUNT=100
MIN_CONNECTIONS_COUNT=10

# CORS
BACKEND_CORS_ORIGINS=http://localhost:3000

# Optional: AI Settings
CLAUDELENS_OPENAI_API_KEY=
CLAUDELENS_ENCRYPTION_KEY=

# Rate Limits
AI_RATE_LIMIT_PER_MINUTE=10
EXPORT_RATE_LIMIT_PER_HOUR=10
```

**Frontend (frontend/.env)**
```
VITE_API_URL=/api/v1  # Production (proxied through Nginx)
# VITE_API_URL=http://localhost:8000/api/v1  # Dev with separate backend
VITE_API_KEY=
```

**Root (.env.example)**
```
MONGODB_ROOT_USER=admin
MONGODB_ROOT_PASSWORD=strong-password
MONGODB_PORT=27017
CLAUDELENS_PORT=3000
LOG_LEVEL=info
```

---

## Development Workflow

### Quick Start Scripts
```bash
# Complete dev environment
./scripts/dev.sh --load-samples

# With options:
--persistent-db    # Keep database running
--load-samples     # Generate test data
--backend-only     # Backend services only
--frontend-only    # Frontend dev server only
--test-db          # Use test container
--safe             # Safe mode
-d/--daemon        # Run in background
```

### Individual Component Development
```bash
# Backend (port 8000)
cd backend
poetry install
poetry run uvicorn app.main:app --reload

# Frontend (port 5173)
cd frontend
npm install
npm run dev

# CLI
cd cli
poetry install
poetry run claudelens --help

# MongoDB (port 27017)
docker compose -f docker/docker-compose.dev.yml up -d
```

### Testing
```bash
# Backend
cd backend
poetry run pytest --cov=app

# Frontend
cd frontend
npm test
npm run test:coverage

# CLI
cd cli
poetry run pytest --cov=claudelens_cli
```

### Code Quality
```bash
# Run all checks locally
./scripts/run_ci_checks.sh

# Quick checks with auto-fix
./scripts/run_ci_checks.sh --quick --auto-fix

# Individual checks
# Frontend
npm run lint && npm run format

# Backend
poetry run ruff check && poetry run black .
```

### Pre-commit Hooks
Configured in `.pre-commit-config.yaml`:
- Trailing whitespace
- End-of-file fixer
- YAML/JSON/TOML validation
- Large file checks
- Ruff (Python linting)
- Black (Python formatting)
- Prettier (Frontend formatting)

---

## Key Architectural Decisions

### 1. **Multi-Stage Docker Build**
- Reduces final image size
- Separates build environment from runtime
- Security: Non-root user in final image

### 2. **Async/Await Throughout**
- FastAPI with Motor (async MongoDB)
- HTTPX async HTTP client
- Uvicorn async ASGI server
- Better performance and scalability

### 3. **Middleware-Based Extensibility**
- Clear separation of concerns
- Order matters for middleware execution
- Easy to add new middleware

### 4. **Pydantic v2 for Validation**
- Built-in JSON schema generation
- Type safety across Python codebase
- Clear error messages

### 5. **MongoDB for Flexible Schema**
- Accommodates varying Claude data structures
- Full-text search capabilities
- Scalable for large conversation datasets

### 6. **WebSocket for Real-time Updates**
- Live statistics push to frontend
- Persistent connections for monitoring

### 7. **CLI as Separate Package**
- Can be installed independently via pip
- Distributed separately on PyPI
- Enables automation and integration

### 8. **TypeScript Strict Mode**
- Type safety in frontend
- Catches errors at compile time

### 9. **Zustand + React Query**
- Lightweight state management
- Separation of client state and server state
- Better performance than Redux for this scale

### 10. **Poetry for Dependency Management**
- Lock files ensure reproducible builds
- Works well with Docker
- Better than pip for monorepo-style management

---

## Security Considerations

### API Security
- **API Key Authentication**: Header-based authentication
- **CORS Controls**: Configurable origin allowlist
- **Rate Limiting**: Middleware-based (500 req/60 sec default)
- **Session Security**: HTTPS-only cookies in production

### Database Security
- **Authentication Required**: MongoDB with username/password
- **User Isolation**: Database users with limited privileges recommended
- **Encryption**: Optional for sensitive data at rest

### Infrastructure
- **Non-root User**: Runs as appuser:1000 in Docker
- **Security Headers**: X-Frame-Options, X-Content-Type-Options, X-XSS-Protection
- **HTTPS**: Recommended for production (use reverse proxy)
- **Environment Secrets**: Keep API_KEY, passwords out of git

### Code Quality
- **SAST**: CodeQL scanning in CI
- **Dependency Scanning**: Trivy + npm audit + Safety
- **Pre-commit Hooks**: Catch common issues before commit

---

## Key Design Patterns

### 1. **Repository Pattern** (Models)
- Data access abstraction
- Collection operations centralized

### 2. **Service Layer Pattern**
- Business logic separated from endpoints
- Reusable across endpoints

### 3. **Dependency Injection**
- Database passed as parameter
- Easier to test with mock database

### 4. **Error Boundary Pattern** (Frontend)
- Graceful error handling
- User-friendly error messages

### 5. **Caching Strategy**
- React Query for server state
- localStorage for persistent preferences
- Nginx caching for static assets

---

## Performance Optimizations

### Backend
- Connection pooling for MongoDB
- Async/await throughout
- Middleware-based rate limiting
- Background task processing

### Frontend
- Code splitting with Vite
- Lazy loading of routes
- Virtual scrolling for large lists (React Virtual)
- Debounced search
- Memoization of expensive computations

### Database
- Indexes on frequently queried fields
- Full-text search indexes
- Connection pool tuning
- Query optimization

### Infrastructure
- Gzip compression on nginx
- Static asset caching
- CDN-ready configuration

---

## Deployment Models

### Option 1: Docker Compose (Recommended)
- Simplest deployment
- Production-ready
- Configure environment variables
- Update docker-compose.yml for custom settings

### Option 2: Pre-built Image
- Use sjafferali/claudelens:latest from Docker Hub
- Custom MONGODB_URL for external database
- Suitable for cloud deployments

### Option 3: Kubernetes
- Generate Helm charts from docker-compose
- Scalable deployments
- Advanced configuration options

---

## Monitoring & Observability

### Health Checks
- `/health` endpoint on main app
- Docker health checks configured
- MongoDB connectivity validation

### Logging
- Structured logging in backend
- Request ID tracking through middleware
- Configurable log levels

### Metrics
- Response times tracked
- Error rates monitored
- Request throughput measured

---

## Testing Strategy

### Backend Tests
- Unit tests with mocked database
- Integration tests with testcontainers
- Coverage reports to Codecov
- Pytest configuration in `pytest.ini`

### Frontend Tests
- Component tests with Testing Library
- Vitest for fast test execution
- Coverage reports
- UI behavior testing

### CLI Tests
- Command parsing tests
- Sync logic validation
- Configuration management tests

---

## Future-Ready Architecture

### Extensibility Points
1. **New API Endpoints**: Add to `backend/app/api/api_v1/endpoints/`
2. **New Middleware**: Add to `app.add_middleware()`
3. **New Frontend Pages**: Add routes in React Router
4. **New CLI Commands**: Add to `claudelens_cli/commands/`

### Scalability Considerations
- Horizontal scaling: Multiple backend instances with load balancer
- Database scaling: MongoDB replica sets or sharding
- Frontend: Static file CDN
- CLI: Can run on multiple machines independently

---

## Summary: Key Takeaways for New Projects

### Recommended Replications
1. **Multi-stage Docker build** for frontend + backend combination
2. **Poetry + pyproject.toml** for Python dependency management
3. **Async everywhere** pattern (FastAPI, Motor, HTTPX)
4. **Middleware stack** for cross-cutting concerns
5. **Pydantic v2** for validation and type safety
6. **React 18 + TypeScript + Vite** for modern frontend
7. **GitHub Actions** for comprehensive CI/CD
8. **Testing at multiple levels** (unit, integration, E2E)
9. **Environment-based configuration** with .env files
10. **Documentation** in docs/ with comprehensive guides

### Do's
- Use async/await for I/O operations
- Validate early with Pydantic
- Implement middleware for cross-cutting concerns
- Use WebSockets for real-time features
- Cache at multiple levels
- Test thoroughly with coverage targets
- Document APIs with OpenAPI/Swagger
- Use dependency injection for testability

### Don'ts
- Don't mix sync and async code paths
- Don't store secrets in git
- Don't skip type checking (use mypy, TypeScript)
- Don't assume database connection is fast
- Don't forget about rate limiting
- Don't skip error handling
- Don't mix UI and business logic in components
- Don't commit .env files

