# LexScholar Design Specification

> [!NOTE]
> This design specification is based on the screenshot provided and the existing Entoo application architecture. It describes a learning management system for law studies with document organization, search capabilities, and collaborative features.

---

## Overview

**LexScholar** is a modern document management and learning platform designed for university law students. The system enables students to organize course materials, collaborate on notes, access past papers, and engage in discussions about legal subjects.

### Core Concept

Transform the existing Entoo document management system into a specialized legal education platform with enhanced categorization, multiple content types (notes, case briefs, statutes, past papers), and social features.

---

## Visual Design Language

### Brand Identity

- **Name**: LexScholar
- **Logo**: Scales of justice icon (⚖️) in a rounded square
- **Tagline**: "Organize. Study. Excel."
- **Color Scheme**: Professional legal theme with blue accents

### Design System

#### Color Palette

**Light Mode:**
```css
/* Primary Colors */
--primary-blue: #2563eb;      /* Primary brand color */
--primary-blue-dark: #1e40af; /* Hover states */
--primary-blue-light: #3b82f6; /* Active states */

/* Accent Colors */
--accent-indigo: #4f46e5;     /* Selected subject */
--accent-purple: #7c3aed;     /* Badges and highlights */

/* Neutral Colors */
--bg-primary: #ffffff;        /* Main background */
--bg-secondary: #f8fafc;      /* Secondary background */
--bg-tertiary: #f1f5f9;       /* Tertiary background */
--border-primary: #e2e8f0;    /* Main borders */
--text-primary: #1e293b;      /* Primary text */
--text-secondary: #64748b;    /* Secondary text */
--text-muted: #94a3b8;        /* Muted text */

/* Status Colors */
--success-green: #10b981;
--warning-yellow: #f59e0b;
--error-red: #ef4444;
--info-blue: #3b82f6;
```

**Dark Mode:**
```css
/* Primary Colors (same as light mode) */
--primary-blue: #3b82f6;      /* Slightly lighter for dark bg */
--primary-blue-dark: #2563eb;
--primary-blue-light: #60a5fa;

/* Accent Colors */
--accent-indigo: #6366f1;
--accent-purple: #8b5cf6;

/* Dark Neutral Colors */
--bg-primary: #0f172a;        /* Very dark navy/slate */
--bg-secondary: #1e293b;      /* Lighter dark for cards */
--bg-tertiary: #334155;       /* Card hover/elevated */
--border-primary: #334155;    /* Subtle borders */
--border-secondary: #475569;  /* Visible borders */
--text-primary: #f1f5f9;      /* Light text */
--text-secondary: #cbd5e1;    /* Muted light text */
--text-muted: #94a3b8;        /* Very muted text */

/* Status Colors (adjusted for dark mode) */
--success-green: #34d399;
--warning-yellow: #fbbf24;
--error-red: #f87171;
--info-blue: #60a5fa;
```

**Theme Switching:**
```css
/* Auto-detect system preference */
@media (prefers-color-scheme: dark) {
  :root {
    /* Apply dark mode colors */
  }
}

/* Manual toggle via class */
[data-theme="dark"] {
  /* Dark mode colors */
}
```

#### Typography

```css
/* Font Families */
--font-primary: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
--font-heading: 'Inter', sans-serif;
--font-mono: 'JetBrains Mono', 'Fira Code', monospace;

/* Font Sizes */
--text-xs: 0.75rem;     /* 12px */
--text-sm: 0.875rem;    /* 14px */
--text-base: 1rem;      /* 16px */
--text-lg: 1.125rem;    /* 18px */
--text-xl: 1.25rem;     /* 20px */
--text-2xl: 1.5rem;     /* 24px */
--text-3xl: 1.875rem;   /* 30px */
--text-4xl: 2.25rem;    /* 36px */

/* Font Weights */
--font-normal: 400;
--font-medium: 500;
--font-semibold: 600;
--font-bold: 700;
```

#### Spacing & Layout

```css
/* Spacing Scale */
--spacing-xs: 0.25rem;   /* 4px */
--spacing-sm: 0.5rem;    /* 8px */
--spacing-md: 1rem;      /* 16px */
--spacing-lg: 1.5rem;    /* 24px */
--spacing-xl: 2rem;      /* 32px */
--spacing-2xl: 3rem;     /* 48px */
--spacing-3xl: 4rem;     /* 64px */

/* Border Radius */
--radius-sm: 0.25rem;    /* 4px */
--radius-md: 0.5rem;     /* 8px */
--radius-lg: 0.75rem;    /* 12px */
--radius-xl: 1rem;       /* 16px */
--radius-full: 9999px;

/* Shadows */
--shadow-sm: 0 1px 2px 0 rgba(0, 0, 0, 0.05);
--shadow-md: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
--shadow-lg: 0 10px 15px -3px rgba(0, 0, 0, 0.1);
--shadow-xl: 0 20px 25px -5px rgba(0, 0, 0, 0.1);
```

---

## Layout Structure

### Main Application Layout

```
┌─────────────────────────────────────────────────────────────┐
│ Header/Navbar                                    [🔍] [📤]  │
├──────────────┬──────────────────────────────────────────────┤
│              │                                              │
│   Sidebar    │            Main Content Area                 │
│              │                                              │
│ MY SUBJECTS  │    [Subject Header]                          │
│              │    [Content Type Tabs]                       │
│ • Criminal   │    [Content Grid/List]                       │
│   Law        │                                              │
│              │                                              │
│ • Constitu-  │                                              │
│   tional Law │                                              │
│              │                                              │
│ • Contract   │                                              │
│   Law        │                                              │
│              │                                              │
│ • Tort Law   │                                              │
│              │                                              │
│ + Add        │                                              │
│   Subject    │                                              │
│              │                                              │
├──────────────┤                                              │
│ [User]       │                                              │
│ John Doe     │                                              │
│ Year 2 LLB   │                                              │
└──────────────┴──────────────────────────────────────────────┘
```

### Component Breakdown

#### 1. Navigation Header

**Elements:**
- LexScholar logo and branding (left)
- Global search bar (center)
- Upload button (right)
- User menu/profile (far right)

**Styling:**
- Height: 64px
- Background: White with subtle bottom border
- Fixed position for scrolling
- Box shadow: `var(--shadow-sm)`

#### 2. Sidebar Navigation

**Sections:**
- **Semester Groups** (collapsible sections)
  - SEMESTER 1, SEMESTER 2, NON-ASSIGNED
  - Uppercase, small text, muted color
- **Subject Cards** within each group
  - Circular avatar with subject initials (e.g., "CR", "CO", "TO")
  - Subject name + code below initials
  - Active subject indicator (blue left border + darker background)
  - Hover effects (lighter background)
  - Add new subject button
- **User Profile Card** (bottom)
  - Avatar circle with user initials (dark background)
  - Name and year/degree
  - Settings icon

**Styling:**
- Width: 240px
- Background: `var(--bg-secondary)` (dark: #1e293b)
- Border right: `1px solid var(--border-primary)` (dark: #334155)
- Sticky positioning

**Dark Mode Specifics:**
- Subject card background: Slightly lighter than sidebar (#1e293b → #334155 on hover)
- Active subject: Blue left border + darker background (#0f172a)
- Text: Light color (#f1f5f9)
- Section headers: Muted (#94a3b8)

#### 3. Main Content Area

**Header Section:**
- Subject name (large, bold)
- Professor name (smaller, muted)
- Subject description

**Content Type Tabs:**
- 📝 Notes
- ⚖️ Case Briefs
- 📜 Statutes
- 📄 Past Papers
- 💬 Discussion

**Content Display:**
- Grid or list view of documents
- Each item shows:
  - PDF icon with red badge
  - Document title
  - Author name with avatar
  - Upload date
  - File size
  - Download/action buttons

---

## Core Features

### 1. Subject Management

**Functionality:**
- Browse subjects by category (Criminal Law, Constitutional Law, etc.)
- Add/remove subjects from personal list
- View subject details (professor, description, exam type)
- Mark subjects as favorites (⭐)

**Data Model:**
```javascript
Subject {
  id: number,
  name: string,
  code: string,  // e.g., "LAW-101"
  professor: string,
  description: string,
  category: string,
  exam_type: string,
  credits: number,
  year: number,
  semester: string
}
```

### 2. Document Categories

Documents are organized into **5 main types**:

#### 📝 Notes
- Lecture notes and summaries
- Personal study notes
- Shared class notes
- Supporting format: PDF, DOCX, TXT

#### ⚖️ Case Briefs
- Legal case analyses
- Court decisions
- Case summaries
- Citation information

#### 📜 Statutes
- Legal statutes and regulations
- Acts and bills
- Legislative documents
- Amendment histories

#### 📄 Past Papers
- Previous exam papers
- Sample questions
- Model answers
- Marking schemes

#### 💬 Discussion
- Q&A threads
- Study group discussions
- Peer comments
- Announcements

**Data Model:**
```javascript
Document {
  id: number,
  subject_id: number,
  type: 'note' | 'case_brief' | 'statute' | 'past_paper',
  title: string,
  description: string,
  file_path: string,
  file_size: number,
  uploaded_by: number,
  uploaded_at: datetime,
  downloads: number,
  views: number
}
```

### 3. File Upload System

**Features:**
- Drag & drop interface
- Multi-file upload
- File type validation
- Progress indicators
- Automatic categorization suggestions
- Metadata extraction (title, author, date)

**Upload Modal Flow:**
1. Select subject
2. Choose document type
3. Upload files (drag & drop or browse)
4. Add metadata (title, description, tags)
5. Confirm and process

### 4. Search & Discovery

**Search Capabilities:**
- Full-text search across all documents
- Filter by:
  - Subject
  - Document type
  - Professor
  - Date range
  - File type
- Sort by:
  - Relevance
  - Date (newest/oldest)
  - Title (A-Z)
  - Most downloaded
  - Most viewed

**Search Results Display:**
- Highlighted search terms
- Document preview snippets
- Relevance score
- Quick actions (download, view, add to favorites)

### 5. User System

**User Roles:**
- **Student**: Upload, download, comment, favorite
- **Professor**: All student permissions + manage subject materials
- **Admin**: Full system management

**User Profile:**
- Avatar (with initials fallback)
- Name
- Year and degree (e.g., "Year 2 - L.L.B")
- Email
- Institution
- Upload statistics
- Contribution score

**Data Model:**
```javascript
User {
  id: number,
  name: string,
  email: string,
  avatar_url: string,
  role: 'student' | 'professor' | 'admin',
  year: number,
  degree: string,
  institution: string,
  created_at: datetime
}
```

### 6. Favorites & Collections

**Functionality:**
- Star favorite subjects for quick access
- Create custom collections
- Quick access favorites page
- Sync across devices

### 7. Social Features

**Discussion System:**

**Interface Layout:**
```html
<div class="discussion-section">
  <h2>💬 Discussion</h2>
  
  <!-- Comment List -->
  <div class="comments-list">
    <div class="comment-item">
      <div class="comment-avatar">A</div>
      <div class="comment-content">
        <div class="comment-header">
          <span class="commenter-name">Alice Johnson</span>
          <span class="comment-time">2 hours ago</span>
        </div>
        <p class="comment-text">
          Can someone explain the difference between recklessness and negligence in this context?
        </p>
      </div>
    </div>
    
    <div class="comment-item">
      <div class="comment-avatar">D</div>
      <div class="comment-content">
        <div class="comment-header">
          <span class="commenter-name">David Smith</span>
          <span class="comment-time">5 hours ago</span>
        </div>
        <p class="comment-text">
          I uploaded a summary of the R v Brown case. Hope it helps!
        </p>
      </div>
    </div>
  </div>
  
  <!-- Add Comment Input -->
  <div class="comment-input-wrapper">
    <div class="comment-avatar user-avatar">JD</div>
    <input 
      type="text" 
      class="comment-input" 
      placeholder="Add a comment..."
      aria-label="Add a comment"
    >
    <button class="btn-send-comment" title="Send comment">
      <svg><!-- Send icon --></svg>
    </button>
  </div>
  
  <!-- Anonymous Comment Option -->
  <div class="comment-options">
    <label>
      <input type="checkbox" name="anonymous">
      Post anonymously
    </label>
  </div>
</div>
```

**Discussion Features:**
- Subject-specific discussion boards
- Chronological comment display
- User avatars (initials in colored circles)
- Timestamp for each comment (relative time)
- **Anonymous posting** option (checkbox below input)
- Real-time comment updates (optional)
- Threaded replies (future enhancement)
- @mentions support (future enhancement)
- Upvote/downvote (future enhancement)

**Comment Display:**
- Avatar: Circular badge with user initials
- Name: Bold commenter name (or "Anonymous" if posted anonymously)
- Time: Relative timestamp ("2 hours ago", "5 hours ago")
- Content: Plain text with line breaks preserved
- Layout: Avatar on left, content on right

**Comment Input:**
- User avatar on left (shows current user initials)
- Text input field with placeholder "Add a comment..."
- Send button on right (blue arrow icon)
- Anonymous checkbox below input
- Auto-expand for longer comments (future)
- Enter to submit, Shift+Enter for new line

**Collaboration:**
- Share notes with classmates
- Study group creation (future)
- Collaborative annotations (future)
- Document versioning (future)

---

## Page Specifications

### Home/Dashboard Page

**URL**: `/dashboard`

**Layout:**
- Full application layout with sidebar
- Default view shows all subjects
- Stats cards at top (optional)
- Subject list with expandable content

**Components:**
- Subject cards/list
- Quick stats (total subjects, documents, downloads)
- Recent activity feed
- Upcoming deadlines (if applicable)

### Subject Detail Page

**URL**: `/dashboard/subject/{subjectName}`

**Layout:**
- Sidebar with subject list (active state)
- Main content area with subject details
- Tabbed interface for content types

**Header Section:**
```html
<div class="subject-header">
  <div class="subject-info">
    <span class="subject-code">LAW-101</span>
    <h1>Criminal Law</h1>
    <p class="professor">Prof. Sarah Williams</p>
    <p class="description">Introduction to the general principles of criminal liability...</p>
  </div>
  <div class="subject-actions">
    <button class="btn-star">⭐ Favorite</button>
    <button class="btn-upload">📤 Upload</button>
  </div>
</div>
```

**Tab Navigation:**
```html
<div class="content-tabs">
  <button class="tab active" data-type="notes">
    📝 Notes
    <span class="count">2</span>
  </button>
  <button class="tab" data-type="case-briefs">
    ⚖️ Case Briefs
    <span class="count">0</span>
  </button>
  <button class="tab" data-type="statutes">
    📜 Statutes
    <span class="count">0</span>
  </button>
  <button class="tab" data-type="past-papers">
    📄 Past Papers
    <span class="count">0</span>
  </button>
  <button class="tab" data-type="discussion">
    💬 Discussion
    <span class="count">5</span>
  </button>
</div>
```

**Content Grid:**
```html
<div class="documents-grid">
  <div class="document-card">
    <div class="document-badge">PDF</div>
    <div class="document-info">
      <h3 class="document-title">Introduction to Mens Rea</h3>
      <div class="document-meta">
        <span class="author">
          <img src="avatar.jpg" class="avatar-xs" alt="Sarah Williams">
          Sarah Williams
        </span>
        <span class="date">📅 Oct 12, 2023</span>
        <span class="size">2.4 MB</span>
      </div>
    </div>
    <div class="document-actions">
      <!-- Visible on hover -->
      <span class="download-count">145 downloads</span>
      <button class="btn-icon-download" title="Download">⬇️</button>
      <button class="btn-icon-more" title="More options">⋯</button>
    </div>
  </div>
</div>
```

**Document Card Hover Behavior:**
- On hover: Show download count and download button
- Download count displays on right side (e.g., "145 downloads")
- Download icon button appears next to count
- More options (⋯) menu always visible on far right
- Subtle background color change on hover
- Smooth transition (200ms)

### Search Results Page

**URL**: `/dashboard/search?q={query}`

**Layout:**
- Sidebar collapsed or minimized
- Full-width search results
- Filters panel (collapsible)

**Components:**
- Search query display
- Result count
- Filter controls
- Sort options
- Results list/grid
- Pagination

### Favorites Page

**URL**: `/favorites`

**Layout:**
- Similar to dashboard
- Shows only favorited subjects
- Quick access to favorite documents
- Recently accessed items

---

## UI Components

### 1. Document Card

**Variants:**
- List view (compact)
- Grid view (detailed)
- Preview mode (with thumbnail)

**States:**
- **Default**: PDF badge, title, author, date, size visible
- **Hover**: Shows download count ("145 downloads"), download button, elevated shadow
- **Selected**: Border highlight or background color change
- **Downloading**: Progress bar overlay

**Hover Interaction Details:**
```css
.document-card:hover {
  box-shadow: var(--shadow-md);
  background: var(--bg-secondary);
}

.document-card:hover .document-actions {
  opacity: 1; /* Reveal download count and button */
}

.document-actions {
  opacity: 0;
  transition: opacity 200ms ease;
}
```

### 2. Subject Card

**Elements:**
- Subject name
- Subject code (badge)
- Professor name
- Document count by type
- Favorite star
- Expand/collapse indicator

**States:**
- Collapsed (default)
- Expanded (shows documents)
- Active (currently selected)

### 3. Tab Navigation

**Style:**

**Light Mode:**
- Horizontal tabs with icons
- Active indicator (underline + color)
- Badge counts
- Smooth transitions

**Dark Mode:**
- Dark card-style tabs
- Icon at top, label at bottom
- Subtitle text below label (muted)
- Active tab: Slightly lighter background + no bottom border
- No underline, filled background instead
- Badge count integrated into label

**Dark Mode Tab Styling:**
```css
.content-tabs {
  display: flex;
  gap: var(--spacing-md);
  margin-bottom: var(--spacing-xl);
}

[data-theme="dark"] .tab {
  background: var(--bg-secondary); /* #1e293b */
  border: 1px solid var(--border-primary); /* #334155 */
  border-radius: var(--radius-lg);
  padding: var(--spacing-lg);
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
  min-width: 140px;
}

[data-theme="dark"] .tab.active {
  background: var(--bg-tertiary); /* #334155 */
  border-color: var(--primary-blue);
}

[data-theme="dark"] .tab-icon {
  font-size: 1.5rem;
  margin-bottom: var(--spacing-sm);
}

[data-theme="dark"] .tab-label {
  color: var(--text-primary);
  font-weight: var(--font-semibold);
}

[data-theme="dark"] .tab-subtitle {
  color: var(--text-muted);
  font-size: var(--text-xs);
  margin-top: var(--spacing-xs);
}
```


### 4. Search Bar

**Features:**
- Icon prefix (🔍)
- Placeholder text: "Search all resources..."
- Autocomplete suggestions
- Recent searches
- Keyboard shortcuts (Ctrl+K to focus)

### 5. Upload Button

**Style:**
- Primary action button
- Icon + text: "📤 Upload"
- Prominent placement (top right)
- Opens upload modal on click

### 6. User Profile Card

**Elements:**
- Avatar circle with initials (dark background)
- Name (bold)
- Year and degree (muted)
- Settings icon (optional)
- Logout option

### 7. Subject Profile Edit Form

**Layout:**
```html
<div class="subject-edit-form">
  <div class="form-row">
    <div class="form-group">
      <label for="subject-code">Course Code</label>
      <input type="text" id="subject-code" value="LAW-202" placeholder="e.g., LAW-101">
    </div>
    <div class="form-group">
      <label for="professor">Professor</label>
      <input type="text" id="professor" value="Dr. Emily Blunt" placeholder="Professor name">
    </div>
  </div>
  
  <div class="form-group">
    <label for="subject-name">Subject Name</label>
    <input type="text" id="subject-name" value="Tort Law" placeholder="Subject name">
  </div>
  
  <div class="form-group">
    <label for="description">Description</label>
    <textarea id="description" rows="3" placeholder="Subject description">
Civil wrongs and liabilities, including negligence and defamation.
    </textarea>
  </div>
  
  <div class="form-actions">
    <button class="btn-primary">💾 Save Changes</button>
    <button class="btn-secondary">✕ Cancel</button>
  </div>
</div>
```

**Form Specifications:**
- **First row**: Two columns (Course Code + Professor)
- **Course Code**: Text input, left column
- **Professor**: Text input, right column
- **Subject Name**: Full-width text input
- **Description**: Multi-line textarea (3-5 rows)
- **Actions**: Primary "Save Changes" button (blue), Secondary "Cancel" button
- Light background (var(--bg-secondary))
- Rounded corners, padding
- Clear labels above each field
- Placeholder text for guidance

---

## Interaction Patterns

### Navigation Flow

1. **Landing** → Login/Register
2. **Dashboard** → View all subjects
3. **Select Subject** → View subject details with tabs
4. **Select Tab** → View documents by type
5. **Click Document** → View/download document

### State Management

```javascript
// Global State
{
  user: User,
  subjects: Subject[],
  favorites: number[], // subject IDs
  currentSubject: Subject | null,
  currentTab: 'notes' | 'case_briefs' | 'statutes' | 'past_papers' | 'discussion',
  searchQuery: string,
  searchResults: Document[]
}
```

### Responsive Behavior

**Breakpoints:**
- Mobile: < 768px
- Tablet: 768px - 1024px
- Desktop: > 1024px

**Mobile Adjustments:**
- Sidebar converts to slide-out drawer
- Top navigation with hamburger menu
- Tabs scroll horizontally
- Grid becomes single column
- Touch-optimized buttons

---

## API Endpoints

### Subjects

```
GET    /api/subjects              - List all subjects
GET    /api/subjects/{id}         - Get subject details
POST   /api/subjects              - Create subject (admin)
PUT    /api/subjects/{id}         - Update subject (admin)
DELETE /api/subjects/{id}         - Delete subject (admin)
```

### Documents

```
GET    /api/documents                    - List documents (with filters)
GET    /api/documents/{id}               - Get document details
POST   /api/documents                    - Upload document
PUT    /api/documents/{id}               - Update document metadata
DELETE /api/documents/{id}               - Delete document
GET    /api/documents/{id}/download      - Download document
```

### Search

```
GET    /api/search?q={query}&type={type}&subject={id}  - Search documents
GET    /api/search/suggestions?q={query}               - Search autocomplete
```

### Favorites

```
GET    /api/favorites              - Get user favorites
POST   /api/favorites              - Add favorite
DELETE /api/favorites/{id}         - Remove favorite
```

### Comments (Discussion)

```
GET    /api/subjects/{id}/comments        - Get subject comments
POST   /api/subjects/{id}/comments        - Add comment
PUT    /api/comments/{id}                 - Update comment
DELETE /api/comments/{id}                 - Delete comment
```

---

## Technical Implementation Notes

### Theme Switching Implementation

**Methods:**
1. **Auto-detect**: Use `prefers-color-scheme` media query
2. **Manual toggle**: User preference saved to localStorage
3. **System sync**: Respect OS dark mode setting

**Implementation:**
```javascript
// Detect system preference
const prefersDark = window.matchMedia('(prefers-color-scheme: dark)');

// Check user preference
const savedTheme = localStorage.getItem('theme');
const currentTheme = savedTheme || (prefersDark.matches ? 'dark' : 'light');

// Apply theme
document.documentElement.setAttribute('data-theme', currentTheme);

// Toggle function
function toggleTheme() {
  const current = document.documentElement.getAttribute('data-theme');
  const next = current === 'dark' ? 'light' : 'dark';
  document.documentElement.setAttribute('data-theme', next);
  localStorage.setItem('theme', next);
}
```

**Dark Mode Design Notes:**
- Background: Very dark navy (#0f172a) instead of pure black for reduced eye strain
- Text: High contrast light text (#f1f5f9) for readability
- Cards: Slightly lighter than background (#1e293b) for depth
- Borders: Subtle (#334155) to maintain structure without harshness
- Blue accent: Slightly lighter (#3b82f6) for better visibility on dark background
- Tabs: Card-style instead of underline for better definition

### Frontend Stack
- **HTML5** for semantic structure
- **CSS3** (Tailwind CSS or custom CSS with variables)
- **Vanilla JavaScript** (ES6+) or lightweight framework
- **Vite** for build tooling

### Backend Stack
- **Laravel 12** (PHP 8.2+)
- **PostgreSQL** for relational data
- **Elasticsearch** for full-text search
- **Redis** for caching and sessions
- **Laravel Sanctum** for authentication

### Performance Optimizations
- Lazy loading for document lists
- Virtual scrolling for large lists
- CDN for static assets
- Image/PDF thumbnails caching
- Elasticsearch for fast search

### Accessibility
- ARIA labels for all interactive elements
- Keyboard navigation support
- Focus indicators
- Screen reader friendly
- High contrast mode support

---

## Migration from Entoo

### Mapping Changes

| Entoo Feature | LexScholar Equivalent |
|---------------|----------------------|
| Generic subjects | Law subjects with metadata |
| Single file type | 5 categorized document types |
| Basic file list | Tabbed content interface |
| Simple upload | Categorized upload with metadata |
| Basic search | Enhanced search with filters |
| - | Subject profiles (new) |
| - | Discussion boards (new) |
| - | Professor information (new) |

### Database Schema Changes

**New Tables:**
```sql
-- Subject metadata
CREATE TABLE subject_profiles (
  id SERIAL PRIMARY KEY,
  subject_name VARCHAR(255) UNIQUE,
  code VARCHAR(50),
  professor VARCHAR(255),
  description TEXT,
  exam_type VARCHAR(100),
  credits INTEGER,
  year INTEGER,
  semester VARCHAR(50),
  created_at TIMESTAMP,
  updated_at TIMESTAMP
);

-- Document categorization
ALTER TABLE uploaded_files 
ADD COLUMN document_type VARCHAR(50) DEFAULT 'note',
ADD COLUMN views INTEGER DEFAULT 0,
ADD COLUMN downloads INTEGER DEFAULT 0;

-- Subject comments/discussions
CREATE TABLE subject_comments (
  id SERIAL PRIMARY KEY,
  subject_name VARCHAR(255),
  user_id INTEGER REFERENCES users(id),
  content TEXT,
  parent_id INTEGER REFERENCES subject_comments(id),
  upvotes INTEGER DEFAULT 0,
  created_at TIMESTAMP,
  updated_at TIMESTAMP
);
```

### UI Components to Build

1. ✅ Subject profile modal (exists)
2. ✅ File upload modal (exists)
3. ✅ File tree/list (exists)
4. **NEW**: Content type tabs component
5. **NEW**: Document card with type badges
6. **NEW**: Discussion/comment thread component
7. **NEW**: Professor/course info card
8. **ENHANCED**: Search with type filters
9. **ENHANCED**: Sidebar with subject categories

---

## Design Assets Needed

### Icons
- 📝 Notes icon
- ⚖️ Case briefs icon (scales of justice)
- 📜 Statutes icon (scroll/document)
- 📄 Past papers icon
- 💬 Discussion icon
- ⭐ Favorite star
- 📤 Upload icon
- 🔍 Search icon
- ⚙️ Settings icon

### Images
- LexScholar logo (scales of justice in rounded square)
- Default user avatars
- Empty state illustrations
- Error state illustrations

### Document Type Badges
- **PDF**: Red badge
- **DOCX**: Blue badge
- **TXT**: Gray badge
- **Link**: Green badge

---

## Future Enhancements

### Phase 2 Features
- Calendar integration for exam dates
- Study timer and analytics
- Flashcard creator from notes
- AI-powered summarization
- Citation generator
- Collaborative editing
- Mobile app (React Native)

### Phase 3 Features
- Video lecture integration
- Live study sessions
- Peer tutoring marketplace
- Achievement badges
- Leaderboards
- Integration with university LMS

---

## Conclusion

This design specification provides a comprehensive blueprint for transforming Entoo into LexScholar, a specialized legal education platform. The design emphasizes:

1. **Organization**: Clear categorization of legal materials
2. **Collaboration**: Social features for peer learning
3. **Accessibility**: Intuitive navigation and search
4. **Professional**: Clean, academic aesthetic
5. **Scalable**: Architecture supports future enhancements

The existing Entoo codebase provides a solid foundation with document management, search, and user systems already in place. The primary development effort will focus on:
- Adding document type categorization
- Building tabbed content interface
- Implementing subject profiles and metadata
- Creating discussion/comment system
- Enhancing the UI with law-specific branding
