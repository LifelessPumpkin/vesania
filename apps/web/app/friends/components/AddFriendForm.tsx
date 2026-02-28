import styles from '../friends.module.css'

type AddFriendFormProps = {
  friendUsername: string
  addingFriend: boolean
  canSubmit: boolean
  onUsernameChange: (value: string) => void
  onSubmit: (e: React.FormEvent) => void
}

export function AddFriendForm({
  friendUsername,
  addingFriend,
  canSubmit,
  onUsernameChange,
  onSubmit,
}: AddFriendFormProps) {
  return (
    <form onSubmit={onSubmit} className={styles.addForm}>
      <label htmlFor="friend-username" className={styles.label}>
        Add friend by username
      </label>
      <div className={styles.formRow}>
        <input
          id="friend-username"
          type="text"
          value={friendUsername}
          onChange={(e) => onUsernameChange(e.target.value)}
          placeholder="Enter username"
          className={styles.input}
        />
        <button type="submit" disabled={!canSubmit} className={styles.primaryButton}>
          {addingFriend ? 'Adding...' : 'Add Friend'}
        </button>
      </div>
    </form>
  )
}
