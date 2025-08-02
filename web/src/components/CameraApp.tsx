import { useState, useRef, useEffect } from 'react';
import { Zap, Settings, Image, RefreshCw, Grid3X3, ZapOff, Flashlight, Sparkles } from 'lucide-react';
import './CameraApp.css';
import ImageViewer from './ImageViewer';
import AnalysisModal from './AnalysisModal';
import { resizeImageForAnalysis, ProcessingMode, getAvailableProcessingModes } from './opencv-utils';
import MagicOverlay from './MagicOverlay';

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

const CameraApp = () => {
  const [cameraType, setCameraType] = useState<'user' | 'environment'>('user');
  const [showGrid, setShowGrid] = useState<boolean>(false);
  const [flashMode, setFlashMode] = useState<'off' | 'on' | 'auto'>('off');
  const [lastPhoto, setLastPhoto] = useState<string | null>(null);
  const [showImageViewer, setShowImageViewer] = useState<boolean>(false);
  const [capturedPhoto, setCapturedPhoto] = useState<string | null>(null);
  const [videoAspectRatio, setVideoAspectRatio] = useState<number | null>(null);
  const [gridStyle, setGridStyle] = useState<React.CSSProperties>({});
  const [showMagic, setShowMagic] = useState<boolean>(false);
  const [showAnalysisModal, setShowAnalysisModal] = useState<boolean>(false);
  const [isAnalyzing, setIsAnalyzing] = useState<boolean>(false);
  const [analysisResult, setAnalysisResult] = useState<AnalysisResult | null>(null);
  const [showSettings, setShowSettings] = useState<boolean>(false);
  const [processingMode, setProcessingMode] = useState<ProcessingMode>(ProcessingMode.BALANCED);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const calculateGridPosition = () => {
    if (videoRef.current) {
      const video = videoRef.current;
      const container = video.parentElement;
      if (container) {
        const containerRect = container.getBoundingClientRect();
        
        const containerAspect = containerRect.width / containerRect.height;
        const videoAspect = video.videoWidth / video.videoHeight;
        
        let displayWidth, displayHeight, offsetX, offsetY;
        
        if (containerAspect > videoAspect) {
          // Container is wider than video - video fills height, has side margins
          displayHeight = containerRect.height;
          displayWidth = displayHeight * videoAspect;
          offsetX = (containerRect.width - displayWidth) / 2;
          offsetY = 0;
        } else {
          // Container is taller than video - video fills width, has top/bottom margins
          displayWidth = containerRect.width;
          displayHeight = displayWidth / videoAspect;
          offsetX = 0;
          offsetY = (containerRect.height - displayHeight) / 2;
        }
        
        setGridStyle({
          width: displayWidth,
          height: displayHeight,
          left: offsetX,
          top: offsetY,
        });
      }
    }
  };

  useEffect(() => {
    const startCamera = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: cameraType,
          },
        });
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          
          // Handle video metadata to get actual dimensions
          videoRef.current.onloadedmetadata = () => {
            if (videoRef.current) {
              const { videoWidth, videoHeight } = videoRef.current;
              setVideoAspectRatio(videoWidth / videoHeight);
              calculateGridPosition();
            }
          };
          
          // Handle video resize to recalculate grid position
          videoRef.current.onresize = calculateGridPosition;
          
          // Apply flash constraints if supported (experimental API)
          const track = stream.getVideoTracks()[0];
          if ('torch' in track.getCapabilities()) {
              try {
                await track.applyConstraints({
                  advanced: [{ torch: flashMode === 'on' } as MediaTrackConstraintSet]
                });
              } catch {
                console.log('Flash control not supported on this device');
              }
          }
        }
      } catch (error) {
        console.error('Error accessing camera:', error);
      }
    };

    const handlePermissions = async () => {
      try {
        await navigator.mediaDevices.getUserMedia({ video: true });
      } catch (error) {
        console.error('Permissions denied:', error);
      }
    };

    handlePermissions();
    startCamera();
    
    // Add resize listener to recalculate grid position
    const handleResize = () => {
      setTimeout(calculateGridPosition, 100); // Small delay to ensure layout is updated
    };
    
    window.addEventListener('resize', handleResize);
    
    return () => {
      window.removeEventListener('resize', handleResize);
    };
  }, [cameraType, flashMode]);

  const takePicture = () => {
    if (canvasRef.current && videoRef.current) {
      const context = canvasRef.current.getContext('2d');
      if (context) {
        canvasRef.current.width = videoRef.current.videoWidth;
        canvasRef.current.height = videoRef.current.videoHeight;
        context.drawImage(videoRef.current, 0, 0);
        const imageData = canvasRef.current.toDataURL('image/png');
        
        // Show the captured photo in preview mode
        setCapturedPhoto(imageData);
        setShowImageViewer(true);
      }
    }
  };

  const savePhoto = () => {
    if (capturedPhoto) {
      // Save the photo to lastPhoto for thumbnail
      setLastPhoto(capturedPhoto);
      
      // Download the photo
      const link = document.createElement('a');
      link.href = capturedPhoto;
      link.download = `photo-${Date.now()}.png`;
      link.click();
      
      // Close the preview
      setShowImageViewer(false);
      setCapturedPhoto(null);
    }
  };

  const discardPhoto = () => {
    setCapturedPhoto(null);
    setShowImageViewer(false);
  };

  // ...existing code...

  // Real API function - calls the Go backend which uses AWS Bedrock
  const analyzePhoto = async (imageData: string): Promise<AnalysisResult> => {
    const tempImg = document.createElement('img');
    
    return new Promise((resolve, reject) => {
      tempImg.onload = async () => {
        try {
          // Log original image info
          console.log('📸 Original Image:', {
            width: tempImg.width,
            height: tempImg.height,
            size: `${Math.round(imageData.length / 1024)}KB`,
            dataUrlLength: imageData.length
          });

          // High-quality image processing using OpenCV for better LLM analysis
          const resizedImageData = await resizeImageForAnalysis(
            imageData, 
            processingMode
          );
          
          // Log processed image info
          const processedImg = document.createElement('img');
          processedImg.onload = () => {
            console.log('🔧 Processed Image (OpenCV):', {
              width: processedImg.width,
              height: processedImg.height,
              size: `${Math.round(resizedImageData.length * 0.75 / 1024)}KB`,
              dataUrlLength: resizedImageData.length,
              compressionRatio: `${Math.round((imageData.length / resizedImageData.length) * 100) / 100}:1`,
              method: 'OpenCV INTER_AREA resizing'
            });
          };
          processedImg.src = resizedImageData;
          
          // Convert data URL to base64 (remove the data:image/jpeg;base64, prefix)
          const base64Image = resizedImageData.split(',')[1];
          
          console.log('📤 Sending to backend:', {
            base64Length: base64Image.length,
            estimatedSizeKB: `${Math.round(base64Image.length * 0.75 / 1024)}KB` // base64 is ~4/3 larger
          });
          
          const response = await fetch('http://localhost:8080/analyze', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              image: base64Image,
            }),
          });

          if (!response.ok) {
            throw new Error(`API call failed: ${response.status} ${response.statusText}`);
          }

          const result = await response.json();
          
          // Transform the backend response to match our AnalysisResult interface
          resolve({
            overallScore: result.score,
            feedback: {
              composition: result.composition,
              lighting: result.lighting,
              subject: result.subject,
              suggestions: result.suggestions
            },
            strengths: result.strengths,
            timestamp: new Date().toISOString()
          });
        } catch (error) {
          reject(error);
        }
      };
      
      tempImg.onerror = () => {
        reject(new Error('Failed to load image for analysis'));
      };
      
      tempImg.src = imageData;
    });
  };

  const analyzeCurrentFrame = async () => {
    if (!canvasRef.current || !videoRef.current) return;
    
    // Capture current camera frame
    const context = canvasRef.current.getContext('2d');
    if (!context) return;
    
    canvasRef.current.width = videoRef.current.videoWidth;
    canvasRef.current.height = videoRef.current.videoHeight;
    context.drawImage(videoRef.current, 0, 0);
    const imageData = canvasRef.current.toDataURL('image/jpeg', 0.8);
    
    // Basic client-side validation to avoid unnecessary API calls
    const imageSize = imageData.length;
    if (imageSize < 1000) {
      console.log('Image too small or corrupted, skipping analysis');
      return;
    }
    
    // Show magic animation
    setShowMagic(true);
    setIsAnalyzing(true);
    
    try {
      // Call real API (Go backend with AWS Bedrock)
      const result = await analyzePhoto(imageData);
      
      // Stop animation and show results
      setShowMagic(false);
      setAnalysisResult(result);
      setShowAnalysisModal(true);
      setIsAnalyzing(false);
    } catch (error) {
      console.error('Analysis failed:', error);
      setShowMagic(false);
      setIsAnalyzing(false);
      // Could show error modal here
    }
  };

  const closeAnalysisModal = () => {
    setShowAnalysisModal(false);
    setAnalysisResult(null);
  };

  const takePhotoFromAnalysis = () => {
    // Close analysis modal first
    closeAnalysisModal();
    // Take the photo using existing function
    takePicture();
  };

  const triggerMagic = () => {
    analyzeCurrentFrame();
  };

  return (
    <div className="camera-app">
      <div className="camera-container">
        <div className="camera-header">
          <button 
            className={`flash-toggle ${flashMode}`}
            onClick={() => {
              const modes: ('off' | 'on' | 'auto')[] = ['off', 'auto', 'on'];
              const currentIndex = modes.indexOf(flashMode);
              const nextIndex = (currentIndex + 1) % modes.length;
              setFlashMode(modes[nextIndex]);
            }}
            title={`Flash: ${flashMode}`}
          >
            {flashMode === 'off' && <ZapOff size={24} />}
            {flashMode === 'auto' && <Zap size={24} />}
            {flashMode === 'on' && <Flashlight size={24} />}
            <span className="flash-text">{flashMode === 'auto' ? 'Auto' : flashMode === 'on' ? 'On' : 'Off'}</span>
          </button>
          
          <button 
            className={`grid-toggle ${showGrid ? 'active' : ''}`}
            onClick={() => setShowGrid(!showGrid)}
            title="Toggle Grid"
          >
            <Grid3X3 size={24} />
          </button>
          
          <button 
            className="magic-wand-button"
            onClick={triggerMagic}
            title="Magic Wand"
          >
            <Sparkles size={24} />
          </button>
          
          <button 
            className={`settings-button ${showSettings ? 'active' : ''}`}
            onClick={() => setShowSettings(!showSettings)}
            title="Settings"
          >
            <Settings size={24} />
          </button>
        </div>

        {/* Settings Panel */}
        {showSettings && (
          <div className="settings-panel">
            <div className="settings-content">
              <div className="setting-group">
                <label className="setting-label">Processing Quality:</label>
                <select 
                  value={processingMode} 
                  onChange={(e) => setProcessingMode(e.target.value as ProcessingMode)}
                  className="setting-select"
                >
                  {getAvailableProcessingModes().map(({mode, description}) => (
                    <option key={mode} value={mode}>{description}</option>
                  ))}
                </select>
              </div>
              <p className="settings-note">
                Higher quality modes provide better analysis but may take longer to process.
              </p>
            </div>
          </div>
        )}
        <div className="camera-view" style={videoAspectRatio ? { aspectRatio: videoAspectRatio } : {}} data-camera={cameraType}>
          <video ref={videoRef} autoPlay playsInline></video>
          {showGrid && (
            <div className="photography-grid" style={gridStyle}>
              <div className="grid-line vertical line-1"></div>
              <div className="grid-line vertical line-2"></div>
              <div className="grid-line horizontal line-3"></div>
              <div className="grid-line horizontal line-4"></div>
            </div>
          )}
          <div className="focus-indicator">
            <div className="focus-square"></div>
            <div className="focus-plus">+</div>
          </div>
          <canvas ref={canvasRef} style={{ display: 'none' }}></canvas>
          
          {/* Magic Animation Overlay */}
          {showMagic && <MagicOverlay />}
        </div>
        <div className="camera-footer">
          <div className="mode-selector">
            <span className="mode selected">PHOTO</span>
          </div>
          <div className="controls">
            <button 
              className="gallery-button"
              onClick={() => lastPhoto && setShowImageViewer(true)}
              disabled={!lastPhoto}
            >
              {lastPhoto ? (
                <img src={lastPhoto} alt="Last photo" className="photo-thumbnail" />
              ) : (
                <Image size={28} />
              )}
            </button>
            <button className="shutter-button" onClick={takePicture}></button>
            <button className="switch-camera-button" onClick={() => setCameraType(cameraType === 'user' ? 'environment' : 'user')}>
              <RefreshCw size={28} />
            </button>
          </div>
        </div>
      </div>

      {/* Image Viewer Modal */}
      {showImageViewer && (capturedPhoto || lastPhoto) && (
        <ImageViewer
          capturedPhoto={capturedPhoto}
          lastPhoto={lastPhoto}
          onClose={() => capturedPhoto ? discardPhoto() : setShowImageViewer(false)}
          onSave={savePhoto}
          onDiscard={discardPhoto}
        />
      )}
      
      {/* Photography Analysis Modal */}
      {showAnalysisModal && analysisResult && (
        <AnalysisModal
          analysisResult={analysisResult}
          onClose={closeAnalysisModal}
          onTakePhoto={takePhotoFromAnalysis}
          onReanalyze={analyzeCurrentFrame}
        />
      )}
      
      {/* Loading Modal for Analysis */}
      {isAnalyzing && showMagic && (
        <div className="analysis-loading-overlay">
          <div className="analysis-loading-content">
            <div className="loading-animation">
              <div className="loading-circle">
                <Sparkles size={48} />
              </div>
            </div>
            <h3>🤖 AI Photographer is analyzing your shot...</h3>
            <p>Checking composition, lighting, and more!</p>
          </div>
        </div>
      )}
    </div>
  );
};

export default CameraApp;
