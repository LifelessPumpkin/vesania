'use client'

import { useEffect, useRef } from 'react'

interface Card {
    distance: number
    speed: number
}

const PATH = [
    { x: -180, y: 230 },
    { x: 0, y: 150 },
    { x: 200, y: 270 },
    { x: 400, y: 150 },
    { x: 600, y: 270 },
    { x: 800, y: 150 },
    { x: 1000, y: 270 },
    { x: 1200, y: 150 },
    { x: 1400, y: 270 },
    { x: 1600, y: 200 },
]

/* -----------------------------
   Compute path length once
------------------------------ */
function getPathLengths() {
    const lengths: number[] = []
    let total = 0

    for (let i = 0; i < PATH.length - 1; i++) {
        const dx = PATH[i + 1].x - PATH[i].x
        const dy = PATH[i + 1].y - PATH[i].y
        const length = Math.sqrt(dx * dx + dy * dy)
        lengths.push(length)
        total += length
    }

    return { lengths, total }
}

const { lengths: SEGMENT_LENGTHS, total: TOTAL_LENGTH } = getPathLengths()

/* -----------------------------
   Get position from distance
------------------------------ */
function getPointAtDistance(distance: number) {
    let remaining = distance

    for (let i = 0; i < SEGMENT_LENGTHS.length; i++) {
        const segmentLength = SEGMENT_LENGTHS[i]

        if (remaining <= segmentLength) {
            const t = remaining / segmentLength
            const p1 = PATH[i]
            const p2 = PATH[i + 1]

            return {
                x: p1.x + (p2.x - p1.x) * t,
                y: p1.y + (p2.y - p1.y) * t,
            }
        }

        remaining -= segmentLength
    }

    return PATH[PATH.length - 1]
}

export default function FloatingCards() {
    const cardsRef = useRef<Card[]>([])
    const domCardsRef = useRef<HTMLDivElement[]>([])
    const animationRef = useRef<number | null>(null)

    // --- CARD VISUAL SETTINGS ---
    const CARD_WIDTH = 80
    const OVERLAP_RATIO = 1 / 8 // 12.5% overlap
    const overlapPixels = CARD_WIDTH * OVERLAP_RATIO
    const spacing = CARD_WIDTH - overlapPixels // 70px effective spacing
    const speed = 0.55

    // calculate required cards to always cover path
    const cardCount = Math.ceil(TOTAL_LENGTH / spacing) - 1

    useEffect(() => {
        cardsRef.current = Array.from({ length: cardCount }, (_, i) => ({
            distance: i * spacing - TOTAL_LENGTH, // shifted left for smooth load-in
            speed,
        }))

        const animate = () => {
            cardsRef.current.forEach((card, i) => {
                card.distance += card.speed

                if (card.distance > TOTAL_LENGTH) {
                    card.distance -= TOTAL_LENGTH
                }

                const el = domCardsRef.current[i]
                if (!el) return

                if (card.distance < 0) {
                    el.style.opacity = '0'
                    return
                }

                el.style.opacity = '1'

                const pos = getPointAtDistance(card.distance)
                el.style.transform = `translate(${pos.x}px, ${pos.y}px)`
            })

            animationRef.current = requestAnimationFrame(animate)
        }

        animate()

        return () => {
            if (animationRef.current) {
                cancelAnimationFrame(animationRef.current)
            }
        }
    }, [cardCount, spacing])

    return (
        <div
            style={{
                position: 'absolute',
                top: 0,
                left: 0,
                width: '100%',
                height: '100%',
                pointerEvents: 'none',
                zIndex: 2,
                overflow: 'hidden',
            }}
        >
            {Array.from({ length: cardCount }).map((_, i) => (
                <div
                    key={i}
                    ref={el => {
                        if (el) domCardsRef.current[i] = el
                    }}
                    style={{
                        position: 'absolute',
                        top: 0,
                        left: 0,
                        width: CARD_WIDTH,
                        height: 112,
                        borderRadius: '6px',
                        overflow: 'hidden',
                        boxShadow: '0 4px 12px rgba(0,0,0,0.6)',
                        willChange: 'transform',
                    }}
                >
                    <img
                        src="/card.webp"
                        alt="card"
                        style={{
                            width: '100%',
                            height: '100%',
                            objectFit: 'cover',
                        }}
                    />
                </div>
            ))}
        </div>
    )
}
// 'use client'

// import { useEffect, useRef } from 'react'

// interface Card {
//     distance: number
//     speed: number
// }

// const PATH = [
//     { x: -180, y: 230 },
//     { x: 0, y: 150 },
//     { x: 200, y: 270 },
//     { x: 400, y: 150 },
//     { x: 600, y: 270 },
//     { x: 800, y: 150 },
//     { x: 1000, y: 270 },
//     { x: 1200, y: 150 },
//     { x: 1400, y: 270 },
//     { x: 1600, y: 200 },
// ]
// /* -----------------------------
//    Compute segment lengths once
// ------------------------------ */
// function getPathLengths() {
//     const lengths: number[] = []
//     let total = 0

//     for (let i = 0; i < PATH.length - 1; i++) {
//         const dx = PATH[i + 1].x - PATH[i].x
//         const dy = PATH[i + 1].y - PATH[i].y
//         const length = Math.sqrt(dx * dx + dy * dy)
//         lengths.push(length)
//         total += length
//     }

//     return { lengths, total }
// }

// const { lengths: SEGMENT_LENGTHS, total: TOTAL_LENGTH } = getPathLengths()

// /* -----------------------------
//    Get position from distance
// ------------------------------ */
// function getPointAtDistance(distance: number) {
//     let remaining = distance

//     for (let i = 0; i < SEGMENT_LENGTHS.length; i++) {
//         const segmentLength = SEGMENT_LENGTHS[i]

//         if (remaining <= segmentLength) {
//             const t = remaining / segmentLength
//             const p1 = PATH[i]
//             const p2 = PATH[i + 1]

//             return {
//                 x: p1.x + (p2.x - p1.x) * t,
//                 y: p1.y + (p2.y - p1.y) * t,
//             }
//         }

//         remaining -= segmentLength
//     }

//     return PATH[PATH.length - 1]
// }

// export default function FloatingCards() {
//     const cardsRef = useRef<Card[]>([])
//     const animationRef = useRef<number | null>(null)
//     const domCardsRef = useRef<HTMLDivElement[]>([])

//     useEffect(() => {
//         const cardCount = 40 // increase for denser stream
//         const spacing = TOTAL_LENGTH / cardCount

//         cardsRef.current = Array.from({ length: cardCount }, (_, i) => ({
//             distance: i * spacing,
//             speed: 0.5, // pixels per frame
//         }))

//         const animate = () => {
//             cardsRef.current.forEach((card, i) => {
//                 card.distance += card.speed

//                 // seamless loop
//                 if (card.distance > TOTAL_LENGTH) {
//                     card.distance -= TOTAL_LENGTH
//                 }

//                 const pos = getPointAtDistance(card.distance)
//                 const el = domCardsRef.current[i]

//                 if (el) {
//                     el.style.transform = `translate(${pos.x}px, ${pos.y}px)`
//                 }
//             })

//             animationRef.current = requestAnimationFrame(animate)
//         }

//         animate()

//         return () => {
//             if (animationRef.current) {
//                 cancelAnimationFrame(animationRef.current)
//             }
//         }
//     }, [])

//     return (
//         <div
//             style={{
//                 position: 'absolute',
//                 top: 0,
//                 left: 0,
//                 width: '100%',
//                 height: '100%',
//                 pointerEvents: 'none',
//                 zIndex: 2,
//                 overflow: 'hidden',
//             }}
//         >
//             {Array.from({ length: 40 }).map((_, i) => (
//                 <div
//                     key={i}
//                     ref={el => {
//                         if (el) domCardsRef.current[i] = el
//                     }}
//                     style={{
//                         position: 'absolute',
//                         top: 0,
//                         left: 0,
//                         width: 80,
//                         height: 112,
//                         borderRadius: '6px',
//                         overflow: 'hidden',
//                         boxShadow: '0 4px 12px rgba(0,0,0,0.6)',
//                         willChange: 'transform',
//                     }}
//                 >
//                     <img
//                         src="/card.webp"
//                         alt="card"
//                         style={{
//                             width: '100%',
//                             height: '100%',
//                             objectFit: 'cover',
//                         }}
//                     />
//                 </div>
//             ))}
//         </div>
//     )
// }