/** אותו שבוע לוח כמו ביום המקומי (ראשון = תחילת שבוע) */
function startOfWeekSunday(d: Date): Date {
  const x = new Date(d.getFullYear(), d.getMonth(), d.getDate())
  const day = x.getDay()
  x.setDate(x.getDate() - day)
  x.setHours(0, 0, 0, 0)
  return x
}

export function isExecutionDateThisWeek(dateStr: string | null | undefined): boolean {
  if (!dateStr) return false
  const t = Date.parse(String(dateStr))
  if (Number.isNaN(t)) return false
  const d = new Date(t)
  const a = startOfWeekSunday(d).getTime()
  const b = startOfWeekSunday(new Date()).getTime()
  return a === b
}
