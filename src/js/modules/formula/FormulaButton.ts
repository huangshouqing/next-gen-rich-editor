import Quill from 'quill-next';
import { FormulaModal } from './FormulaModal';
import './formula.css';

export class FormulaButton {
  private button: HTMLButtonElement;
  private editor: Quill;
  private modal: FormulaModal;

  constructor(editor: Quill) {
    this.editor = editor;
    this.modal = new FormulaModal(editor);
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
      this.modal.show();
    });

    // 监听公式点击事件
    this.editor.root.addEventListener('click', (event) => {
      const target = event.target as Element;
      if (target instanceof HTMLElement) {
        const formulaWrapper = target.closest('.formula-wrapper');
        if (formulaWrapper instanceof HTMLElement) {
          this.modal.show(formulaWrapper);
        }
      }
    });
  }

  public getElement(): HTMLButtonElement {
    return this.button;
  }
} 