# Entoo - University Document Management System

A modern Laravel 12 document management system designed for organizing and searching university course materials with full-text search capabilities.

## Features

- **Full-Text Search**: Elasticsearch-powered search across all document types
- **Document Management**: Upload, organize, and manage course materials (PDFs, DOC, DOCX, PPT, PPTX, TXT)
- **Subject Organization**: Browse materials by subject and category
- **User Favorites**: Save and quickly access favorite subjects
- **Subject Profiles**: Detailed information about courses including teachers, exam types, and descriptions
- **High Performance**: Laravel Octane with Swoole for blazing-fast responses
- **Modern UI**: Responsive design with Tailwind CSS 4

## Technology Stack

- **Backend**: Laravel 12 (PHP 8.2+) with Laravel Octane (Swoole)
- **Database**: PostgreSQL 15
- **Cache**: Redis 7
- **Search**: Elasticsearch 8.11 + Kibana
- **Frontend**: Vite 7 + Tailwind CSS 4 + Vanilla JavaScript
- **Infrastructure**: Docker Compose
- **Authentication**: Laravel Sanctum

## Quick Start

### Prerequisites

- Docker & Docker Compose
- Git

### Installation

1. Clone the repository:
```bash
git clone https://github.com/P3chys/Entoo2.git
cd Entoo2
```

2. Start the application:
```bash
# Production mode (Nginx + PHP-FPM)
docker-compose up -d

# Development mode (with hot reload)
dev-start.bat  # Windows
# or
docker-compose -f docker-compose.yml -f docker-compose.dev.yml up -d  # Linux/Mac
```

3. Initialize Elasticsearch:
```bash
docker exec -it php php artisan elasticsearch:init
```

4. Access the application:
- **Application**: http://localhost:8000
- **API Documentation**: http://localhost:8000/api/documentation
- **Telescope** (dev only): http://localhost:8000/telescope
- **Kibana**: http://localhost:5601

## Development

### Management Commands

Use `entoo.bat` for common operations:

```bash
entoo.bat start          # Start containers
entoo.bat stop           # Stop containers
entoo.bat php            # Access PHP container shell
entoo.bat artisan <cmd>  # Run artisan commands
entoo.bat composer <cmd> # Run composer commands
entoo.bat migrate        # Run migrations
entoo.bat test           # Run PHPUnit tests
```

### Running Tests

**Backend Tests (PHPUnit):**
```bash
docker exec -it php php artisan test
# or
entoo.bat test
```

**Frontend/GUI Tests (Playwright E2E):**
```bash
cd tests
npm test                              # All tests (headless)
npm test tests/gui/auth.spec.ts      # Specific test
npm run test:headed                   # With browser UI
npm run test:debug                    # Debug mode
```

### API Documentation

Interactive Swagger UI available at: http://localhost:8000/api/documentation

Regenerate documentation after changes:
```bash
docker exec php php artisan l5-swagger:generate
```

### Frontend Development

```bash
cd webapp
npm run dev    # Start Vite dev server with hot reload
npm run build  # Build for production
```

## Project Structure

```
Entoo2/
├── webapp/                 # Laravel application
│   ├── app/
│   │   ├── Http/Controllers/Api/  # API controllers
│   │   ├── Models/               # Eloquent models
│   │   └── Services/             # Business logic
│   ├── resources/
│   │   ├── js/                   # Frontend JavaScript
│   │   └── views/                # Blade templates
│   └── routes/                   # Route definitions
├── docker/                 # Docker configuration
├── tests/                  # E2E tests (Playwright)
└── old_entoo/             # Legacy file import source
```

## Core Services

- **ElasticsearchService**: Document indexing and search with custom analyzers
- **DocumentParserService**: Text extraction from various document formats
- **AuthController**: User registration, login, and profile management
- **FileController**: File upload, download, and deletion
- **SearchController**: Full-text search across documents
- **FavoriteController**: User favorites management
- **SubjectProfileController**: Subject information CRUD

## Importing Legacy Files

Import existing course materials:

```bash
# Import all files from old_entoo/entoo_subjects/
docker exec -it php php artisan import:existing-files

# Dry run (no changes)
docker exec -it php php artisan import:existing-files --dry-run

# Limit number of files
docker exec -it php php artisan import:existing-files --limit=100
```

## Available Services

- **Application**: http://localhost:8000
- **API Documentation**: http://localhost:8000/api/documentation (Swagger UI)
- **Telescope**: http://localhost:8000/telescope (local environment only)
- **Elasticsearch**: http://localhost:9200
- **Kibana**: http://localhost:5601
- **Dozzle** (logs viewer): http://localhost:8888

## Monitoring & Debugging

### Laravel Telescope

Available in local environment at http://localhost:8000/telescope

Features:
- Request monitoring with SQL queries
- Exception tracking
- Cache operations
- Job monitoring
- Mail preview

### Logs

View container logs:
```bash
# Using Dozzle web interface
open http://localhost:8888

# Using docker logs
docker logs php
docker logs nginx
```

## Contributing

1. Create a feature branch
2. Make your changes
3. Write/update tests
4. Ensure all tests pass
5. Submit a pull request

## License

This project is proprietary software developed for university course material management.

## Support

For issues and questions, please create an issue in the GitHub repository.

---

Built with ❤️ using Laravel, Elasticsearch, and modern web technologies.
