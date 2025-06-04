import { Editor } from '@tiptap/core';

export class FormulaToolbarButton {
  private button: HTMLButtonElement;
  private editor: Editor;

  constructor(editor: Editor) {
    this.editor = editor;
    this.button = this.createButton();
    this.bindEvents();
  }

  private createButton(): HTMLButtonElement {
    const button = document.createElement('button');
    button.className = 'toolbar-button formula-button';
    button.innerHTML = `
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="24" height="24">
        <path fill="none" d="M0 0h24v24H0z"/>
        <path d="M13 9h8L20 7H11v10h2V9zm-2 10H3l1-2h7V7H3l1-2h8v14z"/>
      </svg>
      <span class="tooltip">插入公式</span>
    `;
    return button;
  }

  private bindEvents(): void {
    this.button.addEventListener('click', () => {
      this.editor.commands.openFormulaModal();
    });
  }

  public getElement(): HTMLButtonElement {
    return this.button;
  }
} 