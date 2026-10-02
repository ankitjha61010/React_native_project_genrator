import React from 'react';
import { 
  RichTextEditorComponent, 
  Inject, 
  Toolbar, 
  HtmlEditor, 
  Link, 
  Image, 
  QuickToolbar,
  Count
} from '@syncfusion/ej2-react-richtexteditor';

const RTE_TOOLBAR = {
  items: [
    'Bold', 'Italic', 'Underline', 'StrikeThrough', '|',
    'FontName', 'FontSize', 'FontColor', 'BackgroundColor', '|',
    'LowerCase', 'UpperCase', '|',
    'Formats', 'Alignments', '|',
    'OrderedList', 'UnorderedList', 'Outdent', 'Indent', '|',
    'CreateLink', 'Image', '|',
    'ClearFormat', 'Print', 'SourceCode', '|',
    'Undo', 'Redo',
  ],
};

export default function Editor({ value, onChange }: { value: string; onChange: (e: any) => void }) {
  return (
    <RichTextEditorComponent
      value={value}
      change={onChange}
      toolbarSettings={RTE_TOOLBAR}
      height="550px"
      cssClass="custom-rte-dark"
      showCharCount
    >
      <Inject services={[Toolbar, Image, Link, HtmlEditor, QuickToolbar, Count]} />
    </RichTextEditorComponent>
  );
}
