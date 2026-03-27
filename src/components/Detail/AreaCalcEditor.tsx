import { useState, useEffect, useCallback, useRef } from 'react'
import html2canvas from 'html2canvas'
import type { CodeItem, AreaEntry } from '../../types'
import { listCodeTree } from '../../services/codeService'
import { saveAreaEntries } from '../../services/areaCalcService'

type JobInfo = {
  insurer: string
  accidentNo: string
  address: string
}

type Props = {
  jobId: string
  jobInfo: JobInfo
  existing: AreaEntry[]
  onClose: () => void
  onSaved: () => void
}

type Row = {
  scope: string
  workType: string
  damageWidth: number
  damageHeight: number
  restoreWidth: number
  restoreHeight: number
}

type Block = {
  room: string
  templateName: string
  rows: Row[]
}

// 기존 저장 데이터 → Block[] 변환
function entriesToBlocks(entries: AreaEntry[]): Block[] {
  const map = new Map<string, Row[]>()
  const order: string[] = []
  for (const e of entries) {
    if (!map.has(e.room)) {
      map.set(e.room, [])
      order.push(e.room)
    }
    map.get(e.room)!.push({
      scope: e.scope,
      workType: e.workType,
      damageWidth: e.damageWidth,
      damageHeight: e.damageHeight,
      restoreWidth: e.restoreWidth,
      restoreHeight: e.restoreHeight,
    })
  }
  return order.map(room => ({ room, templateName: '', rows: map.get(room)! }))
}

// 버튼 기준 fixed 위치 드롭다운
function FixedDropdown({
  anchorRef,
  children,
  onClose,
}: {
  anchorRef: React.RefObject<HTMLButtonElement | null>
  children: React.ReactNode
  onClose: () => void
}) {
  const [style, setStyle] = useState<React.CSSProperties>({ top: 0, left: 0 })

  useEffect(() => {
    if (anchorRef.current) {
      const rect = anchorRef.current.getBoundingClientRect()
      const vw = window.innerWidth
      // 버튼이 화면 왼쪽 절반이면 오른쪽으로, 오른쪽이면 왼쪽으로 펼침
      if (rect.left < vw / 2) {
        setStyle({ top: rect.bottom + 4, left: rect.left })
      } else {
        setStyle({ top: rect.bottom + 4, right: vw - rect.right })
      }
    }
  }, [anchorRef])

  return (
    <>
      <div className="fixed-dropdown-backdrop" onClick={onClose} />
      <div
        className="area-calc-picker-dropdown fixed-dropdown"
        style={style}
      >
        {children}
      </div>
    </>
  )
}

export default function AreaCalcEditor({ jobId, jobInfo, existing, onClose, onSaved }: Props) {
  const [templates, setTemplates] = useState<CodeItem[]>([])
  const [roomTree, setRoomTree] = useState<CodeItem[]>([])
  const [blocks, setBlocks] = useState<Block[]>([])
  const [saving, setSaving] = useState(false)
  const [showPicker, setShowPicker] = useState(false)
  const [exporting, setExporting] = useState(false)
  const [dispatcher, setDispatcher] = useState('')
  const [receiptNo, setReceiptNo] = useState(jobInfo.accidentNo || '')
  const captureRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    Promise.all([
      listCodeTree('area'),
      listCodeTree('area_room'),
    ]).then(([t, r]) => {
      setTemplates(t)
      setRoomTree(r)
    }).catch(console.error)
  }, [])

  useEffect(() => {
    if (existing.length > 0) {
      setBlocks(entriesToBlocks(existing))
    }
  }, [existing])

  const findTemplate = useCallback((categoryName: string): CodeItem | undefined => {
    return templates.find(t => t.name === categoryName)
  }, [templates])

  const addBlock = useCallback((roomName: string, categoryName: string) => {
    const tmpl = findTemplate(categoryName)
    if (!tmpl) return
    setBlocks(prev => [...prev, {
      room: roomName,
      templateName: categoryName,
      rows: [],
    }])
    setShowPicker(false)
  }, [findTemplate])

  const removeBlock = (idx: number) => {
    if (!confirm(`"${blocks[idx].room}" 블록을 삭제하시겠습니까?`)) return
    setBlocks(prev => prev.filter((_, i) => i !== idx))
  }

  const addScope = (blockIdx: number, scopeName: string, firstWorkType: string) => {
    setBlocks(prev => prev.map((b, bi) => {
      if (bi !== blockIdx) return b
      return {
        ...b,
        rows: [...b.rows, {
          scope: scopeName,
          workType: firstWorkType,
          damageWidth: 0, damageHeight: 0,
          restoreWidth: 0, restoreHeight: 0,
        }],
      }
    }))
  }

  const addWorkType = (blockIdx: number, scopeName: string, workTypeName: string) => {
    setBlocks(prev => prev.map((b, bi) => {
      if (bi !== blockIdx) return b
      let lastIdx = -1
      for (let i = 0; i < b.rows.length; i++) {
        if (b.rows[i].scope === scopeName) lastIdx = i
      }
      const newRow: Row = {
        scope: scopeName,
        workType: workTypeName,
        damageWidth: 0, damageHeight: 0,
        restoreWidth: 0, restoreHeight: 0,
      }
      const newRows = [...b.rows]
      newRows.splice(lastIdx + 1, 0, newRow)
      return { ...b, rows: newRows }
    }))
  }

  const removeRow = (blockIdx: number, rowIdx: number) => {
    setBlocks(prev => prev.map((b, bi) => {
      if (bi !== blockIdx) return b
      return { ...b, rows: b.rows.filter((_, ri) => ri !== rowIdx) }
    }))
  }

  const updateRow = (
    blockIdx: number,
    rowIdx: number,
    field: 'damageWidth' | 'damageHeight' | 'restoreWidth' | 'restoreHeight',
    value: number,
  ) => {
    setBlocks(prev => prev.map((b, bi) => {
      if (bi !== blockIdx) return b
      return {
        ...b,
        rows: b.rows.map((r, ri) => ri !== rowIdx ? r : { ...r, [field]: value }),
      }
    }))
  }

  const handleSave = async () => {
    setSaving(true)
    try {
      let sortOrder = 0
      const entries = blocks.flatMap(block =>
        block.rows.map(row => ({
          room: block.room,
          scope: row.scope,
          workType: row.workType,
          damageWidth: row.damageWidth,
          damageHeight: row.damageHeight,
          damageArea: round2(row.damageWidth * row.damageHeight),
          restoreWidth: row.restoreWidth,
          restoreHeight: row.restoreHeight,
          restoreArea: round2(row.restoreWidth * row.restoreHeight),
          note: '',
          sortOrder: sortOrder++,
        })),
      )
      await saveAreaEntries(jobId, entries)
      onSaved()
    } catch (err) {
      alert(err instanceof Error ? err.message : '저장 실패')
    } finally {
      setSaving(false)
    }
  }

  const handleDownloadImage = async () => {
    if (!captureRef.current) return
    setExporting(true)
    try {
      const canvas = await html2canvas(captureRef.current, {
        backgroundColor: '#ffffff',
        scale: 2,
      })
      const link = document.createElement('a')
      link.download = '피해복구면적산출표.png'
      link.href = canvas.toDataURL('image/png')
      link.click()
    } catch (err) {
      alert('이미지 생성 실패')
    } finally {
      setExporting(false)
    }
  }

  const usedRooms = new Set(blocks.map(b => b.room))

  return (
    <div className="area-calc-overlay" onClick={onClose}>
      <div className="area-calc-modal" onClick={e => e.stopPropagation()}>
        <div className="area-calc-header">
          <h3>피해복구면적산출표</h3>
          <div className="area-calc-header-actions">
            <div className="area-calc-picker-wrap">
              <button
                className="btn-primary"
                onClick={() => setShowPicker(!showPicker)}
              >
                + 장소 추가
              </button>
              {showPicker && (
                <RoomPicker
                  roomTree={roomTree}
                  usedRooms={usedRooms}
                  onSelect={addBlock}
                />
              )}
            </div>
            <button className="btn-close-modal" onClick={onClose}>
              ✕
            </button>
          </div>
        </div>

        <div className="area-calc-body" ref={captureRef}>
          <div className="area-calc-info-header">
            <div className="area-calc-info-title">현장 피해/복구 면적 산출표</div>
            <table className="area-calc-info-table">
              <tbody>
                <tr>
                  <th>보험사</th>
                  <td>{jobInfo.insurer}</td>
                  <th>접수번호</th>
                  <td>
                    <input
                      type="text"
                      className="area-info-input"
                      placeholder="접수번호 입력"
                      value={receiptNo}
                      onChange={e => setReceiptNo(e.target.value)}
                    />
                  </td>
                  <th>출동자</th>
                  <td>
                    <input
                      type="text"
                      className="area-info-input"
                      placeholder="출동자명 입력"
                      value={dispatcher}
                      onChange={e => setDispatcher(e.target.value)}
                    />
                  </td>
                </tr>
                <tr>
                  <th>주소</th>
                  <td colSpan={3}>{jobInfo.address}</td>
                  <th>작성일자</th>
                  <td>{new Date().toISOString().slice(0, 10)}</td>
                </tr>
              </tbody>
            </table>
          </div>

          {blocks.length === 0 ? (
            <div className="area-calc-empty">
              "장소 추가" 버튼을 눌러 장소를 선택하세요.
            </div>
          ) : (
            blocks.map((block, bi) => (
              <BlockTable
                key={`${block.room}-${bi}`}
                block={block}
                blockIdx={bi}
                template={findTemplate(block.templateName)}
                onUpdateRow={updateRow}
                onAddScope={addScope}
                onAddWorkType={addWorkType}
                onRemoveRow={removeRow}
                onRemove={() => removeBlock(bi)}
              />
            ))
          )}
          {blocks.length > 0 && <SummaryTable blocks={blocks} />}
        </div>

        <div className="area-calc-footer">
          <button
            className="btn-secondary"
            onClick={handleDownloadImage}
            disabled={exporting || blocks.length === 0}
          >
            {exporting ? '생성 중...' : '이미지 다운로드'}
          </button>
          <div className="area-calc-footer-right">
            <button className="btn-secondary" onClick={onClose}>닫기</button>
            <button
              className="btn-primary"
              onClick={handleSave}
              disabled={saving || blocks.length === 0}
            >
              {saving ? '저장 중...' : '저장'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

function RoomPicker({
  roomTree,
  usedRooms,
  onSelect,
}: {
  roomTree: CodeItem[]
  usedRooms: Set<string>
  onSelect: (roomName: string, categoryName: string) => void
}) {
  return (
    <div className="area-calc-picker-dropdown">
      {roomTree.map(category => (
        <div key={category.id} className="picker-group">
          <div className="picker-group-label">{category.name}</div>
          {(category.children || []).map(room => (
            <button
              key={room.id}
              className="area-calc-picker-item"
              disabled={usedRooms.has(room.name)}
              onClick={() => onSelect(room.name, category.name)}
            >
              {room.name}
              {usedRooms.has(room.name) && ' (추가됨)'}
            </button>
          ))}
        </div>
      ))}
      {roomTree.length === 0 && (
        <div className="area-calc-picker-item" style={{ color: '#999' }}>
          장소 코드를 먼저 등록하세요
        </div>
      )}
    </div>
  )
}

function BlockTable({
  block,
  blockIdx,
  template,
  onUpdateRow,
  onAddScope,
  onAddWorkType,
  onRemoveRow,
  onRemove,
}: {
  block: Block
  blockIdx: number
  template: CodeItem | undefined
  onUpdateRow: (bi: number, ri: number, field: 'damageWidth' | 'damageHeight' | 'restoreWidth' | 'restoreHeight', v: number) => void
  onAddScope: (bi: number, scopeName: string, firstWorkType: string) => void
  onAddWorkType: (bi: number, scopeName: string, workTypeName: string) => void
  onRemoveRow: (bi: number, ri: number) => void
  onRemove: () => void
}) {
  const [showScopePicker, setShowScopePicker] = useState(false)
  const [showWorkTypePicker, setShowWorkTypePicker] = useState<string | null>(null)
  const scopeBtnRef = useRef<HTMLButtonElement>(null)
  const workTypeBtnRefs = useRef<Map<string, HTMLButtonElement>>(new Map())

  const scopeGroups: { scope: string; startIdx: number; count: number }[] = []
  let prevScope = ''
  for (let i = 0; i < block.rows.length; i++) {
    const s = block.rows[i].scope
    if (s !== prevScope) {
      scopeGroups.push({ scope: s, startIdx: i, count: 1 })
      prevScope = s
    } else {
      scopeGroups[scopeGroups.length - 1].count++
    }
  }

  const isScopeStart = (idx: number) => scopeGroups.some(g => g.startIdx === idx)
  const scopeSpan = (idx: number) => scopeGroups.find(g => g.startIdx === idx)?.count ?? 1

  const usedScopes = new Set(block.rows.map(r => r.scope))
  const usedWorkTypes = new Set(block.rows.map(r => `${r.scope}::${r.workType}`))

  const availableScopes = (template?.children || []).filter(s => !usedScopes.has(s.name))

  const getAvailableWorkTypes = (scopeName: string) => {
    const scopeNode = (template?.children || []).find(s => s.name === scopeName)
    if (!scopeNode) return []
    if (!scopeNode.children?.length) return []
    return scopeNode.children.filter(wt => !usedWorkTypes.has(`${scopeName}::${wt.name}`))
  }

  return (
    <div className="area-block">
      <div className="area-block-header">
        <span className="area-block-title">{block.room}</span>
        <div className="area-block-actions">
          <button
            ref={scopeBtnRef}
            className="btn-tiny btn-add-scope"
            onClick={() => { setShowScopePicker(!showScopePicker); setShowWorkTypePicker(null) }}
            disabled={availableScopes.length === 0}
          >
            + 구분 추가
          </button>
          {showScopePicker && (
            <FixedDropdown anchorRef={scopeBtnRef} onClose={() => setShowScopePicker(false)}>
              {availableScopes.map(scope => (
                <button
                  key={scope.id}
                  className="area-calc-picker-item"
                  onClick={() => {
                    const firstWt = scope.children?.[0]?.name ?? scope.name
                    onAddScope(blockIdx, scope.name, firstWt)
                    setShowScopePicker(false)
                  }}
                >
                  {scope.name}
                </button>
              ))}
            </FixedDropdown>
          )}
          <button className="btn-tiny" onClick={onRemove}>삭제</button>
        </div>
      </div>

      {block.rows.length === 0 ? (
        <div className="area-block-empty">
          "구분 추가" 버튼으로 공사 구분을 선택하세요.
        </div>
      ) : (
        <table className="area-table">
          <thead>
            <tr>
              <th rowSpan={2}>구분</th>
              <th rowSpan={2}>공사내용</th>
              <th colSpan={3}>피해면적</th>
              <th colSpan={3}>복구면적</th>
              <th rowSpan={2} className="area-th-action"></th>
            </tr>
            <tr>
              <th>가로</th><th>세로</th><th>면적</th>
              <th>가로</th><th>세로</th><th>면적</th>
            </tr>
          </thead>
          <tbody>
            {block.rows.map((row, ri) => {
              const dArea = round2(row.damageWidth * row.damageHeight)
              const rArea = round2(row.restoreWidth * row.restoreHeight)
              const isStart = isScopeStart(ri)
              const span = scopeSpan(ri)
              const availWt = getAvailableWorkTypes(row.scope)
              return (
                <tr key={ri}>
                  {isStart && (
                    <td className="area-scope-cell" rowSpan={span}>
                      <div className="scope-cell-content">
                        <span>{row.scope}</span>
                        {availWt.length > 0 && (
                          <>
                            <button
                              ref={el => { if (el) workTypeBtnRefs.current.set(row.scope, el) }}
                              className="btn-add-line"
                              onClick={() => setShowWorkTypePicker(
                                showWorkTypePicker === row.scope ? null : row.scope
                              )}
                              title="라인 추가"
                            >
                              +
                            </button>
                            {showWorkTypePicker === row.scope && (
                              <FixedDropdown
                                anchorRef={{ current: workTypeBtnRefs.current.get(row.scope) ?? null }}
                                onClose={() => setShowWorkTypePicker(null)}
                              >
                                {availWt.map(wt => (
                                  <button
                                    key={wt.id}
                                    className="area-calc-picker-item"
                                    onClick={() => {
                                      onAddWorkType(blockIdx, row.scope, wt.name)
                                      setShowWorkTypePicker(null)
                                    }}
                                  >
                                    {wt.name}
                                  </button>
                                ))}
                              </FixedDropdown>
                            )}
                          </>
                        )}
                      </div>
                    </td>
                  )}
                  <td className="area-worktype-cell">{row.workType}</td>
                  <td>
                    <input type="number" className="area-input"
                      value={row.damageWidth || ''}
                      onChange={e => onUpdateRow(blockIdx, ri, 'damageWidth', num(e.target.value))}
                    />
                  </td>
                  <td>
                    <input type="number" className="area-input"
                      value={row.damageHeight || ''}
                      onChange={e => onUpdateRow(blockIdx, ri, 'damageHeight', num(e.target.value))}
                    />
                  </td>
                  <td className={`area-calc-cell ${dArea > 0 ? 'has-value' : ''}`}>
                    {dArea > 0 ? dArea : ''}
                  </td>
                  <td>
                    <input type="number" className="area-input"
                      value={row.restoreWidth || ''}
                      onChange={e => onUpdateRow(blockIdx, ri, 'restoreWidth', num(e.target.value))}
                    />
                  </td>
                  <td>
                    <input type="number" className="area-input"
                      value={row.restoreHeight || ''}
                      onChange={e => onUpdateRow(blockIdx, ri, 'restoreHeight', num(e.target.value))}
                    />
                  </td>
                  <td className={`area-calc-cell restore ${rArea > 0 ? 'has-value' : ''}`}>
                    {rArea > 0 ? rArea : ''}
                  </td>
                  <td className="area-row-action">
                    <button
                      className="btn-remove-row"
                      onClick={() => onRemoveRow(blockIdx, ri)}
                      title="행 삭제"
                    >
                      ×
                    </button>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      )}
    </div>
  )
}

// 현장 실측 정보 SUMMARY – 구분(공사내용) 기준 합산
function SummaryTable({ blocks }: { blocks: Block[] }) {
  const summaryMap = new Map<string, { damageArea: number; restoreArea: number }>()

  for (const block of blocks) {
    for (const row of block.rows) {
      const key = `${row.scope}(${row.workType})`
      const prev = summaryMap.get(key) || { damageArea: 0, restoreArea: 0 }
      prev.damageArea += round2(row.damageWidth * row.damageHeight)
      prev.restoreArea += round2(row.restoreWidth * row.restoreHeight)
      summaryMap.set(key, prev)
    }
  }

  if (summaryMap.size === 0) return null

  const entries = Array.from(summaryMap.entries())

  return (
    <div className="area-summary">
      <div className="area-summary-title">현장 실측 정보 SUMMARY</div>
      <table className="area-table area-summary-table">
        <thead>
          <tr>
            <th>공사내용</th>
            <th>피해면적</th>
            <th>복구면적</th>
          </tr>
        </thead>
        <tbody>
          {entries.map(([key, val]) => (
            <tr key={key}>
              <td className="area-worktype-cell">{key}</td>
              <td className={`area-calc-cell ${val.damageArea > 0 ? 'has-value' : ''}`}>
                {round2(val.damageArea)}
              </td>
              <td className={`area-calc-cell restore ${val.restoreArea > 0 ? 'has-value' : ''}`}>
                {round2(val.restoreArea)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function num(v: string): number {
  const n = parseFloat(v)
  return isNaN(n) ? 0 : n
}

function round2(v: number): number {
  return Math.round(v * 100) / 100
}
