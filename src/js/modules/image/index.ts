import { EditorCore } from "@/js/core/index";
import "./image.scss";
import "cropperjs/src/css/cropper.css";
import Cropper from "cropperjs";
/**
 * 图片编辑器类，用于上传和插入图片到富文本中（支持弹窗上传）
 */
export default class ImageModule {
  private editor: EditorCore;
  isResizing = false; // 开始调整时更新状态
  isActive = false;
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
    this.editor.restoreSelection(true);
    const quill = this.editor.quillInstance?.quill;
    if (!quill) return;

    const align = quill.getFormat(quill.getSelection(true).index)?.table
      ? "inline"
      : "inline";
    const blotname = quill.getFormat(quill.getSelection(true).index)?.['table-cell-line']
      ? "custom-inline-image"
      : "custom-image";
    debugger
    quill.insertEmbed(
      quill.getSelection(true).index,
      'custom-inline-image',  // 确保使用正确的 blot 名称
      {
        src,
        align,
      },
      "user"
    );

    // 新增表格插入兼容逻辑
    const [blot] = quill.getLeaf(quill.getSelection(true).index);
    if (blot && blot.domNode?.tagName === "TD") {
      const cell = blot.domNode as HTMLTableCellElement;
      cell.style.verticalAlign = "top"; // 确保表格单元格对齐方式
    }

    this.editor.restoreSelection(true);
    quill.setSelection(quill.getSelection(true).index + 1, 0, "silent");
  }


  /**
   * 关闭弹窗
   */
  private _closeDialog(dialog: HTMLDivElement): void {
    dialog.remove();
  }
}
