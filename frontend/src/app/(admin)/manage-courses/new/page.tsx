"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Pill } from "@/components/ui/pill";
import { toast } from "@/components/ui/toaster";
import { courses as coursesApi } from "@/lib/api-client";
import { Upload, ArrowLeft, ArrowRight, Check } from "lucide-react";

const STEPS = [
  { num: 1, title: "Basics", desc: "Title, cover, description" },
  { num: 2, title: "Pricing", desc: "Free / Paid" },
  { num: 3, title: "Curriculum", desc: "Modules & lessons" },
  { num: 4, title: "Publish", desc: "Review & launch" },
];

export default function NewCoursePage() {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [step, setStep] = useState(1);
  const [coverImage, setCoverImage] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    title: "",
    subtitle: "",
    description: "",
    category: "Design",
    language: "English",
    level: "ALL_LEVELS",
    price: 0,
    isFree: true,
  });

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (!file.type.startsWith("image/")) {
        toast({ title: "Please select an image file", variant: "error" });
        return;
      }
      const reader = new FileReader();
      reader.onload = (e) => {
        setCoverImage(e.target?.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file && file.type.startsWith("image/")) {
      const reader = new FileReader();
      reader.onload = (e) => {
        setCoverImage(e.target?.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = async () => {
    setIsLoading(true);

    try {
      const result = await coursesApi.create({
        title: formData.title,
        subtitle: formData.subtitle || undefined,
        description: formData.description || undefined,
        category: formData.category || undefined,
        language: formData.language || undefined,
        level: formData.level as "BEGINNER" | "INTERMEDIATE" | "ADVANCED" | "ALL_LEVELS",
        price: formData.isFree ? 0 : formData.price,
        coverImage: coverImage || undefined,
      });

      toast({
        title: "Course created!",
        description: "Now add modules and lessons to your course.",
        variant: "success",
      });

      router.push(`/manage-courses/${result.course.id}/edit`);
    } catch (error) {
      toast({
        title: "Error",
        description:
          error instanceof Error ? error.message : "Failed to create course",
        variant: "error",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const isValid = formData.title.length >= 3;

  const canProceed = () => {
    switch (step) {
      case 1:
        return formData.title.length >= 3;
      case 2:
        return true;
      case 3:
        return true;
      case 4:
        return isValid;
      default:
        return false;
    }
  };

  const handleNext = () => {
    if (step < 4) {
      setStep(step + 1);
    } else {
      handleSubmit();
    }
  };

  const handleBack = () => {
    if (step > 1) {
      setStep(step - 1);
    } else {
      router.back();
    }
  };

  return (
    <>
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3 sm:gap-4">
        <div className="min-w-0">
          <h1 className="text-h2 sm:text-h1 font-bold text-text-1">
            Create course
          </h1>
          <p className="text-caption sm:text-body-sm text-text-2 mt-0.5 sm:mt-1">
            A simple flow that keeps creators moving. You can publish later.
          </p>
        </div>
        <div className="flex items-center gap-2 sm:gap-2.5 self-start sm:self-auto">
          <Button
            variant="secondary"
            size="sm"
            className="sm:size-default"
            onClick={() => router.back()}
          >
            Cancel
          </Button>
          <Button
            size="sm"
            className="sm:size-default"
            onClick={handleSubmit}
            disabled={!isValid || isLoading}
          >
            {isLoading ? "Creating..." : "Save draft"}
          </Button>
        </div>
      </div>

      {/* Stepper */}
      <div className="flex items-center gap-2 sm:gap-2.5 p-2 sm:p-3 rounded-2xl border border-border/95 bg-white/92 overflow-x-auto">
        {STEPS.map((s) => (
          <button
            key={s.num}
            onClick={() => s.num <= step && setStep(s.num)}
            className={`flex-shrink-0 flex-1 min-w-[120px] sm:min-w-0 flex items-center gap-2 sm:gap-2.5 p-2 sm:p-2.5 rounded-xl border transition-colors ${
              s.num === step
                ? "bg-primary-100 border-primary/15"
                : s.num < step
                  ? "bg-success/5 border-success/15 cursor-pointer"
                  : "bg-white/95 border-border/95"
            }`}
          >
            <div
              className={`w-5 h-5 sm:w-6 sm:h-6 rounded-full flex items-center justify-center text-[10px] sm:text-caption font-bold flex-shrink-0 ${
                s.num === step
                  ? "bg-primary text-white shadow-primary"
                  : s.num < step
                    ? "bg-success text-white"
                    : "bg-primary/10 text-primary-600 border border-primary/15"
              }`}
            >
              {s.num < step ? <Check className="w-3 h-3" /> : s.num}
            </div>
            <div className="min-w-0">
              <div className="text-[11px] sm:text-caption font-bold text-text-1 truncate">
                {s.title}
              </div>
              <div className="text-[10px] sm:text-[11px] text-text-3 truncate">
                {s.desc}
              </div>
            </div>
          </button>
        ))}
      </div>

      {/* Form Content */}
      <div className="grid grid-cols-1 lg:grid-cols-[1.1fr_0.9fr] gap-3 flex-1 min-h-0">
        {/* Left Panel - Step Content */}
        <Card className="p-4 flex flex-col gap-4">
          {step === 1 && (
            <>
              <div className="text-overline text-text-3 uppercase">
                Step 1 - Course basics
              </div>

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
                    Short, searchable, benefit-focused.
                  </p>
                </div>
                <div>
                  <Label htmlFor="subtitle">Subtitle</Label>
                  <Input
                    id="subtitle"
                    value={formData.subtitle}
                    onChange={(e) =>
                      setFormData((f) => ({ ...f, subtitle: e.target.value }))
                    }
                    placeholder="A short tagline for your course"
                    className="mt-2"
                  />
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
                    setFormData((f) => ({
                      ...f,
                      description: e.target.value,
                    }))
                  }
                  placeholder="Describe what learners will achieve..."
                  className="mt-2 w-full h-24 px-4 py-2 rounded-lg border border-border text-body-sm text-text-1 placeholder:text-text-3 resize-none focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                />
              </div>

              <div className="rounded-xl border border-border/95 bg-white/95 p-3">
                <Label>Cover image</Label>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleFileSelect}
                />
                <div
                  className="mt-2 h-36 rounded-xl border border-dashed border-primary/30 bg-primary/5 flex flex-col items-center justify-center gap-2 text-text-2 cursor-pointer hover:bg-primary/10 transition-colors relative overflow-hidden"
                  onClick={() => fileInputRef.current?.click()}
                  onDrop={handleDrop}
                  onDragOver={(e) => e.preventDefault()}
                >
                  {coverImage ? (
                    <>
                      <img
                        src={coverImage}
                        alt="Cover"
                        className="absolute inset-0 w-full h-full object-cover"
                      />
                      <div className="absolute inset-0 bg-black/50 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity">
                        <span className="text-white text-caption font-semibold">
                          Click to change
                        </span>
                      </div>
                    </>
                  ) : (
                    <>
                      <Upload className="w-6 h-6" />
                      <div className="text-caption font-semibold text-text-1">
                        Drop an image here
                      </div>
                      <div className="text-[11px] text-text-3">
                        PNG/JPG &bull; Recommended 1600x900
                      </div>
                      <Pill size="sm">Or click to upload</Pill>
                    </>
                  )}
                </div>
              </div>
            </>
          )}

          {step === 2 && (
            <>
              <div className="text-overline text-text-3 uppercase">
                Step 2 - Pricing
              </div>

              <div className="rounded-xl border border-border/95 bg-white/95 p-4 space-y-4">
                <div className="text-[14px] font-black text-text-1">
                  How much will this course cost?
                </div>

                {/* Free/Paid Toggle */}
                <div className="flex gap-3">
                  <button
                    onClick={() =>
                      setFormData((f) => ({ ...f, isFree: true, price: 0 }))
                    }
                    className={`flex-1 p-4 rounded-[18px] border-2 text-center transition-colors ${
                      formData.isFree
                        ? "border-primary bg-primary/5"
                        : "border-border/95 bg-white/95 hover:border-primary/40"
                    }`}
                  >
                    <div className="text-[18px] font-black text-text-1">
                      Free
                    </div>
                    <div className="text-[12px] font-extrabold text-text-3 mt-1">
                      Open access for everyone
                    </div>
                  </button>
                  <button
                    onClick={() =>
                      setFormData((f) => ({
                        ...f,
                        isFree: false,
                        price: f.price || 29.99,
                      }))
                    }
                    className={`flex-1 p-4 rounded-[18px] border-2 text-center transition-colors ${
                      !formData.isFree
                        ? "border-primary bg-primary/5"
                        : "border-border/95 bg-white/95 hover:border-primary/40"
                    }`}
                  >
                    <div className="text-[18px] font-black text-text-1">
                      Paid
                    </div>
                    <div className="text-[12px] font-extrabold text-text-3 mt-1">
                      Set a price for enrollment
                    </div>
                  </button>
                </div>

                {/* Price input (only shown when Paid) */}
                {!formData.isFree && (
                  <div className="rounded-[18px] border border-border/95 bg-white/95 p-3">
                    <Label htmlFor="price">Price (USD)</Label>
                    <Input
                      id="price"
                      type="number"
                      min="0"
                      step="0.01"
                      value={formData.price}
                      onChange={(e) =>
                        setFormData((f) => ({
                          ...f,
                          price: parseFloat(e.target.value) || 0,
                        }))
                      }
                      placeholder="29.99"
                      className="mt-2"
                    />
                    <p className="text-caption text-text-3 mt-1.5">
                      You can change pricing at any time.
                    </p>
                  </div>
                )}
              </div>

              <div className="rounded-xl border border-border/95 bg-white/95 p-3">
                <Label htmlFor="level">Level</Label>
                <select
                  id="level"
                  value={formData.level}
                  onChange={(e) =>
                    setFormData((f) => ({ ...f, level: e.target.value }))
                  }
                  className="mt-2 w-full h-10 px-3 rounded-lg border border-border text-body-sm text-text-1 bg-white focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                >
                  <option value="BEGINNER">Beginner</option>
                  <option value="INTERMEDIATE">Intermediate</option>
                  <option value="ADVANCED">Advanced</option>
                  <option value="ALL_LEVELS">All Levels</option>
                </select>
              </div>
            </>
          )}

          {step === 3 && (
            <>
              <div className="text-overline text-text-3 uppercase">
                Step 3 - Curriculum
              </div>

              <div className="rounded-xl border border-border/95 bg-white/95 p-4 text-center space-y-4">
                <div className="w-16 h-16 mx-auto rounded-2xl gradient-primary flex items-center justify-center">
                  <Upload className="w-8 h-8 text-primary" />
                </div>
                <h3 className="text-[16px] font-black text-text-1">
                  Ready to build your curriculum?
                </h3>
                <p className="text-[13px] font-extrabold text-text-3 max-w-sm mx-auto">
                  After creating the course, you&apos;ll be taken to the course
                  editor where you can add modules, lessons, and videos.
                </p>
                <div className="flex flex-col gap-2 text-left max-w-sm mx-auto">
                  <div className="flex items-center gap-2 text-[13px] font-black text-text-1">
                    <Check className="w-4 h-4 text-success" />
                    Add modules to organize your content
                  </div>
                  <div className="flex items-center gap-2 text-[13px] font-black text-text-1">
                    <Check className="w-4 h-4 text-success" />
                    Add lessons with video and resources
                  </div>
                  <div className="flex items-center gap-2 text-[13px] font-black text-text-1">
                    <Check className="w-4 h-4 text-success" />
                    Reorder content with drag & drop
                  </div>
                </div>
              </div>
            </>
          )}

          {step === 4 && (
            <>
              <div className="text-overline text-text-3 uppercase">
                Step 4 - Review & publish
              </div>

              <div className="rounded-xl border border-border/95 bg-white/95 p-4 space-y-4">
                <h3 className="text-[16px] font-black text-text-1">
                  Review your course
                </h3>

                <div className="space-y-3">
                  <div className="flex items-center justify-between p-3 rounded-[16px] border border-border/95 bg-white/95">
                    <div>
                      <div className="text-[11px] font-black text-text-3 uppercase tracking-[0.3px]">
                        Title
                      </div>
                      <div className="text-[14px] font-black text-text-1 mt-1">
                        {formData.title || "Not set"}
                      </div>
                    </div>
                    <Pill
                      size="sm"
                      variant={formData.title ? "completed" : "locked"}
                    >
                      {formData.title ? "Done" : "Missing"}
                    </Pill>
                  </div>

                  <div className="flex items-center justify-between p-3 rounded-[16px] border border-border/95 bg-white/95">
                    <div>
                      <div className="text-[11px] font-black text-text-3 uppercase tracking-[0.3px]">
                        Price
                      </div>
                      <div className="text-[14px] font-black text-text-1 mt-1">
                        {formData.isFree
                          ? "Free"
                          : `$${formData.price} USD`}
                      </div>
                    </div>
                    <Pill size="sm" variant="completed">
                      Done
                    </Pill>
                  </div>

                  <div className="flex items-center justify-between p-3 rounded-[16px] border border-border/95 bg-white/95">
                    <div>
                      <div className="text-[11px] font-black text-text-3 uppercase tracking-[0.3px]">
                        Category & Level
                      </div>
                      <div className="text-[14px] font-black text-text-1 mt-1">
                        {formData.category} &bull;{" "}
                        {formData.level.replace("_", " ")}
                      </div>
                    </div>
                    <Pill size="sm" variant="completed">
                      Done
                    </Pill>
                  </div>

                  <div className="flex items-center justify-between p-3 rounded-[16px] border border-border/95 bg-white/95">
                    <div>
                      <div className="text-[11px] font-black text-text-3 uppercase tracking-[0.3px]">
                        Cover Image
                      </div>
                      <div className="text-[14px] font-black text-text-1 mt-1">
                        {coverImage ? "Uploaded" : "Not set (optional)"}
                      </div>
                    </div>
                    <Pill
                      size="sm"
                      variant={coverImage ? "completed" : "locked"}
                    >
                      {coverImage ? "Done" : "Optional"}
                    </Pill>
                  </div>
                </div>
              </div>

              <div className="rounded-xl border border-success/25 bg-success/5 p-4 text-center">
                <div className="text-[14px] font-black text-text-1">
                  Your course will be saved as a draft
                </div>
                <p className="text-[12px] font-extrabold text-text-3 mt-1">
                  You can publish it after adding your curriculum content.
                </p>
              </div>
            </>
          )}

          {/* Footer Navigation */}
          <div className="mt-auto flex items-center justify-between pt-4">
            <span className="text-caption text-text-3">
              Step {step} of 4
            </span>
            <div className="flex gap-2.5">
              <Button variant="secondary" onClick={handleBack}>
                <ArrowLeft className="w-4 h-4 mr-1.5" />
                Back
              </Button>
              <Button
                onClick={handleNext}
                disabled={!canProceed() || isLoading}
              >
                {step === 4 ? (
                  isLoading ? (
                    "Creating..."
                  ) : (
                    "Create course"
                  )
                ) : (
                  <>
                    Next
                    <ArrowRight className="w-4 h-4 ml-1.5" />
                  </>
                )}
              </Button>
            </div>
          </div>
        </Card>

        {/* Right Panel - Preview */}
        <Card className="p-4 flex flex-col gap-4">
          <div className="text-overline text-text-3 uppercase">Preview</div>

          <div className="rounded-xl border border-border/95 bg-white/95 p-3">
            <div className="h-40 rounded-xl gradient-primary relative overflow-hidden">
              {coverImage ? (
                <img
                  src={coverImage}
                  alt="Preview"
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="absolute inset-0 bg-gradient-to-br from-white/60 via-transparent to-transparent rotate-12 scale-150" />
              )}
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
              <Pill size="sm">
                {formData.isFree
                  ? "Free"
                  : formData.price > 0
                    ? `$${formData.price}`
                    : "Free"}
              </Pill>
            </div>
            <p className="mt-3 text-caption text-text-2">
              This is what learners will see in the catalog. Keep it clean and
              specific.
            </p>
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
                <Pill size="sm" variant={coverImage ? "completed" : "locked"}>
                  Cover
                </Pill>
                <Pill
                  size="sm"
                  variant={step >= 2 ? "completed" : "locked"}
                >
                  Pricing
                </Pill>
              </div>
            </div>
          </div>
        </Card>
      </div>
    </>
  );
}
