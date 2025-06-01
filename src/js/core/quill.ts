import Quill from "quill";
// 引入 quill-better-table 模块
import QuillBetterTable from "../modules/quill-better-table/quill-better-table.js";
// 使用 Quill 官方 CSS
import "../../css/quill.snow.css";
// 引入字体大小 css
import "../../css/quill-styles.css";
// quill-better-table  css
import "../modules/quill-better-table/assets/quill-better-table.scss";
import CustomImageBlot from "../modules/image/block.blot.js";
import CustomInlineImageBlot from "../modules/image/inline.blot.js";

// 注册 quill-better-table 模块
Quill.register(
  {
    "modules/better-table": QuillBetterTable,
  },
  true
);
Quill.register("formats/custom-image", CustomImageBlot);
Quill.register("formats/custom-inline-image", CustomInlineImageBlot);
// 定义Quill模块接口
export class QuillModuleImpl {
  public quill: Quill;
  // 命令映射表：将用户自定义命令映射到 Quill 命令
  private commandMap: Record<string, string> = {
    // 格式相关
    bold: "bold",
    italic: "italic",
    underline: "underline",
    strikeThrough: "strike",
    // 对齐方式
    justifyLeft: "align-left",
    justifyCenter: "align-center",
    justifyRight: "align-right",
    justifyFull: "align-justify",
    // 列表
    insertUnorderedList: "list-bullet",
    insertOrderedList: "list-ordered",
    // 缩进
    indent: "indent-increase",
    outdent: "indent-decrease",
    // 字体大小
    fontSize: "size",
    // 字体颜色
    foreColor: "color",
    // 背景颜色
    hiliteColor: "background",
    // 操作
    undo: "undo",
    redo: "redo",
    // 上标/下标
    subscript: "script-sub",
    superscript: "script-super",
    // 其他格式
    clearFormat: "removeFormat",
  };

  constructor(editor: HTMLElement) {
    let FontSize = Quill.import("formats/size");
    (FontSize as any).whitelist = ["10", "12", "14", "16", "18", "24", "32"];
    Quill.register("formats/size", FontSize, true);
    // 初始化 Quill 编辑器配置
    this.quill = new Quill(editor, {
      theme: "snow",
      modules: {
        toolbar: false,
        "better-table": {
          operationMenu: {
            color: {
              colors: ["red", "green", "yellow", "white"],
            },
          },
        },
        keyboard: {
          bindings: QuillBetterTable.keyboardBindings,
        },
      },

      // 其他配置...
    });

    // 强制清理多余 DOM 结构
    this.cleanupContainer(editor);

    // 添加：设置编辑区域内边距
    const quillEditor = editor.querySelector<HTMLElement>(".ql-editor");
    if (quillEditor) {
      quillEditor.style.padding = "20px";
    }

    // 初始化内容
    this.initialize();
  }

  /**
   * 执行编辑命令
   * @param command - 命令名称（支持用户自定义命名）
   * @param value - 命令参数（如文本内容、链接地址）
   */
  execCommand(command: string, value?: any): void {
    // 优先从映射表转换命令
    const quillCommand = this.commandMap[command] || command;

    // 颜色白名单验证
    if (quillCommand === "color" || quillCommand === "background") {
      const validColors = [
        "#FF0000",
        "#DC143C",
        "#B22222", // 红色系
        "#00FF00",
        "#008000",
        "#228B22", // 绿色系
        "#0000FF",
        "#000080",
        "#4169E1", // 蓝色系
        "#FFFF00",
        "#FFD700",
        "#FFA500", // 黄色系
        "#800080",
        "#8000FF", // 紫色系
        "#FFA500",
        "#FF8C00", // 橙色系
        "#FFC0CB",
        "#FF69B4", // 粉色系
        "#A52A2A",
        "#8B4513", // 棕色系
        "#808080",
        "#C0C0C0",
        "#A9A9A9", // 灰色系
        "#000000", // 黑色
      ];

      if (!validColors.includes(value)) {
        console.warn(`不支持的颜色值：${value}`);
        return;
      }
    }

    switch (quillCommand) {
      case "insertImg":
        const selection = this.quill.getSelection();
        if (selection) {
          this.quill.insertEmbed(
            selection.index,
            "image",
            value,
            Quill.sources.USER
          );
        }
        break;
      case "insertText":
        this.quill.insertText(
          this.quill.getSelection()?.index || 0,
          value as string
        );
        break;
      case "bold":
      case "italic":
      case "underline":
        this.applyFormat(quillCommand, true);
        break;
      case "strike":
      case "blockquote":
      case "code-block":
        this.applyFormat(quillCommand, true);
        break;
      case "size":
      case "color":
      case "background":
        // 修复：使用正确的选区范围应用格式
        const range = this.quill.getSelection();
        if (range) {
          this.quill.formatText(range.index, range.length, quillCommand, value);
        }
        break;
      case "undo":
        this.quill.history.undo();
        break;
      case "redo":
        this.quill.history.redo();
        break;
      case "script-sub":
        this.applyFormat("script", "sub");
        break;
      case "script-super":
        this.applyFormat("script", "super");
        break;
      case "indent-increase":
        this.quill.format("indent", "+1");
        break;
      case "indent-decrease":
        this.quill.format("indent", "-1");
        break;
      case "direction-rtl":
        this.applyFormat("direction", "rtl");
        break;
      case "align-left":
        this.applyFormat("align", "");
        break;
      case "align-center":
        this.applyFormat("align", "center");
        break;
      case "align-right":
        this.applyFormat("align", "right");
        break;
      case "align-justify":
        this.applyFormat("align", "justify");
        break;

      case "list-bullet":
        this.applyFormat("list", "bullet");
        break;
      case "list-ordered":
        this.applyFormat("list", "ordered");
        break;

      default:
        console.warn(`Unknown command: ${quillCommand}`);
    }
  }

  /**
   * 应用文本格式
   * @param format - 格式类型
   * @param value - 格式值
   */
  private applyFormat(format: string, value: any): void {
    const selection = this.quill.getSelection();
    if (selection && selection.length > 0) {
      // 文本格式处理
      if (["bold", "italic", "underline", "strike"].includes(format)) {
        // 如果是文本格式（如粗体、斜体），直接应用
        // 检查当前选区是否已有该格式
        const formatValue = this.quill.getFormat(
          selection.index,
          selection.length
        )[format];
        // 如果已有该格式，则移除；否则应用新值
        this.quill.formatText(
          selection.index,
          selection.length,
          format,
          formatValue ? false : value
        );
      }
      // 多段落格式处理
      else if (
        ["align", "list", "size", "color", "background", "script"].includes(
          format
        )
      ) {
        const [line, offset] = this.quill.getLine(selection.index);
        let currentIndex = selection.index - offset;

        while (currentIndex < selection.index + selection.length) {
          const [currentLine, currentOffset] = this.quill.getLine(currentIndex);
          if (currentLine) {
            const lineLength = currentLine.length();

            // 对字体大小进行格式验证
            if (
              format === "size" &&
              typeof value === "string" &&
              value.endsWith("px")
            ) {
              // 修正：移除 px 后缀并按 Quill 格式要求处理
              const fontSizeValue = value.replace("px", "");
              this.quill.formatText(
                currentIndex - currentOffset,
                lineLength,
                format,
                fontSizeValue
              );
            } else {
              // 其他格式保持原处理方式
              this.quill.formatText(
                currentIndex - currentOffset,
                lineLength,
                format,
                value
              );
            }
          }
          currentIndex += currentLine ? currentLine.length() : 1;
        }
      }
      // 其他格式直接应用
      else {
        this.quill.formatText(selection.index, selection.length, format, value);
      }
    }
  }

  /**
   * 初始化编辑器内容
   */
  private initialize(): void {
    // 使用 Quill API 设置初始内容
    this.quill.setContents([]);
  }
  /**
   * 强制清理多余 DOM 结构
   * @param editor - 编辑器容器元素
   */
  private cleanupContainer(editor: HTMLElement): void {
    const quillToolbar = editor.querySelector(".quill-toolbar");
    if (quillToolbar && quillToolbar.parentNode) {
      quillToolbar.parentNode.removeChild(quillToolbar);
    }
  }
}
