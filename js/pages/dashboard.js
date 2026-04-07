/**
 * Dashboard Page
 */

const DashboardPage = {
  async render() {
    const content = document.getElementById('contentArea');
    content.innerHTML = '<div class="spinner"></div>';

    try {
      const data = await db.getDashboardData();
      content.innerHTML = `
        <div class="fade-in">
          <!-- Stats row -->
          <div class="stats-grid">
            <div class="stat-card primary">
              <div class="stat-icon primary">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"/>
                </svg>
              </div>
              <div class="stat-info">
                <h4>Materiais Ativos</h4>
                <div class="stat-value">${data.totalMaterials}</div>
                <div class="stat-label">cadastrados</div>
              </div>
            </div>
            <div class="stat-card blue">
              <div class="stat-icon blue">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <line x1="12" y1="20" x2="12" y2="10"/>
                  <line x1="18" y1="20" x2="18" y2="4"/>
                  <line x1="6" y1="20" x2="6" y2="16"/>
                </svg>
              </div>
              <div class="stat-info">
                <h4>Itens em Estoque</h4>
                <div class="stat-value">${data.totalItems}</div>
                <div class="stat-label">unidades totais</div>
              </div>
            </div>
            <div class="stat-card ${data.belowMinCount > 0 ? 'red' : 'orange'}">
              <div class="stat-icon ${data.belowMinCount > 0 ? 'red' : 'orange'}">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
                  <line x1="12" y1="9" x2="12" y2="13"/>
                  <line x1="12" y1="17" x2="12.01" y2="17"/>
                </svg>
              </div>
              <div class="stat-info">
                <h4>Abaixo do Mínimo</h4>
                <div class="stat-value">${data.belowMinCount}</div>
                <div class="stat-label">${data.belowMinCount > 0 ? 'atenção necessária' : 'tudo OK'}</div>
              </div>
            </div>
            <div class="stat-card purple">
              <div class="stat-icon purple">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                  <polyline points="14 2 14 8 20 8"/>
                </svg>
              </div>
              <div class="stat-info">
                <h4>Req. Pendentes</h4>
                <div class="stat-value">${data.pendingReqs}</div>
                <div class="stat-label">aguardando entrega</div>
              </div>
            </div>
          </div>

          <!-- Below minimum alerts -->
          ${data.belowMinCount > 0 ? `
            <div class="card" style="margin-bottom: 20px; border-left: 4px solid var(--danger-500);">
              <div class="card-header">
                <h3>⚠️ Materiais Abaixo do Estoque Mínimo</h3>
              </div>
              <div class="card-body">
                <div class="table-wrapper">
                  <table>
                    <thead>
                      <tr>
                        <th>Material</th>
                        <th>Código</th>
                        <th>Saldo Atual</th>
                        <th>Mínimo</th>
                      </tr>
                    </thead>
                    <tbody>
                      ${data.belowMin.map(m => `
                        <tr class="alert-row">
                          <td><strong>${escapeHTML(m.name)}</strong></td>
                          <td>${escapeHTML(m.code)}</td>
                          <td><span class="stock-balance stock-low">${m.balance} ${escapeHTML(m.unit)}</span></td>
                          <td>${m.minStock} ${escapeHTML(m.unit)}</td>
                        </tr>
                      `).join('')}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          ` : ''}

          <div class="dashboard-grid">
            <!-- Stock by category -->
            <div class="card">
              <div class="card-header">
                <h3>📦 Estoque por Categoria</h3>
              </div>
              <div class="card-body">
                ${Object.keys(data.stockByCategory).length > 0 ? `
                  <div class="chart-bar-container">
                    ${this._renderCategoryBars(data.stockByCategory)}
                  </div>
                ` : renderEmpty('Nenhum estoque registrado', 'Cadastre materiais e registre entradas')}
              </div>
            </div>

            <!-- Consumption by destination -->
            <div class="card">
              <div class="card-header">
                <h3>🏗️ Consumo por Destino</h3>
              </div>
              <div class="card-body">
                ${Object.keys(data.consumptionByDest).length > 0 ? `
                  <div class="chart-bar-container">
                    ${this._renderDestBars(data.consumptionByDest)}
                  </div>
                ` : renderEmpty('Nenhum consumo registrado', 'Entregue requisições para ver o consumo')}
              </div>
            </div>

            <!-- Recent movements -->
            <div class="card">
              <div class="card-header">
                <h3>🔄 Últimas Movimentações</h3>
              </div>
              <div class="card-body">
                ${data.recentMovements.length > 0 ? `
                  <ul class="mini-list">
                    ${data.recentMovements.map(m => `
                      <li>
                        <div>
                          <span class="item-name">${escapeHTML(m.materialName)}</span>
                          <span class="item-detail"> · ${escapeHTML(m.materialCode)}</span>
                        </div>
                        <div style="text-align: right;">
                          <span class="${m.type === 'entrada' ? 'movement-entry' : 'movement-exit'}">
                            ${m.type === 'entrada' ? '+' : '-'}${m.quantity} ${escapeHTML(m.materialUnit)}
                          </span>
                          <div class="item-detail">${formatDateTime(m.createdAt)}</div>
                        </div>
                      </li>
                    `).join('')}
                  </ul>
                ` : renderEmpty('Nenhuma movimentação', 'Registre entradas ou saídas de estoque')}
              </div>
            </div>

            <!-- Recent requisitions -->
            <div class="card">
              <div class="card-header">
                <h3>📋 Requisições Recentes</h3>
              </div>
              <div class="card-body">
                ${data.recentRequisitions.length > 0 ? `
                  <ul class="mini-list">
                    ${data.recentRequisitions.map(r => `
                      <li>
                        <div>
                          <span class="item-name">${escapeHTML(r.number)}</span>
                          <span class="item-detail"> · ${escapeHTML(r.destination)}</span>
                        </div>
                        <div style="text-align: right;">
                          ${statusBadge(r.status)}
                          <div class="item-detail">${formatDate(r.createdAt)}</div>
                        </div>
                      </li>
                    `).join('')}
                  </ul>
                ` : renderEmpty('Nenhuma requisição', 'Crie uma requisição interna')}
              </div>
            </div>
          </div>
        </div>
      `;
    } catch (err) {
      content.innerHTML = `
        <div class="empty-state">
          <h4>Erro ao carregar painel</h4>
          <p>${err.message || err}</p>
          <button class="btn btn-primary" onclick="DashboardPage.render()" style="margin-top: 12px;">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="23 4 23 10 17 10"/><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/></svg>
            Tentar Novamente
          </button>
        </div>`;
    }
  },

  _renderCategoryBars(catMap) {
    const entries = Object.entries(catMap).sort((a, b) => b[1] - a[1]);
    const max = Math.max(...entries.map(e => e[1]), 1);

    return entries.map(([cat, qty]) => {
      const pct = Math.max((qty / max) * 100, 8);
      return `
        <div class="chart-bar-row">
          <div class="chart-bar-label" title="${escapeHTML(cat)}">${escapeHTML(cat)}</div>
          <div class="chart-bar-track">
            <div class="chart-bar-fill" style="width: ${pct}%">${qty}</div>
          </div>
        </div>
      `;
    }).join('');
  },

  _renderDestBars(destMap) {
    const entries = Object.entries(destMap).sort((a, b) => b[1] - a[1]);
    const max = Math.max(...entries.map(e => e[1]), 1);

    return entries.map(([dest, qty]) => {
      const pct = Math.max((qty / max) * 100, 8);
      return `
        <div class="chart-bar-row">
          <div class="chart-bar-label" title="${escapeHTML(dest)}">${escapeHTML(dest)}</div>
          <div class="chart-bar-track">
            <div class="chart-bar-fill" style="width: ${pct}%; background: linear-gradient(90deg, var(--warning-500), var(--warning-600));">${qty}</div>
          </div>
        </div>
      `;
    }).join('');
  }
};
