# AI Prompt: Build LexScholar Application

Use this prompt with AI coding assistants (Claude, ChatGPT, etc.) to build the LexScholar application based on the design specification.

---

## Master Prompt

I need you to build **LexScholar**, a modern document management and learning platform for law students. This should be built on top of an existing Laravel application called "Entoo" with the following enhancements.

### Application Overview

LexScholar is a legal education platform that allows students to:
- Organize course materials by subject
- Categorize documents into 5 types: Notes, Case Briefs, Statutes, Past Papers, and Discussions
- Search across all documents with full-text search
- Collaborate with classmates through discussions
- Favorite subjects for quick access
- View detailed subject profiles with professor information

### Visual Design Requirements

**Brand Identity:**
- Name: LexScholar
- Logo: Scales of justice icon (⚖️) in a rounded square
- Primary color: Professional blue (#2563eb light, #3b82f6 dark)
- Font: Inter or similar modern sans-serif
- Style: Clean, academic, professional
- **Theme**: Support both light and dark modes

**Layout Structure:**
```
┌────────────────────────────────────────────────────┐
│ Header [Logo | Search | Upload | User]             │
├────────────┬───────────────────────────────────────┤
│  Sidebar   │  Main Content                         │
│            │                                       │
│ MY SUBJECTS│  Subject Header                       │
│            │  [Tabs: Notes | Case Briefs | ...]   │
│ ⭐ Criminal│  [Document Grid/List]                 │
│   Law      │                                       │
│   LAW-101  │                                       │
│            │                                       │
│ • Constitu-│                                       │
│   tional   │                                       │
│   LAW-102  │                                       │
│            │                                       │
│ + Add New  │                                       │
│            │                                       │
├────────────┤                                       │
│ [Avatar]   │                                       │
│ John Doe   │                                       │
│ Year 2 LLB │                                       │
└────────────┴───────────────────────────────────────┘
```

### Technical Stack

**Backend:**
- Laravel 12 (PHP 8.2+)
- PostgreSQL 15
- Elasticsearch 8.11 for full-text search
- Redis 7 for caching
- Laravel Sanctum for authentication

**Frontend:**
- Vite 7 for build tooling
- Vanilla JavaScript (ES6+ modules) or lightweight framework
- CSS with CSS variables (or Tailwind CSS 4)
- Responsive design (mobile-first)

**Existing Infrastructure:**
- Docker Compose setup (keep as-is)
- Laravel Octane with Swoole
- Existing authentication system
- File upload/download functionality

### Core Features to Implement

#### 1. Document Type Categorization

Add 5 document types to the existing file management system:

```javascript
DocumentTypes = {
  NOTES: 'notes',              // 📝 Lecture notes, study materials
  CASE_BRIEFS: 'case_briefs',  // ⚖️ Legal case analyses
  STATUTES: 'statutes',        // 📜 Legal statutes, regulations
  PAST_PAPERS: 'past_papers',  // 📄 Previous exam papers
  DISCUSSION: 'discussion'     // 💬 Q&A, comments
}
```

**Database Changes:**
```sql
ALTER TABLE uploaded_files 
ADD COLUMN document_type VARCHAR(50) DEFAULT 'notes',
ADD COLUMN views INTEGER DEFAULT 0,
ADD COLUMN downloads INTEGER DEFAULT 0;
```

#### 2. Subject Profiles

Create a new system for detailed subject information:

```sql
CREATE TABLE subject_profiles (
  id SERIAL PRIMARY KEY,
  subject_name VARCHAR(255) UNIQUE NOT NULL,
  code VARCHAR(50),              -- e.g., "LAW-101"
  professor VARCHAR(255),
  description TEXT,
  exam_type VARCHAR(100),
  credits INTEGER,
  year INTEGER,
  semester VARCHAR(50),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

**API Endpoints:**
- `GET /api/subject-profiles` - List all profiles
- `GET /api/subject-profiles/{subjectName}` - Get specific profile
- `POST /api/subject-profiles` - Create profile (authenticated)
- `PUT /api/subject-profiles/{subjectName}` - Update profile
- `DELETE /api/subject-profiles/{subjectName}` - Delete profile

#### 3. Tabbed Content Interface

Implement a tabbed navigation system for each subject:

**Tabs:**
1. 📝 **Notes** - Lecture notes and summaries
2. ⚖️ **Case Briefs** - Legal case analyses
3. 📜 **Statutes** - Acts, regulations, bills
4. 📄 **Past Papers** - Exam papers and answers
5. 💬 **Discussion** - Comments and Q&A

**Tab Component Specs:**
- Show document count badge on each tab
- Active tab indicator (underline + color)
- Smooth transitions between tabs
- Lazy load content when switching tabs
- URL reflects active tab (e.g., `/dashboard/subject/Criminal Law?tab=notes`)

#### 4. Discussion System

Create a comment/discussion system for each subject:

```sql
CREATE TABLE subject_comments (
  id SERIAL PRIMARY KEY,
  subject_name VARCHAR(255) NOT NULL,
  user_id INTEGER REFERENCES users(id),
  content TEXT NOT NULL,
  parent_id INTEGER REFERENCES subject_comments(id),
  upvotes INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

**Features:**
- Threaded comments (replies)
- Upvote/downvote system (future)
- Real-time updates (optional)
- Markdown support
- @mentions (optional)
- **Anonymous posting** (checkbox option)

**Interface Layout:**
```html
<div class="discussion-section">
  <h2>💬 Discussion</h2>
  
  <!-- Comments List -->
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
  </div>
  
  <!-- Comment Input -->
  <div class="comment-input-wrapper">
    <div class="comment-avatar user-avatar">JD</div>
    <input 
      type="text" 
      class="comment-input" 
      placeholder="Add a comment..."
    >
    <button class="btn-send-comment">
      <!-- Send icon (blue arrow) -->
    </button>
  </div>
  
  <!-- Anonymous Option -->
  <div class="comment-options">
    <label>
      <input type="checkbox" name="anonymous">
      Post anonymously
    </label>
  </div>
</div>
```

**Comment Display:**
- Avatar: Circular badge with initials (left side)
- Name: Bold username (or "Anonymous")
- Timestamp: Relative time ("2 hours ago")
- Content: Plain text, line breaks preserved

**Comment Input:**
- User avatar on left (shows current user)
- Text input: "Add a comment..." placeholder
- Send button: Blue arrow icon on right
- Anonymous checkbox below input

**API Endpoints:**
- `GET /api/subjects/{subjectName}/comments` - Get comments
- `POST /api/subjects/{subjectName}/comments` - Add comment
- `PUT /api/comments/{id}` - Update comment
- `DELETE /api/comments/{id}` - Delete comment

#### 5. Enhanced File Upload

Update the existing upload modal to include:
- Document type selector (dropdown with icons)
- Subject association
- Title and description fields
- Automatic metadata extraction from PDF
- Multi-file upload support
- Progress indicators

#### 6. Enhanced Search

Extend the existing Elasticsearch integration:

**Filters:**
- Document type (multi-select)
- Subject (multi-select)
- Date range
- File type (PDF, DOCX, TXT)

**Sort Options:**
- Relevance (default)
- Date (newest/oldest)
- Title (A-Z/Z-A)
- Downloads (most/least)
- Views (most/least)

### UI Components to Build

#### 1. Subject Header Component

```html
<div class="subject-header">
  <div class="subject-badge">LAW-101</div>
  <h1 class="subject-title">Criminal Law</h1>
  <p class="subject-professor">Prof. Sarah Williams</p>
  <p class="subject-description">
    Introduction to the general principles of criminal liability, including actus reus, mens rea, and defenses.
  </p>
  <div class="subject-actions">
    <button class="btn-favorite">⭐ Favorite</button>
    <button class="btn-upload">📤 Upload</button>
  </div>
</div>
```

#### 2. Content Tabs Component

```html
<nav class="content-tabs">
  <button class="tab active" data-type="notes">
    <span class="tab-icon">📝</span>
    <span class="tab-label">Notes</span>
    <span class="tab-badge">2</span>
  </button>
  <button class="tab" data-type="case_briefs">
    <span class="tab-icon">⚖️</span>
    <span class="tab-label">Case Briefs</span>
    <span class="tab-badge">0</span>
  </button>
  <!-- More tabs... -->
</nav>

<div class="tab-content">
  <div id="notes-content" class="tab-panel active">
    <!-- Document grid -->
  </div>
  <div id="case-briefs-content" class="tab-panel">
    <!-- Document grid -->
  </div>
  <!-- More panels... -->
</div>
```

#### 3. Document Card Component

```html
<div class="document-card">
  <div class="document-badge">PDF</div>
  <div class="document-body">
    <h3 class="document-title">Introduction to Mens Rea</h3>
    <div class="document-meta">
      <div class="author">
        <img src="avatar.jpg" class="avatar-xs" alt="Author">
        <span>Sarah Williams</span>
      </div>
      <div class="stats">
        <span>📅 Oct 12, 2023</span>
        <span>2.4 MB</span>
      </div>
    </div>
  </div>
  <div class="document-actions">
    <!-- Visible on hover -->
    <span class="download-count">145 downloads</span>
    <button class="btn-icon-download" title="Download">⬇️</button>
    <button class="btn-icon-more" title="More">⋯</button>
  </div>
</div>
```

**Hover Behavior:**
- On hover: Reveal download count and download button
- Background changes to light gray
- Elevated shadow (--shadow-md)
- Smooth 200ms transition
- Download count on right (e.g., "145 downloads")
- More options (⋯) always visible

#### 4. Sidebar Subject List

```html
<aside class="sidebar">
  <div class="sidebar-header">
    <h2>MY SUBJECTS</h2>
  </div>
  
  <nav class="subject-list">
    <a href="/dashboard/subject/Criminal Law" class="subject-item active">
      <span class="favorite-star">⭐</span>
      <div class="subject-info">
        <span class="subject-name">Criminal Law</span>
        <span class="subject-code">LAW-101</span>
      </div>
    </a>
    <a href="/dashboard/subject/Constitutional Law" class="subject-item">
      <div class="subject-info">
        <span class="subject-name">Constitutional Law</span>
        <span class="subject-code">LAW-102</span>
      </div>
    </a>
    <!-- More subjects... -->
    
    <button class="subject-item add-subject">
      <span>+ Add Subject</span>
    </button>
  </nav>
  
  <div class="user-profile">
    <div class="user-avatar">JD</div>
    <div class="user-info">
      <div class="user-name">John Doe</div>
      <div class="user-meta">Year 2 • L.L.B</div>
    </div>
  </div>
</aside>
```

### Styling Guidelines

**CSS Variables to Define:**

**Light Mode:**
```css
:root {
  /* Primary Colors */
  --primary-blue: #2563eb;
  --primary-blue-dark: #1e40af;
  --primary-blue-light: #3b82f6;
  
  /* Background Colors */
  --bg-primary: #ffffff;
  --bg-secondary: #f8fafc;
  --bg-tertiary: #f1f5f9;
  
  /* Text Colors */
  --text-primary: #1e293b;
  --text-secondary: #64748b;
  --text-muted: #94a3b8;
  
  /* Border Colors */
  --border-primary: #e2e8f0;
  --border-secondary: #cbd5e1;
  
  /* Spacing, Shadows, Radius (same for both themes) */
  --spacing-xs: 0.25rem;
  --spacing-sm: 0.5rem;
  --spacing-md: 1rem;
  --spacing-lg: 1.5rem;
  --spacing-xl: 2rem;
  --spacing-2xl: 3rem;
  
  --shadow-sm: 0 1px 2px 0 rgba(0, 0, 0, 0.05);
  --shadow-md: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
  --shadow-lg: 0 10px 15px -3px rgba(0, 0, 0, 0.1);
  
  --radius-sm: 0.25rem;
  --radius-md: 0.5rem;
  --radius-lg: 0.75rem;
  --radius-xl: 1rem;
}
```

**Dark Mode:**
```css
[data-theme="dark"] {
  /* Primary Colors */
  --primary-blue: #3b82f6;  /* Lighter for dark bg */
  --primary-blue-dark: #2563eb;
  --primary-blue-light: #60a5fa;
  
  /* Background Colors */
  --bg-primary: #0f172a;    /* Very dark navy */
  --bg-secondary: #1e293b;  /* Lighter dark for cards */
  --bg-tertiary: #334155;   /* Card hover/elevated */
  
  /* Text Colors */
  --text-primary: #f1f5f9;  /* Light text */
  --text-secondary: #cbd5e1;
  --text-muted: #94a3b8;
  
  /* Border Colors */
  --border-primary: #334155;
  --border-secondary: #475569;
}
```

**Theme Toggle Implementation:**
```javascript
// Auto-detect system preference
const prefersDark = window.matchMedia('(prefers-color-scheme: dark)');
const savedTheme = localStorage.getItem('theme');
const currentTheme = savedTheme || (prefersDark.matches ? 'dark' : 'light');
document.documentElement.setAttribute('data-theme', currentTheme);

// Toggle function
function toggleTheme() {
  const current = document.documentElement.getAttribute('data-theme');
  const next = current === 'dark' ? 'light' : 'dark';
  document.documentElement.setAttribute('data-theme', next);
  localStorage.setItem('theme', next);
}
```

**Component Styles:**

**Light Mode:**
- Sidebar: 240px width, light gray background, fixed position
- Main content: White background, responsive padding
- Cards: White background, subtle shadow, rounded corners
- Tabs: Underline style with smooth transitions, horizontal layout
- Buttons: Primary (blue), secondary (outline), icon-only variants

**Dark Mode:**
- Sidebar: 240px width, dark navy (#1e293b), fixed position
  - Semester groups: Uppercase labels (#94a3b8)
  - Subject cards: Circular avatars with initials
  - Active subject: Blue left border + darker background (#0f172a)
- Main content: Very dark background (#0f172a), responsive padding
- Cards: Dark background (#1e293b), subtle borders (#334155), rounded corners
- Tabs: **Card-style**, not underline
  - Dark cards with icons at top, labels below
  - Active tab: Slightly lighter background (#334155)
  - Subtitle text below label (muted)
- Buttons: Primary (bright blue #3b82f6), secondary (dark with border)
- Text: Light colors (#f1f5f9 primary, #cbd5e1 secondary)
- PDF Badge: Red background maintained

### Implementation Steps

1. **Database Migration:**
   - Add `document_type`, `views`, `downloads` to `uploaded_files`
   - Create `subject_profiles` table
   - Create `subject_comments` table
   - Seed sample data

2. **Backend (Laravel):**
   - Create SubjectProfile model and controller
   - Create SubjectComment model and controller
   - Add document type field to file upload
   - Update search to filter by document type
   - Add view/download tracking

3. **Frontend Components:**
   - Build tabbed navigation component
   - Build document card component
   - Build subject header component
   - Update sidebar with subject metadata
   - Create discussion thread component

4. **Styling:**
   - Define CSS variables
   - Style all new components
   - Ensure responsive design
   - Add hover/active states
   - Implement smooth transitions

5. **Integration:**
   - Connect tabs to API endpoints
   - Wire up document type filtering
   - Implement subject profile CRUD
   - Add comment posting/viewing
   - Update file upload flow

6. **Testing:**
   - Test all CRUD operations
   - Test search with new filters
   - Test responsive layout
   - Test accessibility
   - Test performance with large datasets

### Existing Code to Preserve

**Keep these existing features:**
- Authentication system (login, register, password reset)
- File upload/download functionality
- Elasticsearch integration
- Favorites system
- User management
- Admin dashboard
- Docker configuration
- API structure

**Enhance these features:**
- File upload: Add document type selection
- Search: Add document type filters
- Dashboard: Add tabbed interface
- Subjects: Add profile information

### Migration Notes

The application is currently called "Entoo" and should be rebranded to "LexScholar":
- Update app name in config files
- Replace logo/branding assets
- Update page titles and metadata
- Update environment variables
- Keep database name and technical identifiers

### Success Criteria

The implementation is complete when:
1. ✅ All 5 document types are supported
2. ✅ Subject profiles can be created/edited
3. ✅ Tabbed navigation works smoothly
4. ✅ Discussion system is functional
5. ✅ Search filters by document type
6. ✅ UI matches the design screenshot
7. ✅ Responsive on mobile/tablet/desktop
8. ✅ All existing features still work
9. ✅ Performance is maintained
10. ✅ Code is well-documented

---

## Quick Start Prompt

For a faster implementation, use this condensed prompt:

**"Build LexScholar, a law student document platform with these features:**
1. **5 document types:** Notes, Case Briefs, Statutes, Past Papers, Discussion
2. **Tabbed interface:** Filter documents by type within each subject
3. **Subject profiles:** Add professor, description, course code metadata
4. **Discussion system:** Threaded comments per subject
5. **Enhanced upload:** Select document type during upload
6. **Enhanced search:** Filter by document type

**Tech stack:** Laravel 12, PostgreSQL, Elasticsearch, Vite, Vanilla JS

**UI:** Professional blue theme, sidebar navigation, main content with tabs, responsive design

**Base:** Extend existing 'Entoo' application (keep all current features, add new ones)

Please implement the database changes, backend API, frontend components, and styling as described in the full specification."

---

### Component-by-Component Prompts

If building incrementally, use these focused prompts:

### Prompt 1: Database Schema
"Add these tables to the existing database: `subject_profiles` (subject_name, code, professor, description, exam_type, credits, year, semester) and `subject_comments` (subject_name, user_id, content, parent_id, upvotes, is_anonymous). Also add columns to `uploaded_files`: document_type, views, downloads."

### Prompt 2: Subject Profiles
"Create a Laravel resource controller for SubjectProfile with full CRUD API. Include validation and associations with existing subjects. Build an edit form with two-column layout for course code and professor fields."

### Prompt 3: Document Types
"Add document type categorization (notes, case_briefs, statutes, past_papers, discussion) to the file upload system. Update the upload modal UI and API."

### Prompt 4: Tabbed Interface
"Build a tabbed navigation component that filters documents by type. Include tab badges showing counts, active states, and smooth transitions."

### Prompt 5: Discussion System
"Implement a comment system for subjects with: chronological display, user avatars (initials), relative timestamps, comment input with send button, and anonymous posting checkbox. Store is_anonymous flag in database."

### Prompt 6: Document Card Hover
"Add hover state to document cards that reveals download count and download button. Use CSS transitions (200ms) and show download statistics on hover."

### Prompt 7: Subject Edit Form
"Create a subject profile edit form with: two-column row (course code + professor), full-width subject name, textarea for description, Save Changes and Cancel buttons. Use light background and clear labels."

### Prompt 8: UI Styling
"Style the application with a professional legal theme: blue accents (#2563eb), clean layout, modern typography (Inter font), and responsive design."

---

## Reference Screenshots

The design is based on these reference screenshots:

### Screenshot 1: Original Design
![LexScholar Design Reference](C:/Users/Pechys/.gemini/antigravity/brain/50954150-95c4-4f1e-a535-7c772c6cfdb9/uploaded_image_1764714838443.png)

Key visual elements:
- Left sidebar with subject list
- Main content area with tabs
- Subject header with professor info
- Document list with PDF icons
- Clean, professional styling
- Blue accent colors

### Screenshot 2: Document Card Hover State
![Document Hover State](C:/Users/Pechys/.gemini/antigravity/brain/50954150-95c4-4f1e-a535-7c772c6cfdb9/uploaded_image_0_1764715596898.png)

Shows:
- PDF badge on left
- Document title: "Introduction to Mens Rea"
- Author with small avatar: "Sarah Williams"
- Date and file size: "Oct 12, 2023 • 2.4 MB"
- **On hover**: "145 downloads" + download icon + more options (...)

### Screenshot 3: Discussion Interface
![Discussion Tab](C:/Users/Pechys/.gemini/antigravity/brain/50954150-95c4-4f1e-a535-7c772c6cfdb9/uploaded_image_1_1764715596898.png)

Shows:
- Five tabs: Notes, Case Briefs, Statutes, Past Papers, **Discussion** (active)
- Comment list with:
  - Avatar circles with initials (A, D)
  - User names (Alice Johnson, David Smith)
  - Timestamps ("2 hours ago", "5 hours ago")
  - Comment text
- Bottom: Comment input with user avatar (JD), placeholder "Add a comment...", send button (blue arrow)
- **Anonymous posting option** (checkbox)

### Screenshot 4: Subject Edit Form
![Subject Edit Form](C:/Users/Pechys/.gemini/antigravity/brain/50954150-95c4-4f1e-a535-7c772c6cfdb9/uploaded_image_2_1764715596898.png)

Shows:
- Two-column row: "LAW-202" | "Dr. Emily Blunt"
- Subject name: "Tort Law"
- Description textarea: "Civil wrongs and liabilities, including negligence and defamation."
- Actions: "💾 Save Changes" (blue) + "✕ Cancel" (gray)

### Screenshot 5: Dark Mode Interface
![Dark Mode Dashboard](C:/Users/Pechys/.gemini/antigravity/brain/50954150-95c4-4f1e-a535-7c772c6cfdb9/uploaded_image_1764715798984.png)

Shows dark mode styling:
- **Very dark background**: #0f172a (navy, not pure black)
- **Sidebar**: Dark navy (#1e293b) with semester groups
  - "SEMESTER 1", "SEMESTER 2", "NON-ASSIGNED" labels
  - Subject cards with circular avatars (CR, CO, TO, LE for initials)
  - Active subject: Blue left border
- **Main content**: Dark background with light text
- **Tabs**: Card-style (not underline) with icons at top
  - Each tab is a rounded card with icon, label, and subtitle
  - Active tab: Slightly lighter background
- **Search bar**: Dark with "Global Search..." placeholder
- **Upload button**: Bright blue (#3b82f6) stands out
- **Text**: Light (#f1f5f9) for high contrast
- **Document cards**: Dark background with red PDF badges
- **User profile**: Bottom left with avatar and info


---

## Additional Context

**Current Application State:**
- Name: Entoo
- Purpose: University document management
- Features: File upload/download, search, favorites, subject organization
- Tech: Laravel 12, PostgreSQL, Elasticsearch, Docker

**Goal:**
Transform into LexScholar with specialized features for law students including document type categorization, subject metadata, and collaborative discussions.

**Approach:**
Extend existing functionality rather than rebuild. Keep all current features working while adding new enhancements focused on legal education use case.
