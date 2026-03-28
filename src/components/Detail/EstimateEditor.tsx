import { useState, useEffect, useRef } from 'react'
import html2canvas from 'html2canvas'
import type { CodeItem, EstimateItem, EstimateItemType, BizProfile } from '../../types'
import { ITEM_TYPE_LABELS } from '../../types'
import { useAuth } from '../../contexts/AuthContext'
import { listCodeTree } from '../../services/codeService'
import { getEstimate, saveEstimate } from '../../services/estimateService'
import { getOrganization, updateOrganization } from '../../services/orgService'

type Props = {
  jobId: string
  address: string
  onClose: () => void
  onSaved: () => void
  canEdit?: boolean
}

// 섹션 내 아이템 (편집용)
type EditItem = {
  key: string
  itemType: EstimateItemType
  description: string
  codeName: string
  codeItemId: string | null
  unit: string
  quantity: number
  unitPrice: number
}

type Section = {
  name: string
  items: EditItem[]
}

function newKey() {
  return crypto.randomUUID()
}

export default function EstimateEditor({ jobId, address, onClose, onSaved, canEdit = true }: Props) {
  const { organization } = useAuth()
  const [sections, setSections] = useState<Section[]>([])
  const [addressLabel, setAddressLabel] = useState(address + ' 피해세대')
  const [estimateDate, setEstimateDate] = useState(new Date().toISOString().slice(0, 10))
  const [vatType] = useState('V.A.T 별도')
  const [mgmtRate, setMgmtRate] = useState(6)
  const [profitRate, setProfitRate] = useState(15)
  const [roundingTarget, setRoundingTarget] = useState(0)
  const [biz, setBiz] = useState<BizProfile>({
    bizRegistrationNo: '', bizName: '', bizCeo: '', bizAddress: '', bizPhone: '',
  })
  const [editingBiz, setEditingBiz] = useState(false)

  const [laborTree, setLaborTree] = useState<CodeItem[]>([])
  const [materialTree, setMaterialTree] = useState<CodeItem[]>([])
  const [saving, setSaving] = useState(false)
  const [exporting, setExporting] = useState(false)
  const [loading, setLoading] = useState(true)

  // 코드 피커 모달 상태
  const [pickerSectionIdx, setPickerSectionIdx] = useState<number | null>(null)

  const captureRef = useRef<HTMLDivElement>(null)

  // 데이터 로드
  useEffect(() => {
    loadAll()
  }, [jobId])

  const loadAll = async () => {
    setLoading(true)
    try {
      const [lt, mt, est, bizData] = await Promise.all([
        listCodeTree('labor'),
        listCodeTree('material'),
        getEstimate(jobId),
        organization ? getOrganization(organization.id) : Promise.resolve(null),
      ])
      setLaborTree(lt)
      setMaterialTree(mt)
      if (bizData) setBiz({
        bizRegistrationNo: bizData.bizRegistrationNo,
        bizName: bizData.bizName,
        bizCeo: bizData.bizCeo,
        bizAddress: bizData.bizAddress,
        bizPhone: bizData.bizPhone,
      })

      if (est) {
        setAddressLabel(est.addressLabel)
        setEstimateDate(est.estimateDate)
        setMgmtRate(est.mgmtRate)
        setProfitRate(est.profitRate)
        setRoundingTarget(est.roundingTarget)
        // items → sections 변환
        const sectionMap = new Map<string, EditItem[]>()
        const order: string[] = []
        for (const item of est.items) {
          if (!sectionMap.has(item.section)) {
            sectionMap.set(item.section, [])
            order.push(item.section)
          }
          sectionMap.get(item.section)!.push({
            key: newKey(),
            itemType: item.itemType,
            description: item.description,
            codeName: item.codeName,
            codeItemId: item.codeItemId,
            unit: item.unit,
            quantity: item.quantity,
            unitPrice: item.unitPrice,
          })
        }
        setSections(order.map(name => ({ name, items: sectionMap.get(name)! })))
      }
    } catch (err) {
      console.error(err)
    }
    setLoading(false)
  }

  // 섹션 추가
  const addSection = () => {
    const name = prompt('섹션명 입력 (예: 도배공사, 전기공사)')
    if (!name) return
    setSections(prev => [...prev, { name, items: [] }])
  }

  const removeSection = (idx: number) => {
    if (!confirm(`"${sections[idx].name}" 섹션을 삭제하시겠습니까?`)) return
    setSections(prev => prev.filter((_, i) => i !== idx))
  }

  // 코드에서 항목 추가
  const addItemFromCode = (sectionIdx: number, code: CodeItem, itemType: EstimateItemType) => {
    setSections(prev => prev.map((s, i) => {
      if (i !== sectionIdx) return s
      return {
        ...s,
        items: [...s.items, {
          key: newKey(),
          itemType,
          description: s.name,
          codeName: code.name,
          codeItemId: code.id,
          unit: code.unit || (itemType === 'labor' ? '인' : 'ea'),
          quantity: 1,
          unitPrice: code.rate ?? 0,
        }],
      }
    }))
    setPickerSectionIdx(null)
  }

  // 수동 항목 추가
  const addManualItem = (sectionIdx: number, itemType: EstimateItemType) => {
    setSections(prev => prev.map((s, i) => {
      if (i !== sectionIdx) return s
      return {
        ...s,
        items: [...s.items, {
          key: newKey(),
          itemType,
          description: '',
          codeName: '',
          codeItemId: null,
          unit: '',
          quantity: 1,
          unitPrice: 0,
        }],
      }
    }))
  }

  const removeItem = (sectionIdx: number, itemIdx: number) => {
    setSections(prev => prev.map((s, i) => {
      if (i !== sectionIdx) return s
      return { ...s, items: s.items.filter((_, j) => j !== itemIdx) }
    }))
  }

  const updateItem = (
    sectionIdx: number,
    itemIdx: number,
    field: keyof EditItem,
    value: string | number,
  ) => {
    setSections(prev => prev.map((s, i) => {
      if (i !== sectionIdx) return s
      return {
        ...s,
        items: s.items.map((item, j) => j !== itemIdx ? item : { ...item, [field]: value }),
      }
    }))
  }

  // 금액 계산
  const allItems = sections.flatMap(s => s.items)
  const subtotal = allItems.reduce((sum, item) => sum + Math.round(item.quantity * item.unitPrice), 0)
  const mgmtAmount = Math.round(subtotal * mgmtRate / 100)
  const profitAmount = Math.round(subtotal * profitRate / 100)
  const beforeRounding = subtotal + mgmtAmount + profitAmount
  const roundingAdj = roundingTarget > 0 ? roundingTarget - beforeRounding : 0
  const grandTotal = roundingTarget > 0 ? roundingTarget : beforeRounding

  // 저장
  const handleSave = async () => {
    setSaving(true)
    try {
      // 사업자 정보 저장
      if (organization) await updateOrganization(organization.id, biz)

      let sortOrder = 0
      const items: Omit<EstimateItem, 'id'>[] = sections.flatMap(s =>
        s.items.map(item => ({
          section: s.name,
          itemType: item.itemType,
          description: item.description,
          codeName: item.codeName,
          codeItemId: item.codeItemId,
          unit: item.unit,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          amount: Math.round(item.quantity * item.unitPrice),
          note: '',
          sortOrder: sortOrder++,
        })),
      )
      await saveEstimate(jobId, {
        addressLabel,
        estimateDate,
        vatType,
        mgmtRate,
        profitRate,
        roundingTarget,
      }, items)
      onSaved()
    } catch (err) {
      alert(err instanceof Error ? err.message : '저장 실패')
    } finally {
      setSaving(false)
    }
  }

  // 이미지 다운로드
  const handleDownload = async () => {
    if (!captureRef.current) return
    setExporting(true)
    try {
      const canvas = await html2canvas(captureRef.current, { backgroundColor: '#fff', scale: 2 })
      const link = document.createElement('a')
      link.download = '견적서.png'
      link.href = canvas.toDataURL('image/png')
      link.click()
    } catch {
      alert('이미지 생성 실패')
    } finally {
      setExporting(false)
    }
  }

  const fmt = (n: number) => n.toLocaleString()

  return (
    <div className="est-overlay" onClick={onClose}>
      <div className="est-modal" onClick={e => e.stopPropagation()}>
        {/* 헤더 */}
        <div className="est-header">
          <h3>견적서</h3>
          <div className="est-header-actions">
            {canEdit && <button className="btn-primary" onClick={addSection}>+ 섹션 추가</button>}
            <button className="btn-close-modal" onClick={onClose}>✕</button>
          </div>
        </div>

        {loading ? (
          <div className="est-body"><div className="fp-empty"><div className="loading-spinner" /><p>로딩 중...</p></div></div>
        ) : (
          <div className="est-body" ref={captureRef}>
            {/* 견적서 제목 */}
            <div className="est-title-row">견 적 서</div>

            {/* 상단 정보 */}
            <div className="est-info-row">
              <div className="est-info-left">
                <div className="est-info-field">
                  <input className="est-addr-input" value={addressLabel} onChange={e => setAddressLabel(e.target.value)} />
                  <span className="est-info-static">귀중</span>
                </div>
                <div className="est-info-field">
                  <span>하기와 같이 견적 합니다.</span>
                </div>
                <div className="est-info-field">
                  <span>일금: </span>
                  <strong>{numberToKorean(grandTotal)}원정</strong>
                </div>
                <div className="est-info-field">
                  <span>{vatType}</span>
                </div>
              </div>
              <div className="est-info-right">
                <div className="est-info-field">
                  <span>날짜:</span>
                  <input type="date" className="est-date-input" value={estimateDate} onChange={e => setEstimateDate(e.target.value)} />
                </div>
                <table className="est-biz-table">
                  <tbody>
                    <tr><th>사업자등록번호</th><td>
                      {editingBiz ? <input className="est-biz-input" value={biz.bizRegistrationNo} onChange={e => setBiz({...biz, bizRegistrationNo: e.target.value})} /> : biz.bizRegistrationNo || '-'}
                    </td></tr>
                    <tr><th>상호</th><td>
                      {editingBiz ? <input className="est-biz-input" value={biz.bizName} onChange={e => setBiz({...biz, bizName: e.target.value})} /> : biz.bizName || '-'}
                    </td></tr>
                    <tr><th>대표</th><td>
                      {editingBiz ? <input className="est-biz-input" value={biz.bizCeo} onChange={e => setBiz({...biz, bizCeo: e.target.value})} /> : biz.bizCeo || '-'}
                    </td></tr>
                    <tr><th>주소</th><td>
                      {editingBiz ? <input className="est-biz-input" value={biz.bizAddress} onChange={e => setBiz({...biz, bizAddress: e.target.value})} /> : biz.bizAddress || '-'}
                    </td></tr>
                    <tr><th>전화</th><td>
                      {editingBiz ? <input className="est-biz-input" value={biz.bizPhone} onChange={e => setBiz({...biz, bizPhone: e.target.value})} /> : biz.bizPhone || '-'}
                    </td></tr>
                  </tbody>
                </table>
              </div>
            </div>

            {/* 견적 테이블 */}
            <table className="est-table">
              <thead>
                <tr>
                  <th className="est-col-type">명세</th>
                  <th className="est-col-desc">내용</th>
                  <th className="est-col-code">자재 및 품셈</th>
                  <th className="est-col-unit">규격</th>
                  <th className="est-col-qty">수량</th>
                  <th className="est-col-price">단가</th>
                  <th className="est-col-amount">금액</th>
                  <th className="est-col-action"></th>
                </tr>
              </thead>
              <tbody>
                {sections.map((section, si) => (
                  <SectionBlock
                    key={`${section.name}-${si}`}
                    section={section}
                    sectionIdx={si}
                    onOpenPicker={setPickerSectionIdx}
                    onAddManual={addManualItem}
                    onUpdateItem={updateItem}
                    onRemoveItem={removeItem}
                    onRemoveSection={() => removeSection(si)}
                    fmt={fmt}
                  />
                ))}

                {/* 소계 */}
                {sections.length > 0 && (
                  <>
                    <tr className="est-subtotal-row">
                      <td colSpan={6} className="est-subtotal-label">소계</td>
                      <td className="est-amount-cell">{fmt(subtotal)}</td>
                      <td></td>
                    </tr>
                    {/* 기업이윤 */}
                    <tr className="est-section-header"><td colSpan={8}>기업이윤</td></tr>
                    <tr>
                      <td>기타</td>
                      <td>일반관리비</td>
                      <td></td>
                      <td></td>
                      <td>
                        <input type="number" className="est-input est-input-sm"
                          value={mgmtRate} onChange={e => setMgmtRate(Number(e.target.value) || 0)} />%
                      </td>
                      <td className="est-amount-cell">{fmt(mgmtAmount)}</td>
                      <td className="est-amount-cell">{fmt(mgmtAmount)}</td>
                      <td></td>
                    </tr>
                    <tr>
                      <td>기타</td>
                      <td>기업이윤</td>
                      <td></td>
                      <td></td>
                      <td>
                        <input type="number" className="est-input est-input-sm"
                          value={profitRate} onChange={e => setProfitRate(Number(e.target.value) || 0)} />%
                      </td>
                      <td className="est-amount-cell">{fmt(profitAmount)}</td>
                      <td className="est-amount-cell">{fmt(profitAmount)}</td>
                      <td></td>
                    </tr>
                    <tr>
                      <td></td>
                      <td>단수정리</td>
                      <td></td>
                      <td></td>
                      <td></td>
                      <td></td>
                      <td className="est-amount-cell">{roundingAdj !== 0 ? fmt(roundingAdj) : '-'}</td>
                      <td></td>
                    </tr>
                    <tr>
                      <td colSpan={5}>
                        목표금액:
                        <input type="number" className="est-input" style={{width:120, marginLeft:8}}
                          placeholder="0이면 자동"
                          value={roundingTarget || ''}
                          onChange={e => setRoundingTarget(Number(e.target.value) || 0)} />
                      </td>
                      <td></td>
                      <td></td>
                      <td></td>
                    </tr>
                    {/* 합계 */}
                    <tr className="est-grand-total-row">
                      <td colSpan={6}>합 계</td>
                      <td className="est-amount-cell">{fmt(grandTotal)}</td>
                      <td>{vatType}</td>
                    </tr>
                  </>
                )}
              </tbody>
            </table>
          </div>
        )}

        {/* 코드 피커 모달 */}
        {pickerSectionIdx !== null && (
          <CascadePickerModal
            laborTree={laborTree}
            materialTree={materialTree}
            onSelect={(code, type) => addItemFromCode(pickerSectionIdx, code, type)}
            onClose={() => setPickerSectionIdx(null)}
          />
        )}

        {/* 푸터 */}
        <div className="est-footer">
          <button className="btn-secondary" onClick={handleDownload} disabled={exporting || sections.length === 0}>
            {exporting ? '생성 중...' : '이미지 다운로드'}
          </button>
          <div className="est-footer-right">
            <button className="btn-secondary" onClick={onClose}>닫기</button>
            {canEdit && (
              <button className="btn-primary" onClick={handleSave} disabled={saving || sections.length === 0}>
                {saving ? '저장 중...' : '저장'}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

// 섹션 블록 (인라인 피커 제거, 모달 피커 사용)
function SectionBlock({
  section, sectionIdx,
  onOpenPicker, onAddManual, onUpdateItem, onRemoveItem, onRemoveSection, fmt,
}: {
  section: Section
  sectionIdx: number
  onOpenPicker: (si: number) => void
  onAddManual: (si: number, type: EstimateItemType) => void
  onUpdateItem: (si: number, ii: number, field: keyof EditItem, value: string | number) => void
  onRemoveItem: (si: number, ii: number) => void
  onRemoveSection: () => void
  fmt: (n: number) => string
}) {
  return (
    <>
      <tr className="est-section-header">
        <td colSpan={8}>
          <div className="est-section-header-inner">
            <span>{section.name}</span>
            <div className="est-section-actions">
              <button className="btn-tiny" onClick={() => onOpenPicker(sectionIdx)}>+ 항목</button>
              <button className="btn-tiny" onClick={() => onAddManual(sectionIdx, 'expense')}>+ 수동</button>
              <button className="btn-tiny" onClick={onRemoveSection}>삭제</button>
            </div>
          </div>
        </td>
      </tr>

      {section.items.map((item, ii) => {
        const amount = Math.round(item.quantity * item.unitPrice)
        return (
          <tr key={item.key}>
            <td>{ITEM_TYPE_LABELS[item.itemType]}</td>
            <td>
              <input className="est-input" value={item.description}
                onChange={e => onUpdateItem(sectionIdx, ii, 'description', e.target.value)} />
            </td>
            <td>
              {item.codeItemId
                ? <span className="est-code-tag">{item.codeName}</span>
                : <input className="est-input" value={item.codeName}
                    onChange={e => onUpdateItem(sectionIdx, ii, 'codeName', e.target.value)} />
              }
            </td>
            <td>
              <input className="est-input est-input-sm" value={item.unit}
                onChange={e => onUpdateItem(sectionIdx, ii, 'unit', e.target.value)} />
            </td>
            <td>
              <input type="number" className="est-input est-input-sm" value={item.quantity || ''}
                onChange={e => onUpdateItem(sectionIdx, ii, 'quantity', Number(e.target.value) || 0)} />
            </td>
            <td>
              <input type="text" className="est-input est-input-num"
                value={item.unitPrice ? item.unitPrice.toLocaleString() : ''}
                onChange={e => onUpdateItem(sectionIdx, ii, 'unitPrice', Number(e.target.value.replace(/,/g, '')) || 0)} />
            </td>
            <td className="est-amount-cell">{amount > 0 ? fmt(amount) : ''}</td>
            <td>
              <button className="btn-remove-row" onClick={() => onRemoveItem(sectionIdx, ii)}>×</button>
            </td>
          </tr>
        )
      })}
    </>
  )
}

// 캐스케이딩 코드 피커 모달 (동적 깊이)
function CascadePickerModal({
  laborTree,
  materialTree,
  onSelect,
  onClose,
}: {
  laborTree: CodeItem[]
  materialTree: CodeItem[]
  onSelect: (code: CodeItem, type: EstimateItemType) => void
  onClose: () => void
}) {
  const [activeType, setActiveType] = useState<'labor' | 'material'>('labor')
  // 선택 경로: 각 단계에서 선택한 항목 배열
  const [selections, setSelections] = useState<CodeItem[]>([])

  const tree = activeType === 'labor' ? laborTree : materialTree

  const switchType = (type: 'labor' | 'material') => {
    setActiveType(type)
    setSelections([])
  }

  // n번째 단계 선택
  const selectAt = (depth: number, item: CodeItem) => {
    setSelections(prev => [...prev.slice(0, depth), item])
  }

  // 각 단계의 목록 계산
  const columns: { items: CodeItem[]; selectedId: string | null }[] = []
  // 0단계: 루트
  columns.push({ items: tree, selectedId: selections[0]?.id ?? null })
  // 이후 단계: 선택된 항목의 children
  for (let i = 0; i < selections.length; i++) {
    const children = selections[i].children ?? []
    if (children.length > 0) {
      columns.push({ items: children, selectedId: selections[i + 1]?.id ?? null })
    }
  }

  // 마지막 선택 항목이 leaf인지 확인
  const lastSel = selections[selections.length - 1]
  const isLeaf = lastSel && (!lastSel.children || lastSel.children.length === 0)

  // 경로 표시
  const path = [
    activeType === 'labor' ? '인건비' : '자재비',
    ...selections.map(s => s.name),
  ].join(' > ')

  return (
    <div className="cascade-overlay" onClick={onClose}>
      <div className="cascade-modal" onClick={e => e.stopPropagation()}>
        <div className="cascade-header">
          <h4>코드 선택</h4>
          <div className="cascade-tabs">
            <button
              className={`cascade-tab ${activeType === 'labor' ? 'active' : ''}`}
              onClick={() => switchType('labor')}
            >인건비 코드</button>
            <button
              className={`cascade-tab ${activeType === 'material' ? 'active' : ''}`}
              onClick={() => switchType('material')}
            >자재비 코드</button>
          </div>
          <button className="btn-close-modal" onClick={onClose}>✕</button>
        </div>

        <div className="cascade-path">{path}</div>

        <div className="cascade-columns">
          {columns.map((col, ci) => (
            <div key={ci} className={`cascade-col ${ci === columns.length - 1 && isLeaf ? 'cascade-col-leaf' : ''}`}>
              {col.items.map(item => {
                const hasChildren = item.children && item.children.length > 0
                const isSelected = col.selectedId === item.id
                const itemIsLeaf = !hasChildren

                if (itemIsLeaf) {
                  return (
                    <button
                      key={item.id}
                      className="cascade-leaf-btn"
                      onClick={() => { onSelect(item, activeType); onClose() }}
                    >
                      <span>{item.name}</span>
                      {item.rate != null && item.rate > 0 && (
                        <span className="cascade-rate">{item.rate.toLocaleString()}원</span>
                      )}
                    </button>
                  )
                }

                return (
                  <button
                    key={item.id}
                    className={`cascade-item ${isSelected ? 'active' : ''}`}
                    onClick={() => selectAt(ci, item)}
                  >
                    {item.name}
                    <span className="cascade-arrow">›</span>
                  </button>
                )
              })}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

// 숫자 → 한글 금액
function numberToKorean(n: number): string {
  if (n === 0) return '영'
  const units = ['', '만', '억', '조']
  const digits = ['', '일', '이', '삼', '사', '오', '육', '칠', '팔', '구']
  const subUnits = ['', '십', '백', '천']
  let result = ''
  let groupIdx = 0
  let num = Math.abs(Math.round(n))

  while (num > 0) {
    const group = num % 10000
    if (group > 0) {
      let groupStr = ''
      let g = group
      for (let i = 0; i < 4 && g > 0; i++) {
        const d = g % 10
        if (d > 0) {
          groupStr = (d === 1 && i > 0 ? '' : digits[d]) + subUnits[i] + groupStr
        }
        g = Math.floor(g / 10)
      }
      result = groupStr + units[groupIdx] + result
    }
    num = Math.floor(num / 10000)
    groupIdx++
  }
  return (n < 0 ? '마이너스 ' : '') + result
}
