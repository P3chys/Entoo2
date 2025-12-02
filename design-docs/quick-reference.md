# LexScholar - Quick Reference Guide

## 📁 Files Created

### 1. `design.md` - Complete Design Specification
Comprehensive design document covering:
- Visual design system (colors, typography, spacing)
- Layout and component specifications
- Feature requirements
- API endpoints
- Database schema
- Migration plan from Entoo

### 2. `ai-prompt.md` - AI Implementation Prompts
Ready-to-use prompts for AI coding assistants:
- Master prompt (complete specification)
- Quick start prompt (condensed version)
- Component-by-component prompts (incremental development)
- Implementation steps and success criteria

### 3. `quick-reference.md` - This File
Quick overview and next steps

---

## 🎯 Key Features Summary

### Document Organization
- **5 Document Types**: Notes, Case Briefs, Statutes, Past Papers, Discussion
- **Tabbed Interface**: Switch between content types within each subject
- **Subject Profiles**: Professor info, course codes, descriptions

### User Experience
- **Sidebar Navigation**: Quick access to all subjects
- **Favorites System**: Star important subjects
- **Full-Text Search**: Filter by type, subject, date
- **Discussion Boards**: Threaded comments per subject with anonymous posting
- **Hover Interactions**: Document cards show download count on hover
- **Inline Editing**: Edit subject profiles with two-column form layout

### Technical
- **Backend**: Laravel 12, PostgreSQL, Elasticsearch
- **Frontend**: Vite, Vanilla JS, CSS variables
- **Infrastructure**: Docker Compose (existing)
- **Auth**: Laravel Sanctum (existing)

---

## 🎨 Visual Design

### Color Scheme
```
Light Mode:
Primary:   #2563eb (Professional Blue)
Background: #ffffff (White)
Secondary: #f8fafc (Light Gray)
Text:      #1e293b (Slate)

Dark Mode:
Primary:   #3b82f6 (Lighter Blue)
Background: #0f172a (Very Dark Navy)
Secondary: #1e293b (Dark Gray)
Text:      #f1f5f9 (Light)
Accents:   #4f46e5 (Indigo), #7c3aed (Purple)
```

### Layout
```
┌──────────────────────────────────────┐
│ Header: Logo | Search | Upload       │
├────────┬─────────────────────────────┤
│ Side   │ Subject Header               │
│ bar    │ ─────────────────           │
│        │ Tabs: 📝 ⚖️ 📜 📄 💬         │
│ Subs   │ ─────────────────           │
│        │ [Document Cards Grid]       │
│ ⭐ Law │                              │
│ • Law  │                              │
│        │                              │
│ User   │                              │
└────────┴─────────────────────────────┘
```

---

## 🗄️ Database Changes

### New Tables

**subject_profiles**
```sql
- id, subject_name, code, professor
- description, exam_type, credits
- year, semester, timestamps
```

**subject_comments**
```sql
- id, subject_name, user_id
- content, parent_id, upvotes
- is_anonymous BOOLEAN
- timestamps
```

### Modified Tables

**uploaded_files**
```sql
ADD document_type VARCHAR(50)
ADD views INTEGER
ADD downloads INTEGER
```

---

## 🔌 New API Endpoints

### Subject Profiles
- `GET/POST /api/subject-profiles`
- `GET/PUT/DELETE /api/subject-profiles/{name}`

### Comments
- `GET/POST /api/subjects/{name}/comments`
- `PUT/DELETE /api/comments/{id}`

### Enhanced Files
- Filter by `?type=notes|case_briefs|statutes|past_papers`
- Track views and downloads

---

## 📋 Implementation Checklist

### Phase 1: Database & Backend
- [ ] Create migrations for new tables
- [ ] Add columns to uploaded_files
- [ ] Create SubjectProfile model and controller
- [ ] Create SubjectComment model and controller
- [ ] Update FileController for document types
- [ ] Extend search to filter by type

### Phase 2: Frontend Components
- [ ] Build tabbed navigation component
- [ ] Create subject header component
- [ ] Build document card with type badges
- [ ] **Add hover state to show download count**
- [ ] Update sidebar with subject metadata
- [ ] Create discussion thread component
- [ ] **Add anonymous posting checkbox to comments**
- [ ] **Build subject edit form with two-column layout**
- [ ] Enhance upload modal with type selector

### Phase 3: Styling
- [ ] Define CSS variables for light and dark modes
- [ ] Style all new components
- [ ] **Implement dark mode theme toggle**
- [ ] **Style tabs as cards in dark mode (not underline)**
- [ ] Ensure responsive design
- [ ] Add transitions and hover effects
- [ ] Test accessibility
- [ ] Test both light and dark themes

### Phase 4: Integration & Testing
- [ ] Connect tabs to API
- [ ] Wire up document filtering
- [ ] Test all CRUD operations
- [ ] Performance testing
- [ ] Browser compatibility

---

## 🚀 Quick Start

### Option 1: Use Full Prompt
Copy the entire "Master Prompt" section from `ai-prompt.md` into your AI assistant.

### Option 2: Use Quick Prompt
Copy the "Quick Start Prompt" section for a condensed version.

### Option 3: Build Incrementally
Use the "Component-by-Component Prompts" to build one feature at a time:
1. Start with database schema
2. Add subject profiles
3. Implement document types
4. Build tabbed interface
5. Add discussion system
6. Apply styling

---

## 📸 Reference Screenshots

### Screenshot 1: Original Dashboard
The first uploaded screenshot shows:
- **Sidebar**: Subject list with "MY SUBJECTS" header
- **Main Content**: "Criminal Law" subject header
- **Tabs**: Notes (active), Case Briefs, Statutes, Past Papers, Discussion
- **Document List**: PDF files with metadata (author, date, size)
- **Visual Style**: Clean, professional, blue accents

### Screenshot 2: Document Hover State
Shows document card interaction:
- **Default**: PDF badge, title, author, date, size
- **On Hover**: Reveals "145 downloads" text + download icon button
- **Actions**: Download button + more options (⋯) menu
- **Transition**: Smooth 200ms fade-in

### Screenshot 3: Discussion Tab
Shows comment system:
- **Comments**: Avatar circles with initials (A, D)
- **Display**: Username, timestamp ("2 hours ago"), comment text
- **Input**: User avatar (JD) + text field + send button (blue arrow)
- **Feature**: "Post anonymously" checkbox below input
- **Layout**: Clean, spacious, easy to read

### Screenshot 4: Edit Subject Form
Shows subject profile editing:
- **Row 1**: Course code ("LAW-202") | Professor ("Dr. Emily Blunt")
- **Row 2**: Subject name ("Tort Law")
- **Row 3**: Description textarea
- **Actions**: "💾 Save Changes" (blue) + "✕ Cancel" (gray)
- **Style**: Light background, clear labels, organized layout

### Screenshot 5: Dark Mode
Shows complete dark mode interface:
- **Background**: Very dark navy (#0f172a)
- **Sidebar**: Organized by semester with circular subject avatars
- **Tabs**: Card-style with icons (not underline)
- **Text**: High contrast light text (#f1f5f9)
- **Upload button**: Bright blue (#3b82f6)
- **Overall**: Professional, easy on the eyes


Screenshot locations:
- `uploaded_image_1764714838443.png` - Dashboard
- `uploaded_image_0_1764715596898.png` - Document hover
- `uploaded_image_1_1764715596898.png` - Discussion
- `uploaded_image_2_1764715596898.png` - Edit form

---

## 🔄 Migration from Entoo

**What to Keep:**
- ✅ Authentication system
- ✅ File upload/download
- ✅ Elasticsearch integration
- ✅ Favorites system
- ✅ Admin dashboard
- ✅ Docker configuration

**What to Add:**
- ➕ Document type categorization
- ➕ Subject profiles (metadata)
- ➕ Tabbed content interface
- ➕ Discussion system
- ➕ Enhanced search filters
- ➕ View/download tracking

**What to Rebrand:**
- 🔄 App name: Entoo → LexScholar
- 🔄 Logo: Generic → Scales of justice
- 🔄 Color scheme: Current → Professional blue
- 🔄 UI copy: Generic → Legal education focus

---

## 💡 Key Design Decisions

### Why Document Types?
Legal education has distinct material types with different use cases. Categorization improves organization and discovery.

### Why Tabs Instead of Filters?
Tabs provide clearer mental model and reduce cognitive load. Students know exactly where to find each type of content.

### Why Subject Profiles?
Students need quick reference to professor names, course codes, and exam information. This metadata is frequently accessed.

### Why Discussion System?
Peer learning is crucial in legal education. Integrated discussions reduce need for external platforms like Discord or Slack.

### Why Keep Existing Stack?
The current Laravel + PostgreSQL + Elasticsearch stack is robust, scalable, and well-suited for document management. No need to rebuild.

---

## 📱 Responsive Design Notes

### Mobile (< 768px)
- Sidebar becomes slide-out drawer
- Tabs scroll horizontally
- Single-column document grid
- Touch-optimized buttons (larger targets)

### Tablet (768px - 1024px)
- Sidebar always visible but narrower
- Two-column document grid
- Condensed subject metadata

### Desktop (> 1024px)
- Full sidebar width (240px)
- Multi-column grid (3-4 columns)
- All features visible

---

## 🎯 Success Metrics

After implementation, verify:
1. **Functionality**: All 5 document types work
2. **UI/UX**: Matches screenshot design
3. **Performance**: Search < 200ms, page load < 1s
4. **Accessibility**: WCAG 2.1 AA compliance
5. **Responsive**: Works on mobile/tablet/desktop
6. **Compatibility**: Chrome, Firefox, Safari, Edge
7. **SEO**: Proper meta tags and semantic HTML

---

## 🔮 Future Enhancements

### Phase 2 (Post-MVP)
- Calendar integration for exam dates
- Study timer and analytics
- PDF annotation tools
- Collaborative note-taking
- Citation generator

### Phase 3 (Advanced)
- AI-powered summarization
- Flashcard generation from notes
- Video lecture integration
- Mobile app (React Native)
- Integration with university LMS

---

## 📞 Support

**Documentation:**
- Full spec: `design.md`
- AI prompts: `ai-prompt.md`
- This guide: `quick-reference.md`

**Existing Documentation:**
- Entoo README: `e:\Entoo2\README.md`
- Architecture docs: `e:\Entoo2\docs\`
- API docs: `http://localhost:8000/api/documentation`

**Development:**
- Laravel docs: https://laravel.com/docs/12.x
- Elasticsearch: https://www.elastic.co/guide/
- Tailwind CSS: https://tailwindcss.com/docs (if using)

---

## ✨ Final Notes

This design preserves all existing Entoo functionality while adding specialized features for legal education. The implementation should be incremental:

1. **Start with backend** (database, models, API)
2. **Then frontend** (components, UI)
3. **Finally polish** (styling, transitions, optimization)

The prompts in `ai-prompt.md` are ready to use with any AI coding assistant. Choose the approach that fits your workflow:
- **Full prompt** for complete implementation
- **Quick prompt** for faster iterations
- **Component prompts** for incremental development

Good luck building LexScholar! 🎓⚖️
