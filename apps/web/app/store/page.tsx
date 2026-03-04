'use client'

import { useState, useEffect } from 'react'
import { getStoreCards, getUserOwnedDefinitionIds, purchaseCards } from './actions'
import { useAuth } from '@/context/AuthContext'
import Image from 'next/image'

interface CardDefinition {
  id: string
  name: string
  type: string
  rarity: string
  cost?: number | null
  description: string
  imageUrl?: string | null
  effectJson?: unknown
}

const RARITY_STYLES: Record<string, { color: string; glow: string; badge: string }> = {
  LEGENDARY: { color: '#FFB830', glow: '0 0 18px 4px rgba(255,184,48,0.5)',   badge: '#92540a' },
  EPIC:      { color: '#C8724A', glow: '0 0 14px 3px rgba(200,114,74,0.5)',   badge: '#7a3a18' },
  RARE:      { color: '#6BAF72', glow: '0 0 12px 3px rgba(107,175,114,0.45)', badge: '#2d6b35' },
  COMMON:    { color: '#9E8870', glow: 'none',                                 badge: '#5a4030' },
}

const TYPE_COLOR: Record<string, string> = {
  CREATURE: '#c8856a',
  SPELL:    '#7aab82',
  CURSE:    '#b07850',
}

const FILTERS = ['All', 'LEGENDARY', 'EPIC', 'RARE', 'COMMON']

// Earthy background palette replacing purple/black
const BG = {
  page:    'linear-gradient(160deg, #0e0a06 0%, #1a1108 50%, #110d05 100%)',
  radial:  'radial-gradient(ellipse at 20% 20%, rgba(120,80,20,0.08) 0%, transparent 60%), radial-gradient(ellipse at 80% 80%, rgba(80,50,10,0.07) 0%, transparent 60%)',
  card:    'linear-gradient(160deg, #1e1508 0%, #160f04 100%)',
  header:  'rgba(14,10,4,0.93)',
  border:  'rgba(160,110,40,0.22)',
}

export default function CardStore() {
  const { user } = useAuth()

  const [cards, setCards] = useState<CardDefinition[]>([])
  const [ownedIds, setOwnedIds] = useState<string[]>([])
  const [loadingData, setLoadingData] = useState(true)
  const [gold] = useState(3200)
  const [cart, setCart] = useState<string[]>([])
  const [filter, setFilter] = useState('All')
  const [search, setSearch] = useState('')
  const [toast, setToast] = useState<{ msg: string; color: string } | null>(null)
  const [hoveredCard, setHoveredCard] = useState<string | null>(null)
  const [purchasing, setPurchasing] = useState(false)

  useEffect(() => {
    async function load() {
      const [defs, owned] = await Promise.all([
        getStoreCards(),
        user ? getUserOwnedDefinitionIds(user.uid) : Promise.resolve([]),
      ])
      setCards(defs)
      setOwnedIds(owned)
      setLoadingData(false)
    }
    load()
  }, [user])

  const showToast = (msg: string, color = '#90c870') => {
    setToast({ msg, color })
    setTimeout(() => setToast(null), 2200)
  }

  const filtered = cards.filter(c => {
    const matchFilter = filter === 'All' || c.rarity === filter
    const matchSearch =
      c.name.toLowerCase().includes(search.toLowerCase()) ||
      c.type.toLowerCase().includes(search.toLowerCase())
    return matchFilter && matchSearch
  })

  const inCart = (id: string) => cart.includes(id)
  const isOwned = (id: string) => ownedIds.includes(id)

  const toggleCart = (card: CardDefinition) => {
    if (isOwned(card.id)) return
    setCart(prev =>
      prev.includes(card.id) ? prev.filter(id => id !== card.id) : [...prev, card.id]
    )
  }

  const cartTotal = cart.reduce((sum, id) => {
    const card = cards.find(c => c.id === id)
    return sum + (card?.cost ?? 0)
  }, 0)

  const checkout = async () => {
    if (!user) return showToast('Sign in to purchase cards.', '#e07060')
    if (cart.length === 0) return showToast('Your cart is empty.', '#e07060')
    if (gold < cartTotal) return showToast('Not enough gold!', '#e07060')
    setPurchasing(true)
    try {
      await purchaseCards(user.uid, cart)
      setOwnedIds(prev => [...prev, ...cart])
      setCart([])
      showToast(`Purchased ${cart.length} card${cart.length > 1 ? 's' : ''}! 🎉`)
    } catch {
      showToast('Purchase failed. Try again.', '#e07060')
    } finally {
      setPurchasing(false)
    }
  }

  const rarityLabel = (r: string) => r.charAt(0) + r.slice(1).toLowerCase()

  return (
    <div style={{ minHeight: '100vh', background: BG.page, fontFamily: "'Segoe UI', sans-serif", color: '#e8d5b0', position: 'relative' }}>
      <div style={{ position: 'fixed', inset: 0, zIndex: 0, pointerEvents: 'none', background: BG.radial }} />

      {toast && (
        <div style={{ position: 'fixed', top: '1.5rem', left: '50%', transform: 'translateX(-50%)', background: 'rgba(20,13,4,0.97)', border: `1px solid ${toast.color}`, color: toast.color, padding: '0.75rem 2rem', borderRadius: '0.75rem', zIndex: 1000, boxShadow: `0 0 20px ${toast.color}55`, fontWeight: 600, fontSize: '1rem' }}>
          {toast.msg}
        </div>
      )}

      {/* Header */}
      <div style={{ position: 'sticky', top: 0, zIndex: 50, background: BG.header, backdropFilter: 'blur(12px)', borderBottom: '1px solid rgba(160,110,40,0.25)', padding: '1rem 2.5rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
            {[0,1,2].map(i => <span key={i} style={{ display: 'block', width: '22px', height: '2.5px', background: 'goldenrod', borderRadius: '2px' }} />)}
          </div>
          <span style={{ fontSize: '1.7rem', fontWeight: 800, letterSpacing: '0.12em', color: 'goldenrod', textShadow: '0 0 18px rgba(180,130,30,0.6)' }}>VESANIA</span>
          <span style={{ color: '#7a5c30', fontSize: '1rem', letterSpacing: '0.2em' }}>STORE</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', background: 'rgba(180,130,30,0.1)', border: '1px solid rgba(180,130,30,0.3)', padding: '0.4rem 1rem', borderRadius: '0.6rem' }}>
            <span>💰</span>
            <span style={{ color: 'goldenrod', fontWeight: 700 }}>{gold.toLocaleString()}</span>
          </div>
          <button
            onClick={checkout}
            disabled={purchasing}
            style={{ background: cart.length > 0 ? 'goldenrod' : 'rgba(180,130,30,0.12)', color: cart.length > 0 ? '#1a0e00' : 'goldenrod', border: '1px solid goldenrod', borderRadius: '0.6rem', padding: '0.45rem 1.2rem', cursor: 'pointer', fontWeight: 700, fontSize: '0.95rem', display: 'flex', alignItems: 'center', gap: '0.5rem', boxShadow: cart.length > 0 ? '0 0 14px rgba(180,130,30,0.4)' : 'none', opacity: purchasing ? 0.7 : 1 }}
          >
            🛒 {cart.length > 0 ? `Checkout — ${cartTotal.toLocaleString()}g` : 'Cart'}
            {cart.length > 0 && (
              <span style={{ background: '#1a0e00', color: 'goldenrod', borderRadius: '50%', width: '20px', height: '20px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.75rem', fontWeight: 800 }}>
                {cart.length}
              </span>
            )}
          </button>
        </div>
      </div>

      {/* Filters */}
      <div style={{ padding: '1.5rem 2.5rem 0.5rem', display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap', position: 'relative', zIndex: 10 }}>
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search cards..."
          style={{ background: 'rgba(180,130,30,0.06)', border: '1px solid rgba(160,110,40,0.25)', color: '#e8d5b0', padding: '0.5rem 1rem', borderRadius: '0.6rem', fontSize: '0.95rem', outline: 'none', width: '200px' }}
        />
        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
          {FILTERS.map(f => (
            <button key={f} onClick={() => setFilter(f)} style={{ padding: '0.4rem 1.1rem', borderRadius: '0.6rem', cursor: 'pointer', border: `1px solid ${filter === f ? 'goldenrod' : 'rgba(160,110,40,0.2)'}`, background: filter === f ? 'rgba(180,120,30,0.2)' : 'transparent', color: filter === f ? 'goldenrod' : '#7a5c30', fontWeight: filter === f ? 700 : 400, fontSize: '0.88rem' }}>
              {f === 'All' ? 'All' : rarityLabel(f)}
            </button>
          ))}
        </div>
        <span style={{ marginLeft: 'auto', color: '#5a4020', fontSize: '0.88rem' }}>
          {loadingData ? 'Loading...' : `${filtered.length} cards`}
        </span>
      </div>

      {/* Grid */}
      {loadingData ? (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '40vh', color: '#5a4020', fontSize: '1.1rem' }}>
          Loading cards...
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(210px, 1fr))', gap: '1.8rem', padding: '1.5rem 2.5rem 3rem', position: 'relative', zIndex: 10 }}>
          {filtered.map(card => {
            const rs = RARITY_STYLES[card.rarity] ?? RARITY_STYLES.COMMON
            const ownedCard = isOwned(card.id)
            const inC = inCart(card.id)
            const hovered = hoveredCard === card.id

            return (
              <div
                key={card.id}
                onMouseEnter={() => setHoveredCard(card.id)}
                onMouseLeave={() => setHoveredCard(null)}
                style={{ background: BG.card, border: `1px solid ${ownedCard ? 'rgba(100,160,80,0.4)' : inC ? rs.color : BG.border}`, borderRadius: '1rem', overflow: 'hidden', position: 'relative', boxShadow: hovered ? rs.glow : ownedCard ? '0 0 12px rgba(100,160,80,0.2)' : 'none', transform: hovered ? 'translateY(-6px) scale(1.02)' : 'none', transition: 'all 0.25s ease', display: 'flex', flexDirection: 'column' }}
              >
                <div style={{ height: '3px', background: `linear-gradient(90deg, transparent, ${rs.color}, transparent)` }} />

                {/* Card image */}
                <div style={{ height: '160px', position: 'relative', background: `radial-gradient(ellipse at center, ${rs.color}22 0%, transparent 70%)` }}>
                  {card.imageUrl ? (
                    <Image src={card.imageUrl} alt={card.name} fill style={{ objectFit: 'cover' }} />
                  ) : (
                    <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '3.5rem', opacity: 0.3 }}>🃏</div>
                  )}
                  {ownedCard && (
                    <div style={{ position: 'absolute', top: '0.5rem', right: '0.5rem', background: 'rgba(100,160,80,0.2)', border: '1px solid #90c870', color: '#90c870', fontSize: '0.65rem', fontWeight: 700, padding: '0.15rem 0.45rem', borderRadius: '0.3rem', zIndex: 2 }}>OWNED</div>
                  )}
                  {inC && !ownedCard && (
                    <div style={{ position: 'absolute', top: '0.5rem', right: '0.5rem', background: 'rgba(180,130,30,0.2)', border: '1px solid goldenrod', color: 'goldenrod', fontSize: '0.65rem', fontWeight: 700, padding: '0.15rem 0.45rem', borderRadius: '0.3rem', zIndex: 2 }}>IN CART</div>
                  )}
                </div>

                <div style={{ padding: '0.9rem 1rem', display: 'flex', flexDirection: 'column', gap: '0.4rem', flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <span style={{ fontWeight: 700, fontSize: '1rem', color: '#e8d5b0' }}>{card.name}</span>
                    <span style={{ background: rs.badge, color: '#f0e0c0', fontSize: '0.6rem', fontWeight: 700, padding: '0.15rem 0.4rem', borderRadius: '0.3rem', letterSpacing: '0.08em', textTransform: 'uppercase' }}>
                      {rarityLabel(card.rarity)}
                    </span>
                  </div>
                  <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                    <span style={{ color: TYPE_COLOR[card.type] ?? '#8a6f45', fontSize: '0.75rem', background: 'rgba(180,130,30,0.08)', padding: '0.1rem 0.45rem', borderRadius: '0.3rem', fontWeight: 600 }}>
                      {card.type.charAt(0) + card.type.slice(1).toLowerCase()}
                    </span>
                  </div>
                  <p style={{ fontSize: '0.78rem', color: '#8a6f45', lineHeight: 1.45, margin: '0.2rem 0 0.5rem' }}>{card.description}</p>
                  <button
                    onClick={() => toggleCart(card)}
                    disabled={ownedCard}
                    style={{ marginTop: 'auto', padding: '0.5rem', background: ownedCard ? 'rgba(100,160,80,0.08)' : inC ? 'rgba(180,130,30,0.22)' : 'rgba(180,130,30,0.1)', border: `1px solid ${ownedCard ? '#90c87066' : 'goldenrod'}`, color: ownedCard ? '#90c870' : 'goldenrod', borderRadius: '0.6rem', cursor: ownedCard ? 'default' : 'pointer', fontWeight: 700, fontSize: '0.88rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.4rem' }}
                  >
                    {ownedCard ? '✓ Owned' : inC ? '✕ Remove' : card.cost ? `🪙 ${card.cost.toLocaleString()}g` : '🪙 Free'}
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      )}

      <style>{`input::placeholder { color: #5a4020; }`}</style>
    </div>
  )
}