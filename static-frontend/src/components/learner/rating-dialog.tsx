import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogBody,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "@/components/ui/toaster";
import { Star, Loader2, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { courses, reviews, ApiError } from "@/lib/api-client";

interface RatingDialogProps {
  courseId: string;
  courseName: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

export function RatingDialog({
  courseId,
  courseName,
  open,
  onOpenChange,
  onSuccess,
}: RatingDialogProps) {
  const [rating, setRating] = useState(0);
  const [hoverRating, setHoverRating] = useState(0);
  const [comment, setComment] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [loading, setLoading] = useState(false);
  const { t } = useTranslation();
  const [existingReviewId, setExistingReviewId] = useState<string | null>(null);

  // Fetch existing review when dialog opens
  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    setLoading(true);
    courses.getMyReview(courseId).then(({ review }) => {
      if (cancelled) return;
      if (review) {
        setExistingReviewId(review.id);
        setRating(review.rating);
        setComment(review.comment || "");
      } else {
        setExistingReviewId(null);
        setRating(0);
        setComment("");
      }
    }).catch(() => {
      // Ignore - user can still create
    }).finally(() => {
      if (!cancelled) setLoading(false);
    });
    return () => { cancelled = true; };
  }, [open, courseId]);

  // Reset state when dialog closes
  const handleOpenChange = (open: boolean) => {
    if (!open) {
      setRating(0);
      setHoverRating(0);
      setComment("");
      setExistingReviewId(null);
    }
    onOpenChange(open);
  };

  const handleSubmit = async () => {
    if (rating === 0) {
      toast({ title: t("rating.pleaseSelectRating"), variant: "error" });
      return;
    }

    setSubmitting(true);
    try {
      if (existingReviewId) {
        await reviews.update(existingReviewId, { rating, comment: comment || undefined });
        toast({ title: t("rating.reviewUpdated"), variant: "success" });
      } else {
        await courses.createReview(courseId, { rating, comment: comment || undefined });
        toast({ title: t("rating.thankYou"), variant: "success" });
      }
      handleOpenChange(false);
      onSuccess?.();
    } catch (error) {
      const message = error instanceof ApiError ? error.message : t("rating.failedToSubmit");
      toast({ title: message, variant: "error" });
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!existingReviewId) return;
    setDeleting(true);
    try {
      await reviews.delete(existingReviewId);
      toast({ title: t("rating.reviewDeleted"), variant: "success" });
      handleOpenChange(false);
      onSuccess?.();
    } catch (error) {
      const message = error instanceof ApiError ? error.message : t("rating.failedToDelete");
      toast({ title: message, variant: "error" });
    } finally {
      setDeleting(false);
    }
  };

  const ratingLabels = [
    "",
    t("rating.poor"),
    t("rating.fair"),
    t("rating.good"),
    t("rating.veryGood"),
    t("rating.excellent"),
  ];

  const isEditing = !!existingReviewId;
  const busy = submitting || deleting;

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent>
        <DialogHeader>
          <div className="w-14 h-14 rounded-full bg-yellow-100 dark:bg-yellow-500/20 flex items-center justify-center mb-3">
            <Star className="w-7 h-7 text-yellow-500 fill-yellow-500" />
          </div>
          <DialogTitle>{isEditing ? t("rating.editReview") : t("rating.rateThisCourse")}</DialogTitle>
          <DialogDescription className="max-w-[280px]">
            {t("rating.howWouldYouRate", { courseName })}
          </DialogDescription>
        </DialogHeader>

        {loading ? (
          <DialogBody className="flex items-center justify-center py-8">
            <Loader2 className="w-6 h-6 animate-spin text-text-2" />
          </DialogBody>
        ) : (
          <DialogBody className="space-y-4">
            {/* Star Rating */}
            <div className="flex flex-col items-center gap-2">
              <div className="flex gap-1.5">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    key={star}
                    type="button"
                    className="p-1.5 focus:outline-none focus:ring-2 focus:ring-primary/30 rounded-xl active:scale-95 transition-transform"
                    onMouseEnter={() => setHoverRating(star)}
                    onMouseLeave={() => setHoverRating(0)}
                    onClick={() => setRating(star)}
                  >
                    <Star
                      className={cn(
                        "w-9 h-9 transition-colors",
                        (hoverRating || rating) >= star
                          ? "fill-yellow-400 text-yellow-400"
                          : "text-neutral-200 dark:text-neutral-600"
                      )}
                    />
                  </button>
                ))}
              </div>
              <span className="text-[13px] font-semibold text-text-2 h-5">
                {ratingLabels[hoverRating || rating] || t("rating.selectARating")}
              </span>
            </div>

            {/* Comment */}
            <div>
              <label className="text-[13px] font-bold text-text-1 block mb-2">
                {t("rating.reviewOptional")}
              </label>
              <Textarea
                placeholder={t("rating.sharePlaceholder")}
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                rows={3}
                className="rounded-2xl border-border/80 bg-muted/30 focus:bg-white dark:focus:bg-card resize-none"
              />
            </div>
          </DialogBody>
        )}

        <DialogFooter className="flex-col gap-2.5">
          <Button 
            onClick={handleSubmit} 
            disabled={rating === 0 || busy || loading}
            className="w-full h-12 rounded-full font-black text-[14px]"
          >
            {submitting ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : isEditing ? (
              t("rating.updateReview")
            ) : (
              t("rating.submitReview")
            )}
          </Button>
          {isEditing && (
            <Button
              variant="ghost"
              onClick={handleDelete}
              disabled={busy}
              className="w-full h-12 rounded-full font-black text-[14px] text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-500/10"
            >
              {deleting ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <>
                  <Trash2 className="w-4 h-4 mr-2" />
                  {t("rating.deleteReview")}
                </>
              )}
            </Button>
          )}
          <Button
            variant="ghost"
            onClick={() => handleOpenChange(false)}
            disabled={busy}
            className="w-full h-12 rounded-full font-black text-[14px] text-text-2"
          >
            {t("rating.cancelBtn")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
