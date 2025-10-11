/**
 * Integration tests for SchedulerService
 * Tests job scheduling, queue management, priority handling, and retry logic
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { SchedulerService } from '../scheduler';
import { SchedulerConfig, ScrapeJobStatus, ScrapingFrequency } from '../../types';

describe('SchedulerService', () => {
  let scheduler: SchedulerService;
  let config: SchedulerConfig;

  beforeEach(() => {
    config = {
      defaultFrequency: ScrapingFrequency.DAILY,
      maxConcurrentJobs: 3,
      retryAttempts: 3,
      healthCheckInterval: 5000
    };
    scheduler = new SchedulerService(config);
    scheduler.start();
  });

  afterEach(() => {
    scheduler.stop();
  });

  describe('Job Scheduling', () => {
    it('should schedule a job successfully', async () => {
      const job = await scheduler.scheduleJob('test-source-1', 5);

      expect(job).toBeDefined();
      expect(job.id).toMatch(/^job_\d+_[a-z0-9]+$/);
      expect(job.sourceId).toBe('test-source-1');
      expect(job.priority).toBe(5);
      expect(job.status).toBe(ScrapeJobStatus.PENDING);
      expect(job.scheduledAt).toBeInstanceOf(Date);
      expect(job.metadata.attempts).toBe(0);
    });

    it('should schedule a delayed job', async () => {
      const delay = 1000; // 1 second
      const beforeSchedule = Date.now();
      
      const job = await scheduler.scheduleJob('test-source-1', 1, delay);
      
      expect(job.scheduledAt.getTime()).toBeGreaterThanOrEqual(beforeSchedule + delay);
      expect(job.metadata.delay).toBe(delay);
    });

    it('should clamp priority values between 1-10', async () => {
      const lowPriorityJob = await scheduler.scheduleJob('test-source-1', -5);
      const highPriorityJob = await scheduler.scheduleJob('test-source-2', 15);

      expect(lowPriorityJob.priority).toBe(1);
      expect(highPriorityJob.priority).toBe(10);
    });

    it('should schedule recurring jobs', async () => {
      const recurringJobId = await scheduler.scheduleRecurringJob(
        'test-source-1', 
        ScrapingFrequency.HOURLY, 
        3
      );

      expect(recurringJobId).toMatch(/^recurring_test-source-1_HOURLY$/);
      
      // Wait a bit and check if jobs were scheduled
      await new Promise(resolve => setTimeout(resolve, 100));
      const stats = scheduler.getQueueStats();
      expect(stats.pending).toBeGreaterThan(0);
    });
  });

  describe('Job Queue Management', () => {
    it('should retrieve jobs by priority order', async () => {
      // Schedule jobs with different priorities
      await scheduler.scheduleJob('low-priority', 1);
      await scheduler.scheduleJob('high-priority', 10);
      await scheduler.scheduleJob('medium-priority', 5);

      const job1 = await scheduler.getNextJob();
      const job2 = await scheduler.getNextJob();
      const job3 = await scheduler.getNextJob();

      expect(job1?.sourceId).toBe('high-priority');
      expect(job2?.sourceId).toBe('medium-priority');
      expect(job3?.sourceId).toBe('low-priority');
    });

    it('should respect max concurrent jobs limit', async () => {
      // Schedule more jobs than the concurrent limit
      for (let i = 0; i < 5; i++) {
        await scheduler.scheduleJob(`source-${i}`, 1);
      }

      // Get jobs up to the limit
      const jobs = [];
      for (let i = 0; i < 5; i++) {
        const job = await scheduler.getNextJob();
        if (job) jobs.push(job);
      }

      expect(jobs).toHaveLength(config.maxConcurrentJobs);
      
      // Verify no more jobs can be retrieved
      const nextJob = await scheduler.getNextJob();
      expect(nextJob).toBeNull();
    });

    it('should not return jobs scheduled for future execution', async () => {
      const futureDelay = 5000; // 5 seconds in future
      await scheduler.scheduleJob('future-job', 1, futureDelay);

      const job = await scheduler.getNextJob();
      expect(job).toBeNull();
    });

    it('should update job status correctly', async () => {
      const scheduledJob = await scheduler.scheduleJob('test-source', 1);
      const runningJob = await scheduler.getNextJob();
      
      expect(runningJob?.status).toBe(ScrapeJobStatus.RUNNING);
      expect(runningJob?.startedAt).toBeInstanceOf(Date);

      await scheduler.updateJobStatus(runningJob!.id, ScrapeJobStatus.COMPLETED);
      
      const stats = scheduler.getQueueStats();
      expect(stats.running).toBe(0);
      expect(stats.completed).toBe(1);
    });
  });

  describe('Retry Logic', () => {
    it('should retry failed jobs with exponential backoff', async () => {
      const job = await scheduler.scheduleJob('test-source', 1);
      const runningJob = await scheduler.getNextJob();

      // Fail the job
      await scheduler.updateJobStatus(runningJob!.id, ScrapeJobStatus.FAILED, 'Test error');

      const stats = scheduler.getQueueStats();
      expect(stats.scheduled).toBe(1); // Job should be scheduled for retry
      expect(stats.failed).toBe(0); // Not permanently failed yet

      // Wait for retry delay to pass
      await new Promise(resolve => setTimeout(resolve, 1100)); // Wait slightly longer than base delay

      // Get the retried job
      const retriedJob = await scheduler.getNextJob();
      expect(retriedJob?.metadata.attempts).toBe(1);
      expect(retriedJob?.metadata.retryDelay).toBeGreaterThan(0);
    });

    it('should calculate exponential backoff delays correctly', () => {
      const scheduler = new SchedulerService(config);
      
      // Test the private method through reflection
      const calculateRetryDelay = (scheduler as any).calculateRetryDelay.bind(scheduler);
      
      const delay1 = calculateRetryDelay(1);
      const delay2 = calculateRetryDelay(2);
      const delay3 = calculateRetryDelay(3);
      
      expect(delay1).toBe(1000); // Base delay
      expect(delay2).toBe(2000); // Base delay * 2
      expect(delay3).toBe(4000); // Base delay * 4
    });

    it('should track job attempt counts correctly', async () => {
      const job = await scheduler.scheduleJob('test-source', 1);
      const runningJob = await scheduler.getNextJob();

      // Initial attempt count should be 0
      expect(runningJob!.metadata.attempts).toBe(0);

      // Fail the job
      await scheduler.updateJobStatus(runningJob!.id, ScrapeJobStatus.FAILED, 'Test error');

      // Wait for retry and get the job again
      await new Promise(resolve => setTimeout(resolve, 1100));
      const retriedJob = await scheduler.getNextJob();

      // Attempt count should be incremented
      expect(retriedJob?.metadata.attempts).toBe(1);
    });
  });

  describe('Job Cancellation', () => {
    it('should cancel pending jobs', async () => {
      const job = await scheduler.scheduleJob('test-source', 1);
      const cancelled = await scheduler.cancelJob(job.id);

      expect(cancelled).toBe(true);
      
      const nextJob = await scheduler.getNextJob();
      expect(nextJob).toBeNull();
    });

    it('should cancel scheduled future jobs', async () => {
      const job = await scheduler.scheduleJob('test-source', 1, 5000);
      const cancelled = await scheduler.cancelJob(job.id);

      expect(cancelled).toBe(true);
    });

    it('should mark running jobs for cancellation', async () => {
      const job = await scheduler.scheduleJob('test-source', 1);
      const runningJob = await scheduler.getNextJob();
      
      const cancelled = await scheduler.cancelJob(runningJob!.id);
      expect(cancelled).toBe(true);
      expect(runningJob!.metadata.cancelRequested).toBe(true);
    });
  });

  describe('Queue Statistics and Management', () => {
    it('should provide accurate queue statistics', async () => {
      await scheduler.scheduleJob('source-1', 1);
      await scheduler.scheduleJob('source-2', 1);
      await scheduler.scheduleJob('source-3', 1, 5000); // Future job

      const job1 = await scheduler.getNextJob();
      await scheduler.updateJobStatus(job1!.id, ScrapeJobStatus.COMPLETED);

      const job2 = await scheduler.getNextJob();
      await scheduler.updateJobStatus(job2!.id, ScrapeJobStatus.FAILED, 'Test error');

      const stats = scheduler.getQueueStats();
      expect(stats.pending).toBe(0); // Retried job is scheduled, future job is scheduled
      expect(stats.running).toBe(0);
      expect(stats.completed).toBe(1);
      expect(stats.failed).toBe(0); // Failed job was retried
      expect(stats.scheduled).toBe(2); // Retried job + future job
      expect(stats.maxConcurrent).toBe(config.maxConcurrentJobs);
    });

    it('should get jobs by status', async () => {
      await scheduler.scheduleJob('pending-job', 1);
      const runningJob = await scheduler.getNextJob();
      await scheduler.updateJobStatus(runningJob!.id, ScrapeJobStatus.COMPLETED);

      const pendingJobs = scheduler.getJobsByStatus(ScrapeJobStatus.PENDING);
      const runningJobs = scheduler.getJobsByStatus(ScrapeJobStatus.RUNNING);
      const completedJobs = scheduler.getJobsByStatus(ScrapeJobStatus.COMPLETED);

      expect(pendingJobs).toHaveLength(0);
      expect(runningJobs).toHaveLength(0);
      expect(completedJobs).toHaveLength(1);
      expect(completedJobs[0].sourceId).toBe('pending-job');
    });

    it('should clean up old jobs', async () => {
      const job = await scheduler.scheduleJob('test-source', 1);
      const runningJob = await scheduler.getNextJob();
      await scheduler.updateJobStatus(runningJob!.id, ScrapeJobStatus.COMPLETED);

      // Mock old timestamp
      const completedJobs = scheduler.getJobsByStatus(ScrapeJobStatus.COMPLETED);
      completedJobs[0].finishedAt = new Date(Date.now() - 25 * 60 * 60 * 1000); // 25 hours ago

      const cleanedCount = await scheduler.cleanupOldJobs(24 * 60 * 60 * 1000); // 24 hours
      expect(cleanedCount).toBe(1);

      const remainingCompleted = scheduler.getJobsByStatus(ScrapeJobStatus.COMPLETED);
      expect(remainingCompleted).toHaveLength(0);
    });
  });

  describe('Health Checks', () => {
    it('should detect and handle stuck jobs', async () => {
      const job = await scheduler.scheduleJob('test-source', 1);
      const runningJob = await scheduler.getNextJob();

      // Mock old start time to simulate stuck job
      runningJob!.startedAt = new Date(Date.now() - 35 * 60 * 1000); // 35 minutes ago

      // Trigger health check manually
      await (scheduler as any).performHealthCheck();

      const stats = scheduler.getQueueStats();
      expect(stats.running).toBe(0); // Stuck job should be marked as failed
    });
  });

  describe('Service Lifecycle', () => {
    it('should start and stop service correctly', () => {
      const newScheduler = new SchedulerService(config);
      
      expect(newScheduler.getQueueStats().pending).toBe(0);
      
      newScheduler.start();
      expect((newScheduler as any).isRunning).toBe(true);
      
      newScheduler.stop();
      expect((newScheduler as any).isRunning).toBe(false);
    });
  });
});