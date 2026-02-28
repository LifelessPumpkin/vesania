'use client'

import Image from 'next/image'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/context/AuthContext'
import { useEffect, useMemo, useState } from 'react'
import styles from './friends.module.css'
import type { Friend } from './types'
import { AddFriendForm } from './components/AddFriendForm'
import { FriendCard } from './components/FriendCard'

export default function FriendsPage() {
  const { user, loading: authLoading, getToken } = useAuth()
  const router = useRouter()

  const [friends, setFriends] = useState<Friend[]>([])
  const [loadingFriends, setLoadingFriends] = useState(true)
  const [addingFriend, setAddingFriend] = useState(false)
  const [friendUsername, setFriendUsername] = useState('')
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login')
    }
  }, [authLoading, user, router])

  useEffect(() => {
    if (!user) return

    let active = true
    let intervalId: ReturnType<typeof setInterval> | null = null

    const loadFriends = async (isBackgroundRefresh = false) => {
      if (!isBackgroundRefresh) {
        setLoadingFriends(true)
      }
      setError('')
      try {
        const token = await getToken()
        const res = await fetch('/api/friends', {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        })
        const data = await res.json()

        if (!res.ok) {
          throw new Error(data.message || 'Failed to load friends')
        }

        if (!active) return
        setFriends(data.friends || [])
      } catch (err: unknown) {
        if (!active) return
        const message = err instanceof Error ? err.message : 'Failed to load friends'
        setError(message)
      } finally {
        if (active && !isBackgroundRefresh) setLoadingFriends(false)
      }
    }

    loadFriends(false)
    intervalId = setInterval(() => {
      loadFriends(true)
    }, 20000)

    return () => {
      active = false
      if (intervalId) clearInterval(intervalId)
    }
  }, [user, getToken])

  const canSubmit = useMemo(() => friendUsername.trim().length > 0 && !addingFriend, [friendUsername, addingFriend])

  const onAddFriend = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!canSubmit) return

    setAddingFriend(true)
    setError('')
    setSuccess('')

    try {
      const token = await getToken()
      const username = friendUsername.trim()

      const res = await fetch('/api/friends', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ username }),
      })

      const data = await res.json()

      if (!res.ok) {
        throw new Error(data.message || 'Failed to add friend')
      }

      setFriends((prev) => {
        const existing = prev.some((f) => f.id === data.friend.id)
        if (existing) return prev
        return [data.friend, ...prev]
      })
      setFriendUsername('')
      setSuccess(data.message || 'Friend added')
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to add friend'
      setError(message)
    } finally {
      setAddingFriend(false)
    }
  }

  if (authLoading) {
    return (
      <main className={styles.page}>
        <Image src="/background.jpg" alt="Background" fill style={{ objectFit: 'cover' }} priority />
        <div className={styles.center}>
          <p className={styles.loadingText}>Loading...</p>
        </div>
      </main>
    )
  }

  if (!user) return null

  return (
    <main className={styles.page}>
      <Image src="/background.jpg" alt="Background" fill style={{ objectFit: 'cover' }} priority />

      <div className={styles.overlay}>
        <section className={styles.panel}>
          <header className={styles.header}>
            <h1 className={styles.title}>Friends</h1>
            <Link href="/home" className={styles.backLink}>← Home</Link>
          </header>

          <AddFriendForm
            friendUsername={friendUsername}
            addingFriend={addingFriend}
            canSubmit={canSubmit}
            onUsernameChange={setFriendUsername}
            onSubmit={onAddFriend}
          />

          {error && <p className={styles.error}>{error}</p>}
          {success && <p className={styles.success}>{success}</p>}

          {loadingFriends ? (
            <p className={styles.message}>Loading friends...</p>
          ) : friends.length === 0 ? (
            <p className={styles.message}>No friends yet. Add one to start playing.</p>
          ) : (
            <div className={styles.grid}>
              {friends.map((friend) => (
                <FriendCard key={friend.id} friend={friend} />
              ))}
            </div>
          )}
        </section>
      </div>
    </main>
  )
}
