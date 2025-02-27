import React, { useState } from 'react'
import {
  CloudStorage,
  createStorage,
  User,
  useUserCloudInfo
} from '../../lib/accounts'

interface CloudStorageSelectProps {
  name?: string
  user: User
  onSelect: (storage: CloudStorage) => void
  onErr?: () => void
  buttonText?: string
}

export default ({
  name,
  user,
  onSelect: onLink,
  onErr,
  buttonText
}: CloudStorageSelectProps) => {
  const [storageName, setStorageName] = useState(name)
  const [isLoading, setIsLoading] = useState(false)
  const [active, setActive] = useState(0)
  const [userInfo, updateUserInfo] = useUserCloudInfo(user)

  if (userInfo === 'loading') {
    return <div>Loading...</div>
  }

  const { subscription, storages } = userInfo
  const canCreateCloudStorages = subscription != null || storages.length < 1

  const createStorageCallback = async () => {
    setIsLoading(true)
    const cloudStorage =
      active > 0
        ? storages.filter(storage => storage.id === active)[0]
        : await createStorage(name || '', user)

    if (cloudStorage === 'SubscriptionRequired') {
      onErr != null ? onErr() : null
    } else {
      updateUserInfo()
      onLink(cloudStorage)
    }
    setIsLoading(false)
  }

  return (
    <div>
      {!canCreateCloudStorages && (
        <>
          <p>You need to upgrade your plan to add a new storage cloud</p>
          <p>Current Plan: Basic</p>
          <p>New Plan: Premium ($3.00/month)</p>
          <button>Upgrade</button>
        </>
      )}

      {canCreateCloudStorages && (
        <>
          <div>
            <label>Link or Create Storage</label>
            <select
              value={active}
              onChange={({ target: { value } }) =>
                setActive(parseInt(value, 10))
              }
            >
              <option value={0}>Create New</option>
              {storages.map(storage => (
                <option key={storage.id} value={storage.id}>
                  {storage.name} (id:{storage.id})
                </option>
              ))}
            </select>
          </div>
          {active === 0 && (
            <div>
              <label>Cloud Storage Name</label>
              <input
                type='text'
                value={storageName !== '' ? storageName : name}
                onChange={e => setStorageName(e.target.value)}
              />
            </div>
          )}
          <div>
            <button onClick={createStorageCallback}>
              {!isLoading ? buttonText || 'Link Storage' : 'Creating...'}
            </button>
          </div>
        </>
      )}
    </div>
  )
}
