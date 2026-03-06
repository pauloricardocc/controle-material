-- =============================================
-- SQL para criar as tabelas no Supabase
-- Execute este SQL no SQL Editor do Supabase
-- =============================================

-- Tabela de Materiais
CREATE TABLE IF NOT EXISTS materials (
  id BIGSERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  code TEXT UNIQUE NOT NULL,
  category TEXT DEFAULT '',
  unit TEXT DEFAULT 'un',
  min_stock NUMERIC DEFAULT 0,
  location TEXT DEFAULT '',
  notes TEXT DEFAULT '',
  status TEXT DEFAULT 'ativo',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Tabela de Movimentações de Estoque
CREATE TABLE IF NOT EXISTS movements (
  id BIGSERIAL PRIMARY KEY,
  material_id BIGINT REFERENCES materials(id) ON DELETE CASCADE,
  type TEXT NOT NULL,
  quantity NUMERIC NOT NULL,
  notes TEXT DEFAULT '',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Tabela de Requisições
CREATE TABLE IF NOT EXISTS requisitions (
  id BIGSERIAL PRIMARY KEY,
  number TEXT UNIQUE NOT NULL,
  destination TEXT DEFAULT '',
  notes TEXT DEFAULT '',
  status TEXT DEFAULT 'pendente',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Tabela de Itens de Requisição
CREATE TABLE IF NOT EXISTS requisition_items (
  id BIGSERIAL PRIMARY KEY,
  requisition_id BIGINT REFERENCES requisitions(id) ON DELETE CASCADE,
  material_id BIGINT REFERENCES materials(id) ON DELETE CASCADE,
  quantity NUMERIC NOT NULL
);

-- Tabela de Log de Auditoria
CREATE TABLE IF NOT EXISTS audit_log (
  id BIGSERIAL PRIMARY KEY,
  action TEXT NOT NULL,
  entity TEXT NOT NULL,
  entity_id BIGINT,
  details TEXT DEFAULT '',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Tabela de Categorias
CREATE TABLE IF NOT EXISTS categories (
  id BIGSERIAL PRIMARY KEY,
  name TEXT UNIQUE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ
);

-- Tabela de Unidades de Medida
CREATE TABLE IF NOT EXISTS units (
  id BIGSERIAL PRIMARY KEY,
  name TEXT UNIQUE NOT NULL,
  abbreviation TEXT DEFAULT '',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ
);

-- =============================================
-- Desabilitar RLS (Row Level Security) para acesso público
-- =============================================
ALTER TABLE materials ENABLE ROW LEVEL SECURITY;
ALTER TABLE movements ENABLE ROW LEVEL SECURITY;
ALTER TABLE requisitions ENABLE ROW LEVEL SECURITY;
ALTER TABLE requisition_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE units ENABLE ROW LEVEL SECURITY;

-- Políticas de acesso público (anon key)
CREATE POLICY "Allow all on materials" ON materials FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all on movements" ON movements FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all on requisitions" ON requisitions FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all on requisition_items" ON requisition_items FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all on audit_log" ON audit_log FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all on categories" ON categories FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all on units" ON units FOR ALL USING (true) WITH CHECK (true);

-- =============================================
-- Inserir categorias padrão
-- =============================================
INSERT INTO categories (name) VALUES
  ('Acabamento'), ('Cimento e Argamassa'), ('Diversos'), ('EPI'),
  ('Elétrica'), ('Ferragens'), ('Ferramentas'), ('Hidráulica'),
  ('Impermeabilização'), ('Madeira'), ('Pintura'), ('Tubulação')
ON CONFLICT (name) DO NOTHING;

-- =============================================
-- Inserir unidades padrão
-- =============================================
INSERT INTO units (name) VALUES
  ('Unidade'), ('Peça'), ('Metro'), ('Metro²'), ('Metro³'),
  ('Litro'), ('Kg'), ('Tonelada'), ('Caixa'), ('Pacote'),
  ('Rolo'), ('Saco'), ('Barra'), ('Galão'), ('Lata'),
  ('Balde'), ('Tubo'), ('Folha'), ('Par'), ('Conjunto')
ON CONFLICT (name) DO NOTHING;
