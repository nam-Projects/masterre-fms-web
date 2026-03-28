import { useState, useEffect, useCallback } from 'react'
import type { CodeItem, CodeType } from '../../types'
import { CODE_TYPE_LABELS } from '../../types'
import { useAuth } from '../../contexts/AuthContext'
import {
  listCodeTree,
  createCodeItem,
  updateCodeItem,
  deleteCodeItem,
  updateRate,
  getRateHistory,
  type RateHistoryEntry,
} from '../../services/codeService'

const CODE_TYPES: CodeType[] = ['area', 'area_room', 'labor', 'material']

export default function CodeManagement() {
  const { orgRole, isSuper } = useAuth()
  const canEdit = isSuper || orgRole === 'owner' || orgRole === 'manager'
  const [tab, setTab] = useState<CodeType>('area')
  const [tree, setTree] = useState<CodeItem[]>([])
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      setTree(await listCodeTree(tab))
    } catch (e) {
      console.error(e)
    }
    setLoading(false)
  }, [tab])

  useEffect(() => { load() }, [load])

  return (
    <div className="code-management">
      <h2>코드관리</h2>
      <div className="code-tabs">
        {CODE_TYPES.map(t => (
          <button
            key={t}
            className={`code-tab ${tab === t ? 'active' : ''}`}
            onClick={() => setTab(t)}
          >
            {CODE_TYPE_LABELS[t]}
          </button>
        ))}
      </div>
      <div className="code-tab-content">
        {loading ? (
          <div className="code-loading">로딩 중...</div>
        ) : (
          <div className="code-tree-wrap">
            <div className="code-tree-header">
              <span className="code-table-title">{CODE_TYPE_LABELS[tab]}</span>
              {canEdit && (
                <button
                  className="btn-code-add"
                  onClick={async () => {
                    const name = prompt('최상위 항목 이름을 입력하세요')
                    if (!name) return
                    await createCodeItem({ codeType: tab, parentId: null, name, sortOrder: tree.length + 1 })
                    load()
                  }}
                >
                  + 최상위 항목 추가
                </button>
              )}
            </div>
            {tree.length === 0 ? (
              <div className="code-empty">등록된 항목이 없습니다.</div>
            ) : (
              <div className="code-tree">
                {tree.map(node => (
                  <TreeNode
                    key={node.id}
                    node={node}
                    codeType={tab}
                    depth={0}
                    onReload={load}
                    canEdit={canEdit}
                  />
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

function TreeNode({
  node,
  codeType,
  depth,
  onReload,
  canEdit,
}: {
  node: CodeItem
  codeType: CodeType
  depth: number
  onReload: () => void
  canEdit: boolean
}) {
  const [expanded, setExpanded] = useState(depth < 2)
  const [editing, setEditing] = useState(false)
  const [editName, setEditName] = useState(node.name)
  const [editRate, setEditRate] = useState<number | null>(node.rate)
  const [editEffDate, setEditEffDate] = useState(new Date().toISOString().slice(0, 10))
  const [showHistory, setShowHistory] = useState(false)
  const [history, setHistory] = useState<RateHistoryEntry[]>([])
  const [historyLoading, setHistoryLoading] = useState(false)
  const hasChildren = node.children && node.children.length > 0
  const isLeaf = !hasChildren
  const isRateNode = (codeType === 'labor' || codeType === 'material') && isLeaf

  const handleSave = async () => {
    // 단가가 변경된 경우 이력 기록
    if (isRateNode && editRate !== node.rate) {
      await updateRate(node.id, node.rate, editRate, editEffDate, '')
      // 이름도 변경된 경우
      if (editName !== node.name) {
        await updateCodeItem(node.id, { name: editName })
      }
    } else {
      const updates: { name: string; rate: number | null } = { name: editName, rate: editRate }
      await updateCodeItem(node.id, updates)
    }
    setEditing(false)
    onReload()
  }

  const handleDelete = async () => {
    const msg = hasChildren
      ? `"${node.name}" 및 하위 항목을 모두 삭제하시겠습니까?`
      : `"${node.name}"을(를) 삭제하시겠습니까?`
    if (!confirm(msg)) return
    await deleteCodeItem(node.id)
    onReload()
  }

  const handleAddChild = async () => {
    const name = prompt(`"${node.name}" 아래에 추가할 항목 이름`)
    if (!name) return
    await createCodeItem({
      codeType,
      parentId: node.id,
      name,
      sortOrder: (node.children?.length ?? 0) + 1,
    })
    setExpanded(true)
    onReload()
  }

  const handleToggleHistory = async () => {
    if (showHistory) {
      setShowHistory(false)
      return
    }
    setHistoryLoading(true)
    try {
      setHistory(await getRateHistory(node.id))
    } catch (e) {
      console.error(e)
    }
    setHistoryLoading(false)
    setShowHistory(true)
  }

  return (
    <div className="tree-node" style={{ '--depth': depth } as React.CSSProperties}>
      <div className="tree-node-row">
        <div className="tree-node-left">
          {hasChildren ? (
            <button
              className="tree-toggle"
              onClick={() => setExpanded(!expanded)}
            >
              {expanded ? '\u25BE' : '\u25B8'}
            </button>
          ) : (
            <span className="tree-leaf-dot" />
          )}

          {editing ? (
            <div className="tree-edit-inline">
              <input
                className="tree-edit-input"
                value={editName}
                onChange={e => setEditName(e.target.value)}
                autoFocus
              />
              {isRateNode && (
                <>
                  <input
                    className="tree-edit-input tree-edit-rate"
                    type="number"
                    placeholder="단가"
                    value={editRate ?? ''}
                    onChange={e => setEditRate(e.target.value ? Number(e.target.value) : null)}
                  />
                  {editRate !== node.rate && (
                    <input
                      className="tree-edit-input tree-edit-date"
                      type="date"
                      value={editEffDate}
                      onChange={e => setEditEffDate(e.target.value)}
                      title="적용일"
                    />
                  )}
                </>
              )}
              <button className="btn-code-save" onClick={handleSave}>저장</button>
              <button className="btn-code-cancel" onClick={() => setEditing(false)}>취소</button>
            </div>
          ) : (
            <span className="tree-node-name">{node.name}</span>
          )}

          {!editing && node.rate != null && node.rate > 0 && (
            <span className="tree-node-rate">{node.rate.toLocaleString()}원</span>
          )}
        </div>

        {!editing && (
          <div className="tree-node-actions">
            {isRateNode && node.rate != null && (
              <button
                className={`btn-tree-action ${showHistory ? 'active' : ''}`}
                onClick={handleToggleHistory}
                title="단가 이력"
              >
                이력
              </button>
            )}
            {canEdit && (
              <>
                <button className="btn-tree-action" onClick={handleAddChild} title="하위 항목 추가">+</button>
                <button className="btn-tree-action" onClick={() => { setEditing(true); setEditName(node.name); setEditRate(node.rate); setEditEffDate(new Date().toISOString().slice(0, 10)) }} title="수정">수정</button>
                <button className="btn-tree-action delete" onClick={handleDelete} title="삭제">삭제</button>
              </>
            )}
          </div>
        )}
      </div>

      {/* 단가 이력 */}
      {showHistory && (
        <div className="rate-history-panel">
          {historyLoading ? (
            <div className="rate-history-empty">로딩 중...</div>
          ) : history.length === 0 ? (
            <div className="rate-history-empty">변경 이력이 없습니다.</div>
          ) : (
            <table className="rate-history-table">
              <thead>
                <tr>
                  <th>적용일</th>
                  <th>변경 전</th>
                  <th>변경 후</th>
                  <th>변경일시</th>
                </tr>
              </thead>
              <tbody>
                {history.map(h => (
                  <tr key={h.id}>
                    <td>{h.effectiveDate}</td>
                    <td className="rate-old">{h.oldRate?.toLocaleString() ?? '-'}</td>
                    <td className="rate-new">{h.newRate?.toLocaleString() ?? '-'}</td>
                    <td className="rate-date">{h.changedAt.slice(0, 10)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {expanded && hasChildren && (
        <div className="tree-children">
          {node.children!.map(child => (
            <TreeNode
              key={child.id}
              node={child}
              codeType={codeType}
              depth={depth + 1}
              onReload={onReload}
              canEdit={canEdit}
            />
          ))}
        </div>
      )}
    </div>
  )
}
