import type EditorCore from "../core/EditorCore";

export default class BackgroundColorModule {
  private editor: EditorCore;
  private colorPicker: HTMLElement | null = null;

  constructor(editor: EditorCore) {
    this.editor = editor;
  }

  public init(): void {
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

    const colors = [
      "#FF0000",
      "#00FF00",
      "#0000FF",
      "#FFFF00",
      "#00FFFF",
      "#FF00FF",
    ];
    colors.forEach((color) => {
      const colorBlock = document.createElement("div");
      colorBlock.className = "color-block";
      colorBlock.style.backgroundColor = color;
      colorBlock.addEventListener("click", () => {
        // 确保选区已保存
        this.editor.restoreSelection({ forceFocus: true });
        // 执行命令
        this.editor.execCommand("hiliteColor", color);
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
    this.colorPicker.style.display = "block";
    console.log("Color picker displayed at:", {
      top: this.colorPicker.style.top,
      left: this.colorPicker.style.left,
    });
  }

  public hideColorPicker(): void {
    if (!this.colorPicker) return;
    this.colorPicker.style.display = "none";
  }
}