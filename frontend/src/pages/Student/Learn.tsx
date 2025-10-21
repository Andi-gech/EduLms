import { Lock, CheckCircle2, PlayCircle, FileText, ChevronLeft, ChevronRight } from "lucide-react";
import QuillEditor from "@/components/richtext/QuillEditor"; // reuse existing editor (read-only)
import { Badge } from "@/components/ui/badge";
import { useMemo, useState, useCallback, useRef, useEffect } from "react";
import DOMPurify from "dompurify";
import { Button } from "@/components/ui/button";
import { useParams } from "react-router";
import { useModulesProgress, useModuleDetail, useCompleteModuleMutation } from "@/hooks/useApiData";

interface DerivedModuleItem {
  id: string; title: string; order: number; completed: boolean; unlocked: boolean; type: 'video' | 'pdf' | 'ppt' | 'text' | 'link' | 'file'; file?: string; htmlContent?: string; description?: string; videolink?: string;
}

export default function Learn() {
  const { courseId } = useParams();
  const { data: progressList, isLoading: loadingProgress } = useModulesProgress(courseId);
  const [selected, setSelected] = useState(0);
  const selectedModuleId = progressList && progressList[selected]?._id;
  const { data: moduleDetail } = useModuleDetail(courseId, selectedModuleId);
  const completeMutation = useCompleteModuleMutation();

  // Build derived modules array with sequential unlocking (previous must be completed)
  const modules: DerivedModuleItem[] = useMemo(() => {
    if (!progressList) return [];
    let allPrevComplete = true;
    return progressList
      .slice()
      .sort((a: any, b: any) => a.order - b.order)
      .map((m: any) => {
        const unlocked = allPrevComplete;
        const completed = !!m.completed;
        if (!completed) allPrevComplete = false;

        const isDetailed = moduleDetail && moduleDetail._id === m._id;
        const rawType: string | undefined = isDetailed ? moduleDetail.type : undefined;
        const filePath: string | undefined = isDetailed ? moduleDetail.videolink : undefined; // backend uses videolink for uploaded media/file

        let finalType: DerivedModuleItem['type'] = 'text';
        if (rawType === 'video') finalType = 'video';
        else if (rawType === 'link') finalType = 'link';
        else if (rawType === 'file') {
          if (filePath) {
            const lower = filePath.toLowerCase();
            if (lower.endsWith('.pdf')) finalType = 'pdf';
            else if (lower.endsWith('.ppt') || lower.endsWith('.pptx')) finalType = 'ppt';
            else if (/(\.mp4|\.webm|\.ogg)$/.test(lower)) finalType = 'video';
            else finalType = 'file';
          } else finalType = 'file';
        } else if (rawType === 'text') finalType = 'text';
        else if (!rawType) {
          if (filePath) {
            const lower = filePath.toLowerCase();
            if (lower.endsWith('.pdf')) finalType = 'pdf';
            else if (lower.endsWith('.ppt') || lower.endsWith('.pptx')) finalType = 'ppt';
            else if (/(youtube|vimeo)/.test(lower) || /(\.mp4|\.webm|\.ogg)$/.test(lower)) finalType = 'video';
            else finalType = 'file';
          } else finalType = 'text';
        }

        return {
          id: m._id,
          title: m.name,
          order: m.order,
          completed,
          unlocked,
          type: finalType,
          file: filePath,
          description: isDetailed ? moduleDetail.content : undefined,
          htmlContent: isDetailed ? moduleDetail.content : undefined,
          videolink: isDetailed ? moduleDetail.videolink : undefined,
        } as DerivedModuleItem;
      });
  }, [progressList, moduleDetail]);

  const modulesWithExam = modules; // already merged
  const current = modulesWithExam[selected] || null;

  const sanitizedHtml = useMemo(() => {
    if (!current) return '';
    if (current.htmlContent) return DOMPurify.sanitize(current.htmlContent);
    if (current.description) {
      const html = current.description.split(/\n{2,}/).map(p => `<p>${p}</p>`).join('\n');
      return DOMPurify.sanitize(html);
    }
    return '';
  }, [current]);

  const totalCompleted = modulesWithExam.filter(m => m.completed).length;
  const progressPct = modulesWithExam.length ? Math.round((totalCompleted / modulesWithExam.length) * 100) : 0;

  const markComplete = useCallback(() => {
    if (!current || !courseId) return;
    completeMutation.mutate({ courseId, moduleId: current.id });
  }, [completeMutation, current, courseId]);

  const goNext = useCallback(() => {
    // Prevent moving forward unless current module is completed
    if (!current || !current.completed) return;
    if (selected < modulesWithExam.length - 1) setSelected(s => s + 1);
  }, [current, selected, modulesWithExam.length]);
  const goPrev = useCallback(() => { if (selected > 0) setSelected(s => s - 1); }, [selected]);

  const [sidebarOpen, setSidebarOpen] = useState(true);
  const sidebarRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!sidebarOpen) return;
    const handle = (e: MouseEvent | TouchEvent) => {
      if (!sidebarRef.current) return;
      const target = e.target as Node;
      if (sidebarRef.current.contains(target)) return;
      const btn = document.querySelector('[aria-label="Open modules sidebar"]');
      if (btn && btn.contains(target)) return;
      setSidebarOpen(false);
    };
    document.addEventListener('mousedown', handle);
    document.addEventListener('touchstart', handle as EventListener, { passive: true });
    return () => {
      document.removeEventListener('mousedown', handle);
      document.removeEventListener('touchstart', handle as EventListener);
    };
  }, [sidebarOpen]);

  const buildFileUrl = (file?: string) => {
    if (!file) return undefined;
    if (/^https?:\/\//i.test(file)) return file; // absolute
    return `${window.location.origin}/${file.replace(/^\/+/, '')}`;
  };

  const renderEmbeddedContent = (module: DerivedModuleItem | null) => {
    if (!module) return <div className="p-8 text-center border rounded-md">No module selected</div>;
    const fileUrl = buildFileUrl(module.videolink);
    switch (module.type) {
      case 'video': {
        let src: string | undefined;
        if (fileUrl) {
          
          const ytMatch = fileUrl.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([\w-]+)/);
          if (ytMatch && ytMatch[1]) {
            src = `https://www.youtube.com/embed/${ytMatch[1]}`;
          } else if (/vimeo\.com\/(\d+)/.test(fileUrl)) {
            const vimeoId = fileUrl.match(/vimeo\.com\/(\d+)/)?.[1];
            if (vimeoId) src = `https://player.vimeo.com/video/${vimeoId}`;
          } else if (/(\.mp4|\.webm|\.ogg)$/.test(fileUrl)) {
            src = fileUrl;
          } else {
            src = fileUrl;
          }
        }
        return (
          <div className="aspect-video w-full rounded-lg overflow-hidden shadow border border-muted/40 bg-black/60">
            {src ? (
              src.startsWith("http") && (src.includes("youtube.com/embed") || src.includes("player.vimeo.com")) ? (
                <iframe
                  src={src}
                  className="w-full h-full"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                  title={module.title}
                />
              ) : /\.(mp4|webm|ogg)$/.test(src) ? (
                <video src={src} controls className="w-full h-full bg-black" />
              ) : (
                <div className="flex items-center justify-center h-full text-xs text-muted-foreground">Cannot embed this video type.</div>
              )
            ) : (
              <div className="flex items-center justify-center h-full text-xs text-muted-foreground">No video source</div>
            )}
          </div>
        );
      }
      case 'pdf':
        return (
          <div className="w-full h-[480px] rounded-lg overflow-hidden shadow border border-muted/40 bg-muted">
            {fileUrl ? (
              <iframe src={fileUrl} className="w-full h-full" title="PDF" />
            ) : (
              <div className="flex items-center justify-center h-full text-xs text-muted-foreground">PDF not available</div>
            )}
          </div>
        );
      case 'ppt': {
        const embedSrc = fileUrl ? `https://view.officeapps.live.com/op/embed.aspx?src=${encodeURIComponent(fileUrl)}` : undefined;
        return (
          <div className="w-full h-[480px] rounded-lg overflow-hidden shadow border border-muted/40 bg-muted flex flex-col">
            {embedSrc ? (
              <iframe src={embedSrc} className="w-full flex-1" title="PowerPoint" />
            ) : (
              <div className="flex items-center justify-center flex-1 text-xs text-muted-foreground">Presentation not available</div>
            )}
            {fileUrl && (
              <a href={fileUrl} download className="text-[10px] px-3 py-2 bg-primary text-primary-foreground text-center">Download PPT</a>
            )}
          </div>
        );
      }
      case 'link':
        return (
          <div className="p-4 border rounded-md bg-muted/20 text-xs space-y-2">
            <div>This module contains an external link:</div>
            {moduleDetail.linkUrl ? (
              <a href={moduleDetail.linkUrl} target="_blank" rel="noopener" className="text-primary underline break-all">{moduleDetail.linkUrl}</a>
            ) : (
              <span className="text-muted-foreground">Link not provided.</span>
            )}
          </div>
        );
      case 'file':
        return (
          <div className="p-4 border rounded-md bg-muted/20 text-xs space-y-2">
            <div>Download attached file:</div>
            {moduleDetail.linkUrl ? (
              <a href={moduleDetail.linkUrl} download className="inline-flex items-center gap-2 px-3 py-2 rounded-md bg-primary text-primary-foreground text-[11px]">
                <FileText className="w-3 h-3" /> Download
              </a>
            ) : (
              <span className="text-muted-foreground">File not available.</span>
            )}
          </div>
        );
      default:
        return <div className="p-4 border rounded-md bg-muted/20 text-xs">Text-only module. Content below.</div>;
    }
  };

  return (
    <div className="h-screen flex overflow-hidden relative bg-background">
      <main className="flex-1 h-full overflow-y-auto p-4 md:p-8 space-y-6">
        {loadingProgress && <div className="text-sm text-muted-foreground">Loading modules...</div>}
        {!loadingProgress && courseId && !modulesWithExam.length && <div className="text-sm text-muted-foreground">No modules found for this course.</div>}
        {current && (
          <>
            <div className="space-y-2">
              <div className="flex flex-wrap items-center gap-3">
                <h1 className="text-2xl font-semibold tracking-tight leading-tight flex items-center gap-2">
                  {current.title}
                  {current.completed && <Badge variant="secondary" className="text-[10px]">Completed</Badge>}
                </h1>
              </div>
              <p className="text-sm text-muted-foreground max-w-2xl">Enhance your skills with this comprehensive module.</p>
            </div>
            {renderEmbeddedContent(current)}
            {(sanitizedHtml) && (
              <div className="bg-gradient-to-br from-background to-muted/30 border border-muted/40 rounded-lg overflow-hidden">
                <div className="px-5 py-3 border-b border-muted/40 flex items-center justify-between bg-muted/30">
                  <h3 className="text-sm font-semibold tracking-wide">Module Content</h3>
                  <span className="text-[10px] uppercase text-muted-foreground">Read Only</span>
                </div>
                <div className="p-0">
                  <QuillEditor
                    readOnly
                    value={sanitizedHtml}
                    className="ql-container ql-snow border-0 !rounded-none !bg-transparent [&_.ql-toolbar]:hidden [&_.ql-editor]:p-5 [&_.ql-editor]:prose [&_.ql-editor]:prose-sm dark:[&_.ql-editor]:prose-invert"
                  />
                </div>
              </div>
            )}
            <div className="flex flex-wrap justify-between gap-3 border-t pt-4">
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={goPrev} disabled={selected===0}><ChevronLeft className="w-3 h-3 mr-1" />Previous</Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={goNext}
                  disabled={selected===modulesWithExam.length-1 || !current.completed}
                  title={!current.completed ? 'Complete this module to proceed' : undefined}
                >
                  Next<ChevronRight className="w-3 h-3 ml-1" />
                </Button>
              </div>
              <div className="flex gap-2">
                {current.unlocked ? (
                  <>
                    {!current.completed && (
                      <Button size="sm" className="bg-green-600 hover:bg-green-700" disabled={(completeMutation as any).isPending} onClick={markComplete}>{(completeMutation as any).isPending ? 'Saving...' : 'Mark Complete'}</Button>
                    )}
                    {current.completed && <Badge variant="secondary" className="text-[10px] ml-1">Completed</Badge>}
                  </>
                ) : (
                  <div className="flex items-center gap-2 bg-yellow-50 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-300 px-3 py-2 rounded-md text-xs"><Lock className="w-3 h-3" /> Locked</div>
                )}
              </div>
            </div>
            <div className="text-[10px] text-muted-foreground pb-6">Modules unlock sequentially; mark each module complete to unlock the next.</div>
          </>
        )}
      </main>
      {sidebarOpen && (
        <div
          onClick={() => setSidebarOpen(false)}
          className="absolute inset-0 z-30 animate-in fade-in bg-gradient-to-r from-black/40 via-black/20 to-transparent backdrop-blur-[2px] cursor-pointer"
          aria-hidden
        />
      )}
      <aside ref={sidebarRef} className={`absolute top-0 right-0 h-full bg-background border-l border-muted/40 flex flex-col w-80 md:w-96 transition-transform duration-300 ease-in-out z-40 shadow-xl ${sidebarOpen ? 'translate-x-0' : 'translate-x-full'}`}>        
        <div className="px-4 py-3 flex items-start gap-3 border-b border-muted/40">
          <div className="flex-1 min-w-0">
            <h2 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-1">Modules</h2>
            <div className="flex items-center gap-2 text-[10px] font-medium mb-1">
              <span className="px-1.5 py-0.5 rounded bg-primary/10 text-primary">{totalCompleted}/{modulesWithExam.length}</span>
              <span className="text-muted-foreground">{progressPct}%</span>
            </div>
            <div className="h-1.5 rounded bg-muted overflow-hidden">
              <div className="h-full bg-primary transition-all" style={{ width: `${progressPct}%` }} />
            </div>
          </div>
          <Button variant="ghost" size="icon" aria-label="Close sidebar" onClick={() => setSidebarOpen(false)} className="mt-1">
            <ChevronRight className="w-4 h-4" />
          </Button>
        </div>
        <ul className="flex-1 overflow-y-auto p-3 space-y-2">
          {modulesWithExam.map((m, idx) => {
            const locked = !m.unlocked;
            const isActive = idx === selected;
            const done = m.completed;
            return (
              <li key={m.id}>
                <button
                  disabled={locked}
                  onClick={() => setSelected(idx)}
                  className={`group w-full text-left rounded-md px-3 py-2 border text-[11px] flex items-center gap-2 transition ${isActive ? 'border-primary bg-primary/10' : 'border-muted/40 hover:bg-muted/40'} ${locked ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
                >
                  <span className="inline-flex w-4 h-4 items-center justify-center">
                    {locked ? <Lock className="w-3 h-3"/> : done ? <CheckCircle2 className="w-3 h-3 text-green-500"/> : <PlayCircle className="w-3 h-3 text-primary"/>}
                  </span>
                  <span className="flex-1 truncate font-medium leading-tight">{m.title}</span>
                </button>
                {isActive && (
                  <div className="ml-7 mt-1 text-[10px] text-muted-foreground flex items-center gap-3">
                    <span>{locked ? 'Locked' : done ? 'Completed' : 'In Progress'}</span>
                  </div>
                )}
              </li>
            );
          })}
        </ul>
        <div className="border-t border-muted/40 p-3 flex gap-2">
          <Button variant="outline" size="sm" onClick={goPrev} disabled={selected===0} className="w-1/2 text-xs"><ChevronLeft className="w-3 h-3 mr-1"/>Prev</Button>
          <Button
            variant="outline"
            size="sm"
            onClick={goNext}
            disabled={selected===modulesWithExam.length-1 || !current?.completed}
            className="w-1/2 text-xs"
            title={!current?.completed ? 'Complete this module to proceed' : undefined}
          >
            Next<ChevronRight className="w-3 h-3 ml-1"/>
          </Button>
        </div>
      </aside>
      {!sidebarOpen && (
        <button
          onClick={() => setSidebarOpen(true)}
          aria-label={`Open modules sidebar. ${progressPct}% complete`}
          className="group fixed  bottom-0 -translate-y-1/2 right-3 z-40 flex items-center gap-3 pl-3 pr-4 py-2 rounded-full shadow-lg border border-primary/30 bg-gradient-to-r from-primary/90 via-primary to-primary/80 text-primary-foreground backdrop-blur-sm hover:from-primary hover:to-primary/90 transition focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/60"
        >
          <span className="relative flex items-center justify-center w-9 h-9 rounded-full bg-background/20 ring-1 ring-white/20 overflow-hidden">
            <svg className="absolute inset-0 w-full h-full scale-[1.15] opacity-30" viewBox="0 0 36 36" fill="none" stroke="currentColor" strokeWidth="4">
              <path className="text-primary-foreground/20" d="M18 2a16 16 0 1 1 0 32 16 16 0 0 1 0-32" strokeLinecap="round" />
              <path className="text-white" d="M18 2a16 16 0 1 1 0 32 16 16 0 0 1 0-32" strokeDasharray="100" strokeDashoffset={100 - progressPct} strokeLinecap="round" />
            </svg>
            <ChevronLeft className="w-4 h-4 relative z-10 transition-transform group-hover:-translate-x-0.5" />
          </span>
          <span className="flex flex-col leading-tight text-left">
            <span className="text-xs font-semibold tracking-wide uppercase">Modules</span>
            <span className="text-[10px] font-medium text-primary-foreground/80">{progressPct}% Complete</span>
          </span>
          <span className="absolute inset-0 rounded-full pointer-events-none opacity-0 group-hover:opacity-100 transition animate-pulse bg-white/10" />
        </button>
      )}
    </div>
  );
}
