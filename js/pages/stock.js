/**
 * Stock Control Page
 */

const StockPage = {
  async render() {
    const content = document.getElementById('contentArea');
    content.innerHTML = '<div class="spinner"></div>';

    const activeMaterials = await db.getActiveMaterials();

    content.innerHTML = `
      <div class="fade-in">
        <!-- Action buttons -->
        <div class="action-bar">
          <div class="action-bar-left">
            <div class="search-bar">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
              </svg>
              <input type="text" class="form-control" id="stockSearch"
                placeholder="Buscar material..." >
            </div>
            <div class="filter-group" id="stockFilter">
              <button class="filter-pill active" data-filter="all">Todos</button>
              <button class="filter-pill" data-filter="low">Abaixo do Mínimo</button>
            </div>
          </div>
          <div class="action-bar-right">
            <button class="btn btn-success btn-lg" id="btnStockEntry">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
              </svg>
              Entrada
            </button>
            <button class="btn btn-danger btn-lg" id="btnStockExit">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <line x1="5" y1="12" x2="19" y2="12"/>
              </svg>
              Saída
            </button>
          </div>
        </div>

        <!-- Balance table -->
        <div class="card" style="margin-bottom: 24px;">
          <div class="card-header">
            <h3>📊 Saldo Atual do Estoque</h3>
          </div>
          <div class="card-body" style="padding: 0;">
            <div class="table-wrapper">
              <table>
                <thead>
                  <tr>
                    <th>Material</th>
                    <th>Código</th>
                    <th>Categoria</th>
                    <th>Unidade</th>
                    <th>Saldo Atual</th>
                    <th>Estoque Mín.</th>
                    <th>Local</th>
                    <th style="width: 100px;">Ações</th>
                  </tr>
                </thead>
                <tbody id="stockTableBody">
                  <tr><td colspan="8"><div class="spinner"></div></td></tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>

        <!-- Movement history -->
        <div class="card">
          <div class="card-header">
            <h3>📜 Histórico de Movimentações</h3>
          </div>
          <div class="card-body" style="padding: 0;">
            <div class="table-wrapper">
              <table>
                <thead>
                  <tr>
                    <th>Data/Hora</th>
                    <th>Material</th>
                    <th>Tipo</th>
                    <th>Quantidade</th>
                    <th>Observação</th>
                  </tr>
                </thead>
                <tbody id="movementsTableBody">
                  <tr><td colspan="5"><div class="spinner"></div></td></tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    `;

    // Events
    document.getElementById('stockSearch').addEventListener('input',
      debounce(() => this._loadBalances(), 250)
    );

    document.getElementById('stockFilter').addEventListener('click', (e) => {
      const pill = e.target.closest('.filter-pill');
      if (!pill) return;
      document.querySelectorAll('#stockFilter .filter-pill').forEach(p => p.classList.remove('active'));
      pill.classList.add('active');
      this._loadBalances();
    });

    document.getElementById('btnStockEntry').addEventListener('click', () => {
      this._showMovementForm('entrada', activeMaterials);
    });

    document.getElementById('btnStockExit').addEventListener('click', () => {
      this._showMovementForm('saida', activeMaterials);
    });

    await this._loadBalances();
    await this._loadMovements();
  },

  async _loadBalances() {
    const tbody = document.getElementById('stockTableBody');
    const query = document.getElementById('stockSearch')?.value?.toLowerCase() || '';
    const filterLow = document.querySelector('#stockFilter .filter-pill.active')?.dataset.filter === 'low';

    let balances = await db.getAllBalances();
    balances = balances.filter(b => b.status === 'ativo');

    if (query) {
      balances = balances.filter(b =>
        b.name.toLowerCase().includes(query) || b.code.toLowerCase().includes(query)
      );
    }
    if (filterLow) {
      balances = balances.filter(b => b.belowMin);
    }

    if (balances.length === 0) {
      tbody.innerHTML = `<tr><td colspan="8">${renderEmpty('Nenhum material encontrado')}</td></tr>`;
      return;
    }

    tbody.innerHTML = balances.map(b => `
      <tr class="${b.belowMin ? 'alert-row' : ''}">
        <td><strong>${escapeHTML(b.name)}</strong></td>
        <td><code style="background:var(--gray-100);padding:2px 8px;border-radius:4px;font-size:0.82rem;">${escapeHTML(b.code)}</code></td>
        <td>${escapeHTML(b.category || '-')}</td>
        <td>${escapeHTML(b.unit)}</td>
        <td>
          <span class="stock-balance ${b.belowMin ? 'stock-low' : 'stock-ok'}">
            ${b.balance}
          </span>
        </td>
        <td>${b.minStock || 0}</td>
        <td>${escapeHTML(b.location || '-')}</td>
        <td>
          <div style="display:flex;gap:4px;">
            <button class="btn btn-ghost btn-icon btn-stock-entry" data-id="${b.id}" data-name="${escapeHTML(b.name)}" data-unit="${escapeHTML(b.unit)}" title="Entrada rápida">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--success-500)" stroke-width="2">
                <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
              </svg>
            </button>
            <button class="btn btn-ghost btn-icon btn-stock-exit" data-id="${b.id}" data-name="${escapeHTML(b.name)}" data-unit="${escapeHTML(b.unit)}" data-balance="${b.balance}" title="Saída rápida">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--danger-500)" stroke-width="2">
                <line x1="5" y1="12" x2="19" y2="12"/>
              </svg>
            </button>
          </div>
        </td>
      </tr>
    `).join('');

    // Quick entry/exit handlers
    tbody.querySelectorAll('.btn-stock-entry').forEach(btn => {
      btn.addEventListener('click', () => {
        this._showQuickMovement('entrada', Number(btn.dataset.id), btn.dataset.name, btn.dataset.unit);
      });
    });

    tbody.querySelectorAll('.btn-stock-exit').forEach(btn => {
      btn.addEventListener('click', () => {
        this._showQuickMovement('saida', Number(btn.dataset.id), btn.dataset.name, btn.dataset.unit, Number(btn.dataset.balance));
      });
    });
  },

  async _loadMovements() {
    const tbody = document.getElementById('movementsTableBody');
    const movements = await db.getRecentMovements(50);

    if (movements.length === 0) {
      tbody.innerHTML = `<tr><td colspan="5">${renderEmpty('Nenhuma movimentação registrada')}</td></tr>`;
      return;
    }

    tbody.innerHTML = movements.map(m => `
      <tr>
        <td>${formatDateTime(m.createdAt)}</td>
        <td><strong>${escapeHTML(m.materialName)}</strong> <span style="color:var(--gray-400);">(${escapeHTML(m.materialCode)})</span></td>
        <td>
          <span class="badge ${m.type === 'entrada' ? 'badge-success' : 'badge-danger'}">
            ${m.type === 'entrada' ? '↑ Entrada' : '↓ Saída'}
          </span>
        </td>
        <td>
          <span class="${m.type === 'entrada' ? 'movement-entry' : 'movement-exit'}">
            ${m.type === 'entrada' ? '+' : '-'}${m.quantity} ${escapeHTML(m.materialUnit)}
          </span>
        </td>
        <td>${escapeHTML(m.notes || '-')}</td>
      </tr>
    `).join('');
  },

  _showMovementForm(type, materials) {
    const isEntry = type === 'entrada';
    const title = isEntry ? 'Registrar Entrada' : 'Registrar Saída';
    const btnClass = isEntry ? 'btn-success' : 'btn-danger';

    const matOptions = materials.map(m =>
      `<option value="${m.id}">${escapeHTML(m.name)} (${escapeHTML(m.code)})</option>`
    ).join('');

    const formHTML = `
      <form id="movementForm">
        <div class="form-group">
          <label for="movMaterial">Material *</label>
          <select class="form-control" id="movMaterial" required>
            <option value="">Selecione o material...</option>
            ${matOptions}
          </select>
        </div>
        <div id="movBalanceInfo" style="display:none; margin-bottom: 14px;"></div>
        <div class="form-group">
          <label for="movQuantity">Quantidade *</label>
          <input type="number" class="form-control" id="movQuantity" required min="1" placeholder="0">
        </div>
        <div class="form-group">
          <label for="movNotes">Observação</label>
          <textarea class="form-control" id="movNotes" rows="2" placeholder="Observação opcional..."></textarea>
        </div>
        <div class="form-actions">
          <button type="button" class="btn btn-outline" id="btnCancelMov">Cancelar</button>
          <button type="submit" class="btn ${btnClass} btn-lg">
            ${isEntry ? 'Confirmar Entrada' : 'Confirmar Saída'}
          </button>
        </div>
      </form>
    `;

    showModal(title, formHTML);

    // Show balance when material selected
    document.getElementById('movMaterial').addEventListener('change', async (e) => {
      const matId = Number(e.target.value);
      const infoDiv = document.getElementById('movBalanceInfo');
      if (!matId) { infoDiv.style.display = 'none'; return; }

      const balance = await db.getStockBalance(matId);
      const mat = await db.getMaterial(matId);
      infoDiv.style.display = 'block';
      infoDiv.innerHTML = `
        <div style="padding: 10px 14px; background: var(--gray-50); border-radius: var(--border-radius-md); font-size: 0.85rem;">
          Saldo atual: <strong class="${balance < (mat?.minStock || 0) ? 'stock-low' : 'stock-ok'}">${balance} ${escapeHTML(mat?.unit || '')}</strong>
          ${mat?.minStock ? ` · Mínimo: ${mat.minStock}` : ''}
        </div>
      `;
    });

    document.getElementById('btnCancelMov').addEventListener('click', closeModal);

    document.getElementById('movementForm').addEventListener('submit', async (e) => {
      e.preventDefault();
      try {
        const materialId = Number(document.getElementById('movMaterial').value);
        const quantity = Number(document.getElementById('movQuantity').value);
        const notes = document.getElementById('movNotes').value.trim();

        if (!materialId || !quantity || quantity <= 0) {
          showToast('Preencha todos os campos corretamente', 'error');
          return;
        }

        if (isEntry) {
          await db.addStockEntry(materialId, quantity, notes);
          showToast('Entrada registrada com sucesso!');
        } else {
          await db.addStockExit(materialId, quantity, notes);
          showToast('Saída registrada com sucesso!');
        }

        closeModal();
        await this._loadBalances();
        await this._loadMovements();
      } catch (err) {
        showToast(err.message || 'Erro ao registrar movimentação', 'error');
      }
    });
  },

  _showQuickMovement(type, materialId, materialName, materialUnit, currentBalance) {
    const isEntry = type === 'entrada';
    const title = isEntry ? `Entrada - ${materialName}` : `Saída - ${materialName}`;
    const btnClass = isEntry ? 'btn-success' : 'btn-danger';

    const formHTML = `
      <form id="quickMovForm">
        <div style="padding: 10px 14px; background: var(--gray-50); border-radius: var(--border-radius-md); font-size: 0.85rem; margin-bottom: 16px;">
          <strong>${escapeHTML(materialName)}</strong>
          ${currentBalance !== undefined ? ` · Saldo: <strong>${currentBalance} ${escapeHTML(materialUnit)}</strong>` : ''}
        </div>
        <div class="form-group">
          <label for="quickQty">Quantidade (${escapeHTML(materialUnit)}) *</label>
          <input type="number" class="form-control" id="quickQty" required min="1" placeholder="0" autofocus>
        </div>
        <div class="form-group">
          <label for="quickNotes">Observação</label>
          <textarea class="form-control" id="quickNotes" rows="2" placeholder="Observação opcional..."></textarea>
        </div>
        <div class="form-actions">
          <button type="button" class="btn btn-outline" id="btnCancelQuick">Cancelar</button>
          <button type="submit" class="btn ${btnClass} btn-lg">
            ${isEntry ? 'Confirmar Entrada' : 'Confirmar Saída'}
          </button>
        </div>
      </form>
    `;

    showModal(title, formHTML);

    document.getElementById('btnCancelQuick').addEventListener('click', closeModal);

    document.getElementById('quickMovForm').addEventListener('submit', async (e) => {
      e.preventDefault();
      try {
        const quantity = Number(document.getElementById('quickQty').value);
        const notes = document.getElementById('quickNotes').value.trim();

        if (!quantity || quantity <= 0) {
          showToast('Digite uma quantidade válida', 'error');
          return;
        }

        if (isEntry) {
          await db.addStockEntry(materialId, quantity, notes);
          showToast(`Entrada de ${quantity} ${materialUnit} registrada!`);
        } else {
          await db.addStockExit(materialId, quantity, notes);
          showToast(`Saída de ${quantity} ${materialUnit} registrada!`);
        }

        closeModal();
        await this._loadBalances();
        await this._loadMovements();
      } catch (err) {
        showToast(err.message || 'Erro ao registrar movimentação', 'error');
      }
    });
  }
};
