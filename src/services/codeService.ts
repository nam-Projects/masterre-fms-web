import { supabase } from '../lib/supabase'
import type { CodeItem, CodeType } from '../types'

type DbCodeRow = {
  id: string
  code_type: string
  parent_id: string | null
  name: string
  rate: number | null
  unit: string
  sort_order: number
}

function dbRowToCodeItem(row: DbCodeRow): CodeItem {
  return {
    id: row.id,
    codeType: row.code_type as CodeType,
    parentId: row.parent_id,
    name: row.name,
    rate: row.rate != null ? Number(row.rate) : null,
    unit: row.unit,
    sortOrder: row.sort_order,
  }
}

function buildTree(items: CodeItem[]): CodeItem[] {
  const map = new Map<string, CodeItem>()
  const roots: CodeItem[] = []

  for (const item of items) {
    map.set(item.id, { ...item, children: [] })
  }

  for (const item of items) {
    const node = map.get(item.id)!
    if (item.parentId && map.has(item.parentId)) {
      map.get(item.parentId)!.children!.push(node)
    } else {
      roots.push(node)
    }
  }

  return roots
}

export async function listCodeTree(codeType: CodeType): Promise<CodeItem[]> {
  const { data, error } = await supabase
    .from('code_items')
    .select('*')
    .eq('code_type', codeType)
    .order('sort_order')

  if (error) throw error
  const flat = (data ?? []).map((r: any) => dbRowToCodeItem(r as DbCodeRow))
  return buildTree(flat)
}

export async function listCodeFlat(codeType: CodeType): Promise<CodeItem[]> {
  const { data, error } = await supabase
    .from('code_items')
    .select('*')
    .eq('code_type', codeType)
    .order('sort_order')

  if (error) throw error
  return (data ?? []).map((r: any) => dbRowToCodeItem(r as DbCodeRow))
}

export async function createCodeItem(item: {
  codeType: CodeType
  parentId: string | null
  name: string
  rate?: number | null
  unit?: string
  sortOrder?: number
}): Promise<string> {
  const { data, error } = await supabase
    .from('code_items')
    .insert({
      code_type: item.codeType,
      parent_id: item.parentId,
      name: item.name,
      rate: item.rate ?? null,
      unit: item.unit ?? '',
      sort_order: item.sortOrder ?? 0,
    })
    .select('id')
    .single()

  if (error) throw error
  return data.id
}

export async function updateCodeItem(
  id: string,
  updates: Partial<{ name: string; rate: number | null; unit: string; sortOrder: number }>,
): Promise<void> {
  const dbUpdates: Record<string, unknown> = {}
  if (updates.name !== undefined) dbUpdates.name = updates.name
  if (updates.rate !== undefined) dbUpdates.rate = updates.rate
  if (updates.unit !== undefined) dbUpdates.unit = updates.unit
  if (updates.sortOrder !== undefined) dbUpdates.sort_order = updates.sortOrder

  const { error } = await supabase.from('code_items').update(dbUpdates).eq('id', id)
  if (error) throw error
}

export async function deleteCodeItem(id: string): Promise<void> {
  const { error } = await supabase.from('code_items').delete().eq('id', id)
  if (error) throw error
}
