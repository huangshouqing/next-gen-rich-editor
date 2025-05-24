import EditorCore from "@/js/core/EditorCore";
import "@/css/image.css";
import "cropperjs/src/css/cropper.css";

import Cropper from "cropperjs";
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
        <span>插入图片</span>
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
        this.insertImage(currentSrc);
        this._closeDialog(dialog);
      }
    });
  }

  /**
   * 设置拖拽上传行为
   */
  private _setupDragDrop(dialog: HTMLDivElement): void {
    // 保存选区
    this.editor.saveSelection();
    debugger;
    const uploadArea = dialog.querySelector(".upload-area") as HTMLDivElement;
    const fileInput = dialog.querySelector(".file-input") as HTMLInputElement;
    const previewImg = dialog.querySelector(".preview") as HTMLImageElement;
    // 点击触发隐藏的 input
    uploadArea.querySelector(".browse")?.addEventListener("click", (e) => {
      e.preventDefault();
      fileInput.click();
    });
    // 修改后的 handleFile 方法（支持 Promise）
    const handleFile = (file: File): Promise<void> => {
      return new Promise((resolve, reject) => {
        const reader = new FileReader();

        reader.onload = () => {
          const result = reader.result as string;
          previewImg.src = result;
          previewImg.style.display = "block";
          this.showCropDialog(result);
          resolve(); // 读取成功时解析
        };

        reader.onerror = () => {
          alert("文件读取失败");
          reject(reader.error); // 读取失败时拒绝
        };

        reader.readAsDataURL(file);
      });
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
    fileInput.addEventListener("change", async (e) => {
      e.preventDefault();
      if (fileInput.files?.length) {
        try {
          await handleFile(fileInput.files[0]);
        } catch (error) {
          console.error("文件处理失败:", error);
        }
      }
    });
  }
  showCropDialog = (src: string) => {
    const cropDialog = document.createElement("div");
    cropDialog.className = "editor-dialog image-crop-dialog";
    cropDialog.innerHTML = `
      <div class="dialog-header">
        <span>裁剪图片</span>
        <button class="close-btn">×</button>
      </div>
      <div class="dialog-body">
        <img src="${src}" id="crop-image" />
      </div>
      <div class="dialog-footer">
        <button class="insert-btn">确认裁剪并插入</button>
      </div>
    `;
    document.body.appendChild(cropDialog);
    const imgElement = cropDialog.querySelector(
      "#crop-image"
    ) as HTMLImageElement;
    const closeBtn = cropDialog.querySelector(".close-btn") as HTMLElement;
    const insertBtn = cropDialog.querySelector(
      ".insert-btn"
    ) as HTMLButtonElement;

    let cropper: Cropper;

    imgElement.onload = () => {
      cropper = new Cropper(imgElement, {
        cropBoxMovable: true, // 允许移动裁剪框
        aspectRatio: 16 / 9,
        viewMode: 1,
        dragMode: "move",
        zoomable: true,
        scalable: true,
        movable: true,
      });
    };
    insertBtn.addEventListener("click", () => {
      const croppedCanvas = cropper.getCroppedCanvas()?.toDataURL("image/png");
      if (!croppedCanvas) return;

      // 获取主弹窗中的预览图容器
      const mainDialog = document.querySelector(
        ".image-editor-dialog"
      ) as HTMLDivElement;
      if (!mainDialog) {
        console.warn("主弹窗不存在");
        return;
      }

      const previewImg = mainDialog.querySelector(
        ".preview"
      ) as HTMLImageElement;
      previewImg.src = croppedCanvas;
      previewImg.style.display = "block";
      cropDialog.remove(); // 关闭裁剪弹窗
    });

    closeBtn.addEventListener("click", () => {
      cropDialog.remove();
    });
  };
  /**
   * 插入图片到编辑器内容中
   */
  private insertImage(src: string): void {
    // 恢复选区
    this.editor.restoreSelection(true)
    const img = document.createElement("img");
    img.src = src;
    img.classList.add("editable-image");
    img.setAttribute("contenteditable", "false");
    img.style.maxWidth = "100%";
    img.style.height = "auto";
    const editorContent =
      this.editor.container?.querySelector(".editor-content");
    if (!editorContent) {
      console.error("无法找到 .editor-content 元素");
      return;
    }
    // 确保编辑区域有焦点
    editorContent.focus();
    // 获取当前选区
    const selection = window.getSelection();
    debugger;
    const range = selection?.getRangeAt(0);
    // 判断是否在表格单元格中
    const parentCell = range?.startContainer.parentElement?.closest("td, th");
    if (parentCell) {
      debugger;
      // 插入到单元格中
      parentCell.appendChild(img);
    } else if (range) {
      // 原有插入逻辑
      range.deleteContents();
      range.insertNode(img);
    } else {
      editorContent.appendChild(img);
    }

    // 插入后恢复焦点
    setTimeout(() => {
      const editorContent =
        this.editor.container?.querySelector(".editor-content");
      if (editorContent) {
        editorContent.focus();
      }
    }, 0);
  }
  /**
   * 初始化图片点击事件监听
   */
  public init() {
    const editorContent =
      this.editor.container?.querySelector(".editor-content");
    if (editorContent) {
      this.initImageEvents(editorContent);
    } else {
      console.warn("编辑器内容区域未找到，无法初始化图片事件");
    }
  }
  private initImageEvents(editorContent: Element): void {
    editorContent.addEventListener("click", (e) => {
      const target = e.target as HTMLElement;
      if (target.tagName === "IMG") {
        this.showImageToolbar(target);
      }
    });
  }
  private showImageToolbar(img: HTMLImageElement): void {
    const toolbar = document.createElement("div");
    toolbar.className = "image-toolbar";
    toolbar.innerHTML = `
    <button class="align-btn" data-align="left" title="左对齐">
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <line x1="3" y1="7" x2="21" y2="7"></line>
        <line x1="3" y1="12" x2="15" y2="12"></line>
        <line x1="3" y1="17" x2="21" y2="17"></line>
      </svg>
    </button>
  
    <button class="align-btn" data-align="center" title="居中">
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <line x1="3" y1="7" x2="21" y2="7"></line>
        <line x1="5" y1="12" x2="19" y2="12"></line>
        <line x1="3" y1="17" x2="21" y2="17"></line>
      </svg>
    </button>
  
    <button class="align-btn" data-align="right" title="右对齐">
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <line x1="3" y1="7" x2="21" y2="7"></line>
        <line x1="9" y1="12" x2="21" y2="12"></line>
        <line x1="5" y1="17" x2="21" y2="17"></line>
      </svg>
    </button>
  
    <button class="delete-btn" title="删除">
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <polyline points="3 6 5 6 21 6"></polyline>
        <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
        <line x1="9" y1="12" x2="9" y2="18"></line>
        <line x1="15" y1="12" x2="15" y2="18"></line>
      </svg>
    </button>
  `;

    // 设置位置
    const rect = img.getBoundingClientRect();
    toolbar.style.position = "absolute";
    toolbar.style.top = `${rect.bottom + window.scrollY}px`;
    toolbar.style.left = `${rect.left + window.scrollX}px`;
    toolbar.style.zIndex = "9999";
    toolbar.style.background = "#fff";
    toolbar.style.border = "1px solid #ccc";
    toolbar.style.padding = "4px";
    toolbar.style.borderRadius = "4px";

    document.body.appendChild(toolbar);

    // 对齐事件绑定
    toolbar.querySelectorAll(".align-btn").forEach((btn) => {
      btn.addEventListener("click", () => {
        const align = btn.getAttribute("data-align");
        switch (align) {
          case "left":
            img.style.float = "left";
            img.style.marginRight = "10px";
            break;
          case "center":
            img.style.display = "block";
            img.style.margin = "10px auto";
            break;
          case "right":
            img.style.float = "right";
            img.style.marginLeft = "10px";
            break;
        }
        toolbar.remove();
      });
    });

    // 删除按钮
    toolbar.querySelector(".delete-btn")?.addEventListener("click", () => {
      img.remove();
      toolbar.remove();
    });
    // 可选：点击页面其他地方关闭工具栏
    const handleClickOutside = (e: MouseEvent) => {
      if (!toolbar.contains(e.target as Node)) {
        toolbar.remove();
        document.removeEventListener("mousedown", handleClickOutside);
      }
    };
    setTimeout(() => {
      document.addEventListener("mousedown", handleClickOutside);
    }, 0);
  }
  /**
   * 关闭弹窗
   */
  private _closeDialog(dialog: HTMLDivElement): void {
    dialog.remove();
  }
}
