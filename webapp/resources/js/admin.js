/**
 * Make authenticated API request
 */
async function apiRequest(url, options = {}) {
    const token = localStorage.getItem('token');
    const headers = {
        'Authorization': `Bearer ${token}`,
        'Accept': 'application/json',
        'Content-Type': 'application/json',
        ...options.headers
    };

    const response = await fetch(url, {
        ...options,
        headers
    });

    if (!response.ok) {
        const error = await response.json();
        throw error;
    }

    return response.json();
}

class AdminDashboard {
    constructor() {
        this.currentTab = 'users';
        this.currentPage = {
            users: 1,
            files: 1
        };
        this.filters = {
            users: { search: '' },
            files: { search: '', subject: '', category: '' }
        };
        this.editingUserId = null;

        this.init();
    }

    init() {
        this.bindEvents();
        this.loadStats();
        this.loadUsers();
        this.checkAdminAccess();
    }

    async checkAdminAccess() {
        try {
            const response = await apiRequest('/api/user');
            const user = response.user || response;

            console.log('Admin check - User data:', user);

            if (!user || !user.is_admin) {
                console.log('Not admin, redirecting to dashboard');
                window.location.href = '/dashboard';
                return;
            }

            console.log('Admin access granted');
        } catch (error) {
            console.error('Error checking admin access:', error);
            window.location.href = '/login';
        }
    }

    bindEvents() {
        // Tab switching
        document.querySelectorAll('.admin-tab').forEach(tab => {
            tab.addEventListener('click', (e) => {
                this.switchTab(e.currentTarget.dataset.tab);
            });
        });

        // Back to dashboard
        const backBtn = document.getElementById('backToDashboard');
        if (backBtn) {
            backBtn.addEventListener('click', () => {
                window.location.href = '/dashboard';
            });
        }

        // User management
        const createUserBtn = document.getElementById('createUserBtn');
        if (createUserBtn) {
            createUserBtn.addEventListener('click', () => this.openUserModal());
        }

        const userForm = document.getElementById('userForm');
        console.log('Binding userForm events, form found:', !!userForm);
        if (userForm) {
            userForm.addEventListener('submit', (e) => {
                console.log('Form submit event triggered');
                e.preventDefault();
                this.saveUser();
            });

            // Clear error styling when user starts typing
            userForm.querySelectorAll('input').forEach(input => {
                input.addEventListener('input', () => {
                    input.classList.remove('input-error');
                });
            });
        }

        // Search and filters
        const userSearch = document.getElementById('userSearch');
        if (userSearch) {
            userSearch.addEventListener('input', this.debounce((e) => {
                this.filters.users.search = e.target.value;
                this.currentPage.users = 1;
                this.loadUsers();
            }, 500));
        }

        const fileSearch = document.getElementById('fileSearch');
        if (fileSearch) {
            fileSearch.addEventListener('input', this.debounce((e) => {
                this.filters.files.search = e.target.value;
                this.currentPage.files = 1;
                this.loadFiles();
            }, 500));
        }

        const subjectFilter = document.getElementById('subjectFilter');
        if (subjectFilter) {
            subjectFilter.addEventListener('change', (e) => {
                this.filters.files.subject = e.target.value;
                this.currentPage.files = 1;
                this.loadFiles();
            });
        }

        const categoryFilter = document.getElementById('categoryFilter');
        if (categoryFilter) {
            categoryFilter.addEventListener('change', (e) => {
                this.filters.files.category = e.target.value;
                this.currentPage.files = 1;
                this.loadFiles();
            });
        }

        // Modal close
        document.querySelectorAll('.close-modal').forEach(btn => {
            btn.addEventListener('click', () => this.closeModal());
        });

        const modal = document.getElementById('userModal');
        if (modal) {
            modal.addEventListener('click', (e) => {
                if (e.target === modal) {
                    this.closeModal();
                }
            });
        }
    }

    switchTab(tab) {
        this.currentTab = tab;

        // Update tab buttons
        document.querySelectorAll('.admin-tab').forEach(t => {
            t.classList.toggle('active', t.dataset.tab === tab);
        });

        // Update tab content
        document.querySelectorAll('.admin-tab-content').forEach(content => {
            content.classList.toggle('active', content.id === `${tab}-tab`);
        });

        // Load data for the tab
        if (tab === 'users') {
            this.loadUsers();
        } else if (tab === 'files') {
            this.loadFiles();
            this.loadSubjects();
        }
    }

    async loadStats() {
        try {
            const stats = await apiRequest('/api/admin/stats');

            document.getElementById('totalUsers').textContent = stats.total_users;
            document.getElementById('totalFiles').textContent = stats.total_files;
            document.getElementById('totalSubjects').textContent = stats.total_subjects;

            const storageMB = (stats.total_storage / (1024 * 1024)).toFixed(2);
            document.getElementById('totalStorage').textContent = `${storageMB} MB`;
        } catch (error) {
            console.error('Error loading stats:', error);
            this.showNotification('Failed to load statistics', 'error');
        }
    }

    async loadUsers() {
        try {
            const params = new URLSearchParams({
                page: this.currentPage.users,
                search: this.filters.users.search
            });

            const response = await apiRequest(`/api/admin/users?${params}`);
            this.renderUsersTable(response);
        } catch (error) {
            console.error('Error loading users:', error);
            this.showNotification('Failed to load users', 'error');
        }
    }

    renderUsersTable(response) {
        const container = document.getElementById('usersTable');

        if (!response.data || response.data.length === 0) {
            container.innerHTML = '<div class="empty-state">No users found</div>';
            return;
        }

        const table = `
            <table class="admin-table">
                <thead>
                    <tr>
                        <th>ID</th>
                        <th>Name</th>
                        <th>Email</th>
                        <th>Role</th>
                        <th>Files</th>
                        <th>Created</th>
                        <th>Actions</th>
                    </tr>
                </thead>
                <tbody>
                    ${response.data.map(user => `
                        <tr>
                            <td>${user.id}</td>
                            <td>${this.escapeHtml(user.name)}</td>
                            <td>${this.escapeHtml(user.email)}</td>
                            <td>
                                <span class="badge ${user.is_admin ? 'badge-admin' : 'badge-user'}">
                                    ${user.is_admin ? 'Admin' : 'User'}
                                </span>
                            </td>
                            <td>${user.uploaded_files_count || 0}</td>
                            <td>${this.formatDate(user.created_at)}</td>
                            <td class="table-actions">
                                <button class="btn-icon btn-edit-user" data-user-id="${user.id}" title="Edit">
                                    <svg width="16" height="16" fill="currentColor" viewBox="0 0 16 16">
                                        <path d="M12.146.146a.5.5 0 0 1 .708 0l3 3a.5.5 0 0 1 0 .708l-10 10a.5.5 0 0 1-.168.11l-5 2a.5.5 0 0 1-.65-.65l2-5a.5.5 0 0 1 .11-.168l10-10zM11.207 2.5 13.5 4.793 14.793 3.5 12.5 1.207 11.207 2.5zm1.586 3L10.5 3.207 4 9.707V10h.5a.5.5 0 0 1 .5.5v.5h.5a.5.5 0 0 1 .5.5v.5h.293l6.5-6.5zm-9.761 5.175-.106.106-1.528 3.821 3.821-1.528.106-.106A.5.5 0 0 1 5 12.5V12h-.5a.5.5 0 0 1-.5-.5V11h-.5a.5.5 0 0 1-.468-.325z"/>
                                    </svg>
                                </button>
                                <button class="btn-icon btn-danger btn-delete-user" data-user-id="${user.id}" data-user-name="${this.escapeHtml(user.name)}" title="Delete">
                                    <svg width="16" height="16" fill="currentColor" viewBox="0 0 16 16">
                                        <path d="M5.5 5.5A.5.5 0 0 1 6 6v6a.5.5 0 0 1-1 0V6a.5.5 0 0 1 .5-.5zm2.5 0a.5.5 0 0 1 .5.5v6a.5.5 0 0 1-1 0V6a.5.5 0 0 1 .5-.5zm3 .5a.5.5 0 0 0-1 0v6a.5.5 0 0 0 1 0V6z"/>
                                        <path fill-rule="evenodd" d="M14.5 3a1 1 0 0 1-1 1H13v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V4h-.5a1 1 0 0 1-1-1V2a1 1 0 0 1 1-1H6a1 1 0 0 1 1-1h2a1 1 0 0 1 1 1h3.5a1 1 0 0 1 1 1v1zM4.118 4 4 4.059V13a1 1 0 0 0 1 1h6a1 1 0 0 0 1-1V4.059L11.882 4H4.118zM2.5 3V2h11v1h-11z"/>
                                    </svg>
                                </button>
                            </td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        `;

        container.innerHTML = table;

        // Attach event listeners to edit/delete buttons
        container.querySelectorAll('.btn-edit-user').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.preventDefault();
                const userId = parseInt(btn.getAttribute('data-user-id'));
                this.editUser(userId);
            });
        });

        container.querySelectorAll('.btn-delete-user').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.preventDefault();
                const userId = parseInt(btn.getAttribute('data-user-id'));
                const userName = btn.getAttribute('data-user-name');
                this.deleteUser(userId, userName);
            });
        });

        this.renderPagination('users', response);
    }

    async loadFiles() {
        try {
            const params = new URLSearchParams({
                page: this.currentPage.files,
                search: this.filters.files.search,
                subject: this.filters.files.subject,
                category: this.filters.files.category
            });

            const response = await apiRequest(`/api/admin/files?${params}`);
            this.renderFilesTable(response);
        } catch (error) {
            console.error('Error loading files:', error);
            this.showNotification('Failed to load files', 'error');
        }
    }

    renderFilesTable(response) {
        const container = document.getElementById('filesTable');

        if (!response.data || response.data.length === 0) {
            container.innerHTML = '<div class="empty-state">No files found</div>';
            return;
        }

        const table = `
            <table class="admin-table">
                <thead>
                    <tr>
                        <th>ID</th>
                        <th>Filename</th>
                        <th>Subject</th>
                        <th>Category</th>
                        <th>User</th>
                        <th>Size</th>
                        <th>Uploaded</th>
                        <th>Actions</th>
                    </tr>
                </thead>
                <tbody>
                    ${response.data.map(file => `
                        <tr>
                            <td>${file.id}</td>
                            <td title="${this.escapeHtml(file.original_filename)}">
                                ${this.truncate(this.escapeHtml(file.original_filename), 40)}
                            </td>
                            <td>${this.escapeHtml(file.subject_name)}</td>
                            <td><span class="badge badge-category">${this.escapeHtml(file.category)}</span></td>
                            <td>${file.user ? this.escapeHtml(file.user.name) : 'Unknown'}</td>
                            <td>${this.formatFileSize(file.file_size)}</td>
                            <td>${this.formatDate(file.created_at)}</td>
                            <td class="table-actions">
                                <button class="btn-icon btn-danger btn-delete-file" data-file-id="${file.id}" data-file-name="${this.escapeHtml(file.original_filename)}" title="Delete">
                                    <svg width="16" height="16" fill="currentColor" viewBox="0 0 16 16">
                                        <path d="M5.5 5.5A.5.5 0 0 1 6 6v6a.5.5 0 0 1-1 0V6a.5.5 0 0 1 .5-.5zm2.5 0a.5.5 0 0 1 .5.5v6a.5.5 0 0 1-1 0V6a.5.5 0 0 1 .5-.5zm3 .5a.5.5 0 0 0-1 0v6a.5.5 0 0 0 1 0V6z"/>
                                        <path fill-rule="evenodd" d="M14.5 3a1 1 0 0 1-1 1H13v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V4h-.5a1 1 0 0 1-1-1V2a1 1 0 0 1 1-1H6a1 1 0 0 1 1-1h2a1 1 0 0 1 1 1h3.5a1 1 0 0 1 1 1v1zM4.118 4 4 4.059V13a1 1 0 0 0 1 1h6a1 1 0 0 0 1-1V4.059L11.882 4H4.118zM2.5 3V2h11v1h-11z"/>
                                    </svg>
                                </button>
                            </td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        `;

        container.innerHTML = table;

        // Attach event listeners to delete buttons
        container.querySelectorAll('.btn-delete-file').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.preventDefault();
                const fileId = parseInt(btn.getAttribute('data-file-id'));
                const fileName = btn.getAttribute('data-file-name');
                this.deleteFile(fileId, fileName);
            });
        });

        this.renderPagination('files', response);
    }

    renderPagination(type, response) {
        const container = document.getElementById(`${type}Pagination`);

        if (response.last_page <= 1) {
            container.innerHTML = '';
            return;
        }

        const pages = [];
        for (let i = 1; i <= response.last_page; i++) {
            if (
                i === 1 ||
                i === response.last_page ||
                (i >= response.current_page - 2 && i <= response.current_page + 2)
            ) {
                pages.push(i);
            } else if (pages[pages.length - 1] !== '...') {
                pages.push('...');
            }
        }

        const pagination = `
            <div class="pagination">
                <button
                    class="pagination-btn"
                    data-type="${type}"
                    data-page="${response.current_page - 1}"
                    ${response.current_page === 1 ? 'disabled' : ''}
                >
                    Previous
                </button>
                ${pages.map(page => {
                    if (page === '...') {
                        return '<span class="pagination-ellipsis">...</span>';
                    }
                    return `
                        <button
                            class="pagination-btn ${page === response.current_page ? 'active' : ''}"
                            data-type="${type}"
                            data-page="${page}"
                        >
                            ${page}
                        </button>
                    `;
                }).join('')}
                <button
                    class="pagination-btn"
                    data-type="${type}"
                    data-page="${response.current_page + 1}"
                    ${response.current_page === response.last_page ? 'disabled' : ''}
                >
                    Next
                </button>
            </div>
        `;

        container.innerHTML = pagination;

        // Attach event listeners to pagination buttons
        container.querySelectorAll('.pagination-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.preventDefault();
                if (btn.disabled) return;

                const pageType = btn.getAttribute('data-type');
                const page = parseInt(btn.getAttribute('data-page'));
                this.goToPage(pageType, page);
            });
        });
    }

    goToPage(type, page) {
        this.currentPage[type] = page;
        if (type === 'users') {
            this.loadUsers();
        } else if (type === 'files') {
            this.loadFiles();
        }
    }

    async loadSubjects() {
        try {
            const subjects = await apiRequest('/api/subjects');
            const select = document.getElementById('subjectFilter');

            if (select) {
                select.innerHTML = '<option value="">All Subjects</option>' +
                    subjects.map(s => `<option value="${this.escapeHtml(s.subject_name)}">${this.escapeHtml(s.subject_name)}</option>`).join('');
            }
        } catch (error) {
            console.error('Error loading subjects:', error);
        }
    }

    openUserModal(userId = null) {
        this.editingUserId = userId;
        const modal = document.getElementById('userModal');
        const title = document.getElementById('userModalTitle');
        const passwordHelp = document.getElementById('passwordHelp');
        const passwordInput = document.getElementById('userPassword');

        // Clear all validation errors
        document.querySelectorAll('.form-group input').forEach(input => {
            input.classList.remove('input-error');
        });

        if (userId) {
            title.textContent = 'Edit User';
            passwordHelp.style.display = 'block';
            passwordInput.required = false;
            this.loadUserData(userId);
        } else {
            title.textContent = 'Create User';
            passwordHelp.style.display = 'none';
            passwordInput.required = true;

            // Explicitly clear all form fields
            document.getElementById('userId').value = '';
            document.getElementById('userName').value = '';
            document.getElementById('userEmail').value = '';
            document.getElementById('userPassword').value = '';
            document.getElementById('userIsAdmin').checked = false;
        }

        modal.classList.add('show');
    }

    async loadUserData(userId) {
        try {
            const users = await apiRequest('/api/admin/users');
            const user = users.data.find(u => u.id === userId);

            if (user) {
                document.getElementById('userId').value = user.id;
                document.getElementById('userName').value = user.name;
                document.getElementById('userEmail').value = user.email;
                document.getElementById('userIsAdmin').checked = user.is_admin;
                document.getElementById('userPassword').value = '';
            }
        } catch (error) {
            console.error('Error loading user:', error);
            this.showNotification('Failed to load user data', 'error');
        }
    }

    async saveUser() {
        console.log('saveUser() called');

        // Clear previous validation errors
        document.querySelectorAll('.form-group input').forEach(input => {
            input.classList.remove('input-error');
        });

        const userNameEl = document.getElementById('userName');
        const userEmailEl = document.getElementById('userEmail');
        const userPasswordEl = document.getElementById('userPassword');

        console.log('Input elements:', {
            nameEl: userNameEl,
            nameValue: userNameEl?.value,
            emailEl: userEmailEl,
            emailValue: userEmailEl?.value
        });

        const userId = document.getElementById('userId')?.value || '';
        const name = userNameEl?.value?.trim() || '';
        const email = userEmailEl?.value?.trim() || '';
        const password = userPasswordEl?.value || '';
        const isAdmin = document.getElementById('userIsAdmin')?.checked || false;

        console.log('Form values:', { userId, name, email, password: password ? '***' : '', isAdmin });

        // Client-side validation
        let hasError = false;

        if (!name) {
            document.getElementById('userName').classList.add('input-error');
            hasError = true;
        }

        if (!email) {
            document.getElementById('userEmail').classList.add('input-error');
            hasError = true;
        }

        if (!userId && !password) {
            document.getElementById('userPassword').classList.add('input-error');
            this.showNotification('Password is required for new users', 'error');
            hasError = true;
        }

        if (hasError) {
            return;
        }

        const data = {
            name: name,
            email: email,
            is_admin: isAdmin
        };

        if (password) {
            data.password = password;
        }

        console.log('Sending user data:', data); // Debug log

        try {
            if (userId) {
                await apiRequest(`/api/admin/users/${userId}`, {
                    method: 'PUT',
                    body: JSON.stringify(data)
                });
                this.showNotification('User updated successfully', 'success');
            } else {
                await apiRequest('/api/admin/users', {
                    method: 'POST',
                    body: JSON.stringify(data)
                });
                this.showNotification('User created successfully', 'success');
            }

            this.closeModal();
            this.loadUsers();
            this.loadStats();
        } catch (error) {
            console.error('Error saving user:', error);

            // Highlight fields with errors
            if (error.errors) {
                Object.keys(error.errors).forEach(field => {
                    const fieldMap = {
                        'name': 'userName',
                        'email': 'userEmail',
                        'password': 'userPassword'
                    };
                    const inputId = fieldMap[field];
                    if (inputId) {
                        document.getElementById(inputId)?.classList.add('input-error');
                    }
                });
            }

            const message = error.errors ? Object.values(error.errors).flat().join(', ') : 'Failed to save user';
            this.showNotification(message, 'error');
        }
    }

    async editUser(userId) {
        this.openUserModal(userId);
    }

    async deleteUser(userId, userName) {
        if (!confirm(`Are you sure you want to delete user "${userName}"? This action cannot be undone.`)) {
            return;
        }

        try {
            await apiRequest(`/api/admin/users/${userId}`, {
                method: 'DELETE'
            });
            this.showNotification('User deleted successfully', 'success');
            this.loadUsers();
            this.loadStats();
        } catch (error) {
            console.error('Error deleting user:', error);
            this.showNotification(error.message || 'Failed to delete user', 'error');
        }
    }

    async deleteFile(fileId, fileName) {
        if (!confirm(`Are you sure you want to delete "${fileName}"? This action cannot be undone.`)) {
            return;
        }

        try {
            await apiRequest(`/api/admin/files/${fileId}`, {
                method: 'DELETE'
            });
            this.showNotification('File deleted successfully', 'success');
            this.loadFiles();
            this.loadStats();
        } catch (error) {
            console.error('Error deleting file:', error);
            this.showNotification('Failed to delete file', 'error');
        }
    }

    closeModal() {
        const modal = document.getElementById('userModal');
        modal.classList.remove('show');
        document.getElementById('userForm').reset();
        this.editingUserId = null;
    }

    showNotification(message, type = 'info') {
        const notification = document.createElement('div');
        notification.className = `notification notification-${type}`;
        notification.textContent = message;

        document.body.appendChild(notification);

        setTimeout(() => {
            notification.classList.add('show');
        }, 10);

        setTimeout(() => {
            notification.classList.remove('show');
            setTimeout(() => notification.remove(), 300);
        }, 3000);
    }

    // Utility functions
    debounce(func, wait) {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                clearTimeout(timeout);
                func(...args);
            };
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        };
    }

    escapeHtml(text) {
        if (!text) return '';
        const map = {
            '&': '&amp;',
            '<': '&lt;',
            '>': '&gt;',
            '"': '&quot;',
            "'": '&#039;'
        };
        return text.toString().replace(/[&<>"']/g, m => map[m]);
    }

    truncate(str, maxLength) {
        if (str.length <= maxLength) return str;
        return str.substring(0, maxLength - 3) + '...';
    }

    formatDate(dateString) {
        const date = new Date(dateString);
        return date.toLocaleDateString('sk-SK', {
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit'
        });
    }

    formatFileSize(bytes) {
        if (bytes === 0) return '0 B';
        const k = 1024;
        const sizes = ['B', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }
}

// Initialize admin dashboard
const adminDashboard = new AdminDashboard();
window.adminDashboard = adminDashboard;
