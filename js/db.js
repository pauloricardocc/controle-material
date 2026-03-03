/**
 * IndexedDB Database Layer
 * Handles all data persistence for the Material Control System.
 */

const DB_NAME = 'MaterialControlDB';
const DB_VERSION = 2;

class Database {
  constructor() {
    this.db = null;
  }

  async init() {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onupgradeneeded = (event) => {
        const db = event.target.result;

        // Materials store
        if (!db.objectStoreNames.contains('materials')) {
          const matStore = db.createObjectStore('materials', { keyPath: 'id', autoIncrement: true });
          matStore.createIndex('name', 'name', { unique: false });
          matStore.createIndex('code', 'code', { unique: true });
          matStore.createIndex('category', 'category', { unique: false });
          matStore.createIndex('status', 'status', { unique: false });
        }

        // Stock movements store
        if (!db.objectStoreNames.contains('movements')) {
          const movStore = db.createObjectStore('movements', { keyPath: 'id', autoIncrement: true });
          movStore.createIndex('materialId', 'materialId', { unique: false });
          movStore.createIndex('type', 'type', { unique: false });
          movStore.createIndex('createdAt', 'createdAt', { unique: false });
        }

        // Requisitions store
        if (!db.objectStoreNames.contains('requisitions')) {
          const reqStore = db.createObjectStore('requisitions', { keyPath: 'id', autoIncrement: true });
          reqStore.createIndex('status', 'status', { unique: false });
          reqStore.createIndex('createdAt', 'createdAt', { unique: false });
          reqStore.createIndex('number', 'number', { unique: true });
        }

        // Requisition items store
        if (!db.objectStoreNames.contains('requisitionItems')) {
          const riStore = db.createObjectStore('requisitionItems', { keyPath: 'id', autoIncrement: true });
          riStore.createIndex('requisitionId', 'requisitionId', { unique: false });
          riStore.createIndex('materialId', 'materialId', { unique: false });
        }

        // Audit log store
        if (!db.objectStoreNames.contains('auditLog')) {
          const logStore = db.createObjectStore('auditLog', { keyPath: 'id', autoIncrement: true });
          logStore.createIndex('entity', 'entity', { unique: false });
          logStore.createIndex('createdAt', 'createdAt', { unique: false });
        }

        // Categories store (v2)
        if (!db.objectStoreNames.contains('categories')) {
          const catStore = db.createObjectStore('categories', { keyPath: 'id', autoIncrement: true });
          catStore.createIndex('name', 'name', { unique: true });
        }

        // Units store (v2)
        if (!db.objectStoreNames.contains('units')) {
          const unitStore = db.createObjectStore('units', { keyPath: 'id', autoIncrement: true });
          unitStore.createIndex('name', 'name', { unique: true });
        }
      };

      request.onsuccess = (event) => {
        this.db = event.target.result;
        resolve(this.db);
      };

      request.onerror = (event) => {
        reject('Erro ao abrir banco de dados: ' + event.target.error);
      };
    });
  }

  // Generic CRUD helpers
  _transaction(storeName, mode = 'readonly') {
    const tx = this.db.transaction(storeName, mode);
    return tx.objectStore(storeName);
  }

  _promisify(request) {
    return new Promise((resolve, reject) => {
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  async add(storeName, data) {
    const store = this._transaction(storeName, 'readwrite');
    return this._promisify(store.add(data));
  }

  async put(storeName, data) {
    const store = this._transaction(storeName, 'readwrite');
    return this._promisify(store.put(data));
  }

  async get(storeName, id) {
    const store = this._transaction(storeName, 'readonly');
    return this._promisify(store.get(id));
  }

  async getAll(storeName) {
    const store = this._transaction(storeName, 'readonly');
    return this._promisify(store.getAll());
  }

  async delete(storeName, id) {
    const store = this._transaction(storeName, 'readwrite');
    return this._promisify(store.delete(id));
  }

  async getAllByIndex(storeName, indexName, value) {
    const store = this._transaction(storeName, 'readonly');
    const index = store.index(indexName);
    return this._promisify(index.getAll(value));
  }

  async count(storeName) {
    const store = this._transaction(storeName, 'readonly');
    return this._promisify(store.count());
  }

  // --- Material-specific methods ---

  async addMaterial(material) {
    material.createdAt = new Date().toISOString();
    material.updatedAt = new Date().toISOString();
    material.status = material.status || 'ativo';
    const id = await this.add('materials', material);
    await this.addAuditLog('CREATE', 'material', id, `Material "${material.name}" criado`);
    return id;
  }

  async updateMaterial(material) {
    material.updatedAt = new Date().toISOString();
    await this.put('materials', material);
    await this.addAuditLog('UPDATE', 'material', material.id, `Material "${material.name}" atualizado`);
  }

  async toggleMaterialStatus(id) {
    const material = await this.get('materials', id);
    material.status = material.status === 'ativo' ? 'inativo' : 'ativo';
    material.updatedAt = new Date().toISOString();
    await this.put('materials', material);
    await this.addAuditLog('STATUS', 'material', id, `Material "${material.name}" alterado para ${material.status}`);
    return material;
  }

  async searchMaterials(query = '', category = '', status = '') {
    const all = await this.getAll('materials');
    return all.filter(m => {
      const matchQuery = !query ||
        m.name.toLowerCase().includes(query.toLowerCase()) ||
        m.code.toLowerCase().includes(query.toLowerCase());
      const matchCategory = !category || m.category === category;
      const matchStatus = !status || m.status === status;
      return matchQuery && matchCategory && matchStatus;
    });
  }

  async getCategories() {
    const all = await this.getAll('materials');
    const cats = [...new Set(all.map(m => m.category).filter(Boolean))];
    return cats.sort();
  }

  // --- Stock movement methods ---

  async getStockBalance(materialId) {
    const movements = await this.getAllByIndex('movements', 'materialId', materialId);
    let balance = 0;
    for (const m of movements) {
      if (m.type === 'entrada') balance += m.quantity;
      else if (m.type === 'saida') balance -= m.quantity;
    }
    return balance;
  }

  async getAllBalances() {
    const materials = await this.getAll('materials');
    const result = [];
    for (const mat of materials) {
      const balance = await this.getStockBalance(mat.id);
      result.push({
        ...mat,
        balance,
        belowMin: balance < (mat.minStock || 0)
      });
    }
    return result;
  }

  async addStockEntry(materialId, quantity, notes = '') {
    const movement = {
      materialId,
      type: 'entrada',
      quantity: Number(quantity),
      notes,
      createdAt: new Date().toISOString()
    };
    const id = await this.add('movements', movement);
    const material = await this.get('materials', materialId);
    await this.addAuditLog('STOCK_ENTRY', 'movement', id,
      `Entrada de ${quantity} ${material?.unit || 'un'} - ${material?.name || 'ID:' + materialId}`);
    return id;
  }

  async addStockExit(materialId, quantity, notes = '') {
    const balance = await this.getStockBalance(materialId);
    if (balance < quantity) {
      throw new Error(`Saldo insuficiente. Disponível: ${balance}`);
    }
    const movement = {
      materialId,
      type: 'saida',
      quantity: Number(quantity),
      notes,
      createdAt: new Date().toISOString()
    };
    const id = await this.add('movements', movement);
    const material = await this.get('materials', materialId);
    await this.addAuditLog('STOCK_EXIT', 'movement', id,
      `Saída de ${quantity} ${material?.unit || 'un'} - ${material?.name || 'ID:' + materialId}`);
    return id;
  }

  async getRecentMovements(limit = 10) {
    const all = await this.getAll('movements');
    all.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    const result = [];
    for (const mov of all.slice(0, limit)) {
      const material = await this.get('materials', mov.materialId);
      result.push({
        ...mov,
        materialName: material?.name || 'Material removido',
        materialCode: material?.code || '-',
        materialUnit: material?.unit || 'un'
      });
    }
    return result;
  }

  async getMovementsByMaterial(materialId) {
    const movements = await this.getAllByIndex('movements', 'materialId', materialId);
    movements.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    return movements;
  }

  async getBelowMinimum() {
    const balances = await this.getAllBalances();
    return balances.filter(b => b.status === 'ativo' && b.belowMin);
  }

  // --- Requisition methods ---

  async getNextRequisitionNumber() {
    const all = await this.getAll('requisitions');
    if (all.length === 0) return 'REQ-0001';
    const numbers = all.map(r => {
      const match = r.number.match(/REQ-(\d+)/);
      return match ? parseInt(match[1]) : 0;
    });
    const max = Math.max(...numbers);
    return `REQ-${String(max + 1).padStart(4, '0')}`;
  }

  async createRequisition(destination, notes, items) {
    const number = await this.getNextRequisitionNumber();

    // Validate stock for all items
    for (const item of items) {
      const balance = await this.getStockBalance(item.materialId);
      const material = await this.get('materials', item.materialId);
      if (balance < item.quantity) {
        throw new Error(`Saldo insuficiente para "${material?.name}". Disponível: ${balance}`);
      }
    }

    const requisition = {
      number,
      destination,
      notes,
      status: 'pendente',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    const reqId = await this.add('requisitions', requisition);

    for (const item of items) {
      await this.add('requisitionItems', {
        requisitionId: reqId,
        materialId: item.materialId,
        quantity: Number(item.quantity)
      });
    }

    await this.addAuditLog('CREATE', 'requisition', reqId,
      `Requisição ${number} criada para "${destination}" com ${items.length} itens`);

    return reqId;
  }

  async updateRequisitionStatus(reqId, newStatus) {
    const req = await this.get('requisitions', reqId);
    if (!req) throw new Error('Requisição não encontrada');

    if (newStatus === 'entregue' && req.status !== 'entregue') {
      // Deduct stock
      const items = await this.getAllByIndex('requisitionItems', 'requisitionId', reqId);
      for (const item of items) {
        await this.addStockExit(item.materialId, item.quantity, `Req. ${req.number} - entrega`);
      }
    }

    req.status = newStatus;
    req.updatedAt = new Date().toISOString();
    await this.put('requisitions', req);

    await this.addAuditLog('STATUS', 'requisition', reqId,
      `Requisição ${req.number} alterada para "${newStatus}"`);
  }

  async getRequisitionWithItems(reqId) {
    const req = await this.get('requisitions', reqId);
    if (!req) return null;

    const rawItems = await this.getAllByIndex('requisitionItems', 'requisitionId', reqId);
    const items = [];
    for (const ri of rawItems) {
      const material = await this.get('materials', ri.materialId);
      items.push({
        ...ri,
        materialName: material?.name || 'Material removido',
        materialCode: material?.code || '-',
        materialUnit: material?.unit || 'un'
      });
    }

    return { ...req, items };
  }

  async getRecentRequisitions(limit = 10) {
    const all = await this.getAll('requisitions');
    all.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    return all.slice(0, limit);
  }

  // --- Dashboard data ---

  async getDashboardData() {
    const materials = await this.getAll('materials');
    const activeCount = materials.filter(m => m.status === 'ativo').length;
    const balances = await this.getAllBalances();
    const belowMin = balances.filter(b => b.status === 'ativo' && b.belowMin);
    const movements = await this.getRecentMovements(8);
    const requisitions = await this.getRecentRequisitions(5);

    // Stock by category
    const categoryMap = {};
    for (const b of balances) {
      if (b.status !== 'ativo') continue;
      const cat = b.category || 'Sem categoria';
      if (!categoryMap[cat]) categoryMap[cat] = 0;
      categoryMap[cat] += b.balance;
    }

    // Consumption by destination
    const allReqs = await this.getAll('requisitions');
    const deliveredReqs = allReqs.filter(r => r.status === 'entregue');
    const destMap = {};
    for (const req of deliveredReqs) {
      const items = await this.getAllByIndex('requisitionItems', 'requisitionId', req.id);
      let totalQty = 0;
      for (const it of items) totalQty += it.quantity;
      const dest = req.destination || 'Sem destino';
      if (!destMap[dest]) destMap[dest] = 0;
      destMap[dest] += totalQty;
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
      recentMovements: movements,
      recentRequisitions: requisitions,
      stockByCategory: categoryMap,
      consumptionByDest: destMap
    };
  }

  // --- Audit log ---

  async addAuditLog(action, entity, entityId, details) {
    return this.add('auditLog', {
      action,
      entity,
      entityId,
      details,
      createdAt: new Date().toISOString()
    });
  }

  async getAuditLog(limit = 50) {
    const all = await this.getAll('auditLog');
    all.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    return all.slice(0, limit);
  }

  // --- Category methods ---

  async addCategory(name) {
    const trimmed = name.trim();
    if (!trimmed) throw new Error('Nome da categoria é obrigatório');
    const id = await this.add('categories', { name: trimmed, createdAt: new Date().toISOString() });
    await this.addAuditLog('CREATE', 'category', id, `Categoria "${trimmed}" criada`);
    return id;
  }

  async updateCategory(id, name) {
    const trimmed = name.trim();
    if (!trimmed) throw new Error('Nome da categoria é obrigatório');
    const cat = await this.get('categories', id);
    if (!cat) throw new Error('Categoria não encontrada');
    cat.name = trimmed;
    cat.updatedAt = new Date().toISOString();
    await this.put('categories', cat);
    await this.addAuditLog('UPDATE', 'category', id, `Categoria atualizada para "${trimmed}"`);
  }

  async deleteCategory(id) {
    const cat = await this.get('categories', id);
    await this.delete('categories', id);
    await this.addAuditLog('DELETE', 'category', id, `Categoria "${cat?.name}" removida`);
  }

  async getAllCategories() {
    const dbCats = await this.getAll('categories');
    return dbCats.sort((a, b) => a.name.localeCompare(b.name));
  }

  async getCategoryNames() {
    const cats = await this.getAllCategories();
    return cats.map(c => c.name);
  }

  // --- Unit methods ---

  async addUnit(name, abbreviation = '') {
    const trimmed = name.trim();
    if (!trimmed) throw new Error('Nome da unidade é obrigatório');
    const data = { name: trimmed, abbreviation: abbreviation.trim(), createdAt: new Date().toISOString() };
    const id = await this.add('units', data);
    await this.addAuditLog('CREATE', 'unit', id, `Unidade "${trimmed}" criada`);
    return id;
  }

  async updateUnit(id, name, abbreviation = '') {
    const trimmed = name.trim();
    if (!trimmed) throw new Error('Nome da unidade é obrigatório');
    const unit = await this.get('units', id);
    if (!unit) throw new Error('Unidade não encontrada');
    unit.name = trimmed;
    unit.abbreviation = abbreviation.trim();
    unit.updatedAt = new Date().toISOString();
    await this.put('units', unit);
    await this.addAuditLog('UPDATE', 'unit', id, `Unidade atualizada para "${trimmed}"`);
  }

  async deleteUnit(id) {
    const unit = await this.get('units', id);
    await this.delete('units', id);
    await this.addAuditLog('DELETE', 'unit', id, `Unidade "${unit?.name}" removida`);
  }

  async getAllUnits() {
    const dbUnits = await this.getAll('units');
    return dbUnits.sort((a, b) => a.name.localeCompare(b.name));
  }

  async getUnitNames() {
    const units = await this.getAllUnits();
    return units.map(u => u.name);
  }

  // --- Seed defaults (run once) ---

  async seedDefaults() {
    const cats = await this.getAll('categories');
    const units = await this.getAll('units');

    if (cats.length === 0) {
      const defaults = ['Elétrica', 'Hidráulica', 'Pintura', 'Ferragens', 'Cimento e Argamassa', 'Madeira', 'Ferramentas', 'EPI', 'Acabamento', 'Tubulação', 'Impermeabilização', 'Diversos'];
      for (const name of defaults) {
        await this.add('categories', { name, createdAt: new Date().toISOString() });
      }
    }

    if (units.length === 0) {
      const defaults = ['Unidade', 'Peça', 'Metro', 'Metro²', 'Metro³', 'Litro', 'Kg', 'Tonelada', 'Caixa', 'Pacote', 'Rolo', 'Saco', 'Barra', 'Galão', 'Lata', 'Balde', 'Tubo', 'Folha', 'Par', 'Conjunto'];
      for (const name of defaults) {
        await this.add('units', { name, createdAt: new Date().toISOString() });
      }
    }
  }
}

// Global instance
const db = new Database();
