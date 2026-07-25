export interface FilterConfig {
  field: string;
  operator: 'eq' | 'ne' | 'gt' | 'gte' | 'lt' | 'lte' | 'like' | 'ilike' | 'in' | 'between';
  value: any;
}

export interface DateRangeFilter {
  field: string;
  startDate?: string;
  endDate?: string;
}

export interface ValueRangeFilter {
  field: string;
  minValue?: number;
  maxValue?: number;
}

export function buildFilterClause(
  filters: FilterConfig[],
  params: any[],
  startIndex: number = 1
): { clause: string; newParams: any[]; newIndex: number } {
  if (filters.length === 0) {
    return { clause: '', newParams: params, newIndex: startIndex };
  }

  const conditions: string[] = [];
  let currentParams = [...params];
  let currentIndex = startIndex;

  filters.forEach(filter => {
    const paramPlaceholder = `$${currentIndex}`;
    let condition = '';

    switch (filter.operator) {
      case 'eq':
        condition = `${filter.field} = ${paramPlaceholder}`;
        currentParams.push(filter.value);
        currentIndex++;
        break;
      case 'ne':
        condition = `${filter.field} != ${paramPlaceholder}`;
        currentParams.push(filter.value);
        currentIndex++;
        break;
      case 'gt':
        condition = `${filter.field} > ${paramPlaceholder}`;
        currentParams.push(filter.value);
        currentIndex++;
        break;
      case 'gte':
        condition = `${filter.field} >= ${paramPlaceholder}`;
        currentParams.push(filter.value);
        currentIndex++;
        break;
      case 'lt':
        condition = `${filter.field} < ${paramPlaceholder}`;
        currentParams.push(filter.value);
        currentIndex++;
        break;
      case 'lte':
        condition = `${filter.field} <= ${paramPlaceholder}`;
        currentParams.push(filter.value);
        currentIndex++;
        break;
      case 'like':
        condition = `${filter.field} LIKE ${paramPlaceholder}`;
        currentParams.push(filter.value);
        currentIndex++;
        break;
      case 'ilike':
        condition = `${filter.field} ILIKE ${paramPlaceholder}`;
        currentParams.push(filter.value);
        currentIndex++;
        break;
      case 'in':
        if (Array.isArray(filter.value) && filter.value.length > 0) {
          const placeholders = filter.value.map((_, i) => `$${currentIndex + i}`).join(', ');
          condition = `${filter.field} IN (${placeholders})`;
          currentParams.push(...filter.value);
          currentIndex += filter.value.length;
        }
        break;
      case 'between':
        if (Array.isArray(filter.value) && filter.value.length === 2) {
          condition = `${filter.field} BETWEEN $${currentIndex} AND $${currentIndex + 1}`;
          currentParams.push(filter.value[0], filter.value[1]);
          currentIndex += 2;
        }
        break;
    }

    if (condition) {
      conditions.push(condition);
    }
  });

  const clause = conditions.length > 0 ? `AND ${conditions.join(' AND ')}` : '';

  return { clause, newParams: currentParams, newIndex: currentIndex };
}

export function buildDateRangeFilter(
  dateRange: DateRangeFilter,
  params: any[],
  startIndex: number = 1
): { clause: string; newParams: any[]; newIndex: number } {
  if (!dateRange.startDate && !dateRange.endDate) {
    return { clause: '', newParams: params, newIndex: startIndex };
  }

  const conditions: string[] = [];
  let currentParams = [...params];
  let currentIndex = startIndex;

  if (dateRange.startDate) {
    conditions.push(`${dateRange.field} >= $${currentIndex}`);
    currentParams.push(dateRange.startDate);
    currentIndex++;
  }

  if (dateRange.endDate) {
    conditions.push(`${dateRange.field} <= $${currentIndex}`);
    currentParams.push(dateRange.endDate);
    currentIndex++;
  }

  const clause = conditions.length > 0 ? `AND ${conditions.join(' AND ')}` : '';

  return { clause, newParams: currentParams, newIndex: currentIndex };
}

export function buildValueRangeFilter(
  valueRange: ValueRangeFilter,
  params: any[],
  startIndex: number = 1
): { clause: string; newParams: any[]; newIndex: number } {
  if (!valueRange.minValue && !valueRange.maxValue) {
    return { clause: '', newParams: params, newIndex: startIndex };
  }

  const conditions: string[] = [];
  let currentParams = [...params];
  let currentIndex = startIndex;

  if (valueRange.minValue !== undefined) {
    conditions.push(`${valueRange.field} >= $${currentIndex}`);
    currentParams.push(valueRange.minValue);
    currentIndex++;
  }

  if (valueRange.maxValue !== undefined) {
    conditions.push(`${valueRange.field} <= $${currentIndex}`);
    currentParams.push(valueRange.maxValue);
    currentIndex++;
  }

  const clause = conditions.length > 0 ? `AND ${conditions.join(' AND ')}` : '';

  return { clause, newParams: currentParams, newIndex: currentIndex };
}

export function parseFilterParams(queryParams: any): FilterConfig[] {
  const filters: FilterConfig[] = [];

  // Parse standard filters (format: field_operator=value)
  Object.keys(queryParams).forEach(key => {
    const match = key.match(/^(.+)_(eq|ne|gt|gte|lt|lte|like|ilike|in|between)$/);
    if (match) {
      const field = match[1];
      const operator = match[2] as FilterConfig['operator'];
      let value = queryParams[key];

      // Handle array values for 'in' operator
      if (operator === 'in' && typeof value === 'string') {
        value = value.split(',').map(v => v.trim());
      }

      // Handle array values for 'between' operator
      if (operator === 'between' && typeof value === 'string') {
        value = value.split(',').map(v => v.trim());
      }

      filters.push({ field, operator, value });
    }
  });

  return filters;
}

export function sanitizeFieldName(field: string, allowedFields: string[]): string {
  if (!allowedFields.includes(field)) {
    throw new Error(`Invalid field name: ${field}`);
  }
  return field;
}