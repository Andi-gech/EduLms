import { useParams, useNavigate } from 'react-router';
import { useEffect } from 'react';
import { apiClient } from '@/lib/apiClient';
import type { QuestionDoc } from '@/types/domain';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Sheet, SheetClose, SheetContent, SheetHeader, SheetTitle, SheetFooter as SheetFooterC, SheetDescription } from '@/components/ui/sheet';
import { Plus, Trash2, Pencil, Check, ListChecks } from 'lucide-react';
import { useState } from 'react';
import type { UIQuestion as OrigUIQuestion, UIQuestionChoice as QChoice, UIQuestionShort as QShort, UIChoiceOption as ChoiceOption, UIQuestionBase as QBase, RawExamItem } from '@/types/domain';
import { useUpdateExamMutation } from '@/hooks/useApiData';
// TODO: integrate with live exam endpoints for editing

type UIQuestion = OrigUIQuestion 
const QUESTION_TYPE_OPTIONS = [
  { value: 'choice', label: 'Multiple Choice' },
  { value: 'short', label: 'Short Answer' },
];

// Uses centralized mockFullExam; replace with real fetch /api/exams/:id later.

type FormExam = RawExamItem & { examDuration?: number };

// Question types (mirroring CreateExam structure)
// Replaced local question types with shared UIQuestion types.

function mapQuestions(populated: QuestionDoc[]): UIQuestion[] {
  return populated.map(q => {
    if (q.type === 'multiple_choice') {
      return {
        id: q._id,
        type: 'choice',
        question: q.question,
        mark: q.mark,
        options: (q.answers||[]).map((a,i) => ({ id: String.fromCharCode(65+i), text: a.answer })),
        correctAnswer: (() => {
          const idx = (q.answers||[]).findIndex(a => a.isCorrect);
          return idx >= 0 ? String.fromCharCode(65+idx) : '';
        })()
      } as UIQuestion;
    }
    return { id: q._id, type: 'short', question: q.question, mark: q.mark, correctAnswer: q.blankAnswer || '' } as UIQuestion;
  });
}

function statusFor(e: RawExamItem, now: Date) {
  const s = e.startTime ? new Date(e.startTime) : null;
  const eTime = e.endTime ? new Date(e.endTime) : null;
  if (s && eTime) {
    if (now < s) return 'upcoming';
    if (now >= s && now <= eTime) return 'active';
    return 'ended';
  }
  if (s && !eTime) return now < s ? 'upcoming' : 'active';
  return 'active';
}

export default function ExamView() {
  const { id } = useParams();
  const navigate = useNavigate();
  const now = new Date();
  const [exam, setExam] = useState<FormExam | null>(null);
  const status = exam ? statusFor(exam, now) : null;
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [editMode, setEditMode] = useState(false);
  const [form, setForm] = useState<FormExam | null>(null);
  const [notes, setNotes] = useState('');
  const [questions, setQuestions] = useState<UIQuestion[]>([]);
  useEffect(() => {
    if (!id) return;
    setLoading(true); setError(null);
    apiClient.getExam(id).then((data: any) => {
      // data.questions likely populated QuestionDoc[]
      const qDocs: QuestionDoc[] = Array.isArray(data.questions) ? (data.questions as any) : [];
      setExam({
        _id: data._id,
        title: data.title,
        moduleName: (data.CourseModule && (data.CourseModule.name || data.CourseModule)) || undefined,
        startTime: data.startTime,
        endTime: data.endTime,
        ExamMark: data.ExamMark,
        examDuration: data.examDuration,
      } as any);
      setForm({
        _id: data._id,
        title: data.title,
        moduleName: (data.CourseModule && (data.CourseModule.name || data.CourseModule)) || undefined,
        startTime: data.startTime,
        endTime: data.endTime,
        ExamMark: data.ExamMark,
        examDuration: data.examDuration,
      } as any);
      setQuestions(mapQuestions(qDocs));
    }).catch(e => setError(e.message || 'Failed to load exam')).finally(() => setLoading(false));
  }, [id]);
  const [qSheetOpen, setQSheetOpen] = useState(false);
  const [editingQIndex, setEditingQIndex] = useState<number | null>(null);
  const [formQType, setFormQType] = useState<'choice' | 'short' | ''>('');
  const [formQText, setFormQText] = useState('');
  const [formQOptions, setFormQOptions] = useState<ChoiceOption[]>([{ id: 'A', text: '' }, { id: 'B', text: '' }]);
  const [formQCorrect, setFormQCorrect] = useState('');
  const [formQMark, setFormQMark] = useState('1');
  const { mutate: updateExam } = useUpdateExamMutation(id);

  const resetQForm = () => {
    setEditingQIndex(null);
    setFormQType('');
    setFormQText('');
    setFormQOptions([{ id: 'A', text: '' }, { id: 'B', text: '' }]);
    setFormQCorrect('');
    setFormQMark('1');
  };
  const openNewQuestion = () => { resetQForm(); setQSheetOpen(true); };
  const openEditQuestion = (idx: number) => {
    const q = questions[idx];
    console.log(q)
    setEditingQIndex(idx);
    setFormQType(q.type);
    setFormQText(q.question);
    setFormQMark(q.mark ? String(q.mark) : '1');
    if (q.type === 'choice') {
      setFormQOptions(q.options);
      setFormQCorrect(q.correctAnswer);
    } else {
      setFormQOptions([{ id: 'A', text: '' }, { id: 'B', text: '' }]);
      setFormQCorrect(q.correctAnswer);
    }
    setQSheetOpen(true);
  };
  const addQOption = () => {
    const letters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');
    const used = new Set(formQOptions.map(o => o.id));
    const next = letters.find(l => !used.has(l)) || `OPT${Math.random().toString(36).slice(2,5)}`.toUpperCase();
    setFormQOptions(prev => [...prev, { id: next, text: '' }]);
  };
  const removeQOption = (id: string) => {
    setFormQOptions(prev => prev.filter(o => o.id !== id));
    if (formQCorrect === id) setFormQCorrect('');
  };
  const validateQ = (): string | null => {
    if (!formQType) return 'Select type';
    if (!formQText.trim()) return 'Question required';
    if (formQType === 'choice') {
      if (formQOptions.length < 2) return 'At least two options';
      if (formQOptions.some(o => !o.text.trim())) return 'Fill all options';
      if (!formQCorrect) return 'Select correct option';
    } else {
      if (!formQCorrect.trim()) return 'Answer required';
    }
    return null;
  };
const saveQuestion = () => {
  const error = validateQ();
  if (error) {
    alert(error);
    return;
  }

  const newQuestion: UIQuestion = {
    id: editingQIndex != null ? questions[editingQIndex].id : `q-${Date.now()}`,
    type: formQType as 'choice' | 'short',
    question: formQText,
    mark: Number(formQMark) || 1,
    modified: true,
    correctAnswer: formQCorrect,
    options: formQType === 'choice' ? formQOptions : [],
  };

  setQuestions(prev => {
    if (editingQIndex != null) {
      const updated = [...prev];
      updated[editingQIndex] = { ...newQuestion, modified: true };
      return updated;
    }
    return [...prev, newQuestion];
  });

  resetQForm();
  setQSheetOpen(false);
};




  const deleteQuestion = (idx: number) => {
    setQuestions(prev => prev.filter((_, i) => i !== idx));
  };

  const updateField = <K extends keyof FormExam>(k: K, v: FormExam[K]) => {
    setForm(prev => prev ? { ...prev, [k]: v } : prev);
  };

  const startISO = form?.startTime ? form.startTime.slice(0,16) : '';
  const endISO = form?.endTime ? form.endTime.slice(0,16) : '';

  const validation = (() => {
    if (!editMode || !form) return null;
    if (!form.title.trim()) return 'Title required';
    if (form.startTime && form.endTime) {
      if (new Date(form.endTime) < new Date(form.startTime)) return 'End time must be after start time';
    }
    if (form.examDuration != null && form.examDuration <= 0) return 'Duration must be positive';
  return null;
  })();

  const [saving, setSaving] = useState(false);
const save = async () => {
  if (validation || !form || !id) return;
  setSaving(true);
  try {
  const transformed = questions.map(q => {
  if (q.type === 'choice') {
    const correctIdx = q.options?.findIndex(o => o.id === q.correctAnswer) ?? 0;
    return {
      _id: q.id.startsWith('q-') ? undefined : q.id,
      question: q.question,
      type: 'multiple_choice',
      mark: Number(q.mark) || 1,
      answers: q.options?.map((o, i) => ({ answer: o.text, isCorrect: i === correctIdx })),
    };
  }
  return {
    _id: q.id.startsWith('q-') ? undefined : q.id,
    question: q.question,
    type: 'blank',
    mark: Number(q.mark) || 1,
    blankAnswer: q.correctAnswer,
  };
});
console.log('transformed', transformed);
  updateExam(
    { id, payload: { ...form, questions: transformed } },
    {
     onSuccess: (result) => {
      setQuestions(mapQuestions(result.questions as QuestionDoc[]));
    }
    }
  )
    
    setEditMode(false);
  } catch (e: any) {
    alert(e.message || 'Failed to update exam');
  } finally {
    setSaving(false);
  }
};




  const cancel = () => {
    setForm(exam ? { ...exam } : null);
    setNotes('');
    setEditMode(false);
  };

  return (
    <div className="h-screen overflow-y-auto px-4 py-8">
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Exam Detail</h1>
            <p className="text-muted-foreground">Overview of the selected exam</p>
          </div>
          <Button variant="outline" onClick={() => navigate(-1)}>Back</Button>
        </div>

        {loading && (
          <Card><CardHeader><CardTitle>Loading exam...</CardTitle></CardHeader></Card>
        )}
        {error && !loading && (
          <Card><CardHeader><CardTitle>Error</CardTitle><CardDescription>{error}</CardDescription></CardHeader></Card>
        )}
        {!loading && !error && !exam && (
          <Card>
            <CardHeader>
              <CardTitle>Not Found</CardTitle>
              <CardDescription>Exam with id {id} was not found.</CardDescription>
            </CardHeader>
          </Card>
        )}

        {exam && !loading && !error && (
          <Card className="border-none bg-background">
            <CardHeader>
              <CardTitle className="flex items-center gap-3 flex-wrap">
                {editMode ? (
                  <Input
                    value={form?.title || ''}
                    onChange={e => updateField('title', e.target.value)}
                    placeholder="Exam title"
                    className="max-w-sm"
                  />
                ) : (
                  form?.title || exam.title
                )}
                {status && (
                  <Badge variant="secondary" className={status === 'active' ? 'bg-green-500/90 text-white border-green-500' : status === 'upcoming' ? 'bg-blue-500/90 text-white border-blue-500' : 'bg-gray-500/90 text-white border-gray-500'}>
                    {status.charAt(0).toUpperCase() + status.slice(1)}
                  </Badge>
                )}
              </CardTitle>
              <CardDescription>Module: {exam.moduleName || '—'}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4 text-sm">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <div className="text-xs uppercase text-muted-foreground">Start Time</div>
                  {editMode ? (
                    <Input
                      type="datetime-local"
                      value={startISO}
                      onChange={e => updateField('startTime', e.target.value ? new Date(e.target.value).toISOString() : undefined)}
                    />
                  ) : (
                    <div>{form?.startTime ? new Date(form.startTime).toLocaleString() : '—'}</div>
                  )}
                </div>
                <div className="space-y-1">
                  <div className="text-xs uppercase text-muted-foreground">End Time</div>
                  {editMode ? (
                    <Input
                      type="datetime-local"
                      value={endISO}
                      onChange={e => updateField('endTime', e.target.value ? new Date(e.target.value).toISOString() : undefined)}
                    />
                  ) : (
                    <div>{form?.endTime ? new Date(form.endTime).toLocaleString() : '—'}</div>
                  )}
                </div>
                <div className="space-y-1">
                  <div className="text-xs uppercase text-muted-foreground">Exam Duration</div>
                  {editMode ? (
                    <Input
                      type="number"
                      min={1}
                      value={form?.examDuration ?? ''}
                      onChange={e => updateField('examDuration', e.target.value ? Number(e.target.value) : undefined)}
                      placeholder="Minutes"
                      className="max-w-[140px]"
                    />
                  ) : (
                    <div>{form?.examDuration ? `${form.examDuration} min` : '—'}</div>
                  )}
                </div>
               
              </div>
              <div className="space-y-1">
                <div className="text-xs uppercase text-muted-foreground">Exam Date (if date-only)</div>
                <div>{form?.examDate ? new Date(form.examDate).toLocaleDateString() : '—'}</div>
              </div>
              <div className="space-y-1">
                <div className="text-xs uppercase text-muted-foreground">Internal Notes (not saved)</div>
                {editMode ? (
                  <Textarea
                    placeholder="Add internal notes about this exam (not persisted in dummy mode)"
                    value={notes}
                    onChange={e => setNotes(e.target.value)}
                    className="min-h-[80px]"
                  />
                ) : (
                  <div className="text-muted-foreground text-xs">(Enter edit mode to add notes)</div>
                )}
              </div>
              <div className="pt-2 flex gap-2">
                {!editMode && <Button size="sm" onClick={() => setEditMode(true)}>Edit</Button>}
                {editMode && (
                  <>
                    <Button size="sm" variant="outline" onClick={cancel}>Cancel</Button>
                    <Button size="sm" disabled={!!validation || saving} onClick={save}>{validation ? validation : (saving ? 'Saving...' : 'Save')}</Button>
                  </>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        {exam && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><ListChecks className="w-5 h-5 text-indigo-500"/> Questions</CardTitle>
              <CardDescription>Manage questions for this exam (mock data; not persisted).</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {questions.length === 0 ? (
                <div className="rounded-md border p-6 text-center text-muted-foreground">No questions yet. Use "Add Question".</div>
              ) : (
                <div className="space-y-3">
                  {questions.map((q, idx) => (
                    <div key={q.id} className="border rounded-md p-3 bg-card">
                      <div className="flex items-start justify-between gap-3">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <Badge variant="secondary">{q.type === 'choice' ? 'Multiple Choice' : 'Short Answer'}</Badge>
                            <span className="text-xs text-muted-foreground">Q{idx + 1}</span>
                          </div>
                          <p className="font-medium">{q.question}</p>
                          {q.type === 'choice' ? (
                            <ul className="text-sm list-disc pl-5 space-y-1">
                              {(q as QChoice).options.map(opt => (
                                <li key={opt.id} className={opt.id === (q as QChoice).correctAnswer ? 'text-green-600 dark:text-green-400 font-medium' : ''}>
                                  <span className="mr-2">{opt.id}.</span>{opt.text}
                                  {opt.id === (q as QChoice).correctAnswer && <span className="ml-2 inline-flex items-center gap-1 text-xs"><Check className="w-3 h-3"/> Correct</span>}
                                </li>
                              ))}
                            </ul>
                          ) : (
                            <p className="text-sm text-muted-foreground">Answer: {(q as QShort).correctAnswer}</p>
                          )}
                        </div>
                        <div className="flex items-center gap-2">
                          <Button size="sm" variant="ghost" onClick={() => openEditQuestion(idx)}><Pencil className="w-4 h-4"/></Button>
                          <Button size="sm" variant="destructive" onClick={() => deleteQuestion(idx)}><Trash2 className="w-4 h-4"/></Button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
            <div className="flex justify-end px-6 pb-4">
              <Button variant="secondary" size="sm" onClick={openNewQuestion}><Plus className="w-4 h-4 mr-1"/> Add Question</Button>
            </div>
          </Card>
        )}

        <Sheet open={qSheetOpen} onOpenChange={setQSheetOpen}>
          <SheetContent side="right">
            <SheetHeader>
              <SheetTitle>{editingQIndex != null ? 'Edit Question' : 'Add Question'}</SheetTitle>
              <SheetDescription>Update question content and correct answer.</SheetDescription>
            </SheetHeader>
            <div className="p-4 pt-0 space-y-4">
              <div className="space-y-2">
                <Label>Question Type</Label>
                <Select value={formQType} onValueChange={(v) => setFormQType(v as 'choice' | 'short')}>
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
                <Label htmlFor="qtext-edit">Question</Label>
                <Textarea id="qtext-edit" value={formQText} onChange={e => setFormQText(e.target.value)} placeholder="Enter the question text" />
              </div>
              <Textarea id="qmark-edit" value={formQMark} onChange={e => setFormQMark(e.target.value)} placeholder="Enter the question mark" />
              {formQType === 'choice' && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <Label>Options</Label>
                    <Button size="sm" variant="secondary" onClick={addQOption}><Plus className="w-4 h-4 mr-1"/> Add Option</Button>
                  </div>
                  <div className="space-y-2">
                    {formQOptions.map(opt => (
                      <div key={opt.id} className="flex items-center gap-2">
                        <Badge className="w-8 justify-center" variant="secondary">{opt.id}</Badge>
                        <Input value={opt.text} onChange={e => {
                          const v = e.target.value; setFormQOptions(prev => prev.map(o => o.id === opt.id ? { ...o, text: v } : o));
                        }} placeholder={`Option ${opt.id}`} />
                        <Button type="button" size="sm" variant={formQCorrect === opt.id ? 'default' : 'outline'} onClick={() => setFormQCorrect(opt.id)} title="Mark correct">
                          <Check className="w-4 h-4" />
                        </Button>
                        <Button type="button" size="sm" variant="ghost" onClick={() => removeQOption(opt.id)} disabled={formQOptions.length <= 2}>
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              {formQType === 'short' && (
                <div className="space-y-2">
                  <Label htmlFor="correctShortEdit">Correct Answer</Label>
                  <Input id="correctShortEdit" value={formQCorrect} onChange={e => setFormQCorrect(e.target.value)} placeholder="Type the expected answer" />
                </div>
              )}
            </div>
            <SheetFooterC>
              <div className="flex items-center justify-end gap-2">
                <SheetClose asChild>
                  <Button variant="outline" onClick={resetQForm}>Cancel</Button>
                </SheetClose>
                <Button onClick={saveQuestion}>{editingQIndex != null ? 'Update' : 'Add'} Question</Button>
              </div>
            </SheetFooterC>
          </SheetContent>
        </Sheet>
      </div>
    </div>
  );
}
