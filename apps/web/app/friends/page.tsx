'use client'

import Image from 'next/image'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/context/AuthContext'
import { useEffect, useMemo, useState, useRef, useCallback } from 'react'
import styles from './friends.module.css'
import type { Friend } from './types'
import { AddFriendForm } from './components/AddFriendForm'
import { FriendCard } from './components/FriendCard'

type SearchResult = {
  username: string
  displayName: string | null
  avatarUrl: string | null
}

export default function FriendsPage() {
  const { user, loading: authLoading, getToken } = useAuth()
  const router = useRouter()

  const [friends, setFriends] = useState<Friend[]>([])
  const [loadingFriends, setLoadingFriends] = useState(true)
  const [addingFriend, setAddingFriend] = useState(false)
  const [friendUsername, setFriendUsername] = useState('')
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  // Search state
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState<SearchResult[]>([])
  const [searching, setSearching] = useState(false)
  const [addingUsername, setAddingUsername] = useState<string | null>(null)
  const searchDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

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
    await addFriendByUsername(friendUsername.trim())
    setFriendUsername('')
  }

  const addFriendByUsername = async (username: string) => {
    setAddingFriend(true)
    setAddingUsername(username)
    setError('')
    setSuccess('')

    try {
      const token = await getToken()
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
      setSuccess(data.message || `Added ${username} as a friend!`)
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to add friend'
      setError(message)
    } finally {
      setAddingFriend(false)
      setAddingUsername(null)
    }
  }

  // Search for users
  const searchUsers = useCallback(async (query: string) => {
    if (query.length < 2) {
      setSearchResults([])
      setSearching(false)
      return
    }
    setSearching(true)
    try {
      const token = await getToken()
      const res = await fetch(`/api/users/search?q=${encodeURIComponent(query)}`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      const data = await res.json()
      setSearchResults(data.users || [])
    } catch {
      setSearchResults([])
    } finally {
      setSearching(false)
    }
  }, [getToken])

  const handleSearchChange = (value: string) => {
    setSearchQuery(value)
    if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current)
    if (!value.trim()) {
      setSearchResults([])
      return
    }
    searchDebounceRef.current = setTimeout(() => searchUsers(value.trim()), 300)
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

  // Check which search results are already friends
  const friendUsernames = new Set(friends.map(f => f.username))

  return (
    <main className={styles.page}>
      <Image src="/background.jpg" alt="Background" fill style={{ objectFit: 'cover' }} priority />

      <div className={styles.overlay}>
        <section className={styles.panel}>
          <header className={styles.header}>
            <h1 className={styles.title}>Friends</h1>
            <Link href="/home" className={styles.backLink}>← Home</Link>
          </header>

          {/* Search for players */}
          <div className={styles.addForm}>
            <label className={styles.label}>Find Players</label>
            <div className={styles.formRow}>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => handleSearchChange(e.target.value)}
                placeholder="Search by username or display name..."
                className={styles.input}
              />
            </div>
            {searching && <p className={styles.message} style={{ fontSize: '0.85rem' }}>Searching...</p>}
            {searchResults.length > 0 && (
              <div className={styles.searchResults}>
                {searchResults.map((result) => {
                  const isFriend = friendUsernames.has(result.username)
                  const isAdding = addingUsername === result.username
                  return (
                    <div key={result.username} className={styles.searchResultCard}>
                      {result.avatarUrl ? (
                        <img src={result.avatarUrl} alt="" className={styles.searchAvatar} />
                      ) : (
                        <div className={styles.searchAvatarPlaceholder}>👤</div>
                      )}
                      <div style={{ flex: 1 }}>
                        <Link href={`/profile/${encodeURIComponent(result.username)}`} style={{ textDecoration: 'none' }}>
                          <span className={styles.searchName}>
                            {result.displayName || result.username}
                          </span>
                        </Link>
                        <span className={styles.searchUsername}>@{result.username}</span>
                      </div>
                      {isFriend ? (
                        <span style={{ color: '#86efac', fontSize: '0.8rem', fontWeight: 600 }}>Friends ✓</span>
                      ) : (
                        <button
                          onClick={() => addFriendByUsername(result.username)}
                          disabled={isAdding || addingFriend}
                          className={styles.primaryButton}
                          style={{ padding: '0.45rem 0.75rem', fontSize: '0.85rem' }}
                        >
                          {isAdding ? 'Adding...' : 'Add'}
                        </button>
                      )}
                    </div>
                  )
                })}
              </div>
            )}
            {searchQuery.length >= 2 && !searching && searchResults.length === 0 && (
              <p className={styles.message} style={{ fontSize: '0.85rem' }}>No players found</p>
            )}
          </div>

          {/* Manual add by exact username */}
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
            <p className={styles.message}>No friends yet. Search for players above to add them.</p>
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

