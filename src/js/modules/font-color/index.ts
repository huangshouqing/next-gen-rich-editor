import type { EditorCore } from "../../core";

export default class FontColorModule {
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
    if (this.colorPicker) return; // 防止重复创建
    this.colorPicker = document.createElement("div");
    this.colorPicker.className = "modern-color-picker";
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

    // 添加样式动画
    const style = document.createElement('style');
    style.textContent = `
      @keyframes pickerSlideIn {
        from {
          opacity: 0;
          transform: translateY(-8px) scale(0.95);
        }
        to {
          opacity: 1;
          transform: translateY(0) scale(1);
        }
      }
      .modern-color-picker .color-grid {
        display: grid;
        grid-template-columns: repeat(6, 1fr);
        gap: 4px;
        background: #f8fafc;
        border-radius: 8px;
        padding: 12px;
        border: 1px solid #f3f4f6;
      }
      .modern-color-picker .color-block {
        width: 24px;
        height: 24px;
        border: 2px solid #ffffff;
        border-radius: 6px;
        cursor: pointer;
        transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
        position: relative;
        box-shadow: 0 2px 4px rgba(0, 0, 0, 0.08);
      }
      .modern-color-picker .color-block:hover {
        transform: scale(1.15);
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
        z-index: 1;
      }
      .modern-color-picker .color-block::after {
        content: '';
        position: absolute;
        inset: -2px;
        border: 2px solid transparent;
        border-radius: 6px;
        transition: border-color 0.2s;
      }
      .modern-color-picker .color-block:hover::after {
        border-color: #0589f3;
      }
    `;
    document.head.appendChild(style);

    // 创建颜色网格容器
    const colorGrid = document.createElement("div");
    colorGrid.className = "color-grid";

    // 修改颜色数组，扩展至24种常用颜色，覆盖多个色系
    const colors = [
      // 红色系
      "#FF0000",
      "#DC143C",
      "#B22222",
      // 绿色系
      "#00FF00",
      "#008000",
      "#228B22",
      // 蓝色系
      "#0000FF",
      "#000080",
      "#4169E1",
      // 黄色系
      "#FFFF00",
      "#FFD700",
      "#FFA500",
      // 紫色系
      "#800080",
      "#8000FF",
      // 橙色系
      "#FFA500",
      "#FF8C00",
      // 粉色系
      "#FFC0CB",
      "#FF69B4",
      // 棕色系
      "#A52A2A",
      "#8B4513",
      // 灰色系
      "#808080",
      "#C0C0C0",
      "#A9A9A9",
      // 黑白系
      "#000000",
    ];

    colors.forEach((color) => {
      const colorBlock = document.createElement("div");
      colorBlock.className = "color-block";
      colorBlock.style.backgroundColor = color;
      colorBlock.addEventListener("click", () => {
        this.editor.execCommand("foreColor", color);
        // 隐藏颜色选择器
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
