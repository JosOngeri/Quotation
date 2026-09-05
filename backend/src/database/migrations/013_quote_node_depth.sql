-- 013_quote_node_depth.sql
-- Allow arbitrary nesting depth in quote_node by dropping the node_type
-- CHECK constraint. node_type values remain 'section' | 'subsection' | 'item'
-- by application convention, but the DB no longer blocks deeper structures
-- or future node types.
ALTER TABLE quote_node DROP CONSTRAINT IF EXISTS quote_node_node_type_check;
