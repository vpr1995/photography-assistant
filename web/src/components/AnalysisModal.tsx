import { X } from 'lucide-react';
import React from 'react';

interface AnalysisResult {
  overallScore: number;
  feedback: {
    composition: string;
    lighting: string;
    subject: string;
    suggestions: string[];
  };
  strengths: string[];
  timestamp: string;
}

interface AnalysisModalProps {
  analysisResult: AnalysisResult;
  onClose: () => void;
  onTakePhoto: () => void;
  onReanalyze: () => void;
}

const AnalysisModal: React.FC<AnalysisModalProps> = ({ analysisResult, onClose, onTakePhoto, onReanalyze }) => {
  return (
    <div className="analysis-modal-overlay" onClick={onClose}>
      <div className="analysis-modal-content" onClick={e => e.stopPropagation()}>
        <div className="analysis-modal-header">
          <h2>📸 Photography Analysis</h2>
          <button className="close-button" onClick={onClose} title="Close Analysis">
            <X size={24} />
          </button>
        </div>
        <div className="analysis-modal-body">
          {/* Overall Score */}
          <div className="score-section">
            <div className="score-circle">
              <div className="score-content">
                <div className="score-number">{analysisResult.overallScore}</div>
                <div className="score-label">/ 10</div>
              </div>
            </div>
            <div className="score-description">
              {analysisResult.overallScore >= 8 ? "Excellent shot! 🌟" :
                analysisResult.overallScore >= 6.5 ? "Good photo with room for improvement 👍" :
                  "Let's make this photo even better! 💪"}
            </div>
          </div>
          {/* Feedback Sections */}
          <div className="feedback-sections">
            <div className="feedback-item">
              <h4>🎯 Composition</h4>
              <p>{analysisResult.feedback.composition}</p>
            </div>
            <div className="feedback-item">
              <h4>💡 Lighting</h4>
              <p>{analysisResult.feedback.lighting}</p>
            </div>
            <div className="feedback-item">
              <h4>🎪 Subject</h4>
              <p>{analysisResult.feedback.subject}</p>
            </div>
          </div>
          {/* Strengths */}
          {analysisResult.strengths.length > 0 && (
            <div className="strengths-section">
              <h4>✨ What's Working Well:</h4>
              <div className="strengths-list">
                {analysisResult.strengths.map((strength, index) => (
                  <span key={index} className="strength-tag">{strength}</span>
                ))}
              </div>
            </div>
          )}
          {/* Suggestions */}
          <div className="suggestions-section">
            <h4>🚀 Suggestions to Improve:</h4>
            <ul className="suggestions-list">
              {analysisResult.feedback.suggestions.map((suggestion, index) => (
                <li key={index}>{suggestion}</li>
              ))}
            </ul>
          </div>
          {/* Action Buttons */}
          <div className="analysis-actions">
            {analysisResult.overallScore >= 7 ? (
              <>
                <button className="analysis-button take-photo-button" onClick={onTakePhoto}>
                  📸 Take Photo
                </button>
                <button className="analysis-button analyze-button" onClick={onReanalyze}>
                  🔍 Re-analyze
                </button>
              </>
            ) : (
              <>
                <button className="analysis-button retake-button" onClick={onClose}>
                  📷 Adjust Shot
                </button>
                <button className="analysis-button take-photo-button secondary" onClick={onTakePhoto}>
                  📸 Take Anyway
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default AnalysisModal;
