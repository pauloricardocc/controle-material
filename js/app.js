/**
 * App Router and Initialization
 */

const App = {
    pages: {
        dashboard: { title: 'Painel Principal', render: () => DashboardPage.render() },
        materials: { title: 'Materiais', render: () => MaterialsPage.render() },
        stock: { title: 'Estoque', render: () => StockPage.render() },
        requisitions: { title: 'Requisições', render: () => RequisitionsPage.render() },
        categories: { title: 'Cadastro de Categorias', render: () => CategoriesPage.render(), group: 'cadastros' },
        units: { title: 'Cadastro de Unidades de Medida', render: () => UnitsPage.render(), group: 'cadastros' }
    },

    currentPage: 'dashboard',

    async init() {
        // Initialize database
        try {
            await db.init();
        } catch (err) {
            document.getElementById('contentArea').innerHTML = `
        <div class="empty-state">
          <h4>Erro ao inicializar o banco de dados</h4>
          <p>${err}</p>
        </div>
      `;
            return;
        }

        // Seed default categories and units
        await db.seedDefaults();

        // Set current date
        this._updateDate();
        setInterval(() => this._updateDate(), 60000);

        // Setup navigation
        this._setupNav();

        // Setup sidebar submenu toggles
        this._setupSubmenus();

        // Setup modal close
        document.getElementById('modalClose').addEventListener('click', closeModal);
        document.getElementById('modalOverlay').addEventListener('click', (e) => {
            if (e.target === e.currentTarget) closeModal();
        });

        // Setup mobile menu
        document.getElementById('menuToggle').addEventListener('click', () => {
            document.getElementById('sidebar').classList.toggle('open');
            document.getElementById('sidebarOverlay').classList.toggle('active');
        });

        document.getElementById('sidebarOverlay').addEventListener('click', () => {
            document.getElementById('sidebar').classList.remove('open');
            document.getElementById('sidebarOverlay').classList.remove('active');
        });

        // Setup logout
        const logoutBtn = document.getElementById('logoutBtn');
        if (logoutBtn) {
            logoutBtn.addEventListener('click', () => {
                Auth.logout();
            });
        }

        // Handle hash routing
        this._handleRoute();
        window.addEventListener('hashchange', () => this._handleRoute());

        // Keyboard shortcuts
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                closeModal();
                document.getElementById('sidebar').classList.remove('open');
                document.getElementById('sidebarOverlay').classList.remove('active');
            }
        });
    },


    _updateDate() {
        const dateEl = document.getElementById('currentDate');
        if (dateEl) {
            const now = new Date();
            dateEl.textContent = now.toLocaleDateString('pt-BR', {
                weekday: 'long',
                day: '2-digit',
                month: 'long',
                year: 'numeric'
            });
        }
    },

    _setupNav() {
        document.querySelectorAll('.nav-item').forEach(item => {
            item.addEventListener('click', (e) => {
                e.preventDefault();
                const page = item.dataset.page;
                if (page) {
                    window.location.hash = page;
                    // Close mobile sidebar
                    document.getElementById('sidebar').classList.remove('open');
                    document.getElementById('sidebarOverlay').classList.remove('active');
                }
            });
        });
    },

    _setupSubmenus() {
        const toggle = document.getElementById('navToggleCadastros');
        const group = document.getElementById('navGroupCadastros');
        if (toggle && group) {
            toggle.addEventListener('click', (e) => {
                e.preventDefault();
                group.classList.toggle('open');
            });
        }
    },

    _handleRoute() {
        const hash = window.location.hash.replace('#', '') || 'dashboard';
        const page = this.pages[hash];

        if (!page) {
            window.location.hash = 'dashboard';
            return;
        }

        this.currentPage = hash;

        // Update nav active state
        document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
        const activeNav = document.querySelector(`[data-page="${hash}"]`);
        if (activeNav) activeNav.classList.add('active');

        // Auto-open submenu group if navigating to a sub-page
        if (page.group === 'cadastros') {
            const group = document.getElementById('navGroupCadastros');
            if (group) group.classList.add('open');
        }

        // Update page title
        document.getElementById('pageTitle').textContent = page.title;

        // Render page
        page.render();
    }
};

// Initialize app on DOM ready
document.addEventListener('DOMContentLoaded', () => {
    if (Auth.isAuthenticated()) {
        Auth.showApp();
        App.init();
    } else {
        Auth.renderLoginScreen();
    }
});
