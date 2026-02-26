import { STAGES, STAGE_LABELS, STAGE_COLORS } from '../../types'
import type { Stage } from '../../types'

type Props = {
  currentStage: Stage
  onPrev: () => void
  onNext: () => void
}

export default function StageTransition({ currentStage, onPrev, onNext }: Props) {
  const currentIndex = STAGES.indexOf(currentStage)
  const canPrev = currentIndex > 0
  const canNext = currentIndex < STAGES.length - 1

  return (
    <div className="stage-transition">
      <h3>단계 진행</h3>
      <div className="stage-track">
        {STAGES.map((s, i) => (
          <div
            key={s}
            className={`stage-step ${i <= currentIndex ? 'done' : ''} ${i === currentIndex ? 'current' : ''}`}
            style={
              i <= currentIndex
                ? { borderColor: STAGE_COLORS[s], color: STAGE_COLORS[s] }
                : undefined
            }
          >
            <div
              className="stage-step-dot"
              style={
                i <= currentIndex ? { background: STAGE_COLORS[s] } : undefined
              }
            />
            <span className="stage-step-label">{STAGE_LABELS[s]}</span>
          </div>
        ))}
      </div>
      <div className="stage-buttons">
        <button
          className="btn-stage-prev"
          onClick={onPrev}
          disabled={!canPrev}
        >
          이전단계로 전환
        </button>
        <button
          className="btn-stage-next"
          onClick={onNext}
          disabled={!canNext}
        >
          다음 단계로 전환
        </button>
      </div>
    </div>
  )
}
