import EditorCore from '../core/EditorCore';

export default class LinkModule {
  constructor(private editor: EditorCore) {}

  public insertLink(url: string): void {
    this.editor.execCommand('createLink', url);
  }
}