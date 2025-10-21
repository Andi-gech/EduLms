import React, { useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Upload, ArrowLeft } from 'lucide-react';
import { useAssignment, useSubmitAssignmentMutation, QK } from '@/hooks/useApiData';
import type { AssignmentDoc, AssignmentSubmissionDoc, AssignmentStatus } from '@/types/domain';
import { useQueryClient } from '@tanstack/react-query';

const AssignmentDetail: React.FC = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { data: rawAssignment, isLoading, error } = useAssignment(id);
  const qc = useQueryClient();
  const submitMutation = useSubmitAssignmentMutation();
  const [file, setFile] = useState<File | null>(null);
  const [dragActive, setDragActive] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  if (isLoading) {
    return (
      <div className="p-8">
        <Button variant="outline" onClick={() => navigate(-1)} className="mb-4"><ArrowLeft className="w-4 h-4" /> Back</Button>
        <p className="text-sm text-muted-foreground">Loading assignment...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-8">
        <Button variant="outline" onClick={() => navigate(-1)} className="mb-4"><ArrowLeft className="w-4 h-4" /> Back</Button>
        <p className="text-red-500 text-sm">Failed to load assignment.</p>
      </div>
    );
  }

  // Backend single assignment endpoint augments with { status, submission }
  interface AugmentedAssignment extends AssignmentDoc { status?: AssignmentStatus; submission?: AssignmentSubmissionDoc | null; grade?: number }
  const assignment = rawAssignment as AugmentedAssignment | undefined;

  if (!assignment) {
    return (
      <div className="p-8">
        <Button variant="outline" onClick={() => navigate(-1)} className="mb-4"><ArrowLeft className="w-4 h-4" /> Back</Button>
        <p className="text-red-500">Assignment not found.</p>
      </div>
    );
  }
  const isClosed = assignment.status === 'overdue';


  const handleDrag = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      setFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
    }
  };

  const handleBrowseClick = () => {
    inputRef.current?.click();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file || !id) return;
    try {
      setSubmitting(true);
      const form = new FormData();
      form.append('file', file);
      if (notes) form.append('notes', notes);
      await submitMutation.mutateAsync({ assignmentId: id, form });
      setSubmitted(true);
      // Refetch assignment detail to update status/submission info
      qc.invalidateQueries({ queryKey: QK.assignment(id) });
    } catch (_err) {
      // simple silent failure; could add toast/error message here
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="h-screen px-4 py-8   overflow-x-hidden transition-colors">
           <div className="max-w-6xl mx-auto space-y-8">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div className='gab-4'>
            <h1 className="text-3xl font-bold tracking-tight text-gray-900 dark:text-gray-100">
                Assignment Details
            </h1>
            <p className="text-gray-600 mb-2 dark:text-gray-400">
                View and manage your assignment details
            </p>
            <Button variant="outline" onClick={() => navigate('/Assignments')} size="sm"><ArrowLeft className="w-4 h-4" /> Back</Button>
          </div>
       </div>

        <Card className="border-gray-200 dark:border-gray-800">
          <CardHeader>
            <CardTitle>{typeof assignment.course === 'string' ? assignment.course : 'Course'} • {assignment.title}</CardTitle>
            <CardDescription>Points: {assignment.points} • Due: {new Date(assignment.dueDate).toLocaleString()}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed">{assignment.description}</p>
            {assignment.status === 'graded' && assignment.submission && (
              <div className="p-3 rounded-md bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300 text-sm font-medium">Graded: {assignment.submission.grade}/{assignment.points}</div>
            )}
            {assignment.status === 'submitted' && (
              <div className="p-3 rounded-md bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300 text-sm font-medium">Submitted - awaiting grading</div>
            )}
            {isClosed && (
              <div className="p-3 rounded-md bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 text-sm font-medium">Submission window closed.</div>
            )}
          </CardContent>
        </Card>

        {assignment.status === 'pending' && !isClosed && !submitted && (
          <Card className="border-gray-200 dark:border-gray-800">
            <CardHeader>
              <CardTitle>Submit Work</CardTitle>
              <CardDescription>Upload your file and optional notes</CardDescription>
            </CardHeader>
            <CardContent>
              <form className="space-y-5" onSubmit={handleSubmit}>
                <div className="space-y-2">
                  <label className="text-sm font-medium">File Upload<span className="text-red-500">*</span></label>
                  <div
                    className={`relative flex flex-col items-center mt-4 justify-center border-2 border-dashed rounded-md transition-colors h-32 cursor-pointer select-none
                      ${dragActive ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-900/20' : 'border-gray-300 dark:border-gray-700 bg-gray-950/30 dark:bg-gray-900/40'}`}
                    onDragEnter={handleDrag}
                    onDragOver={handleDrag}
                    onDragLeave={handleDrag}
                    onDrop={handleDrop}
                    onClick={handleBrowseClick}
                  >
                    <input
                      ref={inputRef}
                      type="file"
                      required
                      className="hidden"
                      onChange={handleFileChange}
                    />
                    <Upload className="w-8 h-8 text-indigo-400 mb-2" />
                    <span className="text-sm text-gray-700 dark:text-gray-300">
                      {file ? (
                        <span>Selected: <span className="font-medium">{file.name}</span></span>
                      ) : (
                        <span>Drag & drop file here, or <span className="underline text-indigo-600 dark:text-indigo-400">browse</span></span>
                      )}
                    </span>
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Notes (optional)</label>
                  <Textarea className='mt-2 ' value={notes} onChange={e => setNotes(e.target.value)} placeholder="Add any comments for the instructor..." />
                </div>
                <div className="flex items-center gap-3">
                  <Button type="submit" disabled={!file || submitting} className="gap-2">
                    <Upload className="w-4 h-4" />
                    {submitting ? 'Submitting...' : 'Submit Assignment'}
                  </Button>
                </div>
              </form>
            </CardContent>
            <CardFooter className="text-xs text-muted-foreground">
              Ensure your file matches the required format before submitting.
            </CardFooter>
          </Card>
        )}

        {(assignment.status !== 'pending' || submitted) && (
          <div className="text-sm text-gray-600 dark:text-gray-400">Status: {submitted ? 'submitted' : assignment.status}</div>
        )}
      </div>
    </div>
  );
};

export default AssignmentDetail;
