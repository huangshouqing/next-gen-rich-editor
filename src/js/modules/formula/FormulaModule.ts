import { EditorCore } from '../../core';
import { FormulaModal } from './FormulaModal';
import './FormulaBlot';
import './formula.css';
import './formula-display.css';

class FormulaModule {
  private editor: EditorCore;
  private modal: FormulaModal;
  public name = 'FormulaModule';

  constructor(editor: EditorCore) {
    this.editor = editor;
    if (!this.editor.quillInstance) {
      throw new Error('Quill instance not found');
    }
    this.modal = new FormulaModal(this.editor.quillInstance.quill);
    this.bindEvents();
  }

  public register(): void {
    // 注册公式 Blot
    // FormulaBlot 已经在导入时自动注册
  }

  private bindEvents(): void {
    // 监听公式点击事件
    if (this.editor.quillInstance) {
      const editorRoot = this.editor.quillInstance.quill.root;
      editorRoot.addEventListener('click', (event) => {
        const target = event.target as Element;
        if (target instanceof HTMLElement) {
          const formulaWrapper = target.closest('.formula-wrapper');
          if (formulaWrapper instanceof HTMLElement) {
            this.modal.show(formulaWrapper);
          }
        }
      });
    }
  }

  public showDialog(): void {
    this.modal.show();
  }
}

export default FormulaModule; 