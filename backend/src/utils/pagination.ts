export interface PaginationParams {
  page?: number;
  pageSize?: number;
  sortBy?: string;
  sortOrder?: 'ASC' | 'DESC';
}

export interface PaginationResult<T> {
  data: T[];
  pagination: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrevious: boolean;
  };
}

export interface PaginationQuery {
  page: number;
  pageSize: number;
  limit: number;
  offset: number;
  sortBy?: string;
  sortOrder: 'ASC' | 'DESC';
}

export const DEFAULT_PAGE_SIZE = 20;
export const MAX_PAGE_SIZE = 100;

export function parsePaginationParams(params: PaginationParams): PaginationQuery {
  const page = Math.max(1, params.page || 1);
  const pageSize = Math.min(
    MAX_PAGE_SIZE,
    Math.max(1, params.pageSize || DEFAULT_PAGE_SIZE)
  );
  
  const offset = (page - 1) * pageSize;
  const limit = pageSize;

  return {
    page,
    pageSize,
    limit,
    offset,
    sortBy: params.sortBy,
    sortOrder: params.sortOrder || 'ASC'
  };
}

export function buildPaginationResult<T>(
  data: T[],
  total: number,
  query: PaginationQuery
): PaginationResult<T> {
  const totalPages = Math.ceil(total / query.pageSize);
  
  return {
    data,
    pagination: {
      page: query.page,
      pageSize: query.pageSize,
      total,
      totalPages,
      hasNext: query.page < totalPages,
      hasPrevious: query.page > 1
    }
  };
}

export function buildOrderByClause(sortBy?: string, sortOrder: 'ASC' | 'DESC' = 'ASC'): string {
  if (!sortBy) return 'ORDER BY created_at DESC';
  
  // Validate sortBy to prevent SQL injection
  const allowedColumns = [
    'created_at',
    'updated_at',
    'name',
    'title',
    'email',
    'status',
    'total_amount_minor'
  ];
  
  if (!allowedColumns.includes(sortBy)) {
    return 'ORDER BY created_at DESC';
  }
  
  return `ORDER BY ${sortBy} ${sortOrder}`;
}