import React, { useState, useEffect } from 'react'
import { monitoringService, ServiceHealthMetrics, RecommendationQualityMetrics } from '../services/monitoring-service'

interface MonitoringDashboardProps {
  isVisible: boolean
  onClose: () => void
}

export const MonitoringDashboard: React.FC<MonitoringDashboardProps> = ({ isVisible, onClose }) => {
  const [healthMetrics, setHealthMetrics] = useState<ServiceHealthMetrics | null>(null)
  const [qualityMetrics, setQualityMetrics] = useState<RecommendationQualityMetrics | null>(null)
  const [errorSummary, setErrorSummary] = useState<{ service: string; count: number; lastError: Date }[]>([])
  const [refreshInterval, setRefreshInterval] = useState<NodeJS.Timeout | null>(null)

  useEffect(() => {
    if (isVisible) {
      loadMetrics()
      const interval = setInterval(loadMetrics, 30000) // Refresh every 30 seconds
      setRefreshInterval(interval)
    } else {
      if (refreshInterval) {
        clearInterval(refreshInterval)
        setRefreshInterval(null)
      }
    }

    return () => {
      if (refreshInterval) {
        clearInterval(refreshInterval)
      }
    }
  }, [isVisible])

  const loadMetrics = () => {
    setHealthMetrics(monitoringService.getServiceHealthMetrics())
    setQualityMetrics(monitoringService.getRecommendationQualityMetrics())
    setErrorSummary(monitoringService.getErrorSummary())
  }

  const exportMetrics = () => {
    const metrics = monitoringService.exportMetrics()
    const dataStr = JSON.stringify(metrics, null, 2)
    const dataBlob = new Blob([dataStr], { type: 'application/json' })
    const url = URL.createObjectURL(dataBlob)
    const link = document.createElement('a')
    link.href = url
    link.download = `ai-suggestions-metrics-${new Date().toISOString().split('T')[0]}.json`
    link.click()
    URL.revokeObjectURL(url)
  }

  const clearOldMetrics = () => {
    monitoringService.clearOldMetrics()
    loadMetrics()
  }

  if (!isVisible) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-gray-900 text-white p-6 rounded-lg max-w-6xl max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold">AI Suggestions Monitoring Dashboard</h2>
          <div className="flex gap-2">
            <button
              onClick={exportMetrics}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded text-sm"
            >
              Export Metrics
            </button>
            <button
              onClick={clearOldMetrics}
              className="px-4 py-2 bg-yellow-600 hover:bg-yellow-700 rounded text-sm"
            >
              Clear Old Data
            </button>
            <button
              onClick={onClose}
              className="px-4 py-2 bg-red-600 hover:bg-red-700 rounded text-sm"
            >
              Close
            </button>
          </div>
        </div>

        {/* Service Health Metrics */}
        <div className="mb-8">
          <h3 className="text-xl font-semibold mb-4">Service Health (Last Hour)</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {healthMetrics && (
              <>
                <ServiceHealthCard
                  title="AI Service"
                  metrics={healthMetrics.aiService}
                  color="blue"
                />
                <ServiceHealthCard
                  title="TMDB Service"
                  metrics={healthMetrics.tmdbService}
                  color="green"
                  showRateLimit={true}
                />
                <ServiceHealthCard
                  title="Content Processing"
                  metrics={healthMetrics.contentProcessing}
                  color="purple"
                />
              </>
            )}
          </div>
        </div>

        {/* Error Summary */}
        <div className="mb-8">
          <h3 className="text-xl font-semibold mb-4">Error Summary (Last Hour)</h3>
          {errorSummary.length > 0 ? (
            <div className="bg-gray-800 rounded-lg p-4">
              {errorSummary.map((error, index) => (
                <div key={index} className="flex justify-between items-center py-2 border-b border-gray-700 last:border-b-0">
                  <span className="font-medium capitalize">{error.service} Service</span>
                  <div className="text-right">
                    <div className="text-red-400 font-bold">{error.count} errors</div>
                    <div className="text-sm text-gray-400">
                      Last: {error.lastError.toLocaleTimeString()}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="bg-green-900 text-green-200 p-4 rounded-lg">
              No errors in the last hour ✅
            </div>
          )}
        </div>

        {/* Recommendation Quality Metrics */}
        <div className="mb-8">
          <h3 className="text-xl font-semibold mb-4">Recommendation Quality (Last 24 Hours)</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {qualityMetrics && (
              <>
                <QualityMetricsCard
                  title="Daily Curator Performance"
                  metrics={[
                    { label: 'Views', value: qualityMetrics.dailyCurator.viewRate, unit: '' },
                    { label: 'Click-through Rate', value: qualityMetrics.dailyCurator.clickThroughRate, unit: '%' },
                    { label: 'Play Rate', value: qualityMetrics.dailyCurator.contentPlayRate, unit: '%' }
                  ]}
                />
                <QualityMetricsCard
                  title="Chat Recommendations"
                  metrics={[
                    { label: 'Response Relevance', value: qualityMetrics.chatRecommendations.responseRelevance, unit: '%' },
                    { label: 'User Satisfaction', value: qualityMetrics.chatRecommendations.userSatisfaction, unit: '%' },
                    { label: 'Follow-up Rate', value: qualityMetrics.chatRecommendations.followUpRate, unit: '%' }
                  ]}
                />
              </>
            )}
          </div>
        </div>

        <div className="text-sm text-gray-400 text-center">
          Dashboard refreshes every 30 seconds • Last updated: {new Date().toLocaleTimeString()}
        </div>
      </div>
    </div>
  )
}

interface ServiceHealthCardProps {
  title: string
  metrics: {
    successRate: number
    averageResponseTime: number
    totalRequests: number
    errors: number
    rateLimitHits?: number
  }
  color: 'blue' | 'green' | 'purple'
  showRateLimit?: boolean
}

const ServiceHealthCard: React.FC<ServiceHealthCardProps> = ({ title, metrics, color, showRateLimit }) => {
  const colorClasses = {
    blue: 'bg-blue-900 border-blue-600',
    green: 'bg-green-900 border-green-600',
    purple: 'bg-purple-900 border-purple-600'
  }

  const getHealthStatus = (successRate: number) => {
    if (successRate >= 95) return { text: 'Healthy', color: 'text-green-400' }
    if (successRate >= 85) return { text: 'Warning', color: 'text-yellow-400' }
    return { text: 'Critical', color: 'text-red-400' }
  }

  const status = getHealthStatus(metrics.successRate)

  return (
    <div className={`${colorClasses[color]} border rounded-lg p-4`}>
      <div className="flex justify-between items-center mb-3">
        <h4 className="font-semibold">{title}</h4>
        <span className={`text-sm font-bold ${status.color}`}>{status.text}</span>
      </div>
      <div className="space-y-2 text-sm">
        <div className="flex justify-between">
          <span>Success Rate:</span>
          <span className="font-mono">{metrics.successRate.toFixed(1)}%</span>
        </div>
        <div className="flex justify-between">
          <span>Avg Response:</span>
          <span className="font-mono">{metrics.averageResponseTime.toFixed(0)}ms</span>
        </div>
        <div className="flex justify-between">
          <span>Total Requests:</span>
          <span className="font-mono">{metrics.totalRequests}</span>
        </div>
        <div className="flex justify-between">
          <span>Errors:</span>
          <span className="font-mono text-red-400">{metrics.errors}</span>
        </div>
        {showRateLimit && metrics.rateLimitHits !== undefined && (
          <div className="flex justify-between">
            <span>Rate Limits:</span>
            <span className="font-mono text-yellow-400">{metrics.rateLimitHits}</span>
          </div>
        )}
      </div>
    </div>
  )
}

interface QualityMetricsCardProps {
  title: string
  metrics: { label: string; value: number; unit: string }[]
}

const QualityMetricsCard: React.FC<QualityMetricsCardProps> = ({ title, metrics }) => {
  return (
    <div className="bg-gray-800 border border-gray-600 rounded-lg p-4">
      <h4 className="font-semibold mb-3">{title}</h4>
      <div className="space-y-2 text-sm">
        {metrics.map((metric, index) => (
          <div key={index} className="flex justify-between">
            <span>{metric.label}:</span>
            <span className="font-mono">
              {metric.value.toFixed(1)}{metric.unit}
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}