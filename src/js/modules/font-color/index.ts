import type EditorCore from "../../core";

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
    this.colorPicker.className = "color-picker";
    this.colorPicker.style.position = "absolute";
    this.colorPicker.style.zIndex = "9999";
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
