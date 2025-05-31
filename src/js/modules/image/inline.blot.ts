import InlineEmbed from "quill/blots/inline";
import ContextMenu from "../../utils/ContextMenu";

export default class CustomImageBlot extends InlineEmbed {
  static blotName = "custom-inline-image";
  static tagName = "p";
  static className = "ql-custom-image";
  static imageMenus = new Map<HTMLImageElement, ContextMenu>(); // 新增静态属性存储菜单实例

  private isResizing = false;
  private isActive = false;

  static create(value: { src: string; align: string }) {
    const node = super.create();
    node.classList.add("image-container", `image-align-${value.align}`);
    node.contentEditable = "false";
    node.style.position = "relative"; // 新增容器定位
    const img = document.createElement("img");
    img.className = "image-content";
    img.src = value.src;

    // 调整创建顺序：先添加图片再创建手柄
    node.appendChild(img);
    // this.createResizeHandles(node); // 移动到图片添加之后

    // 新增：图片加载完成后绑定事件
    img.onload = () => {
      node.style.width = img.naturalWidth + "px";
      node.style.height = img.naturalHeight + "px";
      img.style.width = "100%";
      img.style.height = "100%";
      this.bindImageEvents(node, img); // 调用事件绑定方法
    };
    this.createResizeHandles(node);
    node.appendChild(img);
    return node;
  }

  // 新增：创建调整句柄
  private static createResizeHandles(container: HTMLElement) {
    ["top-left", "top-right", "bottom-left", "bottom-right"].forEach((pos) => {
      const handle = document.createElement("div"); // 改为div元素
      handle.className = "resize-handle";
      handle.dataset.position = pos;
      handle.style.position = "absolute"; // 确保绝对定位
      handle.style.zIndex = "1000"; // 提升层级
      container.appendChild(handle);
    });
  }

  // 新增右键菜单处理逻辑
  private static showImageContextMenu(
    img: HTMLImageElement,
    event: MouseEvent
  ): void {
    const container = img.closest(".ql-custom-image") as HTMLElement;
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

  private static bindImageEvents(
    blotContainer: HTMLElement,
    img: HTMLImageElement
  ) {
    const minSize = 50;

    // 创建事件处理器以便后续移除
    const mouseEnterHandler = () => {
      this.prototype.isActive = true;
      blotContainer.classList.add("active-resize");
    };
    const mouseLeaveHandler = () => {
      if (!this.prototype.isResizing) {
        this.prototype.isActive = false;
        blotContainer.classList.remove("active-resize");
      }
    };

    // 鼠标进入/离开事件（改为具名函数）
    blotContainer.addEventListener("click", mouseEnterHandler);
    blotContainer.addEventListener("mouseleave", mouseLeaveHandler);

    // 调整句柄事件绑定
    const handleMouseDown = (e: Event) => {
      e.preventDefault();
      this.prototype.isResizing = true;
      this.prototype.startResize(
        blotContainer,
        (e.currentTarget as HTMLElement).dataset.position!,
        minSize
      );
    };
    blotContainer.querySelectorAll(".resize-handle").forEach((handle) => {
      handle.addEventListener("mousedown", handleMouseDown);
    });

    // 动态计算句柄位置
    const updateHandlePosition = () => {
      const handles =
        blotContainer.querySelectorAll<HTMLElement>(".resize-handle");
      handles.forEach((handle) => {
        const position = handle.dataset.position!;
        const offset = 6;
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
    const resizeObserver = new ResizeObserver(updateHandlePosition);
    resizeObserver.observe(img);

    // 右键菜单事件
    const contextMenuHandler = (e: MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();
      CustomImageBlot.showImageContextMenu(img, e);
    };
    blotContainer.addEventListener("contextmenu", contextMenuHandler);

    // 图片移除时清理逻辑
    const observer = new MutationObserver(() => {
      if (!document.contains(img)) {
        // 清理事件监听
        blotContainer.removeEventListener("mouseenter", mouseEnterHandler);
        blotContainer.removeEventListener("mouseleave", mouseLeaveHandler);
        blotContainer.querySelectorAll(".resize-handle").forEach((handle) => {
          handle.removeEventListener("mousedown", handleMouseDown);
        });
        blotContainer.removeEventListener("contextmenu", contextMenuHandler);
        resizeObserver.disconnect();

        // 清理菜单实例
        CustomImageBlot.imageMenus.get(img)?.hide();
        CustomImageBlot.imageMenus.delete(img);
        observer.disconnect();
      }
    });
    observer.observe(blotContainer, { childList: true, subtree: true });
  }

  // 迁移后的调整尺寸逻辑
  private startResize(
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
          const ratioDelta = Math.max(
            widthDelta / naturalWidth,
            heightDelta / naturalHeight
          );
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
          container.dispatchEvent(
            new CustomEvent("image-resized", {
              detail: { width: currentWidth, height: currentHeight },
            })
          );
        }
      });
    };

    document.addEventListener("mousemove", doResize);
    document.addEventListener("mouseup", stopResize);
  }

  static value(node: HTMLElement) {
    return {
      src: node.querySelector("img")?.src || "",
      align:
        Array.from(node.classList)
          .find((c) => c.startsWith("image-align-"))
          ?.split("-")[2] || "inline",
    };
  }
}
