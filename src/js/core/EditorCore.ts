// 定义模块接口
interface EditorModule {
  name: string;
  new (editor: EditorCore): any; // 模块构造函数
}

// 新增接口用于定义模块实例的结构（可根据实际模块扩展）
interface EditorModuleInstance {
  name: string;
  // 可选：添加通用方法或属性
}
// 导入样式
import "@/css/base.css";
import "@/css/dialog.css";
import "@/css/toolbar.css";
// 在文件顶部添加
import HtmlToMarkdown from "@/js/modules/HtmlToMarkdown";

export default class EditorCore {
  private selector: string;
  private container: HTMLElement | null;
  private modules: EditorModule[];
  private TableEditor: EditorModuleInstance | null = null;

  // 使用 Record 明确模块属性结构（也可根据模块数量使用联合类型）
  private moduleInstances: Record<string, EditorModuleInstance> = {};
  public savedRange: any;
  public selection: any;
  private history: string[] = [];
  private historyPointer: number = -1;
  private isProcessing: boolean = false;
  private htmlToMarkdownConverter: HtmlToMarkdown = new HtmlToMarkdown();

  constructor(selector: string, config: { modules: EditorModule[] }) {
    this.selector = selector;
    this.container = document.querySelector(this.selector);
    this.modules = config.modules;
    this.initModules();
    if (this.container) {
      this.initNativeEditor(this.container);
    }
    // 新增初始化事件监听
    this.initContentChangeHandler();
  }

  private initModules(): void {
    this.modules.forEach((moduleClass) => {
      const instance = new moduleClass(this);
      const moduleName: string = instance.name || moduleClass.name;

      // 保存模块实例到 moduleInstances 中以避免类型错误
      this.moduleInstances[moduleName] = instance;

      // 如果某些模块需要挂载到 this 上供外部访问，可以显式声明并赋值
      if (moduleName === "TableEditor") {
        this.TableEditor = instance;
      }
    });
  }

  public execCommand(cmd: string, value: string | null = null): void {
    document.execCommand(cmd, false, value || undefined);
  }

  private _bindEvents(): void {
    if (!this.container) return;

    this.container.querySelectorAll(".btn").forEach((btn: Element) => {
      btn.addEventListener("click", (e) => {
        const cmd = (btn as HTMLElement).dataset.cmd;
        let value: string | null = null;
        if (cmd === "insertTable" && this.TableEditor) {
          this.moduleInstances["TableEditor"]?.openGridSelector?.();
          this.moduleInstances["TableEditor"]?.initRightClickMenu?.();
          return;
        }
        // 处理带值的命令
        if (btn instanceof HTMLSelectElement) {
          value = btn.value;
        } else if (btn instanceof HTMLInputElement && btn.type === "color") {
          value = btn.value;
        } else if (["createLink"].includes(cmd || "")) {
          value = prompt(
            `请输入${cmd === "createLink" ? "链接地址" : "图片地址"}`
          );
          if (!value) return;
        } else if (cmd === "insertImage") {
          this.moduleInstances["ImageEditor"].openDialog(); // 假设你已注入 ImageEditor 实例
          this.moduleInstances["ImageEditor"].init(); // 启用图片点击交互功能
        }
        // 处理字体大小选择
        if (btn.classList.contains("font-size-select")) {
          const select = btn as HTMLSelectElement;
          select.addEventListener("change", () => {
            this.execCommand("fontSize", select.value);
          });
          return;
        }
        // 处理颜色选择
        if (cmd === "foreColor" || cmd === "hiliteColor") {
          e.preventDefault();
          this.saveSelection(); // 保存当前选区

          // 创建颜色选择器弹窗
          const colorPicker = document.createElement("input");
          colorPicker.type = "color";
          colorPicker.style.position = "absolute";
          colorPicker.style.top = `${
            (btn as HTMLElement).getBoundingClientRect().bottom + window.scrollY
          }px`;
          colorPicker.style.left = `${
            (btn as HTMLElement).getBoundingClientRect().left + window.scrollX
          }px`;
          colorPicker.style.zIndex = "9999";
          colorPicker.value = "#000000";

          document.body.appendChild(colorPicker);
          colorPicker.focus();
          colorPicker.click();

          // 颜色变化时执行命令
          colorPicker.addEventListener("change", () => {
            this.restoreSelection({ forceFocus: true });
            this.execCommand(cmd, colorPicker.value);
            document.body.removeChild(colorPicker);
          });

          // 点击外部关闭
          const handleClickOutside = (ev: MouseEvent) => {
            if (!colorPicker.contains(ev.target as Node)) {
              document.body.removeChild(colorPicker);
              document.removeEventListener("click", handleClickOutside);
            }
          };
          setTimeout(
            () => document.addEventListener("click", handleClickOutside),
            0
          );

          return;
        }
        // 处理撤销/重做
        if (cmd === "undo") {
          e.preventDefault();
          this.undo();
          return;
        }

        if (cmd === "redo") {
          e.preventDefault();
          this.redo();
          return;
        }
        // 处理特殊命令
        switch (cmd) {
          case "clear":
            e.preventDefault();
            if (confirm("确定要清空内容吗？")) {
              this.clearContent();
            }
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
        }
        if (cmd) {
          this.execCommand(cmd, value);
        }
      });
    });
  }

  private initNativeEditor(parentContainer: HTMLElement): void {
    const container = document.createElement("div");
    container.className = "rich-editor";
    container.contentEditable = "false";

    // 创建工具栏
    const toolbar = document.createElement("div");
    toolbar.className = "toolbar";
    toolbar.innerHTML = `
    <!-- 样式 -->
    <button class="btn" data-cmd="bold">
      <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <path d="M6 4h10c2.2 0 4 1.8 4 4s-1.8 4-4 4H9m6 4h-6c-2.2 0-4 1.8-4 4s1.8 4 4 4h10"></path>
      </svg>
    </button>
    <button class="btn" data-cmd="italic">
      <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <line x1="17" y1="4" x2="7" y2="4"></line>
        <line x1="17" y1="20" x2="7" y2="20"></line>
        <line x1="13" y1="4" x2="11" y2="20"></line>
      </svg>
    </button>
    <button class="btn" data-cmd="underline">
      <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <path d="M6 3v7a6 6 0 0 0 12 0V3"></path>
        <line x1="6" y1="14" x2="18" y2="14"></line>
      </svg>
    </button>
    <button class="btn" data-cmd="strikeThrough">
      <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <line x1="5" y1="8" x2="19" y2="8"></line>
        <line x1="5" y1="16" x2="19" y2="16"></line>
        <line x1="8" y1="12" x2="16" y2="12"></line>
      </svg>
    </button>
  
    <!-- 对齐 -->
    <button class="btn" data-cmd="justifyLeft">
      <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <line x1="5" y1="12" x2="19" y2="12"></line>
        <line x1="5" y1="6" x2="15" y2="6"></line>
        <line x1="5" y1="18" x2="11" y2="18"></line>
      </svg>
    </button>
    <button class="btn" data-cmd="justifyCenter">
      <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <line x1="5" y1="12" x2="19" y2="12"></line>
        <line x1="9" y1="6" x2="15" y2="6"></line>
        <line x1="7" y1="18" x2="17" y2="18"></line>
      </svg>
    </button>
    <button class="btn" data-cmd="justifyRight">
      <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <line x1="5" y1="12" x2="19" y2="12"></line>
        <line x1="9" y1="6" x2="19" y2="6"></line>
        <line x1="13" y1="18" x2="19" y2="18"></line>
      </svg>
    </button>
    <button class="btn" data-cmd="justifyFull">
      <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <line x1="5" y1="6" x2="19" y2="6"></line>
        <line x1="5" y1="12" x2="19" y2="12"></line>
        <line x1="5" y1="18" x2="19" y2="18"></line>
      </svg>
    </button>
  
    <!-- 列表 -->
    <button class="btn" data-cmd="insertUnorderedList">
      <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <circle cx="8" cy="6" r="1"></circle>
        <circle cx="8" cy="12" r="1"></circle>
        <circle cx="8" cy="18" r="1"></circle>
        <line x1="12" y1="6" x2="22" y2="6"></line>
        <line x1="12" y1="12" x2="22" y2="12"></line>
        <line x1="12" y1="18" x2="22" y2="18"></line>
      </svg>
    </button>
    <button class="btn" data-cmd="insertOrderedList">
      <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <line x1="8" y1="6" x2="21" y2="6"></line>
        <line x1="8" y1="12" x2="21" y2="12"></line>
        <line x1="8" y1="18" x2="21" y2="18"></line>
        <path d="M4 6h0.01M4 12h0.01M4 18h0.01"></path>
      </svg>
    </button>
  
    <!-- 缩进 -->
    <button class="btn" data-cmd="indent">
      <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <polyline points="7 8 3 12 7 16"></polyline>
        <line x1="21" y1="12" x2="3" y2="12"></line>
      </svg>
    </button>
    <button class="btn" data-cmd="outdent">
      <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <polyline points="17 8 21 12 17 16"></polyline>
        <line x1="21" y1="12" x2="3" y2="12"></line>
      </svg>
    </button>
  
    <!-- 插入 -->
    <button class="btn" data-cmd="insertTable" id="insert-table-btn">
      <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <rect x="4" y="4" width="16" height="16" rx="2"></rect>
        <line x1="4" y1="12" x2="20" y2="12"></line>
        <line x1="12" y1="4" x2="12" y2="20"></line>
      </svg>
    </button>
    <button class="btn" data-cmd="createLink">
      <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"></path>
        <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"></path>
      </svg>
    </button>
    <button class="btn" data-cmd="insertImage">
      <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
        <circle cx="8.5" cy="8.5" r="1.5"></circle>
        <polyline points="21 15 16 10 5 21"></polyline>
      </svg>
    </button>
  
    <!-- 字体样式 -->
   <div class="font-size-select-container">
    <select class="font-size-select" data-cmd="fontSize">
      <option value="">字号</option>
      <option value="12px">Aa-小</option>
      <option value="14px">Aa-</option>
      <option value="16px">Aa</option>
      <option value="18px">Aa+</option>
      <option value="24px">Aa++</option>
    </select>
    <div class="font-size-select-arrow">
      <svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <polyline points="6 9 12 15 18 9"></polyline>
      </svg>
    </div>
  </div>
  
    <!-- 颜色选择 -->
   <button class="btn color-picker-btn" data-cmd="foreColor" title="文字颜色">
  <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
    <path d="M17 4H7a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V6a2 2 0 0 0-2-2z"></path>
    <path d="M7 15l5-5 5 5"></path>
  </svg>
</button>

<button class="btn bg-color-picker-btn" data-cmd="hiliteColor" title="背景颜色">
  <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
    <rect x="2" y="3" width="20" height="14" rx="2" ry="2"></rect>
    <line x1="2" y1="17" x2="22" y2="17"></line>
    <line x1="6" y1="11" x2="6" y2="21"></line>
    <line x1="10" y1="11" x2="10" y2="21"></line>
    <line x1="14" y1="11" x2="14" y2="21"></line>
    <line x1="18" y1="11" x2="18" y2="21"></line>
  </svg>
</button>
<!-- 撤销 -->
<button class="btn" data-cmd="undo">
  <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
    <path d="M3 7v6h6"></path>
    <path d="M3 13l-2-2 2-2"></path>
    <path d="M21 17a9 9 0 0 0-9-9 9 9 0 0 0-6 15"></path>
  </svg>
</button>

<!-- 重做 -->
<button class="btn" data-cmd="redo">
  <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
    <path d="M21 17v-6h-6"></path>
    <path d="M21 11l2 2-2 2"></path>
    <path d="M3 7a9 9 0 0 1 9 9 9 9 0 0 1-6-15"></path>
  </svg>
</button>

<!-- 内容操作 -->
<button class="btn" data-cmd="clear" title="清空">
  <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
    <path d="M3 6h18"></path>
    <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6"></path>
    <line x1="4" y1="6" x2="4" y2="6"></line>
    <line x1="20" y1="6" x2="20" y2="6"></line>
  </svg>
</button>

<button class="btn" data-cmd="insertSample" title="插入示例文本">
  <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
    <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
    <line x1="7" y1="7" x2="17" y2="7"></line>
    <line x1="7" y1="12" x2="17" y2="12"></line>
    <line x1="7" y1="17" x2="12" y2="17"></line>
  </svg>
</button>

<button class="btn" data-cmd="toMarkdown" title="转换为 Markdown">
  <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
    <path d="M17 8v11c0 1.1-.9 2-2 2H5c-1.1 0-2-.9-2-2V5c0-1.1.9-2 2-2h10l5 5z"></path>
    <line x1="12" y1="12" x2="12" y2="18"></line>
    <polyline points="9 15 12 12 15 15"></polyline>
  </svg>
</button>

  `;

    // 创建可编辑区域
    const editorContent = document.createElement("div");
    editorContent.className = "editor-content";
    editorContent.contentEditable = "true"; // 仅此处允许输入

    // 组装结构
    container.appendChild(toolbar);
    container.appendChild(editorContent);

    parentContainer.appendChild(container);
    this._bindEvents();
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
    selection?.removeAllRanges();
    selection?.addRange(this.savedRange.cloneRange());
    if (options.forceFocus) {
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
   * 监听内容变化并保存到历史记录
   */
  private initContentChangeHandler(): void {
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
}
