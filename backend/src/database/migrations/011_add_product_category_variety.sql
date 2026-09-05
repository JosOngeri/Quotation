-- 011_add_product_category_variety.sql
-- Nested product categories and varieties for the product catalog.

CREATE TABLE IF NOT EXISTS product_category (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  workspace_id UUID NOT NULL REFERENCES workspace(id) ON DELETE CASCADE,
  parent_id UUID REFERENCES product_category(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS product_variety (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  workspace_id UUID NOT NULL REFERENCES workspace(id) ON DELETE CASCADE,
  category_id UUID NOT NULL REFERENCES product_category(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  attributes JSONB,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

ALTER TABLE product
  ADD COLUMN IF NOT EXISTS category_id UUID REFERENCES product_category(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS variety_id UUID REFERENCES product_variety(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_product_category_workspace ON product_category(workspace_id);
CREATE INDEX IF NOT EXISTS idx_product_category_parent ON product_category(parent_id);
CREATE INDEX IF NOT EXISTS idx_product_variety_workspace ON product_variety(workspace_id);
CREATE INDEX IF NOT EXISTS idx_product_variety_category ON product_variety(category_id);
CREATE INDEX IF NOT EXISTS idx_product_category_id ON product(category_id);
CREATE INDEX IF NOT EXISTS idx_product_variety_id ON product(variety_id);
