import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Star, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { courses, type ReviewWithUser, type ReviewStats as ApiReviewStats } from "@/lib/api-client";
import { useTranslation } from "react-i18next";

type Review = ReviewWithUser;

interface ReviewStats {
  averageRating: number;
  totalReviews: number;
  distribution: { rating: number; count: number }[];
}

interface ReviewsSectionProps {
  courseId: string;
  initialStats?: ReviewStats;
}

export function ReviewsSection({ courseId, initialStats }: ReviewsSectionProps) {
  const [reviews, setReviews] = useState<Review[]>([]);
  const [stats, setStats] = useState<ReviewStats | null>(initialStats || null);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const { t, i18n } = useTranslation();

  useEffect(() => {
    fetchReviews(1);
  }, [courseId]);

  const fetchReviews = async (pageNum: number) => {
    try {
      const data = await courses.getReviews(courseId, { page: pageNum, limit: 5 });
      
      // Convert distribution from Record to array format
      const distribution = Object.entries(data.stats.distribution).map(([rating, count]) => ({
        rating: parseInt(rating),
        count: count as number,
      }));

      if (pageNum === 1) {
        setReviews(data.reviews);
        setStats({
          averageRating: data.stats.averageRating,
          totalReviews: data.stats.totalReviews,
          distribution,
        });
      } else {
        setReviews(prev => [...prev, ...data.reviews]);
      }
      setHasMore(pageNum < data.pagination.totalPages);
      setPage(pageNum);
    } catch (error) {
      console.error("Failed to fetch reviews:", error);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString(i18n.language, {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  const renderStars = (rating: number) => {
    return (
      <div className="flex gap-0.5">
        {[1, 2, 3, 4, 5].map((star) => (
          <Star
            key={star}
            className={cn(
              "w-4 h-4",
              rating >= star
                ? "fill-yellow-400 text-yellow-400"
                : "text-text-3/40 dark:text-text-3/30"
            )}
          />
        ))}
      </div>
    );
  };

  if (loading) {
    return (
      <Card className="p-6 text-center">
        <Loader2 className="w-6 h-6 animate-spin mx-auto text-primary" />
        <p className="text-body-sm text-text-2 mt-2">{t("reviews.loadingReviews")}</p>
      </Card>
    );
  }

  if (!stats || stats.totalReviews === 0) {
    return (
      <Card className="p-6 text-center">
        <Star className="w-10 h-10 text-text-3 mx-auto mb-2" />
        <p className="text-body-sm text-text-2">
          {t("reviews.noReviewsYet")}
        </p>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* Rating Summary */}
      <Card className="p-4 lg:p-6">
        <h2 className="text-body lg:text-h3 font-semibold text-text-1 mb-4">
          {t("reviews.studentReviews")}
        </h2>
        
        <div className="flex flex-col sm:flex-row gap-6">
          {/* Average Rating */}
          <div className="text-center sm:text-left sm:pr-6 sm:border-r border-border">
            <div className="text-4xl font-bold text-text-1">
              {stats.averageRating.toFixed(1)}
            </div>
            <div className="flex justify-center sm:justify-start mt-1">
              {renderStars(Math.round(stats.averageRating))}
            </div>
            <p className="text-caption text-text-3 mt-1">
              {t("reviews.review", { count: stats.totalReviews })}
            </p>
          </div>

          {/* Rating Distribution */}
          <div className="flex-1 space-y-2">
            {(() => {
              // Find the maximum count to use as reference for bar width
              const maxCount = Math.max(...stats.distribution.map(d => d.count), 1);
              
              return [5, 4, 3, 2, 1].map((rating) => {
                const count = stats.distribution.find((d) => d.rating === rating)?.count || 0;
                // Bar fills relative to the rating with most reviews (max = 100%)
                const percent = maxCount > 0 ? (count / maxCount) * 100 : 0;
                
                return (
                  <div key={rating} className="flex items-center gap-2">
                    <span className="text-caption text-text-2 w-3">{rating}</span>
                    <Star className="w-3.5 h-3.5 fill-yellow-400 text-yellow-400" />
                    <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
                      <div
                        className="h-full bg-yellow-400 rounded-full transition-all"
                        style={{ width: `${percent}%` }}
                      />
                    </div>
                    <span className="text-caption text-text-3 w-8 text-right">{count}</span>
                  </div>
                );
              });
            })()}
          </div>
        </div>
      </Card>

      {/* Reviews List */}
      <div className="space-y-3">
        {reviews.map((review) => (
          <Card key={review.id} className="p-4">
            <div className="flex items-start gap-3">
              <Avatar className="w-10 h-10 flex-shrink-0">
                <AvatarImage src={review.user.image || undefined} />
                <AvatarFallback>{review.user.name?.[0] || "U"}</AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-body-sm font-semibold text-text-1">
                    {review.user.name || t("reviews.anonymous")}
                  </span>
                  <span className="text-caption text-text-3">
                    {formatDate(review.createdAt)}
                  </span>
                </div>
                <div className="mb-2">
                  {renderStars(review.rating)}
                </div>
                {review.comment && (
                  <p className="text-body-sm text-text-2">{review.comment}</p>
                )}
              </div>
            </div>
          </Card>
        ))}
      </div>

      {/* Load More */}
      {hasMore && (
        <Button
          variant="secondary"
          className="w-full"
          onClick={() => fetchReviews(page + 1)}
        >
          {t("reviews.loadMore")}
        </Button>
      )}
    </div>
  );
}
