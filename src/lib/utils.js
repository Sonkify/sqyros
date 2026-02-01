import { clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs) {
  return twMerge(clsx(inputs))
}

export function formatDate(date) {
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  }).format(new Date(date))
}

export function formatRelativeTime(date) {
  const now = new Date()
  const then = new Date(date)
  const diffInSeconds = Math.floor((now - then) / 1000)

  if (diffInSeconds < 60) return 'just now'
  if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`
  if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h ago`
  if (diffInSeconds < 604800) return `${Math.floor(diffInSeconds / 86400)}d ago`
  return formatDate(date)
}

export function truncate(str, length = 50) {
  if (!str) return ''
  return str.length > length ? str.substring(0, length) + '...' : str
}

export function capitalizeFirst(str) {
  if (!str) return ''
  return str.charAt(0).toUpperCase() + str.slice(1)
}

export function slugify(str) {
  return str
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')
}

// Model display helpers
export function getModelDisplayName(model) {
  if (model?.includes('opus')) return 'Advanced AI (Opus)'
  if (model?.includes('sonnet')) return 'Fast AI (Sonnet)'
  return 'AI'
}

export function getModelColor(model) {
  if (model?.includes('opus')) return 'text-purple-500'
  if (model?.includes('sonnet')) return 'text-cyan-500'
  return 'text-gray-500'
}

// Usage helpers
export const TIER_LIMITS = {
  free: {
    guidesPerMonth: 3,
    questionsPerDay: 5,
    savedGuides: 5,
  },
  pro: {
    guidesPerMonth: Infinity,
    questionsPerDay: Infinity,
    savedGuides: Infinity,
  },
}

export function getRemainingUsage(tier, usage) {
  const limits = TIER_LIMITS[tier] || TIER_LIMITS.free
  return {
    guides: Math.max(0, limits.guidesPerMonth - (usage?.guides_generated || 0)),
    questions: Math.max(0, limits.questionsPerDay - (usage?.questions_asked || 0)),
  }
}
