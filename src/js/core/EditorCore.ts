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

export default class EditorCore {
  private selector: string;
  private container: HTMLElement | null;
  private modules: EditorModule[];
  private TableEditor: EditorModuleInstance | null = null;

  // 使用 Record 明确模块属性结构（也可根据模块数量使用联合类型）
  private moduleInstances: Record<string, EditorModuleInstance> = {};
  public savedRange: any;
  public selection: any;

  constructor(selector: string, config: { modules: EditorModule[] }) {
    this.selector = selector;
    this.container = document.querySelector(this.selector);
    this.modules = config.modules;
    this.initModules();
    if (this.container) {
      this.initNativeEditor(this.container);
    }
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
    <select class="btn font-size-select" data-cmd="fontSize">
      <option value="">字号</option>
      <option value="12px">12px</option>
      <option value="14px">14px</option>
      <option value="16px">16px</option>
      <option value="18px">18px</option>
      <option value="24px">24px</option>
    </select>
  
    <!-- 颜色选择 -->
    <input type="color" class="btn color-picker" data-cmd="foreColor" title="文字颜色" />
    <input type="color" class="btn bg-color-picker" data-cmd="hiliteColor" title="背景颜色" />
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
}
