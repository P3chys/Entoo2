{{-- Document Type Tabs Component --}}
<nav class="content-tabs" role="tablist" id="contentTabs">
    {{-- Notes Tab --}}
    <button
        class="tab active"
        role="tab"
        data-type="Materialy"
        data-tab="notes"
        aria-selected="true"
        aria-controls="notes-panel"
        id="tab-notes"
    >
        <span class="tab-icon">📝</span>
        <div>
            <span class="tab-label">Notes</span>
            <div class="tab-subtitle">Lecture notes & summaries</div>
        </div>
        <span class="tab-badge" data-count="notes">0</span>
    </button>

    {{-- Case Briefs Tab --}}
    <button
        class="tab"
        role="tab"
        data-type="Prednasky"
        data-tab="case-briefs"
        aria-selected="false"
        aria-controls="case-briefs-panel"
        id="tab-case-briefs"
    >
        <span class="tab-icon">⚖️</span>
        <div>
            <span class="tab-label">Case Briefs</span>
            <div class="tab-subtitle">Case analysis & rulings</div>
        </div>
        <span class="tab-badge" data-count="case-briefs">0</span>
    </button>

    {{-- Statutes Tab --}}
    <button
        class="tab"
        role="tab"
        data-type="Seminare"
        data-tab="statutes"
        aria-selected="false"
        aria-controls="statutes-panel"
        id="tab-statutes"
    >
        <span class="tab-icon">📜</span>
        <div>
            <span class="tab-label">Statutes</span>
            <div class="tab-subtitle">Acts, regulations & bills</div>
        </div>
        <span class="tab-badge" data-count="statutes">0</span>
    </button>

    {{-- Past Papers Tab --}}
    <button
        class="tab"
        role="tab"
        data-type="Otazky"
        data-tab="past-papers"
        aria-selected="false"
        aria-controls="past-papers-panel"
        id="tab-past-papers"
    >
        <span class="tab-icon">📄</span>
        <div>
            <span class="tab-label">Past Papers</span>
            <div class="tab-subtitle">Exams & model answers</div>
        </div>
        <span class="tab-badge" data-count="past-papers">0</span>
    </button>

    {{-- Discussion Tab --}}
    <button
        class="tab"
        role="tab"
        data-type="Discussion"
        data-tab="discussion"
        aria-selected="false"
        aria-controls="discussion-panel"
        id="tab-discussion"
    >
        <span class="tab-icon">💬</span>
        <div>
            <span class="tab-label">Discussion</span>
            <div class="tab-subtitle">Subject Q&A & Chat</div>
        </div>
        <span class="tab-badge" data-count="discussion">0</span>
    </button>
</nav>

{{-- Tab Panels Container --}}
<div class="tab-panels" id="tabPanels">
    {{-- Notes Panel --}}
    <div class="tab-panel active" role="tabpanel" id="notes-panel" aria-labelledby="tab-notes">
        <div class="tab-panel-header">
            <div class="tab-panel-title">
                <span class="tab-icon">📝</span>
                <span>Notes</span>
                <span class="tab-panel-count" data-count="notes">0</span>
            </div>
            <div class="tab-panel-actions">
                <select class="tab-sort-select" data-sort="notes">
                    <option value="name-asc">Name ↑</option>
                    <option value="name-desc">Name ↓</option>
                    <option value="date-desc">Newest First</option>
                    <option value="date-asc">Oldest First</option>
                </select>
            </div>
        </div>
        <div class="documents-grid" id="notes-grid">
            {{-- Documents will be populated by JavaScript --}}
        </div>
    </div>

    {{-- Case Briefs Panel --}}
    <div class="tab-panel" role="tabpanel" id="case-briefs-panel" aria-labelledby="tab-case-briefs">
        <div class="tab-panel-header">
            <div class="tab-panel-title">
                <span class="tab-icon">⚖️</span>
                <span>Case Briefs</span>
                <span class="tab-panel-count" data-count="case-briefs">0</span>
            </div>
            <div class="tab-panel-actions">
                <select class="tab-sort-select" data-sort="case-briefs">
                    <option value="name-asc">Name ↑</option>
                    <option value="name-desc">Name ↓</option>
                    <option value="date-desc">Newest First</option>
                    <option value="date-asc">Oldest First</option>
                </select>
            </div>
        </div>
        <div class="documents-grid" id="case-briefs-grid">
            {{-- Documents will be populated by JavaScript --}}
        </div>
    </div>

    {{-- Statutes Panel --}}
    <div class="tab-panel" role="tabpanel" id="statutes-panel" aria-labelledby="tab-statutes">
        <div class="tab-panel-header">
            <div class="tab-panel-title">
                <span class="tab-icon">📜</span>
                <span>Statutes</span>
                <span class="tab-panel-count" data-count="statutes">0</span>
            </div>
            <div class="tab-panel-actions">
                <select class="tab-sort-select" data-sort="statutes">
                    <option value="name-asc">Name ↑</option>
                    <option value="name-desc">Name ↓</option>
                    <option value="date-desc">Newest First</option>
                    <option value="date-asc">Oldest First</option>
                </select>
            </div>
        </div>
        <div class="documents-grid" id="statutes-grid">
            {{-- Documents will be populated by JavaScript --}}
        </div>
    </div>

    {{-- Past Papers Panel --}}
    <div class="tab-panel" role="tabpanel" id="past-papers-panel" aria-labelledby="tab-past-papers">
        <div class="tab-panel-header">
            <div class="tab-panel-title">
                <span class="tab-icon">📄</span>
                <span>Past Papers</span>
                <span class="tab-panel-count" data-count="past-papers">0</span>
            </div>
            <div class="tab-panel-actions">
                <select class="tab-sort-select" data-sort="past-papers">
                    <option value="name-asc">Name ↑</option>
                    <option value="name-desc">Name ↓</option>
                    <option value="date-desc">Newest First</option>
                    <option value="date-asc">Oldest First</option>
                </select>
            </div>
        </div>
        <div class="documents-grid" id="past-papers-grid">
            {{-- Documents will be populated by JavaScript --}}
        </div>
    </div>

    {{-- Discussion Panel --}}
    <div class="tab-panel" role="tabpanel" id="discussion-panel" aria-labelledby="tab-discussion">
        <div class="discussion-section">
            <div class="discussion-header">
                <span class="discussion-icon">💬</span>
                <h2 class="discussion-title">Discussion</h2>
            </div>

            {{-- Comments List --}}
            <div class="comments-list" id="commentsList">
                {{-- Comments will be populated by JavaScript --}}
            </div>

            {{-- Comment Input --}}
            <div class="comment-input-wrapper">
                <div class="user-avatar">
                    {{ strtoupper(substr(Auth::user()->name ?? 'U', 0, 2)) }}
                </div>
                <input
                    type="text"
                    class="comment-input"
                    id="commentInput"
                    placeholder="Add a comment..."
                    aria-label="Add a comment"
                >
                <button class="btn-send-comment" id="sendCommentBtn" title="Send comment">
                    <svg class="send-icon" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                    </svg>
                </button>
            </div>

            {{-- Comment Options --}}
            <div class="comment-options">
                <label>
                    <input type="checkbox" id="anonymousCheckbox">
                    Post anonymously
                </label>
            </div>
        </div>
    </div>
</div>
