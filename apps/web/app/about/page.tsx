'use client'

import Image from 'next/image'
import Link from 'next/link'
import DungeonBackground from '@/components/DungeonBackground'
import SlideUpPage from '@/components/SlideUpPage'

export default function AboutPage() {
    const developers = [
        { name: 'Chase Blancher', handle: 'cgb243' },
        { name: 'Logan Harmon', handle: 'LifelessPumpkin' },
        { name: 'Greg ElDeiry', handle: 'GregElDeiry' },
        { name: 'Zach Sandifer', handle: 'sandifer2' },
        { name: 'Laura Saravia', handle: 'laurasar' },
        { name: 'Giovani Espinal', handle: 'Gioespinal04' },
    ]

    return (
        <main className="page-padded">
            <DungeonBackground />

            <SlideUpPage>
                <div className="pixel-panel p-8 w-full max-w-[600px] mt-8 mx-auto animate-fade-in flex flex-col items-center">
                    <header className="w-full flex items-center justify-between mb-8">
                        <Link href="/" className="text-muted text-base hover:text-white transition-colors">&larr; Back</Link>
                    </header>

                    <div className="flex flex-col items-center mb-8">
                        <Image
                            src="/VesaniaLogo3.png"
                            alt="Vesania Logo"
                            width={400}
                            height={143}
                            priority
                            unoptimized
                            className="mb-4"
                            style={{ imageRendering: 'pixelated' }}
                        />
                        <p className="text-lg text-muted text-center max-w-[450px] leading-relaxed">
                            A card-game universe built as a Capstone project for CEN4020L / CEN4090L.
                        </p>
                    </div>

                    <div className="w-full border-t border-border pt-8">
                        <h2 className="heading-md text-center mb-6">The Developers</h2>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {developers.map((dev) => (
                                <div 
                                    key={dev.handle} 
                                    className="pixel-panel p-4 bg-black/20 flex flex-col items-center justify-center hover:border-accent transition-colors"
                                >
                                    <span className="text-white font-bold text-lg">{dev.name}</span>
                                    <span className="text-muted text-sm">@{dev.handle}</span>
                                </div>
                            ))}
                        </div>
                    </div>

                    <footer className="mt-12 text-faint text-sm text-center">
                        &copy; {new Date().getFullYear()} Vesania Team. All rights reserved.
                    </footer>
                </div>
            </SlideUpPage>
        </main>
    )
}
