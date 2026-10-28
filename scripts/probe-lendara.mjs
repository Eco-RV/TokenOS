// Sondea el anchor de Lendara de punta a punta con una cuenta de testnet desechable.
// Uso: node scripts/probe-lendara.mjs [monto_fiat]
import { Keypair, TransactionBuilder, Operation, Asset, Horizon, WebAuth } from "@stellar/stellar-sdk"

const HOME = "https://lendara-monorepo-fixh.vercel.app"
const HORIZON = "https://horizon-testnet.stellar.org"
const j = async (r) => {
	const t = await r.text()
	try {
		return JSON.parse(t)
	} catch {
		return t
	}
}
const log = (t, v) => console.log("\n== " + t + "\n" + (typeof v === "string" ? v : JSON.stringify(v, null, 1)))

const toml = await (await fetch(`${HOME}/.well-known/stellar.toml`)).text()
const lines = toml.split(String.fromCharCode(10)).map((l) => l.trim())
const get = (k) => lines.find((l) => l.startsWith(k + " ")).split(String.fromCharCode(34))[1]
const AUTH = get("WEB_AUTH_ENDPOINT"),
	SEP24 = get("TRANSFER_SERVER_SEP0024"),
	SIGNING = get("SIGNING_KEY"),
	PASS = get("NETWORK_PASSPHRASE")
const ISSUER = get("issuer")
log("toml", { AUTH, SEP24, SIGNING, PASS, ISSUER })

const kp = Keypair.random()
log("cuenta", kp.publicKey())
await fetch(`https://friendbot.stellar.org/?addr=${kp.publicKey()}`)
const server = new Horizon.Server(HORIZON)
let acc = await server.loadAccount(kp.publicKey())
const tx = new TransactionBuilder(acc, { fee: "100", networkPassphrase: PASS })
	.addOperation(Operation.changeTrust({ asset: new Asset("USDC", ISSUER) }))
	.setTimeout(60)
	.build()
tx.sign(kp)
log("trustline", (await server.submitTransaction(tx)).hash)

const ch = await j(await fetch(`${AUTH}?account=${kp.publicKey()}`))
log("challenge (resumen)", { keys: Object.keys(ch), network_passphrase: ch.network_passphrase })
const parsed = WebAuth.readChallengeTx(ch.transaction, SIGNING, PASS, new URL(HOME).host, new URL(AUTH).host)
log("readChallengeTx ok", {
	clientAccountID: parsed.clientAccountID,
	memo: parsed.memo,
	matchedHomeDomain: parsed.matchedHomeDomain,
})
const ctx = TransactionBuilder.fromXDR(ch.transaction, PASS)
ctx.sign(kp)
const tok = await j(
	await fetch(AUTH, {
		method: "POST",
		headers: { "Content-Type": "application/json" },
		body: JSON.stringify({ transaction: ctx.toXDR() }),
	}),
)
log("token", typeof tok === "string" ? tok : { keys: Object.keys(tok) })
const jwt = tok.token
const H = { Authorization: `Bearer ${jwt}`, "Content-Type": "application/json" }

log("info", await j(await fetch(`${SEP24}/info`)))
const amount = process.argv[2] || "20"
const dep = await fetch(`${SEP24}/transactions/deposit/interactive`, {
	method: "POST",
	headers: H,
	body: JSON.stringify({ asset_code: "USDC", account: kp.publicKey(), amount, lang: "es" }),
})
const depBody = await j(dep)
log("deposit interactive " + dep.status, depBody)
const id = depBody.id
if (id) {
	log("transaction", await j(await fetch(`${SEP24}/transaction?id=${id}`, { headers: H })))
	log("transactions", await j(await fetch(`${SEP24}/transactions?asset_code=USDC`, { headers: H })))
	if (depBody.url) {
		const w = await fetch(depBody.url, { redirect: "manual" })
		log("widget " + w.status, {
			origin: new URL(depBody.url).origin,
			xfo: w.headers.get("x-frame-options"),
			csp: w.headers.get("content-security-policy"),
			cors: w.headers.get("access-control-allow-origin"),
		})
	}
}
