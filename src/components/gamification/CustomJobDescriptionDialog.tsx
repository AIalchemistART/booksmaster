'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { useStore } from '@/store'
import { matchJobDescriptionToTechTree, getPathDescription } from '@/lib/gamification/ai-tech-tree-matcher'
import { Sparkles, Loader, CheckCircle, AlertCircle } from 'lucide-react'
import type { TechTreePath } from '@/lib/gamification/leveling-system'

interface CustomJobDescriptionDialogProps {
  onPathSelected: (path: TechTreePath) => void
  onCustomPathSelected: (nodeIds: string[]) => void
  onCancel: () => void
}

export function CustomJobDescriptionDialog({ onPathSelected, onCustomPathSelected, onCancel }: CustomJobDescriptionDialogProps) {
  const [jobDescription, setJobDescription] = useState('')
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [result, setResult] = useState<{
    selectedPath?: TechTreePath
    customNodes?: string[]
    isCustomPath: boolean
    confidence: number
    reasoning: string
  } | null>(null)
  const [error, setError] = useState<string | null>(null)

  const handleAnalyze = async () => {
    if (!jobDescription.trim()) {
      setError('Please enter a job description')
      return
    }

    setIsAnalyzing(true)
    setError(null)
    setResult(null)

    try {
      // Get API key from localStorage (same as used for OCR)
      const apiKey = localStorage.getItem('gemini-api-key') || ''
      
      if (!apiKey) {
        throw new Error('Gemini API key not found. Please set it up in Settings → OCR & AI Settings.')
      }

      const matchResult = await matchJobDescriptionToTechTree(jobDescription, apiKey)
      setResult(matchResult)
    } catch (err) {
      console.error('Job description matching error:', err)
      setError(err instanceof Error ? err.message : 'Failed to analyze job description')
    } finally {
      setIsAnalyzing(false)
    }
  }

  const handleConfirm = () => {
    if (result) {
      if (result.isCustomPath && result.customNodes) {
        onCustomPathSelected(result.customNodes)
      } else if (result.selectedPath) {
        onPathSelected(result.selectedPath)
      }
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <Card className="max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-purple-600" />
            Custom Job Description
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Describe what you do
              </label>
              <textarea
                value={jobDescription}
                onChange={(e) => setJobDescription(e.target.value)}
                placeholder="Example: I'm a wedding photographer who also does event videography and sells prints online..."
                className="w-full h-32 px-3 py-2 border dark:border-gray-700 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
                disabled={isAnalyzing}
              />
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                Be as specific as possible about your business activities, services, and income sources
              </p>
            </div>

            {error && (
              <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg flex items-start gap-2">
                <AlertCircle className="h-5 w-5 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" />
                <p className="text-sm text-red-800 dark:text-red-200">{error}</p>
              </div>
            )}

            {result && (
              <div className="p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg">
                <div className="flex items-start gap-2 mb-3">
                  <CheckCircle className="h-5 w-5 text-green-600 dark:text-green-400 flex-shrink-0 mt-0.5" />
                  <div className="flex-1">
                    <h4 className="font-semibold text-green-900 dark:text-green-100 mb-1">
                      Best Match Found
                    </h4>
                    <p className="text-sm text-green-800 dark:text-green-200 mb-2">
                      {result.reasoning}
                    </p>
                    <div className="text-xs text-green-700 dark:text-green-300">
                      Confidence: {(result.confidence * 100).toFixed(0)}%
                    </div>
                  </div>
                </div>

                <div className="pl-7 mt-3 pt-3 border-t border-green-200 dark:border-green-800">
                  <p className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-line">
                    {getPathDescription(result.selectedPath, result.customNodes)}
                  </p>
                  {result.isCustomPath && (
                    <p className="text-xs text-purple-600 dark:text-purple-400 mt-2">
                      ✨ Custom Path - AI selected {result.customNodes?.length || 0} specialized nodes for you
                    </p>
                  )}
                </div>
              </div>
            )}

            <div className="flex gap-3 pt-4">
              {!result ? (
                <>
                  <Button
                    onClick={handleAnalyze}
                    disabled={isAnalyzing || !jobDescription.trim()}
                    className="flex-1"
                  >
                    {isAnalyzing ? (
                      <>
                        <Loader className="h-4 w-4 mr-2 animate-spin" />
                        Analyzing with AI...
                      </>
                    ) : (
                      <>
                        <Sparkles className="h-4 w-4 mr-2" />
                        Find My Category
                      </>
                    )}
                  </Button>
                  <Button
                    variant="outline"
                    onClick={onCancel}
                    disabled={isAnalyzing}
                  >
                    Cancel
                  </Button>
                </>
              ) : (
                <>
                  <Button
                    onClick={handleConfirm}
                    className="flex-1"
                  >
                    <CheckCircle className="h-4 w-4 mr-2" />
                    Use This Category
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => {
                      setResult(null)
                      setError(null)
                    }}
                  >
                    Try Again
                  </Button>
                  <Button
                    variant="outline"
                    onClick={onCancel}
                  >
                    Cancel
                  </Button>
                </>
              )}
            </div>

            <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
              <p className="text-xs text-blue-800 dark:text-blue-200">
                <strong>How it works:</strong> Our AI analyzes your description and matches it to the category 
                that best fits your business model, expense patterns, and industry. You'll still be able to 
                change this later in settings.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
