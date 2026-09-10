// Print Studio — editing the words in place, on the page itself.
//
// The alternative was a form in a side panel with labels like "Cover tagline".
// That would have been easier and worse: this document is a type specimen, and
// the only way to know whether a line works is to see it set in the face,
// colour and measure it will print in. So the editor is the document — each
// slot becomes a field that inherits everything about its surroundings and
// changes nothing about the layout.
//
// A textarea, not contenteditable: real maxLength, real undo, real form
// semantics for assistive tech, and no HTML smuggled in by a paste.

import React, { useId } from 'react';
import { RotateCcw } from 'lucide-react';

interface EditableCopyProps {
  /** Field key from EDITABLE_FIELDS, or `day.<date>`. */
  fieldKey: string;
  value: string;
  onChange: (value: string) => void;
  /** Character clamp, matching the field's limit in edits.ts. */
  max: number;
  /** Accessible name — the visual label is the surrounding document. */
  label: string;
  /** Shown when the slot is empty, so an unfilled line is still findable. */
  placeholder: string;
  /** True when this slot differs from what the AI wrote. */
  edited: boolean;
  /** Restore the AI's line. Absent when there is nothing to restore to. */
  onRevert?: () => void;
}

const EditableCopy: React.FC<EditableCopyProps> = ({
  fieldKey,
  value,
  onChange,
  max,
  label,
  placeholder,
  edited,
  onRevert,
}) => {
  const id = useId();
  const remaining = max - value.length;

  return (
    <span className="pd-edit" data-field={fieldKey} data-edited={edited || undefined}>
      {/* The replicated value sizes the box: the textarea and this text share
          one grid cell, so the field grows with the copy and never scrolls. */}
      <span className="pd-edit-sizer" data-value={value || placeholder}>
        <textarea
          id={id}
          className="pd-edit-input"
          aria-label={label}
          value={value}
          placeholder={placeholder}
          maxLength={max}
          rows={1}
          spellCheck
          onChange={(e) => onChange(e.target.value)}
        />
      </span>

      <span className="pd-edit-tools" contentEditable={false}>
        {/* Only worth showing as the limit closes in; a permanent counter on
            every slot would turn the page into a form. */}
        {remaining <= 20 && (
          <span className="pd-edit-count" aria-live="polite">
            {remaining}
          </span>
        )}
        {edited && onRevert && (
          <button type="button" className="pd-edit-revert" onClick={onRevert} title={`Restore the original ${label.toLowerCase()}`}>
            <RotateCcw aria-hidden />
            <span className="pd-sr-only">Restore the original {label.toLowerCase()}</span>
          </button>
        )}
      </span>
    </span>
  );
};

export default EditableCopy;
