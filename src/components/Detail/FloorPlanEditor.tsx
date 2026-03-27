import { useState, useEffect, useRef, useCallback } from 'react'
import type { AnnotationShape, FloorPlanData } from '../../types'
import {
  getFloorPlan,
  getFloorPlanImageUrl,
  uploadFloorPlanImage,
  replaceFloorPlanImage,
  saveAnnotations,
  deleteFloorPlan,
} from '../../services/floorPlanService'

type Tool = 'select' | 'circle' | 'rect' | 'callout'

const COLORS = [
  'rgba(255, 140, 0, 0.4)',
  'rgba(255, 60, 60, 0.4)',
  'rgba(60, 140, 255, 0.4)',
  'rgba(60, 200, 80, 0.4)',
  'rgba(180, 60, 255, 0.4)',
]

const DEFAULT_COLOR = COLORS[0]

type Props = {
  jobId: string
  onClose: () => void
}

export default function FloorPlanEditor({ jobId, onClose }: Props) {
  const [floorPlan, setFloorPlan] = useState<FloorPlanData | null>(null)
  const [imageUrl, setImageUrl] = useState('')
  const [annotations, setAnnotations] = useState<AnnotationShape[]>([])
  const [tool, setTool] = useState<Tool>('select')
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [activeColor, setActiveColor] = useState(DEFAULT_COLOR)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [editingCallout, setEditingCallout] = useState<string | null>(null)
  const [dragState, setDragState] = useState<{
    id: string
    field: 'position' | 'label'
    startX: number
    startY: number
    origX: number
    origY: number
  } | null>(null)

  const containerRef = useRef<HTMLDivElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // 데이터 로드
  useEffect(() => {
    loadData()
  }, [jobId])

  const loadData = async () => {
    setLoading(true)
    try {
      const fp = await getFloorPlan(jobId)
      if (fp) {
        setFloorPlan(fp)
        setAnnotations(fp.annotations)
        const url = await getFloorPlanImageUrl(fp.imageStoragePath)
        setImageUrl(url)
      }
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  // 이미지 업로드
  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setLoading(true)
    try {
      let fp: FloorPlanData
      if (floorPlan) {
        fp = await replaceFloorPlanImage(
          floorPlan.id,
          floorPlan.imageStoragePath,
          jobId,
          file,
        )
      } else {
        fp = await uploadFloorPlanImage(jobId, file)
      }
      setFloorPlan(fp)
      setAnnotations(fp.annotations)
      const url = await getFloorPlanImageUrl(fp.imageStoragePath)
      setImageUrl(url)
    } catch (err) {
      alert(err instanceof Error ? err.message : '업로드 실패')
    } finally {
      setLoading(false)
    }
  }

  // 이미지 삭제
  const handleDeleteImage = async () => {
    if (!floorPlan) return
    if (!confirm('평면도를 삭제하시겠습니까? 모든 어노테이션도 삭제됩니다.')) return
    try {
      await deleteFloorPlan(floorPlan.id, floorPlan.imageStoragePath)
      setFloorPlan(null)
      setImageUrl('')
      setAnnotations([])
    } catch (err) {
      alert(err instanceof Error ? err.message : '삭제 실패')
    }
  }

  // SVG 클릭 좌표 → 이미지 비율 좌표
  const getSvgPoint = useCallback(
    (e: React.MouseEvent): { x: number; y: number } | null => {
      const container = containerRef.current
      if (!container) return null
      const rect = container.getBoundingClientRect()
      return {
        x: e.clientX - rect.left,
        y: e.clientY - rect.top,
      }
    },
    [],
  )

  // 캔버스 클릭 → 도형/말풍선 추가
  const handleCanvasClick = useCallback(
    (e: React.MouseEvent) => {
      if (tool === 'select') {
        setSelectedId(null)
        setEditingCallout(null)
        return
      }

      const pt = getSvgPoint(e)
      if (!pt) return

      const id = crypto.randomUUID()

      if (tool === 'circle') {
        const shape: AnnotationShape = {
          id,
          type: 'circle',
          x: pt.x,
          y: pt.y,
          radius: 40,
          color: activeColor,
        }
        setAnnotations(prev => [...prev, shape])
        setTool('select')
        setSelectedId(id)
      } else if (tool === 'rect') {
        const shape: AnnotationShape = {
          id,
          type: 'rect',
          x: pt.x - 40,
          y: pt.y - 30,
          width: 80,
          height: 60,
          color: activeColor,
        }
        setAnnotations(prev => [...prev, shape])
        setTool('select')
        setSelectedId(id)
      } else if (tool === 'callout') {
        const shape: AnnotationShape = {
          id,
          type: 'callout',
          targetX: pt.x,
          targetY: pt.y,
          labelX: pt.x + 120,
          labelY: pt.y - 60,
          text: '',
          color: activeColor,
        }
        setAnnotations(prev => [...prev, shape])
        setTool('select')
        setSelectedId(id)
        setEditingCallout(id)
      }
    },
    [tool, activeColor, getSvgPoint],
  )

  // 도형 클릭
  const handleShapeClick = useCallback(
    (e: React.MouseEvent, id: string) => {
      e.stopPropagation()
      if (tool === 'select') {
        setSelectedId(id)
        setEditingCallout(null)
      }
    },
    [tool],
  )

  // 드래그 시작
  const handleDragStart = useCallback(
    (e: React.MouseEvent, id: string, field: 'position' | 'label') => {
      e.stopPropagation()
      e.preventDefault()
      const anno = annotations.find(a => a.id === id)
      if (!anno) return

      let origX: number, origY: number
      if (field === 'label' && anno.type === 'callout') {
        origX = anno.labelX
        origY = anno.labelY
      } else if (anno.type === 'circle') {
        origX = anno.x
        origY = anno.y
      } else if (anno.type === 'rect') {
        origX = anno.x
        origY = anno.y
      } else if (anno.type === 'callout') {
        origX = anno.targetX
        origY = anno.targetY
      } else {
        return
      }

      setSelectedId(id)
      setDragState({
        id,
        field,
        startX: e.clientX,
        startY: e.clientY,
        origX,
        origY,
      })
    },
    [annotations],
  )

  // 드래그 중
  useEffect(() => {
    if (!dragState) return

    const handleMouseMove = (e: MouseEvent) => {
      const dx = e.clientX - dragState.startX
      const dy = e.clientY - dragState.startY

      setAnnotations(prev =>
        prev.map(a => {
          if (a.id !== dragState.id) return a

          if (dragState.field === 'label' && a.type === 'callout') {
            return { ...a, labelX: dragState.origX + dx, labelY: dragState.origY + dy }
          }

          if (a.type === 'circle') {
            return { ...a, x: dragState.origX + dx, y: dragState.origY + dy }
          }
          if (a.type === 'rect') {
            return { ...a, x: dragState.origX + dx, y: dragState.origY + dy }
          }
          if (a.type === 'callout') {
            return {
              ...a,
              targetX: dragState.origX + dx,
              targetY: dragState.origY + dy,
              labelX: a.labelX + dx,
              labelY: a.labelY + dy,
            }
          }
          return a
        }),
      )
      // 드래그 시작점을 현재로 갱신 (연속 드래그)
      setDragState(prev =>
        prev
          ? {
              ...prev,
              startX: e.clientX,
              startY: e.clientY,
              origX: dragState.origX + dx,
              origY: dragState.origY + dy,
            }
          : null,
      )
    }

    const handleMouseUp = () => setDragState(null)

    window.addEventListener('mousemove', handleMouseMove)
    window.addEventListener('mouseup', handleMouseUp)
    return () => {
      window.removeEventListener('mousemove', handleMouseMove)
      window.removeEventListener('mouseup', handleMouseUp)
    }
  }, [dragState])

  // 삭제
  const handleDelete = useCallback(() => {
    if (!selectedId) return
    setAnnotations(prev => prev.filter(a => a.id !== selectedId))
    setSelectedId(null)
    setEditingCallout(null)
  }, [selectedId])

  // 말풍선 텍스트 변경
  const updateCalloutText = useCallback((id: string, text: string) => {
    setAnnotations(prev =>
      prev.map(a => (a.id === id && a.type === 'callout' ? { ...a, text } : a)),
    )
  }, [])

  // 저장
  const handleSave = async () => {
    if (!floorPlan) return
    setSaving(true)
    try {
      await saveAnnotations(floorPlan.id, annotations)
      setFloorPlan({ ...floorPlan, annotations })
      onClose()
    } catch (err) {
      alert(err instanceof Error ? err.message : '저장 실패')
    } finally {
      setSaving(false)
    }
  }

  // 키보드 단축키
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (editingCallout) return // 텍스트 편집 중에는 무시
      if (e.key === 'Delete' || e.key === 'Backspace') {
        handleDelete()
      } else if (e.key === 'Escape') {
        setSelectedId(null)
        setEditingCallout(null)
        setTool('select')
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [handleDelete, editingCallout])

  const toolLabel = (t: Tool) =>
    ({ select: '선택', circle: '원', rect: '사각형', callout: '말풍선' })[t]

  return (
    <div className="fp-overlay" onClick={onClose}>
      <div className="fp-modal" onClick={e => e.stopPropagation()}>
        {/* 헤더 */}
        <div className="fp-header">
          <h3>평면도</h3>
          <div className="fp-header-actions">
            {floorPlan && (
              <span className="fp-filename">{floorPlan.imageName}</span>
            )}
            <button
              className="btn-secondary"
              onClick={() => fileInputRef.current?.click()}
            >
              {floorPlan ? '이미지 변경' : '이미지 업로드'}
            </button>
            {floorPlan && (
              <button className="btn-danger-sm" onClick={handleDeleteImage}>
                삭제
              </button>
            )}
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              style={{ display: 'none' }}
              onChange={handleImageUpload}
            />
            <button className="btn-close-modal" onClick={onClose}>
              ✕
            </button>
          </div>
        </div>

        {/* 도구 모음 */}
        {floorPlan && imageUrl && (
          <div className="fp-toolbar">
            <div className="fp-tool-group">
              {(['select', 'circle', 'rect', 'callout'] as Tool[]).map(t => (
                <button
                  key={t}
                  className={`fp-tool-btn ${tool === t ? 'active' : ''}`}
                  onClick={() => { setTool(t); setEditingCallout(null) }}
                >
                  {toolLabel(t)}
                </button>
              ))}
            </div>
            <div className="fp-tool-group">
              {COLORS.map(c => (
                <button
                  key={c}
                  className={`fp-color-btn ${activeColor === c ? 'active' : ''}`}
                  style={{ background: c.replace('0.4', '0.8') }}
                  onClick={() => setActiveColor(c)}
                />
              ))}
            </div>
            <div className="fp-tool-group">
              <button
                className="fp-tool-btn danger"
                onClick={handleDelete}
                disabled={!selectedId}
              >
                삭제
              </button>
            </div>
          </div>
        )}

        {/* 캔버스 */}
        <div className="fp-body">
          {loading ? (
            <div className="fp-empty">
              <div className="loading-spinner" />
              <p>불러오는 중...</p>
            </div>
          ) : !floorPlan ? (
            <div className="fp-empty">
              <p>평면도 이미지를 업로드하세요.</p>
              <button
                className="btn-primary"
                onClick={() => fileInputRef.current?.click()}
              >
                이미지 업로드
              </button>
            </div>
          ) : !imageUrl ? (
            <div className="fp-empty">
              <div className="loading-spinner" />
            </div>
          ) : (
            <div
              ref={containerRef}
              className={`fp-canvas-wrap ${tool !== 'select' ? 'crosshair' : ''}`}
              onClick={handleCanvasClick}
            >
              <img
                src={imageUrl}
                alt="평면도"
                className="fp-image"
                draggable={false}
              />
              <svg className="fp-svg-overlay">
                {annotations.map(anno => (
                  <AnnotationRenderer
                    key={anno.id}
                    anno={anno}
                    isSelected={selectedId === anno.id}
                    isEditing={editingCallout === anno.id}
                    onClick={e => handleShapeClick(e, anno.id)}
                    onDragStart={(e, field) => handleDragStart(e, anno.id, field)}
                    onTextChange={text => updateCalloutText(anno.id, text)}
                    onDoubleClick={() => {
                      if (anno.type === 'callout') setEditingCallout(anno.id)
                    }}
                  />
                ))}
              </svg>
            </div>
          )}
        </div>

        {/* 푸터 */}
        <div className="fp-footer">
          <button className="btn-secondary" onClick={onClose}>
            닫기
          </button>
          {floorPlan && (
            <button
              className="btn-primary"
              onClick={handleSave}
              disabled={saving}
            >
              {saving ? '저장 중...' : '저장'}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

// 개별 어노테이션 렌더러
function AnnotationRenderer({
  anno,
  isSelected,
  isEditing,
  onClick,
  onDragStart,
  onTextChange,
  onDoubleClick,
}: {
  anno: AnnotationShape
  isSelected: boolean
  isEditing: boolean
  onClick: (e: React.MouseEvent) => void
  onDragStart: (e: React.MouseEvent, field: 'position' | 'label') => void
  onTextChange: (text: string) => void
  onDoubleClick: () => void
}) {
  if (anno.type === 'circle') {
    return (
      <g onClick={onClick} onMouseDown={e => onDragStart(e, 'position')}>
        <circle
          cx={anno.x}
          cy={anno.y}
          r={anno.radius}
          fill={anno.color}
          stroke={isSelected ? '#1976d2' : 'rgba(0,0,0,0.2)'}
          strokeWidth={isSelected ? 2.5 : 1}
          className="fp-shape"
        />
      </g>
    )
  }

  if (anno.type === 'rect') {
    return (
      <g onClick={onClick} onMouseDown={e => onDragStart(e, 'position')}>
        <rect
          x={anno.x}
          y={anno.y}
          width={anno.width}
          height={anno.height}
          fill={anno.color}
          stroke={isSelected ? '#1976d2' : 'rgba(0,0,0,0.2)'}
          strokeWidth={isSelected ? 2.5 : 1}
          rx={4}
          className="fp-shape"
        />
      </g>
    )
  }

  if (anno.type === 'callout') {
    const textLines = anno.text ? anno.text.split('\n') : ['']
    const lineHeight = 18
    const padding = 10
    const charWidth = 12
    const maxLineLen = Math.max(...textLines.map(l => l.length), 4)
    const boxW = Math.max(maxLineLen * charWidth + padding * 2, 80)
    const boxH = textLines.length * lineHeight + padding * 2

    return (
      <g onClick={onClick}>
        {/* 연결선 */}
        <line
          x1={anno.targetX}
          y1={anno.targetY}
          x2={anno.labelX}
          y2={anno.labelY}
          stroke={anno.color.replace('0.4', '0.8')}
          strokeWidth={2}
        />
        {/* 타겟 점 */}
        <circle
          cx={anno.targetX}
          cy={anno.targetY}
          r={6}
          fill={anno.color.replace('0.4', '0.8')}
          stroke="#fff"
          strokeWidth={1.5}
          className="fp-shape"
          onMouseDown={e => onDragStart(e, 'position')}
        />
        {/* 말풍선 박스 */}
        <g onMouseDown={e => onDragStart(e, 'label')} onDoubleClick={onDoubleClick}>
          <rect
            x={anno.labelX - boxW / 2}
            y={anno.labelY - boxH / 2}
            width={boxW}
            height={boxH}
            fill={anno.color.replace('0.4', '0.85')}
            stroke={isSelected ? '#1976d2' : 'rgba(0,0,0,0.3)'}
            strokeWidth={isSelected ? 2.5 : 1}
            rx={6}
            className="fp-shape"
          />
          {isEditing ? (
            <foreignObject
              x={anno.labelX - boxW / 2 + 4}
              y={anno.labelY - boxH / 2 + 4}
              width={boxW - 8}
              height={boxH - 8}
            >
              <textarea
                autoFocus
                className="fp-callout-input"
                value={anno.text}
                onChange={e => onTextChange(e.target.value)}
                onKeyDown={e => e.stopPropagation()}
                onClick={e => e.stopPropagation()}
                onMouseDown={e => e.stopPropagation()}
                style={{
                  width: '100%',
                  height: '100%',
                  background: 'transparent',
                  border: 'none',
                  outline: 'none',
                  color: '#fff',
                  fontSize: '13px',
                  fontWeight: 600,
                  resize: 'none',
                  lineHeight: `${lineHeight}px`,
                  fontFamily: 'inherit',
                }}
              />
            </foreignObject>
          ) : (
            textLines.map((line, i) => (
              <text
                key={i}
                x={anno.labelX}
                y={anno.labelY - boxH / 2 + padding + lineHeight * (i + 0.75)}
                textAnchor="middle"
                fill="#fff"
                fontSize="13"
                fontWeight="600"
                style={{ pointerEvents: 'none' }}
              >
                {line || (i === 0 ? '더블클릭하여 입력' : '')}
              </text>
            ))
          )}
        </g>
      </g>
    )
  }

  return null
}
