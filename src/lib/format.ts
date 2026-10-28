export const fmt = (n: number, d = 2) =>
	new Intl.NumberFormat("es-CR", { minimumFractionDigits: d, maximumFractionDigits: d }).format(n)

export const sym: Record<string, string> = {
	CRC: "₡",
	ARS: "$",
	CLP: "$",
	USD: "US$",
	USDC: "USDC ",
	XLM: "XLM ",
	EUR: "€",
}

export const short = (a: string) => `${a.slice(0, 4)}…${a.slice(-4)}`
