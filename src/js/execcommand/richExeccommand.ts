import type EditorCore from "../core/EditorCore";

/**
 * 富文本编辑器命令执行器 - 替代已废弃的 document.execCommand
 */
class RichTextCommand {
  private static _instance: RichTextCommand;
  private _document: Document;
  private _editor: EditorCore;
  private _defaultParagraphSeparator: string = "div";
  private _isInited: boolean = false;

  private constructor(config: { doc?: Document; editor: EditorCore }) {
    this._document = config.doc || document;
    this._editor = config.editor;
    this.init();
  }

  /**
   * 获取单例实例
   */
  public static getInstance(config: {
    editor: EditorCore;
    doc: Document;
  }): RichTextCommand {
    if (!RichTextCommand._instance) {
      RichTextCommand._instance = new RichTextCommand(config);
    }
    return RichTextCommand._instance;
  }

  /**
   * 初始化配置
   */
  private init(): void {
    if (this._isInited) return;

    // 检测默认段落分隔符
    try {
      const tempDiv = this._document.createElement("div");
      tempDiv.innerHTML = "<p><br></p>";
      if (tempDiv.firstChild?.nodeName.toLowerCase() === "p") {
        this._defaultParagraphSeparator = "p";
      }
    } catch (e) {
      console.warn("Failed to detect default paragraph separator:", e);
    }

    this._isInited = true;
  }

  /**
   * 执行富文本命令
   * @param command 命令名称
   * @param showUI 是否显示UI (现代浏览器大多忽略此参数)
   * @param value 命令值
   * @returns 是否执行成功
   */
  public execCommand(
    command: string,
    showUI: boolean = false,
    value: string | null = null
  ): boolean {
    try {
      this._editor.restoreSelection({ forceFocus: true });
      const selection = this._document.getSelection();
      if (!selection || selection.rangeCount === 0) {
        return false;
      }
      const range = selection.getRangeAt(0);
      if (!range) {
        return false;
      }
      const selectedText = range.toString();
      if (!selectedText.trim()) {
        console.warn("没有选中任何文本");
      }

      // 处理各种命令
      switch (command.toLowerCase()) {
        case "bold":
        case "italic":
        case "underline":
        case "strikethrough":
          this.toggleInlineStyle(command);
          return true;

        case "createlink":
          this.createLink(value || "");
          return true;

        case "insertimage":
          this.insertImage(value || "");
          return true;

        case "fontsize":
          this.setFontSize(value || "");
          return true;

        case "fontname":
          this.setFontFamily(value || "");
          return true;

        case "forecolor":
          debugger;
          this.setTextColor(value || "");
          return true;

        case "hilitecolor":
        case "backcolor":
          this.setBackgroundColor(value || "");
          return true;

        case "formatblock":
          this.formatBlock(value || "");
          return true;

        case "indent":
        case "outdent":
          this.indent(command, range);
          return true;

        case "insertorderedlist":
        case "insertunorderedlist":
          this.insertList(command);
          return true;

        case "insertparagraph":
          this.insertParagraph();
          return true;

        case "inserttext":
          this.insertText(value || "");
          return true;

        case "removeformat":
          this.removeFormat();
          return true;

        case "justifyleft":
        case "justifycenter":
        case "justifyright":
        case "justifyfull":
          this.justify(command);
          return true;

        case "cut":
        case "copy":
        case "paste":
          // 这些命令需要用户交互，不能直接执行
          console.warn(
            `Command "${command}" requires user interaction and cannot be executed programmatically.`
          );
          return false;

        case "selectall":
          this.selectAll();
          return true;

        case "delete":
          this.delete();
          return true;

        case "defaultparagraphseparator":
          if (
            value &&
            ["p", "div", "h1", "h2", "h3", "h4", "h5", "h6"].includes(
              value.toLowerCase()
            )
          ) {
            this._defaultParagraphSeparator = value.toLowerCase();
            return true;
          }
          return false;

        default:
          console.warn(`Unsupported command: ${command}`);
          return false;
      }
    } catch (error) {
      console.error(`Error executing command "${command}":`, error);
      return false;
    }
  }

  /**
   * 查询命令状态
   * @param command 命令名称
   * @returns 命令状态 (true/false/mixed/null)
   */
  public queryCommandState(command: string): boolean | null {
    const selection = this._document.getSelection();
    if (!selection || selection.rangeCount === 0) {
      return null;
    }

    const range = selection.getRangeAt(0);
    if (!range || range.collapsed) {
      return null;
    }

    switch (command.toLowerCase()) {
      case "bold":
        return this.isStyleActive("font-weight", "bold");
      case "italic":
        return this.isStyleActive("font-style", "italic");
      case "underline":
        return this.isStyleActive("text-decoration", "underline");
      case "strikethrough":
        return this.isStyleActive("text-decoration", "line-through");
      case "insertorderedlist":
        return this.isInsideElement("ol");
      case "insertunorderedlist":
        return this.isInsideElement("ul");
      case "justifyleft":
        return this.isStyleActive("text-align", "left");
      case "justifycenter":
        return this.isStyleActive("text-align", "center");
      case "justifyright":
        return this.isStyleActive("text-align", "right");
      case "justifyfull":
        return this.isStyleActive("text-align", "justify");
      default:
        return null;
    }
  }

  /**
   * 查询命令值
   * @param command 命令名称
   * @returns 命令当前值
   */
  public queryCommandValue(command: string): string {
    const selection = this._document.getSelection();
    if (!selection || selection.rangeCount === 0) {
      return "";
    }

    const range = selection.getRangeAt(0);
    if (!range || range.collapsed) {
      return "";
    }

    switch (command.toLowerCase()) {
      case "fontname":
        return this.getComputedStyleProperty("font-family");
      case "fontsize":
        return this.getComputedStyleProperty("font-size");
      case "forecolor":
        return this.getComputedStyleProperty("color");
      case "hilitecolor":
      case "backcolor":
        return this.getComputedStyleProperty("background-color");
      case "formatblock":
        return this.getContainingBlockElement()?.tagName.toLowerCase() || "";
      default:
        return "";
    }
  }

  /**
   * 检查命令是否支持
   * @param command 命令名称
   * @returns 是否支持
   */
  public queryCommandSupported(command: string): boolean {
    const supportedCommands = [
      "bold",
      "italic",
      "underline",
      "strikethrough",
      "createlink",
      "insertimage",
      "fontsize",
      "fontname",
      "forecolor",
      "hilitecolor",
      "backcolor",
      "formatblock",
      "indent",
      "outdent",
      "insertorderedlist",
      "insertunorderedlist",
      "insertparagraph",
      "inserttext",
      "removeformat",
      "justifyleft",
      "justifycenter",
      "justifyright",
      "justifyfull",
      "selectall",
      "delete",
      "defaultparagraphseparator",
    ];
    return supportedCommands.includes(command.toLowerCase());
  }

  /**
   * 检查命令是否启用
   * @param command 命令名称
   * @returns 是否启用
   */
  public queryCommandEnabled(command: string): boolean {
    if (!this.queryCommandSupported(command)) {
      return false;
    }

    const selection = this._document.getSelection();
    if (!selection || selection.rangeCount === 0) {
      return false;
    }

    // 特殊命令检查
    if (
      command.toLowerCase() === "createlink" ||
      command.toLowerCase() === "insertimage"
    ) {
      return !selection.isCollapsed;
    }

    return true;
  }

  // ========== 私有方法 ==========

  private toggleInlineStyle(style: string): void {
    const selection = this._document.getSelection();
    if (!selection) return;

    const range = selection.getRangeAt(0);
    if (range.collapsed) {
      // 如果是光标位置，为接下来的输入设置样式
      this.setInlineStyleForCaret(style);
    } else {
      // 如果有选中文本，切换样式
      this.toggleInlineStyleForSelection(style, range);
    }
  }

  private setInlineStyleForCaret(style: string): void {
    const selection = this._document.getSelection();
    if (!selection) return;

    // 检查当前光标位置是否已经有样式
    const hasStyle = this.queryCommandState(style);
    const element = this.createInlineElement(style, hasStyle ? null : "true");

    // 插入一个零宽空格并设置样式
    const range = selection.getRangeAt(0);
    const textNode = this._document.createTextNode("\u200B");
    range.deleteContents();
    range.insertNode(textNode);

    // 设置样式
    range.selectNode(textNode);
    this.surroundWithElement(range, element);

    // 将光标移动到零宽空格后面
    range.setStartAfter(textNode);
    range.collapse(true);
    selection.removeAllRanges();
    selection.addRange(range);
  }

  private toggleInlineStyleForSelection(style: string, range: Range): void {
    // 首先检查选中范围内是否已经有该样式
    const hasStyle = this.queryCommandState(style);

    // 标准化选区
    this.normalizeRange(range);

    if (hasStyle) {
      // 移除样式
      this.removeInlineStyle(range, style);
    } else {
      // 添加样式
      this.applyInlineStyle(range, style);
    }
  }

  private applyInlineStyle(range: Range, style: string): void {
    const element = this.createInlineElement(style, "true");
    this.surroundWithElement(range, element);
  }

  private removeInlineStyle(range: Range, style: string): void {
    // 找出范围内所有具有该样式的元素
    const elements = this.findElementsWithStyle(range, style);

    // 移除样式
    elements.forEach((el) => {
      // 如果是span且只有这一个样式，直接替换为文本节点
      if (el.tagName.toLowerCase() === "span" && el.attributes.length === 1) {
        const parent = el.parentNode;
        if (parent) {
          while (el.firstChild) {
            parent.insertBefore(el.firstChild, el);
          }
          parent.removeChild(el);
        }
      } else {
        // 否则移除特定样式
        switch (style.toLowerCase()) {
          case "bold":
            el.style.fontWeight = "";
            break;
          case "italic":
            el.style.fontStyle = "";
            break;
          case "underline":
            el.style.textDecoration = el.style.textDecoration.replace(
              /underline/g,
              ""
            );
            break;
          case "strikethrough":
            el.style.textDecoration = el.style.textDecoration.replace(
              /line-through/g,
              ""
            );
            break;
        }

        // 如果元素没有样式了，移除空属性
        if (!el.getAttribute("style")) {
          el.removeAttribute("style");
        }
      }
    });
  }

  private createInlineElement(
    style: string,
    value: string | null
  ): HTMLElement {
    const element = this._document.createElement("span");

    switch (style.toLowerCase()) {
      case "bold":
        element.style.fontWeight = value ? "bold" : "normal";
        break;
      case "italic":
        element.style.fontStyle = value ? "italic" : "normal";
        break;
      case "underline":
        element.style.textDecoration = value ? "underline" : "none";
        break;
      case "strikethrough":
        element.style.textDecoration = value ? "line-through" : "none";
        break;
    }

    return element;
  }

  private createLink(url: string): void {
    const selection = this._document.getSelection();
    if (!selection || selection.isCollapsed) return;

    const range = selection.getRangeAt(0);
    const anchor = this._document.createElement("a");
    anchor.href = url;
    anchor.target = "_blank";
    this.surroundWithElement(range, anchor);
  }

  private insertImage(src: string): void {
    const selection = this._document.getSelection();
    if (!selection) return;

    const range = selection.getRangeAt(0);
    const img = this._document.createElement("img");
    img.src = src;
    img.alt = "";

    range.deleteContents();
    range.insertNode(img);

    // 将光标移动到图片后面
    range.setStartAfter(img);
    range.collapse(true);
    selection.removeAllRanges();
    selection.addRange(range);
  }

  private setFontSize(size: string): void {
    const selection = this._document.getSelection();
    if (!selection) return;
    const range = selection.getRangeAt(0);
    // 选中文本
    const parentElement = this.findStyleableParent(
      range.commonAncestorContainer
    );
    if (parentElement && parentElement !== this._editor.getContentElement()) {
      // 直接修改现有父元素样式
      parentElement.style.fontSize = size;
      // 清理空样式属性
      if (!parentElement.getAttribute("style")) {
        parentElement.removeAttribute("style");
      }
    } else {
      // 需要创建包裹元素的情况
      const span = this._document.createElement("span");
      span.style.fontSize = size;
      this.surroundWithElement(range, span);
    }
  }

  private setFontFamily(font: string): void {
    const selection = this._document.getSelection();
    if (!selection) return;

    const range = selection.getRangeAt(0);
    const span = this._document.createElement("span");
    span.style.fontFamily = font;

    if (range.collapsed) {
      // 光标位置
      const textNode = this._document.createTextNode("\u200B");
      range.deleteContents();
      range.insertNode(textNode);

      range.selectNode(textNode);
      this.surroundWithElement(range, span);

      range.setStartAfter(textNode);
      range.collapse(true);
      selection.removeAllRanges();
      selection.addRange(range);
    } else {
      // 选中文本
      this.surroundWithElement(range, span);
    }
  }

  private setTextColor(color: string): void {
    this.setColorStyle("color", color);
  }

  private setBackgroundColor(color: string): void {
    this.setColorStyle("backgroundColor", color);
  }

  private setColorStyle(style: string, color: string): void {
    const selection = this._document.getSelection();
    if (!selection) return;

    const range = selection.getRangeAt(0);
    const span = this._document.createElement("span");
    (span.style as any)[style] = color;

    if (range.collapsed) {
      // 没有选中任何文本时
      // 光标位置
      const textNode = this._document.createTextNode("\u200B");
      range.deleteContents();
      range.insertNode(textNode);
      range.selectNode(textNode);
      this.surroundWithElement(range, span);
      range.setStartAfter(textNode);
      range.collapse(true);
      selection.removeAllRanges();
      selection.addRange(range);
    } else {
      // 选中文本
      this.surroundWithElement(range, span);
    }
  }

  private formatBlock(tagName: string): void {
    const selection = this._document.getSelection();
    if (!selection) return;

    const range = selection.getRangeAt(0);
    const blockElement = this._document.createElement(tagName);

    // 获取当前选区所在的块级元素
    const currentBlock = this.getContainingBlockElement(range.startContainer);

    if (currentBlock) {
      // 如果已经是在块级元素中，替换它
      const parent = currentBlock.parentNode;
      if (parent) {
        blockElement.innerHTML = currentBlock.innerHTML;
        parent.replaceChild(blockElement, currentBlock);
      }
    } else {
      // 如果不是在块级元素中，创建新的块级元素并包裹内容
      this.surroundWithElement(range, blockElement);
    }

    // 将光标移动到新块级元素内
    range.selectNodeContents(blockElement);
    range.collapse(false);
    selection.removeAllRanges();
    selection.addRange(range);
  }

  private indent(direction: "indent" | "outdent", range: Range): void {
    const selection = this._document.getSelection();
    if (!selection) return;

    const blockElement = this.getContainingBlockElement(range.startContainer);
    if (!blockElement) return;

    const currentMargin = parseInt(blockElement.style.marginLeft) || 0;
    const increment = direction === "indent" ? 40 : -40;
    const newMargin = Math.max(0, currentMargin + increment);

    blockElement.style.marginLeft = `${newMargin}px`;
  }

  private insertList(
    listType: "insertorderedlist" | "insertunorderedlist"
  ): void {
    const selection = this._document.getSelection();
    if (!selection) return;

    const range = selection.getRangeAt(0);
    const listTag = listType === "insertorderedlist" ? "ol" : "ul";
    const listItemTag = "li";

    // 检查是否已经在列表中
    const existingList = this.getContainingElement(
      range.startContainer,
      listTag
    );
    if (existingList) {
      // 如果已经在列表中，取消列表
      this.unwrapList(existingList);
      return;
    }

    // 创建新列表
    const list = this._document.createElement(listTag);
    const listItem = this._document.createElement(listItemTag);

    if (range.collapsed) {
      // 光标位置 - 插入空列表项
      list.appendChild(listItem);
      range.insertNode(list);

      // 将光标移动到列表项内
      range.setStart(listItem, 0);
      range.collapse(true);
    } else {
      // 选中文本 - 将选中内容包裹在列表项中
      const fragment = range.extractContents();
      listItem.appendChild(fragment);
      list.appendChild(listItem);
      range.insertNode(list);

      // 将光标移动到列表末尾
      range.setStartAfter(list);
      range.collapse(true);
    }

    selection.removeAllRanges();
    selection.addRange(range);
  }

  private insertParagraph(): void {
    const selection = this._document.getSelection();
    if (!selection) return;

    const range = selection.getRangeAt(0);
    const paragraph = this._document.createElement(
      this._defaultParagraphSeparator
    );
    const br = this._document.createElement("br");
    paragraph.appendChild(br);

    // 插入新段落
    range.insertNode(paragraph);

    // 将光标移动到新段落中
    range.setStart(br, 0);
    range.collapse(true);
    selection.removeAllRanges();
    selection.addRange(range);
  }

  private insertText(text: string): void {
    const selection = this._document.getSelection();
    if (!selection) return;

    const range = selection.getRangeAt(0);
    range.deleteContents();
    range.insertNode(this._document.createTextNode(text));

    // 移动光标到插入文本之后
    range.setStartAfter(range.endContainer);
    range.collapse(true);
    selection.removeAllRanges();
    selection.addRange(range);
  }

  private removeFormat(): void {
    const selection = this._document.getSelection();
    if (!selection || selection.isCollapsed) return;

    const range = selection.getRangeAt(0);
    const fragment = range.extractContents();

    // 递归移除所有格式
    this.removeFormatFromNode(fragment);

    range.insertNode(fragment);

    // 恢复选区
    range.setStart(range.startContainer, range.startOffset);
    range.setEnd(range.endContainer, range.endOffset);
    selection.removeAllRanges();
    selection.addRange(range);
  }

  private justify(alignment: string): void {
    const selection = this._document.getSelection();
    if (!selection) return;

    const range = selection.getRangeAt(0);
    const blockElement = this.getContainingBlockElement(range.startContainer);
    if (!blockElement) return;

    switch (alignment.toLowerCase()) {
      case "justifyleft":
        blockElement.style.textAlign = "left";
        break;
      case "justifycenter":
        blockElement.style.textAlign = "center";
        break;
      case "justifyright":
        blockElement.style.textAlign = "right";
        break;
      case "justifyfull":
        blockElement.style.textAlign = "justify";
        break;
    }
  }

  private selectAll(): void {
    const selection = this._document.getSelection();
    if (!selection) return;

    const editableElement = this.findEditableElement(selection.anchorNode);
    if (editableElement) {
      const range = this._document.createRange();
      range.selectNodeContents(editableElement);
      selection.removeAllRanges();
      selection.addRange(range);
    }
  }

  private delete(): void {
    const selection = this._document.getSelection();
    if (!selection || selection.isCollapsed) return;

    const range = selection.getRangeAt(0);
    const editableRoot = this._editor.getContentElement();

    // 检查是否删除整个内容
    if (
      editableRoot &&
      range
        .cloneRange()
        .compareBoundaryPoints(Range.START_TO_START, editableRoot) === 0 &&
      range
        .cloneRange()
        .compareBoundaryPoints(Range.END_TO_END, editableRoot) === 0
    ) {
      // 全删时保留基础结构
      editableRoot.innerHTML = `<${this._defaultParagraphSeparator}><br></${this._defaultParagraphSeparator}>`;
      range.selectNodeContents(editableRoot.firstElementChild!);
    } else {
      range.deleteContents();
    }

    selection.removeAllRanges();
    selection.addRange(range);
  }

  // ========== 辅助方法 ==========

  private surroundWithElement(range: Range, element: HTMLElement): void {
    // 标准化选区，确保不拆分DOM结构
    this.normalizeRange(range);
    // 提取选区内容并包裹在新元素中
    const fragment = range.extractContents();
    element.appendChild(fragment);
    range.insertNode(element);
    // 恢复选区
    range.selectNodeContents(element);
    // range.collapse(false);// 开启此属性会将选区改变为折叠状态
  }

  private normalizeRange(range: Range): void {
    // 确保选区不会拆分DOM结构
    const startContainer = range.startContainer;
    const endContainer = range.endContainer;

    // 如果选区开始于文本节点中间，拆分文本节点
    if (startContainer.nodeType === Node.TEXT_NODE && range.startOffset > 0) {
      const newText = startContainer.splitText(range.startOffset);
      range.setStart(newText, 0);
      range.setEnd(endContainer, range.endOffset);
    }

    // 如果选区结束于文本节点中间，拆分文本节点
    if (
      endContainer.nodeType === Node.TEXT_NODE &&
      range.endOffset < endContainer.textContent?.length
    ) {
      endContainer.splitText(range.endOffset);
    }
  }

  private isStyleActive(property: string, value: string): boolean {
    const selection = this._document.getSelection();
    if (!selection || selection.rangeCount === 0) return false;

    const range = selection.getRangeAt(0);
    if (range.collapsed) {
      // 光标位置 - 检查父元素的样式
      const node = range.startContainer;
      const element =
        node.nodeType === Node.ELEMENT_NODE
          ? (node as HTMLElement)
          : node.parentElement;
      if (!element) return false;

      const computedStyle = window.getComputedStyle(element);
      return computedStyle[property as any] === value;
    } else {
      // 选区范围 - 检查选区内的所有文本节点
      const walker = this._document.createTreeWalker(
        range.commonAncestorContainer,
        NodeFilter.SHOW_TEXT,
        {
          acceptNode: (node) => {
            return range.intersectsNode(node)
              ? NodeFilter.FILTER_ACCEPT
              : NodeFilter.FILTER_REJECT;
          },
        }
      );

      let currentNode: Node | null = walker.nextNode();
      while (currentNode) {
        const parent = currentNode.parentElement;
        if (parent) {
          const computedStyle = window.getComputedStyle(parent);
          if (computedStyle[property as any] === value) {
            return true;
          }
        }
        currentNode = walker.nextNode();
      }

      return false;
    }
  }

  private isInsideElement(tagName: string): boolean {
    const selection = this._document.getSelection();
    if (!selection || selection.rangeCount === 0) return false;

    const range = selection.getRangeAt(0);
    const node = range.startContainer;
    return !!this.getContainingElement(node, tagName);
  }

  private getComputedStyleProperty(property: string): string {
    const selection = this._document.getSelection();
    if (!selection || selection.rangeCount === 0) return "";

    const range = selection.getRangeAt(0);
    const node = range.startContainer;
    const element =
      node.nodeType === Node.ELEMENT_NODE
        ? (node as HTMLElement)
        : node.parentElement;
    if (!element) return "";

    const computedStyle = window.getComputedStyle(element);
    return computedStyle[property as any] || "";
  }

  private getContainingBlockElement(node: Node): HTMLElement | null {
    const blockElements = [
      "p",
      "div",
      "h1",
      "h2",
      "h3",
      "h4",
      "h5",
      "h6",
      "pre",
      "blockquote",
      "li",
      "td",
      "th",
      "article",
      "aside",
      "section",
      "header",
      "footer",
      "nav",
      "main",
    ];

    let current: Node | null = node;
    while (current && current !== this._document) {
      if (current.nodeType === Node.ELEMENT_NODE) {
        const element = current as HTMLElement;
        if (blockElements.includes(element.tagName.toLowerCase())) {
          return element;
        }
      }
      current = current.parentNode;
    }

    return null;
  }

  private getContainingElement(
    node: Node,
    tagName: string
  ): HTMLElement | null {
    let current: Node | null = node;
    while (current && current !== this._document) {
      if (current.nodeType === Node.ELEMENT_NODE) {
        const element = current as HTMLElement;
        if (element.tagName.toLowerCase() === tagName.toLowerCase()) {
          return element;
        }
      }
      current = current.parentNode;
    }

    return null;
  }

  private findElementsWithStyle(range: Range, style: string): HTMLElement[] {
    const elements: HTMLElement[] = [];
    const walker = this._document.createTreeWalker(
      range.commonAncestorContainer,
      NodeFilter.SHOW_ELEMENT,
      {
        acceptNode: (node) => {
          return range.intersectsNode(node)
            ? NodeFilter.FILTER_ACCEPT
            : NodeFilter.FILTER_REJECT;
        },
      }
    );

    let currentNode: Node | null = walker.nextNode();
    while (currentNode) {
      const element = currentNode as HTMLElement;
      let hasStyle = false;

      switch (style.toLowerCase()) {
        case "bold":
          hasStyle =
            element.style.fontWeight === "bold" ||
            window.getComputedStyle(element).fontWeight === "bold";
          break;
        case "italic":
          hasStyle =
            element.style.fontStyle === "italic" ||
            window.getComputedStyle(element).fontStyle === "italic";
          break;
        case "underline":
          hasStyle =
            element.style.textDecoration.includes("underline") ||
            window
              .getComputedStyle(element)
              .textDecoration.includes("underline");
          break;
        case "strikethrough":
          hasStyle =
            element.style.textDecoration.includes("line-through") ||
            window
              .getComputedStyle(element)
              .textDecoration.includes("line-through");
          break;
      }

      if (hasStyle) {
        elements.push(element);
      }

      currentNode = walker.nextNode();
    }

    return elements;
  }

  private removeFormatFromNode(node: Node): void {
    if (node.nodeType === Node.ELEMENT_NODE) {
      const element = node as HTMLElement;

      // 移除内联样式
      element.removeAttribute("style");

      // 移除特定属性
      ["class", "id", "title", "lang", "dir"].forEach((attr) => {
        element.removeAttribute(attr);
      });

      // 如果是span、font等纯格式元素，替换为文本节点
      if (
        ["span", "font", "b", "i", "u", "strike"].includes(
          element.tagName.toLowerCase()
        )
      ) {
        const parent = element.parentNode;
        if (parent) {
          while (element.firstChild) {
            parent.insertBefore(element.firstChild, element);
          }
          parent.removeChild(element);
        }
      }

      // 递归处理子节点
      for (let i = 0; i < node.childNodes.length; i++) {
        this.removeFormatFromNode(node.childNodes[i]);
      }
    }
  }

  private unwrapList(list: HTMLElement): void {
    const parent = list.parentNode;
    if (!parent) return;

    const listItems = Array.from(list.getElementsByTagName("li"));
    listItems.forEach((li) => {
      // 在每个列表项后插入换行
      const br = this._document.createElement("br");
      parent.insertBefore(br, list);

      // 将列表项内容移到列表外
      while (li.firstChild) {
        parent.insertBefore(li.firstChild, br);
      }

      // 移除空列表项
      li.remove();
    });

    // 移除空列表
    list.remove();
  }

  private findEditableElement(node: Node | null): HTMLElement | null {
    while (node && node !== this._document) {
      if (node.nodeType === Node.ELEMENT_NODE) {
        const element = node as HTMLElement;
        if (element.isContentEditable) {
          return element;
        }
      }
      node = node.parentNode;
    }
    return null;
  }

  private findStyleableParent(node: Node): HTMLElement | null {
    const editableRoot = this._editor.getContentElement();
    const blockElements = ["DIV", "P", "H1", "H2", "H3", "H4", "H5", "H6"];

    let current: Node | null = node;
    while (current && current !== editableRoot) {
      if (current.nodeType === Node.ELEMENT_NODE) {
        const element = current as HTMLElement;

        // 满足以下条件可复用：
        // 1. 是块级元素
        // 2. 没有ID/类名等特殊标识
        // 3. 不是编辑器内容根元素
        if (
          blockElements.includes(element.tagName) &&
          !element.id &&
          !element.className
        ) {
          return element;
        }
      }
      current = current.parentNode;
    }
    return null;
  }
}

// 全局接口，保持与原生 execCommand 相同的调用方式
interface Document {
  execCommand(
    command: string,
    showUI?: boolean,
    value?: string | null
  ): boolean;
  queryCommandState(command: string): boolean | null;
  queryCommandValue(command: string): string;
  queryCommandSupported(command: string): boolean;
  queryCommandEnabled(command: string): boolean;
}

// 重写原生方法
if (!Document.prototype.execCommand) {
  const richTextCommand = RichTextCommand.getInstance();

  Document.prototype.execCommand = function (
    command: string,
    showUI: boolean = false,
    value: string | null = null
  ): boolean {
    return richTextCommand.execCommand(command, showUI, value);
  };

  Document.prototype.queryCommandState = function (
    command: string
  ): boolean | null {
    return richTextCommand.queryCommandState(command);
  };

  Document.prototype.queryCommandValue = function (command: string): string {
    return richTextCommand.queryCommandValue(command);
  };

  Document.prototype.queryCommandSupported = function (
    command: string
  ): boolean {
    return richTextCommand.queryCommandSupported(command);
  };

  Document.prototype.queryCommandEnabled = function (command: string): boolean {
    return richTextCommand.queryCommandEnabled(command);
  };
}

export default RichTextCommand;
