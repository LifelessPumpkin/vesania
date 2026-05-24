'use client'

import Image from 'next/image'
import styles from './GameCard.module.css'

export type GameCardSize = 'small' | 'medium' | 'large'

export interface GameCardData {
    name: string
    type: string
    rarity: string
    description: string
    imageUrl?: string | null
    effectJson?: Record<string, unknown>
}

interface GameCardProps {
    card: GameCardData
    size?: GameCardSize
    onClick?: () => void
    dimmed?: boolean
    stackCount?: number
    artOnly?: boolean
}

/** Fallback image for cards without custom art. Replace with a card-back asset when available. */
const DEFAULT_ART = '/card-art/CardFrontTempArt.png'
const GEM_IMAGE = '/card-art/GemDetailed.png'

/**
 * Extract the energy/mana cost from a card's effectJson.
 * - Spells: effectJson.manaCost
 * - Tools: effectJson.slotsRequired
 * - Items / Characters: no cost displayed
 */
function getCost(card: GameCardData): number | null {
    if (!card.effectJson) return null
    if (card.type === 'SPELL' && typeof card.effectJson.manaCost === 'number') {
        return card.effectJson.manaCost
    }
    if (card.type === 'TOOL' && typeof card.effectJson.slotsRequired === 'number') {
        return card.effectJson.slotsRequired
    }
    return null
}

export function GameCard({ card, size = 'medium', onClick, dimmed, stackCount, artOnly }: GameCardProps) {
    const cost = getCost(card)
    const sizeClass = size === 'small' ? styles.sizeSmall
        : size === 'large' ? styles.sizeLarge
        : styles.sizeMedium

    const hasCustomArt = card.imageUrl && card.imageUrl.trim() !== ''

    return (
        <div
            className={`${styles.cardFrame} ${sizeClass} ${dimmed ? styles.dimmed : ''} ${onClick ? styles.clickable : ''}`}
            onClick={onClick}
            role={onClick ? 'button' : undefined}
            tabIndex={onClick ? 0 : undefined}
            onKeyDown={onClick ? (e) => e.key === 'Enter' && onClick() : undefined}
            style={artOnly ? { border: 'none', boxShadow: 'none', background: 'transparent' } : undefined}
        >
            {/* Full-bleed background art */}
            <div className={styles.cardBg}>
                {hasCustomArt ? (
                    <Image
                        src={card.imageUrl!}
                        alt={card.name}
                        fill
                        sizes={size === 'large' ? '280px' : size === 'medium' ? '180px' : '150px'}
                        className={styles.cardBgImage}
                        unoptimized
                    />
                ) : (
                    <Image
                        src={DEFAULT_ART}
                        alt="No art"
                        fill
                        sizes={size === 'large' ? '280px' : size === 'medium' ? '180px' : '150px'}
                        className={styles.cardBgPlaceholder}
                        unoptimized
                    />
                )}
            </div>

            {!artOnly && (
                <>
                    {/* Cost Gem — top left, on top of everything */}
                    {cost !== null && (
                        <div className={styles.costGem}>
                            <Image
                                src={GEM_IMAGE}
                                alt="Cost"
                                width={50}
                                height={50}
                                className={styles.gemImage}
                                unoptimized
                            />
                            <span className={styles.gemCost}>{cost}</span>
                        </div>
                    )}

                    {/* Stack badge — top right */}
                    {stackCount !== undefined && stackCount > 0 && (
                        <div className={styles.stackBadge}>x{stackCount}</div>
                    )}

                    {/* Content overlay: title → spacer → type badge → description */}
                    <div className={styles.cardContent}>
                        {/* Title at top */}
                        <div className={styles.titleBanner}>
                            {card.name}
                        </div>

                        {/* Spacer pushes type + description to bottom */}
                        <div className={styles.artSpacer} />

                        {/* Type badge floating above description */}
                        <span className={styles.typeBadge}>
                            {card.type.toLowerCase()}
                        </span>

                        {/* Description at bottom */}
                        <div className={styles.descriptionArea}>
                            {card.description}
                        </div>
                    </div>
                </>
            )}
        </div>
    )
}
