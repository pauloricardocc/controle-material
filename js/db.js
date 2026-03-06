/**
 * Supabase Database Layer
 * All data is stored in Supabase PostgreSQL cloud database.
 * Enables data sharing across all computers and works on Vercel.
 */

const SUPABASE_URL = 'https://npqbtnsgeakivadhoxxg.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5wcWJ0bnNnZWFraXZhZGhveHhnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI3ODI2MzEsImV4cCI6MjA4ODM1ODYzMX0.EGuKvpNtliyFH5uURc0v50A4SC6kkYdttP0_5jVU0Eg';

class Database {
  constructor() {
    this.supabase = null;
  }

  async init() {
    this.supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
  }

  // --- Helper: convert DB row keys (snake_case) to JS keys (camelCase) ---
  _toJS(row) {
    if (!row) return null;
    const obj = { ...row };
    if ('material_id' in obj) { obj.materialId = obj.material_id; delete obj.material_id; }
    if ('min_stock' in obj) { obj.minStock = obj.min_stock; delete obj.min_stock; }
    if ('created_at' in obj) { obj.createdAt = obj.created_at; delete obj.created_at; }
    if ('updated_at' in obj) { obj.updatedAt = obj.updated_at; delete obj.updated_at; }
    if ('requisition_id' in obj) { obj.requisitionId = obj.requisition_id; delete obj.requisition_id; }
    if ('entity_id' in obj) { obj.entityId = obj.entity_id; delete obj.entity_id; }
    return obj;
  }

  // Convert JS keys (camelCase) to DB keys (snake_case)
  _toDB(obj) {
    if (!obj) return null;
    const row = { ...obj };
    if ('materialId' in row) { row.material_id = row.materialId; delete row.materialId; }
    if ('minStock' in row) { row.min_stock = row.minStock; delete row.minStock; }
    if ('createdAt' in row) { row.created_at = row.createdAt; delete row.createdAt; }
    if ('updatedAt' in row) { row.updated_at = row.updatedAt; delete row.updatedAt; }
    if ('requisitionId' in row) { row.requisition_id = row.requisitionId; delete row.requisitionId; }
    if ('entityId' in row) { row.entity_id = row.entityId; delete row.entityId; }
    return row;
  }

  _toJSArray(rows) {
    return (rows || []).map(r => this._toJS(r));
  }

  // --- Material-specific methods ---

  async addMaterial(material) {
    const row = {
      name: material.name,
      code: material.code,
      category: material.category || '',
      unit: material.unit || 'un',
      min_stock: material.minStock || 0,
      location: material.location || '',
      notes: material.notes || '',
      status: material.status || 'ativo'
    };
    const { data, error } = await this.supabase.from('materials').insert(row).select().single();
    if (error) throw new Error(error.message);
    const id = data.id;
    this.addAuditLog('CREATE', 'material', id, `Material "${material.name}" criado`);
    return id;
  }

  async updateMaterial(material) {
    const row = {
      name: material.name,
      code: material.code,
      category: material.category || '',
      unit: material.unit || 'un',
      min_stock: material.minStock || 0,
      location: material.location || '',
      notes: material.notes || '',
      status: material.status || 'ativo',
      updated_at: new Date().toISOString()
    };
    const { error } = await this.supabase.from('materials').update(row).eq('id', material.id);
    if (error) throw new Error(error.message);
    this.addAuditLog('UPDATE', 'material', material.id, `Material "${material.name}" atualizado`);
  }

  async toggleMaterialStatus(id) {
    const material = await this._getMaterial(id);
    const newStatus = material.status === 'ativo' ? 'inativo' : 'ativo';
    const { error } = await this.supabase.from('materials').update({ status: newStatus, updated_at: new Date().toISOString() }).eq('id', id);
    if (error) throw new Error(error.message);
    material.status = newStatus;
    this.addAuditLog('STATUS', 'material', id, `Material "${material.name}" alterado para ${newStatus}`);
    return this._toJS(material);
  }

  async _getMaterial(id) {
    const { data, error } = await this.supabase.from('materials').select('*').eq('id', id).single();
    if (error) throw new Error(error.message);
    return data;
  }

  async getMaterial(id) {
    const row = await this._getMaterial(id);
    return this._toJS(row);
  }

  async getActiveMaterials() {
    const { data, error } = await this.supabase.from('materials').select('*').eq('status', 'ativo').order('name');
    if (error) throw new Error(error.message);
    return this._toJSArray(data);
  }

  async deleteMaterial(id) {
    const material = await this._getMaterial(id);
    if (!material) throw new Error('Material não encontrado');
    // movements are deleted by CASCADE
    const { error } = await this.supabase.from('materials').delete().eq('id', id);
    if (error) throw new Error(error.message);
    this.addAuditLog('DELETE', 'material', id, `Material "${material.name}" (${material.code}) excluído`);
    return this._toJS(material);
  }

  async searchMaterials(query = '', category = '', status = '') {
    let q = this.supabase.from('materials').select('*');
    if (status) q = q.eq('status', status);
    if (category) q = q.eq('category', category);
    const { data, error } = await q.order('name');
    if (error) throw new Error(error.message);
    let results = this._toJSArray(data);
    if (query) {
      const lower = query.toLowerCase();
      results = results.filter(m =>
        m.name.toLowerCase().includes(lower) ||
        m.code.toLowerCase().includes(lower)
      );
    }
    return results;
  }

  async getCategories() {
    const { data, error } = await this.supabase.from('materials').select('category').neq('category', '');
    if (error) throw new Error(error.message);
    const cats = [...new Set(data.map(d => d.category).filter(Boolean))];
    return cats.sort();
  }

  // --- Stock movement methods ---

  async getStockBalance(materialId) {
    const { data, error } = await this.supabase.from('movements').select('type, quantity').eq('material_id', materialId);
    if (error) throw new Error(error.message);
    let balance = 0;
    for (const m of data) {
      if (m.type === 'entrada') balance += Number(m.quantity);
      else if (m.type === 'saida') balance -= Number(m.quantity);
    }
    return balance;
  }

  async getAllBalances() {
    const { data: materials, error } = await this.supabase.from('materials').select('*');
    if (error) throw new Error(error.message);
    const { data: movements, error: err2 } = await this.supabase.from('movements').select('material_id, type, quantity');
    if (err2) throw new Error(err2.message);

    // Pre-compute balances
    const balanceMap = {};
    for (const m of movements) {
      if (!balanceMap[m.material_id]) balanceMap[m.material_id] = 0;
      if (m.type === 'entrada') balanceMap[m.material_id] += Number(m.quantity);
      else if (m.type === 'saida') balanceMap[m.material_id] -= Number(m.quantity);
    }

    return materials.map(mat => {
      const jsMat = this._toJS(mat);
      const balance = balanceMap[mat.id] || 0;
      return {
        ...jsMat,
        balance,
        belowMin: balance < (jsMat.minStock || 0)
      };
    });
  }

  async addStockEntry(materialId, quantity, notes = '') {
    const row = {
      material_id: materialId,
      type: 'entrada',
      quantity: Number(quantity),
      notes
    };
    const { data, error } = await this.supabase.from('movements').insert(row).select().single();
    if (error) throw new Error(error.message);
    const material = await this._getMaterial(materialId);
    this.addAuditLog('STOCK_ENTRY', 'movement', data.id,
      `Entrada de ${quantity} ${material?.unit || 'un'} - ${material?.name || 'ID:' + materialId}`);
    return data.id;
  }

  async addStockExit(materialId, quantity, notes = '') {
    const balance = await this.getStockBalance(materialId);
    if (balance < quantity) {
      throw new Error(`Saldo insuficiente. Disponível: ${balance}`);
    }
    const row = {
      material_id: materialId,
      type: 'saida',
      quantity: Number(quantity),
      notes
    };
    const { data, error } = await this.supabase.from('movements').insert(row).select().single();
    if (error) throw new Error(error.message);
    const material = await this._getMaterial(materialId);
    this.addAuditLog('STOCK_EXIT', 'movement', data.id,
      `Saída de ${quantity} ${material?.unit || 'un'} - ${material?.name || 'ID:' + materialId}`);
    return data.id;
  }

  async getRecentMovements(limit = 10) {
    const { data, error } = await this.supabase
      .from('movements')
      .select('*, materials(name, code, unit)')
      .order('created_at', { ascending: false })
      .limit(limit);
    if (error) throw new Error(error.message);
    return data.map(mov => ({
      ...this._toJS(mov),
      materialName: mov.materials?.name || 'Material removido',
      materialCode: mov.materials?.code || '-',
      materialUnit: mov.materials?.unit || 'un',
      materials: undefined
    }));
  }

  async getMovementsByMaterial(materialId) {
    const { data, error } = await this.supabase
      .from('movements')
      .select('*')
      .eq('material_id', materialId)
      .order('created_at', { ascending: false });
    if (error) throw new Error(error.message);
    return this._toJSArray(data);
  }

  async getBelowMinimum() {
    const balances = await this.getAllBalances();
    return balances.filter(b => b.status === 'ativo' && b.belowMin);
  }

  // --- Requisition methods ---

  async getNextRequisitionNumber() {
    const { data, error } = await this.supabase.from('requisitions').select('number').order('id', { ascending: false }).limit(1);
    if (error) throw new Error(error.message);
    if (!data || data.length === 0) return 'REQ-0001';
    const match = data[0].number.match(/REQ-(\d+)/);
    const num = match ? parseInt(match[1]) + 1 : 1;
    return `REQ-${String(num).padStart(4, '0')}`;
  }

  async createRequisition(destination, notes, items) {
    const number = await this.getNextRequisitionNumber();

    // Validate stock for all items
    for (const item of items) {
      const balance = await this.getStockBalance(item.materialId);
      const material = await this._getMaterial(item.materialId);
      if (balance < item.quantity) {
        throw new Error(`Saldo insuficiente para "${material?.name}". Disponível: ${balance}`);
      }
    }

    const { data: req, error } = await this.supabase.from('requisitions').insert({
      number,
      destination,
      notes,
      status: 'pendente'
    }).select().single();
    if (error) throw new Error(error.message);

    const reqItems = items.map(item => ({
      requisition_id: req.id,
      material_id: item.materialId,
      quantity: Number(item.quantity)
    }));
    const { error: err2 } = await this.supabase.from('requisition_items').insert(reqItems);
    if (err2) throw new Error(err2.message);

    this.addAuditLog('CREATE', 'requisition', req.id,
      `Requisição ${number} criada para "${destination}" com ${items.length} itens`);

    return req.id;
  }

  async updateRequisitionStatus(reqId, newStatus) {
    const { data: req, error: err1 } = await this.supabase.from('requisitions').select('*').eq('id', reqId).single();
    if (err1) throw new Error('Requisição não encontrada');

    if (newStatus === 'entregue' && req.status !== 'entregue') {
      const { data: items } = await this.supabase.from('requisition_items').select('*').eq('requisition_id', reqId);
      for (const item of items) {
        await this.addStockExit(item.material_id, item.quantity, `Req. ${req.number} - entrega`);
      }
    }

    const { error } = await this.supabase.from('requisitions').update({
      status: newStatus,
      updated_at: new Date().toISOString()
    }).eq('id', reqId);
    if (error) throw new Error(error.message);

    this.addAuditLog('STATUS', 'requisition', reqId,
      `Requisição ${req.number} alterada para "${newStatus}"`);
  }

  async deleteRequisition(reqId) {
    const { data: req, error: err1 } = await this.supabase.from('requisitions').select('*').eq('id', reqId).single();
    if (err1) throw new Error('Requisição não encontrada');
    // requisition_items are deleted by CASCADE
    const { error } = await this.supabase.from('requisitions').delete().eq('id', reqId);
    if (error) throw new Error(error.message);
    this.addAuditLog('DELETE', 'requisition', reqId, `Requisição "${req.number}" excluída`);
    return this._toJS(req);
  }

  async getRequisitionWithItems(reqId) {
    const { data: req, error } = await this.supabase.from('requisitions').select('*').eq('id', reqId).single();
    if (error || !req) return null;

    const { data: rawItems } = await this.supabase
      .from('requisition_items')
      .select('*, materials(name, code, unit)')
      .eq('requisition_id', reqId);

    const items = (rawItems || []).map(ri => ({
      ...this._toJS(ri),
      materialName: ri.materials?.name || 'Material removido',
      materialCode: ri.materials?.code || '-',
      materialUnit: ri.materials?.unit || 'un',
      materials: undefined
    }));

    return { ...this._toJS(req), items };
  }

  async getRecentRequisitions(limit = 10) {
    const { data, error } = await this.supabase
      .from('requisitions')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(limit);
    if (error) throw new Error(error.message);
    return this._toJSArray(data);
  }

  // --- Dashboard data (optimized with parallel queries) ---

  async getDashboardData() {
    // Run all independent queries in parallel
    const [materialsRes, movementsRes, balances, recentMovements, recentRequisitions, allReqsRes, allItemsRes] = await Promise.all([
      this.supabase.from('materials').select('*'),
      this.supabase.from('movements').select('material_id, type, quantity'),
      this.getAllBalances(),
      this.getRecentMovements(8),
      this.getRecentRequisitions(5),
      this.supabase.from('requisitions').select('*'),
      this.supabase.from('requisition_items').select('requisition_id, quantity')
    ]);

    const materials = materialsRes.data || [];
    const activeCount = materials.filter(m => m.status === 'ativo').length;
    const belowMin = balances.filter(b => b.status === 'ativo' && b.belowMin);

    // Stock by category
    const categoryMap = {};
    for (const b of balances) {
      if (b.status !== 'ativo') continue;
      const cat = b.category || 'Sem categoria';
      if (!categoryMap[cat]) categoryMap[cat] = 0;
      categoryMap[cat] += b.balance;
    }

    // Consumption by destination (single query, no N+1)
    const allReqs = allReqsRes.data || [];
    const allItems = allItemsRes.data || [];
    const deliveredReqs = allReqs.filter(r => r.status === 'entregue');
    const deliveredIds = new Set(deliveredReqs.map(r => r.id));
    const destMap = {};

    // Pre-group items by requisition_id
    const itemsByReq = {};
    for (const it of allItems) {
      if (!deliveredIds.has(it.requisition_id)) continue;
      if (!itemsByReq[it.requisition_id]) itemsByReq[it.requisition_id] = 0;
      itemsByReq[it.requisition_id] += Number(it.quantity);
    }
    for (const req of deliveredReqs) {
      const dest = req.destination || 'Sem destino';
      if (!destMap[dest]) destMap[dest] = 0;
      destMap[dest] += itemsByReq[req.id] || 0;
    }

    const totalItems = balances
      .filter(b => b.status === 'ativo')
      .reduce((sum, b) => sum + b.balance, 0);

    const pendingReqs = allReqs.filter(r => r.status === 'pendente').length;

    return {
      totalMaterials: activeCount,
      totalItems,
      belowMinCount: belowMin.length,
      pendingReqs,
      belowMin,
      recentMovements,
      recentRequisitions,
      stockByCategory: categoryMap,
      consumptionByDest: destMap
    };
  }

  // --- Audit log (fire-and-forget for performance) ---

  addAuditLog(action, entity, entityId, details) {
    // Fire-and-forget: don't await, don't block the caller
    this.supabase.from('audit_log').insert({
      action,
      entity,
      entity_id: entityId,
      details
    }).then(({ error }) => {
      if (error) console.warn('Audit log error:', error.message);
    });
  }

  async getAuditLog(limit = 50) {
    const { data, error } = await this.supabase
      .from('audit_log')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(limit);
    if (error) throw new Error(error.message);
    return this._toJSArray(data);
  }

  // --- Category methods ---

  async addCategory(name) {
    const trimmed = name.trim();
    if (!trimmed) throw new Error('Nome da categoria é obrigatório');
    const { data, error } = await this.supabase.from('categories').insert({ name: trimmed }).select().single();
    if (error) throw new Error(error.message);
    this.addAuditLog('CREATE', 'category', data.id, `Categoria "${trimmed}" criada`);
    return data.id;
  }

  async updateCategory(id, name) {
    const trimmed = name.trim();
    if (!trimmed) throw new Error('Nome da categoria é obrigatório');
    const { error } = await this.supabase.from('categories').update({ name: trimmed, updated_at: new Date().toISOString() }).eq('id', id);
    if (error) throw new Error(error.message);
    this.addAuditLog('UPDATE', 'category', id, `Categoria atualizada para "${trimmed}"`);
  }

  async deleteCategory(id) {
    const { data: cat } = await this.supabase.from('categories').select('name').eq('id', id).single();
    const { error } = await this.supabase.from('categories').delete().eq('id', id);
    if (error) throw new Error(error.message);
    this.addAuditLog('DELETE', 'category', id, `Categoria "${cat?.name}" removida`);
  }

  async getAllCategories() {
    const { data, error } = await this.supabase.from('categories').select('*').order('name');
    if (error) throw new Error(error.message);
    return this._toJSArray(data);
  }

  async getCategoryNames() {
    const cats = await this.getAllCategories();
    return cats.map(c => c.name);
  }

  // --- Unit methods ---

  async addUnit(name, abbreviation = '') {
    const trimmed = name.trim();
    if (!trimmed) throw new Error('Nome da unidade é obrigatório');
    const { data, error } = await this.supabase.from('units').insert({
      name: trimmed,
      abbreviation: abbreviation.trim()
    }).select().single();
    if (error) throw new Error(error.message);
    this.addAuditLog('CREATE', 'unit', data.id, `Unidade "${trimmed}" criada`);
    return data.id;
  }

  async updateUnit(id, name, abbreviation = '') {
    const trimmed = name.trim();
    if (!trimmed) throw new Error('Nome da unidade é obrigatório');
    const { error } = await this.supabase.from('units').update({
      name: trimmed,
      abbreviation: abbreviation.trim(),
      updated_at: new Date().toISOString()
    }).eq('id', id);
    if (error) throw new Error(error.message);
    this.addAuditLog('UPDATE', 'unit', id, `Unidade atualizada para "${trimmed}"`);
  }

  async deleteUnit(id) {
    const { data: unit } = await this.supabase.from('units').select('name').eq('id', id).single();
    const { error } = await this.supabase.from('units').delete().eq('id', id);
    if (error) throw new Error(error.message);
    this.addAuditLog('DELETE', 'unit', id, `Unidade "${unit?.name}" removida`);
  }

  async getAllUnits() {
    const { data, error } = await this.supabase.from('units').select('*').order('name');
    if (error) throw new Error(error.message);
    return this._toJSArray(data);
  }

  async getUnitNames() {
    const units = await this.getAllUnits();
    return units.map(u => u.name);
  }

  // --- Seed defaults (no-op, already done via SQL) ---
  async seedDefaults() {
    // Categories and units are seeded via SQL setup.
    // This method is kept for compatibility.
  }
}

// Global instance
const db = new Database();
