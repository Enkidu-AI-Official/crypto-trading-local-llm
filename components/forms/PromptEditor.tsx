/**
 * Prompt Editor Component
 * 
 * Monaco-based code editor for bot prompts with syntax highlighting
 */

import React, { useRef } from 'react';
import Editor, { Monaco } from '@monaco-editor/react';

interface PromptEditorProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  error?: string;
  disabled?: boolean;
  required?: boolean;
  helperText?: string;
  height?: string;
}

export const PromptEditor: React.FC<PromptEditorProps> = ({
  label,
  value,
  onChange,
  error,
  disabled = false,
  required = false,
  helperText,
  height = '400px',
}) => {
  const editorRef = useRef<any>(null);

  function handleEditorDidMount(editor: any, monaco: Monaco) {
    editorRef.current = editor;

    // Configure Monaco theme
    monaco.editor.defineTheme('bonerbots-dark', {
      base: 'vs-dark',
      inherit: true,
      rules: [],
      colors: {
        'editor.background': '#1f2937',
        'editor.foreground': '#e5e7eb',
        'editor.lineHighlightBackground': '#374151',
        'editorCursor.foreground': '#60a5fa',
        'editor.selectionBackground': '#3b82f6',
        'editor.inactiveSelectionBackground': '#4b5563',
      },
    });

    monaco.editor.setTheme('bonerbots-dark');
  }

  return (
    <div className="flex flex-col gap-1">
      <label className="text-sm font-medium text-gray-300">
        {label}
        {required && <span className="text-red-400 ml-1">*</span>}
      </label>
      <div
        className={`
          border rounded-lg overflow-hidden
          ${error ? 'border-red-500' : 'border-gray-700'}
          ${disabled ? 'opacity-50 cursor-not-allowed' : ''}
        `}
      >
        <Editor
          height={height}
          language="markdown"
          value={value}
          onChange={(value) => onChange(value || '')}
          onMount={handleEditorDidMount}
          options={{
            minimap: { enabled: false },
            fontSize: 14,
            lineNumbers: 'on',
            wordWrap: 'on',
            scrollBeyondLastLine: false,
            automaticLayout: true,
            readOnly: disabled,
            padding: { top: 10, bottom: 10 },
            smoothScrolling: true,
            cursorSmoothCaretAnimation: 'on',
          }}
        />
      </div>
      {error && (
        <span className="text-xs text-red-400">{error}</span>
      )}
      {helperText && !error && (
        <span className="text-xs text-gray-500">{helperText}</span>
      )}
    </div>
  );
};

