'use client'

import { useState, useEffect, useMemo, Suspense, useRef } from 'react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  Search,
  Filter, 
  MapPin, 
  Star, 
  Clock
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { useAnalytics, useScrollDepth } from '@/lib/analytics/hooks'

function EventListContent() {
  const [events, setEvents] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  
  // Filter States
  const searchParams = useSearchParams()
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedGenre, setSelectedGenre] = useState('All')

  // Usability Analytics
  const { trackEvent } = useAnalytics()
  useScrollDepth('search_scroll_depth')

  const hasFocusedSearch = useRef(false)
  const hasStartedInput = useRef(false)
  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null)

  useEffect(() => {
    trackEvent('search_visible', { component: 'Search Input' })
    trackEvent('category_filter_visible', { component: 'Genre Category Buttons' })

    if (typeof document !== 'undefined') {
      const ref = document.referrer
      if (ref && ref.includes('/events/')) {
        trackEvent('category_navigation_back', { previousPage: ref })
      }
    }
  }, [trackEvent])

  useEffect(() => {
    setSearchQuery(searchParams.get('q') || '')
  }, [searchParams])

  const genres = ['All', 'Musical', 'Music Concert', 'Dram']

  useEffect(() => {
    async function fetchEvents() {
      try {
        setLoading(true)
        const response = await fetch('/api/shows?published=true')
        const data = await response.json()
        if (data.success) {
          setEvents(data.data)
        }
      } catch (err) {
        console.error('Error fetching events:', err)
      } finally {
        setLoading(false)
      }
    }

    fetchEvents()
  }, [])

  const filteredEvents = useMemo(() => {
    return events.filter(event => {
      const matchesSearch = event.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
                           (event.description?.toLowerCase().includes(searchQuery.toLowerCase()))
      
      const eventGenre = event.genre || ''
      const matchesGenre = selectedGenre === 'All' || 
                           eventGenre.toLowerCase() === selectedGenre.toLowerCase() ||
                           (selectedGenre === 'Dram' && eventGenre.toLowerCase() === 'drama')
      
      return matchesSearch && matchesGenre
    })
  }, [events, searchQuery, selectedGenre])

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen gap-6 bg-[#0F172A]">
        <div className="relative">
          <div className="w-16 h-16 border-4 border-teal-500/20 border-t-teal-500 rounded-full animate-spin"></div>
          <div className="absolute inset-0 flex items-center justify-center">
            <Star className="w-6 h-6 text-teal-500 animate-pulse" />
          </div>
        </div>
        <p className="text-teal-500/50 font-black tracking-[0.3em] uppercase text-[10px]">Initializing Experience...</p>
      </div>
    )
  }

  return (
    <main className="min-h-screen bg-[#0F172A] pb-32 overflow-hidden">
      {/* Premium Hero Section */}
      <div className="relative pt-20 pb-12 overflow-hidden">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[1000px] h-[400px] bg-teal-500/10 blur-[120px] rounded-full -z-10"></div>
        <div className="max-w-[1200px] mx-auto px-8 text-center relative z-10">
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="inline-flex items-center gap-3 px-4 py-2 rounded-full bg-white/5 border border-white/10 backdrop-blur-md mb-4"
          >
            <span className="w-2 h-2 rounded-full bg-teal-500 animate-pulse"></span>
            <span className="text-[10px] font-black uppercase tracking-[0.2em] text-teal-400">Live Experiences Now Available</span>
          </motion.div>
          
          <motion.h1 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="text-5xl md:text-7xl font-black text-white mb-4 tracking-tighter leading-none"
          >
            DISCOVER THE <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-teal-400 to-blue-500">SPECTACLE.</span>
          </motion.h1>
          
          <motion.p 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.2 }}
            className="max-w-2xl mx-auto text-slate-400 text-base md:text-lg font-medium leading-relaxed mb-6"
          >
            Access exclusive performances, theater, and live music across the country. 
            Secure your front-row seat to the extraordinary.
          </motion.p>
        </div>
      </div>

      <div className="max-w-[1200px] mx-auto px-8">
        
        {/* Search & Categories Section */}
        <div className="max-w-[600px] mx-auto flex flex-col items-center gap-6 mb-12">
          <div className="w-full relative group">
            <input 
              type="text"
              value={searchQuery}
              onFocus={() => {
                if (!hasFocusedSearch.current) {
                  trackEvent('search_focus')
                  hasFocusedSearch.current = true
                }
              }}
              onChange={(e) => {
                const val = e.target.value
                setSearchQuery(val)

                if (val.length > 0 && !hasStartedInput.current) {
                  trackEvent('search_input_started', { firstChar: val[0] })
                  hasStartedInput.current = true
                }

                if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current)
                if (val.trim().length > 0) {
                  searchTimeoutRef.current = setTimeout(() => {
                    trackEvent('search_completed', { finalQuery: val })
                  }, 1000)
                }
              }}
              placeholder="Search Hamlet, Jazz Festival, concert..."
              className="w-full bg-white/5 border border-white/10 rounded-2xl px-6 py-4 pr-12 text-sm font-bold text-white focus:bg-white/10 focus:ring-2 focus:ring-teal-500/20 outline-none transition-all placeholder:text-slate-600"
            />
            <Search className="absolute right-6 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-600 group-focus-within:text-teal-400 transition-colors" />
          </div>

          <div className="flex flex-wrap justify-center gap-3">
            {genres.map((genre) => (
              <button 
                key={genre}
                onClick={() => {
                  setSelectedGenre(genre)
                  trackEvent('category_selected', { genre })
                }}
                className={cn(
                  "px-6 py-2.5 rounded-xl text-[11px] font-black transition-all uppercase tracking-widest",
                  selectedGenre === genre 
                  ? "bg-teal-500 text-slate-900 shadow-lg shadow-teal-500/20" 
                  : "bg-white/5 border border-white/10 text-slate-400 hover:text-white hover:bg-white/10"
                )}
              >
                {genre}
              </button>
            ))}
          </div>
        </div>

        {/* Event Grid - Full Width, 3 Columns */}
        <div className="w-full">
          <AnimatePresence mode='popLayout'>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-10">
              {filteredEvents.length === 0 ? (
                <motion.div 
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="col-span-full py-40 text-center space-y-6"
                >
                  <div className="w-24 h-24 bg-white/5 border border-white/10 rounded-full flex items-center justify-center mx-auto">
                    <Filter className="w-10 h-10 text-slate-700" />
                  </div>
                  <div className="space-y-2">
                    <h3 className="text-2xl font-black text-white">No matches found</h3>
                    <p className="text-slate-500 font-medium">Try broadening your search or choosing a different category.</p>
                  </div>
                </motion.div>
              ) : (
                filteredEvents.map((event, index) => {
                  const perfDate = event.performances?.[0]?.dateTime 
                    ? new Date(event.performances[0].dateTime).toLocaleDateString('en-US', {
                        month: 'long',
                        day: 'numeric',
                        year: 'numeric'
                      })
                    : 'To Be Announced'

                  return (
                    <motion.div 
                      layout
                      key={event.id}
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ delay: index * 0.1 }}
                      className="group relative"
                    >
                      <div className="absolute inset-0 bg-teal-500/20 blur-[40px] opacity-0 group-hover:opacity-100 transition-opacity duration-500 -z-10"></div>
                      <div className="bg-white/5 border border-white/10 rounded-[40px] overflow-hidden backdrop-blur-sm hover:border-white/20 transition-all duration-500 flex flex-col h-full">
                        
                        <div className="h-72 overflow-hidden relative">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img 
                            src={event.imageUrl || 'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?auto=format&fit=crop&q=80'} 
                            alt={event.title}
                            className="w-full h-full object-cover grayscale-[20%] group-hover:grayscale-0 transition-all duration-700 group-hover:scale-105"
                          />
                          <div className="absolute top-6 right-6">
                             <span className="bg-teal-500 text-slate-900 px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest shadow-xl">
                                {event.genre || 'Live'}
                             </span>
                          </div>
                          <div className="absolute bottom-0 inset-x-0 h-32 bg-gradient-to-t from-[#0F172A] via-[#0F172A]/40 to-transparent"></div>
                        </div>

                        <div className="px-10 pb-10 flex-1 flex flex-col -mt-12 relative z-10">
                          <div className="flex items-center gap-3 text-teal-400 font-black text-[10px] uppercase tracking-[0.2em] mb-4 bg-teal-400/10 w-fit px-4 py-1 rounded-full border border-teal-400/20">
                            <Clock className="w-3.5 h-3.5" />
                            {perfDate}
                          </div>
                          
                          <h3 className="text-3xl font-black text-white mb-6 leading-tight group-hover:text-teal-400 transition-colors">
                            {event.title}
                          </h3>
                          
                          <div className="flex items-center gap-4 text-slate-400 text-xs font-bold mb-10">
                            <span className="flex items-center gap-2">
                              <MapPin className="w-4 h-4 text-teal-500" /> 
                              {event.venue?.name || 'Grand Arena'}
                            </span>
                          </div>

                          <div className="mt-auto flex items-center justify-between pt-8 border-t border-white/5">
                            <div>
                               <p className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-600 mb-1">From</p>
                               <p className="text-3xl font-black text-white">£{event.adultPrice}</p>
                            </div>
                            <Link 
                              href={`/events/${event.slug}`}
                              onClick={() => {
                                trackEvent('category_event_clicked', { 
                                  title: event.title, 
                                  genre: event.genre || 'Live', 
                                  slug: event.slug 
                                })

                                const isDrama = (event.genre || '').toLowerCase().includes('dram') || 
                                                (event.genre || '').toLowerCase().includes('drama') ||
                                                selectedGenre.toLowerCase().includes('dram')
                                
                                if (isDrama) {
                                  trackEvent('category_task_completed', { 
                                    success: true, 
                                    message: 'User clicked drama event details' 
                                  })
                                }
                              }}
                              className="px-8 py-4 bg-white text-slate-900 rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-teal-500 hover:text-slate-900 transition-all shadow-xl active:scale-95"
                            >
                              View Details
                            </Link>
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  )
                })
              )}
            </div>
          </AnimatePresence>

          {filteredEvents.length > 0 && (
            <div className="mt-24 text-center">
              <div className="h-px w-32 bg-white/5 mx-auto mb-8"></div>
              <p className="text-slate-600 text-[10px] font-black uppercase tracking-[0.4em]">Curated by EventSeats Team</p>
            </div>
          )}
        </div>
      </div>
    </main>
  )
}

function EventListLoading() {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen gap-6 bg-[#0F172A]">
      <div className="relative">
        <div className="w-16 h-16 border-4 border-teal-500/20 border-t-teal-500 rounded-full animate-spin"></div>
        <div className="absolute inset-0 flex items-center justify-center">
          <Star className="w-6 h-6 text-teal-500 animate-pulse" />
        </div>
      </div>
      <p className="text-teal-500/50 font-black tracking-[0.3em] uppercase text-[10px]">Initializing Experience...</p>
    </div>
  )
}

export default function EventListPage() {
  return (
    <Suspense fallback={<EventListLoading />}>
      <EventListContent />
    </Suspense>
  )
}
