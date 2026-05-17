import Editor, { type OnMount } from "@monaco-editor/react";
import { useRef } from "react";
import type { editor } from "monaco-editor";

export type Selection = {
  text: string;
  startLine: number;
  endLine: number;
  isSingleLine: boolean;
};

type Props = {
  language: "python" | "javascript";
  value: string;
  onChange: (v: string) => void;
  onSelectionChange: (sel: Selection | null) => void;
};

export function CodeEditor({ language, value, onChange, onSelectionChange }: Props) {
  const editorRef = useRef<editor.IStandaloneCodeEditor | null>(null);

  const handleMount: OnMount = (ed) => {
    editorRef.current = ed;
    ed.onDidChangeCursorSelection(() => {
      const sel = ed.getSelection();
      const model = ed.getModel();
      if (!sel || !model) {
        onSelectionChange(null);
        return;
      }
      const text = model.getValueInRange(sel);
      if (!text.trim()) {
        onSelectionChange(null);
        return;
      }
      onSelectionChange({
        text,
        startLine: sel.startLineNumber,
        endLine: sel.endLineNumber,
        isSingleLine: sel.startLineNumber === sel.endLineNumber,
      });
    });
  };

  return (
    <Editor
      height="100%"
      language={language}
      value={value}
      theme="vs-dark"
      onChange={(v) => onChange(v ?? "")}
      onMount={handleMount}
      options={{
        fontSize: 14,
        minimap: { enabled: false },
        scrollBeyondLastLine: false,
        automaticLayout: true,
        tabSize: 2,
        wordWrap: "on",
      }}
    />
  );
}
