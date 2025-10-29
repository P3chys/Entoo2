# Entoo Documentation

Welcome to the Entoo system documentation. This directory contains comprehensive documentation for operations and architecture.

## Documents Overview

### 1. [OPERATIONS.md](OPERATIONS.md)
**Purpose:** Operational procedures, commands, and how-to guides

**Contains:**
- System startup and shutdown procedures
- Daily operations checklists
- Cache management commands
- Database operations
- File management procedures
- Search operations
- Monitoring and logging
- Backup and recovery procedures
- Troubleshooting guides
- Performance optimization
- Security operations
- Quick reference card

**Audience:** System administrators, DevOps engineers, operators

**Use when:**
- Starting/stopping the system
- Performing daily maintenance
- Troubleshooting issues
- Managing caches
- Running backups
- Monitoring system health

---

### 2. [ARCHITECTURE_ARCHIMATE.md](ARCHITECTURE_ARCHIMATE.md)
**Purpose:** Complete system architecture in ArchiMate 3.1 format

**Contains:**
- Business layer elements (actors, services, processes, objects)
- Application layer (components, services, functions, interfaces, data objects)
- Technology layer (infrastructure, nodes, services, networks)
- Physical layer (equipment, facilities)
- Data layer (schema, flows)
- Relationships matrix
- Architecture views
- Integration points
- Performance optimizations
- Security architecture
- Monitoring and observability
- Complete ArchiMate element catalog (100+ elements)

**Audience:** Enterprise architects, solution architects, technical leads

**Use when:**
- Creating ArchiMate diagrams
- Understanding system architecture
- Planning changes or extensions
- Documenting integrations
- Performing architectural reviews
- Creating technical presentations

**Compatible with:** Archi, BiZZdesign Enterprise Studio, Sparx Enterprise Architect, and other ArchiMate 3.1 tools

---

## Quick Navigation

### For Operators
→ [How to start the system](OPERATIONS.md#starting-and-stopping-services)
→ [Cache management](OPERATIONS.md#cache-management)
→ [Troubleshooting](OPERATIONS.md#troubleshooting)

### For Architects
→ [System components](ARCHITECTURE_ARCHIMATE.md#application-layer)
→ [Infrastructure](ARCHITECTURE_ARCHIMATE.md#technology-layer)
→ [Data flows](ARCHITECTURE_ARCHIMATE.md#data-layer)
→ [Integration points](ARCHITECTURE_ARCHIMATE.md#integration-points)

### For Developers
→ [API endpoints](ARCHITECTURE_ARCHIMATE.md#api-endpoints-map)
→ [Application components](ARCHITECTURE_ARCHIMATE.md#application-components)
→ [Database schema](ARCHITECTURE_ARCHIMATE.md#database-schema)

---

## Document Structure

```
docs/
├── README.md                        # This file - Documentation index
├── OPERATIONS.md                    # Operational procedures and commands
└── ARCHITECTURE_ARCHIMATE.md        # ArchiMate 3.1 architecture model
```

---

## System Overview

**Entoo** is a containerized document management and search system for academic materials.

### Key Components
- **Laravel 10** (PHP 8.2) - Web application framework
- **PostgreSQL 15** - Primary database
- **Redis 7** - Caching and sessions
- **Elasticsearch 8.11** - Full-text search engine
- **Nginx** - Web server and reverse proxy
- **Docker** - Container platform

### Key Features
- Document upload and management
- Full-text search with fuzzy matching
- User authentication and authorization
- Favorites system
- Subject organization (4 categories)
- Support for PDF, Word, PowerPoint, and more
- Redis-based caching for performance
- RESTful API

---

## Access URLs

- **Application:** http://localhost:8000
- **Elasticsearch:** http://localhost:9200
- **Kibana:** http://localhost:5601
- **Dozzle (Logs):** http://localhost:8888

---

## Quick Start

```bash
# Start all services
docker-compose up -d

# Check status
docker-compose ps

# View logs
docker-compose logs -f

# Stop services
docker-compose down
```

---

## Related Documentation

Additional documentation files in the root directory:
- `README.md` - System overview and features
- `SETUP.md` - Initial setup instructions
- `MIGRATION_NOTES.md` - Data migration information
- Other implementation notes and guides

---

## Version Information

| Document | Version | Last Updated |
|----------|---------|--------------|
| OPERATIONS.md | 2.0 | 2025-10-26 |
| ARCHITECTURE_ARCHIMATE.md | 1.0 | 2025-10-26 |

---

## Contributing to Documentation

When updating documentation:
1. Update the version number and last updated date
2. Maintain ArchiMate 3.1 compliance in architecture docs
3. Test all commands before documenting them
4. Use consistent formatting and terminology
5. Update this index if adding new documents

---

## Support

For questions about:
- **Operations:** See [OPERATIONS.md](OPERATIONS.md) troubleshooting section
- **Architecture:** See [ARCHITECTURE_ARCHIMATE.md](ARCHITECTURE_ARCHIMATE.md) integration points
- **System issues:** Check the logs at http://localhost:8888

---

**Documentation maintained by:** Entoo Development Team
**Last reviewed:** 2025-10-26
