/**
 * Utility functions
 */

// Format date to Brazilian format
function formatDate(isoString) {
    if (!isoString) return '-';
    const d = new Date(isoString);
    return d.toLocaleDateString('pt-BR', {
        day: '2-digit', month: '2-digit', year: 'numeric'
    });
}

function formatDateTime(isoString) {
    if (!isoString) return '-';
    const d = new Date(isoString);
    return d.toLocaleDateString('pt-BR', {
        day: '2-digit', month: '2-digit', year: 'numeric',
        hour: '2-digit', minute: '2-digit'
    });
}

function formatDateFull(isoString) {
    if (!isoString) return '-';
    const d = new Date(isoString);
    return d.toLocaleDateString('pt-BR', {
        weekday: 'long', day: '2-digit', month: 'long', year: 'numeric'
    });
}

// Show toast notification
function showToast(message, type = 'success') {
    const container = document.getElementById('toastContainer');
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;

    const icons = {
        success: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="20 6 9 17 4 12"/></svg>',
        error: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>',
        warning: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>',
        info: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><path d="M12 16v-4"/><path d="M12 8h.01"/></svg>'
    };

    toast.innerHTML = `${icons[type] || ''}${message}`;
    container.appendChild(toast);

    setTimeout(() => {
        toast.classList.add('removing');
        setTimeout(() => toast.remove(), 300);
    }, 3500);
}

// Show modal
function showModal(title, bodyHTML) {
    const overlay = document.getElementById('modalOverlay');
    const modalTitle = document.getElementById('modalTitle');
    const modalBody = document.getElementById('modalBody');

    modalTitle.textContent = title;
    modalBody.innerHTML = bodyHTML;
    overlay.classList.add('active');
}

// Close modal
function closeModal() {
    document.getElementById('modalOverlay').classList.remove('active');
}

// Debounce function
function debounce(fn, delay = 300) {
    let timer;
    return (...args) => {
        clearTimeout(timer);
        timer = setTimeout(() => fn(...args), delay);
    };
}

// Escape HTML
function escapeHTML(str) {
    if (!str) return '';
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
}

// Generate status badge HTML
function statusBadge(status) {
    const map = {
        'ativo': '<span class="badge badge-success"><span class="status-dot active"></span>Ativo</span>',
        'inativo': '<span class="badge badge-gray"><span class="status-dot inactive"></span>Inativo</span>',
        'pendente': '<span class="badge badge-warning">Pendente</span>',
        'entregue': '<span class="badge badge-success">Entregue</span>',
        'cancelada': '<span class="badge badge-danger">Cancelada</span>'
    };
    return map[status] || `<span class="badge badge-gray">${escapeHTML(status)}</span>`;
}

// Unit options
const UNITS = [
    'Unidade', 'Peça', 'Metro', 'Metro²', 'Metro³',
    'Litro', 'Kg', 'Tonelada', 'Caixa', 'Pacote',
    'Rolo', 'Saco', 'Barra', 'Galão', 'Lata',
    'Balde', 'Tubo', 'Folha', 'Par', 'Conjunto'
];

// Default category suggestions
const DEFAULT_CATEGORIES = [
    'Elétrica', 'Hidráulica', 'Pintura', 'Ferragens',
    'Cimento e Argamassa', 'Madeira', 'Ferramentas',
    'EPI', 'Acabamento', 'Tubulação', 'Impermeabilização',
    'Diversos'
];

// Render empty state
function renderEmpty(message = 'Nenhum registro encontrado', sub = '') {
    return `
    <div class="empty-state">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
        <path d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"/>
      </svg>
      <h4>${message}</h4>
      ${sub ? `<p>${sub}</p>` : ''}
    </div>
  `;
}
