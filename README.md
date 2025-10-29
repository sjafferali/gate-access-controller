# Gate Access Controller

A secure, self-hosted system for managing temporary access to automated gates through unique access links. Perfect for deliveries, service visits, and temporary guest access.

## Features

- **Temporary Access Links**: Create time-limited or usage-limited access codes
- **Multiple Purpose Types**: Categorize links for deliveries, visitors, services, emergencies, etc.
- **Access Logging**: Complete audit trail of all access attempts with IP tracking
- **Webhook Integration**: Trigger your gate controller via configurable webhooks
- **Admin Dashboard**: Modern React web interface for managing links and viewing logs
- **Mobile Responsive**: Access portal works on any device
- **Single Container**: Combined frontend and backend in one Docker image

## Quick Start

### Prerequisites
- Docker and Docker Compose installed
- A gate controller with webhook/API support

### Using Docker Compose

Create a `docker-compose.yml` file and update the environment variables:

```yaml
version: '3.8'

services:
  gate-access:
    image: your-dockerhub-username/gate-access-controller:latest
    container_name: gate-access-controller
    ports:
      - "8080:8080"
    environment:
      # Database settings
      - DATABASE_TYPE=postgresql
      - POSTGRES_HOST=postgres
      - POSTGRES_PORT=5432
      - POSTGRES_USER=gateadmin
      - POSTGRES_PASSWORD=CHANGE_THIS_PASSWORD
      - POSTGRES_DB=gate_access_db

      # Gate webhook settings
      - GATE_WEBHOOK_URL=http://192.168.1.100/api/open
    depends_on:
      - postgres
    restart: unless-stopped

  postgres:
    image: postgres:15-alpine
    environment:
      - POSTGRES_USER=gateadmin
      - POSTGRES_PASSWORD=CHANGE_THIS_PASSWORD
      - POSTGRES_DB=gate_access_db
    volumes:
      - postgres_data:/var/lib/postgresql/data
    restart: unless-stopped

volumes:
  postgres_data:
```

Start the application:

```bash
docker-compose up -d
```

Access the dashboard at `http://localhost:8080`

## Configuration

### Required Environment Variables

| Variable | Description | Example |
|----------|-------------|---------|
| `DATABASE_TYPE` | Database backend to use | `postgresql` or `sqlite` |
| `POSTGRES_HOST` | PostgreSQL host (if using PostgreSQL) | `postgres` or `localhost` |
| `POSTGRES_USER` | PostgreSQL username (if using PostgreSQL) | `gateadmin` |
| `POSTGRES_PASSWORD` | PostgreSQL password (if using PostgreSQL) | `your-secure-password` |
| `POSTGRES_DB` | PostgreSQL database name (if using PostgreSQL) | `gate_access_db` |
| `GATE_WEBHOOK_URL` | Gate controller webhook endpoint | `http://192.168.1.100/api/open` |

### Optional Environment Variables

See [Configuration Guide](docs/CONFIGURATION.md) for all available options.

## Usage

### Creating Access Links

1. Navigate to `http://localhost:8080`
2. Click "Create Link"
3. Configure:
   - Name and notes
   - Purpose (delivery, visitor, service, etc.)
   - Expiration date/time
   - Maximum number of uses
   - Active from date (optional)

### Sharing Access

Share links in format: `http://your-server:8080/l/LINKCODE`

When someone visits:
1. They see the link details
2. Click "Request Access"
3. If valid, webhook triggers your gate
4. Access attempt is logged

## API

RESTful API available at `/api/v1/`:

- **Links**: CRUD operations for access links
- **Logs**: View access attempt history
- **Validate**: Check link validity and trigger access

See [API Documentation](docs/API.md) for full reference.

## Development

See [Development Guide](docs/DEVELOPMENT.md) for local setup instructions.

## CI/CD

GitHub Actions workflows included for automated testing and Docker image builds.

See [GitHub Actions Setup](docs/GITHUB_ACTIONS_SETUP.md) for configuration.

## License

MIT License - see [LICENSE](LICENSE) file for details
