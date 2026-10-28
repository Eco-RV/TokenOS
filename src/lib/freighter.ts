import { getNetworkDetails, isConnected, requestAccess, signTransaction } from "@stellar/freighter-api"

export const TESTNET = "Test SDF Network ; September 2015"

export interface WalletSession {
	address: string
}

/** Conecta Freighter y exige que esté en Testnet. */
export async function connectFreighter(): Promise<WalletSession> {
	const conn = await isConnected()
	if (!conn.isConnected) throw new Error("No encontramos Freighter. Instálala desde freighter.app y recarga la página.")
	const access = await requestAccess()
	if (access.error || !access.address)
		throw new Error("Freighter rechazó la conexión. Acepta el permiso para continuar.")
	await assertTestnet()
	return { address: access.address }
}

export async function assertTestnet(): Promise<void> {
	const net = await getNetworkDetails()
	if (net.error || net.networkPassphrase !== TESTNET)
		throw new Error("Tu wallet está en otra red. Cámbiala a Testnet en Freighter para continuar.")
}

export async function signXdr(xdr: string, address: string): Promise<string> {
	const res = await signTransaction(xdr, { networkPassphrase: TESTNET, address })
	if (res.error || !res.signedTxXdr) throw new Error("No se firmó la transacción en Freighter.")
	return res.signedTxXdr
}
