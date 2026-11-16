import * as faceapi from '@vladmandic/face-api';
import { Employee } from '../types';

let modelsLoaded = false;
let modelsLoadingPromise: Promise<void> | null = null;

function getModelsBaseUrl(): string {
  if (typeof window !== 'undefined' && window.location.protocol === 'file:') {
    return './models';
  }
  return '/models';
}

export async function loadFaceModels(): Promise<void> {
  if (modelsLoaded) return;
  if (modelsLoadingPromise) return modelsLoadingPromise;

  modelsLoadingPromise = (async () => {
    const primaryUrl = getModelsBaseUrl();
    try {
      await Promise.all([
        faceapi.nets.tinyFaceDetector.loadFromUri(primaryUrl),
        faceapi.nets.faceLandmark68TinyNet.loadFromUri(primaryUrl),
        faceapi.nets.faceRecognitionNet.loadFromUri(primaryUrl)
      ]);
      modelsLoaded = true;
    } catch (primaryErr) {
      console.warn('Primary local models load failed, attempting CDN fallback:', primaryErr);
      const cdnUrl = 'https://cdn.jsdelivr.net/npm/@vladmandic/face-api/model';
      await Promise.all([
        faceapi.nets.tinyFaceDetector.loadFromUri(cdnUrl),
        faceapi.nets.faceLandmark68TinyNet.loadFromUri(cdnUrl),
        faceapi.nets.faceRecognitionNet.loadFromUri(cdnUrl)
      ]);
      modelsLoaded = true;
    }
  })();

  try {
    await modelsLoadingPromise;
  } catch (err) {
    modelsLoadingPromise = null;
    throw err;
  }
}

export interface DetectedFaceResult {
  descriptor: number[];
  box: { x: number; y: number; width: number; height: number };
  score: number;
}

export async function detectSingleFaceDescriptor(
  input: HTMLVideoElement | HTMLImageElement | HTMLCanvasElement
): Promise<DetectedFaceResult | null> {
  await loadFaceModels();

  const options = new faceapi.TinyFaceDetectorOptions({
    inputSize: 320,
    scoreThreshold: 0.45
  });

  const detection = await faceapi
    .detectSingleFace(input, options)
    .withFaceLandmarks(true)
    .withFaceDescriptor();

  if (!detection) return null;

  return {
    descriptor: Array.from(detection.descriptor),
    box: {
      x: detection.detection.box.x,
      y: detection.detection.box.y,
      width: detection.detection.box.width,
      height: detection.detection.box.height
    },
    score: detection.detection.score
  };
}

export function euclideanDistance(a: number[], b: number[]): number {
  if (!a || !b || a.length !== b.length) return Number.POSITIVE_INFINITY;
  let sum = 0;
  for (let i = 0; i < a.length; i++) {
    const diff = a[i] - b[i];
    sum += diff * diff;
  }
  return Math.sqrt(sum);
}

export interface FaceMatchResult {
  employee: Employee;
  distance: number;
  confidencePct: number;
}

export function findBestMatchingEmployee(
  descriptor: number[],
  employees: Employee[],
  maxDistance = 0.54
): FaceMatchResult | null {
  let bestEmp: Employee | null = null;
  let bestDistance = Number.POSITIVE_INFINITY;

  for (const emp of employees) {
    if (!emp.active || !emp.faceDescriptors || emp.faceDescriptors.length === 0) continue;
    for (const stored of emp.faceDescriptors) {
      const dist = euclideanDistance(descriptor, stored);
      if (dist < bestDistance) {
        bestDistance = dist;
        bestEmp = emp;
      }
    }
  }

  if (bestEmp && bestDistance <= maxDistance) {
    // Map distance ~0.25..0.54 cleanly to ~98%..72% confidence
    const confidencePct = Math.max(
      60,
      Math.min(99, Math.round((1 - bestDistance / 0.85) * 100))
    );
    return {
      employee: bestEmp,
      distance: bestDistance,
      confidencePct
    };
  }

  return null;
}

export function captureVideoSnapshot(
  video: HTMLVideoElement,
  maxWidth = 420,
  quality = 0.78
): string {
  const vw = video.videoWidth || 640;
  const vh = video.videoHeight || 480;
  const scale = Math.min(1, maxWidth / vw);
  const w = Math.round(vw * scale);
  const h = Math.round(vh * scale);

  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d');
  if (!ctx) return '';

  ctx.drawImage(video, 0, 0, w, h);
  return canvas.toDataURL('image/jpeg', quality);
}

export function captureImageSnapshot(
  img: HTMLImageElement,
  maxWidth = 420,
  quality = 0.8
): string {
  const iw = img.naturalWidth || img.width || 420;
  const ih = img.naturalHeight || img.height || 420;
  const scale = Math.min(1, maxWidth / iw);
  const w = Math.round(iw * scale);
  const h = Math.round(ih * scale);

  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d');
  if (!ctx) return '';

  ctx.drawImage(img, 0, 0, w, h);
  return canvas.toDataURL('image/jpeg', quality);
}

export function playKioskBeep(type: 'success' | 'intermediate' | 'warning' = 'success'): void {
  try {
    const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();
    const now = ctx.currentTime;

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);

    if (type === 'success') {
      osc.type = 'sine';
      osc.frequency.setValueAtTime(660, now);
      osc.frequency.setValueAtTime(880, now + 0.09);
      gain.gain.setValueAtTime(0.14, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.28);
      osc.start(now);
      osc.stop(now + 0.28);
    } else if (type === 'intermediate') {
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(520, now);
      osc.frequency.setValueAtTime(780, now + 0.1);
      gain.gain.setValueAtTime(0.16, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.3);
      osc.start(now);
      osc.stop(now + 0.3);
    } else {
      osc.type = 'sine';
      osc.frequency.setValueAtTime(340, now);
      gain.gain.setValueAtTime(0.1, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.22);
      osc.start(now);
      osc.stop(now + 0.22);
    }
  } catch {
    // Ignore audio context restrictions if not allowed
  }
}
