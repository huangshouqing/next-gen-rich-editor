import EditorCore from '@/js/core/EditorCore'; // 根据实际路径调整

interface EditorDialog {
  dialog: HTMLDivElement | null;
}

/**
 * TableEditor 类用于在富文本编辑器中插入表格
 */
export default class TableEditor implements EditorDialog {
  public editor: EditorCore;
  public dialog: HTMLDivElement | null;

  constructor(editor: EditorCore) {
    this.editor = editor;
    this.dialog = null;
  }

  /**
   * 打开表格设置对话框
   */
  public openDialog(): void {
    this.dialog = document.createElement('div');
    this.dialog.className = 'editor-dialog';
    this.dialog.innerHTML = `
      <div class="dialog-input-group">
        <label>行数: <input type="number" class="rows-input" value="2"></label>
      </div>
      <div class="dialog-input-group">
        <label>列数: <input type="number" class="cols-input" value="2"></label>
      </div>
      <div class="dialog-buttons">
        <button class="cancel-btn">取消</button>
        <button class="confirm-btn">插入</button>
      </div>
    `;

    document.body.appendChild(this.dialog);
    this._positionDialog();
    this._setupEvents();
  }

  /**
   * 定位对话框位置
   */
  private _positionDialog(): void {
    const rect = this.editor.container.getBoundingClientRect();
    if (this.dialog) {
      this.dialog.style.top = `${rect.top + 50}px`;
      this.dialog.style.left = `${rect.left + 50}px`;
    }
  }

  /**
   * 绑定对话框事件
   */
  private _setupEvents(): void {
    if (!this.dialog) return;

    this.dialog
      .querySelector('.cancel-btn')
      ?.addEventListener('click', () => this._closeDialog());

    this.dialog
      .querySelector('.confirm-btn')
      ?.addEventListener('click', () => {
        const rowsInput = this.dialog?.querySelector<HTMLInputElement>('.rows-input')?.value;
        const colsInput = this.dialog?.querySelector<HTMLInputElement>('.cols-input')?.value;

        const rows = parseInt(rowsInput || '0', 10);
        const cols = parseInt(colsInput || '0', 10);

        if (!isNaN(rows) && !isNaN(cols)) {
          this.insertTable(rows, cols);
        }

        this._closeDialog();
      });
  }

  /**
   * 关闭对话框
   */
  private _closeDialog(): void {
    if (this.dialog) {
      this.dialog.remove();
      this.dialog = null;
    }
  }

  /**
   * 插入表格到编辑器内容中
   * @param rows 行数
   * @param cols 列数
   */
  public insertTable(rows: number, cols: number): void {
    const table = document.createElement('table');
    table.border = 1;

    for (let i = 0; i < rows; i++) {
      const tr = table.insertRow();
      for (let j = 0; j < cols; j++) {
        const td = tr.insertCell();
        td.innerHTML = '&nbsp;';
      }
    }

    this.editor.execCommand('insertHTML', table.outerHTML);
  }
}