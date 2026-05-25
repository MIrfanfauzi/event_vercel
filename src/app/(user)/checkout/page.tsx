'use client'

import { useState, useEffect, Suspense, useMemo } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { motion } from 'framer-motion'
import { 
  ShieldCheck, 
  ArrowLeft, 
  CreditCard, 
  Lock, 
  Info, 
  ChevronRight,
  User,
  Mail,
  Phone,
  Ticket,
  Loader2
} from 'lucide-react'
import { cn } from '@/lib/utils'
import Link from 'next/link'
import { logEvent } from '@/lib/analytics/tracker'

function CheckoutContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [authLoading, setAuthLoading] = useState(true)

  const performanceId = searchParams.get('performanceId')
  const showId = searchParams.get('showId')
  const selectionsParam = searchParams.get('selections')
  const selections = useMemo(() => {
    try {   
      return selectionsParam ? JSON.parse(decodeURIComponent(selectionsParam)) : []
    } catch {
      return []
    }
  }, [selectionsParam])

  const [show, setShow] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [processing, setProcessing] = useState(false)
  const [error, setError] = useState('')

  // Form State
  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const res = await fetch('/api/auth/me')
        const data = await res.json()
        
        if (data.success && data.data) {
          const currentUser = data.data
          setEmail(currentUser.email || '')
          
          // Fetch additional profile fields to pre-populate name and phone
          try {
            const profileRes = await fetch(`/api/profile?email=${currentUser.email}`)
            if (profileRes.ok) {
              const profileData = await profileRes.json()
              if (profileData.success && profileData.data) {
                const customer = profileData.data
                const full = `${customer.firstName || ''} ${customer.lastName || ''}`.trim()
                setFullName(full)
                setPhone(customer.phone || '')
              }
            }
          } catch (profileErr) {
            console.error('Error fetching profile for auto-fill:', profileErr)
          }

          setAuthLoading(false)
        } else {
          router.push('/login?callbackUrl=/checkout?' + searchParams.toString())
        }
      } catch {
        router.push('/login?callbackUrl=/checkout?' + searchParams.toString())
      }
    }
    
    checkAuth()
  }, [router, searchParams])

  useEffect(() => {
    if (!showId || !performanceId) {
      router.push('/events')
      return
    }

    async function fetchShow() {
      try {
        setLoading(true)
        const res = await fetch(`/api/shows/${showId}`)
        const data = await res.json()
        if (data.success) setShow(data.data)
      } catch (err) {
        console.error('Error fetching show:', err)
        setError('Gagal memuat data pertunjukan.')
      } finally {
        setLoading(false)
      }
    }

    fetchShow()
  }, [showId, performanceId, router])

  const handleStripeCheckout = async (e: React.FormEvent) => {
    e.preventDefault()
    setProcessing(true)
    setError('')

    try {
      // Prepare payload for create-session
      const payload = {
        performanceId,
        customer: {
          email,
          firstName: fullName.split(' ')[0] || 'Customer',
          lastName: fullName.split(' ').slice(1).join(' ') || 'User',
          phone
        },
        // For now, default to ADULT for all selected seats
        // In a real app, this would be passed from the seat selection state
        seats: selections
      }

      const res = await fetch('/api/payments/create-session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      })

      const data = await res.json()

      if (!data.success) {
        throw new Error(data.error || 'Gagal membuat sesi pembayaran')
      }

      // Redirect to Stripe Checkout
      if (data.url) {
        logEvent('checkout_completed', { 
          performanceId, 
          showId, 
          seatsCount: selections.length,
          totalPrice: total
        })
        window.location.href = data.url
      } else {
        throw new Error('Stripe URL tidak ditemukan')
      }

    } catch (err: any) {
      console.error('Checkout error:', err)
      setError(err.message || 'Terjadi kesalahan saat memproses pesanan Anda.')
    } finally {
      setProcessing(false)
    }
  }

  const subtotal = useMemo(() => {
    if (!show) return 0
    return selections.reduce((sum: number, s: any) => {
      let price = show.adultPrice
      if (s.ticketType === 'CHILD') price = show.childPrice
      if (s.ticketType === 'CONCESSION') price = show.concessionPrice
      return sum + price
    }, 0)
  }, [selections, show])
  
  const serviceFee = 2.50
  const total = subtotal + serviceFee

  if (loading || authLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen gap-6 bg-[#F8FAFC]">
        <div className="relative">
          <div className="w-16 h-16 border-4 border-blue-600/20 border-t-blue-600 rounded-full animate-spin"></div>
          <div className="absolute inset-0 flex items-center justify-center">
             <ShieldCheck className="w-6 h-6 text-blue-600" />
          </div>
        </div>
        <div className="text-center">
          <p className="text-slate-900 font-black uppercase tracking-widest text-sm">Menyiapkan Pembayaran</p>
          <p className="text-slate-400 text-xs font-medium">Menghubungkan ke gateway aman...</p>
        </div>
      </div>
    )
  }

  if (!show) return null

  return (
    <main className="min-h-screen bg-[#F8FAFC] pb-20">
      {/* Header */}
      <div className="bg-white border-b border-slate-100">
        <div className="max-w-[1200px] mx-auto px-6 h-20 flex items-center justify-between">
          <Link href={`/seat-selection?showId=${showId}&performanceId=${performanceId}`} className="flex items-center gap-2 text-slate-400 hover:text-slate-900 transition-colors group">
            <ArrowLeft className="w-5 h-5 group-hover:-translate-x-1 transition-transform" />
            <span className="text-sm font-bold">Kembali</span>
          </Link>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
              <Lock className="w-4 h-4 text-white" />
            </div>
            <span className="text-xs font-black uppercase tracking-widest text-slate-900">Secure Checkout</span>
          </div>
          <div className="w-20"></div> {/* Spacer */}
        </div>
      </div>

      <div className="max-w-[1200px] mx-auto px-6 py-12">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-start">
          
          {/* Left Side: Checkout Form */}
          <div className="lg:col-span-7 space-y-8">
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-white rounded-[32px] p-8 md:p-10 shadow-sm border border-slate-100"
            >
              <div className="flex items-center gap-4 mb-10">
                <div className="w-12 h-12 bg-blue-50 rounded-2xl flex items-center justify-center">
                  <User className="w-6 h-6 text-blue-600" />
                </div>
                <div>
                  <h2 className="text-2xl font-black text-slate-900">Informasi Pemesan</h2>
                  <p className="text-slate-400 text-sm font-medium">Tiket Anda akan dikirimkan ke email ini.</p>
                </div>
              </div>

              <form id="checkout-form" onSubmit={handleStripeCheckout} className="space-y-6">
                {error && (
                  <div className="p-4 bg-red-50 text-red-600 rounded-2xl border border-red-100 text-sm font-bold flex items-center gap-3">
                    <div className="w-6 h-6 bg-red-100 rounded-full flex items-center justify-center flex-shrink-0">!</div>
                    {error}
                  </div>
                )}

                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Nama Lengkap</label>
                  <div className="relative">
                    <User className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-300" />
                    <input 
                      required
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-100 rounded-2xl pl-12 pr-4 py-4 text-slate-900 font-bold focus:bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all placeholder:text-slate-300"
                      placeholder="Masukkan nama lengkap Anda"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Alamat Email</label>
                    <div className="relative">
                      <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-300" />
                      <input 
                        required
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className="w-full bg-slate-50 border border-slate-100 rounded-2xl pl-12 pr-4 py-4 text-slate-900 font-bold focus:bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all placeholder:text-slate-300"
                        placeholder="email@example.com"
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Nomor Telepon</label>
                    <div className="relative">
                      <Phone className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-300" />
                      <input 
                        required
                        type="tel"
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                        className="w-full bg-slate-50 border border-slate-100 rounded-2xl pl-12 pr-4 py-4 text-slate-900 font-bold focus:bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all placeholder:text-slate-300"
                        placeholder="+62 812..."
                      />
                    </div>
                  </div>
                </div>
              </form>
            </motion.div>

            <div className="flex items-center gap-4 px-8 py-6 bg-blue-50/50 rounded-[24px] border border-blue-100/50">
              <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center shadow-sm">
                <CreditCard className="w-5 h-5 text-blue-600" />
              </div>
              <p className="text-xs font-medium text-slate-500 leading-relaxed">
                Anda akan dialihkan ke halaman pembayaran aman **Stripe**. Kami tidak menyimpan informasi kartu kredit Anda.
              </p>
            </div>
          </div>

          {/* Right Side: Order Summary */}
          <div className="lg:col-span-5 space-y-6">
            <motion.div 
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              className="bg-slate-900 rounded-[40px] overflow-hidden shadow-2xl text-white"
            >
              <div className="relative h-48">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img 
                  src={show.imageUrl || "https://images.unsplash.com/photo-1492684223066-81342ee5ff30?auto=format&fit=crop&q=80"} 
                  className="w-full h-full object-cover opacity-40" 
                  alt="Event" 
                />
                <div className="absolute inset-0 bg-gradient-to-t from-slate-900 via-slate-900/20 to-transparent"></div>
                <div className="absolute bottom-6 left-8">
                  <span className="px-3 py-1 bg-blue-600 text-[10px] font-black rounded-full uppercase tracking-widest mb-3 inline-block">
                    Ringkasan Pesanan
                  </span>
                  <h3 className="text-2xl font-black">{show.title}</h3>
                </div>
              </div>

              <div className="p-8 space-y-8">
                <div className="space-y-4">
                  <div className="flex justify-between items-center text-sm">
                    <div className="flex items-center gap-3 text-slate-400 font-medium">
                      <Ticket className="w-4 h-4" />
                      {selections.length} Tiket
                    </div>
                    <span className="font-bold">£{subtotal.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between items-center text-sm">
                    <div className="flex items-center gap-3 text-slate-400 font-medium">
                      <Info className="w-4 h-4" />
                      Biaya Layanan
                    </div>
                    <span className="font-bold">£{serviceFee.toFixed(2)}</span>
                  </div>
                </div>

                <div className="pt-8 border-t border-white/10 flex justify-between items-end">
                  <div>
                    <p className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-1">Total Bayar</p>
                    <div className="flex items-baseline gap-1">
                      <span className="text-4xl font-black">£{total.toFixed(2)}</span>
                      <span className="text-slate-500 text-xs font-bold uppercase">GBP</span>
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-1">
                     <div className="flex items-center gap-2 text-emerald-400 text-[10px] font-black uppercase tracking-widest">
                       <ShieldCheck className="w-3 h-3" />
                       Paling Aman
                     </div>
                  </div>
                </div>

                <button 
                  form="checkout-form"
                  type="submit"
                  disabled={processing}
                  className={cn(
                    "w-full py-5 rounded-[24px] font-black uppercase tracking-widest text-sm transition-all shadow-2xl flex items-center justify-center gap-3",
                    processing 
                    ? "bg-slate-800 text-slate-500 cursor-not-allowed" 
                    : "bg-blue-600 text-white hover:bg-blue-700 hover:-translate-y-1 active:translate-y-0"
                  )}
                >
                  {processing ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      Memproses...
                    </>
                  ) : (
                    <>
                      Bayar Sekarang
                      <ChevronRight className="w-5 h-5" />
                    </>
                  )}
                </button>

                <p className="text-center text-[10px] font-bold text-slate-500 uppercase tracking-widest">
                  Transaksi Aman & Terenkripsi
                </p>
              </div>
            </motion.div>
          </div>
        </div>
      </div>
    </main>
  )
}

export default function CheckoutPage() {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center min-h-screen bg-[#F8FAFC]">
        <Loader2 className="w-10 h-10 animate-spin text-blue-600" />
      </div>
    }>
      <CheckoutContent />
    </Suspense>
  )
}
