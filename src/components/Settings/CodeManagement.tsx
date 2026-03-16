import { useState, useEffect, useCallback } from 'react'
import type { CodeItem, CodeType } from '../../types'
import { CODE_TYPE_LABELS } from '../../types'
import {
  listCodeTree,
  createCodeItem,
  updateCodeItem,
  deleteCodeItem,
} from '../../services/codeService'

const CODE_TYPES: CodeType[] = ['area', 'labor', 'material']

export default function CodeManagement() {
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
}: {
  node: CodeItem
  codeType: CodeType
  depth: number
  onReload: () => void
}) {
  const [expanded, setExpanded] = useState(depth < 2)
  const [editing, setEditing] = useState(false)
  const [editName, setEditName] = useState(node.name)
  const [editRate, setEditRate] = useState<number | null>(node.rate)
  const hasChildren = node.children && node.children.length > 0
  const isLeaf = !hasChildren

  const handleSave = async () => {
    const updates: { name: string; rate: number | null } = { name: editName, rate: editRate }
    await updateCodeItem(node.id, updates)
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
              {(codeType === 'labor' || codeType === 'material') && isLeaf && (
                <input
                  className="tree-edit-input tree-edit-rate"
                  type="number"
                  placeholder="단가"
                  value={editRate ?? ''}
                  onChange={e => setEditRate(e.target.value ? Number(e.target.value) : null)}
                />
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
            <button className="btn-tree-action" onClick={handleAddChild} title="하위 항목 추가">+</button>
            <button className="btn-tree-action" onClick={() => { setEditing(true); setEditName(node.name); setEditRate(node.rate) }} title="수정">수정</button>
            <button className="btn-tree-action delete" onClick={handleDelete} title="삭제">삭제</button>
          </div>
        )}
      </div>

      {expanded && hasChildren && (
        <div className="tree-children">
          {node.children!.map(child => (
            <TreeNode
              key={child.id}
              node={child}
              codeType={codeType}
              depth={depth + 1}
              onReload={onReload}
            />
          ))}
        </div>
      )}
    </div>
  )
}
