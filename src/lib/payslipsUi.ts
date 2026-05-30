export function monthYearLabelFromPayslipUrl(url: string): string {
  const m = String(url || '').match(/(\d{2})\.(\d{4})/)
  if (m) return `${m[1]}.${m[2]}`
  return getFilenameFromUrl(url)
}

export function getFilenameFromUrl(url: string): string {
  if (!url || typeof url !== 'string') return 'קובץ'
  try {
    const decoded = decodeURIComponent(url)
    const parts = decoded.split('/')
    const name = parts[parts.length - 1] || 'קובץ'
    return name.replace(/\.(pdf|png|jpg|jpeg)$/i, '') || name
  } catch {
    return 'קובץ'
  }
}

export function getPayslipDownloadFilename(url: string): string {
  const base = getFilenameFromUrl(url)
  const decoded = decodeURIComponent(url || '')
  const lastPart = decoded.split('/').pop() || ''
  const extMatch = lastPart.match(/\.(pdf|png|jpg|jpeg)$/i)
  const ext = extMatch ? extMatch[0] : '.pdf'
  return `תלוש משכורת לחודש (${base}) - פרפקטו${ext}`
}

export function mergeAndSortPayslipUrls(fromApi: string[], fromProfile?: string[] | null): string[] {
  const seen = new Set<string>()
  const out: string[] = []
  for (const u of [...(fromApi || []), ...(Array.isArray(fromProfile) ? fromProfile : [])]) {
    const n = String(u || '').trim()
    if (!n || seen.has(n)) continue
    seen.add(n)
    out.push(n)
  }
  out.sort((a, b) => {
    const ma = String(a).match(/(\d{2})\.(\d{4})/)
    const mb = String(b).match(/(\d{2})\.(\d{4})/)
    const va = ma ? `${ma[2]}${ma[1]}` : ''
    const vb = mb ? `${mb[2]}${mb[1]}` : ''
    if (va && vb) return vb.localeCompare(va)
    if (vb) return 1
    if (va) return -1
    return String(b).localeCompare(String(a))
  })
  return out
}

export function downloadPayslipUrl(url: string, filename?: string): void {
  const name = filename || getPayslipDownloadFilename(url)
  const a = document.createElement('a')
  a.href = url
  a.download = name
  a.target = '_blank'
  a.rel = 'noopener noreferrer'
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
}
