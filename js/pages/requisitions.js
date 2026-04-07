/**
 * Requisitions Page
 */

const RequisitionsPage = {
  async render() {
    const content = document.getElementById('contentArea');
    content.innerHTML = '<div class="spinner"></div>';

    try {
    content.innerHTML = `
      <div class="fade-in">
        <div class="action-bar">
          <div class="action-bar-left">
            <div class="filter-group" id="reqStatusFilter">
              <button class="filter-pill active" data-status="">Todas</button>
              <button class="filter-pill" data-status="pendente">Pendentes</button>
              <button class="filter-pill" data-status="entregue">Entregues</button>
              <button class="filter-pill" data-status="cancelada">Canceladas</button>
            </div>
          </div>
          <div class="action-bar-right">
            <button class="btn btn-primary btn-lg" id="btnNewRequisition">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
              </svg>
              Nova Requisição
            </button>
          </div>
        </div>

        <div class="card">
          <div class="card-body" style="padding: 0;">
            <div class="table-wrapper">
              <table>
                <thead>
                  <tr>
                    <th>Número</th>
                    <th>Destino/Obra</th>
                    <th>Status</th>
                    <th>Data</th>
                    <th style="width: 200px;">Ações</th>
                  </tr>
                </thead>
                <tbody id="reqTableBody">
                  <tr><td colspan="5"><div class="spinner"></div></td></tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    `;

    // Events
    document.getElementById('reqStatusFilter').addEventListener('click', (e) => {
      const pill = e.target.closest('.filter-pill');
      if (!pill) return;
      document.querySelectorAll('#reqStatusFilter .filter-pill').forEach(p => p.classList.remove('active'));
      pill.classList.add('active');
      this._loadTable();
    });

    document.getElementById('btnNewRequisition').addEventListener('click', () => {
      this._showCreateForm();
    });

    await this._loadTable();
    } catch (err) {
      content.innerHTML = `
        <div class="empty-state">
          <h4>Erro ao carregar painel</h4>
          <p>${err.message || err}</p>
          <button class="btn btn-primary" onclick="RequisitionsPage.render()" style="margin-top: 12px;">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="23 4 23 10 17 10"/><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/></svg>
            Tentar Novamente
          </button>
        </div>`;
    }
  },

  async _loadTable() {
    const tbody = document.getElementById('reqTableBody');
    const statusFilter = document.querySelector('#reqStatusFilter .filter-pill.active')?.dataset.status || '';

    let requisitions = await db.getAllRequisitions();
    requisitions.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

    if (statusFilter) {
      requisitions = requisitions.filter(r => r.status === statusFilter);
    }

    if (requisitions.length === 0) {
      tbody.innerHTML = `<tr><td colspan="5">${renderEmpty('Nenhuma requisição encontrada', 'Clique em "Nova Requisição" para criar')}</td></tr>`;
      return;
    }

    tbody.innerHTML = requisitions.map(r => `
      <tr>
        <td><strong>${escapeHTML(r.number)}</strong></td>
        <td>${escapeHTML(r.destination)}</td>
        <td>${statusBadge(r.status)}</td>
        <td>${formatDate(r.createdAt)}</td>
        <td>
          <div style="display: flex; gap: 4px; flex-wrap: wrap;">
            <button class="btn btn-ghost btn-sm btn-view" data-id="${r.id}" title="Ver detalhes">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
                <circle cx="12" cy="12" r="3"/>
              </svg>
              Detalhes
            </button>
            ${r.status === 'pendente' ? `
              <button class="btn btn-success btn-sm btn-deliver" data-id="${r.id}" title="Marcar como entregue">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <polyline points="20 6 9 17 4 12"/>
                </svg>
                Entregar
              </button>
              <button class="btn btn-danger btn-sm btn-cancel" data-id="${r.id}" title="Cancelar requisição">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
                </svg>
                Cancelar
              </button>
            ` : ''}
            <button class="btn btn-ghost btn-icon btn-delete-req" data-id="${r.id}" data-number="${escapeHTML(r.number)}" title="Excluir requisição">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--danger-500)" stroke-width="2">
                <polyline points="3 6 5 6 21 6"/>
                <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
                <line x1="10" y1="11" x2="10" y2="17"/>
                <line x1="14" y1="11" x2="14" y2="17"/>
              </svg>
            </button>
          </div>
        </td>
      </tr>
    `).join('');

    // Bind actions
    tbody.querySelectorAll('.btn-view').forEach(btn => {
      btn.addEventListener('click', () => this._showDetail(Number(btn.dataset.id)));
    });

    tbody.querySelectorAll('.btn-deliver').forEach(btn => {
      btn.addEventListener('click', async () => {
        if (!confirm('Confirma a entrega desta requisição?\nO estoque será baixado automaticamente.')) return;
        try {
          await db.updateRequisitionStatus(Number(btn.dataset.id), 'entregue');
          showToast('Requisição marcada como entregue! Estoque atualizado.');
          this._loadTable();
        } catch (err) {
          showToast(err.message, 'error');
        }
      });
    });

    tbody.querySelectorAll('.btn-cancel').forEach(btn => {
      btn.addEventListener('click', async () => {
        if (!confirm('Deseja cancelar esta requisição?')) return;
        try {
          await db.updateRequisitionStatus(Number(btn.dataset.id), 'cancelada');
          showToast('Requisição cancelada.', 'warning');
          this._loadTable();
        } catch (err) {
          showToast(err.message, 'error');
        }
      });
    });

    tbody.querySelectorAll('.btn-delete-req').forEach(btn => {
      btn.addEventListener('click', async () => {
        const number = btn.dataset.number;
        const id = Number(btn.dataset.id);
        if (confirm(`Tem certeza que deseja excluir a requisição "${number}"?\n\nEsta ação é irreversível.`)) {
          try {
            await db.deleteRequisition(id);
            showToast(`Requisição "${number}" excluída com sucesso!`);
            this._loadTable();
          } catch (err) {
            showToast(err.message || 'Erro ao excluir requisição', 'error');
          }
        }
      });
    });
  },

  async _showCreateForm() {
    const materials = await db.getActiveMaterials();

    if (materials.length === 0) {
      showToast('Cadastre materiais antes de criar requisições', 'warning');
      return;
    }

    const matOptions = materials.map(m =>
      `<option value="${m.id}">${escapeHTML(m.name)} (${escapeHTML(m.code)})</option>`
    ).join('');

    const formHTML = `
      <form id="reqForm">
        <div class="form-group">
          <label for="reqDest">Destino / Obra *</label>
          <input type="text" class="form-control" id="reqDest" required
            placeholder="Ex: Obra Residencial Alfa">
        </div>
        <div class="form-group">
          <label for="reqNotes">Observações</label>
          <textarea class="form-control" id="reqNotes" rows="2"
            placeholder="Observações opcionais..."></textarea>
        </div>

        <div style="margin-bottom: 14px;">
          <label style="font-size: 0.82rem; font-weight: 600; color: var(--gray-700); margin-bottom: 8px; display: block;">
            Itens da Requisição *
          </label>
          <div id="reqItemsList"></div>
          <button type="button" class="btn btn-outline btn-sm" id="btnAddItem" style="margin-top: 8px;">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
            </svg>
            Adicionar Item
          </button>
        </div>

        <div class="form-actions">
          <button type="button" class="btn btn-outline" id="btnCancelReq">Cancelar</button>
          <button type="submit" class="btn btn-primary btn-lg">Criar Requisição</button>
        </div>
      </form>
    `;

    showModal('Nova Requisição', formHTML);

    let itemCount = 0;

    const addItemRow = () => {
      itemCount++;
      const row = document.createElement('div');
      row.className = 'req-item-row';
      row.dataset.idx = itemCount;
      row.innerHTML = `
        <select class="form-control req-mat-select" required>
          <option value="">Selecione...</option>
          ${matOptions}
        </select>
        <input type="number" class="form-control req-qty" min="1" required placeholder="Qtd">
        <button type="button" class="btn btn-ghost btn-icon btn-remove-item" title="Remover">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--danger-500)" stroke-width="2">
            <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
          </svg>
        </button>
      `;
      document.getElementById('reqItemsList').appendChild(row);

      row.querySelector('.btn-remove-item').addEventListener('click', () => {
        if (document.querySelectorAll('.req-item-row').length > 1) {
          row.remove();
        } else {
          showToast('A requisição precisa de pelo menos um item', 'warning');
        }
      });
    };

    // Start with one item
    addItemRow();

    document.getElementById('btnAddItem').addEventListener('click', addItemRow);
    document.getElementById('btnCancelReq').addEventListener('click', closeModal);

    document.getElementById('reqForm').addEventListener('submit', async (e) => {
      e.preventDefault();
      try {
        const destination = document.getElementById('reqDest').value.trim();
        const notes = document.getElementById('reqNotes').value.trim();

        const items = [];
        const rows = document.querySelectorAll('.req-item-row');
        for (const row of rows) {
          const materialId = Number(row.querySelector('.req-mat-select').value);
          const quantity = Number(row.querySelector('.req-qty').value);
          if (!materialId || !quantity || quantity <= 0) {
            showToast('Preencha todos os itens corretamente', 'error');
            return;
          }
          items.push({ materialId, quantity });
        }

        if (items.length === 0) {
          showToast('Adicione pelo menos um item', 'error');
          return;
        }

        await db.createRequisition(destination, notes, items);
        showToast('Requisição criada com sucesso!');
        closeModal();
        this._loadTable();
      } catch (err) {
        showToast(err.message || 'Erro ao criar requisição', 'error');
      }
    });
  },

  async _showDetail(reqId) {
    const req = await db.getRequisitionWithItems(reqId);
    if (!req) {
      showToast('Requisição não encontrada', 'error');
      return;
    }

    const detailHTML = `
      <div class="req-info-grid">
        <div class="req-info-item">
          <small>Número</small>
          <span>${escapeHTML(req.number)}</span>
        </div>
        <div class="req-info-item">
          <small>Destino</small>
          <span>${escapeHTML(req.destination)}</span>
        </div>
        <div class="req-info-item">
          <small>Status</small>
          <span>${statusBadge(req.status)}</span>
        </div>
        <div class="req-info-item">
          <small>Data</small>
          <span>${formatDateTime(req.createdAt)}</span>
        </div>
      </div>

      ${req.notes ? `<p style="margin-bottom: 16px; color: var(--gray-600); font-size: 0.88rem;"><strong>Observações:</strong> ${escapeHTML(req.notes)}</p>` : ''}

      <div class="table-wrapper" style="margin-bottom: 20px;">
        <table>
          <thead>
            <tr>
              <th>Material</th>
              <th>Código</th>
              <th>Quantidade</th>
              <th>Unidade</th>
            </tr>
          </thead>
          <tbody>
            ${req.items.map(it => `
              <tr>
                <td><strong>${escapeHTML(it.materialName)}</strong></td>
                <td>${escapeHTML(it.materialCode)}</td>
                <td>${it.quantity}</td>
                <td>${escapeHTML(it.materialUnit)}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>

      <div style="display: flex; gap: 10px; justify-content: flex-end;">
        <button class="btn btn-outline" id="btnCloseDetail">Fechar</button>
        <button class="btn btn-primary btn-lg" id="btnPrintReq">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <polyline points="6 9 6 2 18 2 18 9"/>
            <path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/>
            <rect x="6" y="14" width="12" height="8"/>
          </svg>
          Imprimir Requisição
        </button>
      </div>
    `;

    showModal(`Requisição ${req.number}`, detailHTML);

    document.getElementById('btnCloseDetail').addEventListener('click', closeModal);
    document.getElementById('btnPrintReq').addEventListener('click', () => {
      this._printRequisition(req);
    });
  },

  _printRequisition(req) {
    const printArea = document.getElementById('printArea');

    printArea.innerHTML = `
      <div class="print-header">
        <h1>REQUISIÇÃO INTERNA DE MATERIAIS</h1>
        <p>Controle Interno de Materiais e Estoque</p>
      </div>

      <div class="print-info">
        <div>
          <div class="print-info-item"><strong>Requisição Nº:</strong> ${escapeHTML(req.number)}</div>
          <div class="print-info-item"><strong>Destino/Obra:</strong> ${escapeHTML(req.destination)}</div>
          <div class="print-info-item"><strong>Status:</strong> ${req.status.charAt(0).toUpperCase() + req.status.slice(1)}</div>
        </div>
        <div>
          <div class="print-info-item"><strong>Data:</strong> ${formatDateFull(req.createdAt)}</div>
          ${req.notes ? `<div class="print-info-item"><strong>Obs:</strong> ${escapeHTML(req.notes)}</div>` : ''}
        </div>
      </div>

      <table class="print-table">
        <thead>
          <tr>
            <th style="width: 40px;">Item</th>
            <th>Material</th>
            <th style="width: 100px;">Código</th>
            <th style="width: 100px;">Quantidade</th>
            <th style="width: 80px;">Unidade</th>
          </tr>
        </thead>
        <tbody>
          ${req.items.map((it, i) => `
            <tr>
              <td>${i + 1}</td>
              <td>${escapeHTML(it.materialName)}</td>
              <td>${escapeHTML(it.materialCode)}</td>
              <td style="text-align: center;">${it.quantity}</td>
              <td>${escapeHTML(it.materialUnit)}</td>
            </tr>
          `).join('')}
        </tbody>
      </table>

      <div class="print-signatures">
        <div class="print-signature-block">
          <div class="print-signature-line">Solicitante</div>
        </div>
        <div class="print-signature-block">
          <div class="print-signature-line">Entregou</div>
        </div>
        <div class="print-signature-block">
          <div class="print-signature-line">Recebeu</div>
        </div>
      </div>

      <div class="print-footer">
        Documento gerado em ${formatDateFull(new Date().toISOString())} · Sistema de Controle de Materiais
      </div>
    `;

    window.print();
  }
};
