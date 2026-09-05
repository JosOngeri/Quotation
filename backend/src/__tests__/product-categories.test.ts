import {
  createCategorySchema,
  updateCategorySchema,
  createVarietySchema,
  updateVarietySchema,
  createProductSchema,
  updateProductSchema
} from '../validations/products';

const VALID_UUID = '123e4567-e89b-42d3-a456-426614174000';

describe('Product Category/Variety Validation Schemas', () => {
  describe('createCategorySchema', () => {
    it('should validate a minimal category', () => {
      const result = createCategorySchema.safeParse({ name: 'Electronics' });
      expect(result.success).toBe(true);
    });

    it('should validate a category with parentId and description', () => {
      const result = createCategorySchema.safeParse({
        name: 'Phones',
        description: 'Mobile phones',
        parentId: VALID_UUID
      });
      expect(result.success).toBe(true);
    });

    it('should reject missing name', () => {
      const result = createCategorySchema.safeParse({});
      expect(result.success).toBe(false);
    });

    it('should reject empty name', () => {
      const result = createCategorySchema.safeParse({ name: '' });
      expect(result.success).toBe(false);
    });

    it('should reject name over 255 chars', () => {
      const result = createCategorySchema.safeParse({ name: 'a'.repeat(256) });
      expect(result.success).toBe(false);
    });

    it('should reject invalid parentId', () => {
      const result = createCategorySchema.safeParse({ name: 'X', parentId: 'not-a-uuid' });
      expect(result.success).toBe(false);
    });
  });

  describe('updateCategorySchema', () => {
    it('should accept partial updates', () => {
      const result = updateCategorySchema.safeParse({ name: 'New Name' });
      expect(result.success).toBe(true);
    });

    it('should accept isActive flag', () => {
      const result = updateCategorySchema.safeParse({ isActive: false });
      expect(result.success).toBe(true);
    });

    it('should accept null parentId to clear parent', () => {
      const result = updateCategorySchema.safeParse({ parentId: null });
      expect(result.success).toBe(true);
    });
  });

  describe('createVarietySchema', () => {
    it('should validate a variety with categoryId and attributes', () => {
      const result = createVarietySchema.safeParse({
        categoryId: VALID_UUID,
        name: 'Red Delicious',
        attributes: { color: 'red', size: 'large' }
      });
      expect(result.success).toBe(true);
    });

    it('should reject missing categoryId', () => {
      const result = createVarietySchema.safeParse({ name: 'Red Delicious' });
      expect(result.success).toBe(false);
    });

    it('should reject missing name', () => {
      const result = createVarietySchema.safeParse({ categoryId: VALID_UUID });
      expect(result.success).toBe(false);
    });
  });

  describe('updateVarietySchema', () => {
    it('should accept partial updates', () => {
      const result = updateVarietySchema.safeParse({ name: 'Gala' });
      expect(result.success).toBe(true);
    });

    it('should accept isActive flag', () => {
      const result = updateVarietySchema.safeParse({ isActive: true });
      expect(result.success).toBe(true);
    });
  });

  describe('product schemas with categoryId/varietyId', () => {
    const baseProduct = {
      sku: 'SKU-001',
      name: 'Widget',
      unit: 'pcs'
    };

    it('should accept categoryId and varietyId on create', () => {
      const result = createProductSchema.safeParse({
        ...baseProduct,
        categoryId: VALID_UUID,
        varietyId: VALID_UUID
      });
      expect(result.success).toBe(true);
    });

    it('should still accept legacy category text', () => {
      const result = createProductSchema.safeParse({
        ...baseProduct,
        category: 'Electronics'
      });
      expect(result.success).toBe(true);
    });

    it('should reject invalid categoryId uuid', () => {
      const result = createProductSchema.safeParse({
        ...baseProduct,
        categoryId: 'bad-uuid'
      });
      expect(result.success).toBe(false);
    });

    it('should accept isActive on update', () => {
      const result = updateProductSchema.safeParse({ isActive: false });
      expect(result.success).toBe(true);
    });

    it('should accept null categoryId/varietyId on update to clear', () => {
      const result = updateProductSchema.safeParse({ categoryId: null, varietyId: null });
      expect(result.success).toBe(true);
    });
  });
});
