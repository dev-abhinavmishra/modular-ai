import React from 'react';
import { Note, View } from '../types';

interface CommandPaletteProps {
    open: boolean;
    onClose: () => void;
    notes: Note[];
    onOpenNote: (note: Note) => void;
    onNavigate: (view: View) => void;
    onNewNote: () => void;
}

/* Stub — replaced by the shell slice. */
const CommandPalette: React.FC<CommandPaletteProps> = () => null;
export default CommandPalette;
