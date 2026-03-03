import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { useAuth } from "@/lib/auth-context";
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
  const { user } = useAuth();
  const { t } = useTranslation();
  const [notes, setNotes] = useState<Note[]>([]);
  const [newNote, setNewNote] = useState("");
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editContent, setEditContent] = useState("");
  const [showAddForm, setShowAddForm] = useState(false);

  useEffect(() => {
    if (user) {
      setLoading(true);
      setFetchError(false);
      setShowAddForm(false);
      setEditingId(null);
      setEditContent("");
      setNewNote("");
      fetchNotes();
    } else {
      setLoading(false);
    }
  }, [lessonId, user]);

  const fetchNotes = async () => {
    setFetchError(false);
    try {
      const data = await lessons.getNotes(lessonId);
      setNotes(data.notes);
    } catch (error) {
      console.error("Failed to fetch notes:", error);
      setFetchError(true);
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
    if (!newNote.trim() || !user) return;

    setSubmitting(true);
    try {
      const data = await lessons.createNote(lessonId, {
        content: newNote,
        timestampSeconds: Math.floor(currentTime),
      });
      setNotes([...notes, data.note].sort((a, b) => a.timestampSeconds - b.timestampSeconds));
      setNewNote("");
      setShowAddForm(false);
      toast({ title: t("notesSection.noteSaved"), variant: "success" });
    } catch (error) {
      const message = error instanceof ApiError ? error.message : t("notesSection.failedToSaveNote");
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
      toast({ title: t("notesSection.noteUpdated"), variant: "success" });
    } catch (error) {
      toast({ title: t("notesSection.failedToUpdateNote"), variant: "error" });
    }
  };

  const handleDeleteNote = async (noteId: string) => {
    try {
      await notesApi.delete(noteId);
      setNotes(notes.filter((n) => n.id !== noteId));
      toast({ title: t("notesSection.noteDeleted"), variant: "success" });
    } catch (error) {
      toast({ title: t("notesSection.failedToDeleteNote"), variant: "error" });
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

  if (!user) {
    return (
      <Card className="p-6 text-center">
        <StickyNote className="w-10 h-10 text-text-3 mx-auto mb-2" />
        <p className="text-body-sm text-text-2">
          {t("notesSection.signInToTakeNotes")}
        </p>
      </Card>
    );
  }

  if (loading) {
    return (
      <Card className="p-6 text-center">
        <Loader2 className="w-6 h-6 animate-spin mx-auto text-primary" />
        <p className="text-body-sm text-text-2 mt-2">{t("notesSection.loadingNotes")}</p>
      </Card>
    );
  }

  if (fetchError) {
    return (
      <Card className="p-6 text-center">
        <StickyNote className="w-10 h-10 text-text-3 mx-auto mb-2" />
        <p className="text-body-sm text-text-2 mb-3">{t("notesSection.failedToLoadNotes")}</p>
        <Button size="sm" variant="secondary" onClick={fetchNotes}>{t("notesSection.tryAgain")}</Button>
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
          {t("notesSection.addNoteAt", { timestamp: formatTimestamp(Math.floor(currentTime)) })}
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
            <span className="text-caption text-text-3">{t("notesSection.noteWillBeSaved")}</span>
          </div>
          <Textarea
            placeholder={t("notesSection.writePlaceholder")}
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
              {t("notesSection.cancel")}
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
                  {t("notesSection.saveNote")}
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
            {t("notesSection.noNotesYet")}
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
                      {t("notesSection.cancel")}
                    </Button>
                    <Button
                      size="sm"
                      onClick={() => handleUpdateNote(note.id)}
                      disabled={!editContent.trim()}
                    >
                      <Save className="w-4 h-4 mr-1" />
                      {t("notesSection.save")}
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
                      className="text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950"
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
