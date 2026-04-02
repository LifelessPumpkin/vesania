import Link from 'next/link'
import { useRouter } from 'next/navigation'

import type { Friend } from '../types'

type FriendCardProps = {
  friend: Friend
}

export function FriendCard({ friend }: FriendCardProps) {
  const router = useRouter()

  return (
    <article className="pixel-panel p-4 flex flex-col justify-between h-full bg-black/40 gap-4 hover:border-accent transition-colors">
      <div>
        <Link href={`/profile/${encodeURIComponent(friend.username)}`} style={{ textDecoration: 'none' }}>
          <h2 className="text-lg font-bold text-white hover:underline cursor-pointer m-0">{friend.username}</h2>
        </Link>
        <p className={`text-sm uppercase tracking-wider font-semibold my-1 ${friend.online ? 'text-success' : 'text-faint'}`}>
          {friend.online ? 'Online' : 'Offline'}
        </p>
        <p className="text-sm text-faint m-0 mt-2">
          Last online at {new Date(friend.since).toLocaleDateString()}{' '}
          {new Date(friend.since).toLocaleTimeString()}
        </p>
      </div>
      {friend.online ? (
        <button
          onClick={() => router.push(`/match?friend=${encodeURIComponent(friend.username)}`)}
          className="pixel-btn-primary w-full mt-auto py-2 text-lg"
        >
          Play Game
        </button>
      ) : (
        <p className="text-sm text-faint text-center italic mt-auto">Can’t play while offline</p>
      )}
    </article>
  )
}
