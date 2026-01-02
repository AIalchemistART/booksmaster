import { StateCreator } from 'zustand'
import type { MileageTrip, MileageSettings, MileageVehicle, TripPurpose } from '@/types/mileage'
import { getCurrentMileageRate } from '@/types/mileage'

export interface MileageSlice {
  // State
  mileageTrips: MileageTrip[]
  mileageSettings: MileageSettings
  currentTrip: MileageTrip | null
  
  // Trip management
  startTrip: (purpose: TripPurpose, description: string) => string
  endTrip: (tripId: string, distanceMiles?: number) => void
  pauseTrip: (tripId: string) => void
  resumeTrip: (tripId: string) => void
  updateTrip: (tripId: string, updates: Partial<MileageTrip>) => void
  deleteTrip: (tripId: string) => void
  
  // Manual trip entry
  addManualTrip: (trip: Omit<MileageTrip, 'id' | 'createdAt' | 'updatedAt' | 'status'>) => void
  
  // Settings
  updateMileageSettings: (updates: Partial<MileageSettings>) => void
  
  // Vehicles
  addVehicle: (vehicle: Omit<MileageVehicle, 'id' | 'createdAt' | 'updatedAt'>) => void
  updateVehicle: (vehicleId: string, updates: Partial<MileageVehicle>) => void
  deleteVehicle: (vehicleId: string) => void
  
  // Queries
  getTripsForPeriod: (startDate: string, endDate: string) => MileageTrip[]
  getTotalBusinessMiles: (year?: number) => number
}

const DEFAULT_MILEAGE_SETTINGS: MileageSettings = {
  autoTrackingEnabled: false,
  gpsAccuracy: 'balanced',
  currentStandardRate: getCurrentMileageRate(),
  defaultPurpose: 'business',
  vehicles: [],
  reminderEnabled: true
}

export const createMileageSlice: StateCreator<
  MileageSlice
> = (set, get) => ({
  mileageTrips: [],
  mileageSettings: DEFAULT_MILEAGE_SETTINGS,
  currentTrip: null,

  startTrip: (purpose: TripPurpose, description: string) => {
    const tripId = `trip-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
    const now = new Date().toISOString()
    
    const newTrip: MileageTrip = {
      id: tripId,
      startTime: now,
      status: 'in_progress',
      distanceMiles: 0,
      purpose,
      description,
      trackingEnabled: get().mileageSettings.autoTrackingEnabled,
      standardMileageRate: get().mileageSettings.currentStandardRate,
      createdAt: now,
      updatedAt: now
    }
    
    set((state) => ({
      mileageTrips: [...state.mileageTrips, newTrip],
      currentTrip: newTrip
    }))
    
    return tripId
  },

  endTrip: (tripId: string, distanceMiles?: number) => {
    const now = new Date().toISOString()
    
    set((state) => {
      const updatedTrips = state.mileageTrips.map((trip) => {
        if (trip.id === tripId) {
          const finalDistance = distanceMiles !== undefined ? distanceMiles : trip.distanceMiles
          const rate = trip.standardMileageRate || state.mileageSettings.currentStandardRate
          
          return {
            ...trip,
            endTime: now,
            status: 'completed' as const,
            distanceMiles: finalDistance,
            calculatedDeduction: trip.purpose === 'business' ? finalDistance * rate : 0,
            updatedAt: now
          }
        }
        return trip
      })
      
      return {
        mileageTrips: updatedTrips,
        currentTrip: state.currentTrip?.id === tripId ? null : state.currentTrip
      }
    })
  },

  pauseTrip: (tripId: string) => {
    set((state) => ({
      mileageTrips: state.mileageTrips.map((trip) =>
        trip.id === tripId
          ? { ...trip, status: 'paused' as const, updatedAt: new Date().toISOString() }
          : trip
      )
    }))
  },

  resumeTrip: (tripId: string) => {
    set((state) => ({
      mileageTrips: state.mileageTrips.map((trip) =>
        trip.id === tripId
          ? { ...trip, status: 'in_progress' as const, updatedAt: new Date().toISOString() }
          : trip
      ),
      currentTrip: state.mileageTrips.find(t => t.id === tripId) || state.currentTrip
    }))
  },

  updateTrip: (tripId: string, updates: Partial<MileageTrip>) => {
    set((state) => ({
      mileageTrips: state.mileageTrips.map((trip) =>
        trip.id === tripId
          ? { ...trip, ...updates, updatedAt: new Date().toISOString() }
          : trip
      )
    }))
  },

  deleteTrip: (tripId: string) => {
    set((state) => ({
      mileageTrips: state.mileageTrips.filter((trip) => trip.id !== tripId),
      currentTrip: state.currentTrip?.id === tripId ? null : state.currentTrip
    }))
  },

  addManualTrip: (trip) => {
    const now = new Date().toISOString()
    const tripId = `trip-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
    
    const rate = trip.standardMileageRate || get().mileageSettings.currentStandardRate
    const deduction = trip.purpose === 'business' ? trip.distanceMiles * rate : 0
    
    const newTrip: MileageTrip = {
      ...trip,
      id: tripId,
      status: 'completed',
      calculatedDeduction: deduction,
      createdAt: now,
      updatedAt: now
    }
    
    set((state) => ({
      mileageTrips: [...state.mileageTrips, newTrip]
    }))
  },

  updateMileageSettings: (updates: Partial<MileageSettings>) => {
    set((state) => ({
      mileageSettings: { ...state.mileageSettings, ...updates }
    }))
  },

  addVehicle: (vehicle) => {
    const now = new Date().toISOString()
    const vehicleId = `vehicle-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
    
    const newVehicle: MileageVehicle = {
      ...vehicle,
      id: vehicleId,
      createdAt: now,
      updatedAt: now
    }
    
    set((state) => ({
      mileageSettings: {
        ...state.mileageSettings,
        vehicles: [...state.mileageSettings.vehicles, newVehicle],
        defaultVehicleId: state.mileageSettings.vehicles.length === 0 ? vehicleId : state.mileageSettings.defaultVehicleId
      }
    }))
  },

  updateVehicle: (vehicleId: string, updates: Partial<MileageVehicle>) => {
    set((state) => ({
      mileageSettings: {
        ...state.mileageSettings,
        vehicles: state.mileageSettings.vehicles.map((v) =>
          v.id === vehicleId ? { ...v, ...updates, updatedAt: new Date().toISOString() } : v
        )
      }
    }))
  },

  deleteVehicle: (vehicleId: string) => {
    set((state) => ({
      mileageSettings: {
        ...state.mileageSettings,
        vehicles: state.mileageSettings.vehicles.filter((v) => v.id !== vehicleId),
        defaultVehicleId: state.mileageSettings.defaultVehicleId === vehicleId 
          ? undefined 
          : state.mileageSettings.defaultVehicleId
      }
    }))
  },

  getTripsForPeriod: (startDate: string, endDate: string) => {
    const start = new Date(startDate).getTime()
    const end = new Date(endDate).getTime()
    
    return get().mileageTrips.filter((trip) => {
      const tripTime = new Date(trip.startTime).getTime()
      return tripTime >= start && tripTime <= end
    })
  },

  getTotalBusinessMiles: (year?: number) => {
    const targetYear = year || new Date().getFullYear()
    
    return get().mileageTrips
      .filter((trip) => {
        const tripYear = new Date(trip.startTime).getFullYear()
        return tripYear === targetYear && trip.purpose === 'business' && trip.status === 'completed'
      })
      .reduce((total, trip) => total + trip.distanceMiles, 0)
  }
})
