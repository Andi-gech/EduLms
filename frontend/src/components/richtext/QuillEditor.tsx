import { forwardRef, useEffect, useLayoutEffect, useRef } from 'react';
import Quill from 'quill';
import type { QuillOptions } from 'quill';
import 'quill/dist/quill.snow.css';
import './quill-overrides.css';

interface QuillEditorProps {
  readOnly?: boolean;
  defaultValue?: any; // Delta or HTML
  value?: string; // controlled HTML (fallback)
  onTextChange?: (delta: any, oldDelta: any, source: string, html: string) => void;
  onSelectionChange?: (range: any, oldRange: any, source: string) => void;
  placeholder?: string;
  className?: string;
  modules?: QuillOptions['modules'];
  theme?: QuillOptions['theme'];
}

// Basic toolbar configuration (extend as needed)
const defaultModules: QuillOptions['modules'] = {
  toolbar: [
    [{ header: [1, 2, 3, false] }],
    ['bold', 'italic', 'underline', 'strike'],
    [{ list: 'ordered' }, { list: 'bullet' }],
    ['link', 'blockquote', 'code-block'],
    ['clean']
  ]
};

function assignForwardedRef(ref: React.ForwardedRef<Quill | null>, value: Quill | null) {
  if (!ref) return;
  if (typeof ref === 'function') {
    try { ref(value); } catch { /* noop */ }
    return;
  }
  try {
    (ref as any).current = value;
  } catch { /* noop */ }
}

const QuillEditor = forwardRef<Quill | null, QuillEditorProps>(function QuillEditor(
  { readOnly, defaultValue, value, onTextChange, onSelectionChange, placeholder, className, modules, theme = 'snow' }, ref
) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const quillRef = useRef<Quill | null>(null);
  const onTextChangeRef = useRef(onTextChange);
  const onSelectionChangeRef = useRef(onSelectionChange);

  useLayoutEffect(() => {
    onTextChangeRef.current = onTextChange;
    onSelectionChangeRef.current = onSelectionChange;
  });

  useEffect(() => {
    if (!containerRef.current) return;
    const el = document.createElement('div');
    containerRef.current.innerHTML = '';
    containerRef.current.appendChild(el);
  const quill = new Quill(el, { theme, placeholder, modules: modules || defaultModules, readOnly });
    quillRef.current = quill;
  
  assignForwardedRef(ref, quill);

    if (defaultValue) {
      try {
        if (typeof defaultValue === 'string') quill.clipboard.dangerouslyPasteHTML(defaultValue);
        else quill.setContents(defaultValue);
      } catch { /* ignore */ }
    } else if (value) {
      quill.clipboard.dangerouslyPasteHTML(value);
    }

    quill.on(Quill.events.TEXT_CHANGE, (delta, oldDelta, source) => {
      onTextChangeRef.current?.(delta, oldDelta, source, quill.root.innerHTML);
    });
    quill.on(Quill.events.SELECTION_CHANGE, (range, oldRange, source) => {
      onSelectionChangeRef.current?.(range, oldRange, source);
    });

    return () => {
  assignForwardedRef(ref, null);
      quillRef.current = null;
      if (containerRef.current) containerRef.current.innerHTML = '';
    };
  }, []);

  // Controlled value updates (simple diff check on HTML)
  useEffect(() => {
    if (value != null && quillRef.current) {
      const html = quillRef.current.root.innerHTML;
      if (value !== html) {
        const sel = quillRef.current.getSelection();
        quillRef.current.clipboard.dangerouslyPasteHTML(value);
        if (sel) quillRef.current.setSelection(sel);
      }
    }
  }, [value]);

  useEffect(() => {
    if (quillRef.current) quillRef.current.enable(!readOnly);
  }, [readOnly]);
  

  return <div ref={containerRef} className={className} />;
});

export default QuillEditor;
