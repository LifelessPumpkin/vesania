"use client"

import myImage from '@/app/images/card.webp'
import { cardStyle, primaryButtonStyle } from '@/styles/cardStyles'

interface ScanCardProps {
    onLoginClick: () => void
}

export default function ScanCard({ onLoginClick }: ScanCardProps) {
    return (
        <div style={cardStyle}>
            <h1 style={{ color: 'white', fontSize: '2rem', fontWeight: 'bold', marginBottom: '2rem', textAlign: 'center' }}>
                Vesania
            </h1>
            <img
                src={myImage.src}
                alt="Sample Card"
                style={{
                    width: '100%',
                    maxWidth: '250px',
                    height: 'auto',
                    borderRadius: '0.5rem',
                    display: 'block',
                    margin: '0 auto 1.5rem auto',
                }}
            />
            <button
                onClick={onLoginClick}
                style={primaryButtonStyle}
                onMouseEnter={e => (e.currentTarget.style.backgroundColor = '#4f46e5')}
                onMouseLeave={e => (e.currentTarget.style.backgroundColor = '#6366f1')}
            >
                Login to Save Card
            </button>
        </div>
    )
}