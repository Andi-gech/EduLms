import { useEffect, useMemo, useState } from "react";
import type { QuestionDoc } from '@/types/domain';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import {  useNavigate, useParams } from 'react-router';
import { useExam, useSubmitExamMutation } from '@/hooks/useApiData';


interface LocalChoiceOption { id: string; text: string }
interface LocalQuestion { id: string; type: 'choice' | 'short'; question: string; options?: LocalChoiceOption[]; answerIds?: string[] }
export default function ExamsPage() {
  const { id: examId } = useParams();
  const { data: exam, isLoading,refetch } = useExam(examId);
  const submitMutation = useSubmitExamMutation();
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [flagged, setFlagged] = useState<Set<number>>(new Set());
  const navigate = useNavigate();
  const durationMin = typeof exam?.examDuration === 'number' && exam.examDuration > 0 ? exam.examDuration : 30;
  const [remainingSeconds, setRemainingSeconds] = useState(durationMin * 60);
  const [submitted, setSubmitted] = useState(false);

  // Module-linked exams removed: treat all exams uniformly
  const alreadySubmitted = (exam as any)?.mySubmission?.alreadySubmitted;
  const questions: LocalQuestion[] = useMemo(() => {
    if (!exam || !Array.isArray(exam.questions)) return [];
    return (exam.questions as QuestionDoc[]).map(q => {
      if (q.type === 'multiple_choice') {
        return {
          id: q._id,
          type: 'choice',
          question: q.question,
          options: (q.answers || []).map(a => ({ id: a._id, text: a.answer })),
          answerIds: (q.answers || []).filter(a => a.isCorrect).map(a => a._id)
        } as LocalQuestion;
      }
      return { id: q._id, type: 'short', question: q.question } as LocalQuestion;
    });
  }, [exam]);
  const currentQuestion = questions[currentIndex];

  useEffect(() => {
  if (submitted || alreadySubmitted || remainingSeconds === null) return;
    const interval = setInterval(() => {
      setRemainingSeconds((s) => {
        if (s === null || s <= 1) { clearInterval(interval); handleSubmit(); return 0; }
        return s - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [submitted, alreadySubmitted, remainingSeconds]);

  

  const timeDisplay = useMemo(() => {
    if (typeof remainingSeconds !== "number" || remainingSeconds < 0) return "--:--";
    const m = Math.floor(remainingSeconds / 60).toString().padStart(2, "0");
    const s = (remainingSeconds % 60).toString().padStart(2, "0");
    return `${m}:${s}`;
  }, [remainingSeconds]);

  const toggleFlag = () => {
    if (!currentQuestion) return;
    setFlagged((prev) => { const next = new Set(prev); next.has(currentIndex) ? next.delete(currentIndex) : next.add(currentIndex); return next; });
  };
  const setAnswer = (val: string) => { if (submitted || !currentQuestion) return; setAnswers((prev) => ({ ...prev, [currentQuestion.id]: val })); };
  const navigateTo = (index: number) => setCurrentIndex(index);
  const handlePrev = () => setCurrentIndex((i) => Math.max(0, i - 1));
  const handleNext = () => setCurrentIndex((i) => Math.min(questions.length - 1, i + 1));
 
  const handleSubmit = () => {
  if (submitted || !examId) return;
  const answerPayload = questions.map(q => {
    if (q.type === 'choice') {
      const answerId = answers[q.id];
      if (!answerId) return null;
      return { questionId: q.id, answerId };
    }
    // short answer
    const text = answers[q.id];
    if (!text || text.trim() === '') return null; // skip empty
    return { questionId: q.id, text };
  }).filter(Boolean) as { questionId: string; answerId?: string; text?: string }[];

  submitMutation.mutate(
  { examId, answers: answerPayload },
  {
    onSuccess: async () => {
      await refetch();
      navigate(-1);
    }
  }
);

  setSubmitted(true);
  
 
  };

 

  const isFlagged = currentQuestion ? flagged.has(currentIndex) : false;
  const currentAnswer = currentQuestion ? (answers[currentQuestion.id] || "") : "";
  const questionStatus = (q: LocalQuestion, idx: number) => { const answered = answers[q.id] != null && answers[q.id] !== ""; return { answered, flagged: flagged.has(idx) }; };

  // If backend indicates already submitted, lock the interface (no second attempt)
  if (!isLoading && alreadySubmitted) {
    return (
      <div className="flex flex-col items-center justify-center h-screen p-6 gap-6">
        <Card className="max-w-md bg-transparent border-none w-full">
          <CardHeader>
            <CardTitle className="text-lg">Exam Already Submitted</CardTitle>
            <CardDescription>You have already submitted this exam. Additional attempts are not allowed.</CardDescription>
          </CardHeader>
          <CardFooter className="flex flex-col gap-3">
            <Button className="bg-blue-500 text-white hover:bg-blue-700 cursor-pointer" onClick={() => navigate(-1)}>Go Back</Button>
      </CardFooter>
        </Card>
      </div>
    );
  }

 
  return (
   
       
      <div className="flex flex-col h-screen p-4 md:flex-row gap-6 items-center justify-center">
        {isLoading && <div className="text-sm text-muted-foreground">Loading exam...</div>}
        {!isLoading && !exam && <div className="text-sm text-muted-foreground">Exam not found.</div>}
  {exam && questions.length > 0 && (
        <Card className="flex-1 bg-blue-900/30 dark:bg-muted/50 h-[500px]">
          <CardHeader className="gap-2">
            <CardTitle className="text-xl md:text-2xl">{(exam as any).title}</CardTitle>
            <CardDescription>
              Question {currentIndex + 1} of {questions.length}
            </CardDescription>
            <div className="flex flex-wrap gap-2 pt-1">
              {isFlagged && <Badge variant="outline" className="border-yellow-400 text-yellow-600">Flagged</Badge>}
              {!submitted && (
                <Badge variant="secondary">Time Left: {timeDisplay}</Badge>
              )}
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            <div>
              <p className="font-medium leading-snug text-base md:text-lg">{currentQuestion?.question}</p>
            </div>

            {/* Answer area */}
            {currentQuestion?.type === "choice" ? (
              <div className="flex flex-col gap-2">
                {currentQuestion.options?.map((opt, index) => {
                  const selected = currentAnswer === opt.id;
                  const optioncar=  String.fromCharCode(65 + index);

                  return (
                    <button
                      type="button"
                      key={opt.id}
                      onClick={() => setAnswer(opt.id)}
                      disabled={submitted}
                      className={[
                        "text-left border rounded-md px-4 py-2 text-sm transition flex gap-3",
                        selected && !submitted && "border-primary bg-primary/5",
                        !selected && "hover:border-primary/50",
                        submitted && !selected && "opacity-70"
                      ].filter(Boolean).join(" ")}
                    >
                      <span className="font-semibold w-5 shrink-0">{optioncar}</span>
                      <span className="flex-1">{opt.text}</span>
                    </button>
                  );
                })}
              </div>
            ) : (
              <div className="space-y-2">
                <Textarea
                  placeholder="Type your answer here..."
                  value={currentAnswer}
                  disabled={submitted}
                  onChange={(e) => setAnswer(e.target.value)}
                />
                {submitted && <p className="text-xs text-muted-foreground">Submitted.</p>}
              </div>
            )}
          </CardContent>
          <CardFooter className="flex flex-wrap gap-2">
            <Button variant="outline" onClick={handlePrev} disabled={currentIndex === 0}>Prev</Button>
            <Button variant="outline" onClick={handleNext} disabled={currentIndex === questions.length - 1}>Next</Button>
            <Button variant={isFlagged ? "destructive" : "secondary"} onClick={toggleFlag}>
              {isFlagged ? "Unflag" : "Flag"}
            </Button>
            {!submitted && (
              <Button onClick={handleSubmit} disabled={Object.keys(answers).length === 0 || (submitMutation as any).isPending}>{(submitMutation as any).isPending ? 'Submitting...' : 'Submit'}</Button>
            )}
            {/* Retry removed */}
          </CardFooter>
          {submitted && (
            <div className="px-6 pb-6 -mt-4">
              <Card className="border-dashed bg-muted/40">
                <CardContent className="py-4 text-sm space-y-1">
                  <p className="text-green-600">Your answers have been submitted. You can view your result once graded.</p>
                </CardContent>
              </Card>
            </div>
          )}
        </Card>
        )}
     
        <div className="w-full md:w-72 flex flex-col self-start gap-4">
          {(!alreadySubmitted && !isLoading) && (
            <Card>
              <CardHeader className="pb-4">
                <CardTitle className="text-sm">Overview</CardTitle>
                <CardDescription className="flex flex-wrap gap-2 pt-1">
                  <Badge variant="secondary" className="bg-green-500/90 text-white border-green-500">Answered</Badge>
                  <Badge variant="secondary" className="bg-yellow-400 text-black">Flag</Badge>
                  <Badge variant="secondary" className="bg-blue-500 text-white">Current</Badge>
                </CardDescription>
                <div className="flex justify-between text-xs pt-2">
                  <span>Timer</span>
                  <span className={`font-mono ${remainingSeconds < 60 ? "text-red-600 font-semibold" : ""}`}>{timeDisplay}</span>
                  <span className={`font-mono ${typeof remainingSeconds === "number" && remainingSeconds < 60 ? "text-red-600 font-semibold" : ""}`}>{timeDisplay}</span>
                </div>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="grid grid-cols-6 gap-2">
                  {questions.map((q, idx) => {
                    const { answered, flagged: fl } = questionStatus(q, idx);
                    const isCurrent = idx === currentIndex;
                    const className = [
                      "h-8 w-8 rounded-md text-xs font-medium flex items-center justify-center border relative outline-none",
                      answered ? "bg-green-500/90 text-white border-green-500" : "bg-muted border-input",
                      isCurrent && "ring-2 ring-blue-500 bg-blue-500 text-white",
                      fl && "after:absolute after:-top-0.5 after:-right-0.5 after:h-2.5 after:w-2.5 after:rounded-full after:bg-yellow-400",
                      submitted && !answered && !isCurrent ? "opacity-70" : ""
                    ].filter(Boolean).join(" ");
                    return (
                      <button
                        key={q.id}
                        onClick={() => navigateTo(idx)}
                        className={className}
                        title={`Question ${idx + 1}${fl ? " (Flagged)" : ""}`}
                      >
                        {idx + 1}
                      </button>
                    );
                  })}
                </div>
              </CardContent>
              <CardFooter className="pt-4">
                {!submitted ? (
                  <Button variant="destructive" className="w-full" onClick={handleSubmit}>Submit Exam</Button>
                ) : (
                  <p className="text-xs text-muted-foreground">You can review answers now.</p>
                )}
              </CardFooter>
            </Card>
          )}
          {alreadySubmitted && (
            <Card className="p-4 flex flex-col gap-3 items-start">
              <CardTitle className="text-base">Exam Already Submitted</CardTitle>
              <p className="text-xs text-muted-foreground">You have already taken this exam. You can view your result.</p>
              <Button size="sm" onClick={() => window.location.href = `/Result/${examId}`}>View Result</Button>
            </Card>
          )}
        </div>
      </div>
      

  );
}
