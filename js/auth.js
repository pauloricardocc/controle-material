/**
 * Authentication Module
 */

const Auth = {
    // Credentials
    _credentials: {
        email: 'Pablo@admin.com',
        password: 'Pablo@2025'
    },

    _SESSION_KEY: 'materiais_auth_session',

    /**
     * Attempt login with email and password
     * @returns {boolean} true if login successful
     */
    login(email, password) {
        if (email === this._credentials.email && password === this._credentials.password) {
            const session = {
                email: email,
                loggedAt: new Date().toISOString()
            };
            localStorage.setItem(this._SESSION_KEY, JSON.stringify(session));
            return true;
        }
        return false;
    },

    /**
     * Check if user is authenticated
     * @returns {boolean}
     */
    isAuthenticated() {
        return localStorage.getItem(this._SESSION_KEY) !== null;
    },

    /**
     * Get current session info
     * @returns {object|null}
     */
    getSession() {
        const data = localStorage.getItem(this._SESSION_KEY);
        return data ? JSON.parse(data) : null;
    },

    /**
     * Logout and clear session
     */
    logout() {
        localStorage.removeItem(this._SESSION_KEY);
        window.location.reload();
    },

    /**
     * Render the login screen
     */
    renderLoginScreen() {
        const loginScreen = document.getElementById('loginScreen');
        if (!loginScreen) return;

        loginScreen.classList.add('active');
        document.getElementById('sidebar').style.display = 'none';
        document.getElementById('mainContent').style.display = 'none';

        loginScreen.innerHTML = `
            <div class="login-container">
                <div class="login-card">
                    <div class="login-header">
                        <div class="login-logo">
                            <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"
                                stroke-linecap="round" stroke-linejoin="round">
                                <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/>
                                <polyline points="3.27 6.96 12 12.01 20.73 6.96"/>
                                <line x1="12" y1="22.08" x2="12" y2="12"/>
                            </svg>
                        </div>
                        <h1>Controle de Materiais</h1>
                        <p>Faça login para acessar o sistema</p>
                    </div>
                    <form id="loginForm" class="login-form" autocomplete="off">
                        <div class="login-field">
                            <label for="loginEmail">E-mail</label>
                            <div class="login-input-wrapper">
                                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                    <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/>
                                    <polyline points="22,6 12,13 2,6"/>
                                </svg>
                                <input type="email" id="loginEmail" class="login-input" placeholder="seu@email.com" required autofocus>
                            </div>
                        </div>
                        <div class="login-field">
                            <label for="loginPassword">Senha</label>
                            <div class="login-input-wrapper">
                                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                    <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
                                    <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
                                </svg>
                                <input type="password" id="loginPassword" class="login-input" placeholder="••••••••" required>
                            </div>
                        </div>
                        <div class="login-error" id="loginError"></div>
                        <button type="submit" class="login-btn" id="loginBtn">
                            <span>Entrar</span>
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4"/>
                                <polyline points="10 17 15 12 10 7"/>
                                <line x1="15" y1="12" x2="3" y2="12"/>
                            </svg>
                        </button>
                    </form>
                    <div class="login-footer">
                        <p>Sistema de Controle Interno</p>
                    </div>
                </div>
            </div>
        `;

        // Setup form submit
        document.getElementById('loginForm').addEventListener('submit', (e) => {
            e.preventDefault();
            const email = document.getElementById('loginEmail').value.trim();
            const password = document.getElementById('loginPassword').value;
            const errorEl = document.getElementById('loginError');
            const btn = document.getElementById('loginBtn');

            btn.classList.add('loading');
            errorEl.textContent = '';

            setTimeout(() => {
                if (Auth.login(email, password)) {
                    loginScreen.classList.add('fade-out');
                    setTimeout(() => {
                        loginScreen.classList.remove('active', 'fade-out');
                        loginScreen.innerHTML = '';
                        document.getElementById('sidebar').style.display = '';
                        document.getElementById('mainContent').style.display = '';
                        App.init();
                    }, 400);
                } else {
                    btn.classList.remove('loading');
                    errorEl.textContent = 'E-mail ou senha incorretos.';
                    // Shake animation
                    const card = document.querySelector('.login-card');
                    card.classList.add('shake');
                    setTimeout(() => card.classList.remove('shake'), 500);
                }
            }, 600);
        });
    },

    /**
     * Show the main app (hide login)
     */
    showApp() {
        const loginScreen = document.getElementById('loginScreen');
        if (loginScreen) {
            loginScreen.classList.remove('active');
            loginScreen.innerHTML = '';
        }
        document.getElementById('sidebar').style.display = '';
        document.getElementById('mainContent').style.display = '';
    }
};
