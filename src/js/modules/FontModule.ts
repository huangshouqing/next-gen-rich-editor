import EditorCore from '../core/EditorCore';

export default class FontModule {
  constructor(private editor: EditorCore) {}

  public setFontSize(size: string): void {
    this.editor.execCommand('fontSize', size);
  }

  public setForeColor(color: string): void {
    this.editor.execCommand('foreColor', color);
  }

  public setBackColor(color: string): void {
    this.editor.execCommand('hiliteColor', color);
  }
}