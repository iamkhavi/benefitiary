/**
 * Scheduler Service for managing scraping job scheduling and execution
 * Implements job queue management with priority and retry logic
 */

import { ScrapeJob, ScrapeJobStatus, SchedulerConfig, ScrapingFrequency } from '../types';

interface JobQueue {
  pending: ScrapeJob[];
  running: ScrapeJob[];
  completed: ScrapeJob[];
  failed: ScrapeJob[];
}

interface RetryConfig {
  maxAttempts: number;
  baseDelay: number; // milliseconds
  maxDelay: number; // milliseconds
  backoffMultiplier: number;
}

export class SchedulerService {
  private config: SchedulerConfig;
  private jobQueue: JobQueue;
  private retryConfig: RetryConfig;
  private activeJobs: Map<string, ScrapeJob>;
  private scheduledJobs: Map<string, NodeJS.Timeout>;
  private isRunning: boolean = false;

  constructor(config: SchedulerConfig) {
    this.config = config;
    this.jobQueue = {
      pending: [],
      running: [],
      completed: [],
      failed: []
    };
    this.retryConfig = {
      maxAttempts: config.retryAttempts || 3,
      baseDelay: 1000, // 1 second
      maxDelay: 300000, // 5 minutes
      backoffMultiplier: 2
    };
    this.activeJobs = new Map();
    this.scheduledJobs = new Map();
  }

  /**
   * Schedule a new scraping job
   */
  async scheduleJob(sourceId: string, priority: number = 1, delay: number = 0): Promise<ScrapeJob> {
    const job: ScrapeJob = {
      id: `job_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      sourceId,
      scheduledAt: new Date(Date.now() + delay),
      status: ScrapeJobStatus.PENDING,
      priority: Math.max(1, Math.min(10, priority)), // Clamp priority between 1-10
      metadata: {
        attempts: 0,
        createdAt: new Date(),
        delay
      },
    };

    if (delay > 0) {
      // Schedule job for future execution
      const timeout = setTimeout(() => {
        this.addJobToQueue(job);
        this.scheduledJobs.delete(job.id);
      }, delay);
      
      this.scheduledJobs.set(job.id, timeout);
    } else {
      // Add job immediately to queue
      this.addJobToQueue(job);
    }

    return job;
  }

  /**
   * Schedule recurring jobs based on frequency
   */
  async scheduleRecurringJob(sourceId: string, frequency: ScrapingFrequency, priority: number = 1): Promise<string> {
    const intervalMs = this.getFrequencyInterval(frequency);
    const recurringJobId = `recurring_${sourceId}_${frequency}`;

    const scheduleNext = async () => {
      await this.scheduleJob(sourceId, priority);
      setTimeout(scheduleNext, intervalMs);
    };

    // Schedule first job immediately
    await scheduleNext();

    return recurringJobId;
  }

  /**
   * Get the next job from the queue (highest priority first)
   */
  async getNextJob(): Promise<ScrapeJob | null> {
    if (this.jobQueue.pending.length === 0) {
      return null;
    }

    // Check if we've reached max concurrent jobs
    if (this.jobQueue.running.length >= this.config.maxConcurrentJobs) {
      return null;
    }

    // Sort by priority (higher priority first), then by scheduled time
    this.jobQueue.pending.sort((a, b) => {
      if (a.priority !== b.priority) {
        return b.priority - a.priority; // Higher priority first
      }
      return a.scheduledAt.getTime() - b.scheduledAt.getTime(); // Earlier scheduled first
    });

    // Get the highest priority job that's ready to run
    const now = new Date();
    const jobIndex = this.jobQueue.pending.findIndex(job => job.scheduledAt <= now);
    
    if (jobIndex === -1) {
      return null; // No jobs ready to run yet
    }

    const job = this.jobQueue.pending.splice(jobIndex, 1)[0];
    job.status = ScrapeJobStatus.RUNNING;
    job.startedAt = new Date();
    
    this.jobQueue.running.push(job);
    this.activeJobs.set(job.id, job);

    return job;
  }

  /**
   * Update job status and handle completion/failure
   */
  async updateJobStatus(jobId: string, status: ScrapeJobStatus, error?: string): Promise<void> {
    const job = this.activeJobs.get(jobId);
    if (!job) {
      console.warn(`Job ${jobId} not found in active jobs`);
      return;
    }

    job.status = status;
    job.finishedAt = new Date();

    // Remove from running queue
    const runningIndex = this.jobQueue.running.findIndex(j => j.id === jobId);
    if (runningIndex !== -1) {
      this.jobQueue.running.splice(runningIndex, 1);
    }

    switch (status) {
      case ScrapeJobStatus.COMPLETED:
        this.jobQueue.completed.push(job);
        this.activeJobs.delete(jobId);
        break;

      case ScrapeJobStatus.FAILED:
        job.metadata.lastError = error;
        job.metadata.attempts = (job.metadata.attempts || 0) + 1;

        if (job.metadata.attempts < this.retryConfig.maxAttempts) {
          // Schedule retry with exponential backoff
          const delay = this.calculateRetryDelay(job.metadata.attempts);
          job.metadata.retryDelay = delay;
          
          console.log(`Scheduling retry for job ${jobId} in ${delay}ms (attempt ${job.metadata.attempts + 1}/${this.retryConfig.maxAttempts})`);
          
          // Reset job status and reschedule
          job.status = ScrapeJobStatus.PENDING;
          job.scheduledAt = new Date(Date.now() + delay);
          job.startedAt = undefined;
          job.finishedAt = undefined;
          
          // Schedule the retry with a timeout if delay > 0
          if (delay > 0) {
            const timeout = setTimeout(() => {
              this.addJobToQueue(job);
              this.scheduledJobs.delete(`retry_${jobId}`);
            }, delay);
            
            this.scheduledJobs.set(`retry_${jobId}`, timeout);
          } else {
            this.addJobToQueue(job);
          }
        } else {
          // Max retries reached, mark as permanently failed
          this.jobQueue.failed.push(job);
          this.activeJobs.delete(jobId);
          console.error(`Job ${jobId} failed permanently after ${job.metadata.attempts} attempts`);
        }
        break;

      case ScrapeJobStatus.CANCELLED:
        this.activeJobs.delete(jobId);
        break;
    }
  }

  /**
   * Cancel a scheduled or running job
   */
  async cancelJob(jobId: string): Promise<boolean> {
    // Check if it's a scheduled job
    const scheduledTimeout = this.scheduledJobs.get(jobId);
    if (scheduledTimeout) {
      clearTimeout(scheduledTimeout);
      this.scheduledJobs.delete(jobId);
      return true;
    }

    // Check if it's in pending queue
    const pendingIndex = this.jobQueue.pending.findIndex(job => job.id === jobId);
    if (pendingIndex !== -1) {
      const job = this.jobQueue.pending.splice(pendingIndex, 1)[0];
      job.status = ScrapeJobStatus.CANCELLED;
      return true;
    }

    // Check if it's running (mark for cancellation)
    const runningJob = this.activeJobs.get(jobId);
    if (runningJob) {
      runningJob.status = ScrapeJobStatus.CANCELLED;
      runningJob.metadata.cancelRequested = true;
      return true;
    }

    return false;
  }

  /**
   * Reschedule all failed jobs that haven't exceeded retry limits
   */
  async rescheduleFailedJobs(): Promise<number> {
    const failedJobs = [...this.jobQueue.failed];
    let rescheduledCount = 0;

    for (const job of failedJobs) {
      if ((job.metadata.attempts || 0) < this.retryConfig.maxAttempts) {
        // Remove from failed queue
        const failedIndex = this.jobQueue.failed.findIndex(j => j.id === job.id);
        if (failedIndex !== -1) {
          this.jobQueue.failed.splice(failedIndex, 1);
        }

        // Reset and reschedule
        job.status = ScrapeJobStatus.PENDING;
        job.scheduledAt = new Date();
        job.startedAt = undefined;
        job.finishedAt = undefined;
        
        this.addJobToQueue(job);
        rescheduledCount++;
      }
    }

    console.log(`Rescheduled ${rescheduledCount} failed jobs`);
    return rescheduledCount;
  }

  /**
   * Get job queue statistics
   */
  getQueueStats() {
    return {
      pending: this.jobQueue.pending.length,
      running: this.jobQueue.running.length,
      completed: this.jobQueue.completed.length,
      failed: this.jobQueue.failed.length,
      scheduled: this.scheduledJobs.size,
      maxConcurrent: this.config.maxConcurrentJobs
    };
  }

  /**
   * Get jobs by status
   */
  getJobsByStatus(status: ScrapeJobStatus): ScrapeJob[] {
    switch (status) {
      case ScrapeJobStatus.PENDING:
        return [...this.jobQueue.pending];
      case ScrapeJobStatus.RUNNING:
        return [...this.jobQueue.running];
      case ScrapeJobStatus.COMPLETED:
        return [...this.jobQueue.completed];
      case ScrapeJobStatus.FAILED:
        return [...this.jobQueue.failed];
      default:
        return [];
    }
  }

  /**
   * Clean up old completed and failed jobs
   */
  async cleanupOldJobs(maxAge: number = 24 * 60 * 60 * 1000): Promise<number> {
    const cutoffTime = new Date(Date.now() - maxAge);
    let cleanedCount = 0;

    // Clean completed jobs
    const completedToKeep = this.jobQueue.completed.filter(job => 
      job.finishedAt && job.finishedAt > cutoffTime
    );
    cleanedCount += this.jobQueue.completed.length - completedToKeep.length;
    this.jobQueue.completed = completedToKeep;

    // Clean failed jobs
    const failedToKeep = this.jobQueue.failed.filter(job => 
      job.finishedAt && job.finishedAt > cutoffTime
    );
    cleanedCount += this.jobQueue.failed.length - failedToKeep.length;
    this.jobQueue.failed = failedToKeep;

    return cleanedCount;
  }

  /**
   * Start the scheduler service
   */
  start(): void {
    if (this.isRunning) {
      return;
    }

    this.isRunning = true;
    console.log('Scheduler service started');

    // Start health check interval
    setInterval(() => {
      this.performHealthCheck();
    }, this.config.healthCheckInterval);
  }

  /**
   * Stop the scheduler service
   */
  stop(): void {
    if (!this.isRunning) {
      return;
    }

    this.isRunning = false;
    
    // Clear all scheduled timeouts
    for (const timeout of this.scheduledJobs.values()) {
      clearTimeout(timeout);
    }
    this.scheduledJobs.clear();

    console.log('Scheduler service stopped');
  }

  /**
   * Private helper methods
   */
  private addJobToQueue(job: ScrapeJob): void {
    this.jobQueue.pending.push(job);
  }

  private calculateRetryDelay(attemptNumber: number): number {
    const delay = this.retryConfig.baseDelay * Math.pow(this.retryConfig.backoffMultiplier, attemptNumber - 1);
    return Math.min(delay, this.retryConfig.maxDelay);
  }

  private getFrequencyInterval(frequency: ScrapingFrequency): number {
    switch (frequency) {
      case ScrapingFrequency.HOURLY:
        return 60 * 60 * 1000; // 1 hour
      case ScrapingFrequency.DAILY:
        return 24 * 60 * 60 * 1000; // 24 hours
      case ScrapingFrequency.WEEKLY:
        return 7 * 24 * 60 * 60 * 1000; // 7 days
      case ScrapingFrequency.MONTHLY:
        return 30 * 24 * 60 * 60 * 1000; // 30 days
      default:
        return 24 * 60 * 60 * 1000; // Default to daily
    }
  }

  private async performHealthCheck(): Promise<void> {
    // Check for stuck jobs (running for too long)
    const stuckJobTimeout = 30 * 60 * 1000; // 30 minutes
    const now = new Date();

    for (const job of this.jobQueue.running) {
      if (job.startedAt && (now.getTime() - job.startedAt.getTime()) > stuckJobTimeout) {
        console.warn(`Job ${job.id} appears to be stuck, marking as failed`);
        await this.updateJobStatus(job.id, ScrapeJobStatus.FAILED, 'Job timeout - stuck for too long');
      }
    }

    // Log queue statistics
    const stats = this.getQueueStats();
    console.log(`Queue stats: ${JSON.stringify(stats)}`);
  }
}