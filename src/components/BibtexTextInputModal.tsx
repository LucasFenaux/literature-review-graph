import React, { useState } from 'react';
import bibtexParse from 'bibtex-parse-js';

interface BibtexTextInputModalProps {
  onImport: (entries: any[]) => void;
  onUploadFile: () => void;
  onClose: () => void;
}

export default function BibtexTextInputModal({ onImport, onUploadFile, onClose }: BibtexTextInputModalProps) {
  const [text, setText] = useState('');

  const handleParse = () => {
    if (!text.trim()) {
      alert('Please paste some BibTeX content first.');
      return;
    }
    try {
      const parsed = bibtexParse.toJSON(text);
      if (parsed.length === 0) {
        alert('No BibTeX entries found. Please check your formatting.');
        return;
      }
      onImport(parsed);
    } catch (err) {
      console.error('Error parsing BibTeX', err);
      alert('Failed to parse BibTeX content. Please ensure it is valid.');
    }
  };

  return (
    <div style={modalOverlayStyle}>
      <div style={modalContentStyle}>
        <h2>Import BibTeX</h2>
        <p style={{ color: 'var(--text-secondary)', marginBottom: '1rem' }}>
          Paste your `.bib` content below, or upload a `.bib` file.
        </p>

        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="@article{...}"
          style={{
            width: '100%',
            height: '200px',
            background: 'var(--bg-surface-hover)',
            color: 'var(--text-primary)',
            border: '1px solid var(--border-strong)',
            borderRadius: 'var(--radius-sm)',
            padding: '1rem',
            fontFamily: 'monospace',
            resize: 'none',
            marginBottom: '1.5rem'
          }}
        />

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <button onClick={onUploadFile} style={buttonSecondaryStyle}>
            Upload .bib File
          </button>
          
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <button onClick={onClose} style={buttonSecondaryStyle}>
              Cancel
            </button>
            <button onClick={handleParse} style={buttonPrimaryStyle}>
              Parse & Import
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

const modalOverlayStyle: React.CSSProperties = {
  position: 'fixed',
  top: 0, left: 0, right: 0, bottom: 0,
  backgroundColor: 'rgba(0, 0, 0, 0.5)',
  display: 'flex',
  justifyContent: 'center',
  alignItems: 'center',
  zIndex: 9999
};

const modalContentStyle: React.CSSProperties = {
  background: 'var(--bg-surface)',
  color: 'var(--text-primary)',
  padding: '2rem',
  borderRadius: 'var(--radius-lg)',
  width: '600px',
  maxWidth: '90vw',
  boxShadow: '0 10px 25px rgba(0,0,0,0.5)',
  border: '1px solid var(--border-strong)',
  display: 'flex',
  flexDirection: 'column'
};

const buttonPrimaryStyle: React.CSSProperties = {
  padding: '0.5rem 1rem',
  background: 'var(--accent-primary)',
  color: 'white',
  border: 'none',
  borderRadius: 'var(--radius-sm)',
  cursor: 'pointer'
};

const buttonSecondaryStyle: React.CSSProperties = {
  padding: '0.5rem 1rem',
  background: 'transparent',
  color: 'var(--text-primary)',
  border: '1px solid var(--border-strong)',
  borderRadius: 'var(--radius-sm)',
  cursor: 'pointer'
};
