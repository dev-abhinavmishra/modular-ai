import { Note, Deck, Quiz, NoteVersion } from '../types';
import { getAllNotes, getAllDecks, getAllQuizzes, getAllNoteVersions, saveNote, saveDeck, saveQuiz, putNoteVersions } from './storageService';
import { sanitizeHtml } from './sanitize';

/* Minimal HTML → Markdown for note export. Handles the elements the AI writer
   and the editor actually produce. */
export const htmlToMarkdown = (html: string): string => {
    const doc = new DOMParser().parseFromString(html, 'text/html');
    const esc = (s: string) => s.replace(/\s+/g, ' ').trim();

    const walk = (node: Node): string => {
        if (node.nodeType === Node.TEXT_NODE) return node.textContent || '';
        if (node.nodeType !== Node.ELEMENT_NODE) return '';
        const el = node as HTMLElement;
        const tag = el.tagName.toLowerCase();
        const kids = () => Array.from(el.childNodes).map(walk).join('');
        switch (tag) {
            case 'h1': return `# ${kids()}\n\n`;
            case 'h2': return `## ${kids()}\n\n`;
            case 'h3': return `### ${kids()}\n\n`;
            case 'h4': return `#### ${kids()}\n\n`;
            case 'p': case 'div': return `${kids()}\n\n`;
            case 'br': return '\n';
            case 'b': case 'strong': return `**${kids()}**`;
            case 'i': case 'em': return `*${kids()}*`;
            case 'u': return kids();
            case 's': case 'strike': case 'del': return `~~${kids()}~~`;
            case 'mark': return `==${kids()}==`;
            case 'code': return el.parentElement?.tagName === 'PRE' ? el.textContent || '' : `\`${el.textContent || ''}\``;
            case 'pre': return `\`\`\`\n${el.textContent || ''}\n\`\`\`\n\n`;
            case 'blockquote': return kids().split('\n').map(l => l.trim() ? `> ${l.trim()}` : '').join('\n') + '\n\n';
            case 'ul': case 'ol': {
                const ordered = tag === 'ol';
                let i = 1;
                return Array.from(el.children).map(li =>
                    `${ordered ? `${i++}.` : '-'} ${walk(li).trim()}\n`
                ).join('') + '\n';
            }
            case 'li': return kids();
            case 'hr': return `---\n\n`;
            case 'a': return `[${kids() || el.getAttribute('href') || ''}](${el.getAttribute('href') || ''})`;
            case 'img': return `![${el.getAttribute('alt') || 'image'}](${el.getAttribute('src') || ''})`;
            case 'table': {
                const rows = Array.from(el.querySelectorAll('tr')).map(tr =>
                    Array.from(tr.querySelectorAll('th,td')).map(c => esc(c.textContent || '')).join(' | ')
                );
                if (rows.length === 0) return '';
                const header = `| ${rows[0]} |`;
                const sep = '|' + rows[0].split('|').map(() => '---').join('|') + '|';
                const body = rows.slice(1).map(r => `| ${r} |`).join('\n');
                return `${header}\n${sep}\n${body}\n\n`;
            }
            default: return kids();
        }
    };
    return Array.from(doc.body.childNodes).map(walk).join('').replace(/\n{3,}/g, '\n\n').trim() + '\n';
};

export const noteToMarkdown = (note: Note): string => {
    const meta = `---\ntitle: ${note.title}\ndate: ${note.date}\ntype: ${note.type.toLowerCase()}\ntags: [${note.tags.map(t => `"${t}"`).join(', ')}]\n---\n\n`;
    return meta + htmlToMarkdown(note.content || '');
};

const download = (filename: string, text: string, mime = 'text/plain') => {
    const blob = new Blob([text], { type: mime });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 4000);
};

const slugify = (s: string) => s.replace(/[^\w\s-]/g, '').trim().replace(/\s+/g, '-').toLowerCase().slice(0, 60) || 'note';

export const exportNoteMarkdown = (note: Note) =>
    download(`${slugify(note.title)}.md`, noteToMarkdown(note), 'text/markdown');

const escapeHtml = (s: string) =>
    s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

export const exportNoteHtml = (note: Note) => {
    const safeTitle = escapeHtml(note.title || 'Untitled');
    const safeContent = sanitizeHtml(note.content || '');
    const html = `<!DOCTYPE html><html><head><meta charset="utf-8"/><title>${safeTitle}</title>
<style>body{font-family:Georgia,serif;max-width:720px;margin:40px auto;padding:0 24px;color:#211E19;line-height:1.65}
h1,h2,h3{font-family:'Helvetica Neue',Arial,sans-serif;letter-spacing:-0.02em}
blockquote{border-left:2px solid #C2420C;padding-left:.9em;font-style:italic;color:#5C574B}
code{background:#EFECE2;border-radius:4px;padding:.1em .35em;font-size:.85em}
pre{background:#EFECE2;border-radius:8px;padding:12px 14px;overflow-x:auto}
mark{background:rgba(58,92,140,.15);padding:0 .15em}
table{border-collapse:collapse;width:100%}th,td{border-bottom:1px solid #DDD8C8;padding:6px 8px;text-align:left}
img{max-width:100%}</style></head><body>
<h1>${safeTitle}</h1><p style="color:#8A8375;font-size:13px">${note.date}${note.duration ? ' · ' + note.duration : ''} · Modular Notes</p>
${safeContent}</body></html>`;
    download(`${slugify(note.title)}.html`, html, 'text/html');
};

export interface BackupPayload {
    app: 'modular-ai-notes';
    version: 1;
    exportedAt: string;
    notes: Note[];
    decks: Deck[];
    quizzes: Quiz[];
    versions?: NoteVersion[];
}

export const exportBackup = async () => {
    const payload: BackupPayload = {
        app: 'modular-ai-notes',
        version: 1,
        exportedAt: new Date().toISOString(),
        notes: await getAllNotes(),
        decks: await getAllDecks(),
        quizzes: await getAllQuizzes(),
        versions: await getAllNoteVersions(),
    };
    download(`modular-notes-backup-${new Date().toISOString().slice(0, 10)}.json`, JSON.stringify(payload, null, 2), 'application/json');
};

/** Import a backup file. Returns counts of restored entities. */
export const importBackup = async (file: File): Promise<{ notes: number; decks: number; quizzes: number }> => {
    const text = await file.text();
    const data = JSON.parse(text);
    if (data?.app !== 'modular-ai-notes' || !Array.isArray(data.notes)) {
        throw new Error('Not a Modular Notes backup file.');
    }
    for (const n of data.notes as Note[]) await saveNote(n);
    for (const d of (data.decks || []) as Deck[]) await saveDeck(d);
    for (const q of (data.quizzes || []) as Quiz[]) await saveQuiz(q);
    if (Array.isArray(data.versions)) await putNoteVersions(data.versions as NoteVersion[]);
    return { notes: data.notes.length, decks: (data.decks || []).length, quizzes: (data.quizzes || []).length };
};
