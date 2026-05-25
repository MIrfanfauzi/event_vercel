'use client'

import React, { useState, useMemo } from 'react'
import Link from 'next/link'
import { motion, AnimatePresence } from 'framer-motion'
import { cn } from '../../lib/utils'
import { Seat, SeatSelection, TicketType, SeatingLayout } from '../../types'
import { 
  Accessibility, 
  User, 
  Baby, 
  Heart, 
  Trash2, 
  ChevronRight,
  Armchair
} from 'lucide-react'
import { logEvent } from '../../lib/analytics/tracker'

interface SeatGridProps {
  seatingLayout: SeatingLayout
  selectedSeats: SeatSelection[]
  onSeatSelect: (seat: Seat, ticketType: TicketType) => void
  onSeatDeselect: (seatId: string) => void
  onTicketTypeChange: (seatId: string, ticketType: TicketType) => void
  bookedSeats: string[]
  className?: string
  readOnly?: boolean
  prices?: Record<string, number>
  checkoutUrl?: string
}

interface SeatComponentProps {
  seat: Seat
  isSelected: boolean
  isBooked: boolean
  onSelect: () => void
  onDeselect: () => void
  selectedTicketType?: TicketType
  readOnly?: boolean
}

const SeatComponent: React.FC<SeatComponentProps> = ({
  seat,
  isSelected,
  isBooked,
  onSelect,
  onDeselect,
  selectedTicketType,
  readOnly = false
}) => {
  const getSeatStyles = () => {
    if (isBooked) return 'bg-blue-600 text-white cursor-not-allowed border-blue-700 opacity-60 shadow-inner'
    
    if (isSelected) {
      switch (selectedTicketType) {
        case TicketType.ADULT: return 'bg-teal-600 text-white border-teal-700 shadow-teal-500/50'
        case TicketType.CHILD: return 'bg-emerald-500 text-white border-emerald-600 shadow-emerald-500/50'
        case TicketType.CONCESSION: return 'bg-purple-600 text-white border-purple-700 shadow-purple-500/50'
        default: return 'bg-teal-600 text-white border-teal-700'
      }
    }

    if (seat.isAccessible) return 'bg-sky-50 text-sky-700 border-sky-200 hover:bg-sky-100'
    
    return 'bg-white text-slate-700 border-slate-200 hover:border-teal-400 hover:text-teal-600'
  }

  const handleClick = () => {
    if (isBooked || readOnly) {
      if (isBooked) {
        logEvent('seat_wrong_selected', { reason: 'Clicked booked seat', seatId: seat.id, seatName: `${seat.row}${seat.number}` })
      }
      return
    }
    if (isSelected) {
      onDeselect()
    } else {
      onSelect()
    }
  }

  return (
    <motion.div
      whileHover={!isBooked && !readOnly ? { scale: 1.15, y: -2 } : {}}
      whileTap={!isBooked && !readOnly ? { scale: 0.95 } : {}}
      onClick={handleClick}
      className={cn(
        'relative w-9 h-9 sm:w-10 sm:h-10 rounded-xl border-2 transition-all duration-300 flex items-center justify-center cursor-pointer shadow-sm overflow-hidden',
        getSeatStyles(),
        isSelected && 'shadow-lg border-opacity-50 ring-2 ring-white ring-opacity-20'
      )}
      title={`${seat.row}${seat.number}`}
    >
      <Armchair className={cn("w-4 h-4 sm:w-5 sm:h-5", isBooked ? "opacity-30" : "opacity-100")} />
      
      {isSelected && (
        <motion.div 
          initial={{ scale: 0, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="absolute -top-1 -right-1 w-3 h-3 bg-white rounded-full border border-current"
        />
      )}
      
      {seat.isAccessible && !isSelected && !isBooked && (
        <Accessibility className="absolute bottom-0.5 right-0.5 w-2.5 h-2.5 opacity-50" />
      )}
    </motion.div>
  )
}

const TicketTypeSelector: React.FC<{
  selectedSeats: SeatSelection[]
  onTicketTypeChange: (seatId: string, ticketType: TicketType) => void
  onSeatDeselect: (seatId: string) => void
  checkoutUrl?: string
}> = ({ selectedSeats, onTicketTypeChange, onSeatDeselect, checkoutUrl }) => {
  React.useEffect(() => {
    if (selectedSeats.length > 0) {
      logEvent('checkout_button_visible', { selectedSeatsCount: selectedSeats.length })
    }
  }, [selectedSeats.length])

  if (selectedSeats.length === 0) return null

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="mt-10 glass-panel overflow-hidden"
    >
      <div className="bg-gradient-to-r from-blue-600/5 to-purple-600/5 p-4 border-b border-white/20 flex justify-between items-center">
        <h3 className="text-lg font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-700 to-purple-700">
          Ringkasan Kursi
        </h3>
        <span className="bg-white/50 backdrop-blur-md px-3 py-1 rounded-full text-xs font-bold text-blue-700 border border-blue-100">
          {selectedSeats.length} Kursi Terpilih
        </span>
      </div>

      <div className="divide-y divide-slate-100 p-2">
        <AnimatePresence mode="popLayout">
          {selectedSeats.map((selection) => (
            <motion.div 
              key={selection.seatId}
              layout
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 10 }}
              className="flex items-center justify-between p-4 hover:bg-slate-50 transition-colors rounded-lg group"
            >
              <div className="flex items-center gap-4">
                <div className={cn(
                  "w-12 h-12 rounded-2xl flex items-center justify-center text-white shadow-md transition-all duration-500",
                  selection.ticketType === TicketType.ADULT && "bg-teal-600",
                  selection.ticketType === TicketType.CHILD && "bg-emerald-500",
                  selection.ticketType === TicketType.CONCESSION && "bg-purple-600"
                )}>
                  <span className="font-bold text-sm">{selection.seat.row}{selection.seat.number}</span>
                </div>
                
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <select
                      value={selection.ticketType}
                      onChange={(e) => onTicketTypeChange(selection.seatId, e.target.value as TicketType)}
                      className="bg-transparent border-none p-0 pr-8 text-sm font-bold text-slate-800 focus:ring-0 cursor-pointer appearance-none"
                    >
                      <option value={TicketType.ADULT}>Tiket Dewasa</option>
                      <option value={TicketType.CHILD}>Tiket Anak</option>
                      <option value={TicketType.CONCESSION}>Tiket Konsesi</option>
                    </select>
                    <ChevronRight className="w-3 h-3 text-slate-400 -ml-6" />
                  </div>
                  <p className="text-xs text-slate-500">Kategori: {selection.seat.category || 'Reguler'}</p>
                </div>
              </div>

              <div className="flex items-center gap-6">
                <div className="text-right">
                  <p className="text-sm font-bold text-slate-900">£{selection.price.toFixed(2)}</p>
                  <p className="text-[10px] uppercase tracking-wider text-slate-400 font-bold">Harga Satuan</p>
                </div>
                
                <motion.button
                  whileHover={{ scale: 1.1, backgroundColor: '#fee2e2' }}
                  whileTap={{ scale: 0.9 }}
                  onClick={() => onSeatDeselect(selection.seatId)}
                  className="p-2 text-slate-300 group-hover:text-red-500 transition-colors rounded-xl"
                >
                  <Trash2 className="w-5 h-5" />
                </motion.button>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      <div className="bg-slate-900 p-6 text-white">
        <div className="flex flex-col sm:flex-row justify-between items-center gap-6">
          <div className="flex items-center gap-6 w-full sm:w-auto justify-between sm:justify-start">
            <div className="flex flex-col">
              <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Selected</span>
              <span className="text-sm font-bold text-white">{selectedSeats.length} Kursi</span>
            </div>
            <div className="h-10 w-[1px] bg-white/10 hidden sm:block"></div>
            <div>
              <p className="text-slate-400 text-[10px] font-bold uppercase tracking-[0.2em] mb-1">Total Pembayaran</p>
              <div className="flex items-baseline gap-1">
                <span className="text-3xl font-black">£{selectedSeats.reduce((sum, s) => sum + s.price, 0).toFixed(2)}</span>
                <span className="text-slate-400 text-sm">GBP</span>
              </div>
            </div>
          </div>
          
          {checkoutUrl ? (
            <Link 
              href={selectedSeats.length > 0 ? checkoutUrl : "#"}
              onClick={() => {
                const selectTime = localStorage.getItem('eventseats_first_seat_select_time')
                const duration = selectTime ? Date.now() - parseInt(selectTime) : 0
                logEvent('checkout_clicked', { 
                  selectedSeatsCount: selectedSeats.length,
                  totalPrice: selectedSeats.reduce((sum, s) => sum + s.price, 0),
                  durationSinceSelectionMs: duration,
                  durationSinceSelectionSec: +(duration / 1000).toFixed(2)
                })
                localStorage.removeItem('eventseats_first_seat_select_time')
              }}
              className={cn(
                "w-full sm:w-auto px-8 py-3.5 rounded-2xl font-black uppercase tracking-widest text-xs transition-all shadow-xl flex items-center justify-center gap-3 text-center",
                selectedSeats.length > 0 
                ? "bg-blue-600 text-white hover:bg-blue-700 hover:shadow-blue-500/35" 
                : "bg-slate-800 text-slate-500 cursor-not-allowed"
              )}
            >
              Checkout
              <ChevronRight className="w-4 h-4" />
            </Link>
          ) : null}
        </div>
      </div>
    </motion.div>
  )
}

export const SeatGrid: React.FC<SeatGridProps> = ({
  seatingLayout,
  selectedSeats,
  onSeatSelect,
  onSeatDeselect,
  onTicketTypeChange,
  bookedSeats,
  className,
  readOnly = false,
  checkoutUrl
}) => {
  const [defaultTicketType, setDefaultTicketType] = useState<TicketType>(TicketType.ADULT)

  const handleSeatSelectWrapper = (seat: Seat, ticketType: TicketType) => {
    if (selectedSeats.length === 0) {
      localStorage.setItem('eventseats_first_seat_select_time', Date.now().toString())
    }
    logEvent('seat_selected', { 
      seatId: seat.id, 
      seatName: `${seat.row}${seat.number}`, 
      ticketType, 
      category: seat.category || 'Reguler' 
    })
    onSeatSelect(seat, ticketType)
  }

  const handleSeatDeselectWrapper = (seatId: string) => {
    if (selectedSeats.length > 0) {
      logEvent('checkout_reselect_seat', { action: 'deselect', seatId })
    }
    logEvent('seat_deselected', { seatId })
    onSeatDeselect(seatId)
  }

  const handleTicketTypeChangeWrapper = (seatId: string, ticketType: TicketType) => {
    logEvent('checkout_reselect_seat', { action: 'change_type', seatId, ticketType })
    onTicketTypeChange(seatId, ticketType)
  }

  const seatsByRow = useMemo(() => {
    const grouped: { [row: string]: Seat[] } = {}
    seatingLayout.seats.forEach(seat => {
      if (!grouped[seat.row]) grouped[seat.row] = []
      grouped[seat.row].push(seat)
    })
    Object.keys(grouped).forEach(row => {
      grouped[row].sort((a, b) => {
        const numA = typeof a.number === 'string' ? parseInt(a.number) : a.number
        const numB = typeof b.number === 'string' ? parseInt(b.number) : b.number
        return numA - numB
      })
    })
    return grouped
  }, [seatingLayout.seats])

  const sortedRows = Object.keys(seatsByRow).sort()

  return (
    <div className={cn('w-full max-w-5xl mx-auto', className)}>
      {/* Immersive Header */}
      <div className="flex flex-col md:flex-row justify-between items-end gap-6 mb-12">
        <div className="space-y-1">
          <h2 className="text-3xl font-black tracking-tight text-slate-900">Pilih Kursi Anda</h2>
          <p className="text-slate-500 font-medium flex items-center gap-2">
            <Armchair className="w-4 h-4" /> 
            {seatingLayout.name} • {seatingLayout.seats.length} Total Kursi
          </p>
        </div>

        {!readOnly && (
          <div className="bg-white p-2 rounded-2xl shadow-xl border border-slate-100 flex items-center gap-2">
            <div className="px-4 py-2 text-xs font-black text-slate-400 uppercase tracking-wider">Default:</div>
            {[
              { type: TicketType.ADULT, icon: User, label: 'Dewasa' },
              { type: TicketType.CHILD, icon: Baby, label: 'Anak' },
              { type: TicketType.CONCESSION, icon: Heart, label: 'Konsesi' }
            ].map((t) => (
              <button
                key={t.type}
                onClick={() => setDefaultTicketType(t.type)}
                className={cn(
                  "flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold transition-all border",
                  t.type === TicketType.ADULT 
                    ? defaultTicketType === TicketType.ADULT 
                      ? "bg-teal-600 text-white border-teal-700 shadow-lg shadow-teal-500/20 scale-[1.02]" 
                      : "text-teal-600 border-teal-200/60 bg-teal-50/10 hover:bg-teal-50"
                    : t.type === TicketType.CHILD 
                    ? defaultTicketType === TicketType.CHILD 
                      ? "bg-emerald-500 text-white border-emerald-600 shadow-lg shadow-emerald-500/20 scale-[1.02]" 
                      : "text-emerald-600 border-emerald-200/60 bg-emerald-50/10 hover:bg-emerald-50"
                    : defaultTicketType === TicketType.CONCESSION 
                      ? "bg-purple-600 text-white border-purple-700 shadow-lg shadow-purple-500/20 scale-[1.02]" 
                      : "text-purple-600 border-purple-200/60 bg-purple-50/10 hover:bg-purple-50"
                )}
              >
                <t.icon className="w-4 h-4" />
                {t.label}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Stage Visualization */}
      <div className="relative mb-20">
        <div className="w-full h-2 bg-slate-200 rounded-full shadow-inner"></div>
        <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-full mb-4">
          <div className="bg-slate-900 text-white px-12 py-3 rounded-b-3xl text-sm font-black tracking-[0.4em] shadow-2xl">
            STAGE / PANGGUNG
          </div>
        </div>
        <div className="w-3/4 h-24 mx-auto mt-2 bg-gradient-to-b from-slate-100 to-transparent rounded-t-[100px] opacity-50"></div>
      </div>

      {/* Seat grid */}
      <div className="flex flex-col items-center gap-4 mb-16 overflow-x-auto pb-4 custom-scrollbar">
        {sortedRows.map(row => (
          <div key={row} className="flex items-center gap-6 group">
            <div className="w-6 text-xs font-black text-slate-300 group-hover:text-slate-600 transition-colors uppercase">
              Row {row}
            </div>

            <div className="flex gap-2 p-1">
              {seatsByRow[row].map(seat => {
                const selection = selectedSeats.find(s => s.seatId === seat.id)
                return (
                  <SeatComponent
                    key={seat.id}
                    seat={seat}
                    isSelected={!!selection}
                    isBooked={bookedSeats.includes(seat.id)}
                    onSelect={() => handleSeatSelectWrapper(seat, defaultTicketType)}
                    onDeselect={() => handleSeatDeselectWrapper(seat.id)}
                    selectedTicketType={selection?.ticketType}
                    readOnly={readOnly}
                  />
                )
              })}
            </div>

            <div className="w-6 text-xs font-black text-slate-300 group-hover:text-slate-600 transition-colors uppercase">
              {row}
            </div>
          </div>
        ))}
      </div>

      {/* Legend */}
      <div className="flex flex-wrap justify-center gap-8 py-8 border-y border-slate-100 mb-10">
        {[
          { color: 'bg-white border-slate-200', label: 'Tersedia' },
          { color: 'bg-sky-50 border-sky-200', label: 'Aksesibel' },
          { color: 'bg-teal-600 border-teal-700', label: 'Dewasa' },
          { color: 'bg-emerald-500 border-emerald-600', label: 'Anak' },
          { color: 'bg-purple-600 border-purple-700', label: 'Konsesi' },
          { color: 'bg-blue-600 border-blue-700', label: 'Terisi' }
        ].map((l) => (
          <div 
            key={l.label} 
            className="flex items-center gap-3"
            onMouseEnter={() => logEvent('seat_legend_view', { legendItem: l.label })}
          >
            <div className={cn("w-5 h-5 rounded-md border-2 shadow-sm", l.color)}></div>
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">{l.label}</span>
          </div>
        ))}
      </div>

      {/* Summary */}
      {!readOnly && (
        <TicketTypeSelector
          selectedSeats={selectedSeats}
          onTicketTypeChange={handleTicketTypeChangeWrapper}
          onSeatDeselect={handleSeatDeselectWrapper}
          checkoutUrl={checkoutUrl}
        />
      )}

      <style jsx global>{`
        .glass-panel {
          background: rgba(255, 255, 255, 0.7);
          backdrop-filter: blur(12px);
          border: 1px solid rgba(255, 255, 255, 0.3);
          border-radius: 24px;
          box-shadow: 0 10px 40px -10px rgba(0, 0, 0, 0.05);
        }
        .custom-scrollbar::-webkit-scrollbar {
          height: 6px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: #f1f5f9;
          border-radius: 10px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: #cbd5e1;
          border-radius: 10px;
        }
      `}</style>
    </div>
  )
}
