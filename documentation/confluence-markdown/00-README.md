# Entoo Documentation - Confluence Import Guide

> **ℹ️ INFO:** This documentation is formatted in Markdown and ready for import into modern Confluence Cloud.

---

## Available Documentation

| # | Document | File | Pages | Description |
|---|----------|------|-------|-------------|
| 1 | Console Commands | `01-console-commands.md` | ~15 | Complete guide to all Artisan commands |
| 2 | Eloquent Models | `02-models.md` | ~12 | All 4 models with relationships and patterns |
| 3 | API Controllers | `03-api-controllers.md` | ~20 | Complete API endpoint documentation |

---

## How to Import into Confluence Cloud

### Method 1: Direct Paste (Recommended)

1. **Log into your Confluence Cloud space**
2. **Create a new page** titled "Entoo Documentation"
3. **Click the "+" button** to create a child page
4. **Copy the markdown content** from any .md file
5. **Paste directly** into the Confluence editor
6. Confluence will automatically convert Markdown to formatted content
7. **Save** the page

### Method 2: Import Markdown File

1. **Create a new page** in Confluence
2. Click **"..."** (More actions) → **"Import Word Document"**
3. Some Confluence versions allow Markdown import
4. Select the `.md` file
5. Review and save

### Method 3: Use Confluence Importer

1. Go to **Space tools** → **Content Tools** → **Import**
2. Choose **"Markdown"** as format (if available)
3. Upload the `.md` files
4. Review and import

---

## Recommended Page Structure

```
Entoo Documentation (Parent)
├── Console Commands Reference
│   ├── Quick Reference
│   ├── Elasticsearch Commands
│   ├── Data Migration
│   ├── System Health & Monitoring
│   ├── Cache Management
│   └── System Optimization
├── Eloquent Models
│   ├── Overview
│   ├── User Model
│   ├── UploadedFile Model
│   ├── FavoriteSubject Model
│   └── SubjectProfile Model
└── API Controllers
    ├── Overview
    ├── AuthController
    ├── FileController
    ├── SearchController
    ├── SubjectController
    ├── FavoriteController
    ├── SubjectProfileController
    ├── HealthController
    └── AdminController
```

---

## Markdown Features Used

All documentation uses standard Markdown:

- ✅ **Headers** (`#`, `##`, `###`)
- ✅ **Tables** (pipe-separated)
- ✅ **Code blocks** with syntax highlighting (` ```php `)
- ✅ **Bold** (`**text**`) and *italic* (`*text*`)
- ✅ **Lists** (numbered and bulleted)
- ✅ **Blockquotes** (`>`) for callouts
- ✅ **Inline code** (`` `code` ``)

---

## Tips for Better Confluence Pages

### Page Organization
1. Use **Table of Contents** macro at the top of long pages
2. Add **breadcrumbs** for easy navigation
3. Use **page labels** for categorization:
   - `entoo`
   - `api`
   - `documentation`
   - `backend`

### Visual Enhancements
1. Add **info/warning/note** panels using Confluence macros after import
2. Use **expand** macros for long sections
3. Add **diagrams** using built-in tools
4. Use **color** for emphasis (sparingly)

### Maintenance
1. Add **"Last Updated"** dates in page info
2. Set up **page watchers** for important pages
3. Create a **changelog** page for tracking updates
4. Link related pages using **Related Pages** macro

---

## Creating Info/Warning/Tip Panels in Confluence

After pasting markdown, you can enhance it with Confluence panels:

1. **Select text** that should be in a panel
2. Click **"/"** to open quick insert
3. Type **"info"**, **"warning"**, **"note"**, or **"tip"**
4. Select the panel macro
5. The text moves into the panel

**Keyboard shortcuts:**
- Info: `/info`
- Warning: `/warning`
- Note: `/note`
- Tip: `/tip`

---

## Troubleshooting

### Issue: Markdown Not Converting

**Solution:**
- Try pasting into the "**+**" button → "**Blank page**"
- Use "**Insert**" → "**Markup**" → paste as plain text
- Copy smaller sections at a time
- Use the Confluence import tool instead

### Issue: Tables Look Wrong

**Solution:**
- Ensure proper markdown table syntax
- Leave blank lines before and after tables
- Check for proper alignment (`|---|---|`)
- Manually adjust column widths after import

### Issue: Code Blocks Not Highlighted

**Solution:**
- Ensure code blocks use triple backticks: ` ```language `
- Specify language after backticks: ` ```php `
- Supported languages: php, javascript, bash, json, sql
- After import, you can change syntax highlighting in Confluence

---

## Alternative: Copy as Plain Text

If Markdown doesn't work:

1. **Open the .md file** in a text editor
2. **Copy the content**
3. **In Confluence**, type `/code` and press Enter
4. **Paste** the content
5. Format manually using Confluence editor

---

## Next Steps

After importing this documentation:

1. ✅ Import all three documentation files
2. ✅ Set up page hierarchy and labels
3. ✅ Add Table of Contents to each page
4. ✅ Review and verify all formatting
5. ✅ Convert blockquotes to Confluence info/warning panels
6. ✅ Set up page restrictions (if needed)
7. ✅ Share with team members
8. ✅ Create a documentation changelog page

> **💡 TIP:** Consider setting up a regular review schedule (quarterly) to keep documentation up-to-date with code changes.

---

## Contact & Support

For questions or issues with this documentation:
- Create an issue in the project repository
- Contact the development team
- Check the project README for updates

**Documentation Info:**
- **Version:** 1.0
- **Last Updated:** 2025-11-13
- **Maintained By:** Development Team
- **Format:** Markdown for Confluence Cloud

---

## Additional Resources

**Confluence Documentation:**
- [Markdown Support in Confluence](https://confluence.atlassian.com/doc/confluence-cloud-documentation-home-937003861.html)
- [Confluence Keyboard Shortcuts](https://confluence.atlassian.com/conf79/confluence-keyboard-shortcuts-1018783069.html)
- [Formatting Guide](https://confluence.atlassian.com/doc/format-text-in-confluence-cloud-965020095.html)

**Entoo Project:**
- GitHub Repository: `https://github.com/your-org/entoo`
- API Documentation: `http://localhost:8000/api/docs`
- Admin Panel: `http://localhost:8000/admin`
