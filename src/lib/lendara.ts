import { TransactionBuilder, WebAuth } from "@stellar/stellar-sdk"
import { TESTNET, signXdr } from "./freighter"

export const HOME = "https://lendara-monorepo-fixh.vercel.app"

export interface Toml {
	auth: string
	sep24: string
	signingKey: string
	issuer: string
}

export interface LendaraTx {
	id: string
	kind: string
	status: string
	to?: string
	amount_in?: string
	amount_out?: string
	amount_fee?: string
	amount_in_asset?: string
	amount_out_asset?: string
	stellar_transaction_id?: string
	message?: string
	more_info_url?: string
	started_at?: string
	updated_at?: string
}

/** Lee el stellar.toml (SEP-1) de Lendara: endpoints, llave de firma y emisor del USDC. */
export async function loadToml(): Promise<Toml> {
	const text = await (await fetch(`${HOME}/.well-known/stellar.toml`)).text()
	const lines = text.split("\n").map((l) => l.trim())
	const get = (k: string) => {
		const line = lines.find((l) => l.startsWith(k + " "))
		if (!line) throw new Error(`El stellar.toml de Lendara no trae ${k}.`)
		return line.split('"')[1]
	}
	return {
		auth: get("WEB_AUTH_ENDPOINT"),
		sep24: get("TRANSFER_SERVER_SEP0024"),
		signingKey: get("SIGNING_KEY"),
		issuer: get("issuer"),
	}
}

const cacheKey = (account: string) => `tokenos:jwt:${account}`

function readCache(account: string): string | null {
	try {
		const raw = sessionStorage.getItem(cacheKey(account))
		if (!raw) return null
		const { token, exp } = JSON.parse(raw) as { token: string; exp: number }
		return exp * 1000 > Date.now() + 60_000 ? token : null
	} catch {
		return null
	}
}

function writeCache(account: string, token: string) {
	try {
		const exp = JSON.parse(atob(token.split(".")[1].replace(/-/g, "+").replace(/_/g, "/"))).exp as number
		sessionStorage.setItem(cacheKey(account), JSON.stringify({ token, exp }))
	} catch {
		/* sin caché: se vuelve a autenticar */
	}
}

/** SEP-10: pide el desafío, lo verifica, lo firma con Freighter y devuelve el JWT. */
export async function authenticate(toml: Toml, account: string): Promise<string> {
	const cached = readCache(account)
	if (cached) return cached
	const ch = await fetch(`${toml.auth}?account=${account}`)
	if (!ch.ok) throw new Error("Lendara no entregó el desafío de autenticación (SEP-10).")
	const { transaction } = (await ch.json()) as { transaction: string }
	// Verifica que el desafío viene de la llave de Lendara y de su dominio.
	WebAuth.readChallengeTx(transaction, toml.signingKey, TESTNET, new URL(HOME).host, new URL(toml.auth).host)
	const signed = await signXdr(transaction, account)
	const res = await fetch(toml.auth, {
		method: "POST",
		headers: { "Content-Type": "application/json" },
		body: JSON.stringify({ transaction: TransactionBuilder.fromXDR(signed, TESTNET).toXDR() }),
	})
	const body = (await res.json()) as { token?: string; error?: string }
	if (!res.ok || !body.token) throw new Error(`Lendara rechazó la firma: ${body.error ?? res.status}`)
	writeCache(account, body.token)
	return body.token
}

export async function startDeposit(
	toml: Toml,
	jwt: string,
	account: string,
	amount: number,
): Promise<{ id: string; url: string }> {
	const res = await fetch(`${toml.sep24}/transactions/deposit/interactive`, {
		method: "POST",
		headers: { Authorization: `Bearer ${jwt}`, "Content-Type": "application/json" },
		body: JSON.stringify({ asset_code: "USDC", account, amount: String(amount), lang: "es" }),
	})
	const body = (await res.json()) as { id?: string; url?: string; error?: string }
	if (!res.ok || !body.id || !body.url) throw new Error(`Lendara no abrió el depósito: ${body.error ?? res.status}`)
	return { id: body.id, url: body.url }
}

export async function getTransaction(toml: Toml, jwt: string, id: string): Promise<LendaraTx> {
	const res = await fetch(`${toml.sep24}/transaction?id=${id}`, { headers: { Authorization: `Bearer ${jwt}` } })
	if (!res.ok) throw new Error("No se pudo consultar el estado de la operación.")
	return ((await res.json()) as { transaction: LendaraTx }).transaction
}
