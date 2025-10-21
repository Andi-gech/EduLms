import { useState, useMemo, useCallback, useEffect } from 'react';
import { useParams } from 'react-router';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { CheckCircle2, XCircle, FileText, Search, Filter, Loader2, PlayCircle, Link2, Paperclip } from 'lucide-react';
import DOMPurify from 'dompurify';
import type { ModuleApprovalStatus } from '@/types/domain';
type Attachment = { id: string; name: string; size: number };
import { useModuleApprovals } from '@/hooks/useApiData';
import { apiClient } from '@/lib/apiClient';
// Removed mock data usage; all data comes from backend approvals endpoints.

export default function ApproveContent() {
  const { courseId: routeCourseId } = useParams();
  const [courseId, setCourseId] = useState<string | undefined>(()=> routeCourseId || undefined);
  const [filter, setFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | ModuleApprovalStatus>('all');
  const [working, setWorking] = useState<string | null>(null);
  const [expanded, setExpanded] = useState(true);
  const [selectedModuleId, setSelectedModuleId] = useState<string | null>(null);

  // Sync when navigating directly to a different course param
  useEffect(()=> {
    if (routeCourseId && routeCourseId !== courseId) {
      setCourseId(routeCourseId);
      setSelectedModuleId(null);
    }
  }, [routeCourseId, courseId]);

  const { data: modulesData, refetch } = useModuleApprovals(statusFilter === 'all' ? 'pending' : statusFilter, courseId);
  const course = useMemo(() => ({
    id: courseId || 'all',
    name: 'Selected',
    code: '',
    modules: (modulesData || []).map((m: any) => ({
      id: m._id,
      title: m.name,
      type: m.type || 'text',
      content: m.content || '',
      status: m.status || 'pending',
      author: m.author || '—',
      order: m.order || 0,
      videoUrl: m.videolink || '',
      linkUrl: m.linkUrl || '',
  attachments: [] as Attachment[],
    }))
  }), [modulesData, courseId]);

  const pendingCount = course.modules.filter(m=>m.status==='pending').length;
  const approvedCount = course.modules.filter(m=>m.status==='approved').length;

  const filteredModules = useMemo(() => course.modules
    .filter(m => !filter || m.title.toLowerCase().includes(filter.toLowerCase()))
    .filter(m => statusFilter==='all' || m.status===statusFilter)
    .sort((a,b)=> a.order - b.order)
  , [course, filter, statusFilter]);

  const selectedModule = useMemo(()=> filteredModules.find(m=> m.id===selectedModuleId) || filteredModules[0] || null, [filteredModules, selectedModuleId]);

  const updateModuleStatus = useCallback(async (id: string, status: ModuleApprovalStatus) => {
    setWorking(id);
    try {
      if (status === 'approved') await apiClient.approveModule(id);
      else if (status === 'rejected') await apiClient.rejectModule(id);
      await refetch();
    } finally { setWorking(null); }
  }, [refetch]);

  const cycleModule = (dir: 1 | -1) => {
    if (!selectedModule) return;
    const idx = filteredModules.findIndex(m => m.id === selectedModule.id);
    const nextIdx = idx + dir;
    if (nextIdx >=0 && nextIdx < filteredModules.length) setSelectedModuleId(filteredModules[nextIdx].id);
  };

  return (
    <div className="flex flex-col h-screen">
      <div className="p-4 md:p-5 border-b border-muted/40 bg-gradient-to-br from-background to-muted/20 flex flex-wrap gap-4 items-end">
  {/* Course filter UI could be added here when backend supports listing pending modules grouped by course */}
        <div className="space-y-1">
          <label className="text-xs font-medium text-muted-foreground">Search</label>
          <div className="relative">
            <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input value={filter} onChange={e=> setFilter(e.target.value)} placeholder="Module title..." className="pl-8 w-56" />
          </div>
        </div>
        <div className="space-y-1">
          <label className="text-xs font-medium text-muted-foreground">Status</label>
            <div className="relative">
              <Filter className="absolute left-2 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <select value={statusFilter} onChange={e=> setStatusFilter(e.target.value as any)} className="pl-8 h-9 px-2 rounded-md border bg-background text-sm w-40">
                <option value="all">All</option>
                <option value="pending">Pending</option>
                <option value="approved">Approved</option>
                <option value="rejected">Rejected</option>
              </select>
            </div>
        </div>
        <div className="ml-auto flex gap-6 text-xs font-medium">
          <div className="flex flex-col text-green-600"><span className="text-[10px] uppercase tracking-wide text-muted-foreground">Approved</span>{approvedCount}</div>
          <div className="flex flex-col text-amber-600"><span className="text-[10px] uppercase tracking-wide text-muted-foreground">Pending</span>{pendingCount}</div>
        </div>
      </div>
      <div className="flex flex-1 overflow-hidden">
        {/* Left List */}
        <div className={`transition-all duration-300 border-r border-muted/40 bg-gradient-to-b from-background to-muted/20 flex flex-col ${expanded ? 'w-72' : 'w-10'}`}>
          <button onClick={()=> setExpanded(e=> !e)} className="h-8 text-[10px] uppercase tracking-wide flex items-center justify-center border-b border-muted/40 hover:bg-muted/40">
            {expanded ? <><ChevronLeftIcon /> Hide</> : <><ChevronRightIcon /> Show</>}
          </button>
          <div className="flex-1 overflow-auto p-2 space-y-2">
            {filteredModules.map(m => {
              const active = selectedModule ? selectedModule.id === m.id : filteredModules[0]?.id === m.id;
              const color = m.status==='approved' ? 'bg-green-500/15 ring-green-500/40' : m.status==='rejected' ? 'bg-red-500/10 ring-red-500/40' : 'bg-amber-500/10 ring-amber-500/40';
              return (
                <button key={m.id} onClick={()=> setSelectedModuleId(m.id)} className={`group w-full text-left rounded-md border border-muted/30 px-3 py-2 text-xs flex flex-col gap-1 ring-1 ring-transparent hover:ring-primary/40 transition ${active ? 'bg-primary/10 ring-primary/50' : color}`}>                  
                  <span className="font-semibold truncate flex items-center gap-1">
                    {m.type==='text' && <FileText className="w-3 h-3 text-primary" />}
                    {m.type==='video' && <PlayCircle className="w-3 h-3 text-indigo-500" />}
                    {m.type==='link' && <Link2 className="w-3 h-3 text-blue-500" />}
                    {m.type==='file' && <Paperclip className="w-3 h-3 text-rose-500" />}
                    {m.title}
                  </span>
                  <span className="flex items-center gap-2 text-[10px] text-muted-foreground">
                    <Badge variant="outline" className="px-1 h-4 text-[9px]">{m.type}</Badge>
                    <span className="capitalize">{m.status}</span>
                  </span>
                </button>
              )})}
            {filteredModules.length === 0 && <div className="text-[10px] text-muted-foreground px-2 py-4">No modules.</div>}
          </div>
        </div>
        {/* Detail */}
        <div className="flex-1 overflow-y-auto p-4 md:p-6">
          {!selectedModule && filteredModules.length === 0 && (
            <div className="border rounded-md p-10 text-center text-sm text-muted-foreground">No modules match filters.</div>
          )}
          {selectedModule && (
            <div className="max-w-4xl mx-auto space-y-6">
              <Card className="border-muted/40 bg-gradient-to-br from-background to-muted/30">
                <div className="p-4 border-b border-muted/40 flex flex-wrap gap-3 items-start">
                  <div className="p-2 rounded-md bg-primary/10"><FileText className="w-5 h-5 text-primary" /></div>
                  <div className="flex-1 min-w-[200px]">
                    <h1 className="text-lg font-semibold leading-tight flex items-center gap-2">{selectedModule.title}
                      <Badge variant={selectedModule.status==='approved' ? 'default' : selectedModule.status==='rejected' ? 'destructive' : 'secondary'} className="capitalize text-[10px] h-5 px-2">{selectedModule.status}</Badge>
                    </h1>
                    <p className="text-[11px] text-muted-foreground mt-1">Author: {selectedModule.author} • Order {selectedModule.order}</p>
                  </div>
                  <div className="flex gap-2 ml-auto text-[10px]">
                    <Button variant="outline" size="sm" disabled={working===selectedModule.id || selectedModule.status==='approved'} onClick={()=> updateModuleStatus(selectedModule.id,'approved')} className="h-8 px-3 text-xs">
                      {working===selectedModule.id ? <Loader2 className="w-3 h-3 animate-spin" /> : <CheckCircle2 className="w-3 h-3 mr-1" />}
                      {selectedModule.status==='approved' ? 'Approved' : 'Approve'}
                    </Button>
                    <Button variant="outline" size="sm" disabled={working===selectedModule.id || selectedModule.status==='rejected'} onClick={()=> updateModuleStatus(selectedModule.id,'rejected')} className="h-8 px-3 text-xs">
                      {working===selectedModule.id ? <Loader2 className="w-3 h-3 animate-spin" /> : <XCircle className="w-3 h-3 mr-1" />}
                      {selectedModule.status==='rejected' ? 'Rejected' : 'Reject'}
                    </Button>
                  </div>
                </div>
                <div className="p-5 space-y-5">
                  {selectedModule.type === 'text' && (
                    <div className="prose prose-sm dark:prose-invert max-w-none" dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(selectedModule.content) }} />
                  )}
                  {selectedModule.type === 'video' && (
                    <div className="space-y-3">
                      <div className="aspect-video w-full rounded-md overflow-hidden bg-black/60 border">
                        <iframe
                          className="w-full h-full"
                          src={toEmbedUrl(selectedModule.videoUrl || '')}
                          title={selectedModule.title}
                          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                          allowFullScreen
                        />
                      </div>
                      <div className="text-xs text-muted-foreground">Video URL: {selectedModule.videoUrl}</div>
                    </div>
                  )}
                  {selectedModule.type === 'link' && (
                    <div className="space-y-3">
                      <p className="text-sm leading-relaxed" dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(selectedModule.content) }} />
                      {selectedModule.linkUrl && <a href={selectedModule.linkUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-xs font-medium text-primary underline">Open Resource <Link2 className="w-3 h-3" /></a>}
                    </div>
                  )}
                  {selectedModule.type === 'file' && (
                    <div className="space-y-3">
                      <p className="text-sm" dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(selectedModule.content) }} />
                      <ul className="divide-y rounded-md border bg-muted/30">
                        {(selectedModule.attachments||[]).map(att => (
                          <li key={att.id} className="flex items-center justify-between gap-3 px-3 py-2 text-xs">
                            <span className="flex items-center gap-2 truncate"><Paperclip className="w-3 h-3 opacity-70" />{att.name}</span>
                            <span className="text-[10px] text-muted-foreground">{formatSize(att.size)}</span>
                          </li>
                        ))}
                        {(selectedModule.attachments||[]).length === 0 && <li className="px-3 py-2 text-[10px] text-muted-foreground">No files.</li>}
                      </ul>
                    </div>
                  )}
                </div>
                <div className="px-5 pb-5 flex justify-between text-[11px] text-muted-foreground">
                  <div>{filteredModules.findIndex(m=>m.id===selectedModule.id)+1} / {filteredModules.length}</div>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" disabled={filteredModules.length<2 || filteredModules[0].id===selectedModule.id} onClick={()=> cycleModule(-1)} className="h-7 px-2 text-[10px]">Prev</Button>
                    <Button variant="outline" size="sm" disabled={filteredModules.length<2 || filteredModules[filteredModules.length-1].id===selectedModule.id} onClick={()=> cycleModule(1)} className="h-7 px-2 text-[10px]">Next</Button>
                  </div>
                </div>
              </Card>
              <div className="text-[10px] text-muted-foreground">Live data from /coursemodule/approvals (filtered by status). Approve/Reject calls backend.</div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// Lightweight icon fallbacks for collapse toggle (avoid extra imports)
function ChevronLeftIcon() { return <span className="text-xs">◀</span>; }
function ChevronRightIcon() { return <span className="text-xs">▶</span>; }
function toEmbedUrl(url: string) {
  try {
    if (!url) return '';
    const u = new URL(url);
    if (u.hostname.includes('youtube.com')) {
      if (u.searchParams.get('v')) return `https://www.youtube.com/embed/${u.searchParams.get('v')}`;
      if (u.pathname.startsWith('/embed/')) return url;
    }
    if (u.hostname === 'youtu.be') return `https://www.youtube.com/embed/${u.pathname.slice(1)}`;
    return url;
  } catch { return url; }
}
function formatSize(bytes: number) {
  if (bytes < 1024) return bytes + ' B';
  const kb = bytes / 1024; if (kb < 1024) return kb.toFixed(1) + ' KB';
  const mb = kb / 1024; return mb.toFixed(2) + ' MB';
}
