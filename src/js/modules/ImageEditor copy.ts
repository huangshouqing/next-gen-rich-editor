import EditorCore from "@/js/core/EditorCore";
import "@/css/image.css";

/**
 * 图片编辑器类，用于上传和插入图片到富文本中（支持弹窗上传）
 */
export default class ImageEditor {
  private editor: EditorCore;

  constructor(editor: EditorCore) {
    this.editor = editor;
  }

  /**
   * 打开图片插入弹窗
   */
  public openDialog(): void {
    const dialog = document.createElement("div");
    dialog.className = "editor-dialog image-editor-dialog";
    dialog.innerHTML = `
      <div class="dialog-header">
        <h4>插入图片</h4>
        <button class="close-btn">×</button>
      </div>
      <div class="dialog-body">
        <div class="left-panel">
          <label>图片地址：</label>
          <input type="text" class="url-input" placeholder="https://example.com/image.png" />
          <div class="upload-area">
            或拖放文件至此处，<span class="browse">点击上传</span>
            <input type="file" accept="image/*" class="file-input" />
          </div>
        </div>
        <div class="right-panel">
          <img src="" alt="预览" class="preview" style="display:none;" />
        </div>
      </div>
      <div class="dialog-footer">
        <button class="insert-btn">插入</button>
      </div>
    `;

    document.body.appendChild(dialog);

    const insertBtn = dialog.querySelector(".insert-btn") as HTMLButtonElement;
    this._setupEvents(dialog, insertBtn); // 传入 insertBtn
    this._setupDragDrop(dialog);
  }

  /**
   * 绑定事件：关闭、插入
   */
  private _setupEvents(
    dialog: HTMLDivElement,
    insertBtn: HTMLButtonElement
  ): void {
    const closeBtn = dialog.querySelector(".close-btn") as HTMLElement;
    const urlInput = dialog.querySelector(".url-input") as HTMLInputElement;
    closeBtn.addEventListener("click", () => this._closeDialog(dialog));
    insertBtn.addEventListener("click", () => {
      const url = urlInput.value.trim();
      // 优先使用手动输入的 URL
      if (url) {
        this.insertImage(url);
        this._closeDialog(dialog);
        return;
      }
      // 否则使用 base64 图片地址（由 handleFile 设置）
      const previewImg = dialog.querySelector(".preview") as HTMLImageElement;
      const currentSrc = previewImg.src;
      if (currentSrc && !currentSrc.startsWith("data:image")) {
        alert("无效的图片地址");
        return;
      }
      if (currentSrc) {
        debugger
        this.insertImage(currentSrc);
        this._closeDialog(dialog);
      }
    });
  }

  /**
   * 设置拖拽上传行为
   */
  private _setupDragDrop(
    dialog: HTMLDivElement,
  ): void {
    const uploadArea = dialog.querySelector(".upload-area") as HTMLDivElement;
    const fileInput = dialog.querySelector(".file-input") as HTMLInputElement;
    const previewImg = dialog.querySelector(".preview") as HTMLImageElement;
    // 点击触发隐藏的 input
    uploadArea.querySelector(".browse")?.addEventListener("click", () => {
      fileInput.click();
    });
    // 处理文件选择/拖拽
    const handleFile = (file: File) => {
      const reader = new FileReader();
      reader.onload = () => {
        const result = reader.result as string;
        // 设置预览图
        previewImg.src = result;
        previewImg.style.display = "block";
      };
      reader.onerror = () => {
        alert("文件读取失败");
      };
      reader.readAsDataURL(file);
    };

    // 拖拽上传
    uploadArea.addEventListener("dragover", (e) => {
      e.preventDefault();
      uploadArea.classList.add("dragover");
    });

    uploadArea.addEventListener("dragleave", () => {
      uploadArea.classList.remove("dragover");
    });

    uploadArea.addEventListener("drop", (e) => {
      e.preventDefault();
      uploadArea.classList.remove("dragover");

      if (e.dataTransfer && e.dataTransfer.files.length > 0) {
        handleFile(e.dataTransfer.files[0]);
      }
    });

    // 点击上传
    fileInput.addEventListener("change", () => {
      if (fileInput.files && fileInput.files.length > 0) {
        handleFile(fileInput.files[0]);
      }
    });
  }

  /**
   * 插入图片到编辑器内容中
   */
  private insertImage(src: string): void {
    const img = document.createElement("img");
    img.src = src;
    img.classList.add("editable-image");
    // 获取当前编辑区域
    const editorContent = this.editor.container?.querySelector(".editor-content");
    if (editorContent) {
      // 确保编辑区域有焦点
      editorContent.focus();
      // 创建 Range 并插入图片
      const selection = window.getSelection();
      const range = selection?.getRangeAt(0);
  
      if (range) {
        range.deleteContents(); // 清除选区内容
        range.insertNode(img);  // 插入图片
      } else {
        editorContent.appendChild(img); // 默认追加到最后
      }
    } else {
      console.error("无法找到 .editor-content 元素");
    }
  }

  /**
   * 关闭弹窗
   */
  private _closeDialog(dialog: HTMLDivElement): void {
    dialog.remove();
  }
}
