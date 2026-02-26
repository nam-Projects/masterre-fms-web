import { useState, useEffect, useRef } from 'react'
import type { ChangeEvent } from 'react'
import type { Photo, PhotoFolder } from '../../types'
import { uploadPhotos, getPhotoUrls, deletePhoto } from '../../services/photoService'
import { useAuth } from '../../contexts/AuthContext'

type Props = {
  jobId: string
  folder: PhotoFolder
  photos: Photo[]
  onRefresh: () => void
}

export default function PhotoUploader({ jobId, folder, photos, onRefresh }: Props) {
  const { profile } = useAuth()
  const fileRef = useRef<HTMLInputElement>(null)
  const [uploading, setUploading] = useState(false)
  const [photoUrls, setPhotoUrls] = useState<Map<string, string>>(new Map())
  const [deleting, setDeleting] = useState<string | null>(null)

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

  const handleFileChange = async (e: ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || [])
    if (!files.length) return

    setUploading(true)
    try {
      await uploadPhotos(jobId, folder, files, profile?.displayName || '운영자')
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
                />
              ) : (
                <div className="photo-placeholder">불러오는 중...</div>
              )}
              <div className="photo-item-info">
                <span className="photo-item-name">{p.name}</span>
                <button
                  className="btn-tiny"
                  onClick={() => handleDelete(p)}
                  disabled={deleting === p.id}
                >
                  {deleting === p.id ? '...' : '삭제'}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
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
    </div>
  )
}
