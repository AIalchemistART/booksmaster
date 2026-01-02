'use client'

import { useState, useEffect } from 'react'
import { useStore } from '@/store'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'
import { Play, Square, Pause, MapPin, Clock } from 'lucide-react'
import { formatCurrency } from '@/lib/utils'
import type { TripPurpose } from '@/types/mileage'

export function TripTracker() {
  const { currentTrip, startTrip, endTrip, pauseTrip, resumeTrip, mileageSettings } = useStore()
  const [description, setDescription] = useState('')
  const [purpose, setPurpose] = useState<TripPurpose>('business')
  const [manualDistance, setManualDistance] = useState('')
  const [elapsedTime, setElapsedTime] = useState(0)

  // Update elapsed time for active trip
  useEffect(() => {
    if (!currentTrip || currentTrip.status !== 'in_progress') return

    const interval = setInterval(() => {
      const elapsed = Date.now() - new Date(currentTrip.startTime).getTime()
      setElapsedTime(Math.floor(elapsed / 1000))
    }, 1000)

    return () => clearInterval(interval)
  }, [currentTrip])

  const handleStartTrip = () => {
    if (!description.trim()) {
      alert('Please enter a trip description')
      return
    }
    
    startTrip(purpose, description)
    setDescription('')
  }

  const handleEndTrip = () => {
    if (!currentTrip) return
    
    const distance = manualDistance ? parseFloat(manualDistance) : currentTrip.distanceMiles
    endTrip(currentTrip.id, distance)
    setManualDistance('')
    setElapsedTime(0)
  }

  const formatTime = (seconds: number) => {
    const hours = Math.floor(seconds / 3600)
    const minutes = Math.floor((seconds % 3600) / 60)
    const secs = seconds % 60
    
    if (hours > 0) {
      return `${hours}h ${minutes}m ${secs}s`
    }
    return `${minutes}m ${secs}s`
  }

  if (currentTrip) {
    const estimatedDeduction = currentTrip.distanceMiles * (mileageSettings.currentStandardRate || 0.67)
    
    return (
      <Card className="bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 border-2 border-blue-300 dark:border-blue-700">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <div className="h-3 w-3 bg-red-500 rounded-full animate-pulse" />
            Trip In Progress
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {/* Trip Info */}
            <div className="p-4 bg-white dark:bg-gray-800 rounded-lg">
              <div className="flex items-start justify-between mb-3">
                <div>
                  <p className="font-semibold text-gray-900 dark:text-gray-100">
                    {currentTrip.description}
                  </p>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    {currentTrip.purpose === 'business' ? '💼 Business' : 
                     currentTrip.purpose === 'personal' ? '🏠 Personal' : '🚗 Commute'}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                    {currentTrip.distanceMiles.toFixed(1)} mi
                  </p>
                  {currentTrip.purpose === 'business' && (
                    <p className="text-xs text-green-600 dark:text-green-400">
                      ~{formatCurrency(estimatedDeduction)}
                    </p>
                  )}
                </div>
              </div>
              
              {/* Time Elapsed */}
              <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                <Clock className="h-4 w-4" />
                <span>Elapsed: {formatTime(elapsedTime)}</span>
              </div>
            </div>

            {/* Manual Distance Override */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Manual Distance (optional)
              </label>
              <Input
                type="number"
                step="0.1"
                placeholder="Enter miles if GPS unavailable"
                value={manualDistance}
                onChange={(e) => setManualDistance(e.target.value)}
              />
            </div>

            {/* Controls */}
            <div className="flex gap-2">
              {currentTrip.status === 'in_progress' && (
                <Button
                  variant="outline"
                  onClick={() => pauseTrip(currentTrip.id)}
                  className="flex-1"
                >
                  <Pause className="h-4 w-4 mr-2" />
                  Pause
                </Button>
              )}
              {currentTrip.status === 'paused' && (
                <Button
                  variant="outline"
                  onClick={() => resumeTrip(currentTrip.id)}
                  className="flex-1"
                >
                  <Play className="h-4 w-4 mr-2" />
                  Resume
                </Button>
              )}
              <Button
                variant="primary"
                onClick={handleEndTrip}
                className="flex-1 bg-red-600 hover:bg-red-700"
              >
                <Square className="h-4 w-4 mr-2" />
                End Trip
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <MapPin className="h-5 w-5" />
          Start New Trip
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Trip Description
            </label>
            <Input
              placeholder="e.g., Client meeting, Delivery to Main St"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Trip Purpose
            </label>
            <Select 
              options={[
                { value: 'business', label: '💼 Business (Tax Deductible)' },
                { value: 'personal', label: '🏠 Personal' },
                { value: 'commute', label: '🚗 Commute' }
              ]}
              value={purpose} 
              onChange={(e) => setPurpose(e.target.value as TripPurpose)}
            />
          </div>

          {purpose === 'business' && (
            <div className="p-3 bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-200 dark:border-green-800">
              <p className="text-sm text-green-800 dark:text-green-200">
                <strong>Business trips</strong> are tax deductible at ${mileageSettings.currentStandardRate}/mile (IRS {new Date().getFullYear()} rate)
              </p>
            </div>
          )}

          <Button
            onClick={handleStartTrip}
            disabled={!description.trim()}
            className="w-full"
          >
            <Play className="h-4 w-4 mr-2" />
            Start Trip
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
