/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { ProductScanResult } from '../types';
import { extractProduct5FieldsFromImages } from './geminiService';
import { mergeMultiShotResults, MultiImageMergeSummary } from '../utils/multiImageResultMerger';

export type JobStatus = 'queued' | 'extracting' | 'completed' | 'retrying' | 'error';

export interface ShotExtractionJob {
  shotId: string;
  sessionId: string;
  shotNumber: number;
  rawImage: string;
  croppedImage: string;
  detectedBarcode?: string;
  targetFieldHint?: string;
  status: JobStatus;
  progress: number; // 0 to 100
  result?: ProductScanResult;
  error?: string;
  retryCount: number;
  startedAt?: number;
  completedAt?: number;
  abortController?: AbortController;
}

export interface SessionExtractionState {
  sessionId: string;
  jobs: Map<string, ShotExtractionJob>;
  mergedResult: ProductScanResult | null;
  overallStatus: 'idle' | 'extracting' | 'completed' | 'partial' | 'error';
  completedCount: number;
  totalCount: number;
  activeRequests: number;
  hardwareBarcode?: string;
  lastUpdated: number;
  conflicts: any[];
}

export type SessionStateListener = (state: SessionExtractionState) => void;

class ProgressiveExtractionService {
  private readonly MAX_CONCURRENCY = 2;
  private readonly MAX_RETRIES = 2;
  private sessions = new Map<string, SessionExtractionState>();
  private sessionAbortControllers = new Map<string, AbortController>();
  private listeners = new Map<string, Set<SessionStateListener>>();
  private jobQueues = new Map<string, ShotExtractionJob[]>();

  /**
   * Initializes or gets an active scan extraction session
   */
  public getOrCreateSession(sessionId: string, hardwareBarcode?: string): SessionExtractionState {
    let session = this.sessions.get(sessionId);
    if (!session) {
      const abortController = new AbortController();
      this.sessionAbortControllers.set(sessionId, abortController);
      this.jobQueues.set(sessionId, []);

      session = {
        sessionId,
        jobs: new Map<string, ShotExtractionJob>(),
        mergedResult: null,
        overallStatus: 'idle',
        completedCount: 0,
        totalCount: 0,
        activeRequests: 0,
        hardwareBarcode,
        lastUpdated: Date.now(),
        conflicts: [],
      };
      this.sessions.set(sessionId, session);
    } else if (hardwareBarcode && !session.hardwareBarcode) {
      session.hardwareBarcode = hardwareBarcode;
    }
    return session;
  }

  /**
   * Subscribes to extraction updates for a specific session
   */
  public subscribe(sessionId: string, listener: SessionStateListener): () => void {
    if (!this.listeners.has(sessionId)) {
      this.listeners.set(sessionId, new Set());
    }
    const set = this.listeners.get(sessionId)!;
    set.add(listener);

    // Initial dispatch
    const session = this.sessions.get(sessionId);
    if (session) {
      listener({ ...session });
    }

    return () => {
      set.delete(listener);
      if (set.size === 0) {
        this.listeners.delete(sessionId);
      }
    };
  }

  private notify(sessionId: string) {
    const session = this.sessions.get(sessionId);
    if (!session) return;
    session.lastUpdated = Date.now();

    const set = this.listeners.get(sessionId);
    if (set) {
      const snapshot: SessionExtractionState = {
        ...session,
        jobs: new Map(session.jobs),
      };
      set.forEach((listener) => {
        try {
          listener(snapshot);
        } catch (err) {
          console.error('[ProgressiveExtraction] Listener error:', err);
        }
      });
    }
  }

  /**
   * Enqueues an individual captured shot for background extraction.
   * Begins processing immediately without blocking the camera or waiting for subsequent shots.
   */
  public enqueueShot(params: {
    sessionId: string;
    shotId: string;
    shotNumber: number;
    rawImage: string;
    croppedImage?: string;
    detectedBarcode?: string;
    targetFieldHint?: string;
  }): void {
    const { sessionId, shotId, shotNumber, rawImage, croppedImage, detectedBarcode, targetFieldHint } = params;
    const session = this.getOrCreateSession(sessionId);

    // If job already exists, do not duplicate
    if (session.jobs.has(shotId)) {
      return;
    }

    const job: ShotExtractionJob = {
      shotId,
      sessionId,
      shotNumber,
      rawImage,
      croppedImage: croppedImage || rawImage,
      detectedBarcode,
      targetFieldHint,
      status: 'queued',
      progress: 0,
      retryCount: 0,
    };

    session.jobs.set(shotId, job);
    session.totalCount = session.jobs.size;
    session.overallStatus = 'extracting';

    const queue = this.jobQueues.get(sessionId) || [];
    queue.push(job);
    this.jobQueues.set(sessionId, queue);

    this.notify(sessionId);
    this.processQueue(sessionId);
  }

  /**
   * Processes pending extraction jobs respecting concurrency limits
   */
  private async processQueue(sessionId: string): Promise<void> {
    const session = this.sessions.get(sessionId);
    if (!session) return;

    const queue = this.jobQueues.get(sessionId);
    if (!queue || queue.length === 0) return;

    while (session.activeRequests < this.MAX_CONCURRENCY && queue.length > 0) {
      const job = queue.shift();
      if (!job) break;

      // Ensure job is still part of session (not removed)
      if (!session.jobs.has(job.shotId)) continue;

      session.activeRequests++;
      this.executeJob(job).finally(() => {
        const s = this.sessions.get(sessionId);
        if (s) {
          s.activeRequests = Math.max(0, s.activeRequests - 1);
          this.recalculateMergedResult(sessionId);
          this.processQueue(sessionId);
        }
      });
    }
  }

  /**
   * Executes background extraction for a single shot with retry logic
   */
  private async executeJob(job: ShotExtractionJob): Promise<void> {
    const { sessionId, shotId } = job;
    const session = this.sessions.get(sessionId);
    if (!session) return;

    const sessionAbort = this.sessionAbortControllers.get(sessionId);
    if (sessionAbort?.signal.aborted) {
      job.status = 'error';
      job.error = 'Session cancelled';
      return;
    }

    job.status = job.retryCount > 0 ? 'retrying' : 'extracting';
    job.progress = 25;
    job.startedAt = Date.now();
    job.abortController = new AbortController();

    this.notify(sessionId);

    try {
      // Use the cropped image (focused on product label) for faster, higher-precision OCR
      const imageToExtract = job.croppedImage || job.rawImage;

      // Build local cues if barcode is already detected
      const localOcrCues: any = {};
      if (job.detectedBarcode) {
        localOcrCues.possibleBarcodes = [job.detectedBarcode];
      }

      // Execute extraction via server-side Gemini 3.8/3.7 Vision proxy
      const result = await extractProduct5FieldsFromImages([imageToExtract], {
        localOcrCues,
      });

      // Ensure session is still active
      if (this.sessionAbortControllers.get(sessionId)?.signal.aborted) {
        return;
      }

      job.status = 'completed';
      job.progress = 100;
      job.result = result;
      job.completedAt = Date.now();
      job.error = undefined;
    } catch (err: unknown) {
      const error = err as Error;
      const isAbort = error.name === 'AbortError' || sessionAbort?.signal.aborted;

      if (isAbort) {
        job.status = 'error';
        job.error = 'Cancelled';
        return;
      }

      const isRateLimit = String(error.message || '').includes('429') || (error as any).code === 'RATE_LIMIT_EXCEEDED';
      const isServerTransient = String(error.message || '').includes('500') || String(error.message || '').includes('503');
      const isTimeout = (error as any).code === 'TIMEOUT' || String(error.message || '').toLowerCase().includes('timeout');
      const isTransient = isRateLimit || isServerTransient || isTimeout;

      if (isTransient && job.retryCount < this.MAX_RETRIES) {
        job.retryCount++;
        job.status = 'retrying';
        job.progress = 10;
        this.notify(sessionId);

        // Bounded exponential backoff delay with jitter
        const backoffMs = Math.min(3500, 1000 * Math.pow(2, job.retryCount) + Math.random() * 250);
        await new Promise((r) => setTimeout(r, backoffMs));

        if (!sessionAbort?.signal.aborted && session.jobs.has(shotId)) {
          return this.executeJob(job);
        }
      }

      job.status = 'error';
      job.error = error.message || 'Extraction failed';
      job.progress = 0;
    } finally {
      this.notify(sessionId);
    }
  }

  /**
   * Recalculates merged product extraction result across all completed shots
   */
  public recalculateMergedResult(sessionId: string): MultiImageMergeSummary | null {
    const session = this.sessions.get(sessionId);
    if (!session) return null;

    const completedJobs = Array.from(session.jobs.values()).filter(
      (j) => j.status === 'completed' && Boolean(j.result)
    );

    const shotResults: ProductScanResult[] = completedJobs
      .map((j) => j.result!)
      .filter(Boolean);

    const allImages = Array.from(session.jobs.values()).map((j) => j.rawImage);

    const summary = mergeMultiShotResults(shotResults, session.hardwareBarcode, allImages);
    session.mergedResult = summary.mergedResult;
    session.conflicts = summary.conflicts;
    session.completedCount = completedJobs.length;

    // Update overall session status
    if (completedJobs.length === session.totalCount && session.totalCount > 0) {
      session.overallStatus = 'completed';
    } else if (completedJobs.length > 0) {
      session.overallStatus = 'partial';
    } else if (session.jobs.size > 0 && Array.from(session.jobs.values()).every((j) => j.status === 'error')) {
      session.overallStatus = 'error';
    }

    this.notify(sessionId);
    return summary;
  }

  /**
   * Removes a specific shot (e.g. user tapped "Retake Last")
   */
  public removeShot(sessionId: string, shotId: string): void {
    const session = this.sessions.get(sessionId);
    if (!session) return;

    const job = session.jobs.get(shotId);
    if (job) {
      job.abortController?.abort();
      session.jobs.delete(shotId);
      session.totalCount = session.jobs.size;

      // Remove from pending queue if queued
      const queue = this.jobQueues.get(sessionId);
      if (queue) {
        this.jobQueues.set(
          sessionId,
          queue.filter((j) => j.shotId !== shotId)
        );
      }

      this.recalculateMergedResult(sessionId);
      this.notify(sessionId);
    }
  }

  /**
   * Cancels entire session and aborts all pending HTTP network requests
   */
  public cancelSession(sessionId: string): void {
    const controller = this.sessionAbortControllers.get(sessionId);
    if (controller) {
      controller.abort();
      this.sessionAbortControllers.delete(sessionId);
    }

    const session = this.sessions.get(sessionId);
    if (session) {
      session.jobs.forEach((j) => j.abortController?.abort());
      session.jobs.clear();
      session.activeRequests = 0;
      session.overallStatus = 'idle';
    }

    this.jobQueues.delete(sessionId);
    this.sessions.delete(sessionId);
    this.listeners.delete(sessionId);
  }

  /**
   * Finishes session and waits gracefully if any in-flight requests are finishing
   */
  public async finishSession(
    sessionId: string,
    maxWaitMs = 5000
  ): Promise<MultiImageMergeSummary> {
    const session = this.getOrCreateSession(sessionId);

    // If all jobs are already completed, return immediately without delay
    const allDone = Array.from(session.jobs.values()).every(
      (j) => j.status === 'completed' || j.status === 'error'
    );

    if (!allDone && session.jobs.size > 0) {
      // Wait for in-flight jobs with a bounded deadline
      const startTime = Date.now();
      await new Promise<void>((resolve) => {
        const interval = setInterval(() => {
          const s = this.sessions.get(sessionId);
          if (!s) {
            clearInterval(interval);
            resolve();
            return;
          }
          const stillRunning = Array.from(s.jobs.values()).some(
            (j) => j.status === 'extracting' || j.status === 'retrying' || j.status === 'queued'
          );
          if (!stillRunning || Date.now() - startTime >= maxWaitMs) {
            clearInterval(interval);
            resolve();
          }
        }, 150);
      });
    }

    const summary = this.recalculateMergedResult(sessionId);

    // Controlled fallback: If multiple shots were captured, but essential fields
    // (e.g. Product Name) are completely missing, trigger a combined multi-image extraction
    if (summary && summary.needsFallback && session.jobs.size >= 2) {
      try {
        console.info('[ProgressiveExtraction] Triggering controlled multi-image fallback extraction...');
        const allCropped = Array.from(session.jobs.values()).map((j) => j.croppedImage || j.rawImage);
        const combinedResult = await extractProduct5FieldsFromImages(allCropped);
        if (combinedResult && combinedResult.productName) {
          // Merge fallback result with existing results
          const reSummary = mergeMultiShotResults(
            [summary.mergedResult, combinedResult],
            session.hardwareBarcode
          );
          session.mergedResult = reSummary.mergedResult;
          this.notify(sessionId);
          return reSummary;
        }
      } catch (fallbackErr) {
        console.warn('[ProgressiveExtraction] Fallback multi-image extraction skipped:', fallbackErr);
      }
    }

    return (
      summary || {
        mergedResult: {
          productName: '',
          price: null,
          currency: 'USD',
          manufactureDate: '',
          expiryDate: '',
          bestBeforeMonths: null,
          quantity: 1,
          unit: 'pcs',
          detectedLanguage: 'English',
        },
        conflicts: [],
        shotsUsedCount: 0,
        isComplete: false,
        needsFallback: false,
      }
    );
  }
}

export const progressiveExtractionService = new ProgressiveExtractionService();
