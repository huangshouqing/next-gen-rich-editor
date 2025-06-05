// 新增模块文件，实现与FontColorModule相同颜色选择器功能
import type { EditorCore } from "../../core";

export default class BackgroundColorModule {
  private editor: EditorCore;
  private colorPicker: HTMLElement | null = null;

  constructor(editor: EditorCore) {
    this.editor = editor;
  }
  /**
   * 注册实例
   */
  public register(): void {
    if (!this.colorPicker) {
      this.createColorPicker();
    }
  }

  private createColorPicker(): void {
    if (this.colorPicker) return;

    this.colorPicker = document.createElement("div");
    this.colorPicker.className = "modern-color-picker background-color-picker";
    this.colorPicker.style.cssText = `
      position: absolute;
      z-index: 9999;
      background: #ffffff;
      border: 1px solid #e5e7eb;
      border-radius: 12px;
      box-shadow: 0 10px 25px rgba(0, 0, 0, 0.12), 0 4px 10px rgba(0, 0, 0, 0.08);
      padding: 16px;
      backdrop-filter: blur(20px);
      animation: pickerSlideIn 0.2s cubic-bezier(0.4, 0, 0.2, 1);
      display: none;
    `;

    // 创建颜色网格容器
    const colorGrid = document.createElement("div");
    colorGrid.className = "color-grid";

    // 复用与字体颜色相同的颜色数组
    const colors = [
      "#FF0000",
      "#DC143C",
      "#B22222",
      "#00FF00",
      "#008000",
      "#228B22",
      "#0000FF",
      "#000080",
      "#4169E1",
      "#FFFF00",
      "#FFD700",
      "#FFA500",
      "#800080",
      "#8000FF",
      "#FFA500",
      "#FF8C00",
      "#FFC0CB",
      "#FF69B4",
      "#A52A2A",
      "#8B4513",
      "#808080",
      "#C0C0C0",
      "#A9A9A9",
      "#000000",
    ];

    colors.forEach((color) => {
      const colorBlock = document.createElement("div");
      colorBlock.className = "color-block";
      colorBlock.style.backgroundColor = color;
      colorBlock.addEventListener("click", () => {
        // 执行背景颜色命令
        this.editor.execCommand("hiliteColor", color);
        this.hideColorPicker();
      });
      colorGrid.appendChild(colorBlock);
    });

    this.colorPicker.appendChild(colorGrid);
    document.body.appendChild(this.colorPicker);
  }

  public showColorPicker(btn: HTMLElement): void {
    if (!this.colorPicker) {
      console.error("Color picker is not initialized.");
      return;
    }
    const rect = btn.getBoundingClientRect();
    this.colorPicker.style.top = `${rect.bottom + window.scrollY + 5}px`;
    this.colorPicker.style.left = `${rect.left + window.scrollX}px`;
    this.colorPicker.style.display = "block";

    // 添加失焦关闭功能
    const closeHandler = (e: MouseEvent) => {
      if (!this.colorPicker?.contains(e.target as Node) && e.target !== btn) {
        this.hideColorPicker();
        document.removeEventListener('mousedown', closeHandler);
      }
    };
    
    // 延迟添加事件监听器，避免立即触发
    setTimeout(() => {
      document.addEventListener('mousedown', closeHandler);
    }, 0);
  }

  public hideColorPicker(): void {
    if (!this.colorPicker) return;
    this.colorPicker.style.display = "none";
  }
}
