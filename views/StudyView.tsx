import React from 'react';
import { Note } from '../types';
import { EmptyState } from '../components/ui/primitives';

interface StudyViewProps {
    notes: Note[];
    onOpenNote?: (note: Note) => void;
}

/* Stub — replaced by the study slice. */
const StudyView: React.FC<StudyViewProps> = () => (
    <main className="flex-1 flex flex-col min-w-0 bg-paper">
        <EmptyState icon="school" title="Study" body="Decks and quizzes live here." />
    </main>
);
export default StudyView;
