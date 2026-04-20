'use client'

import { useState, useEffect, useCallback } from 'react'
import Image from 'next/image'
import { getUserOwnedDefinitionIds, getUserGold, purchaseCards, purchaseDeck } from './actions'
import { useAuth } from '@/context/AuthContext'

// ─── Types (your existing schema, unchanged) ──────────────────────────────────

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
  origCost?: number
  previewCards: string[]
  theme: string
  icon: string
  winRate: number
  tag?: string
  tagBg?: string
  tagTx?: string
  styles: ItemStyles
}

interface ItemStyles {
  accent: string
  border: string
  headerBg: string
  headerTx: string
  artBg: string
  rarityBg: string
}

type TabId = 'singles' | 'decks'

// ─── Shopkeeper dialogue ──────────────────────────────────────────────────────
// Rarity is intentionally never mentioned.

const LINES = {
  idle:       'Welcome. Browse my wares and take what you need.',
  selectCard: (name: string, cost: number) =>
    `${name} — ${cost.toLocaleString()} gold. A fine addition to any collection.`,
  selectDeck: (name: string, cost: number) =>
    `The ${name} deck. ${cost.toLocaleString()} gold for the whole set. Ready to play.`,
  addedToCart: (n: number) =>
    n === 1
      ? 'Good eye. Anything else catch your fancy?'
      : `${n} items in your sack. Keep browsing or settle up.`,
  removed:   "Changed your mind? Fair enough. No hard feelings.",
  purchased: "Pleasure doing business. Come back when your pockets are full again.",
  poor:      "Hmm. Doesn't look like you have enough gold for that.",
  owned:     "You already have that one. No sense buying twice.",
  empty:     "Nothing in your cart yet. Pick something out.",
}

// ─── Keyframes ────────────────────────────────────────────────────────────────

const KEYFRAMES = `
  @import url('https://fonts.googleapis.com/css2?family=Press+Start+2P&display=swap');
  @keyframes rpgBlink { 0%,100%{opacity:1} 50%{opacity:0} }
  @keyframes rpgSlotBob { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-3px)} }
`

// ─── Main Component ───────────────────────────────────────────────────────────

interface CardStoreProps {
  /** Your fetched CardDefinition[] from the DB */
  cards: CardDefinition[]
  /** Your fetched CardDeck[] from the DB */
  decks: CardDeck[]
}

export default function CardStore({ cards, decks }: CardStoreProps) {
  const { user } = useAuth()

  const [ownedCardIds, setOwnedCardIds] = useState<string[]>([])
  const [ownedDeckIds, setOwnedDeckIds] = useState<string[]>([])
  const [gold, setGold]                 = useState(0)
  const [cart, setCart]                 = useState<string[]>([])
  const [selectedId, setSelectedId]     = useState<string | null>(null)
  const [tab, setTab]                   = useState<TabId>('singles')
  const [dialogue, setDialogue]         = useState(LINES.idle)
  const [purchasing, setPurchasing]     = useState(false)

  useEffect(() => {
    const id = 'rpg-shop-kf'
    if (!document.getElementById(id)) {
      const s = document.createElement('style')
      s.id = id; s.textContent = KEYFRAMES
      document.head.appendChild(s)
    }
  }, [])

  useEffect(() => {
    async function load() {
      if (!user) return
      const [owned, userGold] = await Promise.all([
        getUserOwnedDefinitionIds(user.uid),
        getUserGold(user.uid),
      ])
      setOwnedCardIds(owned)
      setGold(userGold)
    }
    load()
  }, [user])

  const isCardOwned = (id: string) => ownedCardIds.includes(id)
  const isDeckOwned = (id: string) => ownedDeckIds.includes(id)
  const isOwned     = (id: string) => isCardOwned(id) || isDeckOwned(id)
  const inCart      = (id: string) => cart.includes(id)

  const cartTotal = cart.reduce((sum, id) => {
    const card = (cards ?? []).find(c => c.id === id)
    if (card) return sum + (card.cost ?? 0)
    const deck = (decks ?? []).find(d => d.id === id)
    if (deck) return sum + deck.cost
    return sum
  }, 0)

  const selectItem = useCallback((id: string) => {
    setSelectedId(id)
    const card = cards.find(c => c.id === id)
    const deck = decks.find(d => d.id === id)
    if (isOwned(id)) { setDialogue(LINES.owned); return }
    if (card) setDialogue(LINES.selectCard(card.name, card.cost ?? 0))
    else if (deck) setDialogue(LINES.selectDeck(deck.name, deck.cost))
  }, [cards, decks, ownedCardIds, ownedDeckIds])

  const addToCart = () => {
    if (!selectedId) return
    if (isOwned(selectedId)) { setDialogue(LINES.owned); return }
    if (inCart(selectedId)) return
    const card = cards.find(c => c.id === selectedId)
    const deck = decks.find(d => d.id === selectedId)
    const cost = card?.cost ?? deck?.cost ?? 0
    if (gold < cost) { setDialogue(LINES.poor); return }
    const next = [...cart, selectedId]
    setCart(next)
    setDialogue(LINES.addedToCart(next.length))
  }

  const removeFromCart = () => {
    if (!selectedId) return
    setCart(prev => prev.filter(x => x !== selectedId))
    setDialogue(LINES.removed)
  }

  const buyCart = async () => {
    if (!user) { setDialogue('Sign in to make purchases.'); return }
    if (cart.length === 0) { setDialogue(LINES.empty); return }
    if (gold < cartTotal) { setDialogue(LINES.poor); return }
    setPurchasing(true)
    try {
      const cardIds = cart.filter(id => cards.some(c => c.id === id))
      const deckIds = cart.filter(id => decks.some(d => d.id === id))
      if (cardIds.length > 0) {
        const cardCost = cardIds.reduce((s, id) => s + (cards.find(c => c.id === id)?.cost ?? 0), 0)
        await purchaseCards(user.uid, cardIds, cardCost)
        setOwnedCardIds(prev => [...prev, ...cardIds])
      }
      for (const id of deckIds) {
        const deck = decks.find(d => d.id === id)!
        await purchaseDeck(user.uid, deck.cost)
        setOwnedDeckIds(prev => [...prev, id])
      }
      setGold(prev => prev - cartTotal)
      setCart([])
      setSelectedId(null)
      setDialogue(LINES.purchased)
    } catch {
      setDialogue('Something went wrong. Try again.')
    } finally {
      setPurchasing(false)
    }
  }

  const canAdd    = !!selectedId && !isOwned(selectedId) && !inCart(selectedId)
  const canRemove = !!selectedId && inCart(selectedId)
  const canBuy    = cart.length > 0 && gold >= cartTotal && !purchasing

  const activeItems: Array<CardDefinition | CardDeck> =
    tab === 'singles' ? (cards ?? []) : (decks ?? [])

  return (
    <div style={{
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      padding: '2rem 1rem',
      fontFamily: "'Press Start 2P', monospace",
    }}>
      <div style={{
        width: '100%',
        maxWidth: '600px',
        background: '#0a0a0f',
        border: '3px solid #4a4a6a',
        borderRadius: '4px',
        boxShadow: '0 0 0 1px #1a1a2e, 0 12px 48px rgba(0,0,0,0.8), inset 0 1px 0 rgba(255,255,255,0.03)',
        overflow: 'hidden',
      }}>

        {/* Scene */}
        <ShopScene
          gold={gold}
          activeItems={activeItems}
          cards={cards}
          decks={decks}
          selectedId={selectedId}
          isOwned={isOwned}
          inCart={inCart}
          onSelect={selectItem}
          tab={tab}
          onTabChange={setTab}
        />

        {/* Dialogue */}
        <DialogueBox text={dialogue} />

        {/* Actions */}
        <ActionBar
          canAdd={canAdd}
          canRemove={canRemove}
          canBuy={canBuy}
          cartCount={cart.length}
          cartTotal={cartTotal}
          purchasing={purchasing}
          onAdd={addToCart}
          onRemove={removeFromCart}
          onBuy={buyCart}
        />

      </div>
    </div>
  )
}

// ─── Shop Scene ───────────────────────────────────────────────────────────────

interface ShopSceneProps {
  gold: number
  activeItems: Array<CardDefinition | CardDeck>
  cards: CardDefinition[]
  decks: CardDeck[]
  selectedId: string | null
  isOwned: (id: string) => boolean
  inCart: (id: string) => boolean
  onSelect: (id: string) => void
  tab: TabId
  onTabChange: (t: TabId) => void
}

function ShopScene({
  gold, activeItems, cards, decks, selectedId, isOwned, inCart, onSelect, tab, onTabChange,
}: ShopSceneProps) {
  return (
    <div style={{ position: 'relative', background: '#1a1008', overflow: 'hidden' }}>

      {/* Background */}
      <div style={{ height: 200, background: '#1e1208', position: 'relative', overflow: 'hidden' }}>
        {/* Back wall */}
        <div style={{ position: 'absolute', inset: 0, background: '#2a1a0c' }} />
        {/* Shelf planks */}
        {[30, 80, 130].map((top, i) => (
          <div key={i} style={{
            position: 'absolute', left: 0, right: 0, top, height: 7,
            background: '#4a2808', borderTop: '2px solid #6a3810', borderBottom: '2px solid #1e0c04',
          }} />
        ))}
        {/* Decorative wall items */}
        <WallDecorations />
        {/* Floor strip */}
        <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: 36, background: '#3a2008', borderTop: '3px solid #5a3010' }} />
        {/* Counter */}
        <div style={{ position: 'absolute', bottom: 0, left: '18%', right: '18%', height: 24, background: '#6a3808', borderTop: '4px solid #b06020' }} />
        {/* Keeper */}
        <Shopkeeper />
      </div>

      {/* HUD overlay */}
      <div style={{
        position: 'absolute', top: 8, left: 10, right: 10,
        display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start',
        zIndex: 10, pointerEvents: 'none',
      }}>
        {/* Tabs */}
        <div style={{ display: 'flex', gap: 3, pointerEvents: 'all' }}>
          {(['singles', 'decks'] as TabId[]).map(t => (
            <button key={t} onClick={() => onTabChange(t)} style={{
              fontFamily: "'Press Start 2P', monospace",
              fontSize: 6, padding: '4px 8px',
              background: tab === t ? '#1e1a50' : '#0c0c18',
              border: `2px solid ${tab === t ? '#7070e0' : '#2a2a4a'}`,
              color: tab === t ? '#b0b0ff' : '#4a4a6a',
              cursor: 'pointer', letterSpacing: 0.5,
            }}>{t === 'singles' ? 'CARDS' : 'DECKS'}</button>
          ))}
        </div>
        {/* Gold */}
        <div style={{
          background: '#0a0a16', border: '2px solid #5050a0',
          padding: '4px 10px', pointerEvents: 'none',
        }}>
          <div style={{ fontSize: 5, color: '#7070a0', letterSpacing: 1, marginBottom: 2 }}>GOLD</div>
          <div style={{ fontSize: 10, color: '#d0d0ff', textAlign: 'right' }}>{gold.toLocaleString()}</div>
        </div>
      </div>

      {/* Item rail */}
      <ItemRail
        items={activeItems}
        cards={cards}
        selectedId={selectedId}
        isOwned={isOwned}
        inCart={inCart}
        onSelect={onSelect}
      />
    </div>
  )
}

// ─── Wall Decorations ─────────────────────────────────────────────────────────

function WallDecorations() {
  return (
    <>
      {/* Left side weapons */}
      <div style={{ position:'absolute', left:'6%',  top:38, width:5, height:46, background:'#a0a0a0', transform:'rotate(14deg)' }} />
      <div style={{ position:'absolute', left:'11%', top:34, width:5, height:38, background:'#7a4010', transform:'rotate(-10deg)' }} />
      <div style={{ position:'absolute', left:'17%', top:40, width:12,height:32, background:'#3858b0',
        clipPath:'polygon(0 0,100% 0,100% 60%,50% 100%,0 60%)', transform:'rotate(4deg)' }} />
      {/* Right side */}
      <div style={{ position:'absolute', right:'6%',  top:38, width:5, height:46, background:'#a0a0a0', transform:'rotate(-14deg)' }} />
      <div style={{ position:'absolute', right:'11%', top:34, width:5, height:38, background:'#7a4010', transform:'rotate(10deg)' }} />
      <div style={{ position:'absolute', right:'17%', top:40, width:12,height:32, background:'#3858b0',
        clipPath:'polygon(0 0,100% 0,100% 60%,50% 100%,0 60%)', transform:'rotate(-4deg)' }} />
      {/* Center shelf items */}
      <div style={{ position:'absolute', left:'45%', top:90, width:4, height:38, background:'#c09020', transform:'rotate(6deg)' }} />
      <div style={{ position:'absolute', left:'52%', top:88, width:16,height:22, background:'#802010', border:'2px solid #501008' }} />
    </>
  )
}

// ─── Shopkeeper ───────────────────────────────────────────────────────────────

function Shopkeeper() {
  return (
    <div style={{
      position: 'absolute', bottom: 36, left: '50%', transform: 'translateX(-50%)',
      display: 'flex', flexDirection: 'column', alignItems: 'center', zIndex: 2,
    }}>
      {/* Head */}
      <div style={{ position: 'relative', width: 44, height: 44 }}>
        {/* Helm */}
        <div style={{ position:'absolute', top:-11, left:-3, right:-3, height:16, background:'#2848a8', border:'2px solid #1828808' }}>
          <div style={{ position:'absolute', top:-11, left:4,  width:6, height:12, background:'#c8c8c8', border:'1px solid #888', transform:'rotate(-7deg)' }} />
          <div style={{ position:'absolute', top:-11, right:4, width:6, height:12, background:'#c8c8c8', border:'1px solid #888', transform:'rotate(7deg)'  }} />
        </div>
        {/* Face */}
        <div style={{ width:44, height:44, background:'#e0b070', border:'2px solid #603808' }}>
          <div style={{ position:'absolute', top:16, left:7,  width:7, height:6, background:'#181818' }} />
          <div style={{ position:'absolute', top:16, right:7, width:7, height:6, background:'#181818' }} />
          {/* Beard */}
          <div style={{
            position:'absolute', bottom:-9, left:5, right:5, height:14,
            background:'#e8e8e8', border:'1px solid #b0b0b0',
            clipPath:'polygon(0 0,100% 0,72% 100%,28% 100%)',
          }} />
        </div>
      </div>
      {/* Body */}
      <div style={{ width:54, height:40, background:'#a01818', border:'2px solid #680808', marginTop:7, position:'relative' }}>
        <div style={{ position:'absolute', top:4, left:'50%', transform:'translateX(-50%)', width:13, height:16, background:'#e0b070', border:'1px solid #603808' }} />
        <div style={{ position:'absolute', left:-12, top:0, width:11, height:28, background:'#a01818', border:'2px solid #680808' }} />
        <div style={{ position:'absolute', right:-12, top:0, width:11, height:28, background:'#a01818', border:'2px solid #680808', transform:'rotate(-12deg)', transformOrigin:'top center' }} />
      </div>
    </div>
  )
}

// ─── Item Rail ────────────────────────────────────────────────────────────────
// Driven by your CardDefinition[] / CardDeck[] — no rarity displayed.

interface ItemRailProps {
  items: Array<CardDefinition | CardDeck>
  cards: CardDefinition[]
  selectedId: string | null
  isOwned: (id: string) => boolean
  inCart: (id: string) => boolean
  onSelect: (id: string) => void
}

function ItemRail({ items, cards, selectedId, isOwned, inCart, onSelect }: ItemRailProps) {
  const safeItems = items ?? []
  const safeCards = cards ?? []
  return (
    <div style={{
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      gap: 6, padding: '8px 10px',
      background: '#0e0804',
      borderTop: '3px solid #4a2808',
      flexWrap: 'wrap', minHeight: 70,
    }}>
      {safeItems.map((item, idx) => {
        const isCard   = safeCards.some(c => c.id === item.id)
        const cost     = isCard ? ((item as CardDefinition).cost ?? 0) : (item as CardDeck).cost
        const imageUrl = isCard ? ((item as CardDefinition).imageUrl ?? null) : null
        // Icon derived from type only — never rarity
        const icon     = isCard
          ? typeIcon((item as CardDefinition).type)
          : (item as CardDeck).icon

        return (
          <ItemSlot
            key={item.id}
            label={item.name}
            cost={cost}
            icon={icon}
            imageUrl={imageUrl}
            selected={selectedId === item.id}
            owned={isOwned(item.id)}
            inCart={inCart(item.id)}
            animDelay={idx * 0.14}
            onSelect={() => onSelect(item.id)}
          />
        )
      })}

      {safeItems.length === 0 && (
        <div style={{ fontSize: 7, color: '#4a4a6a', letterSpacing: 1, padding: '8px 0' }}>
          NO ITEMS AVAILABLE
        </div>
      )}
    </div>
  )
}

// ─── Item Slot ────────────────────────────────────────────────────────────────

interface ItemSlotProps {
  label: string
  cost: number
  icon: string
  imageUrl: string | null
  selected: boolean
  owned: boolean
  inCart: boolean
  animDelay: number
  onSelect: () => void
}

function ItemSlot({ label, cost, icon, imageUrl, selected, owned, inCart, animDelay, onSelect }: ItemSlotProps) {
  const [hovered, setHovered] = useState(false)

  const borderColor =
    owned           ? '#38b038' :
    inCart          ? '#d09818' :
    selected || hovered ? '#b0b0f8' :
    '#3a3a58'

  return (
    <div
      onClick={onSelect}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      title={label}
      style={{
        width: 50, height: 56,
        background: owned ? '#0a180a' : selected ? '#14142a' : '#0c0c18',
        border: `2px solid ${borderColor}`,
        cursor: 'pointer',
        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
        position: 'relative',
        transition: 'border-color 0.1s, background 0.1s',
        animation: `rpgSlotBob ${2.2 + animDelay}s ease-in-out infinite`,
        animationDelay: `${animDelay}s`,
      }}
    >
      {/* Art */}
      <div style={{ width: 30, height: 30, position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 2, overflow: 'hidden' }}>
        {imageUrl
          ? <Image src={imageUrl} alt={label} fill style={{ objectFit: 'cover' }} />
          : <span style={{ fontSize: 18, lineHeight: 1, filter: 'drop-shadow(0 1px 3px rgba(0,0,0,0.9))' }}>{icon}</span>
        }
      </div>

      {/* Price — no rarity label */}
      <div style={{ fontSize: 5, color: '#d0b030', letterSpacing: 0, textAlign: 'center', lineHeight: 1 }}>
        {cost.toLocaleString()}G
      </div>

      {/* Status marks */}
      {owned  && <div style={{ position:'absolute', top:1, right:2, fontSize:5, color:'#38b038' }}>✓</div>}
      {inCart && !owned && <div style={{ position:'absolute', top:2, right:3, width:5, height:5, borderRadius:'50%', background:'#d09818' }} />}
    </div>
  )
}

// ─── Dialogue Box ─────────────────────────────────────────────────────────────

function DialogueBox({ text }: { text: string }) {
  return (
    <div style={{ background: '#07070e', borderTop: '3px solid #303050', padding: '12px 16px' }}>
      <div style={{ fontSize: 6, color: '#7070a0', letterSpacing: 2, marginBottom: 7, textTransform: 'uppercase' }}>
        Shopkeeper
      </div>
      <div style={{ fontSize: 8, color: '#d8d8ff', lineHeight: 2.2, minHeight: 36, letterSpacing: 0.4 }}>
        {text}
        <span style={{
          display: 'inline-block', width: 7, height: 10,
          background: '#d8d8ff', marginLeft: 3, verticalAlign: 'middle',
          animation: 'rpgBlink 0.65s step-end infinite',
        }} />
      </div>
    </div>
  )
}

// ─── Action Bar ───────────────────────────────────────────────────────────────

interface ActionBarProps {
  canAdd: boolean; canRemove: boolean; canBuy: boolean
  cartCount: number; cartTotal: number; purchasing: boolean
  onAdd: () => void; onRemove: () => void; onBuy: () => void
}

function ActionBar({ canAdd, canRemove, canBuy, cartCount, cartTotal, purchasing, onAdd, onRemove, onBuy }: ActionBarProps) {
  return (
    <div style={{ display: 'flex', background: '#08080f', borderTop: '2px solid #28283e' }}>
      <RpgButton label="ADD TO CART" disabled={!canAdd}    onClick={onAdd}    flex={2}   activeColor="#2a2060" borderColor="#5050b0" />
      <RpgButton label="REMOVE"      disabled={!canRemove} onClick={onRemove} flex={1.4} activeColor="#300808" borderColor="#703030" />
      <RpgButton
        label={purchasing ? 'BUYING...' : `BUY (${cartCount})  ${cartTotal.toLocaleString()}G`}
        disabled={!canBuy} onClick={onBuy} flex={2.5}
        activeColor="#0a2010" borderColor="#306828"
      />
    </div>
  )
}

interface RpgButtonProps {
  label: string; disabled: boolean; onClick: () => void
  flex: number; activeColor: string; borderColor: string
}

function RpgButton({ label, disabled, onClick, flex, activeColor, borderColor }: RpgButtonProps) {
  const [pressed, setPressed] = useState(false)
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      onMouseDown={() => setPressed(true)}
      onMouseUp={() => setPressed(false)}
      onMouseLeave={() => setPressed(false)}
      style={{
        flex,
        fontFamily: "'Press Start 2P', monospace",
        fontSize: 7, padding: '11px 6px',
        background: disabled ? '#0c0c18' : pressed ? activeColor : 'transparent',
        border: 'none',
        borderRight: `2px solid ${disabled ? '#18182a' : borderColor}`,
        color: disabled ? '#30305a' : '#c8c8f0',
        cursor: disabled ? 'default' : 'pointer',
        letterSpacing: 0.4, lineHeight: 1.7,
        transition: 'background 0.08s',
        textAlign: 'center',
      }}
    >{label}</button>
  )
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Returns a fallback emoji icon for a card slot when no imageUrl is present.
 * Derived from card.type only — rarity is never used.
 * Extend this map to match your schema's type values.
 */
function typeIcon(type: string): string {
  const map: Record<string, string> = {
    CREATURE: '🐉', SPELL: '✨', CURSE: '🌀',
    FIRE: '🔥', WATER: '💧', NATURE: '🌿',
    BASIC: '⚔️', TRAP: '⚡', DIVINE: '☀️', ITEM: '🎒',
  }
  return map[type?.toUpperCase()] ?? '🃏'
}