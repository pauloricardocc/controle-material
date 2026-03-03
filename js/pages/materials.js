/**
 * Materials Page
 */

const MaterialsPage = {
  currentFilter: { query: '', category: '', status: '' },

  async render() {
    const content = document.getElementById('contentArea');
    const catNames = await db.getCategoryNames();
    const unitNames = await db.getUnitNames();
    // Merge DB categories with any legacy ones used in existing materials
    const legacyCats = await db.getCategories();
    const allCategories = [...new Set([...catNames, ...legacyCats])].sort();

    content.innerHTML = `
      <div class="fade-in">
        <div class="action-bar">
          <div class="action-bar-left">
            <div class="search-bar">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
              </svg>
              <input type="text" class="form-control" id="materialSearch"
                placeholder="Buscar por nome ou código..." value="${escapeHTML(this.currentFilter.query)}">
            </div>
            <div class="filter-group" id="statusFilter">
              <button class="filter-pill ${this.currentFilter.status === '' ? 'active' : ''}" data-status="">Todos</button>
              <button class="filter-pill ${this.currentFilter.status === 'ativo' ? 'active' : ''}" data-status="ativo">Ativos</button>
              <button class="filter-pill ${this.currentFilter.status === 'inativo' ? 'active' : ''}" data-status="inativo">Inativos</button>
            </div>
          </div>
          <div class="action-bar-right">
            <button class="btn btn-primary btn-lg" id="btnNewMaterial">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
              </svg>
              Novo Material
            </button>
          </div>
        </div>

        <div class="card">
          <div class="card-body" style="padding: 0;">
            <div class="table-wrapper">
              <table>
                <thead>
                  <tr>
                    <th>Nome</th>
                    <th>Código</th>
                    <th>Categoria</th>
                    <th>Unidade</th>
                    <th>Est. Mínimo</th>
                    <th>Local</th>
                    <th>Status</th>
                    <th style="width: 120px;">Ações</th>
                  </tr>
                </thead>
                <tbody id="materialsTableBody">
                  <tr><td colspan="8"><div class="spinner"></div></td></tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    `;

    // Event listeners
    document.getElementById('materialSearch').addEventListener('input',
      debounce((e) => { this.currentFilter.query = e.target.value; this._loadTable(); }, 250)
    );

    document.getElementById('statusFilter').addEventListener('click', (e) => {
      const pill = e.target.closest('.filter-pill');
      if (!pill) return;
      document.querySelectorAll('#statusFilter .filter-pill').forEach(p => p.classList.remove('active'));
      pill.classList.add('active');
      this.currentFilter.status = pill.dataset.status;
      this._loadTable();
    });

    document.getElementById('btnNewMaterial').addEventListener('click', () => {
      this._showForm(null, allCategories, unitNames);
    });

    await this._loadTable();
  },

  async _loadTable() {
    const tbody = document.getElementById('materialsTableBody');
    const materials = await db.searchMaterials(
      this.currentFilter.query,
      this.currentFilter.category,
      this.currentFilter.status
    );

    if (materials.length === 0) {
      tbody.innerHTML = `<tr><td colspan="8">${renderEmpty('Nenhum material encontrado', 'Clique em "Novo Material" para cadastrar')}</td></tr>`;
      return;
    }

    tbody.innerHTML = materials.map(m => `
      <tr>
        <td><strong>${escapeHTML(m.name)}</strong></td>
        <td><code style="background:var(--gray-100);padding:2px 8px;border-radius:4px;font-size:0.82rem;">${escapeHTML(m.code)}</code></td>
        <td>${escapeHTML(m.category || '-')}</td>
        <td>${escapeHTML(m.unit)}</td>
        <td>${m.minStock || 0}</td>
        <td>${escapeHTML(m.location || '-')}</td>
        <td>${statusBadge(m.status)}</td>
        <td>
          <div style="display:flex;gap:4px;">
            <button class="btn btn-ghost btn-icon btn-edit" data-id="${m.id}" title="Editar">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
              </svg>
            </button>
            <button class="btn btn-ghost btn-icon btn-toggle" data-id="${m.id}" title="${m.status === 'ativo' ? 'Inativar' : 'Ativar'}">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="${m.status === 'ativo' ? 'var(--danger-500)' : 'var(--success-500)'}" stroke-width="2">
                ${m.status === 'ativo'
        ? '<circle cx="12" cy="12" r="10"/><line x1="4.93" y1="4.93" x2="19.07" y2="19.07"/>'
        : '<polyline points="20 6 9 17 4 12"/>'}
              </svg>
            </button>
          </div>
        </td>
      </tr>
    `).join('');

    // Bind actions
    tbody.querySelectorAll('.btn-edit').forEach(btn => {
      btn.addEventListener('click', async () => {
        const mat = await db.get('materials', Number(btn.dataset.id));
        const catNames2 = await db.getCategoryNames();
        const legacyCats2 = await db.getCategories();
        const allCats = [...new Set([...catNames2, ...legacyCats2])].sort();
        const unitNames2 = await db.getUnitNames();
        this._showForm(mat, allCats, unitNames2);
      });
    });

    tbody.querySelectorAll('.btn-toggle').forEach(btn => {
      btn.addEventListener('click', async () => {
        const mat = await db.toggleMaterialStatus(Number(btn.dataset.id));
        showToast(`Material "${mat.name}" ${mat.status === 'ativo' ? 'ativado' : 'inativado'}`);
        this._loadTable();
      });
    });
  },

  _showForm(material, categories, unitNames) {
    const isEdit = !!material;
    const title = isEdit ? 'Editar Material' : 'Novo Material';

    const catOptions = categories.map(c =>
      `<option value="${escapeHTML(c)}" ${material?.category === c ? 'selected' : ''}>${escapeHTML(c)}</option>`
    ).join('');

    const unitOptions = unitNames.map(u =>
      `<option value="${escapeHTML(u)}" ${material?.unit === u ? 'selected' : ''}>${escapeHTML(u)}</option>`
    ).join('');

    const formHTML = `
      <form id="materialForm">
        <div class="form-row">
          <div class="form-group">
            <label for="matName">Nome do Material *</label>
            <input type="text" class="form-control" id="matName" required
              value="${escapeHTML(material?.name || '')}" placeholder="Ex: Cimento CP-II">
          </div>
          <div class="form-group">
            <label for="matCode">Código Interno *</label>
            <input type="text" class="form-control" id="matCode" required
              value="${escapeHTML(material?.code || '')}" placeholder="Ex: CIM-001">
          </div>
        </div>
        <div class="form-row">
          <div class="form-group">
            <label for="matCategory">Categoria</label>
            <select class="form-control" id="matCategory">
              <option value="">Selecione...</option>
              ${catOptions}
            </select>
          </div>
          <div class="form-group">
            <label for="matUnit">Unidade de Medida *</label>
            <select class="form-control" id="matUnit" required>
              ${unitOptions}
            </select>
          </div>
        </div>
        <div class="form-row">
          <div class="form-group">
            <label for="matMinStock">Estoque Mínimo</label>
            <input type="number" class="form-control" id="matMinStock" min="0"
              value="${material?.minStock ?? 0}" placeholder="0">
          </div>
          <div class="form-group">
            <label for="matLocation">Local de Armazenamento</label>
            <input type="text" class="form-control" id="matLocation"
              value="${escapeHTML(material?.location || '')}" placeholder="Ex: Almoxarifado A">
          </div>
        </div>
        <div class="form-group">
          <label for="matNotes">Observações</label>
          <textarea class="form-control" id="matNotes" rows="3"
            placeholder="Observações opcionais...">${escapeHTML(material?.notes || '')}</textarea>
        </div>
        <div class="form-actions">
          <button type="button" class="btn btn-outline" id="btnCancelMat">Cancelar</button>
          <button type="submit" class="btn btn-primary btn-lg">
            ${isEdit ? 'Salvar Alterações' : 'Cadastrar Material'}
          </button>
        </div>
      </form>
    `;

    showModal(title, formHTML);

    document.getElementById('btnCancelMat').addEventListener('click', closeModal);

    document.getElementById('materialForm').addEventListener('submit', async (e) => {
      e.preventDefault();
      try {
        const data = {
          name: document.getElementById('matName').value.trim(),
          code: document.getElementById('matCode').value.trim(),
          category: document.getElementById('matCategory').value,
          unit: document.getElementById('matUnit').value,
          minStock: Number(document.getElementById('matMinStock').value) || 0,
          location: document.getElementById('matLocation').value.trim(),
          notes: document.getElementById('matNotes').value.trim()
        };

        if (!data.name || !data.code) {
          showToast('Preencha os campos obrigatórios', 'error');
          return;
        }

        if (isEdit) {
          data.id = material.id;
          data.status = material.status;
          data.createdAt = material.createdAt;
          await db.updateMaterial(data);
          showToast('Material atualizado com sucesso!');
        } else {
          await db.addMaterial(data);
          showToast('Material cadastrado com sucesso!');
        }

        closeModal();
        this._loadTable();
      } catch (err) {
        showToast(err.message || 'Erro ao salvar material', 'error');
      }
    });
  }
};
