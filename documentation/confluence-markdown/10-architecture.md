# System Architecture

## Executive Summary

**Entoo** is a document management system built on a modern, scalable microservices-inspired architecture. The system follows a layered architecture pattern with clear separation between presentation, application, domain, and infrastructure layers.

**Key Architectural Characteristics:**
- **Pattern:** Layered Architecture with Domain-Driven Design principles
- **Style:** API-first, stateless RESTful services
- **Deployment:** Containerized microservices (Docker)
- **Performance:** High-performance with Swoole/Octane, Redis caching, Elasticsearch
- **Scalability:** Horizontally scalable components
- **Security:** Token-based authentication, policy-based authorization

---

## 1. Architecture Overview

### System Context

```
┌─────────────────────────────────────────────────────────────────┐
│                         ENTOO SYSTEM                             │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌──────────────┐        ┌──────────────┐     ┌──────────────┐ │
│  │    Users     │───────▶│  Web Browser │────▶│   Vite Dev   │ │
│  │  (Students,  │        │  (Frontend)  │     │    Server    │ │
│  │  Teachers,   │        └──────────────┘     └──────────────┘ │
│  │  Admins)     │               │                              │
│  └──────────────┘               │                              │
│                                 │                              │
│         ┌───────────────────────▼──────────────────────┐       │
│         │         Laravel API Backend                   │       │
│         │  ┌──────────────────────────────────────┐    │       │
│         │  │  Controllers (REST Endpoints)        │    │       │
│         │  └──────────────────────────────────────┘    │       │
│         │  ┌──────────────────────────────────────┐    │       │
│         │  │  Business Logic (Services)           │    │       │
│         │  └──────────────────────────────────────┘    │       │
│         │  ┌──────────────────────────────────────┐    │       │
│         │  │  Data Access (Eloquent ORM)          │    │       │
│         │  └──────────────────────────────────────┘    │       │
│         └───────────────────────────────────────────────┘       │
│                     │         │         │                       │
│         ┌───────────▼─┐  ┌────▼────┐  ┌▼──────────────┐        │
│         │ PostgreSQL  │  │  Redis  │  │ Elasticsearch │        │
│         │  Database   │  │  Cache  │  │  Search Engine│        │
│         └─────────────┘  └─────────┘  └───────────────┘        │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘

External Systems:
- Email Service (MailHog/SMTP)
- File Storage (Local/S3)
- Legacy File System (Read-only)
```

---

## 2. Layered Architecture (Archimate Application Layer)

### Layer Structure

```
┌─────────────────────────────────────────────────────────────┐
│                    PRESENTATION LAYER                        │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │   Web UI     │  │  REST API    │  │   CLI/Artisan│      │
│  │  (Blade +    │  │ (JSON/HTTP)  │  │   Commands   │      │
│  │  JavaScript) │  │              │  │              │      │
│  └──────────────┘  └──────────────┘  └──────────────┘      │
└────────────────────────┬────────────────────────────────────┘
                         │
┌────────────────────────▼────────────────────────────────────┐
│                   APPLICATION LAYER                          │
│  ┌──────────────────────────────────────────────────┐       │
│  │           Controllers (HTTP Request Handlers)     │       │
│  │  - AuthController      - FileController          │       │
│  │  - SubjectController   - SearchController        │       │
│  │  - AdminController     - FavoriteController      │       │
│  └──────────────────────────────────────────────────┘       │
│  ┌──────────────────────────────────────────────────┐       │
│  │           Middleware (Request Filters)            │       │
│  │  - Authentication      - Rate Limiting           │       │
│  │  - Authorization       - Token Caching           │       │
│  └──────────────────────────────────────────────────┘       │
└────────────────────────┬────────────────────────────────────┘
                         │
┌────────────────────────▼────────────────────────────────────┐
│                   DOMAIN/BUSINESS LAYER                      │
│  ┌──────────────────────────────────────────────────┐       │
│  │              Business Services                    │       │
│  │  - ElasticsearchService  (Search Operations)     │       │
│  │  - DocumentParserService (Content Extraction)    │       │
│  └──────────────────────────────────────────────────┘       │
│  ┌──────────────────────────────────────────────────┐       │
│  │              Domain Models (Eloquent)             │       │
│  │  - User              - UploadedFile              │       │
│  │  - FavoriteSubject   - SubjectProfile            │       │
│  └──────────────────────────────────────────────────┘       │
│  ┌──────────────────────────────────────────────────┐       │
│  │              Policies (Authorization Rules)       │       │
│  │  - FilePolicy  (download, view, update, delete)  │       │
│  └──────────────────────────────────────────────────┘       │
│  ┌──────────────────────────────────────────────────┐       │
│  │              Queue Jobs (Async Processing)        │       │
│  │  - ProcessUploadedFile (Content indexing)        │       │
│  └──────────────────────────────────────────────────┘       │
└────────────────────────┬────────────────────────────────────┘
                         │
┌────────────────────────▼────────────────────────────────────┐
│                  INFRASTRUCTURE LAYER                        │
│  ┌──────────┐  ┌──────────┐  ┌────────────┐  ┌──────────┐ │
│  │PostgreSQL│  │  Redis   │  │Elasticsearch│  │ Storage  │ │
│  │ Database │  │  Cache   │  │   Search    │  │  System  │ │
│  └──────────┘  └──────────┘  └────────────┘  └──────────┘ │
│  ┌──────────┐  ┌──────────┐  ┌────────────┐               │
│  │  Email   │  │  Logging │  │ Monitoring │               │
│  │ Service  │  │  System  │  │   Tools    │               │
│  └──────────┘  └──────────┘  └────────────┘               │
└─────────────────────────────────────────────────────────────┘
```

---

## 3. Application Components (Archimate Application Components)

### Component Diagram

```
┌────────────────────────────────────────────────────────────────┐
│                   APPLICATION COMPONENTS                        │
├────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌─────────────────────┐         ┌─────────────────────┐      │
│  │  Authentication &   │         │  File Management    │      │
│  │  Authorization      │         │  Component          │      │
│  ├─────────────────────┤         ├─────────────────────┤      │
│  │ - Login/Register    │         │ - Upload Files      │      │
│  │ - Password Reset    │         │ - Download Files    │      │
│  │ - Token Management  │         │ - Delete Files      │      │
│  │ - User Profiles     │         │ - Browse Files      │      │
│  │ - Admin Check       │         │ - File Processing   │      │
│  └─────────────────────┘         └─────────────────────┘      │
│                                                                 │
│  ┌─────────────────────┐         ┌─────────────────────┐      │
│  │  Search &           │         │  Subject Management │      │
│  │  Discovery          │         │  Component          │      │
│  ├─────────────────────┤         ├─────────────────────┤      │
│  │ - Full-text Search  │         │ - Browse Subjects   │      │
│  │ - Faceted Filters   │         │ - Subject Profiles  │      │
│  │ - Search Suggestions│         │ - Favorites         │      │
│  │ - Result Ranking    │         │ - Categories        │      │
│  └─────────────────────┘         └─────────────────────┘      │
│                                                                 │
│  ┌─────────────────────┐         ┌─────────────────────┐      │
│  │  Admin Panel        │         │  Background Jobs    │      │
│  │  Component          │         │  Component          │      │
│  ├─────────────────────┤         ├─────────────────────┤      │
│  │ - User Management   │         │ - File Processing   │      │
│  │ - File Management   │         │ - Content Extraction│      │
│  │ - Statistics        │         │ - Search Indexing   │      │
│  │ - Health Monitoring │         │ - Cache Warming     │      │
│  └─────────────────────┘         └─────────────────────┘      │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## 4. Business Processes (Archimate Business Layer)

### Primary Business Processes

#### 1. User Registration and Authentication

```
┌──────────┐    ┌──────────┐    ┌──────────┐    ┌──────────┐
│  User    │───▶│ Register │───▶│  Verify  │───▶│  Login   │
│  Arrives │    │ Account  │    │  Email   │    │  Access  │
└──────────┘    └──────────┘    └──────────┘    └──────────┘
                     │
                     ▼
              ┌──────────┐
              │  Create  │
              │Sanctum   │
              │  Token   │
              └──────────┘
```

**Actors:**
- Student
- Teacher
- Administrator

**Inputs:**
- Name, Email, Password

**Outputs:**
- User Account
- Authentication Token

**Business Rules:**
- Email must be unique
- Password minimum 8 characters
- Email verification required (optional)

---

#### 2. File Upload and Processing

```
┌──────────┐    ┌──────────┐    ┌──────────┐    ┌──────────┐
│  Select  │───▶│  Upload  │───▶│  Process │───▶│  Index   │
│   File   │    │   File   │    │ Content  │    │  in ES   │
└──────────┘    └──────────┘    └──────────┘    └──────────┘
                     │                │
                     ▼                ▼
              ┌──────────┐    ┌──────────┐
              │  Store   │    │  Extract │
              │  on Disk │    │   Text   │
              └──────────┘    └──────────┘
```

**Actors:**
- Authenticated User

**Inputs:**
- File (PDF, DOC, DOCX, PPT, PPTX, TXT)
- Subject Name
- Category

**Outputs:**
- Stored File
- Searchable Document

**Business Rules:**
- User must be authenticated
- File size limit: 10MB
- Valid categories: Materialy, Otazky, Prednasky, Seminare
- File processed asynchronously

---

#### 3. Document Search and Discovery

```
┌──────────┐    ┌──────────┐    ┌──────────┐    ┌──────────┐
│  Enter   │───▶│  Search  │───▶│  Filter  │───▶│  View    │
│  Query   │    │   in ES  │    │ Results  │    │ Results  │
└──────────┘    └──────────┘    └──────────┘    └──────────┘
                                      │
                                      ▼
                               ┌──────────┐
                               │Download  │
                               │   File   │
                               └──────────┘
```

**Actors:**
- Any Visitor (search)
- Authenticated User (download)

**Inputs:**
- Search Query
- Filters (subject, category, user)

**Outputs:**
- List of Matching Documents
- File Download

**Business Rules:**
- Search is public (no auth required)
- Download requires authentication
- Fuzzy matching enabled
- Results cached for 5 minutes

---

#### 4. Subject Management

```
┌──────────┐    ┌──────────┐    ┌──────────┐    ┌──────────┐
│  Browse  │───▶│  Select  │───▶│   View   │───▶│ Favorite │
│ Subjects │    │ Subject  │    │  Files   │    │ Subject  │
└──────────┘    └──────────┘    └──────────┘    └──────────┘
                     │
                     ▼
              ┌──────────┐
              │   View   │
              │  Profile │
              └──────────┘
```

**Actors:**
- Any Visitor (browse)
- Authenticated User (favorites, profiles)

**Inputs:**
- Subject Name

**Outputs:**
- Subject Files
- Subject Profile
- Favorite Status

**Business Rules:**
- Browse is public
- Favorites require authentication
- Profile creation requires authentication

---

#### 5. Administration

```
┌──────────┐    ┌──────────┐    ┌──────────┐
│  Login   │───▶│  Manage  │───▶│  Monitor │
│ as Admin │    │  Users   │    │  System  │
└──────────┘    └──────────┘    └──────────┘
                     │
                     ▼
              ┌──────────┐
              │  Manage  │
              │  Files   │
              └──────────┘
```

**Actors:**
- System Administrator

**Inputs:**
- Admin Credentials

**Outputs:**
- User CRUD Operations
- File Management
- System Statistics

**Business Rules:**
- User must have is_admin = true
- All operations logged
- Cannot delete own admin account

---

## 5. Data Architecture

### Conceptual Data Model

```
┌─────────────────────────────────────────────────────────────┐
│                     DATA ENTITIES                            │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  ┌─────────────┐                                            │
│  │    User     │                                            │
│  ├─────────────┤                                            │
│  │ - id        │                                            │
│  │ - name      │                                            │
│  │ - email     │────────┐                                   │
│  │ - password  │        │                                   │
│  │ - is_admin  │        │ 1                                 │
│  └─────────────┘        │                                   │
│         │               │                                   │
│         │ 1             │                                   │
│         │               │                                   │
│         │ *             │                                   │
│  ┌──────▼──────────┐   │                                   │
│  │  UploadedFile   │   │                                   │
│  ├─────────────────┤   │                                   │
│  │ - id            │   │                                   │
│  │ - user_id       │───┘                                   │
│  │ - filename      │                                       │
│  │ - subject_name  │                                       │
│  │ - category      │                                       │
│  │ - file_size     │                                       │
│  │ - file_extension│                                       │
│  │ - processing_..│                                       │
│  └─────────────────┘                                       │
│         │                                                   │
│         │ 1                                                 │
│         │                                                   │
│         │ 1                                                 │
│  ┌──────▼────────────┐                                     │
│  │  SubjectProfile   │                                     │
│  ├───────────────────┤                                     │
│  │ - id              │                                     │
│  │ - subject_name    │                                     │
│  │ - description     │                                     │
│  │ - professor_name  │                                     │
│  │ - course_code     │                                     │
│  │ - credits         │                                     │
│  └───────────────────┘                                     │
│                                                              │
│  ┌─────────────┐                                            │
│  │    User     │                                            │
│  └─────────────┘                                            │
│         │ 1                                                 │
│         │                                                   │
│         │ *                                                 │
│  ┌──────▼──────────────┐                                   │
│  │  FavoriteSubject    │                                   │
│  ├─────────────────────┤                                   │
│  │ - id                │                                   │
│  │ - user_id           │                                   │
│  │ - subject_name      │                                   │
│  └─────────────────────┘                                   │
│                                                              │
└──────────────────────────────────────────────────────────────┘
```

---

### Data Flow Diagram

```
┌─────────┐  File Upload    ┌──────────────┐
│  User   │────────────────▶│ PostgreSQL   │
└─────────┘                 │  (metadata)  │
     │                      └──────────────┘
     │                             │
     │  Queue Job                  │ Read
     │  Dispatch                   │
     ▼                             ▼
┌──────────────┐            ┌──────────────┐
│ Redis Queue  │───────────▶│Queue Worker  │
└──────────────┘  Process   └──────────────┘
                                   │
                      ┌────────────┴───────────┐
                      ▼                        ▼
              ┌──────────────┐        ┌──────────────┐
              │File Storage  │        │Elasticsearch │
              │  (uploads/)  │        │    (index)   │
              └──────────────┘        └──────────────┘
                      │                        │
                      └────────────┬───────────┘
                                   │ Search
                                   ▼
                              ┌─────────┐
                              │  User   │
                              │(Results)│
                              └─────────┘
```

---

## 6. Integration Architecture

### External System Integrations

```
┌────────────────────────────────────────────────────┐
│              ENTOO SYSTEM                          │
│                                                    │
│  ┌──────────────────────────────────────────┐    │
│  │       Laravel Application                │    │
│  └──────────────────────────────────────────┘    │
│         │           │           │                 │
│         │           │           │                 │
└─────────┼───────────┼───────────┼─────────────────┘
          │           │           │
          ▼           ▼           ▼
   ┌──────────┐ ┌──────────┐ ┌──────────┐
   │  Email   │ │  Legacy  │ │  Cloud   │
   │ Service  │ │  Files   │ │ Storage  │
   │ (SMTP)   │ │ System   │ │  (S3)    │
   └──────────┘ └──────────┘ └──────────┘
```

---

### API Interfaces

**REST API Endpoints:**

```
┌─────────────────────────────────────────────┐
│         PUBLIC API (No Auth)                │
├─────────────────────────────────────────────┤
│ GET  /api/health                            │
│ POST /api/login                             │
│ POST /api/register                          │
│ GET  /api/subjects                          │
│ GET  /api/files                             │
│ GET  /api/search                            │
│ GET  /api/subject-profiles                  │
└─────────────────────────────────────────────┘

┌─────────────────────────────────────────────┐
│      PROTECTED API (Sanctum Auth)           │
├─────────────────────────────────────────────┤
│ POST   /api/logout                          │
│ GET    /api/user                            │
│ POST   /api/files                           │
│ DELETE /api/files/{id}                      │
│ GET    /api/files/{id}/download             │
│ POST   /api/favorites                       │
│ DELETE /api/favorites/{id}                  │
│ POST   /api/subject-profiles                │
│ PUT    /api/subject-profiles/{name}         │
└─────────────────────────────────────────────┘

┌─────────────────────────────────────────────┐
│      ADMIN API (Admin Only)                 │
├─────────────────────────────────────────────┤
│ GET    /api/admin/users                     │
│ POST   /api/admin/users                     │
│ PUT    /api/admin/users/{id}                │
│ DELETE /api/admin/users/{id}                │
│ GET    /api/admin/files                     │
│ DELETE /api/admin/files/{id}                │
│ GET    /api/admin/stats                     │
└─────────────────────────────────────────────┘
```

---

## 7. Security Architecture

### Security Layers

```
┌─────────────────────────────────────────────────────────┐
│                  SECURITY ARCHITECTURE                   │
├─────────────────────────────────────────────────────────┤
│                                                          │
│  LAYER 1: Network Security                              │
│  ┌────────────────────────────────────────────────┐    │
│  │ - Docker Network Isolation                     │    │
│  │ - Port Restrictions                            │    │
│  │ - Reverse Proxy (Nginx)                        │    │
│  └────────────────────────────────────────────────┘    │
│                                                          │
│  LAYER 2: Application Security                          │
│  ┌────────────────────────────────────────────────┐    │
│  │ - Laravel Sanctum (Token Auth)                 │    │
│  │ - Password Hashing (bcrypt)                    │    │
│  │ - CSRF Protection                              │    │
│  │ - Rate Limiting (ConditionalThrottle)          │    │
│  │ - XSS Protection (DOMPurify)                   │    │
│  │ - SQL Injection Protection (Eloquent ORM)      │    │
│  └────────────────────────────────────────────────┘    │
│                                                          │
│  LAYER 3: Authorization                                 │
│  ┌────────────────────────────────────────────────┐    │
│  │ - Policy-Based Authorization (FilePolicy)      │    │
│  │ - Admin Middleware (IsAdmin)                   │    │
│  │ - Resource Ownership Checks                    │    │
│  └────────────────────────────────────────────────┘    │
│                                                          │
│  LAYER 4: Data Security                                 │
│  ┌────────────────────────────────────────────────┐    │
│  │ - Database Password Protection                 │    │
│  │ - Redis Password Protection                    │    │
│  │ - Encrypted Environment Variables              │    │
│  │ - Secure File Storage                          │    │
│  └────────────────────────────────────────────────┘    │
│                                                          │
└──────────────────────────────────────────────────────────┘
```

---

### Authentication Flow

```
┌─────────┐                                    ┌──────────┐
│ Client  │                                    │  Server  │
└────┬────┘                                    └────┬─────┘
     │                                              │
     │  POST /api/login                             │
     │  {email, password}                           │
     ├─────────────────────────────────────────────▶│
     │                                              │
     │                                 ┌────────────┴─────────┐
     │                                 │ 1. Validate password │
     │                                 │ 2. Create token      │
     │                                 │ 3. Store in DB       │
     │                                 └────────────┬─────────┘
     │                                              │
     │  200 OK {user, token}                        │
     │◀─────────────────────────────────────────────┤
     │                                              │
     │  Store token in localStorage                 │
     │                                              │
     │  GET /api/files                              │
     │  Header: Authorization: Bearer {token}       │
     ├─────────────────────────────────────────────▶│
     │                                              │
     │                                 ┌────────────┴─────────┐
     │                                 │ 1. Extract token     │
     │                                 │ 2. Check cache       │
     │                                 │ 3. Validate token    │
     │                                 │ 4. Load user         │
     │                                 └────────────┬─────────┘
     │                                              │
     │  200 OK {files: [...]}                       │
     │◀─────────────────────────────────────────────┤
     │                                              │
```

---

## 8. Technology Stack (Archimate Technology Layer)

### Technology Architecture

```
┌────────────────────────────────────────────────────────────┐
│               TECHNOLOGY INFRASTRUCTURE                     │
├────────────────────────────────────────────────────────────┤
│                                                             │
│  PRESENTATION TIER                                          │
│  ┌──────────────────────────────────────────────────┐     │
│  │ - HTML5, CSS3, Tailwind CSS 4                    │     │
│  │ - Vanilla JavaScript (ES6+)                      │     │
│  │ - Vite 7 (Build Tool)                            │     │
│  │ - DOMPurify (XSS Protection)                     │     │
│  └──────────────────────────────────────────────────┘     │
│                                                             │
│  APPLICATION TIER                                           │
│  ┌──────────────────────────────────────────────────┐     │
│  │ - PHP 8.2                                         │     │
│  │ - Laravel 12                                      │     │
│  │ - Laravel Octane (Swoole)                        │     │
│  │ - Laravel Sanctum (Auth)                         │     │
│  │ - Composer 2 (Dependency Management)             │     │
│  └──────────────────────────────────────────────────┘     │
│                                                             │
│  DATA TIER                                                  │
│  ┌──────────────────────────────────────────────────┐     │
│  │ - PostgreSQL 15                                   │     │
│  │ - Redis 7                                         │     │
│  │ - Elasticsearch 8.11                             │     │
│  └──────────────────────────────────────────────────┘     │
│                                                             │
│  INFRASTRUCTURE TIER                                        │
│  ┌──────────────────────────────────────────────────┐     │
│  │ - Docker / Docker Compose                        │     │
│  │ - Nginx (Reverse Proxy)                          │     │
│  │ - Alpine Linux (Containers)                      │     │
│  └──────────────────────────────────────────────────┘     │
│                                                             │
│  SUPPORTING SERVICES                                        │
│  ┌──────────────────────────────────────────────────┐     │
│  │ - MailHog (Email Testing)                        │     │
│  │ - Kibana (ES Visualization)                      │     │
│  │ - Dozzle (Log Viewer)                            │     │
│  │ - Laravel Telescope (Debugging)                  │     │
│  └──────────────────────────────────────────────────┘     │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

---

## 9. Deployment Architecture

### Production Deployment

```
                    ┌──────────────────┐
                    │   Load Balancer  │
                    │     (Nginx)      │
                    └────────┬─────────┘
                             │
              ┌──────────────┴──────────────┐
              │                             │
         ┌────▼─────┐                  ┌────▼─────┐
         │  Nginx   │                  │  Nginx   │
         │Container │                  │Container │
         └────┬─────┘                  └────┬─────┘
              │                             │
         ┌────▼─────┐                  ┌────▼─────┐
         │   PHP    │                  │   PHP    │
         │ (Octane) │                  │ (Octane) │
         └────┬─────┘                  └────┬─────┘
              │                             │
              └──────────────┬──────────────┘
                             │
         ┌───────────────────┴──────────────────────┐
         │                   │                      │
    ┌────▼─────┐      ┌──────▼──────┐      ┌───────▼────┐
    │PostgreSQL│      │    Redis    │      │Elasticsearch│
    │(Primary) │      │  (Cluster)  │      │  (Cluster)  │
    └────┬─────┘      └─────────────┘      └─────────────┘
         │
    ┌────▼─────┐
    │PostgreSQL│
    │(Replica) │
    └──────────┘
```

**Scalability Strategy:**
- **Horizontal Scaling:** Multiple PHP containers behind load balancer
- **Database Replication:** Read replicas for queries
- **Redis Clustering:** Multiple Redis nodes
- **Elasticsearch Clustering:** Multi-node ES cluster
- **Stateless Design:** All state in databases/cache (no session affinity needed)

---

### Container Architecture

```
┌─────────────────────────────────────────────────────────┐
│                    DOCKER HOST                          │
├─────────────────────────────────────────────────────────┤
│                                                          │
│  ┌──────────────────────────────────────────────────┐  │
│  │            entoo_network (Bridge)                │  │
│  │                                                  │  │
│  │  ┌──────────┐  ┌──────────┐  ┌──────────┐     │  │
│  │  │   PHP    │  │  Nginx   │  │  Queue   │     │  │
│  │  │ :8000    │  │  :80     │  │ Worker   │     │  │
│  │  └──────────┘  └──────────┘  └──────────┘     │  │
│  │                                                  │  │
│  │  ┌──────────┐  ┌──────────┐  ┌──────────┐     │  │
│  │  │PostgreSQL│  │  Redis   │  │Elasticsearch│  │  │
│  │  │ :5432    │  │  :6379   │  │ :9200/:9300 │  │  │
│  │  └──────────┘  └──────────┘  └──────────┘     │  │
│  │                                                  │  │
│  │  ┌──────────┐  ┌──────────┐  ┌──────────┐     │  │
│  │  │ MailHog  │  │  Kibana  │  │  Dozzle  │     │  │
│  │  │:1025/:8025│  │ :5601    │  │  :8888   │     │  │
│  │  └──────────┘  └──────────┘  └──────────┘     │  │
│  │                                                  │  │
│  └──────────────────────────────────────────────────┘  │
│                                                          │
│  Volumes:                                                │
│  - postgres_data → /var/lib/postgresql/data            │
│  - redis_data → /data                                   │
│  - elasticsearch_data → /usr/share/elasticsearch/data  │
│  - ./webapp → /var/www/html                            │
│  - ./storage → /var/www/html/storage                   │
│                                                          │
└──────────────────────────────────────────────────────────┘
```

---

## 10. Performance Architecture

### Caching Strategy

```
┌─────────────────────────────────────────────────────────┐
│                  CACHING LAYERS                          │
├─────────────────────────────────────────────────────────┤
│                                                          │
│  LAYER 1: HTTP Caching                                  │
│  - Static assets (Nginx): 1 year                        │
│  - API responses: Cache-Control headers                 │
│                                                          │
│  LAYER 2: Application Caching (Redis)                   │
│  - Sanctum tokens: 30 minutes                           │
│  - User models: 30 minutes                              │
│  - Dashboard stats: 30 minutes                          │
│  - Subject lists: 30 minutes                            │
│  - File lists: 5 minutes                                │
│                                                          │
│  LAYER 3: ORM Caching (Eloquent)                        │
│  - Query results: Per-request                           │
│  - Eager loading: Prevent N+1                           │
│  - Relationship caching: withCount()                    │
│                                                          │
│  LAYER 4: Opcode Caching (PHP OpCache)                  │
│  - Compiled PHP code: Persistent                        │
│  - Configuration cache: artisan config:cache            │
│  - Route cache: artisan route:cache                     │
│                                                          │
│  LAYER 5: Search Caching (Elasticsearch)                │
│  - Query cache: Built-in                                │
│  - Field data cache: Built-in                           │
│  - Result cache: 5 minutes (application layer)          │
│                                                          │
└──────────────────────────────────────────────────────────┘
```

---

### Request Processing Flow

```
┌─────────┐
│  User   │
└────┬────┘
     │ HTTP Request
     ▼
┌──────────────┐
│    Nginx     │ ← Static file? → Serve directly
└──────┬───────┘
       │ Proxy to PHP
       ▼
┌──────────────┐
│ConditionalThr│ ← Rate limit? → 429 Too Many Requests
│   ottle      │
└──────┬───────┘
       │
       ▼
┌──────────────┐
│CacheSanctum  │ ← Check Redis → Load user
│   Token      │
└──────┬───────┘
       │
       ▼
┌──────────────┐
│  Controller  │ ← Business logic
└──────┬───────┘
       │
       ▼
┌──────────────┐
│   Service    │ ← Query cache? → Return cached
│    Layer     │
└──────┬───────┘
       │ Cache miss
       ▼
┌──────────────┐
│  Database/   │ ← Query → Store in cache
│     ES       │
└──────┬───────┘
       │
       ▼
┌──────────────┐
│   Response   │ → JSON
└──────────────┘
```

**Typical Response Times:**
- Static assets: <50ms
- Cached API response: <100ms
- Database query (cached): <200ms
- Search query (cached): <300ms
- File upload: 500ms-5s (processing async)

---

## 11. Business Logic Architecture

### Core Business Rules

#### File Management Rules

```
┌────────────────────────────────────────────────────┐
│          FILE UPLOAD BUSINESS RULES                │
├────────────────────────────────────────────────────┤
│                                                     │
│  Pre-conditions:                                    │
│  - User must be authenticated                      │
│  - File size ≤ 10MB                                │
│  - File type ∈ {pdf, doc, docx, ppt, pptx, txt}   │
│  - Subject name provided                           │
│  - Category ∈ {Materialy, Otazky, Prednasky,      │
│                 Seminare}                          │
│                                                     │
│  Processing Rules:                                  │
│  1. Store file with unique filename                │
│  2. Create database record (status: pending)       │
│  3. Dispatch async processing job                  │
│  4. Return success immediately                     │
│                                                     │
│  Async Processing Rules:                           │
│  1. Update status to 'processing'                  │
│  2. Extract text content (timeout: 5 minutes)      │
│  3. Index in Elasticsearch                         │
│  4. Update status to 'completed' or 'failed'       │
│  5. Retry up to 3 times on failure                 │
│  6. Clear related caches                           │
│                                                     │
│  Post-conditions:                                   │
│  - File stored in storage/app/uploads/{subject}/.. │
│  - Database record created                         │
│  - File searchable (after processing)              │
│                                                     │
└─────────────────────────────────────────────────────┘
```

---

#### Search Business Rules

```
┌────────────────────────────────────────────────────┐
│           SEARCH BUSINESS RULES                    │
├────────────────────────────────────────────────────┤
│                                                     │
│  Query Processing:                                  │
│  1. Fuzzy matching enabled (edit distance: 2)      │
│  2. Field boosting:                                │
│     - filename: 3x                                 │
│     - original_filename: 2x                        │
│     - subject_name: 2x                             │
│     - content: 1x                                  │
│  3. Minimum score: 1.0                             │
│  4. Maximum results: 1000                          │
│                                                     │
│  Filtering:                                         │
│  - By subject (exact match)                        │
│  - By category (exact match)                       │
│  - By user_id (exact match)                        │
│                                                     │
│  Result Ordering:                                   │
│  - Primary: Relevance score (descending)           │
│  - Secondary: Created date (descending)            │
│                                                     │
│  Caching:                                           │
│  - Cache key: hash(query + filters)                │
│  - TTL: 5 minutes                                  │
│                                                     │
│  Highlighting:                                      │
│  - Enabled on: filename, content                   │
│  - Max fragments: 3                                │
│  - Fragment size: 150 characters                   │
│                                                     │
└─────────────────────────────────────────────────────┘
```

---

#### Authorization Business Rules

```
┌────────────────────────────────────────────────────┐
│        AUTHORIZATION BUSINESS RULES                │
├────────────────────────────────────────────────────┤
│                                                     │
│  File Download:                                     │
│  - Allow: Any authenticated user                   │
│  - Deny: Unauthenticated users                     │
│  - Rationale: Document sharing platform            │
│                                                     │
│  File View (Details):                               │
│  - Allow: File owner only                          │
│  - Rationale: Privacy of upload details            │
│                                                     │
│  File Delete:                                       │
│  - Allow: File owner OR admin                      │
│  - Deny: Other users                               │
│  - Rationale: Data ownership                       │
│                                                     │
│  File Upload:                                       │
│  - Allow: Any authenticated user                   │
│  - Deny: Unauthenticated users                     │
│  - Rationale: Prevent spam, ensure accountability  │
│                                                     │
│  Admin Operations:                                  │
│  - Allow: Users with is_admin = true               │
│  - Deny: Regular users                             │
│  - Operations: User CRUD, File management,         │
│                System stats                        │
│                                                     │
│  Subject Profiles:                                  │
│  - View: Public (anyone)                           │
│  - Create: Authenticated users                     │
│  - Edit: Original creator OR admin                 │
│  - Delete: Original creator OR admin               │
│                                                     │
└─────────────────────────────────────────────────────┘
```

---

## 12. Archimate Mapping

### Archimate Layers and Elements

This architecture can be mapped to Archimate as follows:

**Business Layer:**
- Business Actors: Student, Teacher, Administrator
- Business Processes: User Registration, File Upload, Document Search, Administration
- Business Services: Document Management, Search, User Management

**Application Layer:**
- Application Components: Auth Component, File Management, Search Component, Admin Panel
- Application Services: REST API Endpoints
- Data Objects: User, UploadedFile, SubjectProfile, FavoriteSubject

**Technology Layer:**
- Technology Nodes: Docker Containers
- System Software: PHP, PostgreSQL, Redis, Elasticsearch, Nginx
- Technology Services: Database Service, Cache Service, Search Service
- Technology Interfaces: HTTP/HTTPS, PostgreSQL Protocol, Redis Protocol

**Physical Layer:**
- Equipment: Docker Host Server
- Distribution Networks: entoo_network (Docker bridge)

**Relationships:**
- Serving: Technology Layer serves Application Layer
- Realization: Application Components realize Business Services
- Access: Application Services access Data Objects
- Composition: Components composed of services

---

**Last Updated:** 2025-11-13
**Version:** 1.0
**Maintained By:** Development Team
