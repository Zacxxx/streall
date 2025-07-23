/**
 * Monitoring and Analytics Service
 * Tracks performance, errors, and user interactions for AI suggestions system
 */

export interface PerformanceMetric {
  operation: string
  duration: number
  timestamp: Date
  success: boolean
  metadata?: Record<string, any>
}

export interface ErrorMetric {
  service: 'ai' | 'tmdb' | 'cache' | 'content-processing'
  operation: string
  error: string
  timestamp: Date
  recoverable: boolean
  metadata?: Record<string, any>
}

export interface UserInteractionMetric {
  action: 'daily_curator_view' | 'chat_message' | 'content_click' | 'play_button' | 'recommendation_feedback'
  contentId?: string
  contentType?: 'movie' | 'tv'
  source: 'daily' | 'chat'
  timestamp: Date
  metadata?: Record<string, any>
}

export interface ServiceHealthMetrics {
  aiService: {
    successRate: number
    averageResponseTime: number
    totalRequests: number
    errors: number
  }
  tmdbService: {
    successRate: number
    averageResponseTime: number
    totalRequests: number
    errors: number
    rateLimitHits: number
  }
  contentProcessing: {
    successRate: number
    averageResponseTime: number
    totalRequests: number
    errors: number
  }
}

export interface RecommendationQualityMetrics {
  dailyCurator: {
    viewRate: number
    clickThroughRate: number
    contentPlayRate: number
  }
  chatRecommendations: {
    responseRelevance: number
    userSatisfaction: number
    followUpRate: number
  }
}

class MonitoringService {
  private performanceMetrics: PerformanceMetric[] = []
  private errorMetrics: ErrorMetric[] = []
  private userInteractionMetrics: UserInteractionMetric[] = []
  private maxMetricsHistory = 1000 // Keep last 1000 entries of each type

  /**
   * Track performance metrics for service operations
   */
  trackPerformance(
    operation: string,
    startTime: number,
    success: boolean,
    metadata?: Record<string, any>
  ): void {
    const metric: PerformanceMetric = {
      operation,
      duration: Date.now() - startTime,
      timestamp: new Date(),
      success,
      metadata
    }

    this.performanceMetrics.push(metric)
    this.trimMetricsArray(this.performanceMetrics)

    // Log significant performance issues
    if (metric.duration > 5000) {
      console.warn(`Slow operation detected: ${operation} took ${metric.duration}ms`)
    }
  }

  /**
   * Track error occurrences across services
   */
  trackError(
    service: ErrorMetric['service'],
    operation: string,
    error: string,
    recoverable: boolean,
    metadata?: Record<string, any>
  ): void {
    const errorMetric: ErrorMetric = {
      service,
      operation,
      error,
      timestamp: new Date(),
      recoverable,
      metadata
    }

    this.errorMetrics.push(errorMetric)
    this.trimMetricsArray(this.errorMetrics)

    // Log critical errors
    if (!recoverable) {
      console.error(`Critical error in ${service}:${operation} - ${error}`)
    }
  }

  /**
   * Track user interactions for recommendation quality analysis
   */
  trackUserInteraction(
    action: UserInteractionMetric['action'],
    source: UserInteractionMetric['source'],
    contentId?: string,
    contentType?: 'movie' | 'tv',
    metadata?: Record<string, any>
  ): void {
    const interaction: UserInteractionMetric = {
      action,
      source,
      contentId,
      contentType,
      timestamp: new Date(),
      metadata
    }

    this.userInteractionMetrics.push(interaction)
    this.trimMetricsArray(this.userInteractionMetrics)
  }

  /**
   * Get comprehensive service health metrics
   */
  getServiceHealthMetrics(): ServiceHealthMetrics {
    const now = new Date()
    const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000)

    // Filter recent metrics
    const recentPerformance = this.performanceMetrics.filter(m => m.timestamp >= oneHourAgo)
    const recentErrors = this.errorMetrics.filter(m => m.timestamp >= oneHourAgo)

    return {
      aiService: this.calculateServiceMetrics(recentPerformance, recentErrors, 'ai'),
      tmdbService: this.calculateTMDBMetrics(recentPerformance, recentErrors),
      contentProcessing: this.calculateServiceMetrics(recentPerformance, recentErrors, 'content-processing')
    }
  }

  /**
   * Get recommendation quality metrics
   */
  getRecommendationQualityMetrics(): RecommendationQualityMetrics {
    const now = new Date()
    const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000)

    // Filter recent interactions
    const recentInteractions = this.userInteractionMetrics.filter(i => i.timestamp >= oneDayAgo)

    return {
      dailyCurator: this.calculateDailyCuratorMetrics(recentInteractions),
      chatRecommendations: this.calculateChatRecommendationMetrics(recentInteractions)
    }
  }

  /**
   * Get error summary for monitoring dashboard
   */
  getErrorSummary(): { service: string; count: number; lastError: Date }[] {
    const now = new Date()
    const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000)
    const recentErrors = this.errorMetrics.filter(e => e.timestamp >= oneHourAgo)

    const errorsByService = recentErrors.reduce((acc, error) => {
      if (!acc[error.service]) {
        acc[error.service] = { count: 0, lastError: error.timestamp }
      }
      acc[error.service]!.count++
      if (error.timestamp > acc[error.service]!.lastError) {
        acc[error.service]!.lastError = error.timestamp
      }
      return acc
    }, {} as Record<string, { count: number; lastError: Date }>)

    return Object.entries(errorsByService).map(([service, data]) => ({
      service,
      count: data.count,
      lastError: data.lastError
    }))
  }

  /**
   * Export metrics for external analysis
   */
  exportMetrics(): {
    performance: PerformanceMetric[]
    errors: ErrorMetric[]
    interactions: UserInteractionMetric[]
    exportedAt: Date
  } {
    return {
      performance: [...this.performanceMetrics],
      errors: [...this.errorMetrics],
      interactions: [...this.userInteractionMetrics],
      exportedAt: new Date()
    }
  }

  /**
   * Clear old metrics to prevent memory issues
   */
  clearOldMetrics(): void {
    const oneWeekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)

    this.performanceMetrics = this.performanceMetrics.filter(m => m.timestamp >= oneWeekAgo)
    this.errorMetrics = this.errorMetrics.filter(m => m.timestamp >= oneWeekAgo)
    this.userInteractionMetrics = this.userInteractionMetrics.filter(m => m.timestamp >= oneWeekAgo)
  }

  /**
   * Clear all metrics (for testing purposes)
   */
  clearAllMetrics(): void {
    this.performanceMetrics = []
    this.errorMetrics = []
    this.userInteractionMetrics = []
  }

  private calculateServiceMetrics(
    performanceMetrics: PerformanceMetric[],
    errorMetrics: ErrorMetric[],
    service: string
  ) {
    const servicePerformance = performanceMetrics.filter(m => 
      m.operation.toLowerCase().includes(service) || 
      m.metadata?.service === service
    )
    const serviceErrors = errorMetrics.filter(e => e.service === service)

    const totalRequests = servicePerformance.length
    const successfulRequests = servicePerformance.filter(m => m.success).length
    const averageResponseTime = totalRequests > 0 
      ? servicePerformance.reduce((sum, m) => sum + m.duration, 0) / totalRequests 
      : 0

    return {
      successRate: totalRequests > 0 ? (successfulRequests / totalRequests) * 100 : 100,
      averageResponseTime,
      totalRequests,
      errors: serviceErrors.length
    }
  }

  private calculateTMDBMetrics(
    performanceMetrics: PerformanceMetric[],
    errorMetrics: ErrorMetric[]
  ) {
    const tmdbMetrics = this.calculateServiceMetrics(performanceMetrics, errorMetrics, 'tmdb')
    const rateLimitErrors = errorMetrics.filter(e => 
      e.service === 'tmdb' && e.error.toLowerCase().includes('rate limit')
    )

    return {
      ...tmdbMetrics,
      rateLimitHits: rateLimitErrors.length
    }
  }

  private calculateDailyCuratorMetrics(interactions: UserInteractionMetric[]) {
    const dailyInteractions = interactions.filter(i => i.source === 'daily')
    const views = dailyInteractions.filter(i => i.action === 'daily_curator_view').length
    const clicks = dailyInteractions.filter(i => i.action === 'content_click').length
    const plays = dailyInteractions.filter(i => i.action === 'play_button').length

    return {
      viewRate: views,
      clickThroughRate: views > 0 ? (clicks / views) * 100 : 0,
      contentPlayRate: clicks > 0 ? (plays / clicks) * 100 : 0
    }
  }

  private calculateChatRecommendationMetrics(interactions: UserInteractionMetric[]) {
    const chatInteractions = interactions.filter(i => i.source === 'chat')
    const messages = chatInteractions.filter(i => i.action === 'chat_message').length
    const clicks = chatInteractions.filter(i => i.action === 'content_click').length
    const feedback = chatInteractions.filter(i => i.action === 'recommendation_feedback')

    const positiveFeedback = feedback.filter(i => 
      i.metadata?.rating && i.metadata.rating >= 4
    ).length

    return {
      responseRelevance: clicks > 0 && messages > 0 ? (clicks / messages) * 100 : 0,
      userSatisfaction: feedback.length > 0 ? (positiveFeedback / feedback.length) * 100 : 0,
      followUpRate: messages > 1 ? ((messages - 1) / messages) * 100 : 0
    }
  }

  private trimMetricsArray<T>(array: T[]): void {
    if (array.length > this.maxMetricsHistory) {
      array.splice(0, array.length - this.maxMetricsHistory)
    }
  }
}

// Singleton instance
export const monitoringService = new MonitoringService()

// Utility functions for easy integration
export const trackPerformance = (
  operation: string,
  startTime: number,
  success: boolean,
  metadata?: Record<string, any>
) => monitoringService.trackPerformance(operation, startTime, success, metadata)

export const trackError = (
  service: ErrorMetric['service'],
  operation: string,
  error: string,
  recoverable: boolean,
  metadata?: Record<string, any>
) => monitoringService.trackError(service, operation, error, recoverable, metadata)

export const trackUserInteraction = (
  action: UserInteractionMetric['action'],
  source: UserInteractionMetric['source'],
  contentId?: string,
  contentType?: 'movie' | 'tv',
  metadata?: Record<string, any>
) => monitoringService.trackUserInteraction(action, source, contentId, contentType, metadata)