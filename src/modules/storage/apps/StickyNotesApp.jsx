import { useState } from "react";

const STICKY_KEY = "win11_desktop_sticky_notes";

function loadNotes() {
  try {
    const saved = JSON.parse(localStorage.getItem(STICKY_KEY) || "null");
    if (Array.isArray(saved) && saved.length) return saved;
  } catch {
    // ignore storage errors
  }
  return [
    {
      id: "note_1",
      title: "Force Branch Reminder",
      text: "1st July Annual Increment & Training Nomination check.",
      updatedAt: new Date().toLocaleDateString("en-IN")
    }
  ];
}

/**
 * [APP] StickyNotesApp — Windows Sticky Notes saved automatically in localStorage
 */
export default function StickyNotesApp({ language = "hi" }) {
  const english = language === "en";
  const [notes, setNotes] = useState(loadNotes);

  const persist = (next) => {
    setNotes(next);
    try {
      localStorage.setItem(STICKY_KEY, JSON.stringify(next));
    } catch {
      // ignore storage quota errors
    }
  };

  const addNote = () => {
    persist([
      {
        id: `note_${Date.now()}`,
        title: english ? `Note #${notes.length + 1}` : `नोट #${notes.length + 1}`,
        text: "",
        updatedAt: new Date().toLocaleDateString("en-IN")
      },
      ...notes
    ]);
  };

  const updateNoteText = (id, text) => {
    persist(notes.map((n) => (n.id === id ? { ...n, text, updatedAt: new Date().toLocaleDateString("en-IN") } : n)));
  };

  const deleteNote = (id) => {
    persist(notes.filter((n) => n.id !== id));
  };

  return (
    <>
      <div className="wapp-ribbon">
        <button type="button" onClick={addNote} className="wapp-btn is-save">
          ➕ {english ? "New Sticky Note" : "नया स्टिकी नोट"}
        </button>
        <span className="wapp-status">
          ✔ {english ? "Auto-saved locally" : "स्वतः सुरक्षित"}
        </span>
      </div>

      <div className="wapp-sticky-board">
        {notes.map((note) => (
          <div key={note.id} className="wapp-sticky-card">
            <div className="wapp-sticky-top">
              <span>🗒️ {note.title} ({note.updatedAt})</span>
              <button type="button" onClick={() => deleteNote(note.id)} className="wapp-btn">✕</button>
            </div>
            <textarea
              value={note.text}
              onChange={(e) => updateNoteText(note.id, e.target.value)}
              placeholder={english ? "Write quick reminder..." : "त्वरित कार्यालय टिप्पणी लिखें..."}
              className="wapp-sticky-text"
            />
          </div>
        ))}
      </div>
    </>
  );
}
