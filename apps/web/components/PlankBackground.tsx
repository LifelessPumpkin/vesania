export default function PlankBackground() {
    return (
        <div style={{
            position: 'fixed',
            inset: 0,
            zIndex: -1,
            backgroundImage: "url('/PlankTexture.png')",
            backgroundRepeat: 'repeat',
            backgroundSize: '256px auto',
            imageRendering: 'pixelated',
            backgroundColor: 'var(--color-bg-deep)',
        }}>
            <div style={{
                position: 'absolute',
                inset: 0,
                background: 'var(--color-bg-overlay)',
                pointerEvents: 'none',
            }} />
        </div>
    )
}
