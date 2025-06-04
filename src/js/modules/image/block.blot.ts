import { BlockEmbed } from "quill-next/dist/blots/block";
import ContextMenu from "../../utils/ContextMenu";

export default class CustomImageBlot extends BlockEmbed {
  static blotName = "custom-image";
  static tagName = "div";
  static className = "ql-custom-image";
  static imageMenus = new Map<HTMLImageElement, ContextMenu>();

  private static currentRotation = 0;
  private static isFlippedHorizontal = false;
  private static isFlippedVertical = false;
  private static isResizing = false;
  private static isActive = false;

  static create(value: { src: string; align: string; rotation?: number; flipH?: boolean; flipV?: boolean }) {
    const node = super.create() as HTMLDivElement;
    node.classList.add("image-container", `image-align-${value.align}`);
    node.contentEditable = 'false';

    // 设置初始旋转和翻转状态
    if (typeof value.rotation === 'number') {
      this.currentRotation = value.rotation;
      node.dataset.rotation = value.rotation.toString();
    } else {
      this.currentRotation = 0;
      node.dataset.rotation = "0";
    }

    if (value.flipH) {
      this.isFlippedHorizontal = true;
      node.classList.add("flip-horizontal");
    }
    if (value.flipV) {
      this.isFlippedVertical = true;
      node.classList.add("flip-vertical");
    }

    const img = document.createElement("img");
    img.className = "image-content";
    img.src = value.src;

    // 创建工具栏
    const toolbar = document.createElement("div");
    toolbar.className = "image-toolbar";
    toolbar.innerHTML = `
      <button class="rotate-left" title="向左旋转90°">
        <svg viewBox="0 0 24 24"><path fill="currentColor" d="M12,4V1L8,5L12,9V6C15.31,6 18,8.69 18,12C18,13.01 17.75,13.97 17.3,14.8L18.76,16.26C19.54,15.03 20,13.57 20,12C20,7.58 16.42,4 12,4M12,18C8.69,18 6,15.31 6,12C6,10.99 6.25,10.03 6.7,9.2L5.24,7.74C4.46,8.97 4,10.43 4,12C4,16.42 7.58,20 12,20V23L16,19L12,15V18Z"/></svg>
      </button>
      <button class="rotate-right" title="向右旋转90°">
        <svg viewBox="0 0 24 24"><path fill="currentColor" d="M12,4V1L8,5L12,9V6C15.31,6 18,8.69 18,12C18,13.01 17.75,13.97 17.3,14.8L18.76,16.26C19.54,15.03 20,13.57 20,12C20,7.58 16.42,4 12,4M12,18C8.69,18 6,15.31 6,12C6,10.99 6.25,10.03 6.7,9.2L5.24,7.74C4.46,8.97 4,10.43 4,12C4,16.42 7.58,20 12,20V23L16,19L12,15V18Z" transform="scale(-1, 1) translate(-24, 0)"/></svg>
      </button>
      <button class="flip-h" title="水平翻转">
        <svg viewBox="0 0 24 24"><path fill="currentColor" d="M15,21H17V19H15M19,9H21V7H19M3,5H21V3H3M19,13H21V11H19M19,21H21V19H19M19,17H21V15H19M15,13H17V11H15M15,5H17V3H15M15,17H17V15H15M3,21H13V19H3M3,13H13V11H3M3,17H13V15H3M3,9H13V7H3Z"/></svg>
      </button>
      <button class="flip-v" title="垂直翻转">
        <svg viewBox="0 0 24 24"><path fill="currentColor" d="M15,21H17V19H15M19,9H21V7H19M3,5H21V3H3M19,13H21V11H19M19,21H21V19H19M19,17H21V15H19M15,13H17V11H15M15,5H17V3H15M15,17H17V15H15M3,21H13V19H3M3,13H13V11H3M3,17H13V15H3M3,9H13V7H3Z" transform="rotate(90) translate(0, -24)"/></svg>
      </button>
    `;

    // 创建旋转指示器
    const rotationIndicator = document.createElement("div");
    rotationIndicator.className = "rotation-indicator";
    rotationIndicator.style.display = "none";

    node.appendChild(toolbar);
    node.appendChild(img);
    node.appendChild(rotationIndicator);

    // 图片加载完成后的处理
    img.onload = () => {
      node.style.width = img.naturalWidth + "px";
      node.style.height = img.naturalHeight + "px";
      img.style.width = "100%";
      img.style.height = "100%";
      this.bindImageEvents(node, img);
    };

    this.createResizeHandles(node);
    return node;
  }

  private static createResizeHandles(container: HTMLElement) {
    ["top-left", "top-right", "bottom-left", "bottom-right"].forEach((pos) => {
      const handle = document.createElement("div");
      handle.className = "resize-handle";
      handle.dataset.position = pos;
      container.appendChild(handle);
    });
  }

  private static updateToolbarPosition(container: HTMLElement) {
    const toolbar = container.querySelector('.image-toolbar') as HTMLElement;
    if (!toolbar) return;

    // 获取容器相对于视口的位置
    const containerRect = container.getBoundingClientRect();
    const toolbarRect = toolbar.getBoundingClientRect();

    // 检查顶部空间是否足够
    const topSpace = containerRect.top;
    if (topSpace < 50) { // 如果顶部空间不足50px
      toolbar.classList.add('show-bottom');
    } else {
      toolbar.classList.remove('show-bottom');
    }
  }

  private static updateHandlePositionsWithRotation(container: HTMLElement) {
    const handles = container.querySelectorAll<HTMLElement>(".resize-handle");
    const rotation = parseInt(container.dataset.rotation || "0");
    const rect = container.getBoundingClientRect();
    const offset = 6; // 句柄偏移量

    handles.forEach(handle => {
      const position = handle.dataset.position!;
      
      // 基础位置
      let baseX = 0;
      let baseY = 0;
      
      // 根据位置设置基础坐标
      switch (position) {
        case "top-left":
          baseX = -offset;
          baseY = -offset;
          break;
        case "top-right":
          baseX = rect.width + offset;
          baseY = -offset;
          break;
        case "bottom-left":
          baseX = -offset;
          baseY = rect.height + offset;
          break;
        case "bottom-right":
          baseX = rect.width + offset;
          baseY = rect.height + offset;
          break;
      }

      // 计算旋转后的位置
      const angle = (rotation * Math.PI) / 180;
      const centerX = rect.width / 2;
      const centerY = rect.height / 2;
      
      // 相对于中心点的坐标
      const relativeX = baseX - centerX;
      const relativeY = baseY - centerY;
      
      // 应用旋转变换
      const rotatedX = relativeX * Math.cos(angle) - relativeY * Math.sin(angle) + centerX;
      const rotatedY = relativeX * Math.sin(angle) + relativeY * Math.cos(angle) + centerY;

      // 设置句柄位置
      handle.style.transform = `translate(${rotatedX}px, ${rotatedY}px)`;
      
      // 更新光标样式
      const cursorRotation = (rotation + 45) % 360; // 调整45度以对齐光标方向
      handle.style.cursor = `${this.getCursorStyle(position, cursorRotation)} !important`;
    });
  }

  private static getCursorStyle(position: string, rotation: number): string {
    const cursorTypes = ['nw-resize', 'n-resize', 'ne-resize', 'e-resize', 
                        'se-resize', 's-resize', 'sw-resize', 'w-resize'];
    const baseIndex = {
      'top-left': 0,
      'top-right': 2,
      'bottom-right': 4,
      'bottom-left': 6
    }[position] || 0;
    
    const rotationStep = Math.round(rotation / 45) % 8;
    return cursorTypes[(baseIndex + rotationStep) % 8];
  }

  private static bindImageEvents(blotContainer: HTMLElement, img: HTMLImageElement) {
    const minSize = 50;

    // 鼠标进入/离开事件
    blotContainer.addEventListener("mouseenter", () => {
      this.isActive = true;
      blotContainer.classList.add("active-resize");
    });

    blotContainer.addEventListener("mouseleave", () => {
      if (!this.isResizing) {
        this.isActive = false;
        blotContainer.classList.remove("active-resize");
      }
    });

    // 调整句柄事件绑定
    const handleMouseDown = (e: Event) => {
      e.preventDefault();
      this.isResizing = true;
      this.startResize(
        blotContainer,
        (e.currentTarget as HTMLElement).dataset.position!,
        minSize
      );
    };

    blotContainer.querySelectorAll(".resize-handle").forEach((handle) => {
      handle.addEventListener("mousedown", handleMouseDown);
    });

    // 工具栏按钮事件
    const toolbar = blotContainer.querySelector(".image-toolbar");
    if (toolbar) {
      const rotationIndicator = blotContainer.querySelector(".rotation-indicator") as HTMLElement;
      
      // 左旋转
      toolbar.querySelector(".rotate-left")?.addEventListener("click", (e) => {
        e.stopPropagation();
        this.currentRotation = ((this.currentRotation - 90) % 360 + 360) % 360;
        blotContainer.dataset.rotation = this.currentRotation.toString();
        this.showRotationFeedback(rotationIndicator, this.currentRotation);
      });

      // 右旋转
      toolbar.querySelector(".rotate-right")?.addEventListener("click", (e) => {
        e.stopPropagation();
        this.currentRotation = (this.currentRotation + 90) % 360;
        blotContainer.dataset.rotation = this.currentRotation.toString();
        this.showRotationFeedback(rotationIndicator, this.currentRotation);
      });

      // 水平翻转
      toolbar.querySelector(".flip-h")?.addEventListener("click", (e) => {
        e.stopPropagation();
        this.isFlippedHorizontal = !this.isFlippedHorizontal;
        blotContainer.classList.toggle("flip-horizontal");
        if (this.isFlippedHorizontal && this.isFlippedVertical) {
          blotContainer.classList.add("flip-both");
        } else {
          blotContainer.classList.remove("flip-both");
        }
      });

      // 垂直翻转
      toolbar.querySelector(".flip-v")?.addEventListener("click", (e) => {
        e.stopPropagation();
        this.isFlippedVertical = !this.isFlippedVertical;
        blotContainer.classList.toggle("flip-vertical");
        if (this.isFlippedHorizontal && this.isFlippedVertical) {
          blotContainer.classList.add("flip-both");
        } else {
          blotContainer.classList.remove("flip-both");
        }
      });
    }

    // 右键菜单
    const contextMenuHandler = (e: MouseEvent) => {
      e.preventDefault();
      this.showImageContextMenu(img, e);
    };
    blotContainer.addEventListener("contextmenu", contextMenuHandler);

    // 清理事件
    const observer = new MutationObserver(() => {
      if (!document.contains(img)) {
        observer.disconnect();
        blotContainer.removeEventListener("contextmenu", contextMenuHandler);
        blotContainer.querySelectorAll(".resize-handle").forEach((handle) => {
          handle.removeEventListener("mousedown", handleMouseDown);
        });
      }
    });
    observer.observe(blotContainer, { childList: true, subtree: true });
  }

  private static showRotationFeedback(indicator: HTMLElement, rotation: number) {
    if (!indicator) return;
    
    indicator.textContent = `${rotation}°`;
    indicator.style.display = "block";
    indicator.style.opacity = "1";
    
    setTimeout(() => {
      indicator.style.opacity = "0";
      setTimeout(() => {
        indicator.style.display = "none";
      }, 200);
    }, 1000);
  }

  private static startResize(
    container: HTMLElement,
    position: string,
    minSize: number
  ) {
    const img = container.querySelector("img")!;
    const containerStartWidth = container.offsetWidth;
    const containerStartHeight = container.offsetHeight;
    const startX = (event as MouseEvent).clientX;
    const startY = (event as MouseEvent).clientY;

    // 新增：获取原始宽高比
    const naturalWidth = img.naturalWidth;
    const naturalHeight = img.naturalHeight;
    const aspectRatio = naturalWidth / naturalHeight;

    const doResize = (e: MouseEvent) => {
      const deltaX = e.clientX - startX;
      const deltaY = e.clientY - startY;

      let newWidth = containerStartWidth;
      let newHeight = containerStartHeight;

      switch (position) {
        case "top-right":
          newWidth = Math.max(minSize, containerStartWidth + deltaX);
          newHeight = newWidth / aspectRatio; // 按比例计算高度
          break;
        case "bottom-left":
          newHeight = Math.max(minSize, containerStartHeight + deltaY);
          newWidth = newHeight * aspectRatio; // 按比例计算宽度
          break;
        case "bottom-right":
          // 同时计算两个方向的差值，取较大值保持比例
          const widthDelta = containerStartWidth + deltaX;
          const heightDelta = containerStartHeight + deltaY;
          const ratioDelta = Math.max(widthDelta / naturalWidth, heightDelta / naturalHeight);
          newWidth = naturalWidth * ratioDelta;
          newHeight = naturalHeight * ratioDelta;
          break;
        default: // top-left
          newWidth = Math.max(minSize, containerStartWidth - deltaX);
          newHeight = newWidth / aspectRatio; // 按比例计算高度
      }

      // 确保最终尺寸不小于最小值
      newWidth = Math.max(minSize, newWidth);
      newHeight = Math.max(minSize, newHeight);

      container.style.width = `${newWidth}px`;
      container.style.height = `${newHeight}px`;
      img.style.width = "100%";
      img.style.height = "100%";
    };

    const stopResize = () => {
      this.isResizing = false;
      if (!this.isActive) {
        container.classList.remove("active-resize");
      }
      document.removeEventListener("mousemove", doResize);
      document.removeEventListener("mouseup", stopResize);
      
      // 新增失焦执行逻辑
      requestAnimationFrame(() => {
        const currentWidth = parseInt(container.style.width);
        const currentHeight = parseInt(container.style.height);
        if (!isNaN(currentWidth) && !isNaN(currentHeight)) {
          // 触发尺寸更新事件
          container.dispatchEvent(new CustomEvent('image-resized', {
            detail: { width: currentWidth, height: currentHeight }
          }));
        }
      });
    };

    document.addEventListener("mousemove", doResize);
    document.addEventListener("mouseup", stopResize);
  }

  private static showImageContextMenu(img: HTMLImageElement, event: MouseEvent): void {
    const container = img.closest(".ql-custom-image") as HTMLElement;
    const menuItems = [
      {
        label: "左对齐",
        handler: () => {
          container.classList.remove("image-align-center", "image-align-right", "image-align-inline");
          container.classList.add("image-align-left");
        },
      },
      {
        label: "居中",
        handler: () => {
          container.classList.remove("image-align-left", "image-align-right", "image-align-inline");
          container.classList.add("image-align-center");
        },
      },
      {
        label: "右对齐",
        handler: () => {
          container.classList.remove("image-align-left", "image-align-center", "image-align-inline");
          container.classList.add("image-align-right");
        },
      },
      {
        label: "重置旋转和翻转",
        handler: () => {
          container.dataset.rotation = "0";
          container.classList.remove("flip-horizontal", "flip-vertical", "flip-both");
          this.currentRotation = 0;
          this.isFlippedHorizontal = false;
          this.isFlippedVertical = false;
        },
      },
      {
        label: "删除图片",
        handler: () => {
          container.remove();
        },
      },
    ];
    // 全局隐藏菜单
    CustomImageBlot.imageMenus.forEach((menu) => menu?.hide());
    let contextMenu = CustomImageBlot.imageMenus.get(img);
    if (!contextMenu) {
      contextMenu = new ContextMenu(menuItems);
      CustomImageBlot.imageMenus.set(img, contextMenu);
    }
    contextMenu.show(event.clientX, event.clientY);
    // 绑定关闭事件
    const closeMenu = () => {
      contextMenu.hide();
      img.removeEventListener("click", closeMenu);
    };
    img.addEventListener("click", closeMenu);
  }

  static value(node: HTMLElement) {
    return {
      src: node.querySelector("img")?.src || "",
      align:
        Array.from(node.classList)
          .find((c) => c.startsWith("image-align-"))
          ?.split("-")[2] || "inline",
      rotation: parseInt(node.dataset.rotation || "0"),
      flipH: node.classList.contains("flip-horizontal"),
      flipV: node.classList.contains("flip-vertical")
    };
  }
}
