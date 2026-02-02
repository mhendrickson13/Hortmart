"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Pill } from "@/components/ui/pill";
import { toast } from "@/components/ui/toaster";
import { Upload } from "lucide-react";

export default function NewCoursePage() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState({
    title: "",
    subtitle: "",
    description: "",
    category: "Design",
    language: "English",
    level: "ALL_LEVELS",
    price: 0,
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const response = await fetch("/api/courses", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to create course");
      }

      toast({
        title: "Course created!",
        description: "Now add modules and lessons to your course.",
        variant: "success",
      });

      router.push(`/manage-courses/${data.course.id}/edit`);
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to create course",
        variant: "error",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const isValid = formData.title.length >= 3;

  return (
    <>
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3 sm:gap-4">
        <div className="min-w-0">
          <h1 className="text-h2 sm:text-h1 font-bold text-text-1">Create course</h1>
          <p className="text-caption sm:text-body-sm text-text-2 mt-0.5 sm:mt-1">
            A simple flow that keeps creators moving. You can publish later.
          </p>
        </div>
        <div className="flex items-center gap-2 sm:gap-2.5 self-start sm:self-auto">
          <Button variant="secondary" size="sm" className="sm:size-default" onClick={() => router.back()}>
            Cancel
          </Button>
          <Button size="sm" className="sm:size-default" onClick={handleSubmit} disabled={!isValid || isLoading}>
            {isLoading ? "Creating..." : "Save draft"}
          </Button>
        </div>
      </div>

      {/* Stepper - Scrollable on mobile */}
      <div className="flex items-center gap-2 sm:gap-2.5 p-2 sm:p-3 rounded-2xl border border-border/95 bg-white/92 overflow-x-auto">
        {[
          { num: 1, title: "Basics", desc: "Title, cover", active: true },
          { num: 2, title: "Pricing", desc: "Free / Paid", active: false },
          { num: 3, title: "Curriculum", desc: "Modules", active: false },
          { num: 4, title: "Publish", desc: "Review", active: false },
        ].map((step) => (
          <div
            key={step.num}
            className={`flex-shrink-0 flex-1 min-w-[120px] sm:min-w-0 flex items-center gap-2 sm:gap-2.5 p-2 sm:p-2.5 rounded-xl border ${
              step.active
                ? "bg-primary-100 border-primary/15"
                : "bg-white/95 border-border/95"
            }`}
          >
            <div
              className={`w-5 h-5 sm:w-6 sm:h-6 rounded-full flex items-center justify-center text-[10px] sm:text-caption font-bold flex-shrink-0 ${
                step.active
                  ? "bg-primary text-white shadow-primary"
                  : "bg-primary/10 text-primary-600 border border-primary/15"
              }`}
            >
              {step.num}
            </div>
            <div className="min-w-0">
              <div className="text-[11px] sm:text-caption font-bold text-text-1 truncate">{step.title}</div>
              <div className="text-[10px] sm:text-[11px] text-text-3 truncate">{step.desc}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Form */}
      <div className="grid grid-cols-1 lg:grid-cols-[1.1fr_0.9fr] gap-3 flex-1 min-h-0">
        <Card className="p-4 flex flex-col gap-4">
          <div className="text-overline text-text-3 uppercase">Course basics</div>

          <div className="rounded-xl border border-border/95 bg-white/95 p-3 space-y-4">
            <div>
              <Label htmlFor="title">Title</Label>
              <Input
                id="title"
                value={formData.title}
                onChange={(e) =>
                  setFormData((f) => ({ ...f, title: e.target.value }))
                }
                placeholder="e.g., T-shirt Design Essentials"
                className="mt-2"
              />
              <p className="text-caption text-text-3 mt-1.5">
                Friendly rule: make the outcome clear (&quot;learn X&quot;, &quot;build Y&quot;).
              </p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-xl border border-border/95 bg-white/95 p-3">
              <Label htmlFor="category">Category</Label>
              <Input
                id="category"
                value={formData.category}
                onChange={(e) =>
                  setFormData((f) => ({ ...f, category: e.target.value }))
                }
                className="mt-2"
              />
            </div>
            <div className="rounded-xl border border-border/95 bg-white/95 p-3">
              <Label htmlFor="language">Language</Label>
              <Input
                id="language"
                value={formData.language}
                onChange={(e) =>
                  setFormData((f) => ({ ...f, language: e.target.value }))
                }
                className="mt-2"
              />
            </div>
          </div>

          <div className="rounded-xl border border-border/95 bg-white/95 p-3">
            <Label htmlFor="description">Description</Label>
            <textarea
              id="description"
              value={formData.description}
              onChange={(e) =>
                setFormData((f) => ({ ...f, description: e.target.value }))
              }
              placeholder="Describe what learners will achieve..."
              className="mt-2 w-full h-24 px-4 py-2 rounded-lg border border-border text-body-sm text-text-1 placeholder:text-text-3 resize-none focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
            />
          </div>

          <div className="rounded-xl border border-border/95 bg-white/95 p-3">
            <Label>Cover image</Label>
            <div className="mt-2 h-36 rounded-xl border border-dashed border-primary/30 bg-primary/5 flex flex-col items-center justify-center gap-2 text-text-2">
              <Upload className="w-6 h-6" />
              <div className="text-caption font-semibold text-text-1">
                Drop an image here
              </div>
              <div className="text-[11px] text-text-3">
                PNG/JPG • Recommended 1600×900
              </div>
              <Pill size="sm">Or click to upload</Pill>
            </div>
          </div>

          <div className="mt-auto flex items-center justify-between">
            <span className="text-caption text-text-3">Saved automatically</span>
            <div className="flex gap-2.5">
              <Button variant="secondary">Back</Button>
              <Button onClick={handleSubmit} disabled={!isValid || isLoading}>
                Next
              </Button>
            </div>
          </div>
        </Card>

        <Card className="p-4 flex flex-col gap-4">
          <div className="text-overline text-text-3 uppercase">Preview</div>

          <div className="rounded-xl border border-border/95 bg-white/95 p-3">
            <div className="h-40 rounded-xl gradient-primary relative overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-br from-white/60 via-transparent to-transparent rotate-12 scale-150" />
            </div>
            <div className="mt-3 font-bold text-body text-text-1">
              {formData.title || "Course title"}
            </div>
            <div className="mt-2 flex gap-2 flex-wrap">
              <Pill size="sm">{formData.category || "Category"}</Pill>
              <Pill size="sm" variant="locked">
                {formData.level.replace("_", " ")}
              </Pill>
              <Pill size="sm" variant="draft">
                Draft
              </Pill>
            </div>
            <p className="mt-3 text-caption text-text-2">
              This is what learners will see in the catalog. Keep it clean and
              specific.
            </p>
            <div className="mt-3 flex gap-2.5">
              <Button variant="secondary" className="flex-1" size="sm">
                Preview page
              </Button>
              <Button className="flex-1" size="sm" disabled={!isValid}>
                Start curriculum
              </Button>
            </div>
          </div>

          <div className="mt-auto">
            <div className="text-overline text-text-3 uppercase mb-3">
              Checklist
            </div>
            <div className="rounded-xl border border-border/95 bg-white/95 p-3">
              <div className="font-bold text-text-1">
                {isValid ? "You're off to a great start" : "Let's get started"}
              </div>
              <p className="text-caption text-text-3 mt-1">
                {isValid
                  ? "Next step: add your first module and lesson."
                  : "Add a title to begin creating your course."}
              </p>
              <div className="mt-3 flex gap-2 flex-wrap">
                <Pill
                  size="sm"
                  variant={formData.title ? "completed" : "locked"}
                >
                  Title
                </Pill>
                <Pill
                  size="sm"
                  variant={formData.description ? "completed" : "locked"}
                >
                  Description
                </Pill>
                <Pill size="sm" variant="locked">
                  Cover
                </Pill>
              </div>
            </div>
          </div>
        </Card>
      </div>
    </>
  );
}
