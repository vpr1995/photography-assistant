
import cvReadyPromise from "@techstark/opencv-js";

let cv: typeof cvReadyPromise;

// Wait for OpenCV to be ready before using any cv functions
async function waitForOpenCVReady() {
  cv = await cvReadyPromise;
  if (!cv || !cv.getBuildInformation) {
    throw new Error('OpenCV is not ready');
  }
  console.log('OpenCV is ready');
}

/**
 * Processing presets for different quality/cost tradeoffs
 */
export enum ProcessingMode {
  HIGH_QUALITY = 'high_quality',      // 800x600, 90% quality - best quality, larger size
  BALANCED = 'balanced',              // 512x384, 75% quality - good balance
  COST_OPTIMIZED = 'cost_optimized'   // 240x180, 60% quality - smallest size, lowest cost
}

interface ProcessingConfig {
  maxWidth: number;
  maxHeight: number;
  quality: number;
}

const PROCESSING_CONFIGS: Record<ProcessingMode, ProcessingConfig> = {
  [ProcessingMode.HIGH_QUALITY]: { maxWidth: 800, maxHeight: 600, quality: 0.9 },
  [ProcessingMode.BALANCED]: { maxWidth: 512, maxHeight: 384, quality: 0.75 },
  [ProcessingMode.COST_OPTIMIZED]: { maxWidth: 240, maxHeight: 180, quality: 0.6 }
};



/**
 * Calculate target dimensions while maintaining aspect ratio
 */
function calculateTargetSize(
  originalWidth: number,
  originalHeight: number,
  maxWidth: number,
  maxHeight: number
): { width: number; height: number } {
  const aspectRatio = originalWidth / originalHeight;
  
  let width, height;
  if (aspectRatio > 1) {
    // Landscape: fit to width first
    width = Math.min(maxWidth, originalWidth);
    height = width / aspectRatio;
    if (height > maxHeight) {
      height = maxHeight;
      width = height * aspectRatio;
    }
  } else {
    // Portrait: fit to height first
    height = Math.min(maxHeight, originalHeight);
    width = height * aspectRatio;
    if (width > maxWidth) {
      width = maxWidth;
      height = width / aspectRatio;
    }
  }

  return { width: Math.round(width), height: Math.round(height) };
}



/**
 * High-quality image resizing using OpenCV
 */
function resizeWithOpenCV(
  img: HTMLImageElement,
  maxWidth: number,
  maxHeight: number,
  quality: number
): string {
  let src, dst;
  
  try {
    // Convert image to OpenCV Mat
    const canvas = document.createElement('canvas');
    canvas.width = img.width;
    canvas.height = img.height;
    const ctx = canvas.getContext('2d')!;
    ctx.drawImage(img, 0, 0);

    src = cv.imread(canvas);
    const { width, height } = calculateTargetSize(src.cols, src.rows, maxWidth, maxHeight);

    // Resize with INTER_AREA for best downscaling quality
    dst = new cv.Mat();
    const targetSize = new cv.Size(width, height);
    cv.resize(src, dst, targetSize, 0, 0, cv.INTER_AREA);

    // Convert back to image
    const outputCanvas = document.createElement('canvas');
    cv.imshow(outputCanvas, dst);
    return outputCanvas.toDataURL('image/jpeg', quality);

  } finally {
    // Clean up memory
    if (src) src.delete();
    if (dst) dst.delete();
  }
}

/**
 * Main image resizing function with processing presets
 * 
 * @param imageData - Base64 image data URL
 * @param mode - Processing quality preset
 * @param grayscale - Convert to grayscale after resizing
 * @param cropToCenter - Apply center crop to make square
 * @returns Processed image as base64 data URL
 */
export async function resizeImageForAnalysis(
  imageData: string,
  mode: ProcessingMode = ProcessingMode.BALANCED,
): Promise<string> {
  const config = PROCESSING_CONFIGS[mode];
  
  // Wait for OpenCV to be ready (with timeout)
  await waitForOpenCVReady();

  // Load the image
  const img = await new Promise<HTMLImageElement>((resolve, reject) => {
    const img = document.createElement('img');
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('Failed to load image'));
    img.src = imageData;
  });

  let result: string;
  
  try {
    result = resizeWithOpenCV(img, config.maxWidth, config.maxHeight, config.quality);
    console.log(`✅ OpenCV resizing completed (${mode})`);
  } catch (error){
    console.error(`OpenCV error`, error);
    throw new Error('OpenCV resizing failed, please check console for details');
  }

  return result;
}

/**
 * Helper function to get available processing modes with descriptions
 */
export function getAvailableProcessingModes(): Array<{mode: ProcessingMode, description: string}> {
  return [
    { mode: ProcessingMode.HIGH_QUALITY, description: 'High Quality (800x600, best for analysis)' },
    { mode: ProcessingMode.BALANCED, description: 'Balanced (512x384, recommended)' },
    { mode: ProcessingMode.COST_OPTIMIZED, description: 'Cost Optimized (240x180, faster processing)' }
  ];
}

