import Quill from "quill-next";
import { TableSelection } from "./selection";
import { createTablePicker } from "./table-picker";

interface ToolbarModule {
  container: HTMLElement;
}

class TableProTool {
  private quill: Quill;
  private options: any;
  private selection: TableSelection;
  private toolbar: HTMLElement | null = null;

  static DEFAULTS = {
    rows: 3,
    cols: 3,
    minRows: 2,
    minCols: 2,
    maxRows: 10,
    maxCols: 10,
  };

  constructor(quill: Quill, options: any) {
    this.quill = quill;
    this.options = { ...TableProTool.DEFAULTS, ...options };
    this.selection = new TableSelection(quill);
    this.setupToolbar();
  }

  setupToolbar() {
    // 获取工具栏容器
    // const toolbar = this.quill.getModule('toolbar') as ToolbarModule;
    // if (!toolbar) return;

    // const container = toolbar.container;
    // const tableButton = container.querySelector('.ql-table-pro');
    const tableButton = document.querySelector('#ql-table-pro') as HTMLElement;
    if (!tableButton) return;

    // 创建表格选择器
    tableButton.addEventListener("click", (event: Event) => {
      const mouseEvent = event as MouseEvent;
      mouseEvent.preventDefault();
      mouseEvent.stopPropagation();
      
      // 移除已存在的选择器
      const existingPicker = document.querySelector('.table-picker');
      if (existingPicker) {
        existingPicker.remove();
      }

      const picker = createTablePicker({
        rows: this.options.rows,
        cols: this.options.cols,
        minRows: this.options.minRows,
        minCols: this.options.minCols,
        maxRows: this.options.maxRows,
        maxCols: this.options.maxCols,
        onSelect: (rows: number, cols: number) => {
          this.insertTable(rows, cols);
          picker.remove();
        },
      });

      const buttonRect = (mouseEvent.target as HTMLElement).getBoundingClientRect();
      picker.style.position = "absolute";
      picker.style.top = `${buttonRect.bottom + 10}px`;
      picker.style.left = `${buttonRect.left}px`;
      picker.classList.add('table-picker');
      document.body.appendChild(picker);

      // 点击外部关闭选择器
      const closeHandler = (e: MouseEvent) => {
        if (!picker.contains(e.target as Node)) {
          picker.remove();
          document.removeEventListener('click', closeHandler);
        }
      };
      setTimeout(() => {
        document.addEventListener('click', closeHandler);
      }, 0);
    });
  }

  insertTable(rows: number, cols: number) {
    const range = this.quill.getSelection(true);
    if (!range) return;

    // 在当前位置插入表格
    this.quill.insertText(range.index, "\n", Quill.sources.USER);
    this.quill.insertEmbed(
      range.index + 1,
      "table-pro",
      { rows, cols },
      Quill.sources.USER
    );
    this.quill.setSelection(range.index + 2, Quill.sources.SILENT);
  }
}

export default TableProTool; 