import type { EditorModuleInstance } from "../../types/types";
import type { EditorCore } from "../../core/index";

export default class TableModule implements EditorModuleInstance {
  public name = "TableModule";
  private editor: EditorCore;

  constructor(editor: EditorCore) {
    this.editor = editor;
  }

  register(): void {
    // 表格模块已经在 quill.ts 中自动注册了
    // 这里只需要确保模块正确初始化
    console.log("TableModule registered");
  }

  /**
   * 显示表格选择器
   * @param buttonElement 触发按钮元素
   */
  showTablePicker(buttonElement: HTMLElement): void {
    const betterTableModule = this.editor.quillInstance?.quill?.getModule("better-table");
    if (betterTableModule && (betterTableModule as any).showTablePicker) {
      (betterTableModule as any).showTablePicker(buttonElement);
    }
  }

  /**
   * 直接插入表格
   * @param rows 行数
   * @param cols 列数
   */
  insertTable(rows: number = 3, cols: number = 3): void {
    const betterTableModule = this.editor.quillInstance?.quill?.getModule("better-table");
    if (betterTableModule && (betterTableModule as any).insertTable) {
      (betterTableModule as any).insertTable(rows, cols);
    }
  }
} 