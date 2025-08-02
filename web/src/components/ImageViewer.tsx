import { X, Download } from 'lucide-react';
import React from 'react';

interface ImageViewerProps {
  capturedPhoto: string | null;
  lastPhoto: string | null;
  onClose: () => void;
  onSave: () => void;
  onDiscard: () => void;
}

const ImageViewer: React.FC<ImageViewerProps> = ({ capturedPhoto, lastPhoto, onClose, onSave, onDiscard }) => {
  const photo = capturedPhoto || lastPhoto || '';
  return (
    <div className="image-viewer-overlay" onClick={onClose}>
      <div className="image-viewer-content" onClick={e => e.stopPropagation()}>
        <div className="image-viewer-header">
          <button className="close-button" onClick={onClose} title={capturedPhoto ? 'Discard Photo' : 'Close'}>
            <X size={24} />
          </button>
          {capturedPhoto ? (
            <div className="preview-actions">
              <button className="discard-button" onClick={onDiscard} title="Discard Photo">
                ✕ Discard
              </button>
              <button className="save-button" onClick={onSave} title="Save Photo">
                <Download size={20} />
                Save
              </button>
            </div>
          ) : (
            <button
              className="download-button"
              onClick={() => {
                if (lastPhoto) {
                  const link = document.createElement('a');
                  link.href = lastPhoto;
                  link.download = `photo-${Date.now()}.png`;
                  link.click();
                }
              }}
              title="Download Photo"
            >
              <Download size={24} />
            </button>
          )}
        </div>
        <div className="image-viewer-body">
          <img src={photo} alt={capturedPhoto ? 'Captured photo preview' : 'Saved photo'} className="full-size-image" />
        </div>
      </div>
    </div>
  );
};

export default ImageViewer;
