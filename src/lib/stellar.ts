import { Asset, Horizon, Operation, TransactionBuilder } from "@stellar/stellar-sdk"
import { TESTNET, signXdr } from "./freighter"

export const HORIZON = "https://horizon-testnet.stellar.org"
export const server = new Horizon.Server(HORIZON)
export const explorerTx = (hash: string) => `https://stellar.expert/explorer/testnet/tx/${hash}`
export const explorerAccount = (a: string) => `https://stellar.expert/explorer/testnet/account/${a}`

export interface Balances {
	exists: boolean
	xlm: number
	usdc: number | null // null = sin trustline
}

export async function loadBalances(address: string, issuer: string): Promise<Balances> {
	try {
		const acc = await server.loadAccount(address)
		let xlm = 0
		let usdc: number | null = null
		for (const b of acc.balances) {
			if (b.asset_type === "native") xlm = Number(b.balance)
			else if ("asset_code" in b && b.asset_code === "USDC" && b.asset_issuer === issuer) usdc = Number(b.balance)
		}
		return { exists: true, xlm, usdc }
	} catch (e) {
		if ((e as { response?: { status?: number } }).response?.status === 404) return { exists: false, xlm: 0, usdc: null }
		throw new Error("No se pudo consultar Horizon. Intenta de nuevo en unos segundos.")
	}
}

export async function fundWithFriendbot(address: string): Promise<void> {
	const r = await fetch(`https://friendbot.stellar.org/?addr=${encodeURIComponent(address)}`)
	if (!r.ok) throw new Error("Friendbot no pudo fondear la cuenta (quizá ya existe).")
}

/** Crea la trustline a USDC (changeTrust) y la firma con Freighter. */
export async function addUsdcTrustline(address: string, issuer: string): Promise<string> {
	const acc = await server.loadAccount(address)
	const tx = new TransactionBuilder(acc, { fee: "100", networkPassphrase: TESTNET })
		.addOperation(Operation.changeTrust({ asset: new Asset("USDC", issuer) }))
		.setTimeout(120)
		.build()
	const signed = await signXdr(tx.toXDR(), address)
	const res = await server.submitTransaction(TransactionBuilder.fromXDR(signed, TESTNET))
	return res.hash
}
