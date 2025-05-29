// 新增模块文件，实现与FontColorModule相同颜色选择器功能
import type EditorCore from "../../core";

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
    this.colorPicker.className = "color-picker";
    this.colorPicker.style.position = "absolute";
    this.colorPicker.style.zIndex = "9999";

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
      this.colorPicker?.appendChild(colorBlock);
    });
    document.body.appendChild(this.colorPicker);
    // 添加失焦事件监听
    this.colorPicker.addEventListener("blur", () => {
      this.hideColorPicker();
    });
  }

  public showColorPicker(btn: HTMLElement): void {
    if (!this.colorPicker) {
      console.error("Color picker is not initialized.");
      return;
    }
    const rect = btn.getBoundingClientRect();
    this.colorPicker.style.top = `${rect.bottom + window.scrollY}px`;
    this.colorPicker.style.left = `${rect.left + window.scrollX}px`;
    this.colorPicker.style.display = "flex";
    this.colorPicker.style.flexWrap = "wrap";
  }

  public hideColorPicker(): void {
    if (!this.colorPicker) return;
    this.colorPicker.style.display = "none";
  }
}
