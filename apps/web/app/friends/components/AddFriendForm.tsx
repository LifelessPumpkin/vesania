

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
    <form onSubmit={onSubmit} className="flex flex-col gap-2">
      <label htmlFor="friend-username" className="text-lg font-semibold m-0 mb-2 drop-shadow-md text-white">
        Add friend by username
      </label>
      <div className="flex flex-col sm:flex-row gap-4">
        <input
          id="friend-username"
          type="text"
          value={friendUsername}
          onChange={(e) => onUsernameChange(e.target.value)}
          placeholder="Enter username"
          className="pixel-input flex-1 px-4 py-2 text-xl"
        />
        <button type="submit" disabled={!canSubmit} className="pixel-btn-primary px-4 py-2 text-xl">
          {addingFriend ? 'Adding...' : 'Add Friend'}
        </button>
      </div>
    </form>
  )
}
