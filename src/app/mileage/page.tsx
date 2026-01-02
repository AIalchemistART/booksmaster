'use client'

import { TripTracker } from '@/components/mileage/TripTracker'
import { TripHistory } from '@/components/mileage/TripHistory'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { useStore } from '@/store'
import { formatCurrency } from '@/lib/utils'
import { MapPin, TrendingUp, DollarSign, Calendar } from 'lucide-react'

export default function MileagePage() {
  const { getTotalBusinessMiles, mileageSettings, mileageTrips } = useStore()
  const currentYear = new Date().getFullYear()
  
  const totalBusinessMiles = getTotalBusinessMiles(currentYear)
  const estimatedAnnualDeduction = totalBusinessMiles * mileageSettings.currentStandardRate
  
  const completedTripsThisYear = mileageTrips.filter((trip) => {
    const tripYear = new Date(trip.startTime).getFullYear()
    return tripYear === currentYear && trip.status === 'completed'
  })

  const businessTripsThisYear = completedTripsThisYear.filter((t) => t.purpose === 'business')
  const personalTripsThisYear = completedTripsThisYear.filter((t) => t.purpose === 'personal')

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100 flex items-center gap-2">
          <MapPin className="h-8 w-8" />
          Mileage Tracking
        </h1>
        <p className="text-gray-600 dark:text-gray-400 mt-1">
          Track business miles and maximize your tax deductions
        </p>
      </div>

      {/* Year Summary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
                  {currentYear} Business Miles
                </p>
                <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                  {totalBusinessMiles.toFixed(0)}
                </p>
              </div>
              <div className="p-3 rounded-full bg-blue-100 dark:bg-blue-900/30">
                <MapPin className="h-6 w-6 text-blue-600 dark:text-blue-400" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
                  Estimated Deduction
                </p>
                <p className="text-2xl font-bold text-green-600 dark:text-green-400">
                  {formatCurrency(estimatedAnnualDeduction)}
                </p>
              </div>
              <div className="p-3 rounded-full bg-green-100 dark:bg-green-900/30">
                <DollarSign className="h-6 w-6 text-green-600 dark:text-green-400" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
                  Business Trips
                </p>
                <p className="text-2xl font-bold text-purple-600 dark:text-purple-400">
                  {businessTripsThisYear.length}
                </p>
              </div>
              <div className="p-3 rounded-full bg-purple-100 dark:bg-purple-900/30">
                <TrendingUp className="h-6 w-6 text-purple-600 dark:text-purple-400" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
                  IRS Rate {currentYear}
                </p>
                <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                  ${mileageSettings.currentStandardRate}/mi
                </p>
              </div>
              <div className="p-3 rounded-full bg-amber-100 dark:bg-amber-900/30">
                <Calendar className="h-6 w-6 text-amber-600 dark:text-amber-400" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Trip Tracker */}
      <div className="mb-8">
        <TripTracker />
      </div>

      {/* Important Notice */}
      <Card className="mb-8 border-amber-300 dark:border-amber-700 bg-amber-50 dark:bg-amber-900/20">
        <CardHeader>
          <CardTitle className="text-amber-900 dark:text-amber-100 text-base">
            💡 Mileage Tracking Tips
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="space-y-2 text-sm text-amber-800 dark:text-amber-200">
            <li className="flex items-start gap-2">
              <span className="text-amber-600 dark:text-amber-400 mt-0.5">•</span>
              <span>
                <strong>Business miles only:</strong> Track trips for work purposes. Commute to your regular workplace is NOT deductible.
              </span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-amber-600 dark:text-amber-400 mt-0.5">•</span>
              <span>
                <strong>Manual tracking:</strong> If GPS isn't available, manually enter your odometer readings or use map distance.
              </span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-amber-600 dark:text-amber-400 mt-0.5">•</span>
              <span>
                <strong>Keep records:</strong> IRS requires purpose and destination for each trip. Save this data for 3+ years.
              </span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-amber-600 dark:text-amber-400 mt-0.5">•</span>
              <span>
                <strong>Standard vs actual:</strong> You can use standard mileage rate OR actual expenses (gas, maintenance, depreciation) - not both.
              </span>
            </li>
          </ul>
        </CardContent>
      </Card>

      {/* Trip History */}
      <TripHistory />
    </div>
  )
}
