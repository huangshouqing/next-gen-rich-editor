// src/js/modules/FontSizeModule.ts
import EditorCore from "../core/EditorCore";

export default class FontSizeModule {
  public name = "FontSizeModule";
  private editor: EditorCore;
  private pxToFontSize(px: string): string {
    const sizeMap: Record<string, string> = {
      "10px": "1",
      "12px": "2",
      "14px": "3",
      "16px": "4",
      "18px": "5",
      "24px": "6",
      "32px": "7",
    };
    return sizeMap[px] || "3"; // 默认中间值
  }
  constructor(editor: EditorCore) {
    this.editor = editor;
  }

  public init(): void {
    const toolbar = this.editor.container?.querySelector(
      ".toolbar"
    ) as HTMLElement;
    if (!toolbar) return;

    const button = document.createElement("button");
    button.className = "btn";
    button.dataset.cmd = "fontSize";
    button.innerHTML = `
      <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <path d="M17 4h3M5 4h3m-3 8h3m-3 8h3M8 4v16M14 9l3-3m3 3l-3 3m-9 3h3m-3-8h3"/>
      </svg>
    `;

    // 绑定点击事件
    button.addEventListener("click", (e) => {
      e.preventDefault();
      this.openDropdown(button);
    });

    // 插入到工具栏合适位置（比如最后）
    const lastGroup = toolbar.lastElementChild as HTMLElement;
    if (lastGroup) {
      lastGroup.appendChild(button);
    } else {
      toolbar.appendChild(button);
    }
  }

  private openDropdown(triggerBtn: HTMLElement): void {
    // 先清除旧的下拉框
    this.removeExistingDropdown();
    const dropdown = document.createElement("div");
    dropdown.className = "font-size-dropdown";
    const sizes = ["10px", "12px", "14px", "16px", "18px", "24px", "32px"];
    sizes.forEach((size) => {
      const item = document.createElement("div");
      item.className = "font-size-dropdown-item";
      item.textContent = size.replace("px", "");
      item.dataset.value = size;
      item.addEventListener("click", () => {
        this.editor.restoreSelection({ forceFocus: true });
        const selection = window.getSelection();
        if (!selection || selection.rangeCount === 0) return;
        const range = selection.getRangeAt(0);
        const selectedText = range.toString();
        if (!selectedText.trim()) {
          console.warn("没有选中任何文本");
          return;
        }
        const commonAncestor = range.commonAncestorContainer;
        // 查找最近的 span 父节点
        let spanParent: HTMLSpanElement | null = null;
        if (commonAncestor.nodeType === Node.ELEMENT_NODE) {
          spanParent = (commonAncestor as HTMLElement).closest("span");
        }
        // 如果已有 span，直接修改它
        if (spanParent) {
          spanParent.style.fontSize = size;
          return;
        }
        // 否则创建新 span 并包裹选中内容
        const span = document.createElement("span");
        span.style.fontSize = size;
        try {
          range.surroundContents(span);
        } catch (e) {
          console.warn("无法直接包裹，尝试手动插入");
          const fragment = range.extractContents();
          span.appendChild(fragment);
          range.insertNode(span);
        }
        // 合并相邻 span（可选）
        this.mergeAdjacentSpans(span);
        this.removeExistingDropdown();
      });
      dropdown.appendChild(item);
    });
    // 定位下拉框（与表格右键菜单一致）
    const rect = triggerBtn.getBoundingClientRect();
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
  private mergeAdjacentSpans(target: HTMLElement): void {
    const parent = target.parentNode;
    if (!parent) return;

    const siblings = Array.from(parent.childNodes) as HTMLElement[];

    let i = siblings.indexOf(target);
    if (i < 0) return;

    // 向前合并
    while (i > 0 && siblings[i - 1].nodeName === "SPAN") {
      const prev = siblings[i - 1] as HTMLSpanElement;
      if (prev.style.fontSize === target.style.fontSize) {
        target.innerHTML = prev.innerHTML + target.innerHTML;
        parent.removeChild(prev);
        i--;
      } else {
        break;
      }
    }

    // 向后合并
    while (
      i < parent.childNodes.length - 1 &&
      siblings[i + 1].nodeName === "SPAN"
    ) {
      const next = siblings[i + 1] as HTMLSpanElement;
      if (next.style.fontSize === target.style.fontSize) {
        target.innerHTML += next.innerHTML;
        parent.removeChild(next);
      } else {
        break;
      }
    }
  }
  private removeExistingDropdown(): void {
    const existing = document.querySelector(".font-size-dropdown");
    if (existing) {
      existing.remove();
    }
  }
}
