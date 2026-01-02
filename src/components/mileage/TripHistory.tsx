'use client'

import { useState } from 'react'
import { useStore } from '@/store'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { formatCurrency } from '@/lib/utils'
import { MapPin, Trash2, Edit, Calendar } from 'lucide-react'
import type { MileageTrip } from '@/types/mileage'

export function TripHistory() {
  const { mileageTrips, deleteTrip } = useStore()
  const [selectedPeriod, setSelectedPeriod] = useState<'week' | 'month' | 'year'>('month')

  const now = new Date()
  const completedTrips = mileageTrips
    .filter((trip) => trip.status === 'completed')
    .sort((a, b) => new Date(b.startTime).getTime() - new Date(a.startTime).getTime())

  const filteredTrips = completedTrips.filter((trip) => {
    const tripDate = new Date(trip.startTime)
    const diffMs = now.getTime() - tripDate.getTime()
    const diffDays = diffMs / (1000 * 60 * 60 * 24)

    if (selectedPeriod === 'week') return diffDays <= 7
    if (selectedPeriod === 'month') return diffDays <= 30
    return diffDays <= 365
  })

  const businessTrips = filteredTrips.filter((t) => t.purpose === 'business')
  const totalBusinessMiles = businessTrips.reduce((sum, t) => sum + t.distanceMiles, 0)
  const totalDeduction = businessTrips.reduce((sum, t) => sum + (t.calculatedDeduction || 0), 0)

  const formatDate = (isoDate: string) => {
    const date = new Date(isoDate)
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit'
    })
  }

  const getTripDuration = (trip: MileageTrip) => {
    if (!trip.endTime) return 'N/A'
    
    const start = new Date(trip.startTime).getTime()
    const end = new Date(trip.endTime).getTime()
    const durationMinutes = Math.floor((end - start) / (1000 * 60))
    
    if (durationMinutes < 60) return `${durationMinutes}m`
    const hours = Math.floor(durationMinutes / 60)
    const minutes = durationMinutes % 60
    return `${hours}h ${minutes}m`
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Trip History
          </span>
          <div className="flex gap-2">
            {(['week', 'month', 'year'] as const).map((period) => (
              <Button
                key={period}
                size="sm"
                variant={selectedPeriod === period ? 'primary' : 'outline'}
                onClick={() => setSelectedPeriod(period)}
              >
                {period === 'week' ? '7D' : period === 'month' ? '30D' : '1Y'}
              </Button>
            ))}
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent>
        {/* Summary */}
        <div className="grid grid-cols-3 gap-4 mb-6 p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
          <div className="text-center">
            <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">
              {filteredTrips.length}
            </p>
            <p className="text-xs text-gray-600 dark:text-gray-400">Total Trips</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">
              {totalBusinessMiles.toFixed(0)}
            </p>
            <p className="text-xs text-gray-600 dark:text-gray-400">Business Miles</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold text-green-600 dark:text-green-400">
              {formatCurrency(totalDeduction)}
            </p>
            <p className="text-xs text-gray-600 dark:text-gray-400">Tax Deduction</p>
          </div>
        </div>

        {/* Trip List */}
        <div className="space-y-3">
          {filteredTrips.length === 0 ? (
            <div className="text-center py-8 text-gray-500 dark:text-gray-400">
              <MapPin className="h-12 w-12 mx-auto mb-2 opacity-50" />
              <p>No trips recorded in this period</p>
              <p className="text-sm">Start tracking your trips above</p>
            </div>
          ) : (
            filteredTrips.map((trip) => (
              <div
                key={trip.id}
                className="p-4 border dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
              >
                <div className="flex items-start justify-between mb-2">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <p className="font-medium text-gray-900 dark:text-gray-100">
                        {trip.description}
                      </p>
                      <span className="text-xs px-2 py-0.5 rounded-full bg-gray-100 dark:bg-gray-700">
                        {trip.purpose === 'business' ? '💼' :
                         trip.purpose === 'personal' ? '🏠' : '🚗'}
                      </span>
                    </div>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      {formatDate(trip.startTime)} • {getTripDuration(trip)}
                    </p>
                  </div>
                  <div className="text-right ml-4">
                    <p className="text-lg font-bold text-gray-900 dark:text-gray-100">
                      {trip.distanceMiles.toFixed(1)} mi
                    </p>
                    {trip.purpose === 'business' && trip.calculatedDeduction && (
                      <p className="text-sm text-green-600 dark:text-green-400">
                        {formatCurrency(trip.calculatedDeduction)}
                      </p>
                    )}
                  </div>
                </div>

                {trip.notes && (
                  <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                    {trip.notes}
                  </p>
                )}

                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => deleteTrip(trip.id)}
                    className="text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20"
                  >
                    <Trash2 className="h-3 w-3 mr-1" />
                    Delete
                  </Button>
                </div>
              </div>
            ))
          )}
        </div>
      </CardContent>
    </Card>
  )
}
