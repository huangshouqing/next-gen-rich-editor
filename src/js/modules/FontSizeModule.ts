// src/js/modules/FontSizeModule.ts
import EditorCore from "../core/EditorCore";

export default class FontSizeModule {
  public name = "FontSizeModule";
  private editor: EditorCore;
  constructor(editor: EditorCore) {
    this.editor = editor;
  }
  public init(): void {
    const toolbar = this.editor.container?.querySelector(
      ".toolbar"
    ) as HTMLElement;
    if (!toolbar) return;
    // 修改为监听 toolbar 内部特定按钮的点击事件
    const fontSizeButton = toolbar.querySelector(
      "#font-size-btn"
    ) as HTMLElement;
    if (!fontSizeButton) return;
    this.openDropdown(fontSizeButton);
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
        }
        // 检查当前选中的内容是否已经是 span 标签
        const container = range.commonAncestorContainer;
        let targetSpan: HTMLElement | null = null;

        if (
          container.nodeType === Node.ELEMENT_NODE &&
          (container as HTMLElement).nodeName === "SPAN"
        ) {
          targetSpan = container as HTMLElement;
        } else if (
          container.nodeType === Node.TEXT_NODE &&
          container.parentElement?.nodeName === "SPAN"
        ) {
          targetSpan = container.parentElement;
        }
        if (targetSpan) {
          // 如果已经是 span 标签，则直接修改字体大小
          targetSpan.style.fontSize = size;
        } else {
          // 如果不是 span 标签，则创建新的 span 并包裹选中的内容
          const fragment = this.extractAndUnwrapFontSizeSpans(range);
          const span = document.createElement("span");
          span.style.fontSize = size;
          span.appendChild(fragment);
          range.deleteContents();
          range.insertNode(span);
          // 合并相邻同字号 span
          this.mergeAdjacentSpans(span);
        }

        this.removeExistingDropdown();
      });
      dropdown.appendChild(item);
    });

    // 定位下拉框
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
  /**
   * 提取并解包已有 font-size 样式的 span 内容
   */
  private extractAndUnwrapFontSizeSpans(range: Range): DocumentFragment {
    const fragment = range.extractContents();
    const spanWalker = document.createTreeWalker(
      fragment,
      NodeFilter.SHOW_ELEMENT,
      {
        acceptNode(node) {
          return node.nodeName === "SPAN" &&
            (node as HTMLSpanElement).style.fontSize
            ? NodeFilter.FILTER_ACCEPT
            : NodeFilter.FILTER_SKIP;
        },
      }
    );

    const spans: HTMLSpanElement[] = [];
    while (spanWalker.nextNode()) {
      spans.push(spanWalker.currentNode as HTMLSpanElement);
    }

    // 替换每个 span 为其子节点
    spans.forEach((span) => {
      const parent = span.parentNode;
      while (span.firstChild) {
        parent?.insertBefore(span.firstChild, span);
      }
      parent?.removeChild(span);
    });

    return fragment;
  }
  /**
   * 合并相邻相同字体大小的 span
   */
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
