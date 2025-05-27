// 在文件顶部添加
import HtmlToMarkdown from "@/js/modules/HtmlToMarkdown";
import {
  type EditorConfig,
  type ModuleConfig,
  type EditorModuleInstance,
  type ToolbarConfig,
  commandIconMap,
} from "./types";
import RichTextCommand from "../execcommand/richExeccommand";

export default class EditorCore {
  // 选择器
  private selector: string;
  //  editor config
  private config: EditorConfig;
  //
  public container: HTMLElement | null;
  // 注册的模块
  private modules: ModuleConfig[];
  // 模块实例化
  private moduleInstances: Record<string, EditorModuleInstance> = {};
  // 保存选区
  public savedRange: any;
  public selection: any;
  // 历史
  private history: string[] = [];
  private historyPointer: number = -1;
  private isProcessing: boolean = false;
  // html 转 md
  private htmlToMarkdownConverter: HtmlToMarkdown = new HtmlToMarkdown();
  // 默认的工具栏配置
  private defaultToolbarConfig: ToolbarConfig = [
    ["bold", "italic", "underline", "strikeThrough"],
    ["justifyLeft", "justifyCenter", "justifyRight", "justifyFull"],
    ["insertUnorderedList", "insertOrderedList"],
    ["indent", "outdent"],
    ["insertTable", "createLink", "insertImage"],
    ["foreColor", "hiliteColor"],
    ["undo", "redo"],
    ["clear", "insertSample", "toMarkdown", "clearFormat"],
  ];
  //
  public commandInstance;

  constructor(
    selector: string,
    config: { modules: ModuleConfig[]; toolbar?: ToolbarConfig }
  ) {
    this.commandInstance = RichTextCommand.getInstance({
      editor: this,
      doc: document,
    });
    this.selector = selector;
    this.config = config;
    this.container = document.querySelector(this.selector);
    this.modules = config.modules;
    if (this.container) {
      this.initNativeEditor(this.container);
    } else {
      console.error(`Element with selector ${this.selector} not found.`);
      return;
    }
    this.registerModules();
  }

  /**
   * 注册模块
   */
  private registerModules(): void {
    this.modules.forEach((moduleClass) => {
      // 初始化模块
      const instance = new moduleClass(this);
      const moduleName: string = instance.name || moduleClass.name;
      // 挂载 editor 实例
      this.moduleInstances[moduleName] = instance;
      // 实例注册（如果有注册方法）
      instance.register?.();
    });
  }

  private _bindEvents(): void {
    if (!this.container) return;
    this.toobarChangeHandler();
    this.selectionChangeHandler();
    this.contentChangeHandler();
  }
  /**
   * 绑定工具栏事件
   */
  private toobarChangeHandler(): void {
    if (!this.container) return;
    this.container.querySelectorAll(".btn").forEach((btn: Element) => {
      btn.addEventListener("click", (e) => {
        e.preventDefault();
        this.saveSelection();
        const cmd = (btn as HTMLElement).dataset.cmd;
        let value: string | null = null;
        switch (cmd) {
          case "foreColor":
            if (this.moduleInstances["FontColorModule"]) {
              this.moduleInstances["FontColorModule"].showColorPicker?.(
                btn as HTMLElement
              );
            } else {
              console.warn("FontColorModule 模块未注入，请检查配置。");
            }
            break;
          case "hiliteColor":
            if (this.moduleInstances["BackgroundColorModule"]) {
              this.moduleInstances["BackgroundColorModule"].showColorPicker?.(
                btn as HTMLElement
              );
            } else {
              console.warn("BackgroundColorModule 模块未注入，请检查配置。");
            }
            break;
          // 处理字体大小选择
          case "fontSize":
            if (this.moduleInstances["FontSizeModule"]) {
              this.moduleInstances["FontSizeModule"].createFontSizeSelect?.();
            } else {
              console.warn("FontSizeModule 模块未注入，请检查配置。");
            }
            break;
          case "createLink":
            value = prompt(
              `请输入${cmd === "createLink" ? "链接地址" : "图片地址"}`
            );
            if (!value) return;
            break;
          case "insertTable":
            if (this.moduleInstances["TableModule"]) {
              this.moduleInstances["TableModule"].openGridSelector?.();
              this.moduleInstances["TableModule"].initRightClickMenu?.();
            } else {
              console.warn("TableModule 模块未注入，请检查配置。");
            }
            break;
          // 插入图片
          case "insertImage":
            if (this.moduleInstances["ImageModule"]) {
              this.moduleInstances["ImageModule"].openDialog();
            } else {
              console.warn("ImageModule 模块未注入，请检查配置。");
            }
            break;
          case "clear":
            e.preventDefault();
            this.clearContent();
            break;
          case "insertSample":
            e.preventDefault();
            this.setContent(`
            <h2>欢迎使用富文本编辑器</h2>
            <p>这是一个示例文本，演示如何通过 API 设置和获取编辑器内容。</p>
            <ul>
              <li>支持列表</li>
              <li>支持表格</li>
              <li>支持图片</li>
            </ul>
          `);
            break;
          case "toMarkdown":
            e.preventDefault();
            const markdown = this.getMarkdown();
            // 显示结果弹窗
            const previewWindow = window.open("", "_blank");
            if (previewWindow) {
              previewWindow.document.write(`
                <html>
                  <head>
                    <title>Markdown Preview</title>
                    <style>
                      body { 
                        font-family: monospace;
                        white-space: pre-wrap;
                        padding: 20px;
                        background: #f8f9fa;
                      }
                    </style>
                  </head>
                  <body>${markdown}</body>
                </html>
              `);
            }
            break;
          case "clearFormat":
            e.preventDefault();
            if (this.moduleInstances["ClearFormatModule"]) {
              this.moduleInstances["ClearFormatModule"].clearFormat?.(); // 调用模块方法
            } else {
              console.warn("ClearFormatModule 模块未注入，请检查配置。");
            }
            break;
          // 处理撤销/重做
          case "redo":
            e.preventDefault();
            this.redo();
            break;
          case "undo":
            e.preventDefault();
            this.undo();
            break;
          default:
            if (cmd) {
              this.execCommand(cmd, value);
            }
            break;
        }
      });
    });
  }
  /**
   * 监听全局 selectionchange 事件
   */
  private selectionChangeHandler() {
    document.addEventListener("selectionchange", () => {
      const editorContent = this.container?.querySelector(".editor-content");
      const selection = window.getSelection();
      if (!editorContent || !selection || selection.rangeCount === 0) return;
      const range = selection.getRangeAt(0);
      if (editorContent.contains(range.commonAncestorContainer)) {
        this.debouncedSaveSelection();
      }
    });
  }
  /**
   * 监听内容变化并保存到历史记录
   */
  private contentChangeHandler(): void {
    if (!this.container) return;
    const editorContent = this.container.querySelector(".editor-content");
    if (!editorContent) return;
    let debounceTimer: number | null = null;
    editorContent.addEventListener("input", () => {
      if (this.isProcessing) return;
      // 防抖处理
      if (debounceTimer) clearTimeout(debounceTimer);
      debounceTimer = window.setTimeout(() => {
        this.saveHistoryState(editorContent.innerHTML);
      }, 300);
    });
    // 初始化时保存初始状态
    this.saveHistoryState(editorContent.innerHTML);
  }
  private debouncedSaveSelection = this.debounce(() => {
    this.saveSelection();
    console.log("选区变化，已保存当前范围", this.savedRange);
  }, 200);
  private debounce<T extends (...args: any[]) => void>(
    fn: T,
    delay: number
  ): T {
    let timer: number | null = null;
    return ((...args: any[]) => {
      if (timer) clearTimeout(timer);
      timer = setTimeout(() => fn.apply(this, args), delay);
    }) as unknown as T;
  }
  private createToolbar(toolbarConfig: ToolbarConfig): HTMLElement {
    const toolbar = document.createElement("div");
    toolbar.className = "toolbar";
    toolbarConfig.forEach((group) => {
      const groupDiv = document.createElement("div");
      groupDiv.className = "toolbar-group";
      group.forEach((cmd) => {
        if (!commandIconMap[cmd]) {
          console.warn(`未找到 "${cmd}" 的图标`);
          return;
        }
        const button = document.createElement("button");
        button.className = "btn";
        if (cmd === "insertTable") {
          button.id = "insert-table-btn";
        } else if (cmd === "fontSize") {
          button.id = "font-size-btn";
        }
        button.dataset.cmd = cmd;
        // 直接插入 SVG 字符串
        button.innerHTML = commandIconMap[cmd];
        groupDiv.appendChild(button);
      });
      toolbar.appendChild(groupDiv);
    });
    return toolbar;
  }
  private initNativeEditor(parentContainer: HTMLElement): void {
    const container = document.createElement("div");
    container.className = "next-gen-rich-editor";
    container.contentEditable = "false";
    // 创建工具栏
    const toolbar = this.createToolbar(
      this.config.toolbar || this.defaultToolbarConfig
    );
    container.appendChild(toolbar);
    // 创建可编辑区域
    const editorContent = document.createElement("div");
    editorContent.className = "editor-content";
    editorContent.contentEditable = "true"; // 仅此处允许输入
    const p = document.createElement("div");
    const br = document.createElement("br"); // 新增: 创建 br 元素
    p.appendChild(br); // 新增: 将 br 添加到 p 中
    editorContent?.appendChild(p);
    container.appendChild(toolbar); // 创建工具栏
    container.appendChild(editorContent); // 创建可编辑区域
    parentContainer.appendChild(container); //  添加到父容器（用户提供的 dom）中
    this._bindEvents(); // 绑定事件
  }
  public restoreSelection(
    options: {
      forceFocus?: boolean;
    } = {}
  ): void {
    if (!this.savedRange) return;
    // 验证选区有效性
    if (!this.savedRange.startContainer.isConnected) {
      this.savedRange = null;
      return;
    }
    const selection = window.getSelection();
    if (!selection) return;
    selection?.removeAllRanges();
    selection?.addRange(this.savedRange.cloneRange());
    if (options.forceFocus) {
      debugger;
      const editorContent = this.container?.querySelector(".editor-content");
      editorContent?.focus();
    }
  }
  public saveSelection(): void {
    this.selection = window.getSelection();
    this.savedRange =
      this.selection?.rangeCount > 0
        ? this.selection.getRangeAt(0).cloneRange()
        : null;
  }

  /**
   * 保存当前编辑器状态到历史记录
   */
  public saveHistoryState(content: string): void {
    // 如果不是在执行 undo/redo 操作时才保存
    if (!this.isProcessing) {
      // 清除当前指针之后的历史
      this.history = this.history.slice(0, this.historyPointer + 1);

      // 添加新状态
      this.history.push(content);
      this.historyPointer = this.history.length - 1;
    }
  }

  /**
   * 执行撤销操作
   */
  public undo(): void {
    if (this.historyPointer <= 0) return;

    this.isProcessing = true;
    this.historyPointer--;

    const editorContent = this.container?.querySelector(
      ".editor-content"
    ) as HTMLElement;
    editorContent.innerHTML = this.history[this.historyPointer];

    // 恢复选区
    this.restoreSelection({ forceFocus: true });
    this.isProcessing = false;
  }

  /**
   * 执行重做操作
   */
  public redo(): void {
    if (this.historyPointer >= this.history.length - 1) return;

    this.isProcessing = true;
    this.historyPointer++;

    const editorContent = this.container?.querySelector(
      ".editor-content"
    ) as HTMLElement;
    editorContent.innerHTML = this.history[this.historyPointer];

    // 恢复选区
    this.restoreSelection({ forceFocus: true });
    this.isProcessing = false;
  }

  // 以下是工具方法，提供给开发者使用
  /**
   * 获取编辑器当前内容（HTML）
   */
  public getContent(): string {
    if (!this.container) return "";

    const editorContent = this.container.querySelector(
      ".editor-content"
    ) as HTMLElement;
    return editorContent.innerHTML.trim();
  }

  /**
   * 设置编辑器内容
   * @param content - 要写入的 HTML 内容
   */
  public setContent(content: string): void {
    if (!this.container) return;

    const editorContent = this.container.querySelector(
      ".editor-content"
    ) as HTMLElement;
    editorContent.innerHTML = content;

    // 保存初始状态到历史记录
    this.saveHistoryState(content);
  }

  /**
   * 获取纯文本内容
   */
  public getPlainText(): string {
    if (!this.container) return "";

    const editorContent = this.container.querySelector(
      ".editor-content"
    ) as HTMLElement;
    return editorContent.innerText;
  }

  /**
   * 插入内容到当前光标位置
   * @param html - 要插入的 HTML 内容
   */
  public insertContent(html: string): void {
    if (!this.container) return;

    this.restoreSelection({ forceFocus: true });

    const selection = window.getSelection();
    const range = selection?.getRangeAt(0);

    if (range) {
      const parser = new DOMParser();
      const doc = parser.parseFromString(html, "text/html");

      Array.from(doc.body.children).forEach((node) => {
        range.insertNode(node.cloneNode(true));
      });

      // 更新选区到插入内容之后
      range.collapse(false);
      selection?.removeAllRanges();
      selection?.addRange(range);
    }
  }

  /**
   * 替换当前选中内容
   * @param html - 新的 HTML 内容
   */
  public replaceSelection(html: string): void {
    if (!this.container) return;

    this.restoreSelection({ forceFocus: true });

    const selection = window.getSelection();
    const range = selection?.getRangeAt(0);

    if (range) {
      const parser = new DOMParser();
      const doc = parser.parseFromString(html, "text/html");
      const fragment = document.createDocumentFragment();

      Array.from(doc.body.children).forEach((node) => {
        fragment.appendChild(node.cloneNode(true));
      });

      range.deleteContents();
      range.insertNode(fragment);

      // 更新选区到新插入的内容末尾
      range.collapse(false);
      selection?.removeAllRanges();
      selection?.addRange(range);

      // 触发内容变化事件以更新历史记录
      const editorContent = this.container.querySelector(
        ".editor-content"
      ) as HTMLElement;
      this.saveHistoryState(editorContent.innerHTML);
    }
  }

  /**
   * 将 HTML 字符串转换为 DOM 元素
   * @param htmlString - HTML 字符串
   * @returns 包含解析内容的 div 元素
   */
  public parseHTML(htmlString: string): HTMLElement {
    const parser = new DOMParser();
    const doc = parser.parseFromString(htmlString, "text/html");
    const container = document.createElement("div");

    // 复制所有子节点到容器中
    while (doc.body.firstChild) {
      container.appendChild(doc.body.firstChild);
    }

    return container;
  }

  /**
   * 清空编辑器内容
   */
  public clearContent(): void {
    if (!this.container) return;

    const editorContent = this.container.querySelector(
      ".editor-content"
    ) as HTMLElement;
    editorContent.innerHTML = "";

    // 重置历史记录
    this.history = [];
    this.historyPointer = -1;
  }

  public getMarkdown(): string {
    if (!this.container) return "";

    const editorContent = this.container.querySelector(
      ".editor-content"
    ) as HTMLElement;
    return this.htmlToMarkdownConverter.convert(editorContent.innerHTML);
  }

  /**
   * 设置从 Markdown 转换的内容
   * @param markdown - Markdown 内容
   */
  public setMarkdown(markdown: string): void {
    // TODO: 可以在此处实现 Markdown 解析器来设置内容
    console.warn("Markdown 到 HTML 的转换尚未实现");
  }

  /**
   * execcommand 指令
   * @param cmd
   * @param value
   */
  public execCommand(cmd: string, value: string | null = null): void {
    // document.execCommand(cmd, false, value || undefined);
    // todo 替换为封装的原生 execCommand
    this.commandInstance.execCommand(cmd, false, value || undefined);
  }
  private getContentElement() {
    return this.container;
  }
}
