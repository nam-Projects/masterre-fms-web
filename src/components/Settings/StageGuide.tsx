import { STAGE_LABELS, STAGE_COLORS } from '../../types'
import type { Stage } from '../../types'

const STAGES_ORDER: Stage[] = [
  'new_site',
  'site_survey',
  'estimate',
  'restoration',
  'completed',
  'claiming',
  'closed',
]

type StageInfo = {
  stage: Stage
  description: string
  conditions: { label: string; required: boolean }[]
  transition: { type: 'auto' | 'manual'; description: string }
  tips?: string
}

const STAGE_DATA: StageInfo[] = [
  {
    stage: 'new_site',
    description: '새로운 현장이 등록된 초기 상태입니다.',
    conditions: [
      { label: '현장 사진 1장 이상 업로드', required: true },
    ],
    transition: {
      type: 'auto',
      description: '현장 사진이 1장 이상 업로드되면 자동으로 "현장조사" 단계로 전환됩니다.',
    },
    tips: '현장사진 탭에서 어떤 폴더든 사진을 업로드하면 바로 다음 단계로 넘어갑니다.',
  },
  {
    stage: 'site_survey',
    description: '현장 조사를 진행하고, 피해 범위를 산출하는 단계입니다.',
    conditions: [
      { label: '피해복구면적 산출표 작성', required: true },
      { label: '평면도 업로드', required: true },
    ],
    transition: {
      type: 'auto',
      description: '피해복구면적 산출표 작성과 평면도 업로드가 완료되면 자동으로 "견적서" 단계로 전환됩니다.',
    },
  },
  {
    stage: 'estimate',
    description: '견적서를 작성하거나, 견적서 없이 바로 공사를 진행할 수 있는 단계입니다.',
    conditions: [
      { label: '견적서 업로드', required: false },
    ],
    transition: {
      type: 'manual',
      description: '아래 두 가지 버튼 중 하나를 클릭하여 수동 전환합니다.',
    },
    tips: '• "견적서 생략" — 견적서 없이 바로 복구공사 단계로 이동\n• "공사승인 완료" — 견적서 업로드 후 클릭 가능 (견적서 미업로드 시 비활성)',
  },
  {
    stage: 'restoration',
    description: '실제 복구 공사를 진행하는 단계입니다. 공사 전/중/후 사진 기록이 필요합니다.',
    conditions: [
      { label: '공사전 사진', required: true },
      { label: '공사중 사진', required: true },
      { label: '공사후 사진', required: true },
      { label: '보험청구서 및 개인정보 서류', required: false },
    ],
    transition: {
      type: 'manual',
      description: '공사전/중/후 사진을 모두 업로드한 뒤 "공사완료" 버튼을 클릭합니다.',
    },
    tips: '현장사진 탭에서 "공사전", "공사중", "공사후" 각 폴더에 최소 1장씩 업로드해야 합니다.',
  },
  {
    stage: 'completed',
    description: '공사가 완료되어 보험사에 보험금을 청구하는 단계로 넘어갈 수 있습니다.',
    conditions: [],
    transition: {
      type: 'manual',
      description: '"보험사 보험금 지급요청 완료" 버튼을 클릭하면 "청구중" 단계로 전환됩니다.',
    },
  },
  {
    stage: 'claiming',
    description: '보험금 청구 후 입금을 확인하는 단계입니다. 견적금액과 입금액을 관리합니다.',
    conditions: [
      { label: '잔액 0원 (입금액 ≥ 견적금액)', required: true },
    ],
    transition: {
      type: 'auto',
      description: '견적금액을 입력하고, 입금액이 견적금액 이상이 되어 잔액이 0원이 되면 자동으로 "종결" 처리됩니다.',
    },
    tips: '견적금액과 입금액, 입금일자를 입력한 후 "저장" 버튼을 클릭하세요. 잔액이 0원이면 자동 종결됩니다.',
  },
  {
    stage: 'closed',
    description: '모든 절차가 완료된 최종 상태입니다. 더 이상 다음 단계로 전환할 수 없습니다.',
    conditions: [],
    transition: {
      type: 'manual',
      description: '종결 상태입니다. 필요 시 "이전단계로 되돌리기"로 청구중 단계로 복귀할 수 있습니다.',
    },
  },
]

export default function StageGuide() {
  return (
    <div className="stage-guide">
      <h2>단계 전환 매뉴얼</h2>
      <p className="guide-subtitle">
        현장 작업은 7단계로 구성됩니다. 각 단계의 조건을 충족하면 자동 또는 수동으로 다음 단계로 전환됩니다.
      </p>

      {/* 전체 흐름 요약 */}
      <section className="guide-section">
        <h3>전체 흐름</h3>
        <div className="guide-flow">
          {STAGES_ORDER.map((s, i) => (
            <div key={s} className="guide-flow-item">
              <div
                className="guide-flow-dot"
                style={{ background: STAGE_COLORS[s] }}
              />
              <span className="guide-flow-label">{STAGE_LABELS[s]}</span>
              {i < STAGES_ORDER.length - 1 && (
                <span
                  className={`guide-flow-arrow ${STAGE_DATA[i].transition.type}`}
                >
                  →
                </span>
              )}
            </div>
          ))}
        </div>
        <div className="guide-legend">
          <span className="guide-legend-item">
            <span className="legend-arrow auto">→</span> 자동 전환
          </span>
          <span className="guide-legend-item">
            <span className="legend-arrow manual">→</span> 수동 전환 (버튼 클릭)
          </span>
        </div>
      </section>

      {/* 공통 안내 */}
      <section className="guide-section">
        <h3>공통 사항</h3>
        <ul className="guide-common-list">
          <li>모든 단계에서 <strong>"이전단계로 되돌리기"</strong> 버튼으로 한 단계 뒤로 갈 수 있습니다. (신규현장 제외)</li>
          <li><strong>자동 전환</strong>: 조건이 충족되면 데이터 저장 시 자동으로 다음 단계로 넘어갑니다.</li>
          <li><strong>수동 전환</strong>: 조건 충족 후 해당 버튼을 직접 클릭해야 전환됩니다.</li>
          <li>단계가 전환되면 코멘트에 변경 이력이 자동 기록됩니다.</li>
        </ul>
      </section>

      {/* 각 단계별 상세 */}
      <section className="guide-section">
        <h3>단계별 상세</h3>
        {STAGE_DATA.map((info) => (
          <div key={info.stage} className="guide-stage-card">
            <div className="guide-stage-header">
              <span
                className="guide-stage-dot"
                style={{ background: STAGE_COLORS[info.stage] }}
              />
              <h4>{STAGE_LABELS[info.stage]}</h4>
              <span
                className={`guide-transition-badge ${info.transition.type}`}
              >
                {info.transition.type === 'auto' ? '자동' : '수동'}
              </span>
            </div>
            <p className="guide-stage-desc">{info.description}</p>

            {info.conditions.length > 0 && (
              <div className="guide-conditions">
                <span className="guide-conditions-title">전환 조건</span>
                <ul>
                  {info.conditions.map((c, i) => (
                    <li key={i}>
                      <span className={`guide-badge ${c.required ? 'required' : 'optional'}`}>
                        {c.required ? '필수' : '선택'}
                      </span>
                      {c.label}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            <div className="guide-transition-info">
              <span className="guide-conditions-title">전환 방법</span>
              <p>{info.transition.description}</p>
            </div>

            {info.tips && (
              <div className="guide-tips">
                <span className="guide-conditions-title">팁</span>
                <p>{info.tips}</p>
              </div>
            )}
          </div>
        ))}
      </section>
    </div>
  )
}
