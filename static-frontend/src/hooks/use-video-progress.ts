/**
 * useVideoProgress — Centralized hook for video lesson progress tracking.
 *
 * Responsibilities:
 * - Periodic save (every 5s mark via VideoPlayer onProgress)
 * - Immediate save on pause (VideoPlayer fires onProgress in onPause)
 * - Save on lesson switch (saveBeforeSwitch)
 * - Save on page close / tab hide (fire-and-forget fetch with keepalive)
 * - Save on unmount (cleanup)
 * - Local progress overrides (never downgrade %) for instant sidebar updates
 *
 * Duration resolution chain:
 *   1. Live DOM: videoRef.getDuration()
 *   2. Cached: lastKnownDurationRef (updated on every timeupdate)
 *   3. Metadata: lesson.durationSeconds (from API)
 *   If ALL return 0, save still fires with progressPercent=0 — backend stores
 *   the lastWatchedTimestamp regardless, and GREATEST keeps the existing %.
 */

import { useRef, useCallback, useEffect, useState } from "react";
import { lessons as lessonsApi } from "@/lib/api-client";
import { getStoredToken } from "@/lib/auth-context";
import { toast } from "@/components/ui/toaster";
import type { VideoPlayerRef } from "@/components/learner/video-player";

// ── Types ──

interface ProgressSnapshot {
  progressPercent: number;
  completedAt: Date | null;
  lastWatchedTimestamp: number;
  lastWatchedAt?: string | null;
}

interface LessonLike {
  id: string;
  durationSeconds: number;
  progress: ProgressSnapshot | null;
}

interface UseVideoProgressOptions {
  allLessons: LessonLike[];
  currentLessonId: string | undefined;
  isPreview: boolean;
  videoRef: React.RefObject<VideoPlayerRef | null>;
}

const API_BASE = import.meta.env.VITE_API_URL || "";

// ── Hook ──

export function useVideoProgress({
  allLessons,
  currentLessonId,
  isPreview,
  videoRef,
}: UseVideoProgressOptions) {
  // ─── Stable refs ───
  const currentLessonIdRef = useRef(currentLessonId);
  const currentTimeRef = useRef(0);
  const lastKnownDurationRef = useRef(0);
  const lastSavedSecondRef = useRef(0);
  const saveFailCountRef = useRef(0);
  // Transition guard: true while switching lessons → blocks stale onPause saves
  const isTransitioningRef = useRef(false);
  // Dedup unload: prevents the same position being saved multiple times on close
  const savedOnUnloadRef = useRef(false);

  // ─── Watch-time tracking ───
  /** Previous timeupdate value — used to compute delta (only counts forward non-seek movement) */
  const prevTimeRef = useRef(0);
  /** Accumulated real watched seconds since last save */
  const watchedSinceLastSaveRef = useRef(0);
  /** True when user is currently seeking (skip detection) */
  const isSeekingRef = useRef(false);
  /** Whether we already counted a view for this lesson play session */
  const viewCountedRef = useRef(false);

  // Keep refs in sync every render
  currentLessonIdRef.current = currentLessonId;

  const allLessonsRef = useRef(allLessons);
  allLessonsRef.current = allLessons;

  // ─── Local progress overrides ───
  const [progressOverrides, setProgressOverrides] = useState<
    Record<string, ProgressSnapshot>
  >({});

  const getProgress = useCallback(
    (lesson: { id: string; progress: ProgressSnapshot | null }) => {
      const override = progressOverrides[lesson.id];
      const base = lesson.progress || {
        progressPercent: 0,
        completedAt: null,
        lastWatchedTimestamp: 0,
      };
      if (!override) return base;
      // Never let a null override erase a real completedAt
      return {
        ...base,
        ...override,
        completedAt: override.completedAt || base.completedAt,
      };
    },
    [progressOverrides],
  );

  // ─── Duration resolution ───
  const resolveDuration = useCallback(
    (lessonId: string): number => {
      // 1. Live from player DOM
      const videoDur = videoRef.current?.getDuration() ?? 0;
      if (videoDur > 0 && isFinite(videoDur)) return videoDur;
      // 2. Cached from last timeupdate
      if (lastKnownDurationRef.current > 0) return lastKnownDurationRef.current;
      // 3. Metadata from API
      const lesson = allLessonsRef.current.find((l) => l.id === lessonId);
      return lesson?.durationSeconds || 0;
    },
    [videoRef],
  );

  // ─── Core save ───
  const saveProgress = useCallback(
    (lessonId: string, time: number, fireAndForget = false) => {
      if (isPreview) {
        console.log("[Progress] skip: preview mode");
        return;
      }
      if (!lessonId) {
        console.warn("[Progress] skip: no lessonId");
        return;
      }
      if (time < 1) {
        console.log("[Progress] skip: time < 1 →", time);
        return;
      }

      // Dedup: skip if same second already saved (except fire-and-forget)
      const sec = Math.floor(time);
      if (sec === lastSavedSecondRef.current && !fireAndForget) {
        return; // silent dedup
      }
      lastSavedSecondRef.current = sec;

      // Resolve duration — if unknown, still save with pct=0
      // Backend uses GREATEST so pct=0 won't downgrade existing %
      const dur = resolveDuration(lessonId);
      const pct = dur > 0 ? Math.min(Math.round((time / dur) * 100), 100) : 0;

      // Flush accumulated watched seconds
      const watchedDelta = Math.floor(watchedSinceLastSaveRef.current);
      watchedSinceLastSaveRef.current -= watchedDelta; // keep fractional remainder

      // View count increment — only on first play of this session
      const viewInc = viewCountedRef.current ? 0 : 1;
      if (viewInc === 1) viewCountedRef.current = true;

      const payload = {
        progressPercent: pct,
        lastWatchedTimestamp: sec,
        watchedSeconds: watchedDelta,
        viewCountIncrement: viewInc,
      };

      console.log("[Progress] saving:", lessonId.slice(-6), payload, fireAndForget ? "(keepalive)" : "");

      // Update local overrides — NEVER downgrade % or lose completedAt
      setProgressOverrides((prev) => {
        const existing = prev[lessonId];
        const safePct = existing
          ? Math.max(existing.progressPercent, pct)
          : pct;
        // Preserve completedAt from override, or look up from original lesson data
        const existingCompleted = existing?.completedAt
          || allLessonsRef.current.find((l) => l.id === lessonId)?.progress?.completedAt
          || null;
        return {
          ...prev,
          [lessonId]: {
            progressPercent: safePct,
            completedAt: existingCompleted,
            lastWatchedTimestamp: sec,
            lastWatchedAt: new Date().toISOString(),
          },
        };
      });

      if (fireAndForget) {
        // Page-unload path: keepalive keeps the request alive after page closes
        const url = `${API_BASE}/lessons/${lessonId}/progress`;
        const token = getStoredToken();
        fetch(url, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
          body: JSON.stringify(payload),
          keepalive: true,
        }).catch((err) => {
          console.warn("[Progress] keepalive save failed:", err);
        });
      } else {
        lessonsApi
          .updateProgress(lessonId, payload)
          .then(() => {
            saveFailCountRef.current = 0;
            console.log("[Progress] ✓ saved:", lessonId.slice(-6), payload);
          })
          .catch((err) => {
            saveFailCountRef.current++;
            console.error("[Progress] ✗ save FAILED:", err);
            if (saveFailCountRef.current >= 3) {
              toast({
                title: "Progress saving failed",
                description:
                  "Your progress may not be saved. Check your connection.",
                variant: "warning",
              });
              saveFailCountRef.current = 0; // reset to allow future toasts
            }
          });
      }
    },
    [isPreview, resolveDuration],
  );

  // ─── Callbacks for VideoPlayer ───

  /** Called by VideoPlayer every 5-second mark + on pause.
   *  NO debounce — VideoPlayer already deduplicates at 5s intervals.
   *  Blocked during lesson transitions to prevent cross-contamination
   *  (old video's onPause saving against the new lesson ID).
   */
  const handleProgress = useCallback(
    (_progress: number, currentTime: number) => {
      const lid = currentLessonIdRef.current;
      if (!lid || isPreview) return;
      if (isTransitioningRef.current) {
        console.log("[Progress] skip: transitioning (stale onPause blocked)");
        return;
      }
      saveProgress(lid, currentTime);
    },
    [saveProgress, isPreview],
  );

  /** Called when video reaches ≥95% (completion threshold) */
  const handleComplete = useCallback(async () => {
    const lid = currentLessonIdRef.current;
    if (!lid || isPreview) return;

    try {
      // Use real percentage — don't inflate to 100
      const time = currentTimeRef.current;
      const dur = resolveDuration(lid);
      const realPct = dur > 0 ? Math.min(Math.round((time / dur) * 100), 100) : 100;
      const sec = Math.floor(time);
      console.log("[Progress] completing lesson:", lid.slice(-6), "realPct:", realPct);
      await lessonsApi.updateProgress(lid, {
        progressPercent: realPct,
        lastWatchedTimestamp: sec,
      });
      setProgressOverrides((prev) => {
        const existing = prev[lid];
        const safePct = existing ? Math.max(existing.progressPercent, realPct) : realPct;
        return {
          ...prev,
          [lid]: {
            progressPercent: safePct,
            completedAt: new Date(),
            lastWatchedTimestamp: sec,
          },
        };
      });
      toast({
        title: "Lesson completed!",
        description: "Great job! Keep up the good work.",
        variant: "success",
      });
    } catch (err) {
      console.error("[Progress] complete FAILED:", err);
    }
  }, [isPreview, resolveDuration]);

  /** Called on every timeupdate — updates refs only, no re-render.
   *  Also clears the transition guard once the new video is actually playing.
   *  Accumulates actual watched seconds (ignores seeks/skips).
   */
  const handleTimeUpdate = useCallback(
    (time: number) => {
      currentTimeRef.current = time;
      // Clear transition flag once the new video is producing real time updates
      if (isTransitioningRef.current && time > 0) {
        console.log("[Progress] transition ended — new video playing at", Math.floor(time));
        isTransitioningRef.current = false;
        savedOnUnloadRef.current = false; // allow future unload saves
      }
      // Accumulate real watch time: only count small forward deltas (normal playback).
      // Seeking produces large jumps which we ignore.
      if (!isSeekingRef.current && prevTimeRef.current > 0) {
        const delta = time - prevTimeRef.current;
        // Normal playback: delta is 0.1–2s (depends on playback rate + timeupdate freq).
        // Seeking: delta is huge or negative. Only count if 0 < delta <= 3.
        if (delta > 0 && delta <= 3) {
          watchedSinceLastSaveRef.current += delta;
        }
      }
      prevTimeRef.current = time;
      // Cache duration
      const dur = videoRef.current?.getDuration();
      if (dur && dur > 0 && isFinite(dur)) {
        lastKnownDurationRef.current = dur;
      }
    },
    [videoRef],
  );

  /** Called when seeking starts — stop accumulating watch time */
  const handleSeeking = useCallback(() => {
    isSeekingRef.current = true;
  }, []);

  /** Called when seeking ends — resume accumulating from the new position */
  const handleSeeked = useCallback(() => {
    isSeekingRef.current = false;
    // Reset prevTime so the next timeupdate delta won't be a huge jump
    prevTimeRef.current = 0;
  }, []);

  /** Call before switching lessons — saves current + resets refs.
   *  Sets transition guard to block stale onPause saves from the old video.
   */
  const saveBeforeSwitch = useCallback(() => {
    const lid = currentLessonIdRef.current;
    const time = currentTimeRef.current;
    // Activate transition guard BEFORE anything else
    isTransitioningRef.current = true;
    if (lid && time >= 1) {
      console.log("[Progress] saveBeforeSwitch:", lid.slice(-6), "@", Math.floor(time));
      saveProgress(lid, time);
    }
    // Reset tracking refs for the incoming lesson
    currentTimeRef.current = 0;
    lastSavedSecondRef.current = 0;
    lastKnownDurationRef.current = 0;
    savedOnUnloadRef.current = false;
    prevTimeRef.current = 0;
    watchedSinceLastSaveRef.current = 0;
    isSeekingRef.current = false;
    viewCountedRef.current = false;
  }, [saveProgress]);

  // ─── Page-close & tab-hide handlers ───
  useEffect(() => {
    if (isPreview) return;

    const handleUnload = () => {
      // Prevent duplicate unload saves (beforeunload + visibilitychange + cleanup)
      if (savedOnUnloadRef.current) {
        console.log("[Progress] skip unload: already saved");
        return;
      }
      const lid = currentLessonIdRef.current;
      const time = currentTimeRef.current;
      if (lid && time >= 1) {
        savedOnUnloadRef.current = true;
        console.log("[Progress] unload save:", lid.slice(-6), time);
        saveProgress(lid, time, true);
      }
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === "hidden") handleUnload();
    };

    window.addEventListener("beforeunload", handleUnload);
    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      handleUnload(); // Save on unmount too
      window.removeEventListener("beforeunload", handleUnload);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [isPreview, saveProgress]);

  return {
    progressOverrides,
    getProgress,
    handleProgress,
    handleComplete,
    handleTimeUpdate,
    handleSeeking,
    handleSeeked,
    saveBeforeSwitch,
    currentTimeRef,
  };
}
