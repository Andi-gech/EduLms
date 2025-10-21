import { useState, useMemo, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router';
import { Card } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Textarea } from '../../components/ui/textarea';
import QuillEditor from '../../components/richtext/QuillEditor';
import type { ModuleAttachmentEdit as ModuleAttachment, ModuleEditItem as ModuleItem, ModuleEditType, CourseModuleDoc } from '@/types/domain';
import { apiClient } from '@/lib/apiClient';
import { extractErrorMessage } from '@/hooks/useApiData';

// Lightweight local file attachment widget (dummy mode – no upload yet)
function FileAttachments({ attachments, onAdd, onRemove }: { attachments: ModuleAttachment[]; onAdd: (files: ModuleAttachment[]) => void; onRemove: (id: string) => void }) {
  const formatSize = (bytes: number) => {
    if (bytes < 1024) return bytes + ' B';
    const kb = bytes / 1024;
    if (kb < 1024) return kb.toFixed(1) + ' KB';
    return (kb / 1024).toFixed(2) + ' MB';
  };
  const handleSelect: React.ChangeEventHandler<HTMLInputElement> = e => {
    const list = e.target.files;
    if (!list || list.length === 0) return;
  const added: ModuleAttachment[] = [];
    for (let i = 0; i < list.length; i++) {
      const f = list.item(i)!;
      added.push({ id: (crypto?.randomUUID?.() || `${Date.now()}-${i}`), name: f.name, size: f.size, type: f.type, file: f });
    }
    onAdd(added);
    // reset input so same file can be selected again if needed
    e.target.value = '';
  };
  return (
    <div className="space-y-2">
      <div>
        <input
          type="file"
          multiple
          onChange={handleSelect}
          className="block w-full text-xs file:mr-2 file:py-1 file:px-2 file:rounded file:border file:border-muted-foreground/20 file:bg-muted/40 file:text-xs file:cursor-pointer"
        />
        <p className="text-[10px] text-muted-foreground mt-1">Files are kept locally (dummy). Not uploaded yet.</p>
      </div>
      {attachments.length > 0 && (
        <ul className="space-y-1 max-h-40 overflow-auto pr-1">
          {attachments.map(a => (
            <li key={a.id} className="flex items-center justify-between gap-2 text-xs bg-muted/40 rounded px-2 py-1">
              <div className="flex flex-col overflow-hidden">
                <span className="truncate font-medium">{a.name}</span>
                <span className="text-[10px] text-muted-foreground">{formatSize(a.size)} • {a.type || 'unknown'}</span>
              </div>
              <button
                type="button"
                onClick={() => onRemove(a.id)}
                className="text-red-500 hover:text-red-600 text-[10px] font-semibold"
                aria-label={`Remove ${a.name}`}
              >Remove</button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

// Extract YouTube video ID from common URL formats
function getYouTubeId(url?: string) {
  if (!url) return null;
  try {
    const u = new URL(url);
    if (u.hostname.includes('youtu.be')) return u.pathname.slice(1) || null;
    if (u.searchParams.get('v')) return u.searchParams.get('v');
    if (u.hostname.includes('youtube.com') && u.pathname.startsWith('/embed/')) return u.pathname.split('/')[2] || null;
  } catch (_) { /* ignore */ }
  return null;
}

export default function CourseModulesManage() {
  const { courseId } = useParams();
  const navigate = useNavigate();
  const [modules, setModules] = useState<ModuleItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [courseName, setCourseName] = useState('');
  const [filter, setFilter] = useState('');

  // Fetch existing modules
  useEffect(() => {
    if (!courseId) return;
    setLoading(true);
    (async () => {
      try {
        const course = await apiClient.getCourse(courseId).catch(() => null);
        if (course) setCourseName(course.name);
        const mods: CourseModuleDoc[] = await apiClient.listCourseModules(courseId);
        setModules(mods.map(m => ({ _id: m._id, name: m.name, content: m.content || '', order: m.order, type: (m as any).type || 'text', videoUrl: m.videolink, linkUrl: (m as any).linkUrl, attachments: [], isNew: false, changed: false })));
        setError(null);
      } catch (e) {
        setError(extractErrorMessage(e));
      } finally { setLoading(false); }
    })();
  }, [courseId]);

  const addModule = () => {
    setModules(prev => [...prev, { name: '', content: '', order: (prev[prev.length - 1]?.order ?? 0) + 1, type: 'text', attachments: [], isNew: true, changed: true }]);
  };

  const updateModuleField = (index: number, field: keyof ModuleItem, value: any) => {
    setModules(prev => prev.map((m, i) => i === index ? { ...m, [field]: value, changed: true } : m));
  };

  const deleteModule = (mod: ModuleItem, index: number) => {
    if (!confirm('Delete this module?')) return;
    if (mod._id && courseId) {
      // Optimistic UI removal
      const prevSnapshot = modules;
      setModules(prev => prev.filter((_, i) => i !== index));
      apiClient.deleteModule(courseId, mod._id).catch(err => {
        alert('Delete failed: ' + extractErrorMessage(err));
        setModules(prevSnapshot); // revert
      });
    } else {
      setModules(prev => prev.filter((_, i) => i !== index));
    }
  };

  const saveChanges = async () => {
    if (!courseId) { alert('Missing courseId in route'); return; }
    setSaving(true);
    try {
      // Validate locally
      for (const mod of modules) {
        if (!mod.name.trim()) throw new Error('All modules must have a name.');
        if (mod.type === 'text' && !mod.content.trim()) throw new Error('Text modules require content.');
        if (mod.type === 'video' && !mod.videoUrl?.trim()) throw new Error('Video modules require a video URL.');
        if (mod.type === 'link' && !mod.linkUrl?.trim()) throw new Error('Link modules require a link URL.');
        if (mod.type === 'file' && (!mod.attachments || mod.attachments.length === 0)) throw new Error('File modules require at least one attachment (UI-only, not uploaded).');
      }
      // Persist changed modules (sequential to simplify ordering uniqueness errors)
      for (const mod of modules.filter(m => m.isNew || m.changed)) {
        const payload: any = { name: mod.name, content: mod.content, order: mod.order, type: mod.type };
        if (mod.type === 'video') payload.videolink = mod.videoUrl;
        if (mod.type === 'link') payload.linkUrl = mod.linkUrl;
        // first new modules
        if (mod.isNew) {
          const created = await apiClient.createModule(courseId, payload);
          mod._id = created._id;
          mod.isNew = false;
          mod.changed = false;
        } else if (mod._id) {
          await apiClient.updateModule(courseId, mod._id, payload);
          mod.changed = false;
        }
      }
      setModules(prev => prev.map(m => ({ ...m })));
      alert('Modules saved');
    } catch (e: any) {
      alert(e.message || extractErrorMessage(e));
    } finally {
      setSaving(false);
    }
  };

  const sortedFiltered = useMemo(() => modules
    .filter(m => !filter || m.name.toLowerCase().includes(filter.toLowerCase()))
    .sort((a,b) => a.order - b.order)
  , [modules, filter]);

  // Drag & drop state
  const [dragId, setDragId] = useState<string | null>(null);
  const [dragOverId, setDragOverId] = useState<string | null>(null);
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});

  const toggleCollapse = (key: string) => {
    setCollapsed(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const canReorder = !filter; // disable reorder while filtering to avoid confusion

  const handleDragStart = (id: string) => {
    if (!canReorder) return;
    setDragId(id);
  };
  const handleDragEnter = (id: string) => {
    if (!canReorder) return;
    if (id !== dragId) setDragOverId(id);
  };
  const handleDragEnd = () => {
    if (!canReorder) { setDragId(null); setDragOverId(null); return; }
    if (dragId && dragOverId && dragId !== dragOverId) {
      const working = [...sortedFiltered];
      const fromIdx = working.findIndex(m => (m._id || '') === dragId);
      const toIdx = working.findIndex(m => (m._id || '') === dragOverId);
      if (fromIdx !== -1 && toIdx !== -1) {
        const [moved] = working.splice(fromIdx, 1);
        working.splice(toIdx, 0, moved);
        // Reassign sequential order numbers starting at 1
        working.forEach((m, i) => { m.order = i + 1; m.changed = true; });
        // Update base modules state
        setModules(prev => prev.map(orig => {
          const found = working.find(w => w._id === orig._id);
            return found ? { ...orig, order: found.order, changed: true } : orig;
        }));
      }
    }
    setDragId(null);
    setDragOverId(null);
  };

  const dragIndicatorClass = (id?: string) => {
    if (!canReorder) return '';
    if (id === dragId) return 'ring-2 ring-primary/60 opacity-70';
    if (id === dragOverId) return 'ring-2 ring-muted-foreground/50';
    return '';
  };

  return (
    <div className="p-4 md:p-6 h-screen overflow-y-auto space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">Modules • {courseName || 'Course'}</h1>
          <p className="text-sm text-muted-foreground">Create, reorder, and edit course learning modules.</p>
        </div>
        <div className="flex gap-2 w-full md:w-auto">
          <Input placeholder="Filter modules..." value={filter} onChange={e => setFilter(e.target.value)} className="w-full md:w-56" />
          <Button onClick={addModule} type="button">Add</Button>
        </div>
      </div>
  {loading && <div className="text-sm text-muted-foreground">Loading modules...</div>}
  {error && <div className="text-sm text-red-600">{error}</div>}
      {!loading && !error && (
        <div className="space-y-4">
          {sortedFiltered.map((mod, idx) => {
            const key = mod._id || `n-${idx}`;
            const isCollapsed = collapsed[key];
            return (
              <Card
                key={key}
                className={`p-3 flex flex-col gap-3 relative border-muted/40 bg-gradient-to-br from-background to-muted/30 ${dragIndicatorClass(mod._id)}`}
                onDragEnter={() => handleDragEnter(mod._id || '')}
                onDragOver={e => { if (canReorder && dragId) e.preventDefault(); }}
              >
                <div className="flex flex-wrap items-center gap-3">
                  <button
                    type="button"
                    onClick={() => toggleCollapse(key)}
                    className="w-8 h-8 text-2xl flex items-center justify-center rounded hover:bg-muted/70 border border-transparent hover:border-muted-foreground/10 transition"
                    aria-label={isCollapsed ? 'Expand module' : 'Collapse module'}
                  >
                    <span className="select-none">{isCollapsed ? '▸' : '▾'}</span>
                  </button>
                  {canReorder && (
                    <button
                      type="button"
                      aria-label="Drag to reorder"
                      draggable={canReorder}
                      onDragStart={() => handleDragStart(mod._id || '')}
                      onDragEnd={handleDragEnd}
                      className="cursor-grab active:cursor-grabbing text-muted-foreground hover:text-foreground px-1 h-6 flex items-center"
                    >
                      <span className="text-base leading-none select-none">⋮⋮</span>
                    </button>
                  )}
                  <div className="flex items-center gap-2 flex-1 min-w-[200px]">
                    <label className="text-xs font-medium text-muted-foreground">Name</label>
                    <Input value={mod.name} onChange={e => updateModuleField(idx, 'name', e.target.value)} placeholder="Module title" />
                  </div>
                  {!isCollapsed && (
                    <>
                      <div className="flex items-center gap-2 w-40">
                        <label className="text-xs font-medium text-muted-foreground">Type</label>
                        <select
                          className="border rounded px-2 py-1 text-xs bg-background"
                          value={mod.type}
                          onChange={e => {
                            const newType = e.target.value as ModuleEditType;
                            const reset: Partial<ModuleItem> = { type: newType, content: '', videoUrl: undefined, linkUrl: undefined };
                            updateModuleField(idx, 'type', newType);
                            setModules(prev => prev.map((m,i)=> i===idx ? { ...m, ...reset, changed: true } : m));
                          }}
                        >
                          <option value="text">Text</option>
                          <option value="video">Video</option>
                          <option value="link">Link</option>
                          <option value="file">File(s)</option>
                        </select>
                      </div>
                      <div className="flex items-center gap-2 w-24">
                        <span className="text-xs font-medium text-muted-foreground">Order</span>
                        <span className="px-2 py-1 rounded bg-muted text-xs font-mono select-none border border-muted-foreground/10">{mod.order}</span>
                      </div>
                    </>
                  )}
                  {isCollapsed && (
                    <div className="flex items-center gap-3 ml-auto">
                      <span className="text-[10px] text-muted-foreground font-mono">{mod.type}</span>
                      <span className="text-[10px] text-muted-foreground font-mono">ord {mod.order}</span>
                      {mod.type === 'file' && <span className="text-[10px] text-muted-foreground">{(mod.attachments?.length||0)} file(s)</span>}
                      <div className="text-[10px] text-muted-foreground font-mono">{mod.isNew ? 'new*' : mod.changed ? 'edited*' : 'saved'}</div>
                      <Button size="sm" variant="ghost" onClick={() => deleteModule(mod, idx)}>Delete</Button>
                    </div>
                  )}
                </div>
                {!isCollapsed && (
                  <div className="space-y-4">
                    {mod.type === 'text' && (
                      <div className="space-y-1">
                        <label className="text-xs font-medium text-muted-foreground">Rich Text Content</label>
                        <div className="border rounded-md overflow-hidden">
                          <QuillEditor
                            value={mod.content}
                            theme='snow'
                            onTextChange={(_d,_o,_s,html) => updateModuleField(idx, 'content', html)}
                            placeholder="Write lecture notes or description..."
                            className="h-full focus:border-0"
                          />
                        </div>
                        <p className="text-[10px] text-muted-foreground">Formatting (headings, lists, code, links) supported.</p>
                      </div>
                    )}
                    {mod.type === 'video' && (
                      <div className="space-y-2">
                        <div className="flex flex-col gap-1">
                          <label className="text-xs font-medium text-muted-foreground">Video URL (YouTube, Vimeo, etc.)</label>
                          <Input
                            placeholder="https://..."
                            value={mod.videoUrl || ''}
                            onChange={e => updateModuleField(idx, 'videoUrl', e.target.value)}
                          />
                        </div>
                        {mod.videoUrl && (
                          <div className="aspect-video w-full rounded-md overflow-hidden bg-black/30 flex items-center justify-center">
                            {getYouTubeId(mod.videoUrl) ? (
                              <iframe
                                className="w-full h-full"
                                src={`https://www.youtube.com/embed/${getYouTubeId(mod.videoUrl)}`}
                                title="Video preview"
                                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                                allowFullScreen
                              />
                            ) : (
                              <span className="text-[11px] text-muted-foreground px-2">Preview not available</span>
                            )}
                          </div>
                        )}
                      </div>
                    )}
                    {mod.type === 'link' && (
                      <div className="space-y-2">
                        <div className="flex flex-col gap-1">
                          <label className="text-xs font-medium text-muted-foreground">Resource Link URL</label>
                          <Input
                            placeholder="https://..."
                            value={mod.linkUrl || ''}
                            onChange={e => updateModuleField(idx, 'linkUrl', e.target.value)}
                          />
                        </div>
                        <div>
                          <label className="text-xs font-medium text-muted-foreground">Description (optional)</label>
                          <Textarea
                            value={mod.content}
                            onChange={e => updateModuleField(idx, 'content', e.target.value)}
                            className="mt-1"
                            rows={3}
                            placeholder="Short description of the linked resource"
                          />
                        </div>
                        {mod.linkUrl && (
                          <a
                            href={mod.linkUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="text-xs underline text-primary break-all"
                          >
                            {mod.linkUrl}
                          </a>
                        )}
                      </div>
                    )}
                    {mod.type === 'file' && (
                      <div className="space-y-3">
                        <div className="flex flex-col gap-1">
                          <label className="text-xs font-medium text-muted-foreground">Description (optional)</label>
                          <Textarea
                            value={mod.content}
                            onChange={e => updateModuleField(idx, 'content', e.target.value)}
                            rows={3}
                            placeholder="Describe the attached resources"
                          />
                        </div>
                        <FileAttachments
                          attachments={mod.attachments || []}
                          onAdd={files => {
                            setModules(prev => prev.map((m,i)=> i===idx ? { ...m, attachments: [...(m.attachments||[]), ...files], changed: true } : m));
                          }}
                          onRemove={id => setModules(prev => prev.map((m,i)=> i===idx ? { ...m, attachments: (m.attachments||[]).filter(a => a.id !== id), changed: true } : m))}
                        />
                      </div>
                    )}
                    <div className="flex justify-between items-center pt-1">
                      <div className="flex items-center gap-2">
                        <div className="text-[10px] text-muted-foreground font-mono">{mod.isNew ? 'new*' : mod.changed ? 'edited*' : 'saved'}</div>
                        {canReorder && <span className="text-[10px] text-muted-foreground">⇅ drag</span>}
                      </div>
                      <div className="flex gap-2">
                        <Button size="sm" variant="ghost" onClick={() => deleteModule(mod, idx)}>Delete</Button>
                      </div>
                    </div>
                  </div>
                )}
              </Card>
            );
          })}
          {sortedFiltered.length === 0 && (
            <div className="text-sm text-muted-foreground border rounded-md p-6 text-center">No modules yet. Click Add.</div>
          )}
        </div>
      )}
      <div className="flex gap-3 pt-2">
        <Button type="button" onClick={() => navigate(-1)} variant="outline">Back</Button>
        <Button type="button" onClick={saveChanges} disabled={saving || loading}>{saving ? 'Saving...' : 'Save Changes'}</Button>
      </div>
    </div>
  );
}
