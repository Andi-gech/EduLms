import { useMemo, useState, useEffect } from 'react';
import type { UIQuestionChoice, UIQuestionShort, QuestionDoc, AnswerDoc } from '@/types/domain';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Check, XCircle, User2 } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { useParams, useLocation } from 'react-router';
import { useExam, useExamSubmissionDetail, useGradeExamSubmissionMutation } from '@/hooks/useApiData';

// Local evaluation question type extends shared UIQuestion variants with 'mark' and string id
type EvalQuestion = (UIQuestionChoice | UIQuestionShort) & { mark: number; id: string };

type Graded = {
	id: number;
	userAnswer: string;
	awarded: number; // numeric score awarded for this question
	comment: string;
}

const normalize = (t: string) => t.toLowerCase().replace(/[^a-z0-9 ]/g, '').trim();

export default function EvaluateExams() {
	const { id: examParam } = useParams();
	const location = useLocation();
	const query = new URLSearchParams(location.search);
	const submissionParam = query.get('submission');
	const { data: examData } = useExam(examParam);
	const { data: submissionData, isLoading: loadingSubmission } = useExamSubmissionDetail(examParam, submissionParam || undefined);
	const gradeMutation = useGradeExamSubmissionMutation(examParam || '');

	// Map backend populated questions into UI EvalQuestion shape
	const questions: EvalQuestion[] = useMemo(() => {
		if (!examData || !Array.isArray(examData.questions)) return [];
		return (examData.questions as any[]).map((q: QuestionDoc) => {
			if (q.type === 'multiple_choice') {
				const options = (q.answers || []).map((a: AnswerDoc, i) => ({ id: String.fromCharCode(65 + i), text: a.answer, _id: a._id, isCorrect: a.isCorrect }));
				const correctIndex = (q.answers || []).findIndex(a => a.isCorrect);
				const correctAnswer = correctIndex >= 0 ? String.fromCharCode(65 + correctIndex) : '';
				return { id: q._id, type: 'choice', question: q.question, options, correctAnswer, mark: q.mark } as EvalQuestion;
			} else {
				return { id: q._id, type: 'short', question: q.question, correctAnswer: q.blankAnswer || '', mark: q.mark } as EvalQuestion;
			}
		});
	}, [examData]);

	// Student / submission meta
	const student = useMemo(() => {
		if (!submissionData) return { id: '', name: '', submittedAt: '', submissionId: '' };
		return { id: submissionData.user?._id || '', name: submissionData.user?.name || '', submittedAt: submissionData.createdAt, submissionId: submissionData._id };
	}, [submissionData]);

	const examMeta = useMemo(() => ({
		title: examData?.title || 'Exam',
		passingScore: examData?.ExamMark || 50,
		id: examData?._id || examParam || '',
	}), [examData, examParam]);

	const initialGraded: Graded[] = useMemo(() => {
		if (!submissionData) return [];
		// Map stored answers to question id -> user answer representation
		const answerMap: Record<string, string> = {};
		submissionData.answers?.forEach((a: any) => {
			if (a.question && a.question._id) {
				if (a.question.type === 'multiple_choice') {
					// Need to translate answerId (ObjectId) to option letter
						const answers = (a.question.answers || []) as any[];
						const idx = answers.findIndex(ans => ans._id === a.answerId);
						if (idx >= 0) answerMap[a.question._id] = String.fromCharCode(65 + idx);
				} else {
					answerMap[a.question._id] = a.text || '';
				}
			}
		});
		return questions.map((q, idx) => {
			const ua = answerMap[q.id] || '';
			let auto = false;
			if (q.type === 'choice') auto = ua === q.correctAnswer;
			else {
				const ref = normalize(q.correctAnswer);
				const given = normalize(ua);
				auto = !!ref && (ref === given || ref.split(/\s+/).every(w => given.includes(w)));
			}
			const awarded = auto ? q.mark : 0;
			return { id: idx + 1, userAnswer: ua, awarded, comment: '' };
		});
	}, [submissionData, questions]);

	const [graded, setGraded] = useState<Graded[]>(initialGraded);
	useEffect(() => { setGraded(initialGraded); }, [initialGraded]);
	const [currentIndex, setCurrentIndex] = useState(0);
	const currentQuestion = questions[currentIndex];
	const currentGraded = graded[currentIndex];

	// Derived scoring hooks BEFORE any conditional returns to preserve hook order
	const totalMarks = useMemo(() => questions.reduce((sum, q) => sum + q.mark, 0), [questions]);
	const score = useMemo(() => graded.reduce((sum, g) => sum + (g.awarded || 0), 0), [graded]);
	const percentage = useMemo(() => Math.round((score / Math.max(1, totalMarks)) * 10000) / 100, [score, totalMarks]);
	const passed = percentage >= examMeta.passingScore;

	// Early placeholders (after scoring memos so hook order stable)
	if (!currentQuestion || !currentGraded) {
		return <div className="p-6 text-sm text-muted-foreground">Loading question grading data...</div>;
	}

	const setDecision = (ok: boolean) => {
		// For choice questions: quick set to full marks or zero
		if (currentQuestion.type === 'choice') {
			setGraded((prev) => prev.map((g, i) => (i === currentIndex ? { ...g, awarded: ok ? (currentQuestion as EvalQuestion).mark : 0 } : g)));
		}
	};
	const setComment = (txt: string) => {
		setGraded((prev) => prev.map((g, i) => (i === currentIndex ? { ...g, comment: txt } : g)));
	};


	const publish = () => {
		if (!submissionData) return;
		const manualScore = graded.reduce((sum, g) => sum + (g.awarded || 0), 0) - (submissionData.autoScore || 0);
		const safeManual = Math.max(0, manualScore);
		gradeMutation.mutate({ submissionId: submissionData._id, manualScore: safeManual });
	};

	const saveDraft = () => {
		// Could persist draft comments/scores to a dedicated endpoint in future
		// For now just noop.
		console.log('Draft grading (not persisted):', graded);
	};

	if (loadingSubmission) return <div className="p-6 text-sm text-muted-foreground">Loading submission...</div>;
	if (!submissionData) return <div className="p-6 text-sm text-muted-foreground">No submission data.</div>;
	if (questions.length === 0) return <div className="p-6 text-sm text-muted-foreground">No questions loaded.</div>;

	return (
		<div className="flex flex-col md:flex-row gap-6 p-4 md:p-6 h-screen overflow-y-auto items-start justify-center">
			{/* Main panel */}
			<Card className="flex-1 bg-blue-900/30 dark:bg-muted/50 min-h-[540px]">
				<CardHeader className="gap-2">
					<div className="flex items-center justify-between gap-3">
						<div>
							<CardTitle className="text-xl md:text-2xl">{examMeta.title}</CardTitle>
							<CardDescription className="flex items-center gap-2 flex-wrap">
								<span className="inline-flex items-center gap-1"><User2 className="w-4 h-4" /> {student.name}</span>
								<Badge variant="secondary">Submitted {student.submittedAt ? new Date(student.submittedAt).toLocaleString() : '-'}</Badge>
							</CardDescription>
						</div>
						<div className="flex items-center gap-2">
							<Badge variant={passed ? 'default' : 'destructive'}>{passed ? 'Passing' : 'Below Pass'}</Badge>
							<Badge variant="secondary">Score: {score}/{totalMarks}</Badge>
							<Badge variant="secondary">{percentage}%</Badge>
						</div>
					</div>
					<div className="text-sm text-muted-foreground">Question {currentIndex + 1} of {questions.length}</div>
				</CardHeader>
				<CardContent className="space-y-6">
					{/* Question text */}
					<p className="font-medium leading-snug text-base md:text-lg">{currentQuestion.question}</p>

					{/* Student answer and reference */}
					{currentQuestion.type === 'choice' ? (
						<div className="flex flex-col gap-2">
								{(currentQuestion as UIQuestionChoice).options.map((opt) => {
								const selected = currentGraded?.userAnswer === opt.id;
								const isCorrect = opt.id === currentQuestion.correctAnswer;
								return (
									<div
										key={opt.id}
										className={[
											'text-left border rounded-md px-4 py-2 text-sm transition flex gap-3',
											selected && isCorrect && 'border-green-500 bg-green-50 dark:bg-green-500/10',
											selected && !isCorrect && 'border-red-500 bg-red-50 dark:bg-red-500/10',
											!selected && isCorrect && 'border-green-400/60',
										].filter(Boolean).join(' ')}
									>
										<span className="font-semibold w-5 shrink-0">{opt.id}.</span>
										<span className="flex-1">{opt.text}</span>
										{isCorrect && <Badge variant="outline" className="border-green-500 text-green-600">Correct</Badge>}
										{selected && !isCorrect && <Badge variant="outline" className="border-red-500 text-red-600">Selected</Badge>}
										{selected && isCorrect && <Badge variant="outline" className="border-green-500 text-green-600">Selected</Badge>}
									</div>
								);
							})}
						</div>
					) : (
						<div className="space-y-2">
							<div className="rounded-md border p-3 bg-card">
								<div className="text-xs text-muted-foreground">Student Answer</div>
									<div>{currentGraded?.userAnswer || <span className="text-muted-foreground">(No answer)</span>}</div>
							</div>
							<div className="text-xs text-muted-foreground">Reference: {currentQuestion.correctAnswer}</div>
						</div>
					)}

					{/* Evaluation controls */}
					{currentQuestion.type === 'short' ? (
						<div className="space-y-2 max-w-xs">
							<div className="text-xs text-muted-foreground">Score for this question (0 - {(currentQuestion as EvalQuestion).mark})</div>
							<Input
								type="number"
								min={0}
								max={(currentQuestion as EvalQuestion).mark}
								step={0.5}
								value={currentGraded?.awarded ?? 0}
								onChange={(e) => {
									const raw = e.target.value;
									let val = Number(raw);
									if (Number.isNaN(val)) val = 0;
									val = Math.max(0, Math.min((currentQuestion as EvalQuestion).mark, val));
									setGraded((prev) => prev.map((g, i) => (i === currentIndex ? { ...g, awarded: val } : g)));
								}}
							/>
							<div className="text-[11px] text-muted-foreground">Tip: Assign partial credit based on answer quality.</div>
						</div>
					) : (
						<div className="flex flex-wrap items-center gap-2">
							<Button variant={(currentGraded?.awarded ?? 0) === (currentQuestion as EvalQuestion).mark ? 'default' : 'outline'} onClick={() => setDecision(true)} className="gap-1">
								<Check className="w-4 h-4" /> Mark Correct
							</Button>
							<Button variant={(currentGraded?.awarded ?? 0) === 0 ? 'destructive' : 'outline'} onClick={() => setDecision(false)} className="gap-1">
								<XCircle className="w-4 h-4" /> Mark Incorrect
							</Button>
						</div>
					)}

					{/* Teacher comment */}
					<div className="space-y-2">
						<div className="text-xs text-muted-foreground">Teacher Comment</div>
						<Textarea placeholder="Add feedback for the student..." value={currentGraded?.comment || ''} onChange={(e) => setComment(e.target.value)} />
					</div>
				</CardContent>
				<CardFooter className="flex flex-wrap gap-2">
					<Button variant="outline" onClick={() => setCurrentIndex((i) => Math.max(0, i - 1))} disabled={currentIndex === 0}>Prev</Button>
					<Button variant="outline" onClick={() => setCurrentIndex((i) => Math.min(questions.length - 1, i + 1))} disabled={currentIndex === questions.length - 1}>Next</Button>
					<div className="ml-auto flex gap-2">
						<Button variant="secondary" onClick={saveDraft}>Save Draft</Button>
						<Button onClick={publish} disabled={gradeMutation.isPending}>{gradeMutation.isPending ? 'Publishing...' : 'Publish Result'}</Button>
					</div>
				</CardFooter>
			</Card>

			{/* Sidebar */}
			<div className="w-full md:w-72 flex flex-col self-start gap-4">
				<Card>
					<CardHeader className="pb-4">
						<CardTitle className="text-sm">Overview</CardTitle>
						<CardDescription className="flex flex-wrap gap-2 pt-1">
							<Badge variant="secondary" className="bg-green-500/90 text-white border-green-500">Correct</Badge>
							<Badge variant="secondary" className="bg-rose-500/90 text-white border-rose-500">Incorrect</Badge>
						</CardDescription>
						<div className="flex justify-between text-xs pt-2">
							<span>Progress</span>
							<span className="font-mono">{score}/{totalMarks}</span>
						</div>
					</CardHeader>
					<CardContent className="pt-0">
						<div className="grid grid-cols-6 gap-2">
							{graded.map((g, idx) => {
								const isCurrent = idx === currentIndex;
								const q = questions[idx];
								const awarded = g.awarded ?? 0;
								const color = awarded === 0 ? 'bg-rose-500/90 text-white border-rose-500' : awarded >= (q as EvalQuestion).mark ? 'bg-green-500/90 text-white border-green-500' : 'bg-yellow-500/90 text-white border-yellow-500';
								const className = [
									'h-8 w-8 rounded-md text-xs font-medium flex items-center justify-center border relative outline-none',
									color,
									isCurrent && 'ring-2 ring-blue-500',
								].filter(Boolean).join(' ');
								return (
									<button key={g.id} onClick={() => setCurrentIndex(idx)} className={className} title={`Question ${idx + 1}`}>
										{idx + 1}
									</button>
								);
							})}
						</div>
					</CardContent>
					<CardFooter className="pt-4">
						<div className="text-xs text-muted-foreground w-full text-center">Pass mark {examMeta.passingScore}% • Total marks {totalMarks}</div>
					</CardFooter>
				</Card>
			</div>
		</div>
	);
}
