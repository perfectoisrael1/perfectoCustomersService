const SOURCE = 'perfecto-account-deletion'

const DEFAULT_CLOUD_API_BASE =
  'https://perfecto-backend-535608507694.me-west1.run.app'

function parseApiBaseUrl(raw: string | undefined): string | null {
  const s = String(raw ?? '').trim()
  if (!s) return null
  try {
    const u = new URL(s)
    if (!u.hostname) return null
    return `${u.protocol}//${u.host}`
  } catch {
    return null
  }
}

function baseUrl(): string {
  const fromEnv = parseApiBaseUrl(
    import.meta.env.VITE_PERFECTO_API_BASE_URL as string | undefined,
  )
  if (fromEnv) return fromEnv
  return parseApiBaseUrl(DEFAULT_CLOUD_API_BASE) ?? DEFAULT_CLOUD_API_BASE
}

async function publicFetch<T>(
  path: string,
  body: unknown,
): Promise<T> {
  const url = `${baseUrl()}${path}`
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Source': SOURCE,
    },
    body: JSON.stringify(body),
    cache: 'no-store',
  })

  if (!res.ok) {
    let msg = res.statusText
    try {
      const data = await res.json()
      if (Array.isArray(data?.message)) msg = data.message.join(', ')
      else if (data?.message) msg = String(data.message)
    } catch {
      /* ignore */
    }
    throw new Error(msg || 'בקשה נכשלה')
  }

  const text = await res.text()
  if (!text.trim()) return {} as T
  return JSON.parse(text) as T
}

export async function requestAccountDeletionCode(
  phoneNumber: string,
): Promise<{ ok: boolean }> {
  return publicFetch('/auth/account-deletion/request', { phoneNumber })
}

export async function submitAccountDeletionRequest(
  phoneNumber: string,
  code: string,
): Promise<{ ok: boolean; alreadyRequested?: boolean }> {
  return publicFetch('/auth/account-deletion/submit', { phoneNumber, code })
}
