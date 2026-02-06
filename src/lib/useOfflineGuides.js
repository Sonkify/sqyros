import { openDB } from 'idb'
import { useState, useEffect, useCallback } from 'react'

const DB_NAME = 'sqyros-offline'
const DB_VERSION = 1
const STORE_NAME = 'guides'

async function getDB() {
  return openDB(DB_NAME, DB_VERSION, {
    upgrade(db) {
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        const store = db.createObjectStore(STORE_NAME, { keyPath: 'id' })
        store.createIndex('savedAt', 'savedAt')
      }
    },
  })
}

export function useOfflineGuides() {
  const [offlineGuides, setOfflineGuides] = useState([])
  const [loading, setLoading] = useState(true)

  // Load all offline guides
  const loadOfflineGuides = useCallback(async () => {
    try {
      const db = await getDB()
      const guides = await db.getAll(STORE_NAME)
      setOfflineGuides(guides.sort((a, b) => b.savedAt - a.savedAt))
    } catch (err) {
      console.error('Error loading offline guides:', err)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadOfflineGuides()
  }, [loadOfflineGuides])

  // Save a guide for offline access
  const saveOffline = useCallback(async (guide) => {
    try {
      const db = await getDB()
      const offlineGuide = {
        id: guide.id || guide.public_id || Date.now().toString(),
        title: guide.guide_content?.title || guide.title || 'Untitled Guide',
        guide_content: guide.guide_content || guide,
        savedAt: Date.now(),
        slug: guide.slug,
        public_id: guide.public_id,
      }
      await db.put(STORE_NAME, offlineGuide)
      await loadOfflineGuides()
      return true
    } catch (err) {
      console.error('Error saving guide offline:', err)
      return false
    }
  }, [loadOfflineGuides])

  // Remove a guide from offline storage
  const removeOffline = useCallback(async (guideId) => {
    try {
      const db = await getDB()
      await db.delete(STORE_NAME, guideId)
      await loadOfflineGuides()
      return true
    } catch (err) {
      console.error('Error removing offline guide:', err)
      return false
    }
  }, [loadOfflineGuides])

  // Check if a guide is saved offline
  const isOffline = useCallback((guideId) => {
    return offlineGuides.some(g => g.id === guideId)
  }, [offlineGuides])

  // Get a specific offline guide
  const getOfflineGuide = useCallback(async (guideId) => {
    try {
      const db = await getDB()
      return await db.get(STORE_NAME, guideId)
    } catch (err) {
      console.error('Error getting offline guide:', err)
      return null
    }
  }, [])

  return {
    offlineGuides,
    loading,
    saveOffline,
    removeOffline,
    isOffline,
    getOfflineGuide,
    refresh: loadOfflineGuides,
  }
}

export default useOfflineGuides
