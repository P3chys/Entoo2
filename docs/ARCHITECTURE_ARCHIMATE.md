# Entoo System Architecture - ArchiMate 3.1 Model

**Document Version:** 1.0
**Last Updated:** 2025-10-26
**ArchiMate Version:** 3.1
**System:** Entoo Document Management & Search System

---

## Table of Contents

1. [Architecture Overview](#architecture-overview)
2. [Business Layer](#business-layer)
3. [Application Layer](#application-layer)
4. [Technology Layer](#technology-layer)
5. [Physical Layer](#physical-layer)
6. [Data Layer](#data-layer)
7. [Relationships Matrix](#relationships-matrix)
8. [Architecture Views](#architecture-views)
9. [Integration Points](#integration-points)

---

## Architecture Overview

### System Purpose
Entoo is a containerized document management and search system that enables users to upload, organize, search, and manage academic documents with full-text search capabilities.

### Architectural Style
- **Pattern:** Microservices Architecture
- **Deployment:** Container-based (Docker)
- **Communication:** REST API, Message Queuing
- **Data Storage:** Polyglot Persistence (PostgreSQL, Redis, Elasticsearch)

---

## Business Layer

### Business Actors

| ID | Element | Type | Description |
|----|---------|------|-------------|
| BA-001 | Student | Business Actor | End user who uploads, searches, and downloads study materials |
| BA-002 | System Administrator | Business Actor | Technical user managing system operations and maintenance |
| BA-003 | Content Owner | Business Actor | User who owns and manages uploaded content |

### Business Services

| ID | Element | Type | Description |
|----|---------|------|-------------|
| BS-001 | Document Management Service | Business Service | Provides capability to manage academic documents |
| BS-002 | Document Search Service | Business Service | Provides full-text search across documents |
| BS-003 | User Authentication Service | Business Service | Provides secure user access and identity management |
| BS-004 | Content Organization Service | Business Service | Provides hierarchical organization of subjects and categories |

### Business Processes

| ID | Element | Type | Description |
|----|---------|------|-------------|
| BP-001 | Upload Document | Business Process | User uploads document → System validates → Stores file → Indexes content → Confirms upload |
| BP-002 | Search Documents | Business Process | User enters query → System searches index → Ranks results → Returns matches with highlights |
| BP-003 | Download Document | Business Process | User requests file → System validates access → Serves file |
| BP-004 | Manage Favorites | Business Process | User marks/unmarks subject → System updates preferences |
| BP-005 | User Registration | Business Process | User provides credentials → System validates → Creates account → Sends confirmation |

### Business Objects

| ID | Element | Type | Description |
|----|---------|------|-------------|
| BO-001 | Academic Document | Business Object | Physical or digital document (PDF, Word, PowerPoint, etc.) |
| BO-002 | Subject | Business Object | Academic subject/course containing multiple documents |
| BO-003 | Category | Business Object | Classification (Prednasky, Otazky, Materialy, Seminare) |
| BO-004 | User Profile | Business Object | User account and preferences |
| BO-005 | Search Query | Business Object | User's search request with parameters |

---

## Application Layer

### Application Components

| ID | Element | Type | Description | Technology |
|----|---------|------|-------------|------------|
| AC-001 | Laravel Web Application | Application Component | Main web application backend | Laravel 10 (PHP 8.2) |
| AC-002 | Authentication Module | Application Component | Handles user authentication and authorization | Laravel Sanctum |
| AC-003 | File Management Module | Application Component | Manages file uploads, downloads, and metadata | Laravel Storage |
| AC-004 | Search Module | Application Component | Integrates with Elasticsearch for search | Laravel Scout |
| AC-005 | User Interface | Application Component | Web-based user interface | Blade Templates, JavaScript |
| AC-006 | Document Parser Service | Application Component | Extracts text from various document formats | Python 3.11 |
| AC-007 | Cache Manager | Application Component | Manages application caching layer | Laravel Cache |
| AC-008 | API Gateway | Application Component | REST API endpoints | Laravel Routes |

### Application Services

| ID | Element | Type | Description | Endpoint |
|----|---------|------|-------------|----------|
| AS-001 | Authentication API | Application Service | User registration, login, logout | `/api/register`, `/api/login`, `/api/logout` |
| AS-002 | File Management API | Application Service | File CRUD operations | `/api/files/*` |
| AS-003 | Search API | Application Service | Document search functionality | `/api/search` |
| AS-004 | Subject Management API | Application Service | Subject listing and management | `/api/subjects/*` |
| AS-005 | Favorites API | Application Service | Manage user favorites | `/api/favorites/*` |
| AS-006 | Health Check API | Application Service | System health monitoring | `/api/health` |
| AS-007 | Statistics API | Application Service | System statistics | `/api/stats` |
| AS-008 | Profile Management API | Application Service | Subject profile management | `/api/subject-profiles/*` |

### Application Functions

| ID | Element | Type | Description | Component |
|----|---------|------|-------------|-----------|
| AF-001 | User Authentication | Application Function | Validates user credentials, issues tokens | AC-002 |
| AF-002 | File Upload | Application Function | Receives file, validates, stores, indexes | AC-003 |
| AF-003 | File Download | Application Function | Retrieves and serves file | AC-003 |
| AF-004 | Full-Text Search | Application Function | Searches indexed content with fuzzy matching | AC-004 |
| AF-005 | Document Parsing | Application Function | Extracts text from PDF, DOCX, PPT, etc. | AC-006 |
| AF-006 | Session Management | Application Function | Manages user sessions | AC-002 |
| AF-007 | Cache Operations | Application Function | Stores and retrieves cached data | AC-007 |
| AF-008 | File Deletion | Application Function | Removes file and metadata | AC-003 |
| AF-009 | Subject Listing | Application Function | Returns list of available subjects | AC-003 |
| AF-010 | Favorite Toggle | Application Function | Adds/removes subject from favorites | AC-003 |
| AF-011 | Browse Files | Application Function | Lists files by subject/category | AC-003 |
| AF-012 | Profile Management | Application Function | CRUD operations for subject profiles | AC-003 |

### Application Interfaces

| ID | Element | Type | Description | Protocol |
|----|---------|------|-------------|----------|
| AI-001 | REST API | Application Interface | RESTful HTTP API | HTTP/HTTPS |
| AI-002 | Web UI | Application Interface | Browser-based user interface | HTTP/HTML/JavaScript |
| AI-003 | Elasticsearch API Client | Application Interface | Client for Elasticsearch | HTTP/REST |
| AI-004 | Database ORM | Application Interface | Laravel Eloquent ORM | PDO/PostgreSQL |
| AI-005 | Redis Client | Application Interface | Redis PHP client | Redis Protocol |

### Data Objects

| ID | Element | Type | Description | Storage |
|----|---------|------|-------------|---------|
| DO-001 | User Record | Data Object | User account data | PostgreSQL |
| DO-002 | File Metadata | Data Object | File information and metadata | PostgreSQL |
| DO-003 | File Content | Data Object | Physical file storage | File System |
| DO-004 | Search Index | Data Object | Indexed document content | Elasticsearch |
| DO-005 | Session Data | Data Object | User session information | Redis |
| DO-006 | Cache Entry | Data Object | Cached application data | Redis |
| DO-007 | Favorite Record | Data Object | User's favorite subjects | PostgreSQL |
| DO-008 | Subject Profile | Data Object | Subject metadata and information | PostgreSQL |
| DO-009 | API Token | Data Object | Authentication token | PostgreSQL |

---

## Technology Layer

### System Software

| ID | Element | Type | Description | Version |
|----|---------|------|-------------|---------|
| TS-001 | PHP-FPM | System Software | PHP FastCGI Process Manager | 8.2 |
| TS-002 | PostgreSQL Server | System Software | Relational database server | 15-alpine |
| TS-003 | Redis Server | System Software | In-memory data store | 7-alpine |
| TS-004 | Elasticsearch | System Software | Search and analytics engine | 8.11.0 |
| TS-005 | Kibana | System Software | Elasticsearch management UI | 8.11.0 |
| TS-006 | Nginx | System Software | Web server and reverse proxy | alpine |
| TS-007 | Docker Engine | System Software | Container runtime | Latest |
| TS-008 | Python Runtime | System Software | Python interpreter | 3.11 |
| TS-009 | Dozzle | System Software | Docker log viewer | latest |

### Technology Services

| ID | Element | Type | Description | Port |
|----|---------|------|-------------|------|
| TES-001 | Web Server Service | Technology Service | HTTP request handling | 80 (internal), 8000 (external) |
| TES-002 | Database Service | Technology Service | Relational data storage and querying | 5432 |
| TES-003 | Cache Service | Technology Service | In-memory caching | 6379 |
| TES-004 | Search Engine Service | Technology Service | Full-text search indexing and querying | 9200, 9300 |
| TES-005 | Log Aggregation Service | Technology Service | Centralized log viewing | 8888 |
| TES-006 | Index Management Service | Technology Service | Elasticsearch index management | 5601 |
| TES-007 | Container Orchestration | Technology Service | Container lifecycle management | N/A |

### Nodes (Containers)

| ID | Element | Type | Description | Image |
|----|---------|------|-------------|-------|
| N-001 | entoo_php | Node (Container) | PHP application runtime container | Custom (php:8.2-fpm-alpine) |
| N-002 | entoo_postgres | Node (Container) | PostgreSQL database container | postgres:15-alpine |
| N-003 | entoo_redis | Node (Container) | Redis cache container | redis:7-alpine |
| N-004 | entoo_elasticsearch | Node (Container) | Elasticsearch container | elasticsearch:8.11.0 |
| N-005 | entoo_kibana | Node (Container) | Kibana container | kibana:8.11.0 |
| N-006 | entoo_nginx | Node (Container) | Nginx web server container | nginx:alpine |
| N-007 | entoo_dozzle | Node (Container) | Log viewer container | amir20/dozzle:latest |

### Network Infrastructure

| ID | Element | Type | Description | Driver |
|----|---------|------|-------------|--------|
| NI-001 | entoo_network | Communication Network | Internal Docker bridge network | bridge |
| NI-002 | Host Network Interface | Communication Network | Host machine network interface | host |

### Communication Paths

| ID | Element | Type | Description | Protocol |
|----|---------|------|-------------|----------|
| CP-001 | HTTP Communication | Communication Path | Web traffic between client and server | HTTP/HTTPS |
| CP-002 | Database Connection | Communication Path | Application to database | PostgreSQL Protocol |
| CP-003 | Redis Connection | Communication Path | Application to cache | Redis Protocol |
| CP-004 | Elasticsearch Connection | Communication Path | Application to search engine | HTTP/REST |
| CP-005 | Inter-container Network | Communication Path | Communication between Docker containers | TCP/IP |

### Artifacts (Storage)

| ID | Element | Type | Description | Location |
|----|---------|------|-------------|----------|
| AR-001 | Uploaded Files | Artifact | Physical document files | `/var/www/html/storage/app/uploads/` |
| AR-002 | Database Files | Artifact | PostgreSQL data files | Docker volume `postgres_data` |
| AR-003 | Redis Data | Artifact | Redis persistence files | Docker volume `redis_data` |
| AR-004 | Elasticsearch Index | Artifact | Search index data | Docker volume `elasticsearch_data` |
| AR-005 | Application Code | Artifact | Laravel application source | `/var/www/html/` |
| AR-006 | Configuration Files | Artifact | System configuration | `/var/www/html/.env`, nginx configs |
| AR-007 | Log Files | Artifact | Application and system logs | `/var/www/html/storage/logs/` |

---

## Physical Layer

### Equipment

| ID | Element | Type | Description |
|----|---------|------|-------------|
| EQ-001 | Application Server | Equipment | Physical or virtual server hosting Docker Engine |
| EQ-002 | Storage System | Equipment | File system storage for documents and data |
| EQ-003 | Network Device | Equipment | Network routing and switching infrastructure |

### Facilities

| ID | Element | Type | Description |
|----|---------|------|-------------|
| FC-001 | Data Center / Server Room | Facility | Physical location housing the server infrastructure |

---

## Data Layer

### Database Schema

#### Tables (Data Objects)

| Table Name | Data Object ID | Description | Key Columns |
|------------|----------------|-------------|-------------|
| users | DO-001 | User accounts | id, name, email, password |
| uploaded_files | DO-002 | File metadata | id, user_id, filename, filepath, subject_name, category |
| favorite_subjects | DO-007 | User favorites | id, user_id, subject_name |
| subject_profiles | DO-008 | Subject information | id, subject_name, description, professor_name |
| personal_access_tokens | DO-009 | API authentication | id, tokenable_id, name, token |
| sessions | DO-005 | User sessions | id, user_id, payload |
| cache | DO-006 | Cache entries | key, value, expiration |

### Data Flows

| ID | Flow Name | From | To | Data | Trigger |
|----|-----------|------|-----|------|---------|
| DF-001 | File Upload Flow | User | AC-003 | File + Metadata | User uploads file |
| DF-002 | Indexing Flow | AC-003 | TS-004 | Extracted text | File upload complete |
| DF-003 | Search Query Flow | User | AC-004 | Search query | User searches |
| DF-004 | Search Results Flow | TS-004 | User | Ranked results | Query execution |
| DF-005 | Authentication Flow | User | AC-002 | Credentials | User login |
| DF-006 | Token Issuance Flow | AC-002 | User | Auth token | Successful auth |
| DF-007 | File Download Flow | AC-003 | User | File content | Download request |
| DF-008 | Cache Read Flow | AC-007 | TS-003 | Cache key | Data request |
| DF-009 | Cache Write Flow | TS-003 | AC-007 | Cached data | Cache miss |
| DF-010 | Database Query Flow | AC-001 | TS-002 | SQL query | Data access |
| DF-011 | Session Storage Flow | AC-002 | TS-003 | Session data | User activity |

---

## Relationships Matrix

### Component Relationships

| Source | Type | Target | Relationship | Description |
|--------|------|--------|--------------|-------------|
| BS-001 | realizes | BP-001 | Realization | Document Management realizes Upload Document |
| BP-001 | uses | AS-002 | Serving | Upload process uses File Management API |
| AS-002 | serves | AC-003 | Serving | API serves File Management Module |
| AC-003 | accesses | DO-002 | Access | Module accesses File Metadata |
| AC-003 | uses | AC-006 | Used By | Module uses Document Parser |
| AC-001 | runs-on | N-001 | Assignment | Laravel runs on PHP container |
| N-001 | uses | TS-001 | Assignment | Container uses PHP-FPM |
| AC-003 | flows-to | AC-004 | Flow | File content flows to Search Module |
| AC-004 | uses | TS-004 | Serving | Search uses Elasticsearch |
| AC-002 | accesses | DO-001 | Access | Auth accesses User Record |
| AC-002 | uses | TS-003 | Serving | Auth uses Redis for sessions |
| AC-007 | uses | TS-003 | Serving | Cache Manager uses Redis |
| TS-001 | serves | AC-001 | Realization | PHP-FPM realizes Laravel |
| N-001 | connects-to | N-002 | Flow | PHP connects to PostgreSQL |
| N-001 | connects-to | N-003 | Flow | PHP connects to Redis |
| N-001 | connects-to | N-004 | Flow | PHP connects to Elasticsearch |
| N-006 | serves | N-001 | Flow | Nginx proxies to PHP-FPM |
| BA-001 | uses | BS-001 | Serving | Student uses Document Management |
| BA-001 | uses | BS-002 | Serving | Student uses Search Service |
| AC-003 | stores | AR-001 | Assignment | File Module stores files |
| TS-002 | stores | AR-002 | Assignment | PostgreSQL stores data |
| TS-004 | stores | AR-004 | Assignment | Elasticsearch stores index |

### Layer Dependencies

```
Business Layer (BA, BS, BP, BO)
    ↓ realizes
Application Layer (AC, AS, AF, AI, DO)
    ↓ realizes/runs-on
Technology Layer (TS, TES, N, NI, CP, AR)
    ↓ assigned-to
Physical Layer (EQ, FC)
```

---

## Architecture Views

### View 1: System Context (Business Layer)

**Elements:**
- Business Actors: Student (BA-001), Admin (BA-002), Content Owner (BA-003)
- Business Services: Document Management (BS-001), Search (BS-002), Authentication (BS-003)

**Relationships:**
- Students use Document Management and Search services
- Admins manage system operations
- Content Owners manage their uploaded content

### View 2: Application Cooperation (Application Layer)

**Elements:**
- Laravel Application (AC-001)
- Authentication Module (AC-002)
- File Management Module (AC-003)
- Search Module (AC-004)
- Document Parser (AC-006)
- Cache Manager (AC-007)

**Relationships:**
- Laravel contains all modules
- Modules cooperate through internal interfaces
- Cache Manager serves all modules
- Document Parser serves File Management

### View 3: Technology Infrastructure (Technology Layer)

**Elements:**
- 7 Docker Containers (N-001 to N-007)
- 4 Core Services (PostgreSQL, Redis, Elasticsearch, Nginx)
- Bridge Network (NI-001)

**Relationships:**
- All containers connected via bridge network
- Nginx forwards requests to PHP
- PHP connects to all backend services
- Volumes provide persistent storage

### View 4: Information Flow (Cross-Layer)

**Key Flows:**
1. **Upload Flow:**
   - User → UI → API → File Module → Parser → Elasticsearch + Storage

2. **Search Flow:**
   - User → UI → API → Search Module → Elasticsearch → Results

3. **Authentication Flow:**
   - User → UI → API → Auth Module → Redis/PostgreSQL → Token

### View 5: Deployment (Physical + Technology)

**Elements:**
- Host Server (EQ-001)
- Docker Engine (TS-007)
- 7 Containers
- 3 Persistent Volumes
- Network Bridge

**Structure:**
```
Host Server
├── Docker Engine
│   ├── entoo_nginx (Port 8000)
│   ├── entoo_php
│   ├── entoo_postgres (Port 5432)
│   ├── entoo_redis (Port 6379)
│   ├── entoo_elasticsearch (Ports 9200, 9300)
│   ├── entoo_kibana (Port 5601)
│   └── entoo_dozzle (Port 8888)
├── Volumes
│   ├── postgres_data
│   ├── redis_data
│   └── elasticsearch_data
└── Application Files
    └── /var/www/html
```

---

## Integration Points

### External Integrations

| Integration Point | Type | Direction | Protocol | Description |
|-------------------|------|-----------|----------|-------------|
| INT-001 | Client Browser | Inbound | HTTP/HTTPS | User interface access |
| INT-002 | REST API | Inbound | HTTP/JSON | Programmatic API access |
| INT-003 | Database Import | Inbound | PostgreSQL | Legacy data migration |
| INT-004 | File System | Bidirectional | File I/O | Document storage |

### Internal Integrations

| Integration Point | From | To | Protocol | Purpose |
|-------------------|------|-----|----------|---------|
| INT-101 | Laravel | PostgreSQL | PDO/PostgreSQL | Data persistence |
| INT-102 | Laravel | Redis | Redis Protocol | Caching & sessions |
| INT-103 | Laravel | Elasticsearch | HTTP/REST | Search operations |
| INT-104 | Nginx | PHP-FPM | FastCGI | Request processing |
| INT-105 | Laravel | Document Parser | Internal API | Text extraction |
| INT-106 | All Containers | Docker Network | TCP/IP | Inter-service communication |

### API Endpoints Map

| Endpoint | Method | Service | Function | Data Objects |
|----------|--------|---------|----------|--------------|
| /api/register | POST | AS-001 | AF-001 | DO-001 |
| /api/login | POST | AS-001 | AF-001 | DO-001, DO-009 |
| /api/logout | POST | AS-001 | AF-001 | DO-009 |
| /api/files | GET | AS-002 | AF-011 | DO-002 |
| /api/files | POST | AS-002 | AF-002 | DO-002, DO-003 |
| /api/files/{id} | DELETE | AS-002 | AF-008 | DO-002, DO-003 |
| /api/files/{id}/download | GET | AS-002 | AF-003 | DO-003 |
| /api/search | GET | AS-003 | AF-004 | DO-004 |
| /api/subjects | GET | AS-004 | AF-009 | DO-002 |
| /api/favorites | GET | AS-005 | AF-010 | DO-007 |
| /api/favorites | POST | AS-005 | AF-010 | DO-007 |
| /api/favorites/{id} | DELETE | AS-005 | AF-010 | DO-007 |
| /api/subject-profiles | GET | AS-008 | AF-012 | DO-008 |
| /api/subject-profiles | POST | AS-008 | AF-012 | DO-008 |
| /api/health | GET | AS-006 | - | - |
| /api/stats | GET | AS-007 | - | DO-002, DO-001, DO-004 |

---

## Performance Optimizations

### Caching Strategy

| Cache Layer | Technology | TTL | Data Objects | Purpose |
|-------------|------------|-----|--------------|---------|
| Application Cache | Redis | 5 min | DO-002, DO-007, DO-008 | Reduce DB queries |
| Session Cache | Redis | 24 hours | DO-005 | Fast session access |
| Query Cache | Redis | 5 min | DO-001, DO-002 | Cache DB results |
| Config Cache | File | Permanent | AR-006 | Optimize boot time |
| Route Cache | File | Permanent | AR-005 | Fast routing |

### Database Optimizations

| Optimization | Element | Type | Impact |
|-------------|---------|------|--------|
| Index on subject_name | DO-002 | Index | Faster subject queries |
| Index on category | DO-002 | Index | Faster category queries |
| Index on file_extension | DO-002 | Index | Faster type filtering |
| Index on created_at | DO-002 | Index | Faster date sorting |
| Composite index | DO-002 | Index | Optimized subject+category queries |
| Foreign key indexes | All tables | Index | Join performance |

---

## Security Architecture

### Security Layers

| Layer | Mechanism | Implementation | Element |
|-------|-----------|----------------|---------|
| Authentication | Token-based | Laravel Sanctum | AC-002 |
| Authorization | RBAC | Laravel Policies | AC-002 |
| Transport Security | HTTPS | Nginx SSL | TS-006 |
| Data Encryption | At Rest | Storage encryption | AR-001, AR-002 |
| Session Security | Secure cookies | Laravel Session | DO-005 |
| API Security | Bearer tokens | Sanctum | DO-009 |
| Input Validation | Laravel Validation | Request validation | AC-001 |
| CSRF Protection | Token validation | Laravel CSRF | AC-001 |

---

## Monitoring and Observability

### Monitoring Points

| Element | Type | Metric | Tool |
|---------|------|--------|------|
| N-001 to N-007 | Infrastructure | CPU, Memory, Disk | Docker Stats |
| TES-002 | Database | Query performance, connections | PostgreSQL logs |
| TES-003 | Cache | Hit rate, memory usage | Redis INFO |
| TES-004 | Search | Query latency, index size | Elasticsearch API |
| AC-001 | Application | Response time, errors | Laravel logs |
| NI-001 | Network | Throughput, latency | Docker network stats |

### Logging Strategy

| Log Type | Source | Destination | Viewer |
|----------|--------|-------------|---------|
| Application | AC-001 | AR-007 | Dozzle (TS-009) |
| System | All containers | Docker logs | Dozzle (TS-009) |
| Database | TS-002 | Container logs | PostgreSQL client |
| Search | TS-004 | Container logs | Kibana (TS-005) |
| Web Server | TS-006 | Access/Error logs | Dozzle (TS-009) |

---

## Disaster Recovery

### Backup Elements

| Element | Backup Type | Frequency | Storage |
|---------|-------------|-----------|---------|
| DO-001, DO-002 | Database dump | Daily | External storage |
| AR-001 | File backup | Daily | External storage |
| AR-004 | Index snapshot | Weekly | External storage |
| AR-006 | Config backup | On change | Version control |
| AR-002, AR-003 | Volume backup | Daily | External storage |

### Recovery Procedures

| Scenario | Recovery Steps | RTO | RPO |
|----------|----------------|-----|-----|
| Container failure | Restart container | 1 min | 0 |
| Data corruption | Restore from backup | 30 min | 24 hours |
| Complete system loss | Rebuild from backups | 2 hours | 24 hours |
| Database failure | Restore DB dump | 15 min | 24 hours |

---

## ArchiMate Element Summary

### Element Count by Layer

| Layer | Element Type | Count |
|-------|--------------|-------|
| Business | Actors | 3 |
| Business | Services | 4 |
| Business | Processes | 5 |
| Business | Objects | 5 |
| Application | Components | 8 |
| Application | Services | 8 |
| Application | Functions | 12 |
| Application | Interfaces | 5 |
| Application | Data Objects | 9 |
| Technology | System Software | 9 |
| Technology | Services | 7 |
| Technology | Nodes | 7 |
| Technology | Networks | 2 |
| Technology | Paths | 5 |
| Technology | Artifacts | 7 |
| Physical | Equipment | 3 |
| Physical | Facilities | 1 |
| **Total** | | **100** |

### Key Relationships

- **Realization:** Business → Application → Technology
- **Assignment:** Application → Technology (deployment)
- **Serving:** Services provide capabilities
- **Flow:** Data and control flow
- **Access:** Data access relationships
- **Composition:** Container relationships

---

## ArchiMate Modeling Notes

### Suggested Views for ArchiMate Tool

1. **Motivation View** - Goals and requirements
2. **Business Process View** - BP-001 through BP-005
3. **Application Cooperation View** - AC-001 through AC-008
4. **Technology Infrastructure View** - N-001 through N-007
5. **Layered View** - Full stack from business to technology
6. **Data Flow View** - DF-001 through DF-011
7. **Deployment View** - Container deployment structure
8. **Integration View** - API and integration points

### Color Coding Recommendations

- **Business Layer:** Yellow/Gold
- **Application Layer:** Blue
- **Technology Layer:** Green
- **Physical Layer:** Gray
- **Data Objects:** Purple
- **Services:** Light Blue
- **Interfaces:** Orange

---

**End of ArchiMate Architecture Documentation**

This document provides a comprehensive mapping of the Entoo system to ArchiMate 3.1 elements and relationships. Use this as a reference when creating ArchiMate models in tools like Archi, BiZZdesign, or Sparx Enterprise Architect.
