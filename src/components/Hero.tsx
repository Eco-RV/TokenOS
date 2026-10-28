import { useEffect, useRef } from "react"

const LETTERS = ["T", "O", "K", "E", "N", "O", "S"]

/** Hash ilustrativo de 32 bits (no criptográfico). */
const h8 = (s: string) => {
	let a = 0xdeadbeef
	let b = 0x41c6ce57
	for (let i = 0; i < s.length; i++) {
		const c = s.charCodeAt(i)
		a = Math.imul(a ^ c, 2654435761)
		b = Math.imul(b ^ c, 1597334677)
	}
	a = Math.imul(a ^ (a >>> 16), 2246822507) ^ Math.imul(b ^ (b >>> 13), 3266489909)
	return (a >>> 0).toString(16).padStart(8, "0")
}
const rnd = () => Array.from({ length: 4 }, () => "0123456789abcdef"[Math.floor(Math.random() * 16)]).join("")

interface Blk {
	n: number
	prev: string
	data: string
	hash: string
	pend: boolean
	orig?: string
	el: HTMLDivElement
	link?: HTMLDivElement
}

export function Hero() {
	const h1 = useRef<HTMLHeadingElement>(null)
	const box = useRef<HTMLDivElement>(null)
	const rail = useRef<HTMLDivElement>(null)

	// El título se decodifica: cada letra parpadea en hex y se resuelve.
	useEffect(() => {
		if (matchMedia("(prefers-reduced-motion:reduce)").matches || !h1.current) return
		const H = "0123456789ABCDEF"
		const ids: number[] = []
		h1.current.querySelectorAll("span").forEach((l, i) => {
			const f = LETTERS[i]
			const end = 500 + i * 110
			const t0 = performance.now()
			const id = window.setInterval(() => {
				if (performance.now() - t0 > end) {
					l.textContent = f
					window.clearInterval(id)
				} else l.textContent = H[Math.floor(Math.random() * 16)]
			}, 60)
			ids.push(id)
		})
		return () => ids.forEach((i) => window.clearInterval(i))
	}, [])

	// Mini cadena de bloques: cada bloque guarda el hash del anterior.
	useEffect(() => {
		const r = rail.current
		const b0 = box.current
		if (!r || !b0) return
		const chain: Blk[] = []
		let n = 0
		let busy = false
		const actual = (b: Blk) => h8(b.prev + b.data)
		const paint = (b: Blk) => {
			b.el.innerHTML = `<b>#${b.n}</b>prev<br><i>${b.prev}</i><br>datos <i>${b.data}</i><br>hash<br><i>${b.pend ? "········" : b.hash}</i>`
		}
		const validate = () => {
			let broken = false
			chain.forEach((b) => {
				if (!broken && !b.pend && actual(b) !== b.hash) broken = true
				b.el.classList.toggle("bad", broken)
				b.link?.classList.toggle("bad", broken)
			})
		}
		const place = () => {
			r.style.transform = `translateX(${Math.min(0, b0.clientWidth - r.scrollWidth - 24)}px)`
		}
		const add = (sealNow: boolean) => {
			const prev = chain.length ? chain[chain.length - 1].hash : "00000000"
			const el = document.createElement("div")
			el.className = `mb${sealNow ? "" : " pend"}`
			el.tabIndex = 0
			const b: Blk = { n: ++n, prev, data: rnd(), hash: "", pend: !sealNow, el }
			b.hash = actual(b)
			if (chain.length) {
				b.link = document.createElement("div")
				b.link.className = "ml"
				r.append(b.link)
			}
			r.append(el)
			paint(b)
			chain.push(b)
			const tamper = () => {
				if (b.pend) return
				if (b.orig) {
					b.data = b.orig
					b.orig = undefined
				} else {
					b.orig = b.data
					b.data = rnd()
				}
				paint(b)
				validate()
			}
			el.onclick = tamper
			el.onkeydown = (e) => {
				if (e.key === "Enter" || e.key === " ") {
					e.preventDefault()
					tamper()
				}
			}
			while (chain.length > 7) {
				const o = chain.shift()!
				o.el.remove()
				o.link?.remove()
				if (chain[0]?.link) {
					chain[0].link.remove()
					chain[0].link = undefined
				}
			}
			place()
			if (b.pend) {
				busy = true
				const t0 = performance.now()
				const id = window.setInterval(() => {
					if (performance.now() - t0 > 1100) {
						window.clearInterval(id)
						b.pend = false
						el.classList.remove("pend")
						el.classList.add("new")
						paint(b)
						validate()
						busy = false
					} else {
						const last = el.querySelector("i:last-child")
						if (last) last.textContent = h8(String(Math.random()))
					}
				}, 70)
			}
		}
		for (let i = 0; i < 4; i++) add(true)
		const iv = window.setInterval(() => {
			if (!busy && !document.hidden) add(false)
		}, 3400)
		addEventListener("resize", place)
		return () => {
			window.clearInterval(iv)
			removeEventListener("resize", place)
			r.replaceChildren()
		}
	}, [])

	return (
		<div className="sec hero">
			<div className="grid two">
				<div className="cell">
					<div className="kicker">Stellar testnet · Anchor Lendara</div>
					<h1 ref={h1} aria-label="Token OS">
						{LETTERS.map((l, i) => (
							<span
								key={i}
								className={i >= 5 ? (i === 5 ? "os gap" : "os") : undefined}
								style={{ animationDelay: `${i * 50}ms` }}
							>
								{l}
							</span>
						))}
					</h1>
					<p>
						Elige una cantidad ficticia de dinero y mira cómo se vuelve un activo digital en tu propia wallet. Las
						comisiones del sandbox son de{" "}
						<a href="https://lendara-monorepo-fixh.vercel.app/docs/es" target="_blank" rel="noopener">
							Lendara
						</a>
						; las tasas de referencia son de mercado real.
					</p>
				</div>
				<div
					className="cell chainviz"
					ref={box}
					role="img"
					aria-label="Demostración de una cadena de bloques: cada bloque guarda el hash del anterior"
				>
					<div className="mc-rail" ref={rail} />
					<div className="mc-cap">
						Cada bloque guarda el hash del anterior. Toca uno para alterarlo y mira cómo se rompe la cadena.{" "}
						<span className="mut">(demo ilustrativa)</span>
					</div>
					<div className="sticker">Testnet</div>
				</div>
			</div>
		</div>
	)
}
