import { eq, desc, asc, and, SQL } from 'drizzle-orm';
import { PgTable } from 'drizzle-orm/pg-core';

export function buildDrizzleWhere(table: any, whereObj?: any): SQL<unknown> | undefined {
  if (!whereObj) return undefined;
  
  const conditions = [];
  for (const [key, value] of Object.entries(whereObj)) {
    if (table[key]) {
      conditions.push(eq(table[key], value));
    }
  }
  
  if (conditions.length === 0) return undefined;
  if (conditions.length === 1) return conditions[0];
  return and(...conditions);
}

export function buildDrizzleOrderBy(table: any, orderObj?: any): any[] {
  if (!orderObj) return [];
  
  const orderClauses = [];
  for (const [key, direction] of Object.entries(orderObj)) {
    if (table[key]) {
      if ((direction as string).toLowerCase() === 'desc') {
        orderClauses.push(desc(table[key]));
      } else {
        orderClauses.push(asc(table[key]));
      }
    }
  }
  return orderClauses;
}

export function buildDrizzleSelect(table: any, selectObj?: string[]): any {
  if (!selectObj || !Array.isArray(selectObj) || selectObj.length === 0) return undefined;
  
  const selectClause: Record<string, any> = {};
  for (const key of selectObj) {
    if (table[key]) {
      selectClause[key] = table[key];
    }
  }
  
  return Object.keys(selectClause).length > 0 ? selectClause : undefined;
}
