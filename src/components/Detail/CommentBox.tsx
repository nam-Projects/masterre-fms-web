import { useState } from 'react'
import type { Comment } from '../../types'
import { formatDateTime } from '../../utils/storage'
import { useAuth } from '../../contexts/AuthContext'

type Props = {
  comments: Comment[]
  onAdd: (text: string, author: string) => Promise<void>
  canEdit?: boolean
}

export default function CommentBox({ comments, onAdd, canEdit = true }: Props) {
  const { profile } = useAuth()
  const [text, setText] = useState('')
  const [author, setAuthor] = useState(profile?.displayName || '')
  const [sending, setSending] = useState(false)

  const handleAdd = async () => {
    if (!text.trim() || sending) return
    setSending(true)
    try {
      await onAdd(text.trim(), author.trim() || '운영자')
      setText('')
    } finally {
      setSending(false)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleAdd()
    }
  }

  return (
    <div className="comment-box">
      <h3>코멘트</h3>
      <div className="comment-list">
        {comments.length === 0 && (
          <p className="comment-empty">코멘트가 없습니다.</p>
        )}
        {comments.map((c) => (
          <div key={c.id} className="comment-item">
            <div className="comment-meta">
              <span className="comment-author">{c.author}</span>
              <span className="comment-date">{formatDateTime(c.createdAt)}</span>
            </div>
            <p className="comment-text">{c.text}</p>
          </div>
        ))}
      </div>
      {canEdit && (
        <div className="comment-input">
          <input
            type="text"
            className="comment-author-input"
            value={author}
            onChange={(e) => setAuthor(e.target.value)}
            placeholder="작성자"
          />
          <div className="comment-text-row">
            <textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="메시지를 입력하세요..."
              rows={2}
            />
            <button
              className="btn-comment-send"
              onClick={handleAdd}
              disabled={sending}
            >
              {sending ? '...' : '전송'}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
