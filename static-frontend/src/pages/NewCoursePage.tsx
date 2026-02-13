import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { courses as coursesApi } from "@/lib/api-client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowLeft, Loader2 } from "lucide-react";
import { useToast } from "@/components/ui/toaster";

export default function NewCoursePage() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [title, setTitle] = useState("");
  const [subtitle, setSubtitle] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("");
  const [level, setLevel] = useState("ALL_LEVELS");
  const [price, setPrice] = useState("0");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;
    setLoading(true);
    try {
      const result = await coursesApi.create({
        title: title.trim(),
        subtitle: subtitle.trim() || undefined,
        description: description.trim() || undefined,
        category: category.trim() || undefined,
        level: level as any,
        price: parseFloat(price) || 0,
      });
      toast({ title: "Course created", description: "Your new course has been created." });
      navigate(`/manage-courses/${result.course.id}/edit`);
    } catch (error: any) {
      toast({ title: "Error", description: error.message || "Failed to create course", variant: "error" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <div className="flex items-center gap-3 flex-shrink-0">
        <Link to="/manage-courses" className="w-10 h-10 rounded-[16px] border border-border/95 bg-white/95 grid place-items-center hover:bg-muted transition-colors">
          <ArrowLeft className="w-4 h-4 text-text-1" />
        </Link>
        <div>
          <h1 className="text-[20px] font-black tracking-tight text-text-1">New Course</h1>
          <p className="text-[12px] font-extrabold text-text-3 mt-1">Create a new course</p>
        </div>
      </div>

      <Card className="p-6 max-w-2xl">
        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <Label htmlFor="title">Course Title *</Label>
            <Input id="title" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Introduction to Web Development" required className="mt-1.5" />
          </div>
          <div>
            <Label htmlFor="subtitle">Subtitle</Label>
            <Input id="subtitle" value={subtitle} onChange={(e) => setSubtitle(e.target.value)} placeholder="A brief tagline for your course" className="mt-1.5" />
          </div>
          <div>
            <Label htmlFor="description">Description</Label>
            <Textarea id="description" value={description} onChange={(e) => setDescription(e.target.value)} placeholder="What will students learn?" rows={4} className="mt-1.5" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="category">Category</Label>
              <Input id="category" value={category} onChange={(e) => setCategory(e.target.value)} placeholder="e.g. Programming" className="mt-1.5" />
            </div>
            <div>
              <Label>Level</Label>
              <Select value={level} onValueChange={setLevel}>
                <SelectTrigger className="mt-1.5"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL_LEVELS">All Levels</SelectItem>
                  <SelectItem value="BEGINNER">Beginner</SelectItem>
                  <SelectItem value="INTERMEDIATE">Intermediate</SelectItem>
                  <SelectItem value="ADVANCED">Advanced</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div>
            <Label htmlFor="price">Price (USD)</Label>
            <Input id="price" type="number" min="0" step="0.01" value={price} onChange={(e) => setPrice(e.target.value)} className="mt-1.5" />
          </div>
          <div className="flex gap-3 pt-2">
            <Button type="submit" disabled={loading || !title.trim()}>
              {loading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
              Create Course
            </Button>
            <Button type="button" variant="secondary" onClick={() => navigate("/manage-courses")}>Cancel</Button>
          </div>
        </form>
      </Card>
    </>
  );
}
