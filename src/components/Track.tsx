import { useLayoutEffect, useRef } from "react"
import { NODES, type Step } from "../lib/sim"

const ICONS = [
	<svg
		key="u"
		viewBox="0 0 40 40"
		width="36"
		height="36"
		fill="none"
		stroke="currentColor"
		strokeWidth="2.5"
		aria-hidden="true"
	>
		<circle cx="20" cy="14" r="6" />
		<path d="M8 34a12 12 0 0 1 24 0z" />
	</svg>,
	<svg
		key="p"
		viewBox="0 0 40 40"
		width="36"
		height="36"
		fill="none"
		stroke="currentColor"
		strokeWidth="2.5"
		aria-hidden="true"
	>
		<rect x="5" y="10" width="30" height="20" />
		<path d="M5 17h30" />
		<path d="M10 25h8" />
	</svg>,
	<svg
		key="a"
		viewBox="0 0 40 40"
		width="36"
		height="36"
		fill="none"
		stroke="currentColor"
		strokeWidth="2.5"
		aria-hidden="true"
	>
		<circle cx="20" cy="20" r="14" />
		<circle cx="20" cy="20" r="5" fill="currentColor" />
		<path d="M20 2v6M20 32v6M2 20h6M32 20h6" />
	</svg>,
	<svg
		key="s"
		viewBox="0 0 40 40"
		width="36"
		height="36"
		fill="none"
		stroke="currentColor"
		strokeWidth="2.5"
		aria-hidden="true"
	>
		<path d="M20 4l5 11 12 1-9 8 3 12-11-6-11 6 3-12-9-8 12-1z" />
	</svg>,
]

interface Props {
	step: Step
	onNode?: (i: number) => void
}

export function Track({ step, onNode }: Props) {
	const root = useRef<HTMLDivElement>(null)
	const coin = useRef<HTMLDivElement>(null)

	useLayoutEffect(() => {
		const place = () => {
			const el = root.current
			const node = el?.querySelectorAll<HTMLElement>(".node")[step.node]
			if (!el || !node || !coin.current) return
			const er = el.getBoundingClientRect()
			const nr = node.getBoundingClientRect()
			coin.current.style.left = `${nr.left - er.left + nr.width / 2}px`
		}
		place()
		addEventListener("resize", place)
		return () => removeEventListener("resize", place)
	}, [step.node])

	return (
		<div className="track" ref={root}>
			{NODES.map((n, i) => (
				<button
					key={n.n}
					type="button"
					className={`node${i === 3 ? " chain" : ""}${i === step.node ? (step.err ? " bad" : " act") : ""}`}
					onClick={() => onNode?.(i)}
				>
					<div className="ic">{ICONS[i]}</div>
					{n.n}
				</button>
			))}
			<div ref={coin} className={`coin${step.usdc ? " usdc" : ""}${step.err ? " err" : ""}`}>
				{step.coin}
			</div>
		</div>
	)
}
