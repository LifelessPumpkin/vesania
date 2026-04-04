'use client'

import Image from 'next/image'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/context/AuthContext'
import { useEffect, useMemo, useState, useRef, useCallback } from 'react'
import type { Friend } from './types'
import { AddFriendForm } from './components/AddFriendForm'
import { FriendCard } from './components/FriendCard'
import SlideUpPage from '@/components/SlideUpPage'
import DungeonBackground from '@/components/DungeonBackground'

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
      <main className="page-layout overflow-hidden">
        <Image src="/background.jpg" alt="Background" fill style={{ objectFit: 'cover' }} priority />
        <div className="flex min-h-screen items-center justify-center relative z-10">
          <p className="text-white">Loading...</p>
        </div>
      </main>
    )
  }

  if (!user) return null

  // Check which search results are already friends
  const friendUsernames = new Set(friends.map(f => f.username))

  return (
    <main className="page-layout overflow-hidden">
      <DungeonBackground />
      <SlideUpPage>
        <div className="page-padded w-full">
          <section className="pixel-panel w-full max-w-[960px] p-8 flex flex-col gap-6">
            <header className="flex justify-between items-center gap-6">
              <h1 className="heading-xl m-0">Friends</h1>
              <button onClick={() => router.push('/home')} className="text-muted font-medium text-base hover:text-warm transition-colors cursor-pointer border-none bg-transparent">
                &larr; Back to Home
              </button>
            </header>
            <div className="flex flex-col gap-2">
              <label className="text-lg font-semibold m-0 mb-2 drop-shadow-md text-white">Find Players</label>
              <div className="flex flex-col sm:flex-row gap-4">
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => handleSearchChange(e.target.value)}
                  placeholder="Search by username or display name..."
                  className="pixel-input flex-1 px-4 py-2 text-xl"
                />
              </div>
              {searching && <p className="text-base text-white my-4" style={{ fontSize: '24px' }}>Searching...</p>}
              {searchResults.length > 0 && (
                <div className="flex flex-col gap-4 mt-2">
                  {searchResults.map((result) => {
                    const isFriend = friendUsernames.has(result.username)
                    const isAdding = addingUsername === result.username
                    return (
                      <div key={result.username} className="flex items-center gap-4 py-4 px-3 pixel-panel bg-black/20">
                        {result.avatarUrl ? (
                          <img src={result.avatarUrl} alt="" className="w-9 h-9 rounded-full object-cover border-[2px] border-border" />
                        ) : (
                          <div className="w-9 h-9 rounded-full border-[2px] border-border bg-black/50 flex flex-col items-center justify-center text-[22px] leading-none"><span>👤</span></div>
                        )}
                        <div style={{ flex: 1 }}>
                          <Link href={`/profile/${encodeURIComponent(result.username)}`} style={{ textDecoration: 'none' }}>
                            <span className="text-base font-semibold text-white hover:underline cursor-pointer block">
                              {result.displayName || result.username}
                            </span>
                          </Link>
                          <span className="text-sm text-muted">@{result.username}</span>
                        </div>
                        {isFriend ? (
                          <span style={{ color: '#86efac', fontSize: '20px', fontWeight: 600 }}>Friends ✓</span>
                        ) : (
                          <button
                            onClick={() => addFriendByUsername(result.username)}
                            disabled={isAdding || addingFriend}
                            className="pixel-btn-primary px-4 py-2 text-xl"
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
                <p className="text-base text-white my-4" style={{ fontSize: '24px' }}>No players found</p>
              )}
            </div>
            <AddFriendForm
              friendUsername={friendUsername}
              addingFriend={addingFriend}
              canSubmit={canSubmit}
              onUsernameChange={setFriendUsername}
              onSubmit={onAddFriend}
            />
            {error && <p className="text-error m-0 text-base">{error}</p>}
            {success && <p className="text-success m-0 text-base">{success}</p>}
            {loadingFriends ? (
              <p className="text-base text-white my-4">Loading friends...</p>
            ) : friends.length === 0 ? (
              <p className="text-base text-white my-4">No friends yet. Search for players above to add them.</p>
            ) : (
              <div className="grid grid-cols-[repeat(auto-fill,minmax(240px,1fr))] gap-6">
                {friends.map((friend) => (
                  <FriendCard key={friend.id} friend={friend} />
                ))}
              </div>
            )}
          </section>
        </div>
      </SlideUpPage>
    </main>
  )
}

