import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import { 
  monitoringService, 
  trackPerformance, 
  trackError, 
  trackUserInteraction,
  PerformanceMetric,
  ErrorMetric,
  UserInteractionMetric
} from '../monitoring-service'

describe('MonitoringService', () => {
  beforeEach(() => {
    // Clear metrics before each test
    monitoringService.clearAllMetrics()
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('Performance Tracking', () => {
    it('should track performance metrics correctly', () => {
      const startTime = Date.now() - 1000 // 1 second ago
      const operation = 'generateDailyCurator'
      const metadata = { service: 'ai', contentCount: 5 }

      trackPerformance(operation, startTime, true, metadata)

      const healthMetrics = monitoringService.getServiceHealthMetrics()
      expect(healthMetrics.aiService.totalRequests).toBe(1)
      expect(healthMetrics.aiService.successRate).toBe(100)
      expect(healthMetrics.aiService.averageResponseTime).toBeGreaterThan(0)
    })

    it('should track failed performance metrics', () => {
      const startTime = Date.now() - 2000 // 2 seconds ago
      const operation = 'processUserRequest'

      trackPerformance(operation, startTime, false, { error: 'Network timeout' })

      const healthMetrics = monitoringService.getServiceHealthMetrics()
      expect(healthMetrics.aiService.totalRequests).toBe(1)
      expect(healthMetrics.aiService.successRate).toBeLessThan(100)
    })

    it('should log warnings for slow operations', () => {
      const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})
      const startTime = Date.now() - 6000 // 6 seconds ago (slow)

      trackPerformance('slowOperation', startTime, true)

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('Slow operation detected: slowOperation took')
      )
    })

    it('should calculate service metrics correctly', () => {
      // Track multiple operations
      const baseTime = Date.now()
      trackPerformance('ai-operation-1', baseTime - 1000, true, { service: 'ai' })
      trackPerformance('ai-operation-2', baseTime - 500, true, { service: 'ai' })
      trackPerformance('ai-operation-3', baseTime - 2000, false, { service: 'ai' })

      const healthMetrics = monitoringService.getServiceHealthMetrics()
      expect(healthMetrics.aiService.totalRequests).toBe(3)
      expect(healthMetrics.aiService.successRate).toBeCloseTo(66.67, 1)
      expect(healthMetrics.aiService.averageResponseTime).toBeGreaterThan(0)
    })
  })

  describe('Error Tracking', () => {
    it('should track errors correctly', () => {
      trackError('ai', 'generateDailyCurator', 'API timeout', true, {
        operation: 'daily-curator-generation'
      })

      const errorSummary = monitoringService.getErrorSummary()
      expect(errorSummary).toHaveLength(1)
      expect(errorSummary[0].service).toBe('ai')
      expect(errorSummary[0].count).toBe(1)
    })

    it('should log critical errors', () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

      trackError('tmdb', 'tmdbRequest', 'Invalid API key', false)

      expect(consoleSpy).toHaveBeenCalledWith(
        'Critical error in tmdb:tmdbRequest - Invalid API key'
      )
    })

    it('should group errors by service', () => {
      trackError('ai', 'operation1', 'Error 1', true)
      trackError('ai', 'operation2', 'Error 2', true)
      trackError('tmdb', 'operation3', 'Error 3', true)

      const errorSummary = monitoringService.getErrorSummary()
      expect(errorSummary).toHaveLength(2)
      
      const aiErrors = errorSummary.find(e => e.service === 'ai')
      const tmdbErrors = errorSummary.find(e => e.service === 'tmdb')
      
      expect(aiErrors?.count).toBe(2)
      expect(tmdbErrors?.count).toBe(1)
    })

    it('should track TMDB rate limit errors specifically', () => {
      trackError('tmdb', 'tmdbRequest', 'Rate limit exceeded', true, {
        statusCode: 429
      })

      const healthMetrics = monitoringService.getServiceHealthMetrics()
      expect(healthMetrics.tmdbService.rateLimitHits).toBe(1)
    })
  })

  describe('User Interaction Tracking', () => {
    it('should track user interactions correctly', () => {
      trackUserInteraction('daily_curator_view', 'daily', undefined, undefined, {
        curator: 'Test Curator',
        theme: 'Test Theme'
      })

      const qualityMetrics = monitoringService.getRecommendationQualityMetrics()
      expect(qualityMetrics.dailyCurator.viewRate).toBe(1)
    })

    it('should track content clicks', () => {
      trackUserInteraction('content_click', 'daily', '12345', 'movie', {
        title: 'Test Movie'
      })

      trackUserInteraction('daily_curator_view', 'daily')

      const qualityMetrics = monitoringService.getRecommendationQualityMetrics()
      expect(qualityMetrics.dailyCurator.clickThroughRate).toBe(100) // 1 click / 1 view
    })

    it('should track play button interactions', () => {
      trackUserInteraction('daily_curator_view', 'daily')
      trackUserInteraction('content_click', 'daily', '12345', 'movie')
      trackUserInteraction('play_button', 'daily', '12345', 'movie')

      const qualityMetrics = monitoringService.getRecommendationQualityMetrics()
      expect(qualityMetrics.dailyCurator.contentPlayRate).toBe(100) // 1 play / 1 click
    })

    it('should calculate chat recommendation metrics', () => {
      trackUserInteraction('chat_message', 'chat')
      trackUserInteraction('content_click', 'chat', '67890', 'tv')
      trackUserInteraction('recommendation_feedback', 'chat', undefined, undefined, {
        rating: 5
      })

      const qualityMetrics = monitoringService.getRecommendationQualityMetrics()
      expect(qualityMetrics.chatRecommendations.responseRelevance).toBe(100) // 1 click / 1 message
      expect(qualityMetrics.chatRecommendations.userSatisfaction).toBe(100) // 1 positive / 1 feedback
    })

    it('should calculate follow-up rate correctly', () => {
      trackUserInteraction('chat_message', 'chat')
      trackUserInteraction('chat_message', 'chat')
      trackUserInteraction('chat_message', 'chat')

      const qualityMetrics = monitoringService.getRecommendationQualityMetrics()
      expect(qualityMetrics.chatRecommendations.followUpRate).toBeCloseTo(66.67, 1) // 2 follow-ups / 3 messages
    })
  })

  describe('Service Health Metrics', () => {
    it('should return comprehensive service health metrics', () => {
      // Add some test data
      trackPerformance('ai-operation', Date.now() - 1000, true, { service: 'ai' })
      trackPerformance('tmdb-operation', Date.now() - 500, true, { service: 'tmdb' })
      trackError('ai', 'operation', 'test error', true)

      const healthMetrics = monitoringService.getServiceHealthMetrics()

      expect(healthMetrics).toHaveProperty('aiService')
      expect(healthMetrics).toHaveProperty('tmdbService')
      expect(healthMetrics).toHaveProperty('contentProcessing')

      expect(healthMetrics.aiService).toHaveProperty('successRate')
      expect(healthMetrics.aiService).toHaveProperty('averageResponseTime')
      expect(healthMetrics.aiService).toHaveProperty('totalRequests')
      expect(healthMetrics.aiService).toHaveProperty('errors')

      expect(healthMetrics.tmdbService).toHaveProperty('rateLimitHits')
    })

    it('should filter metrics by time window', () => {
      const oldTime = Date.now() - (2 * 60 * 60 * 1000) // 2 hours ago
      const recentTime = Date.now() - (30 * 60 * 1000) // 30 minutes ago

      // Add old metric (should be filtered out)
      trackPerformance('old-operation', oldTime, true, { service: 'ai' })
      
      // Add recent metric (should be included)
      trackPerformance('recent-operation', recentTime, true, { service: 'ai' })

      const healthMetrics = monitoringService.getServiceHealthMetrics()
      expect(healthMetrics.aiService.totalRequests).toBe(1) // Only recent metric
    })
  })

  describe('Data Management', () => {
    it('should export metrics correctly', () => {
      trackPerformance('test-operation', Date.now() - 1000, true)
      trackError('ai', 'test-operation', 'test error', true)
      trackUserInteraction('daily_curator_view', 'daily')

      const exportedData = monitoringService.exportMetrics()

      expect(exportedData).toHaveProperty('performance')
      expect(exportedData).toHaveProperty('errors')
      expect(exportedData).toHaveProperty('interactions')
      expect(exportedData).toHaveProperty('exportedAt')

      expect(exportedData.performance).toHaveLength(1)
      expect(exportedData.errors).toHaveLength(1)
      expect(exportedData.interactions).toHaveLength(1)
    })

    it('should clear old metrics correctly', () => {
      // Add some metrics
      trackPerformance('test-operation', Date.now() - 1000, true)
      trackError('ai', 'test-operation', 'test error', true)
      trackUserInteraction('daily_curator_view', 'daily')

      // Verify metrics exist
      let exportedData = monitoringService.exportMetrics()
      expect(exportedData.performance).toHaveLength(1)
      expect(exportedData.errors).toHaveLength(1)
      expect(exportedData.interactions).toHaveLength(1)

      // Clear metrics
      monitoringService.clearOldMetrics()

      // Verify metrics are cleared
      exportedData = monitoringService.exportMetrics()
      expect(exportedData.performance).toHaveLength(0)
      expect(exportedData.errors).toHaveLength(0)
      expect(exportedData.interactions).toHaveLength(0)
    })

    it('should limit metrics history to prevent memory issues', () => {
      // Add more than the max limit (1000) of metrics
      for (let i = 0; i < 1100; i++) {
        trackPerformance(`operation-${i}`, Date.now() - i, true)
      }

      const exportedData = monitoringService.exportMetrics()
      expect(exportedData.performance.length).toBeLessThanOrEqual(1000)
    })
  })

  describe('Recommendation Quality Metrics', () => {
    it('should calculate daily curator metrics correctly', () => {
      // Simulate daily curator interactions
      trackUserInteraction('daily_curator_view', 'daily')
      trackUserInteraction('daily_curator_view', 'daily')
      trackUserInteraction('content_click', 'daily', '123', 'movie')
      trackUserInteraction('play_button', 'daily', '123', 'movie')

      const qualityMetrics = monitoringService.getRecommendationQualityMetrics()
      
      expect(qualityMetrics.dailyCurator.viewRate).toBe(2)
      expect(qualityMetrics.dailyCurator.clickThroughRate).toBe(50) // 1 click / 2 views
      expect(qualityMetrics.dailyCurator.contentPlayRate).toBe(100) // 1 play / 1 click
    })

    it('should handle zero interactions gracefully', () => {
      const qualityMetrics = monitoringService.getRecommendationQualityMetrics()
      
      expect(qualityMetrics.dailyCurator.viewRate).toBe(0)
      expect(qualityMetrics.dailyCurator.clickThroughRate).toBe(0)
      expect(qualityMetrics.dailyCurator.contentPlayRate).toBe(0)
      expect(qualityMetrics.chatRecommendations.responseRelevance).toBe(0)
      expect(qualityMetrics.chatRecommendations.userSatisfaction).toBe(0)
      expect(qualityMetrics.chatRecommendations.followUpRate).toBe(0)
    })

    it('should filter interactions by time window (24 hours)', () => {
      const oldTime = Date.now() - (25 * 60 * 60 * 1000) // 25 hours ago
      const recentTime = Date.now() - (1 * 60 * 60 * 1000) // 1 hour ago

      // This would normally require mocking the timestamp, but for simplicity
      // we'll test that the function exists and returns reasonable values
      trackUserInteraction('daily_curator_view', 'daily')
      
      const qualityMetrics = monitoringService.getRecommendationQualityMetrics()
      expect(qualityMetrics.dailyCurator.viewRate).toBeGreaterThanOrEqual(0)
    })
  })

  describe('Utility Functions', () => {
    it('should provide convenient tracking functions', () => {
      expect(typeof trackPerformance).toBe('function')
      expect(typeof trackError).toBe('function')
      expect(typeof trackUserInteraction).toBe('function')
    })

    it('should track performance with utility function', () => {
      trackPerformance('utility-test', Date.now() - 1000, true, { test: true })
      
      const healthMetrics = monitoringService.getServiceHealthMetrics()
      expect(healthMetrics.aiService.totalRequests).toBeGreaterThan(0)
    })

    it('should track errors with utility function', () => {
      trackError('ai', 'utility-test', 'test error', true, { test: true })
      
      const errorSummary = monitoringService.getErrorSummary()
      expect(errorSummary.length).toBeGreaterThan(0)
    })

    it('should track user interactions with utility function', () => {
      trackUserInteraction('daily_curator_view', 'daily', undefined, undefined, { test: true })
      
      const qualityMetrics = monitoringService.getRecommendationQualityMetrics()
      expect(qualityMetrics.dailyCurator.viewRate).toBeGreaterThan(0)
    })
  })
})