import type { Step } from "../lib/sim"

interface Props {
	steps: Step[]
	cur: number
	onPick: (i: number) => void
}

export function Timeline({ steps, cur, onPick }: Props) {
	return (
		<ol className="tl">
			{steps.map((x, k) => (
				<li
					key={k}
					className={`${k < cur ? "done" : ""} ${k === cur ? "cur" : ""} ${x.err ? "err" : ""}`}
					onClick={() => onPick(k)}
				>
					<span className="dot" />
					<div>
						<b>{x.t}</b>
						<div className="mut">
							<span className="state">{x.state}</span>{" "}
							<span className={`badge ${x.off ? "off" : "on"}`}>{x.off ? "off-chain" : "on-chain"}</span>
						</div>
					</div>
				</li>
			))}
		</ol>
	)
}
