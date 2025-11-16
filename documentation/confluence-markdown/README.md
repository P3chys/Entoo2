# Entoo Documentation - Confluence Import Guide

> **✅ Ready for Confluence Cloud**
>
> This documentation is formatted in Markdown and ready for direct copy-paste into modern Confluence Cloud.

---

## 📚 Available Documentation

| # | Document | File | Pages | Description |
|---|----------|------|-------|-------------|
| 1 | Console Commands | `01-console-commands.md` | ~15 | Complete guide to all Artisan commands |
| 2 | Eloquent Models | `02-models.md` | ~12 | All 4 models with relationships and patterns |
| 3 | API Controllers | `03-api-controllers.md` | ~20 | Complete API endpoint documentation |
| 4 | Middleware, Providers & Jobs | `04-middleware-providers-jobs.md` | ~18 | Request filtering, service registration, async jobs |
| 5 | Policies, Views & Admin | `05-policies-views-admin.md` | ~16 | Authorization, Blade components, web admin panel |
| 6 | Routes, Config & Database | `06-routes-config-database.md` | ~22 | API/web routes, configuration files, database schema |
| 7 | Frontend JavaScript | `07-frontend-javascript.md` | ~25 | Dashboard, file upload, admin panel, UI interactions |
| 8 | Docker & Infrastructure | `08-docker-infrastructure.md` | ~28 | Docker Compose, services, deployment, troubleshooting |

---

## 🚀 How to Import into Confluence Cloud

### Quick Steps (Copy-Paste Method)

1. **Log into Confluence Cloud**
2. **Create a new page** titled "Entoo Documentation"
3. **For each .md file:**
   - Click the **"+"** button to create a child page
   - Give it a title:
     - `01-console-commands.md` → **"Console Commands Reference"**
     - `02-models.md` → **"Eloquent Models"**
     - `03-api-controllers.md` → **"API Controllers"**
     - `04-middleware-providers-jobs.md` → **"Middleware, Providers, and Jobs"**
     - `05-policies-views-admin.md` → **"Policies, View Components, and Admin"**
     - `06-routes-config-database.md` → **"Routes, Configuration, and Database"**
     - `07-frontend-javascript.md` → **"Frontend JavaScript Modules"**
   - **Open the .md file** in your editor
   - **Select ALL content** (Ctrl+A / Cmd+A)
   - **Copy** (Ctrl+C / Cmd+C)
   - **Click inside the Confluence editor**
   - **Paste** (Ctrl+V / Cmd+V)
   - Confluence will automatically format the content
   - **Save** the page

### What Gets Auto-Formatted

When you paste Markdown into Confluence Cloud, it automatically converts:

✅ **Headers** (`#`, `##`, `###`) → Confluence headers (h1, h2, h3)

✅ **Tables** → Properly formatted Confluence tables

✅ **Code blocks** (` ```language `) → Syntax-highlighted code blocks

✅ **Bold** (`**text**`) → **Bold text**

✅ **Italic** (`*text*`) → *Italic text*

✅ **Lists** (numbered and bulleted) → Confluence lists

✅ **Blockquotes** (`>`) → Indented text (you can manually convert to info panels)

✅ **Links** → Clickable links

---

## 📖 Recommended Page Structure

```
Entoo Documentation (Parent Page)
│
├── Console Commands Reference
│   - All Artisan commands with examples
│   - Common workflows
│   - Performance tips
│
├── Eloquent Models
│   - 4 core models documented
│   - Relationships diagram
│   - Query patterns
│
├── API Controllers
│   - 8 controllers with all endpoints
│   - Request/response examples
│   - Authentication flow
│
├── Middleware, Providers, and Jobs
│   - Request/response filtering
│   - Service registration and bootstrapping
│   - Asynchronous file processing
│
├── Policies, View Components, and Admin
│   - Authorization policies
│   - Reusable Blade components
│   - Web-based admin panel
│
├── Routes, Configuration, and Database
│   - API and web routes
│   - Service configuration
│   - Database schema and migrations
│
└── Frontend JavaScript Modules
    - Dashboard UI logic
    - File upload functionality
    - Admin panel interactions
    - API communication patterns
```

---

## 🎨 Enhancing After Import

After pasting the Markdown content, you can enhance it with Confluence-specific features:

### 1. Convert Blockquotes to Info Panels

**Before (Markdown blockquote):**
```
> This is important information
```

**After (Confluence info panel):**
1. Select the blockquoted text
2. Type `/info` or `/warning` or `/note` or `/tip`
3. Select the appropriate panel
4. The text moves into the panel

### 2. Add Table of Contents

1. Click at the top of your page
2. Type `/toc` or `/table of contents`
3. Select "Table of Contents" macro
4. It automatically generates based on headers

### 3. Add Code Block Language

If code blocks don't have syntax highlighting:
1. Click on the code block
2. Click the "..." menu
3. Select "Change language"
4. Choose: PHP, JavaScript, Bash, JSON, etc.

### 4. Add Expand Macros for Long Sections

For very long sections:
1. Select the section
2. Type `/expand`
3. Give it a title
4. Content becomes collapsible

---

## ✨ Visual Formatting Tips

### Use Status Labels

Add status indicators using `/status`:
- 🟢 Active
- 🟡 In Progress
- 🔴 Deprecated

### Use Page Labels

Tag your pages for easy searching:
- `entoo`
- `api`
- `backend`
- `documentation`

### Add Emojis

Make headers more visual:
- 📝 Console Commands
- 💾 Models
- 🔌 API Controllers
- ⚙️ Configuration

---

## 🧪 Testing the Import

### Test with a Small Sample First

Before importing all files:

1. Create a test page
2. Copy **just the first section** from `01-console-commands.md`
3. Paste it into Confluence
4. Verify it formats correctly
5. If it works, proceed with full import

### Common Import Issues & Solutions

#### Issue: Tables Not Formatting

**Solution:**
- Ensure there's a blank line before and after the table in the markdown
- Check that table syntax is correct: `|---|---|`
- Try copying smaller sections

#### Issue: Code Blocks Not Highlighted

**Solution:**
- After pasting, click each code block
- Manually set the language (PHP, Bash, JSON, etc.)
- Or use `/code` macro after pasting

#### Issue: Blockquotes Look Plain

**Solution:**
- This is normal - blockquotes paste as plain text
- Manually convert to info/warning panels using `/info` command
- Select the text and apply the macro

---

## 📊 What's Included in Each Document

### 01-console-commands.md

**Contains:**
- Quick reference table of all commands
- 9 Artisan commands fully documented:
  - Elasticsearch (init, reindex)
  - Data migration
  - System health check
  - Cache management (clear, warm)
  - System optimization
- Common workflows (setup, deployment, maintenance, troubleshooting)
- Performance best practices
- Scheduling recommendations
- Troubleshooting guides

**Features:**
- Complete command syntax
- All options and parameters documented
- Usage examples for every command
- Error handling information

---

### 02-models.md

**Contains:**
- 4 core Eloquent models:
  - User (authentication, admin access)
  - UploadedFile (file metadata, processing)
  - FavoriteSubject (user preferences)
  - SubjectProfile (subject metadata)
- Complete database schema for each model
- All methods and properties documented
- Relationships diagram (visual)
- Performance optimization patterns
- Common query patterns with examples
- Validation rules for each model

**Features:**
- Field-by-field documentation
- Accessor/mutator methods
- N+1 query prevention examples
- Best practices for eager loading

---

### 03-api-controllers.md

**Contains:**
- 8 API controllers fully documented:
  - AuthController (7 endpoints)
  - FileController (6 endpoints)
  - SearchController (1 endpoint)
  - SubjectController (3 endpoints)
  - FavoriteController (3 endpoints)
  - SubjectProfileController (5 endpoints)
  - HealthController (2 endpoints)
  - AdminController (6 endpoints)
- Complete request/response examples for every endpoint
- Authentication and authorization details
- Query parameters and validation rules
- Error response formats
- Performance optimization strategies
- cURL testing examples

**Features:**
- JSON examples for all requests/responses
- HTTP status codes
- Cache strategy documentation
- Rate limiting information

---

### 04-middleware-providers-jobs.md

**Contains:**
- 3 Middleware components:
  - ConditionalThrottle (rate limiting with test bypasses)
  - CacheSanctumToken (token authentication caching)
  - IsAdmin (admin-only route protection)
- 3 Service Providers:
  - AppServiceProvider (application bootstrapping)
  - AuthServiceProvider (policy registration)
  - TelescopeServiceProvider (debugging tool configuration)
- 1 Queue Job:
  - ProcessUploadedFile (async file text extraction and indexing)
- Middleware registration and usage patterns
- Performance optimization strategies (30-min token caching)
- Job retry logic and error handling
- Health check implementations

**Features:**
- Complete code examples with explanations
- Configuration details and environment variables
- Testing strategies (E2E, PHPUnit)
- Troubleshooting guides

---

### 05-policies-views-admin.md

**Contains:**
- 1 Authorization Policy:
  - FilePolicy (download, view, update, delete authorization)
- 3 View Components:
  - search (search interface component)
  - fileTree (file tree display component)
  - fileUpload (file upload interface component)
- Base Controller documentation
- Web Admin Controller:
  - Dashboard with statistics (users, files, subjects)
  - System health checks (DB, Redis, Elasticsearch)
  - User management interface
  - File management interface
- Policy usage in controllers
- Component registration and usage
- Admin vs API controller comparison

**Features:**
- Authorization logic explained
- Blade component patterns
- Cache strategies for admin dashboard
- Helper methods documentation
- Testing examples

---

### 06-routes-config-database.md

**Contains:**
- Route definitions:
  - 30+ API routes (public, protected, admin)
  - 10+ web routes (auth pages, dashboard)
  - Console routes
- Configuration files:
  - services.php (Elasticsearch configuration)
  - sanctum.php (API authentication)
  - octane.php (performance settings)
- Database schema:
  - 7 core tables documented
  - 14 migrations explained
  - Performance indexes
- Complete route list with HTTP methods, controllers, middleware
- Rate limiting configuration
- Security features (CSRF, authentication, authorization)

**Features:**
- Complete API endpoint reference
- Request/response flow diagrams
- Database schema with relationships
- Environment variables documentation
- Performance optimization strategies
- Testing examples for routes and config

---

### 07-frontend-javascript.md

**Contains:**
- JavaScript modules:
  - app.js (entry point)
  - dashboard.js (main UI, file tree, favorites, search)
  - file-upload.js (upload modal, processing status polling)
  - admin.js (admin panel with user/file management)
  - subject-profile-modal.js (profile editing)
  - subject-profile-renderer.js (shared rendering logic)
- Complete function documentation with parameters and return values
- Global state management patterns
- API communication helpers (fetchAPI)
- XSS protection with DOMPurify
- Optimistic UI updates
- Route parameter handling
- Event handling patterns

**Features:**
- Module-level code documentation
- Build and deployment instructions (Vite)
- Performance optimizations (debouncing, caching)
- Error handling patterns
- Testing strategies (E2E with Playwright)
- Troubleshooting guides

---

## 🔧 Alternative Import Methods

### Method 1: Confluence Importer (If Available)

Some Confluence Cloud instances have a Markdown importer:

1. Go to **Space tools** → **Content Tools** → **Import**
2. If "Markdown" is an option, select it
3. Upload the `.md` files
4. Follow the import wizard
5. Review and publish

### Method 2: Convert to HTML First

If Markdown doesn't work:

1. Use an online converter like [Markdown to HTML](https://markdowntohtml.com/)
2. Paste the markdown
3. Copy the generated HTML
4. In Confluence, use "Insert" → "Markup" → "HTML"
5. Paste the HTML

### Method 3: Use Third-Party Tools

Tools like **Markdown Importer for Confluence** (available in Atlassian Marketplace)

---

## ⚙️ Confluence Cloud Keyboard Shortcuts

Make editing faster:

| Shortcut | Action |
|----------|--------|
| `/` | Quick insert menu |
| `/code` | Insert code block |
| `/info` | Insert info panel |
| `/table` | Insert table |
| `Ctrl/Cmd + K` | Insert link |
| `Ctrl/Cmd + Shift + M` | Insert macro |
| `Ctrl/Cmd + S` | Save page |

---

## 📋 Post-Import Checklist

After importing all documentation:

- [ ] All seven pages created under "Entoo Documentation"
- [ ] Tables render correctly
- [ ] Code blocks have syntax highlighting
- [ ] Headers create proper hierarchy
- [ ] Blockquotes converted to info/warning panels (optional)
- [ ] Table of Contents macro added to each page
- [ ] Page labels applied (`entoo`, `api`, `backend`, `documentation`)
- [ ] Page restrictions set (if needed)
- [ ] Team members added as watchers
- [ ] Pages linked in parent page

---

## 🎯 Quick Tips

### For Best Results:

1. ✅ **Use Chrome or Edge** - Best Markdown paste support
2. ✅ **Paste into blank pages** - Don't paste into pages with existing content
3. ✅ **Copy entire file at once** - Don't try to copy section by section
4. ✅ **Save frequently** - Save after each paste before formatting
5. ✅ **Test first** - Use the sample file to test your Confluence version

### If Pasting Doesn't Work:

1. Try creating a **blank page** specifically
2. Try **incognito/private mode** to rule out extension issues
3. Try a **different browser**
4. Contact your Confluence admin to check if Markdown support is enabled
5. Use the **HTML conversion method** instead

---

## 📞 Support & Maintenance

### For Questions:
- Create an issue in the project repository
- Contact the development team
- Check CLAUDE.md for project context

### Updating Documentation:
1. Update the `.md` source files
2. Re-import into Confluence (paste over existing content)
3. Add a version note at the bottom of each page
4. Update the "Last Modified" date

### Version Control:
- Keep `.md` files in Git repository
- Use Confluence page versioning
- Document major changes in a changelog page

---

## 📚 Additional Resources

**Confluence Documentation:**
- [Confluence Cloud Editor](https://support.atlassian.com/confluence-cloud/docs/use-the-editor/)
- [Confluence Formatting](https://support.atlassian.com/confluence-cloud/docs/format-your-page/)
- [Confluence Macros](https://support.atlassian.com/confluence-cloud/docs/insert-confluence-macros/)

**Markdown Resources:**
- [Markdown Guide](https://www.markdownguide.org/)
- [GitHub Flavored Markdown](https://guides.github.com/features/mastering-markdown/)

**Entoo Project:**
- GitHub Repository: Your repository URL
- API Documentation: `http://localhost:8000/api/docs`
- Admin Panel: `http://localhost:8000/admin`

---

**Documentation Info:**
- **Format:** Markdown for Confluence Cloud
- **Version:** 1.0
- **Last Updated:** 2025-11-13
- **Maintained By:** Development Team
- **Total Pages:** 7 main documents (~128 pages of content)

---

## ✅ Next Steps

1. **Start with the sample** file (if provided)
2. **Test paste** on a blank Confluence page
3. **If successful**, import all seven documentation files
4. **Enhance** with Confluence-specific features
5. **Share** with your team
6. **Maintain** and update regularly

> **💡 TIP:** Bookmark the Confluence pages for quick access. Set up notifications for page updates to stay informed of documentation changes.
