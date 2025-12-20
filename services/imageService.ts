// Image Compression Service using @jsquash/avif
// Provides AVIF compression with Squoosh-compatible settings

import encode from '@jsquash/avif/encode';

// Default compression options matching user's Squoosh settings
export interface CompressionOptions {
    quality: number;  // 0-100, default 50
    effort: number;   // 0-10, default 4 (speed vs compression tradeoff)
}

const DEFAULT_OPTIONS: CompressionOptions = {
    quality: 50,
    effort: 4,
};

/**
 * Load an image and convert to ImageData
 */
const dataUrlToImageData = async (dataUrl: string): Promise<ImageData> => {
    return new Promise((resolve, reject) => {
        const img = new Image();
        img.onload = () => {
            const canvas = document.createElement('canvas');
            canvas.width = img.width;
            canvas.height = img.height;
            const ctx = canvas.getContext('2d');
            if (!ctx) {
                reject(new Error('Failed to get canvas context'));
                return;
            }
            ctx.drawImage(img, 0, 0);
            resolve(ctx.getImageData(0, 0, img.width, img.height));
        };
        img.onerror = () => reject(new Error('Failed to load image'));
        img.src = dataUrl;
    });
};

/**
 * Convert ArrayBuffer to base64 data URL
 */
const arrayBufferToDataUrl = (buffer: ArrayBuffer, mimeType: string): string => {
    const bytes = new Uint8Array(buffer);
    let binary = '';
    for (let i = 0; i < bytes.byteLength; i++) {
        binary += String.fromCharCode(bytes[i]);
    }
    return `data:${mimeType};base64,${btoa(binary)}`;
};

/**
 * Compress an image to AVIF format
 * @param imageDataUrl - The original image as a data URL (base64)
 * @param options - Compression options
 * @returns Compressed image as data URL
 */
export const compressImage = async (
    imageDataUrl: string,
    options: Partial<CompressionOptions> = {}
): Promise<string> => {
    const opts = { ...DEFAULT_OPTIONS, ...options };

    // Convert data URL to ImageData
    const imageData = await dataUrlToImageData(imageDataUrl);

    // Encode to AVIF with Squoosh settings
    const avifBuffer = await encode(imageData, {
        quality: opts.quality,
        qualityAlpha: opts.quality,
        denoiseLevel: 0,
        tileColsLog2: 0,
        tileRowsLog2: 0,
        speed: 10 - opts.effort, // effort 4 -> speed 6
        subsample: 1,
        chromaDeltaQ: false,
        sharpness: 0,
        enableSharpYUV: false,
        tune: 0,
    });

    // Convert to data URL
    return arrayBufferToDataUrl(avifBuffer, 'image/avif');
};

/**
 * Get the size of a data URL in bytes
 */
export const getDataUrlSize = (dataUrl: string): number => {
    const base64 = dataUrl.split(',')[1];
    if (!base64) return 0;
    return Math.round(base64.length * 0.75);
};

/**
 * Format bytes to human-readable string
 */
export const formatBytes = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

/**
 * Get the format of a data URL
 */
export const getImageFormat = (dataUrl: string): string => {
    const match = dataUrl.match(/^data:image\/(\w+);/);
    return match ? match[1].toUpperCase() : 'Unknown';
};
