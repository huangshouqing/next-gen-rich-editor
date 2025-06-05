// 在文件顶部添加
import {
  type EditorConfig,
  type ModuleConfig,
  type EditorModuleInstance,
  type ToolbarConfig,
  commandIconMap,
} from "../types/types";
import { QuillModuleImpl } from "./quill";
import "../../css/base.scss";
import Delta from "quill-delta-es";
import str from "../examples/sample-content.js";

// 定义 better-table 模块的接口
interface BetterTableModule {
  insertTable: (rows: number, cols: number) => void;
  showTablePicker?: (buttonElement: HTMLElement) => void;
}

export class EditorCore {
  public quillInstance: QuillModuleImpl | undefined;
  // 选择器
  private selector: string;
  // 配置
  private config: EditorConfig;
  // 容器
  public container: HTMLElement | null;
  // 包裹 quill 的元素
  private root: HTMLElement | null | undefined;
  // 注册的模块
  private modules: ModuleConfig[];
  // 模块实例化
  private moduleInstances: Record<string, EditorModuleInstance> = {};
  // 保存选区
  private savedRange: { index: number; length: number } | null = null;
  public selection: any;
  selections = { index: 0, length: 0 };
  // 历史
  private history: string[] = [];
  private historyPointer: number = -1;
  private isProcessing: boolean = false;
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

  constructor(
    selector: string,
    config: { modules: ModuleConfig[]; toolbar?: ToolbarConfig }
  ) {
    this.selector = selector;
    this.config = config;
    this.container = document.querySelector(selector);
    this.modules = config.modules;

    if (!this.container) {
      console.error(`Element with selector ${selector} not found.`);
      return;
    }

    this.initNativeEditor(this.container);
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
    // 添加工具栏状态更新
    this.bindToolbarStateUpdate();
  }
  /**
   * 绑定工具栏事件
   */
  private toobarChangeHandler(): void {
    if (!this.container) return;
    this.container.querySelectorAll(".btn").forEach((btn: Element) => {
      btn.addEventListener("click", (e) => {
        e.preventDefault();
        e.stopPropagation();
        this.saveSelection();
        const cmd = (btn as HTMLElement).dataset.cmd;
        let value: string | null = null;
        switch (cmd) {
          case "formula":
            this.moduleInstances["FormulaModule"]?.showDialog?.();
            break;
          // 字体颜色
          case "foreColor":
            if (this.moduleInstances["FontColorModule"]) {
              this.moduleInstances["FontColorModule"].showColorPicker?.(
                btn as HTMLElement
              );
            } else {
              console.warn("FontColorModule 模块未注入，请检查配置。");
            }
            break;
          // 背景颜色
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
            this.execCommand(cmd, value);
            break;
          //  表格
          case "insertTable":
            if (this.moduleInstances["TableModule"]) {
              this.moduleInstances["TableModule"].showTablePicker?.(btn as HTMLElement);
            } else {
              // 如果没有 TableModule，直接使用 better-table 模块
              const betterTableModule = this.quillInstance?.quill?.getModule("better-table") as BetterTableModule;
              if (betterTableModule && betterTableModule.showTablePicker) {
                betterTableModule.showTablePicker(btn as HTMLElement);
              } else if (betterTableModule && betterTableModule.insertTable) {
                betterTableModule.insertTable(3, 3);
              }
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
          // 清除内容
          case "clear":
            e.preventDefault();
            this.clearContent();
            break;
          case "insertSample":
            e.preventDefault();
            this.insertContent(str);
            break;
          case "toMarkdown":
            e.preventDefault();
            this.toMarkdown();
            break;
          default:
            //  处理其他命令
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
      const selection = window.getSelection();
      if (!this.root || !selection || selection.rangeCount === 0) return;
      const range = selection.getRangeAt(0);
      if (this.root.contains(range.commonAncestorContainer)) {
        this.debounce(() => {
          this.saveSelection();
        }, 200);
      }
    });
  }

  /**
   * 监听内容变化并保存到历史记录
   */
  private contentChangeHandler(): void {
    if (!this.container) return;
    if (!this.root) return;
    let debounceTimer: number | null = null;
    this.root.addEventListener("input", () => {
      if (this.isProcessing) return;
      // 防抖处理
      if (debounceTimer) clearTimeout(debounceTimer);
      debounceTimer = window.setTimeout(() => {
        if (this.root) {
          // todo
        }
      }, 300);
    });
    // 初始化时保存初始状态
  }
  private debounce<T extends (...args: any[]) => void>(
    fn: T,
    delay: number
  ): T {
    let timer: any = null;
    return ((...args: any[]) => {
      if (timer) clearTimeout(timer);
      timer = setTimeout(() => fn.apply(this, args), delay);
    }) as unknown as T;
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
    editorContent.contentEditable = "false";
    const p = document.createElement("div");
    const br = document.createElement("br"); // 新增: 创建 br 元素
    p.appendChild(br); // 新增: 将 br 添加到 p 中
    editorContent?.appendChild(p);
    container.appendChild(toolbar); // 创建工具栏
    container.appendChild(editorContent); // 创建可编辑区域
    parentContainer.appendChild(container); //  添加到父容器（用户提供的 dom）中
    this.root = this.container?.querySelector(
      ".editor-content"
    ) as HTMLElement | null;
    if (this.root) {
      this.quillInstance = new QuillModuleImpl(this.root);
    }
    this._bindEvents(); // 绑定事件
  }
  private createToolbar(toolbarConfig: ToolbarConfig): HTMLElement {
    const toolbar = document.createElement("div");
    toolbar.className = "toolbar modern-toolbar";
    
    // 添加现代化样式
    toolbar.style.cssText = `
      user-select: none;
      pointer-events: auto;
      padding: 12px 16px;
      background: #ffffff;
      border-bottom: 1px solid #e5e7eb;
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      gap: 8px;
      box-shadow: 0 1px 3px rgba(0, 0, 0, 0.06);
      border-radius: 8px 8px 0 0;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    `;

    toolbarConfig.forEach((group) => {
      const groupDiv = document.createElement("div");
      groupDiv.className = "toolbar-group";
      groupDiv.style.cssText = `
        display: flex;
        align-items: center;
        gap: 4px;
        padding: 0 8px;
        border-right: 1px solid #f3f4f6;
        position: relative;
      `;

      group.forEach((cmd) => {
        if (!commandIconMap[cmd]) {
          console.warn(`未找到 "${cmd}" 的图标`);
          return;
        }
        const button = document.createElement("button");
        button.className = "btn modern-btn";
        
        // 添加现代化按钮样式
        button.style.cssText = `
          background: transparent;
          border: none;
          padding: 8px;
          cursor: pointer;
          color: #374151;
          border-radius: 6px;
          transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
          display: flex;
          align-items: center;
          justify-content: center;
          width: 36px;
          height: 36px;
          position: relative;
          outline: none;
        `;

        // 添加悬停效果
        button.addEventListener('mouseenter', () => {
          button.style.background = 'rgba(5, 137, 243, 0.08)';
          button.style.color = '#0589f3';
          button.style.transform = 'translateY(-1px)';
          button.style.boxShadow = '0 2px 8px rgba(5, 137, 243, 0.15)';
        });

        button.addEventListener('mouseleave', () => {
          button.style.background = 'transparent';
          button.style.color = '#374151';
          button.style.transform = 'translateY(0)';
          button.style.boxShadow = 'none';
        });

        button.addEventListener('mousedown', () => {
          button.style.transform = 'translateY(0) scale(0.95)';
        });

        button.addEventListener('mouseup', () => {
          button.style.transform = 'translateY(-1px) scale(1)';
        });

        if (cmd === "insertTable") {
          button.id = "insert-table-btn";
        } else if (cmd === "fontSize") {
          button.id = "font-size-btn";
        } else if (cmd === "formula") {
          button.id = "formula-btn";
        } else if (cmd === "table-pro") {
          button.id = "ql-table-pro";
        }
        button.dataset.cmd = cmd;
        // 直接插入 SVG 字符串
        button.innerHTML = commandIconMap[cmd];
        
        // 给 SVG 添加样式
        const svg = button.querySelector('svg');
        if (svg) {
          svg.style.cssText = `
            width: 20px;
            height: 20px;
            transition: all 0.2s;
          `;
        }

        groupDiv.appendChild(button);
      });

      toolbar.appendChild(groupDiv);
    });

    // 最后一个组不显示右边框
    const groups = toolbar.querySelectorAll('.toolbar-group');
    if (groups.length > 0) {
      const lastGroup = groups[groups.length - 1] as HTMLElement;
      lastGroup.style.borderRight = 'none';
    }

    // 添加全局样式
    if (!document.querySelector('#modern-toolbar-styles')) {
      const style = document.createElement('style');
      style.id = 'modern-toolbar-styles';
      style.textContent = `
        .modern-toolbar .modern-btn:focus {
          background: rgba(5, 137, 243, 0.1) !important;
          color: #0589f3 !important;
          box-shadow: 0 0 0 2px rgba(5, 137, 243, 0.2) !important;
        }
        
        .modern-toolbar .modern-btn:active {
          background: rgba(5, 137, 243, 0.15) !important;
        }
        
        .modern-toolbar .toolbar-group:last-child {
          border-right: none !important;
        }
      `;
      document.head.appendChild(style);
    }

    return toolbar;
  }
  /**
   * 保存当前选区
   */
  saveSelection(): void {
    const selection = this.quillInstance?.quill.getSelection() as {
      index: number;
      length: number;
    } | null;
    if (
      selection &&
      typeof selection.index !== "undefined" &&
      typeof selection.length !== "undefined"
    ) {
      // 保存选区信息到实例变量
      this.savedRange = {
        index: selection.index,
        length: selection.length,
      };
    }
  }
  /**
   * 恢复之前保存的选区
   */
  restoreSelection(): void {
    if (this.savedRange && this.quillInstance) {
      // 恢复选区并聚焦编辑器
      this.quillInstance.quill.setSelection(
        this.savedRange.index,
        this.savedRange.length
      );
      this.quillInstance.quill.focus();
    }
  }
  /**
   *  获取选区内容的 delta
   * @returns delta
   */
  getSelectContents(): { [key: string]: any } {
    if (!this.container || !this.quillInstance) return {};
    this.restoreSelection();
    const selection = this.quillInstance.quill.getSelection();
    if (
      selection &&
      typeof selection.index !== "undefined" &&
      typeof selection.length !== "undefined"
    ) {
      const contents = this.quillInstance.quill.getContents(
        selection.index,
        selection.length
      );
      return contents;
    }
    return {};
  }
  // 以下是工具方法，提供给开发者使用
  /**
   * 获取编辑器当前内容（HTML）
   */
  public getContent(): string {
    if (!this.container || !this.root) return "";
    return this.root.innerHTML.trim();
  }
  /**
   * 获取纯文本内容
   */
  public getPlainText(): string {
    if (!this.container || !this.root) return "";
    return this.root.innerText;
  }
  /**
   * 插入内容到当前光标位置
   * @param html - 要插入的 HTML 内容
   */
  public insertContent(html: string): void {
    if (!this.container || !this.quillInstance) return;
    const quill = this.quillInstance.quill;
    const delta = this.convertHtmlToDelta("224242");
    try {
      console.log("生成的delta:", delta);
      if (delta && Array.isArray(delta.ops) && delta.ops.length === 0) {
        console.error("转换得到空delta，原始HTML:", html);
        return;
      }
      quill.updateContents(
        new Delta()
          .retain(quill.getSelection()?.index || quill.getLength())
          .concat(delta as Delta),
        "user"
      );
    } catch (e) {
      console.error("HTML转换delta失败:", e);
    }
    const currentSelection = quill.getSelection();
    const currentIndex = currentSelection
      ? currentSelection.index
      : quill.getLength();
    const deltaLength = delta?.length() ?? 0;

    const newPosition = currentIndex + deltaLength;
    quill.setSelection(newPosition, 0);
  }

  /**
   * 将 Delta 转换为 HTML
   * @param delta - Delta 对象
   * @returns HTML 字符串
   */
  public convertDeltaToHtml = (delta: Delta) => {
    const quill = this.quillInstance?.quill;
    if (!quill) {
      return console.warn("quill实例不存在");
    }
    quill.setContents(delta);
    return quill.root.innerHTML;
  };

  /**
   * 将 HTML 转换为 Delta
   * @param html - HTML 字符串
   * @returns Delta 对象
   */
  public convertHtmlToDelta = (html: string) => {
    const quill = this.quillInstance?.quill;
    if (!quill) {
      return console.warn("quill实例不存在");
    }
    debugger;
    return quill.clipboard.convert({ html });
  };
  /**
   * 将纯文本转换为 Delta
   * @param text - 纯文本字符串
   * @returns Delta 对象
   */
  public convertTextToDelta = (text: string) => {
    const quill = this.quillInstance?.quill;
    if (!quill) {
      return console.warn("quill实例不存在");
    }
    quill.setText(text);
    return quill.getContents();
  };
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
    if (!this.container || !this.root) return;
    this.root.innerHTML = "";
    // 重置历史记录
    this.history = [];
    this.historyPointer = -1;
  }
  public toMarkdown() {
    if (!this.container || !this.root) return "";
    const markdown = this.moduleInstances["HtmlToMarkdown"].convert(
      this.root.innerHTML
    );
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
  }
  /**
   * 执行富文本命令
   * @param command 命令名称（如 'bold', 'insertText'）
   * @param value 可选参数（如文本内容、链接地址）
   */
  public execCommand(command: string, value?: any): void {
    // 先恢复保存的选区
    this.restoreSelection();
    // 执行原有命令逻辑
    if (this.quillInstance) {
      this.quillInstance.execCommand(command, value);
    }
  }

  /**
   * 绑定工具栏状态更新
   */
  private bindToolbarStateUpdate(): void {
    if (!this.quillInstance) return;
    
    // 监听选区变化，更新工具栏状态
    this.quillInstance.quill.on('selection-change', (range) => {
      if (range) {
        this.updateToolbarState(range);
      }
    });

    // 监听文本变化，也需要更新工具栏状态
    this.quillInstance.quill.on('text-change', () => {
      const range = this.quillInstance?.quill.getSelection();
      if (range) {
        // 延迟更新，确保格式已应用
        setTimeout(() => {
          this.updateToolbarState(range);
        }, 10);
      }
    });
  }

  /**
   * 更新工具栏按钮状态
   */
  private updateToolbarState(range: { index: number; length: number }): void {
    if (!this.quillInstance || !this.container) return;

    // 获取当前选区的格式
    const formats = this.quillInstance.quill.getFormat(range.index, range.length);
    
    // 更新基础格式按钮状态
    this.updateFormatButtonState('bold', Boolean(formats.bold));
    this.updateFormatButtonState('italic', Boolean(formats.italic));
    this.updateFormatButtonState('underline', Boolean(formats.underline));
    this.updateFormatButtonState('strikeThrough', Boolean(formats.strike));
    
    // 更新对齐按钮状态
    this.updateAlignButtonState(String(formats.align || ''));
    
    // 更新列表按钮状态
    this.updateListButtonState(String(formats.list || ''));
    
    // 更新字体大小状态
    this.updateFontSizeState(String(formats.size || ''));
    
    // 更新颜色状态
    this.updateColorState('foreColor', String(formats.color || ''));
    this.updateColorState('hiliteColor', String(formats.background || ''));
    
    // 更新缩进按钮状态（根据当前缩进级别）
    this.updateIndentButtonState(Number(formats.indent || 0));
  }

  /**
   * 更新格式按钮状态
   */
  private updateFormatButtonState(command: string, isActive: boolean): void {
    const button = this.container?.querySelector(`[data-cmd="${command}"]`) as HTMLElement;
    if (button) {
      if (isActive) {
        button.classList.add('active');
        button.style.background = 'rgba(5, 137, 243, 0.1)';
        button.style.color = '#0589f3';
        button.style.boxShadow = '0 0 0 2px rgba(5, 137, 243, 0.2)';
      } else {
        button.classList.remove('active');
        button.style.background = 'transparent';
        button.style.color = '#374151';
        button.style.boxShadow = 'none';
      }
    }
  }

  /**
   * 更新对齐按钮状态
   */
  private updateAlignButtonState(align: string): void {
    // 清除所有对齐按钮的激活状态
    ['justifyLeft', 'justifyCenter', 'justifyRight', 'justifyFull'].forEach(cmd => {
      const button = this.container?.querySelector(`[data-cmd="${cmd}"]`) as HTMLElement;
      if (button) {
        button.classList.remove('active');
        button.style.background = 'transparent';
        button.style.color = '#374151';
        button.style.boxShadow = 'none';
      }
    });

    // 激活当前对齐方式按钮
    let activeAlign = 'justifyLeft'; // 默认左对齐
    switch (align) {
      case 'center':
        activeAlign = 'justifyCenter';
        break;
      case 'right':
        activeAlign = 'justifyRight';
        break;
      case 'justify':
        activeAlign = 'justifyFull';
        break;
    }

    const activeButton = this.container?.querySelector(`[data-cmd="${activeAlign}"]`) as HTMLElement;
    if (activeButton) {
      activeButton.classList.add('active');
      activeButton.style.background = 'rgba(5, 137, 243, 0.1)';
      activeButton.style.color = '#0589f3';
      activeButton.style.boxShadow = '0 0 0 2px rgba(5, 137, 243, 0.2)';
    }
  }

  /**
   * 更新列表按钮状态
   */
  private updateListButtonState(list: string): void {
    // 清除所有列表按钮的激活状态
    ['insertUnorderedList', 'insertOrderedList'].forEach(cmd => {
      const button = this.container?.querySelector(`[data-cmd="${cmd}"]`) as HTMLElement;
      if (button) {
        button.classList.remove('active');
        button.style.background = 'transparent';
        button.style.color = '#374151';
        button.style.boxShadow = 'none';
      }
    });

    // 激活当前列表类型按钮
    if (list) {
      const activeCmd = list === 'bullet' ? 'insertUnorderedList' : 'insertOrderedList';
      const activeButton = this.container?.querySelector(`[data-cmd="${activeCmd}"]`) as HTMLElement;
      if (activeButton) {
        activeButton.classList.add('active');
        activeButton.style.background = 'rgba(5, 137, 243, 0.1)';
        activeButton.style.color = '#0589f3';
        activeButton.style.boxShadow = '0 0 0 2px rgba(5, 137, 243, 0.2)';
      }
    }
  }

  /**
   * 更新字体大小状态
   */
  private updateFontSizeState(size: string): void {
    const button = this.container?.querySelector(`[data-cmd="fontSize"]`) as HTMLElement;
    if (button) {
      if (size) {
        // 显示当前字体大小
        const sizeDisplay = button.querySelector('.size-display') || document.createElement('span');
        sizeDisplay.className = 'size-display';
        sizeDisplay.textContent = size + 'px';
        (sizeDisplay as HTMLElement).style.cssText = `
          position: absolute;
          bottom: -2px;
          right: -2px;
          background: #0589f3;
          color: white;
          font-size: 10px;
          padding: 1px 3px;
          border-radius: 2px;
          line-height: 1;
        `;
        
        if (!button.querySelector('.size-display')) {
          button.appendChild(sizeDisplay);
          button.style.position = 'relative';
        }
        
        button.classList.add('active');
        button.style.background = 'rgba(5, 137, 243, 0.1)';
        button.style.color = '#0589f3';
        button.style.boxShadow = '0 0 0 2px rgba(5, 137, 243, 0.2)';
      } else {
        // 移除字体大小显示
        const sizeDisplay = button.querySelector('.size-display');
        if (sizeDisplay) {
          sizeDisplay.remove();
        }
        
        button.classList.remove('active');
        button.style.background = 'transparent';
        button.style.color = '#374151';
        button.style.boxShadow = 'none';
      }
    }
  }

  /**
   * 更新颜色状态
   */
  private updateColorState(command: string, color: string): void {
    const button = this.container?.querySelector(`[data-cmd="${command}"]`) as HTMLElement;
    if (button) {
      if (color) {
        // 显示当前颜色
        const colorDisplay = button.querySelector('.color-display') || document.createElement('div');
        colorDisplay.className = 'color-display';
        (colorDisplay as HTMLElement).style.cssText = `
          position: absolute;
          bottom: 2px;
          left: 50%;
          transform: translateX(-50%);
          width: 16px;
          height: 3px;
          background-color: ${color};
          border-radius: 1px;
          border: 1px solid rgba(0, 0, 0, 0.1);
        `;
        
        if (!button.querySelector('.color-display')) {
          button.appendChild(colorDisplay);
          button.style.position = 'relative';
        }
        
        button.classList.add('active');
        button.style.background = 'rgba(5, 137, 243, 0.1)';
        button.style.color = '#0589f3';
        button.style.boxShadow = '0 0 0 2px rgba(5, 137, 243, 0.2)';
      } else {
        // 移除颜色显示
        const colorDisplay = button.querySelector('.color-display');
        if (colorDisplay) {
          colorDisplay.remove();
        }
        
        button.classList.remove('active');
        button.style.background = 'transparent';
        button.style.color = '#374151';
        button.style.boxShadow = 'none';
      }
    }
  }

  /**
   * 更新缩进按钮状态
   */
  private updateIndentButtonState(indent: number): void {
    const indentButton = this.container?.querySelector(`[data-cmd="indent"]`) as HTMLElement;
    const outdentButton = this.container?.querySelector(`[data-cmd="outdent"]`) as HTMLElement;
    
    // 根据缩进级别显示状态
    if (indent > 0) {
      // 显示当前缩进级别
      if (indentButton) {
        const indentDisplay = indentButton.querySelector('.indent-display') || document.createElement('span');
        indentDisplay.className = 'indent-display';
        indentDisplay.textContent = indent.toString();
        (indentDisplay as HTMLElement).style.cssText = `
          position: absolute;
          top: -2px;
          right: -2px;
          background: #0589f3;
          color: white;
          font-size: 10px;
          padding: 1px 3px;
          border-radius: 2px;
          line-height: 1;
          min-width: 12px;
          text-align: center;
        `;
        
        if (!indentButton.querySelector('.indent-display')) {
          indentButton.appendChild(indentDisplay);
          indentButton.style.position = 'relative';
        }
      }
      
      // 启用减少缩进按钮
      if (outdentButton) {
        outdentButton.style.opacity = '1';
        outdentButton.style.pointerEvents = 'auto';
      }
    } else {
      // 移除缩进显示
      if (indentButton) {
        const indentDisplay = indentButton.querySelector('.indent-display');
        if (indentDisplay) {
          indentDisplay.remove();
        }
      }
      
      // 禁用减少缩进按钮
      if (outdentButton) {
        outdentButton.style.opacity = '0.5';
        outdentButton.style.pointerEvents = 'none';
      }
    }
  }
}
