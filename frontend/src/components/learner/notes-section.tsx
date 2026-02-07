"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "@/components/ui/toaster";
import { lessons, notes as notesApi, ApiError, type Note } from "@/lib/api-client";
import {
  StickyNote,
  Plus,
  Clock,
  Edit,
  Trash2,
  Save,
  X,
  Loader2,
} from "lucide-react";

interface NotesSectionProps {
  lessonId: string;
  currentTime: number;
  onSeek: (time: number) => void;
}

export function NotesSection({ lessonId, currentTime, onSeek }: NotesSectionProps) {
  const { data: session } = useSession();
  const [notes, setNotes] = useState<Note[]>([]);
  const [newNote, setNewNote] = useState("");
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editContent, setEditContent] = useState("");
  const [showAddForm, setShowAddForm] = useState(false);

  useEffect(() => {
    if (session?.user) {
      fetchNotes();
    } else {
      setLoading(false);
    }
  }, [lessonId, session]);

  const fetchNotes = async () => {
    try {
      const data = await lessons.getNotes(lessonId);
      setNotes(data.notes);
    } catch (error) {
      console.error("Failed to fetch notes:", error);
    } finally {
      setLoading(false);
    }
  };

  const formatTimestamp = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  const handleAddNote = async () => {
    if (!newNote.trim() || !session?.user) return;

    setSubmitting(true);
    try {
      const data = await lessons.createNote(lessonId, {
        content: newNote,
        timestampSeconds: Math.floor(currentTime),
      });
      setNotes([...notes, data.note].sort((a, b) => a.timestampSeconds - b.timestampSeconds));
      setNewNote("");
      setShowAddForm(false);
      toast({ title: "Note saved!", variant: "success" });
    } catch (error) {
      const message = error instanceof ApiError ? error.message : "Failed to save note";
      toast({ title: message, variant: "error" });
    } finally {
      setSubmitting(false);
    }
  };

  const handleUpdateNote = async (noteId: string) => {
    if (!editContent.trim()) return;

    try {
      const data = await notesApi.update(noteId, { content: editContent });
      setNotes(notes.map((n) => (n.id === noteId ? data.note : n)));
      setEditingId(null);
      setEditContent("");
      toast({ title: "Note updated!", variant: "success" });
    } catch (error) {
      toast({ title: "Failed to update note", variant: "error" });
    }
  };

  const handleDeleteNote = async (noteId: string) => {
    try {
      await notesApi.delete(noteId);
      setNotes(notes.filter((n) => n.id !== noteId));
      toast({ title: "Note deleted", variant: "success" });
    } catch (error) {
      toast({ title: "Failed to delete note", variant: "error" });
    }
  };

  const startEdit = (note: Note) => {
    setEditingId(note.id);
    setEditContent(note.content);
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditContent("");
  };

  if (!session?.user) {
    return (
      <Card className="p-6 text-center">
        <StickyNote className="w-10 h-10 text-text-3 mx-auto mb-2" />
        <p className="text-body-sm text-text-2">
          Sign in to take notes on this lesson.
        </p>
      </Card>
    );
  }

  if (loading) {
    return (
      <Card className="p-6 text-center">
        <Loader2 className="w-6 h-6 animate-spin mx-auto text-primary" />
        <p className="text-body-sm text-text-2 mt-2">Loading notes...</p>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* Add Note Button / Form */}
      {!showAddForm ? (
        <Button
          variant="secondary"
          className="w-full"
          onClick={() => setShowAddForm(true)}
        >
          <Plus className="w-4 h-4 mr-2" />
          Add note at {formatTimestamp(Math.floor(currentTime))}
        </Button>
      ) : (
        <Card className="p-4">
          <div className="flex items-center gap-2 mb-3">
            <button
              className="flex items-center gap-1 px-2 py-1 bg-primary/10 text-primary rounded-lg text-caption font-semibold hover:bg-primary/20 transition-colors"
              onClick={() => onSeek(currentTime)}
              title="Click to jump to this timestamp"
            >
              <Clock className="w-3.5 h-3.5" />
              {formatTimestamp(Math.floor(currentTime))}
            </button>
            <span className="text-caption text-text-3">Note will be saved at this timestamp</span>
          </div>
          <Textarea
            placeholder="Write your note..."
            value={newNote}
            onChange={(e) => setNewNote(e.target.value)}
            rows={3}
            autoFocus
          />
          <div className="flex justify-end gap-2 mt-3">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setShowAddForm(false);
                setNewNote("");
              }}
            >
              Cancel
            </Button>
            <Button
              size="sm"
              onClick={handleAddNote}
              disabled={!newNote.trim() || submitting}
            >
              {submitting ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <>
                  <Save className="w-4 h-4 mr-1" />
                  Save Note
                </>
              )}
            </Button>
          </div>
        </Card>
      )}

      {/* Notes List */}
      {notes.length === 0 ? (
        <Card className="p-6 text-center">
          <StickyNote className="w-10 h-10 text-text-3 mx-auto mb-2" />
          <p className="text-body-sm text-text-2">
            No notes yet. Click the button above to add your first note!
          </p>
        </Card>
      ) : (
        <div className="space-y-2">
          {notes.map((note) => (
            <Card key={note.id} className="p-3">
              {editingId === note.id ? (
                <div className="space-y-2">
                  <Textarea
                    value={editContent}
                    onChange={(e) => setEditContent(e.target.value)}
                    rows={3}
                    autoFocus
                  />
                  <div className="flex justify-end gap-2">
                    <Button variant="ghost" size="sm" onClick={cancelEdit}>
                      <X className="w-4 h-4 mr-1" />
                      Cancel
                    </Button>
                    <Button
                      size="sm"
                      onClick={() => handleUpdateNote(note.id)}
                      disabled={!editContent.trim()}
                    >
                      <Save className="w-4 h-4 mr-1" />
                      Save
                    </Button>
                  </div>
                </div>
              ) : (
                <>
                  <div className="flex items-start gap-3">
                    <button
                      className="flex items-center gap-1 px-2 py-1 bg-primary/10 text-primary rounded-lg text-caption font-semibold hover:bg-primary/20 transition-colors flex-shrink-0"
                      onClick={() => onSeek(note.timestampSeconds)}
                      title="Jump to this timestamp"
                    >
                      <Clock className="w-3.5 h-3.5" />
                      {formatTimestamp(note.timestampSeconds)}
                    </button>
                    <p className="text-body-sm text-text-1 flex-1 whitespace-pre-wrap">
                      {note.content}
                    </p>
                  </div>
                  <div className="flex justify-end gap-1 mt-2">
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      onClick={() => startEdit(note)}
                      title="Edit note"
                    >
                      <Edit className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      onClick={() => handleDeleteNote(note.id)}
                      title="Delete note"
                      className="text-red-500 hover:text-red-600 hover:bg-red-50"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </>
              )}
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
