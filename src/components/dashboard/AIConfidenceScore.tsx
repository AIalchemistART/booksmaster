'use client'

import { useStore } from '@/store'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { calculateAIConfidenceScore, getConfidenceLevel, getConfidenceColor } from '@/lib/ai-confidence-score'
import { Brain, TrendingUp } from 'lucide-react'

export function AIConfidenceScore() {
  const { transactions, receipts } = useStore()
  
  const metrics = calculateAIConfidenceScore(transactions, receipts)

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Brain className="h-5 w-5" />
          AI Learning Confidence
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {/* Overall Score */}
          <div className="text-center pb-4 border-b border-gray-200 dark:border-gray-700">
            <div className={`text-5xl font-bold ${getConfidenceColor(metrics.overallScore)}`}>
              {metrics.overallScore}%
            </div>
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-2">
              {getConfidenceLevel(metrics.overallScore)}
            </p>
            <p className="text-xs text-gray-500 dark:text-gray-500 mt-1">
              Based on verification, validation, and documentation quality
            </p>
          </div>

          {/* Breakdown */}
          <div className="space-y-3">
            <h4 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">Score Breakdown</h4>
            
            {/* Verification Quality */}
            <div>
              <div className="flex justify-between text-sm mb-1">
                <span className="text-gray-700 dark:text-gray-300">Verification Quality (40%)</span>
                <span className={`font-semibold ${getConfidenceColor(metrics.breakdown.verificationQuality)}`}>
                  {metrics.breakdown.verificationQuality}%
                </span>
              </div>
              <div className="h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                <div
                  className={`h-full ${
                    metrics.breakdown.verificationQuality >= 85 ? 'bg-green-600' :
                    metrics.breakdown.verificationQuality >= 70 ? 'bg-blue-600' :
                    'bg-amber-600'
                  }`}
                  style={{ width: `${metrics.breakdown.verificationQuality}%` }}
                />
              </div>
            </div>

            {/* User Validation */}
            <div>
              <div className="flex justify-between text-sm mb-1">
                <span className="text-gray-700 dark:text-gray-300">User Validation (30%)</span>
                <span className={`font-semibold ${getConfidenceColor(metrics.breakdown.userValidation)}`}>
                  {metrics.breakdown.userValidation}%
                </span>
              </div>
              <div className="h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                <div
                  className={`h-full ${
                    metrics.breakdown.userValidation >= 85 ? 'bg-green-600' :
                    metrics.breakdown.userValidation >= 70 ? 'bg-blue-600' :
                    'bg-amber-600'
                  }`}
                  style={{ width: `${metrics.breakdown.userValidation}%` }}
                />
              </div>
            </div>

            {/* Documentation Coverage */}
            <div>
              <div className="flex justify-between text-sm mb-1">
                <span className="text-gray-700 dark:text-gray-300">Documentation (20%)</span>
                <span className={`font-semibold ${getConfidenceColor(metrics.breakdown.documentationCoverage)}`}>
                  {metrics.breakdown.documentationCoverage}%
                </span>
              </div>
              <div className="h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                <div
                  className={`h-full ${
                    metrics.breakdown.documentationCoverage >= 85 ? 'bg-green-600' :
                    metrics.breakdown.documentationCoverage >= 70 ? 'bg-blue-600' :
                    'bg-amber-600'
                  }`}
                  style={{ width: `${metrics.breakdown.documentationCoverage}%` }}
                />
              </div>
            </div>

            {/* Duplicate Prevention */}
            <div>
              <div className="flex justify-between text-sm mb-1">
                <span className="text-gray-700 dark:text-gray-300">Duplicate Prevention (10%)</span>
                <span className={`font-semibold ${getConfidenceColor(metrics.breakdown.duplicatePrevention)}`}>
                  {metrics.breakdown.duplicatePrevention}%
                </span>
              </div>
              <div className="h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                <div
                  className={`h-full ${
                    metrics.breakdown.duplicatePrevention >= 85 ? 'bg-green-600' :
                    metrics.breakdown.duplicatePrevention >= 70 ? 'bg-blue-600' :
                    'bg-amber-600'
                  }`}
                  style={{ width: `${metrics.breakdown.duplicatePrevention}%` }}
                />
              </div>
            </div>
          </div>

          {/* Strengths */}
          {metrics.strengths.length > 0 && (
            <div className="pt-3 border-t border-gray-200 dark:border-gray-700">
              <h4 className="text-xs font-semibold text-green-700 dark:text-green-400 uppercase mb-2 flex items-center gap-1">
                <TrendingUp className="h-3 w-3" />
                Strengths
              </h4>
              <ul className="space-y-1">
                {metrics.strengths.map((strength, idx) => (
                  <li key={idx} className="text-xs text-gray-700 dark:text-gray-300 flex items-start gap-1">
                    <span className="text-green-600 dark:text-green-400">✓</span>
                    <span>{strength}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Improvements */}
          {metrics.improvements.length > 0 && (
            <div className="pt-3 border-t border-gray-200 dark:border-gray-700">
              <h4 className="text-xs font-semibold text-amber-700 dark:text-amber-400 uppercase mb-2">
                Areas to Improve
              </h4>
              <ul className="space-y-1">
                {metrics.improvements.map((improvement, idx) => (
                  <li key={idx} className="text-xs text-gray-700 dark:text-gray-300 flex items-start gap-1">
                    <span className="text-amber-600 dark:text-amber-400">→</span>
                    <span>{improvement}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
