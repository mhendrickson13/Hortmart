import { useState } from "react";
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
import { Star, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { courses, ApiError } from "@/lib/api-client";

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

  const handleSubmit = async () => {
    if (rating === 0) {
      toast({ title: "Please select a rating", variant: "error" });
      return;
    }

    setSubmitting(true);
    try {
      await courses.createReview(courseId, { rating, comment: comment || undefined });
      toast({ title: "Thank you for your review!", variant: "success" });
      onOpenChange(false);
      setRating(0);
      setComment("");
      onSuccess?.();
    } catch (error) {
      const message = error instanceof ApiError ? error.message : "Failed to submit review";
      toast({ title: message, variant: "error" });
    } finally {
      setSubmitting(false);
    }
  };

  const ratingLabels = [
    "",
    "Poor",
    "Fair",
    "Good",
    "Very Good",
    "Excellent",
  ];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <div className="w-14 h-14 rounded-full bg-yellow-100 dark:bg-yellow-500/20 flex items-center justify-center mb-3">
            <Star className="w-7 h-7 text-yellow-500 fill-yellow-500" />
          </div>
          <DialogTitle>Rate this course</DialogTitle>
          <DialogDescription className="max-w-[280px]">
            How would you rate &quot;{courseName}&quot;?
          </DialogDescription>
        </DialogHeader>

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
              {ratingLabels[hoverRating || rating] || "Select a rating"}
            </span>
          </div>

          {/* Comment */}
          <div>
            <label className="text-[13px] font-bold text-text-1 block mb-2">
              Review (optional)
            </label>
            <Textarea
              placeholder="Share your experience with this course..."
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              rows={3}
              className="rounded-2xl border-border/80 bg-muted/30 focus:bg-white dark:focus:bg-card resize-none"
            />
          </div>
        </DialogBody>

        <DialogFooter className="flex-col gap-2.5">
          <Button 
            onClick={handleSubmit} 
            disabled={rating === 0 || submitting}
            className="w-full h-12 rounded-full font-black text-[14px]"
          >
            {submitting ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              "Submit Review"
            )}
          </Button>
          <Button
            variant="ghost"
            onClick={() => onOpenChange(false)}
            disabled={submitting}
            className="w-full h-12 rounded-full font-black text-[14px] text-text-2"
          >
            Cancel
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
