import { useState } from 'react'
import { useAuth } from '@/lib/AuthContext'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Star, Send, Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import { formatDate } from '@/lib/utils'

/**
 * GuideRating - Star rating and review component for guides
 */
export function GuideRating({ guideId, ratings = [], onRatingAdded }) {
  const { user, supabaseClient } = useAuth()
  const [userRating, setUserRating] = useState(0)
  const [hoverRating, setHoverRating] = useState(0)
  const [comment, setComment] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Check if user already rated
  const existingRating = ratings.find(r => r.user_id === user?.id)

  const averageRating = ratings.length > 0
    ? (ratings.reduce((sum, r) => sum + r.rating, 0) / ratings.length).toFixed(1)
    : null

  const handleSubmitRating = async () => {
    if (!user) {
      toast.error('Please sign in to rate guides')
      return
    }
    if (userRating === 0) {
      toast.error('Please select a rating')
      return
    }

    setIsSubmitting(true)
    try {
      const { data, error } = await supabaseClient
        .from('guide_ratings')
        .upsert({
          guide_id: guideId,
          user_id: user.id,
          rating: userRating,
          comment: comment.trim() || null,
        }, {
          onConflict: 'guide_id,user_id'
        })
        .select()
        .single()

      if (error) throw error

      toast.success(existingRating ? 'Rating updated!' : 'Thanks for your rating!')
      setComment('')
      if (onRatingAdded) onRatingAdded(data)
    } catch (error) {
      console.error('Rating error:', error)
      toast.error('Failed to submit rating')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="space-y-6">
      {/* Average Rating Display */}
      {ratings.length > 0 && (
        <div className="flex items-center gap-4 p-4 bg-gray-50 rounded-lg">
          <div className="text-center">
            <div className="text-3xl font-bold text-gray-900">{averageRating}</div>
            <div className="flex items-center justify-center gap-0.5 mt-1">
              {[1, 2, 3, 4, 5].map((star) => (
                <Star
                  key={star}
                  className={`w-4 h-4 ${
                    star <= Math.round(Number(averageRating))
                      ? 'fill-yellow-400 text-yellow-400'
                      : 'text-gray-300'
                  }`}
                />
              ))}
            </div>
            <div className="text-sm text-gray-500 mt-1">
              {ratings.length} {ratings.length === 1 ? 'rating' : 'ratings'}
            </div>
          </div>
        </div>
      )}

      {/* Submit Rating */}
      {user && (
        <div className="space-y-3 p-4 border rounded-lg">
          <p className="font-medium text-sm">
            {existingRating ? 'Update your rating' : 'Rate this guide'}
          </p>
          
          {/* Star Selection */}
          <div className="flex items-center gap-1">
            {[1, 2, 3, 4, 5].map((star) => (
              <button
                key={star}
                type="button"
                onClick={() => setUserRating(star)}
                onMouseEnter={() => setHoverRating(star)}
                onMouseLeave={() => setHoverRating(0)}
                className="p-1 transition-transform hover:scale-110"
              >
                <Star
                  className={`w-8 h-8 transition-colors ${
                    star <= (hoverRating || userRating)
                      ? 'fill-yellow-400 text-yellow-400'
                      : 'text-gray-300 hover:text-yellow-200'
                  }`}
                />
              </button>
            ))}
            {userRating > 0 && (
              <span className="ml-2 text-sm text-gray-600">
                {userRating === 1 && 'Poor'}
                {userRating === 2 && 'Fair'}
                {userRating === 3 && 'Good'}
                {userRating === 4 && 'Very Good'}
                {userRating === 5 && 'Excellent'}
              </span>
            )}
          </div>

          {/* Comment */}
          <Textarea
            placeholder="Add a comment (optional)"
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            rows={2}
            className="resize-none"
          />

          <Button
            onClick={handleSubmitRating}
            disabled={isSubmitting || userRating === 0}
            size="sm"
          >
            {isSubmitting ? (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <Send className="w-4 h-4 mr-2" />
            )}
            {existingRating ? 'Update Rating' : 'Submit Rating'}
          </Button>
        </div>
      )}

      {/* Reviews List */}
      {ratings.length > 0 && (
        <div className="space-y-4">
          <h4 className="font-medium">Reviews</h4>
          {ratings.slice(0, 5).map((review) => (
            <div key={review.id} className="flex gap-3 p-3 bg-gray-50 rounded-lg">
              <Avatar className="w-8 h-8">
                <AvatarFallback className="text-xs">
                  {review.username?.substring(0, 2).toUpperCase() || 'U'}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <span className="font-medium text-sm">{review.username || 'User'}</span>
                  <div className="flex items-center gap-0.5">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <Star
                        key={star}
                        className={`w-3 h-3 ${
                          star <= review.rating
                            ? 'fill-yellow-400 text-yellow-400'
                            : 'text-gray-300'
                        }`}
                      />
                    ))}
                  </div>
                  <span className="text-xs text-gray-500">
                    {formatDate(review.created_at)}
                  </span>
                </div>
                {review.comment && (
                  <p className="text-sm text-gray-600 mt-1">{review.comment}</p>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

export default GuideRating
