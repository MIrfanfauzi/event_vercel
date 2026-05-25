'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'

export default function ProfilePage() {
  const router = useRouter()
  
  // Authentication & Profile States
  const [session, setSession] = useState<any>(null)
  const [customer, setCustomer] = useState<any>(null)
  const [bookings, setBookings] = useState<any[]>([])
  
  // UI States
  const [activeTab, setActiveTab] = useState<'bookings' | 'profile' | 'security' | 'payments'>('bookings')
  const [bookingFilter, setBookingFilter] = useState<'all' | 'upcoming'>('all')
  const [loading, setLoading] = useState(true)
  const [updating, setUpdating] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  // Interactive Avatar State
  const [avatar, setAvatar] = useState<string | null>(null)

  // Edit Profile Form State
  const [form, setForm] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    address: ''
  })

  // Password Update Form State
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  })
  const [showPassword, setShowPassword] = useState(false)

  // Saved Credit Cards State
  const [cards, setCards] = useState<any[]>([])
  const [showAddCard, setShowAddCard] = useState(false)
  const [cardForm, setCardForm] = useState({
    number: '',
    name: '',
    expiry: '',
    cvv: ''
  })
  const [cardFocused, setCardFocused] = useState<'front' | 'back'>('front')

  // Selected Booking Modal State
  const [selectedBooking, setSelectedBooking] = useState<any | null>(null)
  const [showTicketModal, setShowTicketModal] = useState(false)

  // Fetch Session, Profile, and Bookings on load
  useEffect(() => {
    async function initProfile() {
      try {
        setLoading(true)
        
        // 1. Get Session
        const authRes = await fetch('/api/auth/me')
        const authData = await authRes.json()
        
        if (!authData.success || !authData.data) {
          router.push('/login?callbackUrl=/profile&message=Please login to view your profile')
          return
        }
        
        const userEmail = authData.data.email
        setSession(authData.data)

        // 2. Load Avatar from LocalStorage (fast & isolated per email)
        const storedAvatar = localStorage.getItem(`eventseats_avatar_${userEmail}`)
        if (storedAvatar) {
          setAvatar(storedAvatar)
        }

        // 3. Get Supabase Customer Profile
        const profileRes = await fetch(`/api/profile?email=${userEmail}`)
        const profileData = await profileRes.json()
        
        let profileName = userEmail.split('@')[0]
        if (profileData.success && profileData.data) {
          setCustomer(profileData.data)
          setForm({
            firstName: profileData.data.firstName || '',
            lastName: profileData.data.lastName || '',
            email: userEmail,
            phone: profileData.data.phone || '',
            address: profileData.data.address || ''
          })
          profileName = `${profileData.data.firstName || ''} ${profileData.data.lastName || ''}`.trim() || profileName
        } else {
          setCustomer({ email: userEmail })
          setForm(prev => ({ ...prev, email: userEmail }))
        }

        // 4. Load Saved Cards from LocalStorage
        const storedCards = localStorage.getItem(`eventseats_cards_${userEmail}`)
        if (storedCards) {
          setCards(JSON.parse(storedCards))
        } else {
          const defaultCard = {
            id: '1',
            number: '4242424242424242',
            name: profileName.toUpperCase(),
            expiry: '12/29',
            cvv: '123',
            brand: 'visa',
            isDefault: true
          }
          setCards([defaultCard])
          localStorage.setItem(`eventseats_cards_${userEmail}`, JSON.stringify([defaultCard]))
        }

        // 5. Get Real Bookings
        const ticketsRes = await fetch(`/api/tickets?email=${userEmail}`)
        const ticketsData = await ticketsRes.json()
        
        if (ticketsData.success && ticketsData.data) {
          setBookings(ticketsData.data)
        }
      } catch (err) {
        console.error('Error initializing profile data:', err)
      } finally {
        setLoading(false)
      }
    }

    initProfile()
  }, [router])

  // Handle Profile Update
  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      setUpdating(true)
      setMessage(null)

      const response = await fetch('/api/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: session.email,
          newEmail: form.email !== session.email ? form.email : undefined,
          firstName: form.firstName,
          lastName: form.lastName,
          phone: form.phone,
          address: form.address
        })
      })

      const data = await response.json()

      if (data.success) {
        setCustomer(data.data)
        if (data.emailChanged && data.newEmail) {
          // Migrate localStorage keys to new email
          const oldEmail = session.email
          const newEmail = data.newEmail
          const oldAvatar = localStorage.getItem(`eventseats_avatar_${oldEmail}`)
          const oldCards = localStorage.getItem(`eventseats_cards_${oldEmail}`)
          if (oldAvatar) {
            localStorage.setItem(`eventseats_avatar_${newEmail}`, oldAvatar)
            localStorage.removeItem(`eventseats_avatar_${oldEmail}`)
          }
          if (oldCards) {
            localStorage.setItem(`eventseats_cards_${newEmail}`, oldCards)
            localStorage.removeItem(`eventseats_cards_${oldEmail}`)
          }
          // Update session state to new email
          setSession((prev: any) => ({ ...prev, email: newEmail }))
          setMessage({ type: 'success', text: `Profile updated! Email changed to ${newEmail}. Please log in again if needed.` })
        } else {
          setMessage({ type: 'success', text: 'Profile details updated successfully!' })
        }
        setTimeout(() => setMessage(null), 4000)
      } else {
        setMessage({ type: 'error', text: data.message || 'Failed to update profile' })
      }
    } catch (err) {
      console.error('Error updating profile:', err)
      setMessage({ type: 'error', text: 'An unexpected error occurred.' })
    } finally {
      setUpdating(false)
    }
  }

  // Handle Security Password Change
  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!passwordForm.newPassword) {
      setMessage({ type: 'error', text: 'Please enter a valid new password.' })
      return
    }
    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      setMessage({ type: 'error', text: 'New passwords do not match.' })
      return
    }
    if (passwordForm.newPassword.length < 6) {
      setMessage({ type: 'error', text: 'Password must be at least 6 characters.' })
      return
    }

    try {
      setUpdating(true)
      setMessage(null)

      const response = await fetch('/api/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: session.email,
          newPassword: passwordForm.newPassword
        })
      })

      const data = await response.json()

      if (data.success) {
        setMessage({ type: 'success', text: 'Security credentials updated successfully! Your new password is now active.' })
        setPasswordForm({ currentPassword: '', newPassword: '', confirmPassword: '' })
        setTimeout(() => setMessage(null), 4000)
      } else {
        setMessage({ type: 'error', text: data.message || 'Failed to update password' })
      }
    } catch (err) {
      console.error('Error updating password:', err)
      setMessage({ type: 'error', text: 'An unexpected error occurred during password update.' })
    } finally {
      setUpdating(false)
    }
  }

  // Handle Avatar Image Upload
  const handleAvatarUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    // Limit size to 2.5MB
    if (file.size > 2.5 * 1024 * 1024) {
      alert("Image size must be less than 2.5MB.")
      return
    }

    const reader = new FileReader()
    reader.onload = (event) => {
      const base64String = event.target?.result as string
      setAvatar(base64String)
      if (session?.email) {
        localStorage.setItem(`eventseats_avatar_${session.email}`, base64String)
      }
    }
    reader.readAsDataURL(file)
  }

  // Handle Card Creation
  const getCardBrand = (num: string) => {
    const clean = num.replace(/\D/g, '')
    if (clean.startsWith('4')) return 'visa'
    if (clean.startsWith('5')) return 'mastercard'
    if (clean.startsWith('3')) return 'amex'
    return 'generic'
  }

  const handleAddCardSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const cleanNumber = cardForm.number.replace(/\D/g, '')
    if (cleanNumber.length < 16) {
      alert('Please enter a valid 16-digit card number.')
      return
    }
    if (!cardForm.expiry || !cardForm.cvv) {
      alert('Please complete all card details.')
      return
    }

    const brand = getCardBrand(cleanNumber)
    const newCard = {
      id: Date.now().toString(),
      number: cleanNumber,
      name: (cardForm.name || displayName).toUpperCase(),
      expiry: cardForm.expiry,
      cvv: cardForm.cvv,
      brand,
      isDefault: cards.length === 0
    }

    const updatedCards = [...cards, newCard]
    setCards(updatedCards)
    localStorage.setItem(`eventseats_cards_${session.email}`, JSON.stringify(updatedCards))
    
    // Reset Form
    setCardForm({ number: '', name: '', expiry: '', cvv: '' })
    setShowAddCard(false)
  }

  const handleDeleteCard = (id: string) => {
    const updated = cards.filter(c => c.id !== id)
    if (cards.find(c => c.id === id)?.isDefault && updated.length > 0) {
      updated[0].isDefault = true
    }
    setCards(updated)
    localStorage.setItem(`eventseats_cards_${session.email}`, JSON.stringify(updated))
  }

  const handleSetDefaultCard = (id: string) => {
    const updated = cards.map(c => ({
      ...c,
      isDefault: c.id === id
    }))
    setCards(updated)
    localStorage.setItem(`eventseats_cards_${session.email}`, JSON.stringify(updated))
  }

  // Get Password Strength indicator
  const getPasswordStrength = (pass: string) => {
    if (!pass) return { score: 0, text: '', color: 'bg-slate-200' }
    if (pass.length < 6) return { score: 1, text: 'Weak', color: 'bg-red-500' }
    
    const hasNum = /\D/.test(pass) && /\d/.test(pass)
    const hasSpecial = /[^A-Za-z0-9]/.test(pass)
    const hasUpper = /[A-Z]/.test(pass) && /[a-z]/.test(pass)
    
    const criteria = [hasNum, hasSpecial, hasUpper].filter(Boolean).length
    
    if (criteria >= 2 && pass.length >= 8) {
      return { score: 3, text: 'Strong', color: 'bg-emerald-500' }
    }
    return { score: 2, text: 'Medium', color: 'bg-amber-400' }
  }

  const strength = getPasswordStrength(passwordForm.newPassword)

  // Filter Bookings (All vs Upcoming)
  const filteredBookings = bookings.filter((booking) => {
    if (bookingFilter === 'all') return true
    const perfDate = new Date(booking.performances?.dateTime)
    return perfDate > new Date()
  })

  // Determine Loyalty Member Status
  const getMemberStatus = (bookingCount: number) => {
    if (bookingCount >= 5) return 'Gold'
    if (bookingCount >= 2) return 'Silver'
    return 'Bronze'
  }

  // Format Helper for Icons depending on genre
  const getGenreIcon = (title: string) => {
    const lTitle = title.toLowerCase()
    if (lTitle.includes('jazz') || lTitle.includes('music') || lTitle.includes('concert') || lTitle.includes('festival')) {
      return 'music_note'
    }
    if (lTitle.includes('art') || lTitle.includes('expo') || lTitle.includes('canvas')) {
      return 'palette'
    }
    if (lTitle.includes('summit') || lTitle.includes('conference') || lTitle.includes('tech')) {
      return 'co_present'
    }
    return 'stadium'
  }

  // Print Ticket Flow (Dedicated Clean Popup Window with full printable styles)
  const handlePrintTicket = (booking: any) => {
    const seatsStr = booking.booking_items?.map((item: any) => `${item.seats?.row || ''}${item.seats?.number || ''}`).join(', ') || 'N/A'
    const showTitle = booking.performances?.shows?.title || 'Live Event'
    const venueName = booking.performances?.shows?.venue?.name || 'Demo Theatre'
    const dateStr = new Date(booking.performances?.dateTime).toLocaleDateString('id-ID', { 
      weekday: 'long', year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' 
    })
    const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${booking.bookingNumber}`
    
    const printWindow = window.open('', '_blank', 'width=800,height=600')
    if (!printWindow) {
      alert("Please allow popups to print ticket PDFs.")
      return
    }
    
    printWindow.document.write(`
      <html>
        <head>
          <title>Ticket - ${booking.bookingNumber}</title>
          <style>
            @import url('https://fonts.googleapis.com/css2?family=Outfit:wght@400;700;900&display=swap');
            body {
              font-family: 'Outfit', sans-serif;
              background: #f8fafc;
              color: #0f172a;
              padding: 40px;
              display: flex;
              justify-content: center;
              align-items: center;
              min-height: 100vh;
              margin: 0;
            }
            .ticket-card {
              background: #ffffff;
              border: 1px solid #e2e8f0;
              border-radius: 32px;
              width: 500px;
              overflow: hidden;
              box-shadow: 0 20px 25px -5px rgb(0 0 0 / 0.1), 0 8px 10px -6px rgb(0 0 0 / 0.1);
            }
            .header {
              background: linear-gradient(135deg, #0f172a 0%, #1e293b 100%);
              color: #fff;
              padding: 32px 24px;
              text-align: center;
              position: relative;
            }
            .header h1 {
              margin: 0 0 4px;
              font-size: 26px;
              font-weight: 900;
              text-transform: uppercase;
              letter-spacing: 2px;
            }
            .header p {
              margin: 0;
              font-size: 11px;
              font-weight: 700;
              color: #2dd4bf;
              text-transform: uppercase;
              letter-spacing: 3px;
            }
            .body {
              padding: 32px;
              background: #fff;
            }
            .grid {
              display: grid;
              grid-template-columns: 1fr 1fr;
              gap: 20px;
              margin-bottom: 24px;
            }
            .label {
              font-size: 10px;
              font-weight: 700;
              text-transform: uppercase;
              color: #94a3b8;
              letter-spacing: 1.5px;
              margin-bottom: 6px;
            }
            .value {
              font-size: 14px;
              font-weight: 700;
              color: #0f172a;
              line-height: 1.4;
            }
            .qr-section {
              display: flex;
              flex-direction: column;
              align-items: center;
              border-top: 2px dashed #e2e8f0;
              padding-top: 32px;
              margin-top: 8px;
              position: relative;
            }
            .qr-section::before, .qr-section::after {
              content: '';
              position: absolute;
              top: -12px;
              width: 24px;
              height: 24px;
              background: #f8fafc;
              border-radius: 50%;
            }
            .qr-section::before { left: -44px; }
            .qr-section::after { right: -44px; }
            .qr-image {
              width: 150px;
              height: 150px;
              margin-bottom: 16px;
              border: 1px solid #e2e8f0;
              padding: 8px;
              border-radius: 16px;
            }
            .qr-text {
              font-size: 13px;
              font-weight: 900;
              color: #0f172a;
              letter-spacing: 3px;
              text-transform: uppercase;
            }
            @media print {
              body { padding: 0; background: none; }
              .ticket-card { box-shadow: none; border: 1px solid #000; margin: auto; }
              .qr-section::before, .qr-section::after { display: none; }
            }
          </style>
        </head>
        <body>
          <div class="ticket-card">
            <div class="header">
              <h1>EVENTSEATS</h1>
              <p>Official Digital Pass</p>
            </div>
            <div class="body">
              <div class="grid">
                <div style="grid-column: span 2;">
                  <div class="label">Show Event</div>
                  <div class="value" style="font-size: 18px; font-weight: 900;">${showTitle}</div>
                </div>
                <div>
                  <div class="label">Booking Code</div>
                  <div class="value" style="color: #0d9488; font-family: monospace; font-size: 15px;">${booking.bookingNumber}</div>
                </div>
                <div>
                  <div class="label">Allocated Seats</div>
                  <div class="value" style="color: #0f766e;">${seatsStr}</div>
                </div>
                <div>
                  <div class="label">Date & Time</div>
                  <div class="value">${dateStr}</div>
                </div>
                <div>
                  <div class="label">Venue Location</div>
                  <div class="value">${venueName}</div>
                </div>
                <div>
                  <div class="label">Customer Name</div>
                  <div class="value">${displayName}</div>
                </div>
                <div>
                  <div class="label">Amount Paid</div>
                  <div class="value">£${Number(booking.totalAmount).toFixed(2)} GBP</div>
                </div>
              </div>
              <div class="qr-section">
                <img class="qr-image" src="${qrUrl}" alt="QR" />
                <div class="qr-text">${booking.bookingNumber}</div>
              </div>
            </div>
          </div>
          <script>
            window.onload = function() {
              window.print();
              setTimeout(function() { window.close(); }, 500);
            };
          </script>
        </body>
      </html>
    `)
    printWindow.document.close()
  }

  // Text File Downloader Pass
  const handleDownloadPass = (booking: any) => {
    const seatsStr = booking.booking_items?.map((item: any) => `${item.seats?.row || ''}${item.seats?.number || ''}`).join(', ') || 'N/A'
    const showTitle = booking.performances?.shows?.title || 'Live Event'
    const venueName = booking.performances?.shows?.venue?.name || 'Demo Theatre'
    const dateStr = new Date(booking.performances?.dateTime).toLocaleString('en-US', {
      weekday: 'long', year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit'
    })
    
    const content = `
=========================================================
            EVENTSEATS - OFFICIAL E-TICKET
=========================================================
Booking Code : ${booking.bookingNumber}
Status       : CONFIRMED / PAID (Secured)
Show Title   : ${showTitle}
Venue        : ${venueName}
Date & Time  : ${dateStr}
Seats        : ${seatsStr}
Price Paid   : £${Number(booking.totalAmount).toFixed(2)} GBP
Cardholder   : ${displayName}
=========================================================
Please present this e-ticket on your mobile device
at the venue entrance. Arrive 30 minutes early.

Thank you for booking with EventSeats!
=========================================================
    `
    const blob = new Blob([content], { type: 'text/plain' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `Ticket-${booking.bookingNumber}.txt`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
  }

  const displayName = customer?.firstName || customer?.lastName
    ? `${customer.firstName || ''} ${customer.lastName || ''}`.trim()
    : session?.email?.split('@')[0] || 'User'

  if (loading) {
    return (
      <main className="max-w-[1200px] mx-auto px-8 py-20 w-full min-h-[500px] flex items-center justify-center animate-fade-in">
        <div className="flex flex-col items-center space-y-4">
          <div className="w-14 h-14 border-4 border-teal-500 border-t-transparent rounded-full animate-spin"></div>
          <p className="text-slate-500 font-bold text-xs tracking-wider uppercase animate-pulse">Loading EventSeats Profile...</p>
        </div>
      </main>
    )
  }

  return (
    <main className="max-w-[1200px] mx-auto px-8 py-10 w-full min-h-[80px]">
      <div className="grid grid-cols-1 md:grid-cols-12 gap-10">
        
        {/* Left Profile Sidebar */}
        <aside className="md:col-span-4 lg:col-span-3">
          <div className="bg-white border border-slate-100 rounded-2xl p-8 flex flex-col items-center text-center space-y-6 sticky top-28 shadow-sm">
            

            <div className="space-y-1">
              <h1 className="text-xl font-bold text-slate-900 leading-tight">{displayName}</h1>
              <p className="text-sm text-slate-500 font-semibold">{session?.email}</p>
            </div>
            
            {/* Interactive Tab Buttons */}
            <div className="w-full pt-6 border-t border-slate-100 flex flex-col gap-2">
              <button 
                onClick={() => { setActiveTab('bookings'); setMessage(null); }}
                className={`flex items-center justify-between px-4 py-3 rounded-xl font-bold text-xs uppercase tracking-widest transition-all ${
                  activeTab === 'bookings' 
                    ? 'bg-teal-50 text-teal-700' 
                    : 'text-slate-500 hover:bg-slate-50'
                }`}
              >
                <div className="flex items-center gap-3">
                  <span className="material-symbols-outlined text-[18px]">local_activity</span>
                  <span>Bookings</span>
                </div>
                <span className="material-symbols-outlined text-[16px]">chevron_right</span>
              </button>
              
              <button 
                onClick={() => { setActiveTab('profile'); setMessage(null); }}
                className={`flex items-center justify-between px-4 py-3 rounded-xl font-bold text-xs uppercase tracking-widest transition-all ${
                  activeTab === 'profile' 
                    ? 'bg-teal-50 text-teal-700' 
                    : 'text-slate-500 hover:bg-slate-50'
                }`}
              >
                <div className="flex items-center gap-3">
                  <span className="material-symbols-outlined text-[18px]">person</span>
                  <span>Profile Details</span>
                </div>
                <span className="material-symbols-outlined text-[16px]">chevron_right</span>
              </button>

              <button 
                onClick={() => { setActiveTab('security'); setMessage(null); }}
                className={`flex items-center justify-between px-4 py-3 rounded-xl font-bold text-xs uppercase tracking-widest transition-all ${
                  activeTab === 'security' 
                    ? 'bg-teal-50 text-teal-700' 
                    : 'text-slate-500 hover:bg-slate-50'
                }`}
              >
                <div className="flex items-center gap-3">
                  <span className="material-symbols-outlined text-[18px]">security</span>
                  <span>Security</span>
                </div>
                <span className="material-symbols-outlined text-[16px]">chevron_right</span>
              </button>

              <button 
                onClick={() => { setActiveTab('payments'); setMessage(null); }}
                className={`flex items-center justify-between px-4 py-3 rounded-xl font-bold text-xs uppercase tracking-widest transition-all ${
                  activeTab === 'payments' 
                    ? 'bg-teal-50 text-teal-700' 
                    : 'text-slate-500 hover:bg-slate-50'
                }`}
              >
                <div className="flex items-center gap-3">
                  <span className="material-symbols-outlined text-[18px]">payments</span>
                  <span>Payments</span>
                </div>
                <span className="material-symbols-outlined text-[16px]">chevron_right</span>
              </button>
            </div>
          </div>
        </aside>

        {/* Right Content Area */}
        <section className="md:col-span-8 lg:col-span-9 space-y-10">
          
          {/* TAB 1: BOOKING HISTORY */}
          {activeTab === 'bookings' && (
            <div className="space-y-10 animate-fade-in">
              <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
                <div>
                  <h2 className="text-3xl font-bold text-slate-900">Booking History</h2>
                  <p className="text-slate-500 text-sm font-medium mt-1">Manage your dynamic event reservations connected with Supabase.</p>
                </div>
                <div className="flex bg-white border border-slate-200 rounded-xl p-1 self-start sm:self-auto shadow-sm">
                  <button 
                    onClick={() => setBookingFilter('all')}
                    className={`px-4 py-1.5 rounded-lg font-bold text-xs uppercase tracking-widest transition-all ${
                      bookingFilter === 'all' 
                        ? 'bg-teal-500 text-white' 
                        : 'text-slate-500 hover:bg-slate-50'
                    }`}
                  >
                    All
                  </button>
                  <button 
                    onClick={() => setBookingFilter('upcoming')}
                    className={`px-4 py-1.5 rounded-lg font-bold text-xs uppercase tracking-widest transition-all ${
                      bookingFilter === 'upcoming' 
                        ? 'bg-teal-500 text-white' 
                        : 'text-slate-500 hover:bg-slate-50'
                    }`}
                  >
                    Upcoming
                  </button>
                </div>
              </div>

              {/* Booking Cards */}
              <div className="space-y-4">
                {filteredBookings.length === 0 ? (
                  <div className="py-20 text-center bg-white border border-slate-100 rounded-2xl shadow-sm">
                    <span className="material-symbols-outlined text-5xl text-slate-300 mb-4">event_busy</span>
                    <h3 className="text-lg font-bold text-slate-700 mb-1">No Bookings Found</h3>
                    <p className="text-slate-400 text-sm font-medium max-w-sm mx-auto mb-6">
                      {bookingFilter === 'upcoming' 
                        ? "You don't have any upcoming experiences scheduled." 
                        : "Your digital booking list is currently empty."}
                    </p>
                    <Link href="/events" className="inline-flex items-center gap-2 px-6 py-3 bg-teal-600 text-white rounded-xl font-bold text-xs uppercase tracking-wider hover:bg-teal-700 transition-all shadow-md">
                      <span className="material-symbols-outlined text-[16px]">search</span>
                      Explore Shows
                    </Link>
                  </div>
                ) : (
                  filteredBookings.map((booking) => {
                    const dateObj = new Date(booking.performances?.dateTime)
                    const showTitle = booking.performances?.shows?.title || 'Live Event'
                    const showGenreIcon = getGenreIcon(showTitle)
                    
                    const dateStr = dateObj.toLocaleDateString('en-US', { 
                      month: 'long', 
                      day: 'numeric', 
                      year: 'numeric' 
                    })
                    const timeStr = dateObj.toLocaleTimeString('en-US', { 
                      hour: '2-digit', 
                      minute: '2-digit' 
                    })

                    const isCancelled = booking.status === 'CANCELLED'
                    const isUpcoming = dateObj > new Date()
                    const displayStatus = isCancelled 
                      ? 'Cancelled' 
                      : !isUpcoming 
                        ? 'Past Event' 
                        : booking.status === 'PAID' 
                          ? 'Confirmed' 
                          : 'Pending'

                    return (
                      <div 
                        key={booking.id} 
                        className={`bg-white border border-slate-100 rounded-2xl p-6 hover:shadow-md transition-all flex flex-col md:flex-row md:items-center justify-between gap-6 ${isCancelled ? 'opacity-60 grayscale' : ''}`}
                      >
                        <div className="flex items-center gap-6">
                          <div className={`w-16 h-16 rounded-xl flex items-center justify-center shrink-0 ${
                            isCancelled 
                              ? 'bg-red-50 text-red-500' 
                              : !isUpcoming 
                                ? 'bg-slate-50 text-slate-500' 
                                : 'bg-teal-50 text-teal-600'
                          }`}>
                            <span className="material-symbols-outlined text-[32px]">{showGenreIcon}</span>
                          </div>
                          
                          <div className="space-y-1">
                            <span className={`inline-flex px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-widest ${
                              isCancelled 
                                ? 'bg-red-50 text-red-700' 
                                : !isUpcoming 
                                  ? 'bg-slate-100 text-slate-600' 
                                  : 'bg-emerald-50 text-emerald-700 border border-emerald-100'
                            }`}>
                              {displayStatus}
                            </span>
                            <h3 className="text-lg font-bold text-slate-900 leading-snug">{showTitle}</h3>
                            <p className="text-xs text-slate-500 font-bold uppercase tracking-wider flex items-center gap-1.5">
                              <span className="material-symbols-outlined text-[16px] text-teal-500">calendar_month</span>
                              {dateStr} • {timeStr}
                            </p>
                          </div>
                        </div>

                        {/* Booking Action Buttons */}
                        <div className="flex items-center gap-3 shrink-0">
                          {isCancelled ? (
                            <button 
                              onClick={() => {
                                setSelectedBooking(booking);
                                setShowTicketModal(true);
                              }}
                              className="px-5 py-2.5 rounded-xl border border-slate-200 font-bold text-[10px] uppercase tracking-widest text-slate-600 hover:bg-slate-50 transition-all"
                            >
                              Details
                            </button>
                          ) : (
                            <>
                              <button 
                                onClick={() => handleDownloadPass(booking)}
                                className="px-5 py-2.5 rounded-xl border border-slate-200 font-bold text-[10px] uppercase tracking-widest text-slate-600 hover:bg-slate-50 transition-all flex items-center gap-2"
                              >
                                <span className="material-symbols-outlined text-[16px]">download</span>
                                Download
                              </button>
                              <button 
                                onClick={() => {
                                  setSelectedBooking(booking);
                                  setShowTicketModal(true);
                                }}
                                className="px-5 py-2.5 rounded-xl bg-teal-600 text-white font-bold text-[10px] uppercase tracking-widest hover:bg-teal-700 transition-all flex items-center gap-2 shadow-sm"
                              >
                                <span className="material-symbols-outlined text-[16px]">confirmation_number</span>
                                View Pass
                              </button>
                            </>
                          )}
                        </div>
                      </div>
                    )
                  })
                )}
              </div>

              {/* Dynamic Quick Stats */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-4">
                <div className="bg-teal-50/50 p-6 rounded-2xl border border-teal-100/40 space-y-2 shadow-sm">
                  <span className="material-symbols-outlined text-teal-600 text-3xl">local_activity</span>
                  <h4 className="text-3xl font-bold text-teal-800">{bookings.length}</h4>
                  <p className="text-[10px] font-bold text-teal-700 opacity-80 uppercase tracking-widest">Total Bookings</p>
                </div>
                <div className="bg-white p-6 rounded-2xl border border-slate-100 space-y-2 shadow-sm">
                  <span className="material-symbols-outlined text-teal-500 text-3xl">star</span>
                  <h4 className="text-3xl font-bold text-slate-900">4.9</h4>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Attendee Score</p>
                </div>
                <div className="bg-white p-6 rounded-2xl border border-slate-100 space-y-2 shadow-sm">
                  <span className="material-symbols-outlined text-teal-500 text-3xl">loyalty</span>
                  <h4 className="text-3xl font-bold text-slate-900">{getMemberStatus(bookings.length)}</h4>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Loyalty Status</p>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: PROFILE DETAILS EDIT FORM */}
          {activeTab === 'profile' && (
            <div className="bg-white border border-slate-100 p-8 rounded-2xl shadow-sm space-y-8 animate-fade-in">
              <div>
                <h2 className="text-2xl font-bold text-slate-900">Profile Details</h2>
                <p className="text-slate-500 text-sm font-medium mt-1">Update your personal contact details, which are securely synced with Supabase.</p>
              </div>

              <form onSubmit={handleUpdateProfile} className="space-y-6">
                
                {/* Form Alert Message */}
                {message && (
                  <div className={`p-4 rounded-xl text-sm font-bold flex items-center gap-2 border ${
                    message.type === 'success' 
                      ? 'bg-emerald-50 text-emerald-800 border-emerald-100' 
                      : 'bg-red-50 text-red-800 border-red-100'
                  }`}>
                    <span className="material-symbols-outlined">
                      {message.type === 'success' ? 'check_circle' : 'error'}
                    </span>
                    <span>{message.text}</span>
                  </div>
                )}

                {/* Profile Photo Uploader */}
                <div className="flex flex-col items-center justify-center pb-6 border-b border-slate-100">
                  <div className="relative group cursor-pointer animate-fade-in" onClick={() => document.getElementById('avatar-upload')?.click()}>
                    <div className="w-32 h-32 rounded-full overflow-hidden border-4 border-teal-50 flex items-center justify-center bg-teal-600/10 relative shadow-inner">
                      {avatar ? (
                        /* eslint-disable-next-line @next/next/no-img-element */
                        <img src={avatar} className="w-full h-full object-cover" alt="Profile" />
                      ) : (
                        <span className="material-symbols-outlined text-[64px] text-teal-600">person</span>
                      )}
                      {/* Hover Overlay */}
                      <div className="absolute inset-0 bg-slate-900/40 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center text-white text-[10px] font-black uppercase tracking-wider gap-1 text-center">
                        <span className="material-symbols-outlined text-lg">photo_camera</span>
                        <span>Change Photo</span>
                      </div>
                    </div>
                    <input 
                      id="avatar-upload"
                      type="file" 
                      accept="image/*" 
                      className="hidden" 
                      onChange={handleAvatarUpload}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">First Name</label>
                    <input 
                      type="text" 
                      value={form.firstName}
                      onChange={(e) => setForm({ ...form, firstName: e.target.value })}
                      placeholder="e.g. Alex"
                      className="w-full px-4 py-3 rounded-xl border border-slate-200 text-sm font-semibold text-slate-800 focus:outline-none focus:border-teal-500 transition-colors"
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Last Name</label>
                    <input 
                      type="text" 
                      value={form.lastName}
                      onChange={(e) => setForm({ ...form, lastName: e.target.value })}
                      placeholder="e.g. Rivers"
                      className="w-full px-4 py-3 rounded-xl border border-slate-200 text-sm font-semibold text-slate-800 focus:outline-none focus:border-teal-500 transition-colors"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Email Address</label>
                  <input 
                    type="email" 
                    value={form.email}
                    onChange={(e) => setForm({ ...form, email: e.target.value })}
                    placeholder="e.g. user@example.com"
                    className="w-full px-4 py-3 rounded-xl border border-slate-200 text-sm font-semibold text-slate-800 focus:outline-none focus:border-teal-500 transition-colors"
                  />
                  {form.email !== session?.email && (
                    <p className="text-xs text-amber-600 font-semibold flex items-center gap-1">
                      <span className="material-symbols-outlined text-[14px]">warning</span>
                      Changing your email will update your login credentials.
                    </p>
                  )}
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Phone Number</label>
                  <input 
                    type="text" 
                    value={form.phone}
                    onChange={(e) => setForm({ ...form, phone: e.target.value })}
                    placeholder="e.g. +62 812-3456-7890"
                    className="w-full px-4 py-3 rounded-xl border border-slate-200 text-sm font-semibold text-slate-800 focus:outline-none focus:border-teal-500 transition-colors"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Physical Address</label>
                  <textarea 
                    value={form.address}
                    onChange={(e) => setForm({ ...form, address: e.target.value })}
                    placeholder="e.g. Sudirman Suite 14B, South Jakarta"
                    rows={3}
                    className="w-full px-4 py-3 rounded-xl border border-slate-200 text-sm font-semibold text-slate-800 focus:outline-none focus:border-teal-500 transition-colors resize-none"
                  />
                </div>

                <div className="pt-4 flex justify-end">
                  <button 
                    type="submit" 
                    disabled={updating}
                    className="px-8 py-3.5 bg-teal-600 text-white rounded-xl font-bold text-xs uppercase tracking-widest hover:bg-teal-700 transition-all shadow-md flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {updating ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-2 border-white/20 border-t-white"></div>
                        <span>Saving...</span>
                      </>
                    ) : (
                      <>
                        <span className="material-symbols-outlined text-[16px]">save</span>
                        <span>Save Changes</span>
                      </>
                    )}
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* TAB 3: SECURITY INFORMATION & PASSWORD RESET */}
          {activeTab === 'security' && (
            <div className="bg-white border border-slate-100 p-8 rounded-2xl shadow-sm space-y-8 animate-fade-in">
              <div>
                <h2 className="text-2xl font-bold text-slate-900">Security & Credentials</h2>
                <p className="text-slate-500 text-sm font-medium mt-1">Configure password protection and encryption schemas for your account.</p>
              </div>

              <div className="p-6 rounded-xl bg-slate-50 border border-slate-100 flex items-start gap-4">
                <span className="material-symbols-outlined text-teal-600 p-2 bg-teal-50 rounded-lg">verified_user</span>
                <div>
                  <h4 className="font-bold text-slate-900 mb-1">Authenticated Encryption Secure</h4>
                  <p className="text-sm text-slate-500 font-medium">Your password parameters are securely salted and hashed using standard bcrypt rounds before writing to database clusters.</p>
                </div>
              </div>

              {/* Password Edit Form */}
              <form onSubmit={handleUpdatePassword} className="space-y-6 pt-4">
                <h3 className="text-md font-bold text-slate-800 border-b border-slate-100 pb-2">Change Account Password</h3>

                {message && (
                  <div className={`p-4 rounded-xl text-sm font-bold flex items-center gap-2 border ${
                    message.type === 'success' 
                      ? 'bg-emerald-50 text-emerald-800 border-emerald-100' 
                      : 'bg-red-50 text-red-800 border-red-100'
                  }`}>
                    <span className="material-symbols-outlined">
                      {message.type === 'success' ? 'check_circle' : 'error'}
                    </span>
                    <span>{message.text}</span>
                  </div>
                )}

                <div className="space-y-5">
                  <div className="space-y-2 relative">
                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">New Password</label>
                    <div className="relative">
                      <input 
                        type={showPassword ? "text" : "password"}
                        value={passwordForm.newPassword}
                        onChange={(e) => setPasswordForm({ ...passwordForm, newPassword: e.target.value })}
                        placeholder="At least 6 characters"
                        className="w-full px-4 py-3 pr-12 rounded-xl border border-slate-200 text-sm font-semibold text-slate-800 focus:outline-none focus:border-teal-500 transition-colors"
                      />
                      <button 
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                      >
                        <span className="material-symbols-outlined text-xl">
                          {showPassword ? 'visibility_off' : 'visibility'}
                        </span>
                      </button>
                    </div>
                    
                    {/* Live Password Strength Meter */}
                    {passwordForm.newPassword && (
                      <div className="space-y-1.5 pt-1">
                        <div className="flex items-center justify-between text-[10px] font-bold uppercase tracking-wider text-slate-400">
                          <span>Password Strength:</span>
                          <span className={
                            strength.score === 1 ? 'text-red-500' : strength.score === 2 ? 'text-amber-500' : 'text-emerald-500'
                          }>{strength.text}</span>
                        </div>
                        <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden flex gap-0.5">
                          <div className={`h-full ${strength.color} transition-all duration-300`} style={{ width: strength.score === 1 ? '33%' : strength.score === 2 ? '66%' : '100%' }}></div>
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="space-y-2">
                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Confirm New Password</label>
                    <input 
                      type={showPassword ? "text" : "password"}
                      value={passwordForm.confirmPassword}
                      onChange={(e) => setPasswordForm({ ...passwordForm, confirmPassword: e.target.value })}
                      placeholder="Confirm your password"
                      className="w-full px-4 py-3 rounded-xl border border-slate-200 text-sm font-semibold text-slate-800 focus:outline-none focus:border-teal-500 transition-colors"
                    />
                  </div>
                </div>

                <div className="flex justify-end pt-2">
                  <button 
                    type="submit"
                    disabled={updating || !passwordForm.newPassword}
                    className="px-6 py-3 bg-teal-600 text-white rounded-xl font-bold text-xs uppercase tracking-widest hover:bg-teal-700 transition-all shadow-md disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-2"
                  >
                    {updating ? 'Saving Changes...' : 'Save New Password'}
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* TAB 4: SAVED PAYMENTS GATEWAYS */}
          {activeTab === 'payments' && (
            <div className="bg-white border border-slate-100 p-8 rounded-2xl shadow-sm space-y-8 animate-fade-in">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <h2 className="text-2xl font-bold text-slate-900">Payment Methods</h2>
                  <p className="text-slate-500 text-sm font-medium mt-1">Configure mock Stripe payment methods to test checkout procedures.</p>
                </div>
                {!showAddCard && (
                  <button 
                    onClick={() => {
                      setShowAddCard(true);
                      setCardFocused('front');
                    }}
                    className="inline-flex items-center gap-1.5 px-4 py-2 bg-teal-50 text-teal-700 hover:bg-teal-100 rounded-xl font-bold text-xs uppercase tracking-wider transition-all"
                  >
                    <span className="material-symbols-outlined text-sm">add</span>
                    Add Card
                  </button>
                )}
              </div>

              {/* Add Card Form and Animated Mock Card */}
              {showAddCard ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8 pt-4 border-t border-slate-100 animate-fade-in">
                  
                  {/* Visual Flipping Credit Card */}
                  <div className="flex flex-col justify-center items-center py-6">
                    <div className="w-full max-w-sm h-48 [perspective:1000px] cursor-pointer" onClick={() => setCardFocused(cardFocused === 'front' ? 'back' : 'front')}>
                      <div 
                        className="relative w-full h-full rounded-2xl transition-all duration-700 shadow-2xl"
                        style={{ 
                          transform: cardFocused === 'back' ? 'rotateY(180deg)' : 'rotateY(0deg)',
                          transformStyle: 'preserve-3d'
                        }}
                      >
                        {/* FRONT FACE */}
                        <div 
                          className="absolute inset-0 w-full h-full rounded-2xl p-6 bg-gradient-to-tr from-slate-900 via-slate-800 to-teal-950 text-white flex flex-col justify-between z-10"
                          style={{ backfaceVisibility: 'hidden' }}
                        >
                          <div className="flex justify-between items-start">
                            <span className="material-symbols-outlined text-3xl text-teal-400">credit_card</span>
                            <span className="text-[10px] font-black uppercase tracking-widest text-teal-300">SANDBOX CARD</span>
                          </div>
                          
                          <div className="text-lg font-mono tracking-[0.2em] py-3 text-slate-200">
                            {cardForm.number ? cardForm.number.replace(/\D/g, '').padEnd(16, '•').replace(/(.{4})/g, '$1 ') : '•••• •••• •••• ••••'}
                          </div>

                          <div className="flex justify-between items-end">
                            <div>
                              <p className="text-[7px] font-bold text-slate-500 uppercase tracking-wider">Card Holder</p>
                              <p className="text-xs font-bold uppercase tracking-wide truncate max-w-[180px]">{cardForm.name || displayName}</p>
                            </div>
                            <div className="text-right">
                              <p className="text-[7px] font-bold text-slate-500 uppercase tracking-wider">Expires</p>
                              <p className="text-xs font-mono font-bold">{cardForm.expiry || 'MM/YY'}</p>
                            </div>
                          </div>
                        </div>

                        {/* BACK FACE */}
                        <div 
                          className="absolute inset-0 w-full h-full rounded-2xl bg-gradient-to-tr from-slate-900 via-slate-800 to-teal-950 text-white flex flex-col justify-between py-6"
                          style={{ 
                            transform: 'rotateY(180deg)', 
                            backfaceVisibility: 'hidden' 
                          }}
                        >
                          <div className="w-full h-10 bg-slate-950 mt-1"></div>
                          
                          <div className="px-6 flex items-center justify-between gap-4">
                            <div className="flex-1 h-8 bg-slate-700 rounded-sm flex items-center justify-end px-3">
                              <span className="text-xs italic font-semibold text-slate-400 font-mono">Signature Strip</span>
                            </div>
                            <div className="w-14 h-8 bg-amber-400 text-slate-900 flex items-center justify-center font-mono font-bold text-sm rounded">
                              {cardForm.cvv || 'CVV'}
                            </div>
                          </div>

                          <div className="px-6 flex justify-between items-center text-[8px] text-slate-500">
                            <span>MEMBER SERVICES: 1-800-SANDBOX</span>
                            <span>BACK FACE view</span>
                          </div>
                        </div>

                      </div>
                    </div>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mt-4">
                      Click the card above or CVV input to flip
                    </p>
                  </div>

                  {/* Card Form */}
                  <form onSubmit={handleAddCardSubmit} className="space-y-4">
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Cardholder Name</label>
                      <input 
                        type="text"
                        value={cardForm.name}
                        onChange={(e) => setCardForm({ ...cardForm, name: e.target.value })}
                        placeholder="e.g. ALEX RIVERS"
                        className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm font-semibold text-slate-800 focus:outline-none focus:border-teal-500"
                        onFocus={() => setCardFocused('front')}
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Card Number</label>
                      <input 
                        type="text"
                        maxLength={19}
                        value={cardForm.number}
                        onChange={(e) => {
                          const val = e.target.value.replace(/\D/g, '')
                          const match = val.match(/.{1,4}/g)
                          setCardForm({ ...cardForm, number: match ? match.join(' ') : val })
                        }}
                        placeholder="4242 4242 4242 4242"
                        className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm font-semibold text-slate-800 focus:outline-none focus:border-teal-500"
                        onFocus={() => setCardFocused('front')}
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Expiry (MM/YY)</label>
                        <input 
                          type="text"
                          maxLength={5}
                          value={cardForm.expiry}
                          onChange={(e) => {
                            let val = e.target.value.replace(/\D/g, '')
                            if (val.length > 2) val = `${val.slice(0, 2)}/${val.slice(2, 4)}`
                            setCardForm({ ...cardForm, expiry: val })
                          }}
                          placeholder="MM/YY"
                          className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm font-semibold text-slate-800 focus:outline-none focus:border-teal-500"
                          onFocus={() => setCardFocused('front')}
                        />
                      </div>
                      
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">CVV</label>
                        <input 
                          type="text"
                          maxLength={3}
                          value={cardForm.cvv}
                          onChange={(e) => setCardForm({ ...cardForm, cvv: e.target.value.replace(/\D/g, '') })}
                          placeholder="123"
                          className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm font-semibold text-slate-800 focus:outline-none focus:border-teal-500"
                          onFocus={() => setCardFocused('back')}
                          onBlur={() => setCardFocused('front')}
                        />
                      </div>
                    </div>

                    <div className="flex gap-3 pt-2">
                      <button 
                        type="button"
                        onClick={() => setShowAddCard(false)}
                        className="flex-1 py-2.5 rounded-xl border border-slate-200 font-bold text-[10px] uppercase tracking-widest text-slate-500 hover:bg-slate-50"
                      >
                        Cancel
                      </button>
                      <button 
                        type="submit"
                        className="flex-1 py-2.5 rounded-xl bg-teal-600 text-white font-bold text-[10px] uppercase tracking-widest hover:bg-teal-700 shadow-md"
                      >
                        Save Card
                      </button>
                    </div>
                  </form>

                </div>
              ) : (
                /* Card List Dashboard */
                <div className="space-y-6 animate-fade-in">
                  {cards.length === 0 ? (
                    <div className="text-center py-12 border border-dashed border-slate-200 rounded-2xl">
                      <span className="material-symbols-outlined text-4xl text-slate-300 mb-2">add_card</span>
                      <p className="text-slate-500 text-sm font-semibold">{"No saved payment methods. Click 'Add Card' above."}</p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      {cards.map((card) => (
                        <div 
                          key={card.id}
                          className="p-6 border border-slate-200 rounded-2xl flex flex-col justify-between h-44 hover:shadow-md transition-all relative overflow-hidden bg-gradient-to-br from-white to-slate-50/20"
                        >
                          <div className="flex justify-between items-start">
                            <div className="flex items-center gap-2">
                              <span className="material-symbols-outlined text-3xl text-slate-700">credit_card</span>
                              <div>
                                <h4 className="font-bold text-slate-800 text-sm capitalize">{card.brand} Token</h4>
                                <p className="text-[10px] text-slate-400 font-semibold tracking-wide">ENDING IN {card.number.slice(-4)}</p>
                              </div>
                            </div>
                            
                            {card.isDefault && (
                              <span className="px-2 py-0.5 bg-teal-50 text-teal-700 border border-teal-100 rounded-full text-[8px] font-black uppercase tracking-wider">
                                Primary
                              </span>
                            )}
                          </div>

                          <div className="text-sm font-mono tracking-widest font-bold text-slate-600">
                            •••• •••• •••• {card.number.slice(-4)}
                          </div>

                          <div className="flex justify-between items-center border-t border-slate-100 pt-3">
                            <div className="text-left text-[9px] text-slate-400 font-bold uppercase">
                              EXPIRES: {card.expiry}
                            </div>
                            
                            <div className="flex items-center gap-2">
                              {!card.isDefault && (
                                <button 
                                  onClick={() => handleSetDefaultCard(card.id)}
                                  className="text-[9px] font-black uppercase text-teal-600 tracking-wider hover:underline"
                                >
                                  Use Primary
                                </button>
                              )}
                              <button 
                                onClick={() => handleDeleteCard(card.id)}
                                className="text-[9px] font-black uppercase text-red-500 tracking-wider hover:underline"
                              >
                                Delete
                              </button>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              <p className="text-xs text-slate-400 font-semibold uppercase tracking-wider flex items-center gap-2 pt-4 border-t border-slate-100">
                <span className="material-symbols-outlined text-teal-500 text-sm">lock</span>
                Payments are securely processed and verified inside Sandbox Stripe.
              </p>
            </div>
          )}

        </section>
      </div>

      {/* COMPREHENSIVE HIGH FIDELITY DIGITAL PASS TICKET MODAL */}
      {showTicketModal && selectedBooking && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md flex items-center justify-center p-6 z-50 animate-fade-in">
          <div className="bg-white rounded-[32px] w-full max-w-[500px] border border-slate-100 overflow-hidden shadow-2xl relative animate-scale-up max-h-[90vh] overflow-y-auto">
            
            {/* Top Banner Show Art */}
            <div className="h-40 relative bg-slate-900 flex items-end">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img 
                src={selectedBooking.performances?.shows?.imageUrl || "https://images.unsplash.com/photo-1492684223066-81342ee5ff30?auto=format&fit=crop&q=80"} 
                alt="show art" 
                className="absolute inset-0 w-full h-full object-cover opacity-50"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-slate-900 to-transparent"></div>
              
              <button 
                onClick={() => setShowTicketModal(false)}
                className="absolute top-4 right-4 w-9 h-9 bg-slate-950/40 backdrop-blur-md rounded-full text-white flex items-center justify-center hover:bg-slate-950/60 transition-colors"
              >
                <span className="material-symbols-outlined text-lg">close</span>
              </button>

              <div className="p-6 relative z-10 space-y-1">
                <span className="px-2.5 py-0.5 bg-teal-500 text-[8px] font-black uppercase tracking-widest text-white rounded-full">
                  {selectedBooking.status === 'PAID' ? 'Confirmed' : selectedBooking.status}
                </span>
                <h3 className="text-2xl font-black text-white leading-tight">
                  {selectedBooking.performances?.shows?.title || 'Live Event'}
                </h3>
              </div>
            </div>

            {/* Ticket Information Details */}
            <div className="p-8 space-y-6 relative bg-white">
              <div className="grid grid-cols-2 gap-x-6 gap-y-4">
                <div>
                  <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Booking Code</p>
                  <p className="text-sm font-mono font-bold text-teal-600 tracking-wide">{selectedBooking.bookingNumber}</p>
                </div>
                <div>
                  <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Seats</p>
                  <p className="text-sm font-bold text-slate-800 truncate">
                    {selectedBooking.booking_items?.map((item: any) => `${item.seats?.row || ''}${item.seats?.number || ''}`).join(', ') || 'N/A'}
                  </p>
                </div>
                <div>
                  <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Date & Time</p>
                  <p className="text-xs font-bold text-slate-800">
                    {new Date(selectedBooking.performances?.dateTime).toLocaleDateString('id-ID', {
                      weekday: 'short', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'
                    })}
                  </p>
                </div>
                <div>
                  <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Venue Location</p>
                  <p className="text-xs font-bold text-slate-800">
                    {selectedBooking.performances?.shows?.venue?.name || 'Demo Theatre'}
                  </p>
                </div>
              </div>

              {/* QR Code section */}
              <div className="border-t border-dashed border-slate-200 pt-6 flex flex-col items-center space-y-3">
                <div className="p-3 bg-slate-50 border border-slate-100 rounded-2xl">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img 
                    src={`https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${selectedBooking.bookingNumber}`} 
                    alt="Booking QR Code"
                    className="w-28 h-28"
                  />
                </div>
                <p className="text-[10px] font-black text-slate-800 tracking-[0.2em] uppercase">
                  {selectedBooking.bookingNumber}
                </p>
                <p className="text-[10px] text-slate-400 font-semibold max-w-xs text-center leading-relaxed">
                  Present this QR code scanner at entry terminals before entering hall checkpoints.
                </p>
              </div>

              {/* Download / Print Control Action Buttons */}
              <div className="flex gap-4 pt-4 border-t border-slate-100">
                <button 
                  onClick={() => handleDownloadPass(selectedBooking)}
                  className="flex-1 py-3 border border-slate-200 rounded-xl font-bold text-[10px] uppercase tracking-widest text-slate-600 hover:bg-slate-50 transition-colors flex items-center justify-center gap-1.5"
                >
                  <span className="material-symbols-outlined text-[16px]">download</span>
                  Download Pass
                </button>
                <button 
                  onClick={() => handlePrintTicket(selectedBooking)}
                  className="flex-1 py-3 bg-teal-600 text-white rounded-xl font-bold text-[10px] uppercase tracking-widest hover:bg-teal-700 transition-colors flex items-center justify-center gap-1.5 shadow-md"
                >
                  <span className="material-symbols-outlined text-[16px]">print</span>
                  Print Ticket (PDF)
                </button>
              </div>
            </div>

          </div>
        </div>
      )}
    </main>
  )
}
