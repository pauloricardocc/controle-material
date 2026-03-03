/**
 * Registrations Page (Categories & Units)
 */

const CategoriesPage = {
    async render() {
        const content = document.getElementById('contentArea');
        content.innerHTML = `
      <div class="fade-in">
        <div class="action-bar">
          <div class="action-bar-left">
            <div class="search-bar">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
              </svg>
              <input type="text" class="form-control" id="catSearch"
                placeholder="Buscar categoria...">
            </div>
          </div>
          <div class="action-bar-right">
            <button class="btn btn-primary btn-lg" id="btnNewCategory">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
              </svg>
              Nova Categoria
            </button>
          </div>
        </div>

        <div class="card">
          <div class="card-header">
            <h3>🏷️ Categorias de Materiais</h3>
            <span class="badge badge-info" id="catCount">0</span>
          </div>
          <div class="card-body" style="padding: 0;">
            <div class="table-wrapper">
              <table>
                <thead>
                  <tr>
                    <th>Nome da Categoria</th>
                    <th>Data de Criação</th>
                    <th style="width: 140px;">Ações</th>
                  </tr>
                </thead>
                <tbody id="catTableBody">
                  <tr><td colspan="3"><div class="spinner"></div></td></tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    `;

        document.getElementById('catSearch').addEventListener('input',
            debounce(() => this._loadTable(), 250)
        );

        document.getElementById('btnNewCategory').addEventListener('click', () => {
            this._showForm();
        });

        await this._loadTable();
    },

    async _loadTable() {
        const tbody = document.getElementById('catTableBody');
        const query = (document.getElementById('catSearch')?.value || '').toLowerCase();
        let categories = await db.getAllCategories();

        if (query) {
            categories = categories.filter(c => c.name.toLowerCase().includes(query));
        }

        document.getElementById('catCount').textContent = categories.length;

        if (categories.length === 0) {
            tbody.innerHTML = `<tr><td colspan="3">${renderEmpty('Nenhuma categoria encontrada', 'Clique em "Nova Categoria" para adicionar')}</td></tr>`;
            return;
        }

        tbody.innerHTML = categories.map(c => `
      <tr>
        <td><strong>${escapeHTML(c.name)}</strong></td>
        <td>${formatDate(c.createdAt)}</td>
        <td>
          <div style="display:flex;gap:4px;">
            <button class="btn btn-ghost btn-icon btn-edit-cat" data-id="${c.id}" title="Editar">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
              </svg>
            </button>
            <button class="btn btn-ghost btn-icon btn-del-cat" data-id="${c.id}" data-name="${escapeHTML(c.name)}" title="Excluir">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--danger-500)" stroke-width="2">
                <polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
              </svg>
            </button>
          </div>
        </td>
      </tr>
    `).join('');

        tbody.querySelectorAll('.btn-edit-cat').forEach(btn => {
            btn.addEventListener('click', async () => {
                const cat = await db.get('categories', Number(btn.dataset.id));
                this._showForm(cat);
            });
        });

        tbody.querySelectorAll('.btn-del-cat').forEach(btn => {
            btn.addEventListener('click', async () => {
                if (!confirm(`Deseja excluir a categoria "${btn.dataset.name}"?`)) return;
                try {
                    await db.deleteCategory(Number(btn.dataset.id));
                    showToast('Categoria excluída');
                    this._loadTable();
                } catch (err) {
                    showToast(err.message, 'error');
                }
            });
        });
    },

    _showForm(category = null) {
        const isEdit = !!category;
        const formHTML = `
      <form id="catForm">
        <div class="form-group">
          <label for="catName">Nome da Categoria *</label>
          <input type="text" class="form-control" id="catName" required
            value="${escapeHTML(category?.name || '')}" placeholder="Ex: Ferragens">
        </div>
        <div class="form-actions">
          <button type="button" class="btn btn-outline" id="btnCancelCat">Cancelar</button>
          <button type="submit" class="btn btn-primary btn-lg">
            ${isEdit ? 'Salvar Alterações' : 'Cadastrar Categoria'}
          </button>
        </div>
      </form>
    `;

        showModal(isEdit ? 'Editar Categoria' : 'Nova Categoria', formHTML);
        document.getElementById('catName').focus();
        document.getElementById('btnCancelCat').addEventListener('click', closeModal);

        document.getElementById('catForm').addEventListener('submit', async (e) => {
            e.preventDefault();
            try {
                const name = document.getElementById('catName').value.trim();
                if (!name) { showToast('Informe o nome', 'error'); return; }

                if (isEdit) {
                    await db.updateCategory(category.id, name);
                    showToast('Categoria atualizada!');
                } else {
                    await db.addCategory(name);
                    showToast('Categoria cadastrada!');
                }
                closeModal();
                this._loadTable();
            } catch (err) {
                showToast(err.message || 'Erro ao salvar', 'error');
            }
        });
    }
};

// ============================================================

const UnitsPage = {
    async render() {
        const content = document.getElementById('contentArea');
        content.innerHTML = `
      <div class="fade-in">
        <div class="action-bar">
          <div class="action-bar-left">
            <div class="search-bar">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
              </svg>
              <input type="text" class="form-control" id="unitSearch"
                placeholder="Buscar unidade...">
            </div>
          </div>
          <div class="action-bar-right">
            <button class="btn btn-primary btn-lg" id="btnNewUnit">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
              </svg>
              Nova Unidade
            </button>
          </div>
        </div>

        <div class="card">
          <div class="card-header">
            <h3>📏 Unidades de Medida</h3>
            <span class="badge badge-info" id="unitCount">0</span>
          </div>
          <div class="card-body" style="padding: 0;">
            <div class="table-wrapper">
              <table>
                <thead>
                  <tr>
                    <th>Nome da Unidade</th>
                    <th>Abreviação</th>
                    <th>Data de Criação</th>
                    <th style="width: 140px;">Ações</th>
                  </tr>
                </thead>
                <tbody id="unitTableBody">
                  <tr><td colspan="4"><div class="spinner"></div></td></tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    `;

        document.getElementById('unitSearch').addEventListener('input',
            debounce(() => this._loadTable(), 250)
        );

        document.getElementById('btnNewUnit').addEventListener('click', () => {
            this._showForm();
        });

        await this._loadTable();
    },

    async _loadTable() {
        const tbody = document.getElementById('unitTableBody');
        const query = (document.getElementById('unitSearch')?.value || '').toLowerCase();
        let units = await db.getAllUnits();

        if (query) {
            units = units.filter(u => u.name.toLowerCase().includes(query));
        }

        document.getElementById('unitCount').textContent = units.length;

        if (units.length === 0) {
            tbody.innerHTML = `<tr><td colspan="4">${renderEmpty('Nenhuma unidade encontrada', 'Clique em "Nova Unidade" para adicionar')}</td></tr>`;
            return;
        }

        tbody.innerHTML = units.map(u => `
      <tr>
        <td><strong>${escapeHTML(u.name)}</strong></td>
        <td>${escapeHTML(u.abbreviation || '-')}</td>
        <td>${formatDate(u.createdAt)}</td>
        <td>
          <div style="display:flex;gap:4px;">
            <button class="btn btn-ghost btn-icon btn-edit-unit" data-id="${u.id}" title="Editar">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
              </svg>
            </button>
            <button class="btn btn-ghost btn-icon btn-del-unit" data-id="${u.id}" data-name="${escapeHTML(u.name)}" title="Excluir">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--danger-500)" stroke-width="2">
                <polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
              </svg>
            </button>
          </div>
        </td>
      </tr>
    `).join('');

        tbody.querySelectorAll('.btn-edit-unit').forEach(btn => {
            btn.addEventListener('click', async () => {
                const unit = await db.get('units', Number(btn.dataset.id));
                this._showForm(unit);
            });
        });

        tbody.querySelectorAll('.btn-del-unit').forEach(btn => {
            btn.addEventListener('click', async () => {
                if (!confirm(`Deseja excluir a unidade "${btn.dataset.name}"?`)) return;
                try {
                    await db.deleteUnit(Number(btn.dataset.id));
                    showToast('Unidade excluída');
                    this._loadTable();
                } catch (err) {
                    showToast(err.message, 'error');
                }
            });
        });
    },

    _showForm(unit = null) {
        const isEdit = !!unit;
        const formHTML = `
      <form id="unitForm">
        <div class="form-row">
          <div class="form-group">
            <label for="unitName">Nome da Unidade *</label>
            <input type="text" class="form-control" id="unitName" required
              value="${escapeHTML(unit?.name || '')}" placeholder="Ex: Quilograma">
          </div>
          <div class="form-group">
            <label for="unitAbbr">Abreviação</label>
            <input type="text" class="form-control" id="unitAbbr"
              value="${escapeHTML(unit?.abbreviation || '')}" placeholder="Ex: kg">
          </div>
        </div>
        <div class="form-actions">
          <button type="button" class="btn btn-outline" id="btnCancelUnit">Cancelar</button>
          <button type="submit" class="btn btn-primary btn-lg">
            ${isEdit ? 'Salvar Alterações' : 'Cadastrar Unidade'}
          </button>
        </div>
      </form>
    `;

        showModal(isEdit ? 'Editar Unidade' : 'Nova Unidade', formHTML);
        document.getElementById('unitName').focus();
        document.getElementById('btnCancelUnit').addEventListener('click', closeModal);

        document.getElementById('unitForm').addEventListener('submit', async (e) => {
            e.preventDefault();
            try {
                const name = document.getElementById('unitName').value.trim();
                const abbr = document.getElementById('unitAbbr').value.trim();
                if (!name) { showToast('Informe o nome', 'error'); return; }

                if (isEdit) {
                    await db.updateUnit(unit.id, name, abbr);
                    showToast('Unidade atualizada!');
                } else {
                    await db.addUnit(name, abbr);
                    showToast('Unidade cadastrada!');
                }
                closeModal();
                this._loadTable();
            } catch (err) {
                showToast(err.message || 'Erro ao salvar', 'error');
            }
        });
    }
};
