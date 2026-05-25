'use client'

import { useState, useEffect, Suspense, useMemo } from 'react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { 
  Calendar, 
  MapPin, 
  ArrowLeft, 
  ChevronRight, 
  Ticket, 
  CreditCard,
  ShieldCheck,
  Loader2,
  Info
} from 'lucide-react'
import { SeatGrid } from '@/components/seat/seat-grid'
import { useRealtimeSeats } from '@/lib/hooks/use-realtime-seats'
import { Seat, SeatSelection, TicketType } from '@/types'
import { cn } from '@/lib/utils'

function SeatSelectionContent() {
  const searchParams = useSearchParams()
  const performanceId = searchParams.get('performanceId')
  const showId = searchParams.get('showId')

  const [layout, setLayout] = useState<any>(null)
  const [show, setShow] = useState<any>(null)
  const [selectedSeats, setSelectedSeats] = useState<SeatSelection[]>([])
  const [fetchingData, setFetchingData] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Realtime hook
  const { bookedSeats } = useRealtimeSeats(performanceId || '')

  useEffect(() => {
    if (!performanceId || !showId) {
      setError('Missing session details. Please select an event again.')
      setFetchingData(false)
      return
    }

    async function fetchData() {
      try {
        setFetchingData(true)
        setError(null)
        
        // 1. Fetch Show and Layout
        const showRes = await fetch(`/api/shows/${showId}`)
        const showData = await showRes.json()
        if (!showData.success) throw new Error(showData.message || 'Failed to load show')
        setShow(showData.data)

        // 2. Fetch Seats for this layout/performance
        const seatsRes = await fetch(`/api/performances/${performanceId}/seats`)
        const seatsData = await seatsRes.json()
        if (!seatsData.success) throw new Error(seatsData.message || 'Failed to load seats')

        // Construct a full seatingLayout object for the SeatGrid component
        const seatingLayout = {
          ...showData.data.seating_layout,
          seats: seatsData.data
        }
        setLayout(seatingLayout)

      } catch (err: any) {
        console.error('Error fetching data:', err)
        setError(err.message || 'Connection lost. Please try again.')
      } finally {
        setFetchingData(false)
      }
    }

    fetchData()
  }, [performanceId, showId])

  const handleSeatSelect = (seat: Seat, ticketType: TicketType) => {
    // Get price based on ticket type
    let price = show.adultPrice
    if (ticketType === TicketType.CHILD) price = show.childPrice
    if (ticketType === TicketType.CONCESSION) price = show.concessionPrice

    const newSelection: SeatSelection = {
      seatId: seat.id,
      seat: seat,
      ticketType: ticketType,
      price: price
    }
    setSelectedSeats([...selectedSeats, newSelection])
  }

  const handleSeatDeselect = (seatId: string) => {
    setSelectedSeats(selectedSeats.filter(s => s.seatId !== seatId))
  }

  const handleTicketTypeChange = (seatId: string, ticketType: TicketType) => {
    let price = show.adultPrice
    if (ticketType === TicketType.CHILD) price = show.childPrice
    if (ticketType === TicketType.CONCESSION) price = show.concessionPrice

    setSelectedSeats(selectedSeats.map(s => 
      s.seatId === seatId ? { ...s, ticketType, price } : s
    ))
  }

  const totalPrice = useMemo(() => {
    return selectedSeats.reduce((sum, s) => sum + s.price, 0)
  }, [selectedSeats])

  if (fetchingData) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen gap-6 bg-slate-50">
        <div className="relative">
          <div className="w-16 h-16 border-4 border-blue-600/20 border-t-blue-600 rounded-full animate-spin"></div>
          <div className="absolute inset-0 flex items-center justify-center">
             <Ticket className="w-6 h-6 text-blue-600" />
          </div>
        </div>
        <div className="text-center">
          <p className="text-slate-900 font-black uppercase tracking-widest text-sm">Preparing Venue</p>
          <p className="text-slate-400 text-xs font-medium">Syncing live seat availability...</p>
        </div>
      </div>
    )
  }

  if (error || !show || !layout) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen gap-8 text-center px-6 bg-slate-50">
        <div className="w-24 h-24 bg-red-50 border border-red-100 rounded-[32px] flex items-center justify-center shadow-xl shadow-red-500/10">
          <ShieldCheck className="w-10 h-10 text-red-500" />
        </div>
        <div className="max-w-md">
          <h2 className="text-3xl font-black text-slate-900 mb-3">Opps! Terjadi Kesalahan</h2>
          <p className="text-slate-500 font-medium leading-relaxed">{error || 'Kami tidak dapat memuat denah kursi saat ini. Silakan coba beberapa saat lagi.'}</p>
        </div>
        <Link 
          href="/events"
          className="flex items-center gap-3 px-10 py-4 bg-slate-900 text-white rounded-2xl font-black uppercase tracking-widest hover:bg-slate-800 transition-all shadow-2xl hover:-translate-y-1 active:translate-y-0"
        >
          <ArrowLeft className="w-5 h-5" />
          Kembali ke Event
        </Link>
      </div>
    )
  }

  const currentPerformance = show.performances?.find((p: any) => p.id === performanceId)

  return (
    <div className="min-h-screen bg-[#F8FAFC]">
      {/* Premium Navigation Header */}
      <nav className="sticky top-0 z-50 bg-white/80 backdrop-blur-xl border-b border-slate-100">
        <div className="max-w-[1400px] mx-auto px-6 h-20 flex items-center justify-between">
          <div className="flex items-center gap-6">
            <Link 
              href={`/events/${show.slug}`}
              className="p-3 hover:bg-slate-50 rounded-2xl transition-all text-slate-400 hover:text-slate-900"
            >
              <ArrowLeft className="w-6 h-6" />
            </Link>
            <div className="h-10 w-[1px] bg-slate-100 hidden md:block"></div>
            <div>
              <h1 className="text-xl font-black text-slate-900 leading-none mb-1">{show.title}</h1>
              <div className="flex items-center gap-4 text-[10px] font-black uppercase tracking-widest text-slate-400">
                <span className="flex items-center gap-1.5"><MapPin className="w-3 h-3 text-blue-600" /> {show.venue?.name}</span>
                <span className="flex items-center gap-1.5"><Calendar className="w-3 h-3 text-emerald-500" /> {new Date(currentPerformance?.dateTime).toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long' })}</span>
              </div>
            </div>
          </div>
        </div>
      </nav>

      <main className="max-w-[1400px] mx-auto px-6 py-12">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12">
          {/* Left Column: Seat Grid */}
          <div className="lg:col-span-8">
            <div className="bg-white rounded-[40px] p-8 md:p-16 shadow-sm border border-slate-100">
              <SeatGrid
                seatingLayout={layout}
                selectedSeats={selectedSeats}
                bookedSeats={bookedSeats}
                onSeatSelect={handleSeatSelect}
                onSeatDeselect={handleSeatDeselect}
                onTicketTypeChange={handleTicketTypeChange}
                checkoutUrl={`/checkout?performanceId=${performanceId}&showId=${showId}&selections=${encodeURIComponent(JSON.stringify(selectedSeats.map(s => ({ seatId: s.seatId, ticketType: s.ticketType }))))}`}
              />
            </div>
          </div>

          {/* Right Column: Details & Mobile Checkout */}
          <div className="lg:col-span-4 space-y-8">
            {/* Event Card */}
            <div className="bg-slate-900 rounded-[32px] p-8 text-white relative overflow-hidden shadow-2xl">
              <div className="absolute top-0 right-0 w-32 h-32 bg-blue-600 blur-[80px] opacity-20"></div>
              <div className="relative z-10">
                <span className="px-3 py-1 bg-blue-600 text-[10px] font-black rounded-full uppercase tracking-widest mb-6 inline-block">
                  Live Event
                </span>
                <h3 className="text-2xl font-black mb-2">{show.title}</h3>
                <p className="text-slate-400 text-sm font-medium mb-6 leading-relaxed">
                  {show.description?.substring(0, 100)}...
                </p>
                <div className="space-y-4 pt-6 border-t border-white/10">
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center border border-white/10">
                      <Calendar className="w-5 h-5 text-emerald-400" />
                    </div>
                    <div>
                      <p className="text-[10px] font-black uppercase tracking-widest text-slate-500">Waktu & Tanggal</p>
                      <p className="text-sm font-bold">{new Date(currentPerformance?.dateTime).toLocaleString('id-ID', { hour: '2-digit', minute: '2-digit' })} • {new Date(currentPerformance?.dateTime).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center border border-white/10">
                      <MapPin className="w-5 h-5 text-blue-400" />
                    </div>
                    <div>
                      <p className="text-[10px] font-black uppercase tracking-widest text-slate-500">Lokasi Venue</p>
                      <p className="text-sm font-bold">{show.venue?.name}, {show.venue?.city}</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Price Information */}
            <div className="bg-white rounded-[32px] p-8 border border-slate-100 shadow-sm">
               <h4 className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-6 flex items-center gap-2">
                 <CreditCard className="w-3 h-3" />
                 Informasi Harga Tiket
               </h4>
               <div className="space-y-4">
                 <div className="flex justify-between items-center p-4 bg-slate-50 rounded-2xl">
                   <div>
                     <p className="text-sm font-black text-slate-900">Dewasa</p>
                     <p className="text-[10px] text-slate-400 font-bold uppercase">Adult Ticket</p>
                   </div>
                   <span className="text-lg font-black text-blue-600">£{show.adultPrice.toFixed(2)}</span>
                 </div>
                 <div className="flex justify-between items-center p-4 bg-slate-50 rounded-2xl">
                   <div>
                     <p className="text-sm font-black text-slate-900">Anak</p>
                     <p className="text-[10px] text-slate-400 font-bold uppercase">Child Ticket</p>
                   </div>
                   <span className="text-lg font-black text-emerald-500">£{show.childPrice.toFixed(2)}</span>
                 </div>
               </div>
            </div>

            {/* Help/Support */}
            <div className="flex items-center gap-4 px-6">
              <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center text-slate-400">
                <Info className="w-5 h-5" />
              </div>
              <p className="text-xs font-medium text-slate-400 leading-snug">
                Butuh bantuan? Hubungi customer service kami untuk bantuan pemilihan kursi.
              </p>
            </div>
          </div>
        </div>
      </main>


    </div>
  )
}

export default function SeatSelectionPage() {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="w-10 h-10 animate-spin text-blue-600" />
      </div>
    }>
      <SeatSelectionContent />
    </Suspense>
  )
}
