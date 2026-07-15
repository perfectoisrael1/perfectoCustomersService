/**
 * שורות שנבחרו בצ'קבוקס אבל לא מופיעות ברשימה המסוננת/הממוינת הנוכחית
 * מוצמדות לרשימה כדי שלא ייעלמו. ברירת מחדל: בראש (`prepend`).
 * ב־`append` — בסוף (למשל משימות — אחרי שינוי סטטוס שמוציא שורה מסינון טאב).
 */
export function prependSelectedNotInList<T>(
  visibleRows: T[] | null | undefined,
  allRows: T[] | null | undefined,
  selectedIds: Set<unknown> | null | undefined,
  getRowId: (row: T) => unknown = (r) => (r as { id?: unknown })?.id,
  detachedPlacement: 'prepend' | 'append' = 'prepend',
): T[] {
  const vis = visibleRows ?? []
  if (!selectedIds?.size) return vis
  const visibleIdSet = new Set(vis.map(getRowId).filter((id) => id != null))
  const extra = (allRows ?? []).filter((r) => {
    const id = getRowId(r)
    return id != null && selectedIds.has(id) && !visibleIdSet.has(id)
  })
  if (!extra.length) return vis
  return detachedPlacement === 'append' ? [...vis, ...extra] : [...extra, ...vis]
}

/** מחיקה מרוכזת לפי מזהי שורות שנבחרו בצ'קבוקס */
export async function deleteSelectedIds(
  selectedIds: Set<unknown>,
  deleteOne: (id: number) => Promise<unknown>,
): Promise<void> {
  for (const rawId of Array.from(selectedIds)) {
    const id = Number(rawId)
    if (Number.isFinite(id)) await deleteOne(id)
  }
}
