
import { useMemo, useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/lib/apiClient';
import { useParams } from 'react-router';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Sheet, SheetClose, SheetContent, SheetHeader, SheetTitle, SheetFooter as SheetFooterC, SheetDescription } from '@/components/ui/sheet';
import { Plus, Trash2, Pencil, Check, ListChecks } from 'lucide-react';

import type { UIQuestionChoice, UIQuestionShort, UIQuestion as DraftQuestion, UIChoiceOption as ChoiceOption, UIQuestionBase as QBase } from '@/types/domain';
const QUESTION_TYPE_OPTIONS = [
  { value: 'choice', label: 'Multiple Choice' },
  { value: 'short', label: 'Short Answer' },
];

function uid(prefix = 'q'): string {
  return `${prefix}-${Math.random().toString(36).slice(2, 8)}`;
}

export default function CreateExam() {
  const {  courseId: courseIdFromRoute } = useParams(); // expecting route like /teacher/course/:courseId/exams/create or with optional :moduleId
  // Course / Module (course normally from route param; derive from module when absent)
  const courseId = courseIdFromRoute || '';
  const [selectedModuleId, setSelectedModuleId] = useState<string>('');
  // Scheduling (shown only when no module selected per requirement)
  const [examDate, setExamDate] = useState<string>(''); // YYYY-MM-DD
  const [startTime, setStartTime] = useState<string>(''); // ISO local datetime
  const [endTime, setEndTime] = useState<string>('');
  const [title, setTitle] = useState('');
  const [timeLimit, setTimeLimit] = useState<number>(30);
  
  const [questions, setQuestions] = useState<DraftQuestion[]>([]);

  // Sheet state
  const [open, setOpen] = useState(false);
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [formType, setFormType] = useState<'choice' | 'short' | ''>('');
  const [formQuestion, setFormQuestion] = useState('');
  const [formOptions, setFormOptions] = useState<ChoiceOption[]>([ { id: 'A', text: '' }, { id: 'B', text: '' } ]);
  const [formCorrect, setFormCorrect] = useState('');
  const [formMark, setFormMark] = useState<number>(1);

  const resetForm = () => {
    setEditingIndex(null);
    setFormType('');
    setFormQuestion('');
  setFormOptions([ { id: 'A', text: '' }, { id: 'B', text: '' } ]);
  setFormCorrect('');
  setFormMark(1);
  };

  const openForNew = () => { resetForm(); setOpen(true); };
  const openForEdit = (idx: number) => {
    const q = questions[idx];
    setEditingIndex(idx);
    setFormType(q.type);
    setFormQuestion(q.question);
    if (q.type === 'choice') {
      setFormOptions(q.options);
      setFormCorrect(q.correctAnswer);
    } else {
      setFormOptions([ { id: 'A', text: '' }, { id: 'B', text: '' } ]);
      setFormCorrect(q.correctAnswer);
    }
  // Set mark (default 1 if missing on legacy data)
  // @ts-ignore
  setFormMark(q.mark ?? 1);
  setOpen(true);
  };

  // Options helpers
  const addOption = () => {
    const letters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');
    const used = new Set(formOptions.map(o => o.id));
    const next = letters.find(l => !used.has(l)) || uid('OPT').toUpperCase();
    setFormOptions(prev => [...prev, { id: next, text: '' }]);
  };
  const removeOption = (id: string) => {
    setFormOptions(prev => prev.filter(o => o.id !== id));
    if (formCorrect === id) setFormCorrect('');
  };

  const validateQuestion = (): string | null => {
    if (!formType) return 'Please choose a question type.';
  if (!formQuestion.trim()) return 'Question text is required.';
  if (formMark == null || isNaN(formMark) || formMark <= 0) return 'Mark must be a positive number';
    if (formType === 'choice') {
      if (formOptions.length < 2) return 'Provide at least two options.';
      if (formOptions.some(o => !o.text.trim())) return 'All options must have text.';
      if (!formCorrect) return 'Select the correct option.';
      if (!formOptions.find(o => o.id === formCorrect)) return 'Correct option must be one of the options.';
    } else {
      if (!formCorrect.trim()) return 'Provide the correct answer.';
    }
    return null;
  };

  const upsertQuestion = () => {
    const err = validateQuestion();
    if (err) {
      alert(err); // lightweight feedback
      return;
    }
  const base: QBase = { id: editingIndex != null ? questions[editingIndex].id : uid(), type: formType as 'choice' | 'short', question: formQuestion, mark: formMark };
  let next: DraftQuestion;
    if (formType === 'choice') {
      next = { ...base, type: 'choice', options: formOptions, correctAnswer: formCorrect };
    } else {
      next = { ...base, type: 'short', correctAnswer: formCorrect };
    }
    setQuestions(prev => {
      if (editingIndex == null) return [...prev, next];
      const cp = prev.slice(); cp[editingIndex] = next; return cp;
    });
    setOpen(false);
    resetForm();
  };

  const removeQuestion = (idx: number) => {
    setQuestions(prev => prev.filter((_, i) => i !== idx));
  };

  // Module now optional: allow save with just title & questions
  const canSaveExam = useMemo(() => !!title.trim() && questions.length > 0, [title, questions.length]);
  const totalMarks = useMemo(() => questions.reduce((s,q)=> s + ((q as any).mark || 0), 0), [questions]);
 const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const saveExam = async () => {
  if (!canSaveExam) return;
  if (!courseId) { setSaveError('Missing course id from route'); return; }
    setSaving(true); setSaveError(null);
    try {
      if (totalMarks <= 0) { setSaveError('Add at least one question with mark > 0'); setSaving(false); return; }
   const transformed = questions.map(q => {
        if (q.type === 'choice') {
          const choice = q as any;
          const correctIdx = choice.options.findIndex((o: any) => o.id === choice.correctAnswer);
          return {
            question: q.question,
            type: 'multiple_choice',
    mark: (q as any).mark ?? 1,
            answers: choice.options.map((o: any, i: number) => ({ answer: o.text, isCorrect: i === correctIdx }))
          };
        }
    return { question: q.question, type: 'blank', mark: (q as any).mark ?? 1, blankAnswer: (q as any).correctAnswer };
      });
      const payload: any = {
        title,
        examDuration: timeLimit,
        course: courseId,
        questions: transformed.map(q => ({
          question: q.question,
          answers: q.type === 'multiple_choice' ? q.answers : [],
          mark: q.mark,
          type: q.type === 'multiple_choice' ? 'multiple_choice' : 'blank',
          blankAnswer: q.type === 'blank' ? q.blankAnswer : undefined,
        }))
      };
      if (selectedModuleId) {
        payload.CourseModule = selectedModuleId;
      } else {
        // Only include schedule when not tied to a module (per earlier requirement UI logic)
        if (examDate) payload.examDate = new Date(examDate).toISOString();
        if (startTime) payload.startTime = new Date(startTime).toISOString();
        if (endTime) payload.endTime = new Date(endTime).toISOString();
      }
      await apiClient.createExam(payload);
      alert('Exam created successfully');
      setTitle(''); setQuestions([]); setExamDate(''); setStartTime(''); setEndTime('');
    } catch (e: any) {
      setSaveError(e.message || 'Failed to create exam');
    } finally { setSaving(false); }
  };

  // Data fetching for courses & modules
  const { data: modules = [], isLoading: loadingModules } = useQuery({
    queryKey: ['courseModules', courseId],
    queryFn: () => courseId ? apiClient.listCourseModules(courseId) : Promise.resolve([]),
    enabled: !!courseId,
  });

  // Fetch course to display name
  const { data: courseDetail } = useQuery({
    queryKey: ['courseDetail', courseId],
    queryFn: () => courseId ? apiClient.getCourse(courseId) : Promise.resolve(null),
    enabled: !!courseId,
    staleTime: 60_000,
  });


  // When course changes, clear module unless it belongs
  const validModule = modules.find(m => m._id === selectedModuleId);
  useEffect(() => {
    if (selectedModuleId && courseId && !validModule) {
      setSelectedModuleId('');
    }
  }, [selectedModuleId, courseId, validModule]);

  return (
    <div className="h-screen overflow-y-auto px-4 py-8">
      <div className="max-w-6xl mx-auto space-y-6">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Create Exam</h1>
            <p className="text-muted-foreground">{courseDetail ? `Course: ${courseDetail.name}` : 'Build an exam by adding questions and answers'}</p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="secondary" onClick={openForNew}><Plus className="w-4 h-4 mr-1" /> Add Question</Button>
            <Button onClick={saveExam} disabled={!canSaveExam || saving}>{saving ? 'Saving...' : 'Save Exam'}</Button>
          </div>
        </div>

        <Card className="border-none bg-background">
          <CardHeader>
            <CardTitle>Exam Details</CardTitle>
            <CardDescription>Title, time, and pass mark</CardDescription>
          </CardHeader>
          <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Course selector removed: courseId is taken from route params */}
            <div className="col-span-1 md:col-span-1">
              <Label htmlFor="moduleSel">Module</Label>
              <Select value={selectedModuleId} onValueChange={(v) => setSelectedModuleId(v)} disabled={!courseId || loadingModules}>
                <SelectTrigger id="moduleSel">
                  <SelectValue placeholder={!courseId ? 'Missing course id' : (loadingModules ? 'Loading...' : 'Select module')} />
                </SelectTrigger>
                <SelectContent>
                  {modules.map((m: any) => (
                    <SelectItem key={m._id} value={m._id}>{m.order != null ? `${m.order}. ` : ''}{m.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="examTitle">Title</Label>
              <Input id="examTitle" value={title} onChange={e => setTitle(e.target.value)} placeholder="e.g. Software Engineering Fundamentals" />
            </div>
            <div>
              <Label htmlFor="timeLimit">Time Limit (minutes)</Label>
              <Input id="timeLimit" type="number" min={5} value={timeLimit} onChange={e => setTimeLimit(Number(e.target.value || 0))} />
            </div>
           
            {!selectedModuleId && (
              <>
                <div>
                  <Label htmlFor="examDate">Exam Date</Label>
                  <Input id="examDate" type="date" value={examDate} onChange={e => setExamDate(e.target.value)} />
                </div>
                <div>
                  <Label htmlFor="startTime">Start Time</Label>
                  <Input id="startTime" type="datetime-local" value={startTime} onChange={e => setStartTime(e.target.value)} />
                </div>
                <div>
                  <Label htmlFor="endTime">End Time</Label>
                  <Input id="endTime" type="datetime-local" value={endTime} onChange={e => setEndTime(e.target.value)} />
                </div>
              </>
            )}
          </CardContent>
        </Card>

  {saveError && <div className="text-sm text-red-600">{saveError}</div>}
  <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><ListChecks className="w-5 h-5 text-indigo-500" /> Questions</CardTitle>
            <CardDescription>Added questions appear below. Click edit to modify.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {questions.length === 0 ? (
              <div className="rounded-md border p-6 text-center text-muted-foreground">No questions yet. Use "Add Question" to start.</div>
            ) : (
              <div className="space-y-3">
                {questions.map((q, idx) => (
                  <div key={q.id} className="border rounded-md p-3 bg-card">
                    <div className="flex items-start justify-between gap-3">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <Badge variant="secondary">{q.type === 'choice' ? 'Multiple Choice' : 'Short Answer'}</Badge>
                          <span className="text-xs text-muted-foreground">Q{idx + 1}</span>
                          <Badge variant="outline">{(q as any).mark ?? 1} pt{((q as any).mark ?? 1) > 1 ? 's' : ''}</Badge>
                        </div>
                        <p className="font-medium">{q.question}</p>
                        {q.type === 'choice' ? (
                          <ul className="text-sm list-disc pl-5 space-y-1">
                            {(q as UIQuestionChoice).options.map(opt => (
                              <li key={opt.id} className={opt.id === (q as UIQuestionChoice).correctAnswer ? 'text-green-600 dark:text-green-400 font-medium' : ''}>
                                <span className="mr-2">{opt.id}.</span>{opt.text}
                                {opt.id === (q as UIQuestionChoice).correctAnswer && <span className="ml-2 inline-flex items-center gap-1 text-xs"><Check className="w-3 h-3" /> Correct</span>}
                              </li>
                            ))}
                          </ul>
                        ) : (
                          <p className="text-sm text-muted-foreground">Correct answer: {(q as UIQuestionShort).correctAnswer}</p>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        <Button size="sm" variant="ghost" onClick={() => openForEdit(idx)}><Pencil className="w-4 h-4" /></Button>
                        <Button size="sm" variant="destructive" onClick={() => removeQuestion(idx)}><Trash2 className="w-4 h-4" /></Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
          <CardFooter className="justify-end">
            <Button variant="secondary" onClick={openForNew}><Plus className="w-4 h-4 mr-1" /> Add Question</Button>
          </CardFooter>
        </Card>

        {/* Add/Edit Question Sheet */}
        <Sheet open={open} onOpenChange={setOpen}>
          <SheetContent side="right">
            <SheetHeader>
              <SheetTitle>{editingIndex != null ? 'Edit Question' : 'Add Question'}</SheetTitle>
              <SheetDescription>Choose a type, then fill in the fields below.</SheetDescription>
            </SheetHeader>
            <div className="p-4 pt-0 space-y-4">
              <div className="space-y-2">
                <Label>Question Type</Label>
                <Select value={formType} onValueChange={(v) => setFormType(v as 'choice' | 'short')}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select type" />
                  </SelectTrigger>
                  <SelectContent>
                    {QUESTION_TYPE_OPTIONS.map(o => (
                      <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="qmark">Mark / Points</Label>
                <Input id="qmark" type="number" min={1} value={formMark} onChange={e => setFormMark(Number(e.target.value) || 1)} />
              </div>

              <div className="space-y-2">
                <Label htmlFor="qtext">Question</Label>
                <Textarea id="qtext" value={formQuestion} onChange={e => setFormQuestion(e.target.value)} placeholder="Enter the question text" />
              </div>

              {formType === 'choice' && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <Label>Options</Label>
                    <Button size="sm" variant="secondary" onClick={addOption}><Plus className="w-4 h-4 mr-1" /> Add Option</Button>
                  </div>
                  <div className="space-y-2">
                    {formOptions.map((opt) => (
                      <div key={opt.id} className="flex items-center gap-2">
                        <Badge className="w-8 justify-center" variant="secondary">{opt.id}</Badge>
                        <Input value={opt.text} onChange={e => {
                          const v = e.target.value; setFormOptions(prev => prev.map(o => o.id === opt.id ? { ...o, text: v } : o));
                        }} placeholder={`Option ${opt.id}`} />
                        <Button type="button" size="sm" variant={formCorrect === opt.id ? 'default' : 'outline'} onClick={() => setFormCorrect(opt.id)} title="Mark correct">
                          <Check className="w-4 h-4" />
                        </Button>
                        <Button type="button" size="sm" variant="ghost" onClick={() => removeOption(opt.id)} disabled={formOptions.length <= 2}>
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {formType === 'short' && (
                <div className="space-y-2">
                  <Label htmlFor="correctShort">Correct Answer</Label>
                  <Input id="correctShort" value={formCorrect} onChange={e => setFormCorrect(e.target.value)} placeholder="Type the expected answer" />
                </div>
              )}
            </div>
            <SheetFooterC>
              <div className="flex items-center justify-end gap-2">
                <SheetClose asChild>
                  <Button variant="outline" onClick={resetForm}>Cancel</Button>
                </SheetClose>
                <Button onClick={upsertQuestion}>{editingIndex != null ? 'Update' : 'Add'} Question</Button>
              </div>
            </SheetFooterC>
          </SheetContent>
        </Sheet>
      </div>
    </div>
  );
}
