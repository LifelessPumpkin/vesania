import { useRouter } from 'next/navigation'
import styles from '../friends.module.css'
import type { Friend } from '../types'

type FriendCardProps = {
  friend: Friend
}

export function FriendCard({ friend }: FriendCardProps) {
  const router = useRouter()

  return (
    <article className={styles.friendCard}>
      <div>
        <h2 className={styles.friendName}>{friend.username}</h2>
        <p className={`${styles.status} ${friend.online ? styles.online : styles.offline}`}>
          {friend.online ? 'Online' : 'Offline'}
        </p>
        <p className={styles.lastSeen}>
          Last online at {new Date(friend.since).toLocaleDateString()}{' '}
          {new Date(friend.since).toLocaleTimeString()}
        </p>
      </div>
      {friend.online ? (
        <button
          onClick={() => router.push(`/match?friend=${encodeURIComponent(friend.username)}`)}
          className={styles.playButton}
        >
          Play Game
        </button>
      ) : (
        <p className={styles.offlineHint}>Can’t play while offline</p>
      )}
    </article>
  )
}
