"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Pill } from "@/components/ui/pill";
import { toast } from "@/components/ui/toaster";
import {
  lessons,
  questions as questionsApi,
  answers as answersApi,
  ApiError,
  type QuestionWithAnswers,
  type AnswerWithUser,
} from "@/lib/api-client";
import {
  MessageCircle,
  Send,
  ChevronDown,
  ChevronUp,
  Check,
  MoreHorizontal,
  Trash2,
  Edit,
  Loader2,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

type Question = QuestionWithAnswers;
type Answer = AnswerWithUser;

interface QASectionProps {
  lessonId: string;
  courseCreatorId: string;
}

export function QASection({ lessonId, courseCreatorId }: QASectionProps) {
  const { data: session } = useSession();
  const [questions, setQuestions] = useState<Question[]>([]);
  const [newQuestion, setNewQuestion] = useState("");
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [expandedQuestions, setExpandedQuestions] = useState<Set<string>>(new Set());
  const [answerText, setAnswerText] = useState<Record<string, string>>({});
  const [answeringId, setAnsweringId] = useState<string | null>(null);

  useEffect(() => {
    fetchQuestions();
  }, [lessonId]);

  const fetchQuestions = async () => {
    try {
      const data = await lessons.getQuestions(lessonId);
      setQuestions(data.questions);
    } catch (error) {
      console.error("Failed to fetch questions:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmitQuestion = async () => {
    if (!newQuestion.trim() || !session?.user) return;

    setSubmitting(true);
    try {
      const data = await lessons.createQuestion(lessonId, { content: newQuestion });
      setQuestions([{ ...data.question, answers: [], _count: { answers: 0 } } as Question, ...questions]);
      setNewQuestion("");
      toast({ title: "Question posted!", variant: "success" });
    } catch (error) {
      const message = error instanceof ApiError ? error.message : "Failed to post question";
      toast({ title: message, variant: "error" });
    } finally {
      setSubmitting(false);
    }
  };

  const handleSubmitAnswer = async (questionId: string) => {
    const content = answerText[questionId]?.trim();
    if (!content || !session?.user) return;

    setAnsweringId(questionId);
    try {
      const data = await questionsApi.createAnswer(questionId, { content });
      setQuestions(
        questions.map((q) =>
          q.id === questionId
            ? { ...q, answers: [...q.answers, data.answer as Answer], _count: { answers: q._count.answers + 1 } }
            : q
        )
      );
      setAnswerText({ ...answerText, [questionId]: "" });
      toast({ title: "Answer posted!", variant: "success" });
    } catch (error) {
      toast({ title: "Failed to post answer", variant: "error" });
    } finally {
      setAnsweringId(null);
    }
  };

  const handleAcceptAnswer = async (answerId: string, questionId: string) => {
    try {
      await answersApi.accept(answerId);
      setQuestions(
        questions.map((q) =>
          q.id === questionId
            ? {
                ...q,
                answers: q.answers.map((a) => ({
                  ...a,
                  isAccepted: a.id === answerId,
                })),
              }
            : q
        )
      );
      toast({ title: "Answer accepted!", variant: "success" });
    } catch (error) {
      toast({ title: "Failed to accept answer", variant: "error" });
    }
  };

  const handleDeleteQuestion = async (questionId: string) => {
    try {
      await questionsApi.delete(questionId);
      setQuestions(questions.filter((q) => q.id !== questionId));
      toast({ title: "Question deleted", variant: "success" });
    } catch (error) {
      toast({ title: "Failed to delete question", variant: "error" });
    }
  };

  const toggleQuestion = (id: string) => {
    const newExpanded = new Set(expandedQuestions);
    if (newExpanded.has(id)) {
      newExpanded.delete(id);
    } else {
      newExpanded.add(id);
    }
    setExpandedQuestions(newExpanded);
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));

    if (days === 0) return "Today";
    if (days === 1) return "Yesterday";
    if (days < 7) return `${days} days ago`;
    return date.toLocaleDateString();
  };

  if (loading) {
    return (
      <Card className="p-6 text-center">
        <Loader2 className="w-6 h-6 animate-spin mx-auto text-primary" />
        <p className="text-body-sm text-text-2 mt-2">Loading questions...</p>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* Ask a Question */}
      {session?.user && (
        <Card className="p-4">
          <div className="flex gap-3">
            <Avatar className="w-8 h-8 flex-shrink-0">
              <AvatarImage src={session.user.image || undefined} />
              <AvatarFallback>{session.user.name?.[0] || "U"}</AvatarFallback>
            </Avatar>
            <div className="flex-1 space-y-2">
              <Textarea
                placeholder="Ask a question about this lesson..."
                value={newQuestion}
                onChange={(e) => setNewQuestion(e.target.value)}
                rows={2}
              />
              <div className="flex justify-end">
                <Button
                  size="sm"
                  onClick={handleSubmitQuestion}
                  disabled={!newQuestion.trim() || submitting}
                >
                  {submitting ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <>
                      <Send className="w-4 h-4 mr-1" />
                      Post Question
                    </>
                  )}
                </Button>
              </div>
            </div>
          </div>
        </Card>
      )}

      {/* Questions List */}
      {questions.length === 0 ? (
        <Card className="p-6 text-center">
          <MessageCircle className="w-10 h-10 text-text-3 mx-auto mb-2" />
          <p className="text-body-sm text-text-2">
            No questions yet. Be the first to ask!
          </p>
        </Card>
      ) : (
        <div className="space-y-3">
          {questions.map((question) => (
            <Card key={question.id} className="overflow-hidden">
              {/* Question */}
              <div className="p-4">
                <div className="flex gap-3">
                  <Avatar className="w-8 h-8 flex-shrink-0">
                    <AvatarImage src={question.user.image || undefined} />
                    <AvatarFallback>{question.user.name?.[0] || "U"}</AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-caption font-semibold text-text-1">
                        {question.user.name || "Anonymous"}
                      </span>
                      {question.user.id === courseCreatorId && (
                        <Pill size="sm" variant="completed">Instructor</Pill>
                      )}
                      <span className="text-caption text-text-3">
                        {formatDate(question.createdAt)}
                      </span>
                    </div>
                    <p className="text-body-sm text-text-1">{question.content}</p>
                    
                    <div className="flex items-center gap-3 mt-2">
                      <button
                        className="flex items-center gap-1 text-caption text-text-2 hover:text-primary transition-colors"
                        onClick={() => toggleQuestion(question.id)}
                      >
                        <MessageCircle className="w-4 h-4" />
                        {question._count.answers} {question._count.answers === 1 ? "answer" : "answers"}
                        {expandedQuestions.has(question.id) ? (
                          <ChevronUp className="w-4 h-4" />
                        ) : (
                          <ChevronDown className="w-4 h-4" />
                        )}
                      </button>
                      
                      {(session?.user?.id === question.user.id || session?.user?.id === courseCreatorId) && (
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <button className="text-text-3 hover:text-text-1">
                              <MoreHorizontal className="w-4 h-4" />
                            </button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem
                              className="text-red-600"
                              onClick={() => handleDeleteQuestion(question.id)}
                            >
                              <Trash2 className="w-4 h-4 mr-2" />
                              Delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Answers */}
              {expandedQuestions.has(question.id) && (
                <div className="bg-surface border-t border-border">
                  {question.answers.map((answer) => (
                    <div key={answer.id} className="p-4 border-b border-border last:border-b-0">
                      <div className="flex gap-3 pl-4">
                        <Avatar className="w-7 h-7 flex-shrink-0">
                          <AvatarImage src={answer.user.image || undefined} />
                          <AvatarFallback>{answer.user.name?.[0] || "U"}</AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-caption font-semibold text-text-1">
                              {answer.user.name || "Anonymous"}
                            </span>
                            {answer.user.id === courseCreatorId && (
                              <Pill size="sm" variant="completed">Instructor</Pill>
                            )}
                            {answer.isAccepted && (
                              <Pill size="sm" variant="completed">
                                <Check className="w-3 h-3 mr-0.5" />
                                Accepted
                              </Pill>
                            )}
                            <span className="text-caption text-text-3">
                              {formatDate(answer.createdAt)}
                            </span>
                          </div>
                          <p className="text-body-sm text-text-1">{answer.content}</p>
                          
                          {/* Accept answer button (for question author or instructor) */}
                          {!answer.isAccepted &&
                            (session?.user?.id === question.user.id ||
                              session?.user?.id === courseCreatorId) && (
                              <button
                                className="flex items-center gap-1 text-caption text-text-2 hover:text-primary transition-colors mt-2"
                                onClick={() => handleAcceptAnswer(answer.id, question.id)}
                              >
                                <Check className="w-4 h-4" />
                                Accept answer
                              </button>
                            )}
                        </div>
                      </div>
                    </div>
                  ))}

                  {/* Add Answer */}
                  {session?.user && (
                    <div className="p-4 pl-8">
                      <div className="flex gap-3">
                        <Avatar className="w-7 h-7 flex-shrink-0">
                          <AvatarImage src={session.user.image || undefined} />
                          <AvatarFallback>{session.user.name?.[0] || "U"}</AvatarFallback>
                        </Avatar>
                        <div className="flex-1 space-y-2">
                          <Textarea
                            placeholder="Write an answer..."
                            value={answerText[question.id] || ""}
                            onChange={(e) =>
                              setAnswerText({ ...answerText, [question.id]: e.target.value })
                            }
                            rows={2}
                          />
                          <div className="flex justify-end">
                            <Button
                              size="sm"
                              variant="secondary"
                              onClick={() => handleSubmitAnswer(question.id)}
                              disabled={!answerText[question.id]?.trim() || answeringId === question.id}
                            >
                              {answeringId === question.id ? (
                                <Loader2 className="w-4 h-4 animate-spin" />
                              ) : (
                                "Reply"
                              )}
                            </Button>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
