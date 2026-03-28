import { useState, useEffect, useRef, useCallback } from 'react'
import type { ChangeEvent } from 'react'
import type { Photo, PhotoFolder } from '../../types'
import { uploadPhotos, getPhotoUrls, deletePhoto, listPhotos } from '../../services/photoService'
import { useAuth } from '../../contexts/AuthContext'

type Props = {
  jobId: string
  folder: PhotoFolder
  photos: Photo[]
  onRefresh: () => void
  canEdit?: boolean
}

export default function PhotoUploader({ jobId, folder, photos: initialPhotos, onRefresh, canEdit = true }: Props) {
  const { profile } = useAuth()
  const fileRef = useRef<HTMLInputElement>(null)
  const [photos, setPhotos] = useState<Photo[]>(initialPhotos)
  const [uploading, setUploading] = useState(false)
  const [photoUrls, setPhotoUrls] = useState<Map<string, string>>(new Map())
  const [deleting, setDeleting] = useState<string | null>(null)
  const [viewPhoto, setViewPhoto] = useState<{ url: string; name: string } | null>(null)

  // 부모에서 전달받은 초기 사진이 변경되면 동기화
  useEffect(() => {
    setPhotos(initialPhotos)
  }, [initialPhotos])

  // 사진 URL 로드
  useEffect(() => {
    if (photos.length === 0) {
      setPhotoUrls(new Map())
      return
    }
    let cancelled = false
    getPhotoUrls(photos).then((urls) => {
      if (!cancelled) setPhotoUrls(urls)
    })
    return () => { cancelled = true }
  }, [photos])

  // 사진 목록만 자체 갱신
  const refreshPhotos = useCallback(async () => {
    const updated = await listPhotos(jobId, folder)
    setPhotos(updated)
  }, [jobId, folder])

  const handleFileChange = async (e: ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || [])
    if (!files.length) return

    setUploading(true)
    try {
      await uploadPhotos(jobId, folder, files, profile?.displayName || '운영자')
      await refreshPhotos()
      onRefresh()
    } catch (err) {
      alert(err instanceof Error ? err.message : '업로드 실패')
    } finally {
      setUploading(false)
      if (fileRef.current) fileRef.current.value = ''
    }
  }

  const handleDelete = async (photo: Photo) => {
    if (!confirm(`"${photo.name}" 사진을 삭제하시겠습니까?`)) return
    setDeleting(photo.id)
    try {
      await deletePhoto(photo.id, photo.storagePath)
      setPhotos(prev => prev.filter(p => p.id !== photo.id))
      setPhotoUrls(prev => {
        const next = new Map(prev)
        next.delete(photo.id)
        return next
      })
      onRefresh()
    } catch (err) {
      alert(err instanceof Error ? err.message : '삭제 실패')
    } finally {
      setDeleting(null)
    }
  }

  return (
    <div className="photo-area">
      {photos.length === 0 ? (
        <p className="photo-empty">업로드된 사진이 없습니다.</p>
      ) : (
        <div className="photo-grid">
          {photos.map((p) => (
            <div key={p.id} className="photo-item">
              {photoUrls.get(p.id) ? (
                <img
                  src={photoUrls.get(p.id)}
                  alt={p.name}
                  className="photo-thumbnail"
                  onClick={() => setViewPhoto({ url: photoUrls.get(p.id)!, name: p.name })}
                />
              ) : (
                <div className="photo-placeholder">불러오는 중...</div>
              )}
              <div className="photo-item-info">
                <span className="photo-item-name">{p.name}</span>
                {canEdit && (
                  <button
                    className="btn-tiny"
                    onClick={() => handleDelete(p)}
                    disabled={deleting === p.id}
                  >
                    {deleting === p.id ? '...' : '삭제'}
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
      {canEdit && (
        <div className="photo-actions">
          <input
            ref={fileRef}
            type="file"
            multiple
            accept="image/*"
            onChange={handleFileChange}
            style={{ display: 'none' }}
          />
          <button
            className="btn-primary"
            onClick={() => fileRef.current?.click()}
            disabled={uploading}
          >
            {uploading ? '업로드 중...' : '사진 추가'}
          </button>
        </div>
      )}
      {viewPhoto && (
        <div className="photo-viewer-overlay" onClick={() => setViewPhoto(null)}>
          <div className="photo-viewer">
            <button className="photo-viewer-close" onClick={() => setViewPhoto(null)}>✕</button>
            <img src={viewPhoto.url} alt={viewPhoto.name} />
            <p className="photo-viewer-name">{viewPhoto.name}</p>
          </div>
        </div>
      )}
    </div>
  )
}
