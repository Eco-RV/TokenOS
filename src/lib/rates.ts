// Sandbox de Lendara (ficticio, por 1 USDC) y comisión fija: docs /test-cards
export const SANDBOX: Record<string, number> = { CRC: 510, ARS: 1000, CLP: 950 }
export const FEE = 0.5
export const MIN = 1
export const MAX = 10000

export interface Rates {
	usd: Record<string, number>
	xlm: number
	live: boolean
	ts: Date | null
}

// Valores de respaldo sin conexión (aproximados)
export const FALLBACK: Rates = {
	usd: { USD: 1, USDC: 1, CRC: 500, ARS: 1400, CLP: 940, EUR: 0.92 },
	xlm: 0.2,
	live: false,
	ts: null,
}

export async function loadRates(): Promise<Rates> {
	try {
		const [a, b] = await Promise.all([
			fetch("https://open.er-api.com/v6/latest/USD").then((r) => r.json()),
			fetch("https://api.coingecko.com/api/v3/simple/price?ids=stellar&vs_currencies=usd").then((r) => r.json()),
		])
		const usd = { ...FALLBACK.usd }
		for (const k of ["CRC", "ARS", "CLP", "EUR"]) if (a.rates?.[k]) usd[k] = a.rates[k]
		return { usd, xlm: b.stellar?.usd ?? FALLBACK.xlm, live: true, ts: new Date() }
	} catch {
		return FALLBACK
	}
}
