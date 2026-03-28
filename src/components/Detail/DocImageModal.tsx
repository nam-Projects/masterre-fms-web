import PhotoUploader from './PhotoUploader'
import type { Photo, PhotoFolder } from '../../types'
import { PHOTO_FOLDER_LABELS } from '../../types'

type Props = {
  jobId: string
  folder: PhotoFolder
  photos: Photo[]
  onRefresh: () => void
  onClose: () => void
  canEdit?: boolean
}

export default function DocImageModal({ jobId, folder, photos, onRefresh, onClose, canEdit = true }: Props) {
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal modal-doc-image" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3>{PHOTO_FOLDER_LABELS[folder]}</h3>
          <button className="btn-close-modal" onClick={onClose}>✕</button>
        </div>
        <div className="modal-body">
          <PhotoUploader
            jobId={jobId}
            folder={folder}
            photos={photos}
            onRefresh={onRefresh}
            canEdit={canEdit}
          />
        </div>
      </div>
    </div>
  )
}
