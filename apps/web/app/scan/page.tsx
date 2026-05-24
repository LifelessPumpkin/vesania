'use client'

import { Suspense } from 'react'
import Vortex from '@/components/Vortex'
import LoginCard from '@/components/scan/LoginCard'
import Image from 'next/image'
import { CardDetailModal } from '@/app/collection/components/CardDetailModal'
import { GameCard } from '@/components/GameCard'
import { useScanner } from './hooks/useScanner'
import styles from './scan.module.css'

function ScanPageContent() {
  const {
    user,
    router,
    code, setCode,
    result,
    isFlipped,
    showDetails,
    showModal, setShowModal,
    loading,
    error,
    signingIn,
    showLogin, setShowLogin,
    handleScan,
    handleScanAnother,
    handleSignIn
  } = useScanner()

  return (
    <div style={{ position: 'relative', width: '100vw', height: '100vh', overflow: 'hidden' }}>
      <Vortex />
      <div style={{
        position: 'relative', zIndex: 10, display: 'flex',
        alignItems: 'center', justifyContent: 'center',
        height: '100%', padding: '1rem', boxSizing: 'border-box'
      }}>
        {!user || showLogin ? (
          <LoginCard
            onBack={() => setShowLogin(false)}
            onGoogleSignIn={handleSignIn}
            loading={signingIn}
            error={error}
          />
        ) : (
          <div className={styles.panel}>
            {/* Go back to home page */}
            <button onClick={() => router.push('/dashboard')} className={styles.backButton}>
              &larr; Back
            </button>

            <h1 className={styles.title}>Vesania</h1>

            {/* 3D Card Container */}
            <div
              className={`${styles.cardWrapper} ${loading ? styles.rumbling : ''} ${isFlipped ? styles.revealedGlow : ''} ${isFlipped ? styles.clickableCard : ''}`}
              onClick={isFlipped ? () => setShowModal(true) : undefined}
            >
              <div className={`${styles.cardInner} ${isFlipped ? styles.flipped : ''}`}>
                {/* Back Face */}
                <div className={styles.cardFaceBack}>
                  <Image
                    src="/card-art/VesaniaCardBack.png"
                    alt="Vesania Card Back"
                    width={180}
                    height={260}
                    className={styles.cardBackImg}
                    priority
                  />
                </div>
                {/* Front Face */}
                <div className={styles.cardFaceFront}>
                  {result?.card ? (
                    <GameCard card={result.card.definition} artOnly={true} />
                  ) : (
                    <Image
                      src="/card-art/CardFrontTempArt.png"
                      alt="Scanned Card"
                      fill
                      sizes="180px"
                      className={styles.cardBackImg}
                      unoptimized
                      priority
                    />
                  )}
                </div>
              </div>
            </div>

            {error && <div className={styles.error}>{error}</div>}

            {/* Render form if not flipped and not showing details */}
            {!isFlipped && !showDetails ? (
              <form onSubmit={handleScan} className={styles.scanForm}>
                <input
                  type="text"
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                  placeholder="Enter NFC Code"
                  className={styles.input}
                  required
                  disabled={loading}
                />

                <button
                  type="submit"
                  disabled={loading}
                  className={styles.primaryButton}
                >
                  {loading ? 'Scanning...' : 'Scan Card'}
                </button>
              </form>
            ) : showDetails ? (
              /* Success Details (fade/slide in) */
              <div className={styles.successDetails}>
                <div className={styles.successBadge}>
                  {result?.message}
                </div>
                <div className={styles.buttonRow}>
                  <button
                    onClick={() => router.push('/collection')}
                    className={styles.ghostButtonLight}
                  >
                    View Collection
                  </button>
                  <button
                    onClick={handleScanAnother}
                    className={styles.ghostButton}
                  >
                    Scan Another
                  </button>
                </div>
              </div>
            ) : (
              /* Spacer during the 1.2s flip transition to prevent layout shifts */
              <div style={{ height: '144px' }} />
            )}
          </div>
        )}
      </div>

      {showModal && result?.card && (
        <CardDetailModal
          card={result.card.definition}
          isInDeck={false}
          isDeckFull={false}
          isPending={false}
          onAdd={() => {}}
          onClose={() => setShowModal(false)}
          hideActionBtn={true}
        />
      )}
    </div>
  )
}

export default function ScanPage() {
  return (
    <Suspense fallback={<div style={{ position: 'relative', width: '100vw', height: '100vh', overflow: 'hidden' }}><Vortex /></div>}>
      <ScanPageContent />
    </Suspense>
  )
}