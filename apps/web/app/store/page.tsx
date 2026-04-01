'use client'

import { useState, useEffect } from 'react'
import { getUserOwnedDefinitionIds, purchaseCards } from './actions'
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

interface CardDeck {
  id: string
  name: string
  description: string
  cardCount: number
  cost: number
  previewCards: string[]
  theme: string
  icon: string
  accentColor: string
  glowColor: string
  tag?: string
}

const RARE_STYLES = {
  color: '#6BAF72',
  glow: '0 0 18px 5px rgba(107,175,114,0.45)',
  badge: '#2d6b35',
}

const TYPE_COLOR: Record<string, string> = {
  CREATURE: '#c8856a',
  SPELL:    '#7aab82',
  CURSE:    '#b07850',
}

const BG = {
  page:   'linear-gradient(160deg, #0e0a06 0%, #1a1108 50%, #110d05 100%)',
  radial: 'radial-gradient(ellipse at 20% 20%, rgba(120,80,20,0.08) 0%, transparent 60%), radial-gradient(ellipse at 80% 80%, rgba(80,50,10,0.07) 0%, transparent 60%)',
  header: 'rgba(14,10,4,0.93)',
}

const RARE_SLOT_CARDS: CardDefinition[] = [
  {
    id: 'rare_slot_1',
    name: 'Sable Wraith',
    type: 'CREATURE',
    rarity: 'RARE',
    cost: 1200,
    description: 'When Sable Wraith enters play, deal 2 damage to all enemies. Its hollow eyes see through all deceptions.',
    imageUrl: null,
  },
  {
    id: 'rare_slot_2',
    name: 'Hex of Undoing',
    type: 'CURSE',
    rarity: 'RARE',
    cost: 950,
    description: 'Reverse the last spell cast by your opponent. The threads of fate are yours to unravel.',
    imageUrl: null,
  },
]

const STORE_DECKS: CardDeck[] = [
  {
    id: 'deck_ashen_tide',
    name: 'Ashen Tide',
    description: 'Scorch the earth and leave nothing behind. A relentless aggro deck powered by fire creatures and chain-burn spells that end games before turn 6.',
    cardCount: 20,
    cost: 4200,
    previewCards: ['Ember Wraith', 'Char Surge', 'Cinder Golem', 'Ashfall'],
    theme: 'Fire · Aggro',
    icon: '🔥',
    accentColor: '#d4522a',
    glowColor: 'rgba(212,82,42,0.35)',
    tag: 'BEST SELLER',
  },
  {
    id: 'deck_hollow_pact',
    name: 'Hollow Pact',
    description: 'Strike dark bargains with ancient entities. Sacrifice your own creatures to summon horrors that grow stronger with every soul consumed.',
    cardCount: 20,
    cost: 5100,
    previewCards: ['Soul Tithe', 'Pale Eidolon', 'Blood Covenant', 'Void Maw'],
    theme: 'Sacrifice · Control',
    icon: '💀',
    accentColor: '#9060c0',
    glowColor: 'rgba(144,96,192,0.35)',
    tag: 'NEW',
  },
  {
    id: 'deck_verdant_surge',
    name: 'Verdant Surge',
    description: 'Flood the board with forest creatures that multiply faster than your opponent can answer. Win through overwhelming numbers and unstoppable momentum.',
    cardCount: 20,
    cost: 3800,
    previewCards: ['Thornback', 'Grove Tender', 'Spore Burst', 'Canopy Stalker'],
    theme: 'Nature · Swarm',
    icon: '🌿',
    accentColor: '#4a9f5a',
    glowColor: 'rgba(74,159,90,0.35)',
  },
]

export default function CardStore() {
  const { user } = useAuth()

  const [ownedIds, setOwnedIds] = useState<string[]>([])
  const [ownedDeckIds, setOwnedDeckIds] = useState<string[]>([])
  const [gold] = useState(3200)
  const [cart, setCart] = useState<string[]>([])
  const [toast, setToast] = useState<{ msg: string; color: string } | null>(null)
  const [hoveredCard, setHoveredCard] = useState<string | null>(null)
  const [hoveredDeck, setHoveredDeck] = useState<string | null>(null)
  const [purchasing, setPurchasing] = useState<string | null>(null)

  useEffect(() => {
    async function load() {
      const owned = user ? await getUserOwnedDefinitionIds(user.uid) : []
      setOwnedIds(owned)
    }
    load()
  }, [user])

  const showToast = (msg: string, color = '#90c870') => {
    setToast({ msg, color })
    setTimeout(() => setToast(null), 2400)
  }

  const isOwned = (id: string) => ownedIds.includes(id)
  const isDeckOwned = (id: string) => ownedDeckIds.includes(id)
  const inCart = (id: string) => cart.includes(id)

  const toggleCart = (card: CardDefinition) => {
    if (isOwned(card.id)) return
    setCart(prev =>
      prev.includes(card.id) ? prev.filter(id => id !== card.id) : [...prev, card.id]
    )
  }

  const cartTotal = cart.reduce((sum, id) => {
    const card = RARE_SLOT_CARDS.find(c => c.id === id)
    return sum + (card?.cost ?? 0)
  }, 0)

  const checkout = async () => {
    if (!user) return showToast('Sign in to purchase cards.', '#e07060')
    if (cart.length === 0) return showToast('Your cart is empty.', '#e07060')
    if (gold < cartTotal) return showToast('Not enough gold!', '#e07060')
    setPurchasing('cart')
    try {
      await purchaseCards(user.uid, cart)
      setOwnedIds(prev => [...prev, ...cart])
      setCart([])
      showToast(`Purchased ${cart.length} card${cart.length > 1 ? 's' : ''}! 🎉`)
    } catch {
      showToast('Purchase failed. Try again.', '#e07060')
    } finally {
      setPurchasing(null)
    }
  }

  const buyDeck = async (deck: CardDeck) => {
    if (!user) return showToast('Sign in to purchase decks.', '#e07060')
    if (isDeckOwned(deck.id)) return
    if (gold < deck.cost) return showToast('Not enough gold!', '#e07060')
    setPurchasing(deck.id)
    try {
      // Replace with your real deck purchase server action
      await new Promise(r => setTimeout(r, 900))
      setOwnedDeckIds(prev => [...prev, deck.id])
      showToast(`"${deck.name}" unlocked! 🎴`)
    } catch {
      showToast('Purchase failed. Try again.', '#e07060')
    } finally {
      setPurchasing(null)
    }
  }

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
            disabled={purchasing === 'cart'}
            style={{ background: cart.length > 0 ? 'goldenrod' : 'rgba(180,130,30,0.12)', color: cart.length > 0 ? '#1a0e00' : 'goldenrod', border: '1px solid goldenrod', borderRadius: '0.6rem', padding: '0.45rem 1.2rem', cursor: 'pointer', fontWeight: 700, fontSize: '0.95rem', display: 'flex', alignItems: 'center', gap: '0.5rem', boxShadow: cart.length > 0 ? '0 0 14px rgba(180,130,30,0.4)' : 'none', opacity: purchasing === 'cart' ? 0.7 : 1 }}
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

      <div style={{ padding: '3rem 2.5rem 4rem', position: 'relative', zIndex: 10, maxWidth: '1000px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '3.5rem' }}>

        {/* ── Rare Slots ── */}
        <section>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.5rem' }}>
            <div style={{ height: '1px', flex: 1, background: 'linear-gradient(90deg, transparent, rgba(107,175,114,0.4))' }} />
            <span style={{ color: '#6BAF72', fontWeight: 700, fontSize: '0.78rem', letterSpacing: '0.2em', textTransform: 'uppercase' }}>✦ Rare Slots — Limited Availability ✦</span>
            <div style={{ height: '1px', flex: 1, background: 'linear-gradient(90deg, rgba(107,175,114,0.4), transparent)' }} />
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: '1.4rem' }}>
            {RARE_SLOT_CARDS.map((card, idx) => {
              const owned = isOwned(card.id)
              const inC = inCart(card.id)
              const hovered = hoveredCard === card.id
              return (
                <div
                  key={card.id}
                  onMouseEnter={() => setHoveredCard(card.id)}
                  onMouseLeave={() => setHoveredCard(null)}
                  style={{ background: 'linear-gradient(135deg, #0d1a0e 0%, #111a0d 50%, #0a1208 100%)', border: `1px solid ${owned ? 'rgba(107,175,114,0.7)' : inC ? RARE_STYLES.color : 'rgba(107,175,114,0.3)'}`, borderRadius: '1.1rem', overflow: 'hidden', position: 'relative', boxShadow: hovered ? `${RARE_STYLES.glow}, 0 10px 40px rgba(0,0,0,0.5)` : owned ? '0 0 16px rgba(107,175,114,0.2)' : '0 4px 20px rgba(0,0,0,0.4)', transform: hovered ? 'translateY(-5px)' : 'none', transition: 'all 0.25s ease', display: 'flex', flexDirection: 'row', minHeight: '155px' }}
                >
                  <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '2px', background: `linear-gradient(90deg, transparent, ${RARE_STYLES.color}, transparent)` }} />
                  <div style={{ position: 'absolute', top: '0.65rem', left: '0.65rem', background: 'rgba(107,175,114,0.12)', border: '1px solid rgba(107,175,114,0.35)', color: '#6BAF72', fontSize: '0.58rem', fontWeight: 800, padding: '0.15rem 0.45rem', borderRadius: '0.3rem', letterSpacing: '0.12em', zIndex: 2 }}>
                    SLOT {idx + 1} / 2
                  </div>
                  <div style={{ width: '130px', flexShrink: 0, position: 'relative', background: `radial-gradient(ellipse at center, ${RARE_STYLES.color}18 0%, transparent 70%)`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '3.8rem' }}>
                    {card.imageUrl ? <Image src={card.imageUrl} alt={card.name} fill style={{ objectFit: 'cover' }} /> : <span style={{ opacity: 0.2 }}>🃏</span>}
                  </div>
                  <div style={{ padding: '1.4rem 1rem 1rem', display: 'flex', flexDirection: 'column', gap: '0.35rem', flex: 1, justifyContent: 'space-between' }}>
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.3rem' }}>
                        <span style={{ fontWeight: 700, fontSize: '1.05rem', color: '#d0ecc0' }}>{card.name}</span>
                        <span style={{ background: RARE_STYLES.badge, color: '#c0e8c0', fontSize: '0.6rem', fontWeight: 700, padding: '0.15rem 0.4rem', borderRadius: '0.3rem', letterSpacing: '0.08em' }}>RARE</span>
                      </div>
                      <span style={{ color: TYPE_COLOR[card.type] ?? '#8a6f45', fontSize: '0.7rem', background: 'rgba(107,175,114,0.08)', padding: '0.1rem 0.45rem', borderRadius: '0.3rem', fontWeight: 600 }}>
                        {card.type.charAt(0) + card.type.slice(1).toLowerCase()}
                      </span>
                      <p style={{ fontSize: '0.76rem', color: '#6a8f60', lineHeight: 1.5, marginTop: '0.45rem' }}>{card.description}</p>
                    </div>
                    <button
                      onClick={() => toggleCart(card)}
                      disabled={owned}
                      style={{ padding: '0.45rem 1rem', background: owned ? 'rgba(107,175,114,0.08)' : inC ? 'rgba(107,175,114,0.22)' : 'rgba(107,175,114,0.1)', border: `1px solid ${owned ? '#6BAF7255' : '#6BAF72'}`, color: owned ? '#6BAF72' : '#90c870', borderRadius: '0.5rem', cursor: owned ? 'default' : 'pointer', fontWeight: 700, fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '0.4rem', alignSelf: 'flex-start', transition: 'all 0.2s' }}
                    >
                      {owned ? '✓ Owned' : inC ? '✕ Remove' : `🪙 ${(card.cost ?? 0).toLocaleString()}g`}
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        </section>

        {/* ── Decks ── */}
        <section>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.5rem' }}>
            <div style={{ height: '1px', flex: 1, background: 'linear-gradient(90deg, transparent, rgba(160,110,40,0.4))' }} />
            <span style={{ color: '#b08040', fontWeight: 700, fontSize: '0.78rem', letterSpacing: '0.2em', textTransform: 'uppercase' }}>✦ Pre-Built Decks ✦</span>
            <div style={{ height: '1px', flex: 1, background: 'linear-gradient(90deg, rgba(160,110,40,0.4), transparent)' }} />
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '1.4rem' }}>
            {STORE_DECKS.map(deck => {
              const owned = isDeckOwned(deck.id)
              const hovered = hoveredDeck === deck.id
              const loading = purchasing === deck.id
              return (
                <div
                  key={deck.id}
                  onMouseEnter={() => setHoveredDeck(deck.id)}
                  onMouseLeave={() => setHoveredDeck(null)}
                  style={{ background: `linear-gradient(150deg, ${deck.accentColor}0d 0%, #130e04 55%)`, border: `1px solid ${owned ? `${deck.accentColor}77` : hovered ? `${deck.accentColor}55` : `${deck.accentColor}28`}`, borderRadius: '1.1rem', overflow: 'hidden', position: 'relative', boxShadow: hovered && !owned ? `0 0 28px ${deck.glowColor}, 0 8px 32px rgba(0,0,0,0.45)` : owned ? `0 0 16px ${deck.glowColor}` : '0 4px 18px rgba(0,0,0,0.35)', transform: hovered ? 'translateY(-5px)' : 'none', transition: 'all 0.25s ease', display: 'flex', flexDirection: 'column' }}
                >
                  {/* Top accent */}
                  <div style={{ height: '3px', background: `linear-gradient(90deg, transparent, ${deck.accentColor}, transparent)` }} />

                  {deck.tag && (
                    <div style={{ position: 'absolute', top: '0.8rem', right: '0.8rem', background: `${deck.accentColor}20`, border: `1px solid ${deck.accentColor}88`, color: deck.accentColor, fontSize: '0.58rem', fontWeight: 800, padding: '0.18rem 0.5rem', borderRadius: '0.3rem', letterSpacing: '0.1em' }}>
                      {deck.tag}
                    </div>
                  )}

                  <div style={{ padding: '1.2rem 1.2rem 1.1rem', display: 'flex', flexDirection: 'column', gap: '0', flex: 1 }}>
                    {/* Icon + name */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.8rem', marginBottom: '0.6rem' }}>
                      <span style={{ fontSize: '2rem', lineHeight: 1, filter: `drop-shadow(0 0 8px ${deck.accentColor}70)` }}>{deck.icon}</span>
                      <div>
                        <div style={{ fontWeight: 800, fontSize: '1.1rem', color: '#e8d5b0', letterSpacing: '0.03em' }}>{deck.name}</div>
                        <div style={{ color: deck.accentColor, fontSize: '0.68rem', fontWeight: 600, letterSpacing: '0.1em', textTransform: 'uppercase', opacity: 0.9, marginTop: '0.1rem' }}>{deck.theme}</div>
                      </div>
                    </div>

                    <p style={{ fontSize: '0.78rem', color: '#7a6040', lineHeight: 1.55, marginBottom: '0.9rem' }}>{deck.description}</p>

                    {/* Card preview */}
                    <div style={{ background: 'rgba(0,0,0,0.25)', border: `1px solid ${deck.accentColor}1a`, borderRadius: '0.6rem', padding: '0.55rem 0.75rem', marginBottom: '1rem' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.35rem' }}>
                        <span style={{ color: '#4a3818', fontSize: '0.68rem', letterSpacing: '0.06em', textTransform: 'uppercase' }}>Includes</span>
                        <span style={{ color: deck.accentColor, fontSize: '0.68rem', fontWeight: 700 }}>{deck.cardCount} cards</span>
                      </div>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.28rem' }}>
                        {deck.previewCards.map(name => (
                          <span key={name} style={{ background: `${deck.accentColor}10`, border: `1px solid ${deck.accentColor}22`, color: '#a08050', fontSize: '0.66rem', padding: '0.1rem 0.42rem', borderRadius: '0.25rem' }}>{name}</span>
                        ))}
                        <span style={{ color: '#3a2810', fontSize: '0.66rem', padding: '0.1rem 0.2rem' }}>& more…</span>
                      </div>
                    </div>

                    {/* Buy button */}
                    <button
                      onClick={() => buyDeck(deck)}
                      disabled={owned || !!loading}
                      style={{ marginTop: 'auto', width: '100%', padding: '0.65rem', background: owned ? `${deck.accentColor}10` : hovered ? `${deck.accentColor}25` : `${deck.accentColor}18`, border: `1px solid ${owned ? `${deck.accentColor}44` : deck.accentColor}`, color: owned ? deck.accentColor : '#e8d5b0', borderRadius: '0.65rem', cursor: owned || loading ? 'default' : 'pointer', fontWeight: 700, fontSize: '0.9rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', transition: 'all 0.2s', opacity: loading ? 0.6 : 1, boxShadow: hovered && !owned ? `0 0 14px ${deck.glowColor}` : 'none' }}
                    >
                      {loading
                        ? '⏳ Purchasing…'
                        : owned
                        ? '✓ Deck Owned'
                        : `🪙 ${deck.cost.toLocaleString()}g — Buy Deck`}
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        </section>

      </div>
    </div>
  )
}