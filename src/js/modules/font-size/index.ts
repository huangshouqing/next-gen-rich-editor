// src/js/modules/FontSizeModule.ts
import EditorCore from "../../core";

export default class FontSizeModule {
  public name = "FontSizeModule";
  private editor: EditorCore;
  private fontSizeButton: HTMLElement | null = null;
  constructor(editor: EditorCore) {
    this.editor = editor;
  }
  /**
   * 注册实例
   * @returns
   */
  public register(): void {
    const toolbar = this.editor.container?.querySelector(
      ".toolbar"
    ) as HTMLElement;
    if (!toolbar) return;
    // 修改为监听 toolbar 内部特定按钮的点击事件
    this.fontSizeButton = toolbar.querySelector(
      "#font-size-btn"
    ) as HTMLElement;
  }
  public createFontSizeSelect(): void {
    if (!this.fontSizeButton) return;
    // 先清除旧的下拉框
    this.removeExistingDropdown();
    const dropdown = document.createElement("div");
    dropdown.className = "font-size-dropdown";
    const sizes = ["10", "12", "14", "16", "18", "24", "32"];
    sizes.forEach((size) => {
      const item = document.createElement("div");
      item.className = "font-size-dropdown-item";
      item.textContent = size.replace("px", "");
      item.dataset.value = size;
      item.addEventListener("click", () => {
        this.editor.restoreSelection({ forceFocus: true });
        this.editor.execCommand("fontSize", size);
        this.removeExistingDropdown();
      });
      dropdown.appendChild(item);
    });
    // 定位下拉框
    const rect = this.fontSizeButton.getBoundingClientRect();
    dropdown.style.position = "absolute";
    dropdown.style.top = `${rect.bottom + window.scrollY}px`;
    dropdown.style.left = `${rect.left + window.scrollX}px`;
    dropdown.style.zIndex = "9999";
    document.body.appendChild(dropdown);
    // 点击外部关闭
    const handleClickOutside = (e: MouseEvent) => {
      if (!dropdown.contains(e.target as Node)) {
        this.removeExistingDropdown();
        document.removeEventListener("click", handleClickOutside);
      }
    };
    setTimeout(() => {
      document.addEventListener("click", handleClickOutside, { once: true });
    });
  }
  private removeExistingDropdown(): void {
    const existing = document.querySelector(".font-size-dropdown");
    if (existing) {
      existing.remove();
    }
  }
}
