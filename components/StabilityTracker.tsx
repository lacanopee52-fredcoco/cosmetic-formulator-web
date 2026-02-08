'use client'

import { useState, useEffect, useRef } from 'react'
import { FormulationStability } from '@/types'

interface StabilityTrackerProps {
  stability?: FormulationStability
  onChange: (stability: FormulationStability) => void
}

interface TimerDisplay {
  days: number
  hours: number
  minutes: number
  seconds: number
}

const STABILITY_DAYS = ['J0', 'J1', 'J7', 'J15', 'J30', 'J60', 'J90']

export default function StabilityTracker({ stability, onChange }: StabilityTrackerProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [selectedDay, setSelectedDay] = useState<string | null>(null)
  const [timer, setTimer] = useState<TimerDisplay>({ days: 0, hours: 0, minutes: 0, seconds: 0 })
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside)
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [isOpen])

  useEffect(() => {
    if (!stability?.start_date) return

    const updateTimer = () => {
      const start = new Date(stability.start_date!)
      const now = new Date()
      const diffMs = now.getTime() - start.getTime()

      const totalSeconds = Math.floor(diffMs / 1000)
      const days = Math.floor(totalSeconds / (24 * 3600))
      const hours = Math.floor((totalSeconds % (24 * 3600)) / 3600)
      const minutes = Math.floor((totalSeconds % 3600) / 60)
      const seconds = totalSeconds % 60

      setTimer({ days, hours, minutes, seconds })
    }

    updateTimer()
    const interval = setInterval(updateTimer, 1000)
    return () => clearInterval(interval)
  }, [stability?.start_date])

  const getCurrentDay = (): string => {
    if (!stability?.start_date) return 'J0'
    const { days } = timer

    if (days === 0) return 'J0'
    if (days === 1) return 'J1'
    if (days <= 7) return 'J7'
    if (days <= 15) return 'J15'
    if (days <= 30) return 'J30'
    if (days <= 60) return 'J60'
    return 'J90'
  }

  const handleStartStability = () => {
    const newStability: FormulationStability = {
      start_date: new Date().toISOString(),
      days: STABILITY_DAYS.map(day => ({
        day,
        notes: ''
      }))
    }
    onChange(newStability)
    setIsOpen(true)
  }

  const handleStopStability = () => {
    if (confirm('Êtes-vous sûr de vouloir arrêter le suivi de stabilité ?')) {
      onChange({ start_date: undefined, days: [] })
      setIsOpen(false)
    }
  }

  const handleUpdateDay = (day: string, notes: string) => {
    if (!stability) return

    const updatedDays = stability.days.map(d => 
      d.day === day ? { ...d, notes } : d
    )

    onChange({
      ...stability,
      days: updatedDays
    })
  }

  const currentDay = getCurrentDay()
  const isRunning = !!stability?.start_date

  return (
    <div className="relative" ref={containerRef}>
      <button 
        className="px-4 py-2 bg-blue-100 text-blue-700 rounded-lg font-medium hover:bg-blue-200 transition-colors flex items-center gap-2"
        onClick={() => setIsOpen(!isOpen)}
      >
        <span>⏱️</span>
        <span>Stabilité</span>
        {isRunning && (
          <span className="text-xs">
            {timer.days}j {timer.hours}h {timer.minutes}m
          </span>
        )}
        <span>{isOpen ? '▼' : '▶'}</span>
      </button>

      {isOpen && (
        <div className="absolute z-50 mt-2 w-80 bg-white border border-gray-300 rounded-lg shadow-lg p-4">
          <div className="mb-4">
            <h3 className="text-lg font-bold text-blue-700 mb-2">⏱️ Suivi de Stabilité</h3>
            
            {isRunning ? (
              <div className="space-y-2">
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                  <div className="text-sm font-medium text-blue-900 mb-1">Chronomètre actif</div>
                  <div className="text-2xl font-bold text-blue-700">
                    {String(timer.days).padStart(2, '0')}j {String(timer.hours).padStart(2, '0')}h {String(timer.minutes).padStart(2, '0')}m {String(timer.seconds).padStart(2, '0')}s
                  </div>
                  <div className="text-xs text-gray-600 mt-1">
                    Jour actuel: {currentDay}
                  </div>
                </div>
                
                <button
                  onClick={handleStopStability}
                  className="w-full px-4 py-2 bg-red-100 text-red-700 rounded-lg font-medium hover:bg-red-200 transition-colors"
                >
                  ⏹️ Arrêter
                </button>
              </div>
            ) : (
              <button
                onClick={handleStartStability}
                className="w-full px-4 py-2 bg-green-100 text-green-700 rounded-lg font-medium hover:bg-green-200 transition-colors"
              >
                ▶️ Démarrer
              </button>
            )}
          </div>

          {isRunning && (
            <div className="space-y-2">
              {STABILITY_DAYS.map(day => {
                const dayData = stability.days.find(d => d.day === day)
                const isSelected = selectedDay === day
                const isCurrent = day === currentDay
                
                return (
                  <div
                    key={day}
                    className={`border rounded-lg p-2 cursor-pointer transition-colors ${
                      isSelected
                        ? 'border-blue-500 bg-blue-50'
                        : isCurrent
                          ? 'border-green-500 bg-green-50'
                          : 'border-gray-200 hover:border-blue-300'
                    }`}
                    onClick={() => setSelectedDay(isSelected ? null : day)}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-medium text-gray-900">{day}</span>
                      {isCurrent && <span className="text-xs bg-green-200 text-green-800 px-2 py-0.5 rounded">Actuel</span>}
                    </div>
                    
                    {isSelected && (
                      <textarea
                        value={dayData?.notes || ''}
                        onChange={(e) => handleUpdateDay(day, e.target.value)}
                        onClick={(e) => e.stopPropagation()}
                        className="mt-2 w-full px-2 py-1 border border-gray-300 rounded text-sm"
                        rows={3}
                        placeholder={`Notes pour ${day}...`}
                      />
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
