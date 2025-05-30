import { EditorCore } from "@/js/core/index";
import "./image.scss";
import "cropperjs/src/css/cropper.css";
import ContextMenu from "../../utils/ContextMenu";

import Cropper from "cropperjs";
import { BlockEmbed } from "quill/blots/block";
/**
 * 图片编辑器类，用于上传和插入图片到富文本中（支持弹窗上传）
 */
export default class ImageModule {
  private editor: EditorCore;
  private imageMenus = new Map<HTMLImageElement, ContextMenu>();
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
    // 修改插入逻辑，在表格中插入时使用行内格式
    const align = quill.getFormat(quill.getSelection(true).index)?.table ? "inline" : "inline";

    quill.insertEmbed(
      quill.getSelection(true).index,
      "custom-image",
      {
        src,
        align,
      },
      "user"
    );
    debugger;
    // 新增表格插入兼容逻辑
    const [blot] = quill.getLeaf(quill.getSelection(true).index);
    if (blot && blot.domNode?.tagName === "TD") {
      const cell = blot.domNode as HTMLTableCellElement;
      cell.style.verticalAlign = "top"; // 确保表格单元格对齐方式
    }

    // 新增：获取插入的blot节点并绑定事件
    const [blot2] = quill.getLeaf(quill.getSelection(true).index);
    const img = blot2.domNode.querySelector("img");
    if (img) {
      this.bindImageEvents(img);
    }

    quill.setSelection(quill.getSelection(true).index + 1, 0, "silent");
  }

  /**
   * 为单个图片绑定事件
   */
  private bindImageEvents(img: HTMLImageElement): void {
    const blotContainer = img.closest(".ql-custom-image");
    debugger;
    if (!blotContainer) return;

    // 创建尺寸调整句柄
    const createHandle = (position: string) => {
      const handle = document.createElement("div");
      handle.className = "resize-handle";
      handle.dataset.position = position;
      handle.style.position = "absolute";
      blotContainer.appendChild(handle);

      // 绑定鼠标事件（新增事件绑定）
      handle.addEventListener("mousedown", (e) => {
        e.preventDefault();
        this.startResize(blotContainer, position);
      });
    };

    // 初始化四个方向的调整句柄（新增句柄创建逻辑）
    ["top-left", "top-right", "bottom-left", "bottom-right"].forEach((pos) => {
      createHandle(pos);
    });

    // 修复右键菜单绑定到 blot 容器
    blotContainer.addEventListener("contextmenu", (e: MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();
      this.showImageContextMenu(img, e);
    });

    // 动态计算句柄尺寸并重新定位
    const updateHandlePosition = () => {
      const handles =
        blotContainer.querySelectorAll<HTMLElement>(".resize-handle");
      handles.forEach((handle) => {
        const position = handle.dataset.position!;
        const offset = 6; // 根据图片尺寸动态调整偏移量
        handle.style.width = handle.style.height = `${Math.max(
          6,
          img.offsetWidth * 0.05
        )}px`;

        switch (position) {
          case "top-left":
            handle.style.left = `${-offset}px`;
            handle.style.top = `${-offset}px`;
            break;
          case "top-right":
            handle.style.right = `${-offset}px`;
            handle.style.top = `${-offset}px`;
            break;
          case "bottom-left":
            handle.style.left = `${-offset}px`;
            handle.style.bottom = `${-offset}px`;
            break;
          case "bottom-right":
            handle.style.right = `${-offset}px`;
            handle.style.bottom = `${-offset}px`;
        }
      });
    };

    // 初始化及尺寸变化时更新句柄
    new ResizeObserver(updateHandlePosition).observe(img);
    updateHandlePosition();
  }

  private startResize(container: HTMLElement, position: string) {
    const img = container.querySelector("img")!;
    const containerStartWidth = container.offsetWidth; // 改为使用容器初始尺寸
    const containerStartHeight = container.offsetHeight;
    const startX = event.clientX;
    const startY = event.clientY;

    // 新增尺寸限制
    const minSize = 50;

    const doResize = (e: MouseEvent) => {
      const deltaX = e.clientX - startX;
      const deltaY = e.clientY - startY;

      // 根据拖动方向计算新尺寸
      let newWidth = containerStartWidth;
      let newHeight = containerStartHeight;

      switch (position) {
        case "top-right":
          newWidth = Math.max(minSize, containerStartWidth + deltaX);
          newHeight = Math.max(minSize, containerStartHeight - deltaY);
          break;
        case "bottom-left":
          newWidth = Math.max(minSize, containerStartWidth - deltaX);
          newHeight = Math.max(minSize, containerStartHeight + deltaY);
          break;
        case "bottom-right":
          newWidth = Math.max(minSize, containerStartWidth + deltaX);
          newHeight = Math.max(minSize, containerStartHeight + deltaY);
          break;
        default: // top-left
          newWidth = Math.max(minSize, containerStartWidth - deltaX);
          newHeight = Math.max(minSize, containerStartHeight - deltaY);
      }

      // 同步更新容器尺寸
      container.style.width = `${newWidth}px`;
      container.style.height = `${newHeight}px`;
      // 同步更新图片尺寸
      img.style.width = "100%";
      img.style.height = "100%";
    };

    const stopResize = () => {
      document.removeEventListener("mousemove", doResize);
      document.removeEventListener("mouseup", stopResize);
    };

    document.addEventListener("mousemove", doResize);
    document.addEventListener("mouseup", stopResize);
  }

  /**
   * 关闭弹窗
   */
  private _closeDialog(dialog: HTMLDivElement): void {
    dialog.remove();
  }

  /**
   * 创建右键弹框
   * @param img
   * @param event
   * @returns
   */
  private showImageContextMenu(img: HTMLImageElement, event: MouseEvent): void {
    const container = img.closest(".ql-custom-image");
    const menuItems = [
      {
        label: "左对齐",
        handler: () => {
          // 修改：操作容器类名
          container.classList.remove(
            "image-align-center",
            "image-align-right",
            "image-align-inline"
          );
          container.classList.add("image-align-left");
        },
      },
      {
        label: "居中",
        handler: () => {
          container.classList.remove(
            "image-align-left",
            "image-align-right",
            "image-align-inline"
          );
          container.classList.add("image-align-center");
        },
      },
      {
        label: "右对齐",
        handler: () => {
          container.classList.remove(
            "image-align-left",
            "image-align-center",
            "image-align-inline"
          );
          container.classList.add("image-align-right");
        },
      },
      {
        label: "文字基线对齐",
        handler: () => {
          container.classList.remove(
            "image-align-left",
            "image-align-center",
            "image-align-right"
          );
          container.classList.add("image-align-inline");
        },
      },
      {
        label: "删除图片",
        handler: () => {
          container.remove();
        },
      },
    ];
    // 全局隐藏所有已存在的上下文菜单
    this.imageMenus.forEach((menu) => {
      if (menu) {
        menu.hide();
      }
    });

    let contextMenu = this.imageMenus.get(img);
    if (contextMenu) {
      contextMenu.show(event.clientX, event.clientY); // 如果已存在菜单，直接复用并显示
      return;
    }
    contextMenu = new ContextMenu(menuItems);
    contextMenu.show(event.clientX, event.clientY);

    // 修改菜单绑定逻辑
    // const contextMenu = new ContextMenu(menuItems);
    contextMenu.show(event.clientX, event.clientY);

    // 绑定关闭事件到当前图片
    const closeMenu = () => {
      contextMenu.hide();
      img.removeEventListener("click", closeMenu);
    };
    img.addEventListener("click", closeMenu);
  }
}
