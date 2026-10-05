import React, { useState, useRef, useEffect } from 'react';
import { Note } from '../types';
import ChatInterface from '../components/ChatInterface';
import Skeleton from '../components/Skeleton';

interface EditorViewProps {
  note: Note;
  notes?: Note[];
  onBack: () => void;
  onUpdate: (note: Note) => void;
  onToggleBookmark: (note: Note) => void;
  onOpenNote?: (note: Note) => void;
  contextualAttachments: string[];
  setContextualAttachments: React.Dispatch<React.SetStateAction<string[]>>;
  settings?: import('../types').AppSettings;
}

const EditorView: React.FC<EditorViewProps> = ({ note, onBack, onUpdate, onToggleBookmark, contextualAttachments, setContextualAttachments }) => {
  const [content, setContent] = useState(note.content);
  const [title, setTitle] = useState(note.title);
  const editorRef = useRef<HTMLDivElement>(null);
  const [isSaved, setIsSaved] = useState(true);
  const [showSource, setShowSource] = useState(false);
  const [blobUrl, setBlobUrl] = useState<string | null>(null);
  const [assistantWidth, setAssistantWidth] = useState(35);
  const [isDragging, setIsDragging] = useState(false);
  const [showMobileAssistant, setShowMobileAssistant] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Initialize content on mount or note change
  useEffect(() => {
    if (editorRef.current) {
        editorRef.current.innerHTML = note.content;
    }
    setTitle(note.title);
  }, [note.id]);

  const handleInput = () => {
      setIsSaved(false);
      if (editorRef.current) {
          setContent(editorRef.current.innerHTML);
      }
  };

  const saveContent = () => {
      onUpdate({ ...note, content, lastAccessed: new Date().toISOString() });
      setIsSaved(true);
  };

  // Auto-save debounce
  useEffect(() => {
      const timer = setTimeout(() => {
          if (!isSaved) saveContent();
      }, 2000);
      return () => clearTimeout(timer);
  }, [content, isSaved]);

  // Handle Blob URL generation for PDFs
  useEffect(() => {
      if (showSource && note.sourceData && note.sourceData.mimeType === 'application/pdf') {
          try {
              const byteCharacters = atob(note.sourceData.data);
              const byteNumbers = new Array(byteCharacters.length);
              for (let i = 0; i < byteCharacters.length; i++) {
                  byteNumbers[i] = byteCharacters.charCodeAt(i);
              }
              const byteArray = new Uint8Array(byteNumbers);
              const blob = new Blob([byteArray], { type: 'application/pdf' });
              const url = URL.createObjectURL(blob);
              setBlobUrl(url);
          } catch (e) {
              console.error("Failed to create blob URL for PDF", e);
          }
      }
      
      return () => {
          if (blobUrl) {
              URL.revokeObjectURL(blobUrl);
              setBlobUrl(null);
          }
      };
  }, [showSource, note.sourceData]);

  // Handle Dragging for Resizer
  useEffect(() => {
      const handleMouseMove = (e: MouseEvent) => {
          if (!isDragging || !containerRef.current) return;
          const containerRect = containerRef.current.getBoundingClientRect();
          const newAssistantWidth = ((containerRect.right - e.clientX) / containerRect.width) * 100;
          
          // Limit between 20% and 50%
          if (newAssistantWidth >= 20 && newAssistantWidth <= 50) {
              setAssistantWidth(newAssistantWidth);
          }
      };

      const handleMouseUp = () => setIsDragging(false);

      if (isDragging) {
          window.addEventListener('mousemove', handleMouseMove);
          window.addEventListener('mouseup', handleMouseUp);
          document.body.style.userSelect = 'none'; // Prevent text selection while dragging
      } else {
          window.removeEventListener('mousemove', handleMouseMove);
          window.removeEventListener('mouseup', handleMouseUp);
          document.body.style.userSelect = '';
      }

      return () => {
          window.removeEventListener('mousemove', handleMouseMove);
          window.removeEventListener('mouseup', handleMouseUp);
          document.body.style.userSelect = '';
      };
  }, [isDragging]);

  const execCmd = (command: string, value: string | undefined = undefined) => {
      document.execCommand(command, false, value);
      editorRef.current?.focus();
  };

  const handleExportPDF = () => {
      const html = editorRef.current?.innerHTML || content;
      const themeColor = (getComputedStyle(document.documentElement).getPropertyValue('--theme-color') || '#c4f20d').trim();
      const win = window.open('', '_blank');
      if (!win) {
          alert('Please allow pop-ups to export this note as a PDF.');
          return;
      }
      win.document.write(`<!DOCTYPE html><html><head><meta charset="utf-8"/><title>${title || 'Note'}</title>
        <style>
          body { font-family: Georgia, 'Times New Roman', serif; max-width: 760px; margin: 40px auto; padding: 0 24px; color: #18181b; line-height: 1.6; }
          h1 { font-family: 'Helvetica Neue', Arial, sans-serif; font-size: 28px; letter-spacing: -0.02em; margin-bottom: 4px; }
          h2 { font-family: 'Helvetica Neue', Arial, sans-serif; font-size: 20px; margin-top: 1.4em; }
          h3 { font-family: 'Helvetica Neue', Arial, sans-serif; font-size: 16px; }
          b, strong { color: ${themeColor}; filter: brightness(0.7); }
          blockquote { border-left: 3px solid ${themeColor}; padding-left: 1em; font-style: italic; color: #555; }
          .meta { color: #888; font-size: 12px; margin-bottom: 24px; font-family: Arial, sans-serif; }
          img { max-width: 100%; }
          @media print { body { margin: 0; } }
        </style></head><body>
        <h1>${title || 'Untitled Note'}</h1>
        <div class="meta">${note.date}${note.duration ? ' · ' + note.duration : ''} · Modular AI Notes</div>
        ${html}
        </body></html>`);
      win.document.close();
      win.focus();
      setTimeout(() => win.print(), 350);
  };

  return (
    <main className="flex-1 flex flex-col min-w-0 relative bg-[#f4f4f5] dark:bg-[#09090b]">
      <header className="shrink-0 h-16 md:h-20 border-b border-black/5 dark:border-white/10 flex items-center justify-between px-4 md:px-6 bg-white/50 dark:bg-[#09090b]/80 backdrop-blur-md z-10">
        <div className="flex flex-col flex-1 min-w-0 mr-4">
          {/* Integrated Title and Bookmark */}
          <div className="relative max-w-2xl group">
             <input 
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                onBlur={() => onUpdate({...note, title})}
                className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white bg-transparent border border-transparent hover:border-black/5 dark:hover:border-white/10 focus:border-[var(--theme-color)] rounded-lg p-1 -ml-1 w-full placeholder-neutral-500 font-display focus:outline-none focus:ring-0 transition-all pr-10"
                placeholder="Untitled Note"
            />
            <button 
                onClick={() => onToggleBookmark(note)}
                className={`absolute right-2 top-1/2 -translate-y-1/2 p-1 rounded-full hover:bg-black/5 dark:hover:bg-white/10 transition-colors ${note.isBookmarked ? 'text-[var(--theme-color)]' : 'text-neutral-400'}`}
                title={note.isBookmarked ? "Remove Bookmark" : "Bookmark this note"}
            >
                <span className="material-symbols-outlined text-[20px]" style={note.isBookmarked ? {fontVariationSettings: "'FILL' 1"} : {}}>star</span>
            </button>
          </div>
          <div className="flex items-center gap-2 text-sm text-neutral-500 dark:text-neutral-400 font-body mt-0.5 ml-0.5">
            <span className="flex items-center gap-1"><span className="material-symbols-outlined text-[16px]">calendar_today</span> {note.date}</span>
            {note.duration && (
                <>
                <span className="w-1 h-1 rounded-full bg-neutral-400"></span>
                <span className="flex items-center gap-1"><span className="material-symbols-outlined text-[16px]">schedule</span> {note.duration}</span>
                </>
            )}
            <span className="w-1 h-1 rounded-full bg-neutral-400"></span>
            <span className="text-slate-600 dark:text-[var(--theme-color)]/80">{isSaved ? 'Saved' : 'Saving...'}</span>
          </div>
        </div>
        <div className="flex items-center gap-3 shrink-0">
            {note.sourceData && (
                <button 
                    onClick={() => setShowSource(true)}
                    className="h-10 px-4 rounded-lg bg-black/5 dark:bg-white/5 hover:bg-black/10 dark:hover:bg-white/10 border border-transparent dark:border-white/10 text-slate-700 dark:text-white text-sm font-bold flex items-center gap-2 transition-all"
                >
                    <span className="material-symbols-outlined text-[20px]">visibility</span>
                    <span>View Source</span>
                </button>
            )}
            <button onClick={onBack} className="h-10 px-4 rounded-lg bg-black/5 dark:bg-white/5 hover:bg-black/10 dark:hover:bg-white/10 border border-transparent dark:border-white/10 text-slate-700 dark:text-white text-sm font-bold flex items-center gap-2 transition-all">
                <span className="material-symbols-outlined text-[20px]">arrow_back</span>
                <span>Back</span>
            </button>
            <button onClick={handleExportPDF} className="h-10 px-4 rounded-lg bg-[var(--theme-color)] hover:brightness-110 text-black text-sm font-bold flex items-center gap-2 transition-all shadow-lg shadow-[var(--theme-color)]/10">
                <span className="material-symbols-outlined text-[20px]">download</span>
                <span className="hidden sm:inline">Export PDF</span>
            </button>
            <button 
                onClick={() => setShowMobileAssistant(!showMobileAssistant)}
                className="md:hidden h-10 w-10 rounded-lg bg-black/5 dark:bg-white/5 hover:bg-black/10 dark:hover:bg-white/10 flex items-center justify-center text-slate-700 dark:text-white transition-all"
            >
                <span className="material-symbols-outlined text-[20px]">forum</span>
            </button>
        </div>
      </header>

      <div className="flex-1 flex flex-col md:flex-row overflow-hidden" ref={containerRef}>
        {/* Editor Area */}
        <div 
            className="flex flex-col border-b md:border-b-0 md:border-r border-black/5 dark:border-white/10 min-w-0 bg-white dark:bg-[#09090b] relative transition-none"
            style={{ flex: `1 1 ${100 - assistantWidth}%` }}
        >
          {/* Enhanced Toolbar */}
          <div className="h-10 border-b border-black/5 dark:border-white/5 flex items-center px-3 gap-1 text-neutral-600 dark:text-neutral-400 bg-black/[0.02] dark:bg-white/[0.02] overflow-x-auto">
            <button onClick={() => execCmd('undo')} className="p-1 hover:bg-black/5 dark:hover:bg-white/5 rounded transition-colors" title="Undo"><span className="material-symbols-outlined text-[18px]">undo</span></button>
            <button onClick={() => execCmd('redo')} className="p-1 hover:bg-black/5 dark:hover:bg-white/5 rounded transition-colors" title="Redo"><span className="material-symbols-outlined text-[18px]">redo</span></button>
            
            <div className="w-px h-3 bg-black/10 dark:bg-white/10 mx-1.5"></div>

            <button onClick={() => execCmd('bold')} className="p-1 hover:bg-black/5 dark:hover:bg-white/5 rounded transition-colors" title="Bold"><span className="material-symbols-outlined text-[18px]">format_bold</span></button>
            <button onClick={() => execCmd('italic')} className="p-1 hover:bg-black/5 dark:hover:bg-white/5 rounded transition-colors" title="Italic"><span className="material-symbols-outlined text-[18px]">format_italic</span></button>
            <button onClick={() => execCmd('underline')} className="p-1 hover:bg-black/5 dark:hover:bg-white/5 rounded transition-colors" title="Underline"><span className="material-symbols-outlined text-[18px]">format_underlined</span></button>
            <button onClick={() => execCmd('strikeThrough')} className="p-1 hover:bg-black/5 dark:hover:bg-white/5 rounded transition-colors" title="Strikethrough"><span className="material-symbols-outlined text-[18px]">strikethrough_s</span></button>
            
            <div className="w-px h-3 bg-black/10 dark:bg-white/10 mx-1.5"></div>
            
            <button onClick={() => execCmd('formatBlock', 'H1')} className="p-1 hover:bg-black/5 dark:hover:bg-white/5 rounded transition-colors font-bold font-serif text-xs" title="Heading 1">H1</button>
            <button onClick={() => execCmd('formatBlock', 'H2')} className="p-1 hover:bg-black/5 dark:hover:bg-white/5 rounded transition-colors font-bold font-serif text-xs" title="Heading 2">H2</button>
            <button onClick={() => execCmd('formatBlock', 'H3')} className="p-1 hover:bg-black/5 dark:hover:bg-white/5 rounded transition-colors font-bold font-serif text-xs" title="Heading 3">H3</button>
            <button onClick={() => execCmd('formatBlock', 'p')} className="p-1 hover:bg-black/5 dark:hover:bg-white/5 rounded transition-colors text-xs font-bold" title="Paragraph">P</button>

            <div className="w-px h-3 bg-black/10 dark:bg-white/10 mx-1.5"></div>

            <button onClick={() => execCmd('justifyLeft')} className="p-1 hover:bg-black/5 dark:hover:bg-white/5 rounded transition-colors" title="Align Left"><span className="material-symbols-outlined text-[18px]">format_align_left</span></button>
            <button onClick={() => execCmd('justifyCenter')} className="p-1 hover:bg-black/5 dark:hover:bg-white/5 rounded transition-colors" title="Align Center"><span className="material-symbols-outlined text-[18px]">format_align_center</span></button>
            <button onClick={() => execCmd('justifyRight')} className="p-1 hover:bg-black/5 dark:hover:bg-white/5 rounded transition-colors" title="Align Right"><span className="material-symbols-outlined text-[18px]">format_align_right</span></button>

            <div className="w-px h-3 bg-black/10 dark:bg-white/10 mx-1.5"></div>

            <button onClick={() => execCmd('insertUnorderedList')} className="p-1 hover:bg-black/5 dark:hover:bg-white/5 rounded transition-colors" title="Bullet List"><span className="material-symbols-outlined text-[18px]">format_list_bulleted</span></button>
            <button onClick={() => execCmd('insertOrderedList')} className="p-1 hover:bg-black/5 dark:hover:bg-white/5 rounded transition-colors" title="Numbered List"><span className="material-symbols-outlined text-[18px]">format_list_numbered</span></button>
            
            <div className="w-px h-3 bg-black/10 dark:bg-white/10 mx-1.5"></div>
            
            <button onClick={() => execCmd('insertHorizontalRule')} className="p-1 hover:bg-black/5 dark:hover:bg-white/5 rounded transition-colors" title="Horizontal Line"><span className="material-symbols-outlined text-[18px]">horizontal_rule</span></button>
          </div>

          <div className="flex-1 overflow-y-auto p-4 md:p-8 custom-scrollbar bg-white dark:bg-[#09090b]">
            <div 
                ref={editorRef}
                className="max-w-3xl mx-auto font-body text-base text-slate-800 dark:text-neutral-300 leading-normal outline-none min-h-[500px] empty:before:content-['Start_typing...'] empty:before:text-neutral-400"
                contentEditable
                suppressContentEditableWarning
                onInput={handleInput}
                onBlur={saveContent}
                style={{
                    // Basic styling for the contentEditable HTML
                }}
            />
            <style>{`
                [contenteditable] h1 { font-size: 1.75em; font-weight: 700; margin-bottom: 0.5em; color: inherit; font-family: 'Space Grotesk', sans-serif; letter-spacing: -0.02em; }
                [contenteditable] h2 { font-size: 1.4em; font-weight: 600; margin-top: 1em; margin-bottom: 0.5em; color: inherit; font-family: 'Space Grotesk', sans-serif; letter-spacing: -0.01em; }
                [contenteditable] h3 { font-size: 1.2em; font-weight: 600; margin-top: 0.75em; margin-bottom: 0.5em; color: inherit; font-family: 'Space Grotesk', sans-serif; }
                [contenteditable] p { margin-bottom: 0.75em; }
                [contenteditable] ul { list-style-type: disc; padding-left: 1.25em; margin-bottom: 0.75em; }
                [contenteditable] ol { list-style-type: decimal; padding-left: 1.25em; margin-bottom: 0.75em; }
                [contenteditable] blockquote { border-left: 3px solid var(--theme-color); padding-left: 1em; margin: 1em 0; font-style: italic; color: #888; font-size: 0.95em; }
                [contenteditable] b { font-weight: 700; color: var(--theme-color); }
                [contenteditable] hr { border: 0; border-top: 1px solid rgba(0,0,0,0.1); margin: 1.5em 0; }
                .dark [contenteditable] hr { border-top: 1px solid rgba(255,255,255,0.1); }
            `}</style>
          </div>
        </div>

        {/* Resizer */}
        <div
            className="hidden md:flex w-1 hover:w-1.5 cursor-col-resize bg-transparent hover:bg-[var(--theme-color)] transition-colors z-20 items-center justify-center group"
            onMouseDown={() => setIsDragging(true)}
        >
            <div className={`h-8 w-1 rounded-full transition-colors ${isDragging ? 'bg-[var(--theme-color)]' : 'bg-black/20 dark:bg-white/20 group-hover:bg-black/40 dark:group-hover:bg-white/40'}`}></div>
        </div>

        {/* AI Assistant Sidebar - Desktop */}
        <div 
            className="flex flex-col bg-[#f4f4f5] dark:bg-[#09090b] min-w-0 relative z-10 hidden md:flex transition-none"
            style={{ flex: `0 0 ${assistantWidth}%` }}
        >
          <div className="h-10 border-b border-black/5 dark:border-white/5 flex items-center justify-between px-4 bg-black/[0.02] dark:bg-white/[0.02] shrink-0">
            <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-[var(--theme-color)] text-base">forum</span>
                <h2 className="text-xs font-bold uppercase tracking-wider text-slate-900 dark:text-white font-display">Contextual Assistant</h2>
            </div>
          </div>
          
          <ChatInterface 
              context={note.transcript || note.content} 
              contextualAttachments={contextualAttachments}
              setContextualAttachments={setContextualAttachments}
          />
        </div>
      </div>

      {/* AI Assistant - Mobile Overlay */}
      {showMobileAssistant && (
          <div className="fixed inset-0 z-50 bg-[#f4f4f5] dark:bg-[#09090b] flex flex-col md:hidden animate-in slide-in-from-bottom duration-300">
              <div className="h-14 border-b border-black/5 dark:border-white/5 flex items-center justify-between px-4 bg-white dark:bg-[#09090b] shrink-0">
                  <div className="flex items-center gap-2">
                      <span className="material-symbols-outlined text-[var(--theme-color)] text-xl">forum</span>
                      <h2 className="text-sm font-bold uppercase tracking-wider text-slate-900 dark:text-white font-display">Contextual Assistant</h2>
                  </div>
                  <button 
                      onClick={() => setShowMobileAssistant(false)}
                      className="p-2 hover:bg-black/5 dark:hover:bg-white/5 rounded-full transition-colors"
                  >
                      <span className="material-symbols-outlined text-slate-900 dark:text-white">close</span>
                  </button>
              </div>
              <ChatInterface 
                  context={note.transcript || note.content} 
                  contextualAttachments={contextualAttachments}
                  setContextualAttachments={setContextualAttachments}
              />
          </div>
      )}

      {/* Source Modal */}
      {showSource && note.sourceData && (
          <div className="absolute inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-8">
              <div className="bg-white dark:bg-[#18181b] rounded-2xl border border-black/10 dark:border-white/10 shadow-2xl w-full max-w-5xl h-full max-h-[90vh] flex flex-col overflow-hidden">
                  <div className="h-14 border-b border-black/10 dark:border-white/10 flex items-center justify-between px-6 bg-black/5 dark:bg-white/5 shrink-0">
                      <h2 className="text-lg font-bold text-slate-900 dark:text-white font-display flex items-center gap-2">
                          <span className="material-symbols-outlined text-[var(--theme-color)]">
                              {note.sourceData.mimeType.startsWith('audio/') ? 'audio_file' : 
                               note.sourceData.mimeType === 'application/pdf' ? 'picture_as_pdf' : 'image'}
                          </span>
                          Source File
                      </h2>
                      <div className="flex items-center gap-4">
                          {note.sourceData.mimeType === 'application/pdf' && (
                              <a 
                                  href={`data:application/pdf;base64,${note.sourceData.data}`}
                                  download={`${note.title}.pdf`}
                                  className="text-xs font-bold px-3 py-1.5 bg-[var(--theme-color)] text-black rounded-lg hover:brightness-110 transition-colors flex items-center gap-1"
                              >
                                  <span className="material-symbols-outlined text-[14px]">download</span> Download PDF
                              </a>
                          )}
                          <button 
                              onClick={() => setShowSource(false)}
                              className="p-2 hover:bg-black/10 dark:hover:bg-white/10 rounded-full transition-colors text-slate-500 dark:text-neutral-400"
                          >
                              <span className="material-symbols-outlined">close</span>
                          </button>
                      </div>
                  </div>
                  <div className="flex-1 overflow-auto p-6 flex flex-col items-center justify-center bg-neutral-100 dark:bg-neutral-900">
                      {note.sourceData.mimeType === 'application/pdf' ? (
                          blobUrl ? (
                              <object 
                                  data={blobUrl} 
                                  type="application/pdf"
                                  className="w-full h-full rounded border border-black/10 dark:border-white/10"
                              >
                                  <div className="flex flex-col items-center justify-center h-full gap-4 text-neutral-500">
                                      <span className="material-symbols-outlined text-4xl">picture_as_pdf</span>
                                      <p>PDF preview is blocked by your browser's security settings.</p>
                                      <a 
                                          href={`data:application/pdf;base64,${note.sourceData.data}`}
                                          download={`${note.title}.pdf`}
                                          className="px-4 py-2 bg-[var(--theme-color)] text-black rounded-lg font-bold text-sm"
                                      >
                                          Download PDF Directly
                                      </a>
                                  </div>
                              </object>
                          ) : (
                              <div className="flex flex-col gap-2.5 p-2">
                                  <Skeleton width="40%" />
                                  <Skeleton width="80%" />
                              </div>
                          )
                      ) : note.sourceData.mimeType.startsWith('image/') ? (
                          <img 
                              src={`data:${note.sourceData.mimeType};base64,${note.sourceData.data}`} 
                              alt="Source" 
                              className="max-w-full max-h-full object-contain rounded shadow-lg"
                          />
                      ) : note.sourceData.mimeType.startsWith('audio/') ? (
                          <div className="w-full max-w-md bg-white dark:bg-[#27272a] p-8 rounded-2xl shadow-xl border border-black/5 dark:border-white/10 flex flex-col items-center gap-6">
                              <div className="w-24 h-24 rounded-full bg-[var(--theme-color)]/20 flex items-center justify-center">
                                  <span className="material-symbols-outlined text-[var(--theme-color)] text-5xl">headphones</span>
                              </div>
                              <h3 className="text-xl font-bold text-slate-900 dark:text-white font-display text-center">{note.title}</h3>
                              <audio 
                                  controls 
                                  src={`data:${note.sourceData.mimeType};base64,${note.sourceData.data}`}
                                  className="w-full"
                              />
                          </div>
                      ) : (
                          <div className="text-neutral-500">Unsupported file type for preview.</div>
                      )}
                  </div>
              </div>
          </div>
      )}
    </main>
  );
};

export default EditorView;