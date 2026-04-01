import Image from 'next/image'

/**
 * Renders the dungeon background with:
 * 1. A slow 30s breathing zoom animation
 * 2. A warm torch-flicker overlay
 *
 * Drop-in replacement for the bare <Image src="/background.jpg" .../>
 * used across landing, home, friends, dashboard, and profile pages.
 */
export default function DungeonBackground() {
    return (
        <>
            {/* Background image with breathing scale */}
            <div className="bg-breathe" style={{ position: 'fixed', inset: 0, zIndex: -1 }}>
                <Image
                    src="/background.jpg"
                    alt="Background"
                    fill
                    style={{ objectFit: 'cover' }}
                    priority
                />
            </div>

            {/* Torch flicker overlays — two independent light sources */}
            <div className="torch-base torch-left" />
            <div className="torch-base torch-right" />
        </>
    )
}
