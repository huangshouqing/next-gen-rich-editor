import InlineEmbed from "quill/blots/inline";
import ContextMenu from "../../utils/ContextMenu";
import './image.scss'
import './inline.scss'; // 内联模式样式

export default class CustomImageBlot extends InlineEmbed {
  static blotName = "custom-inline-image";
  static tagName = "p";
  static className = "ql-custom-image";
  static imageMenus = new Map<HTMLImageElement, ContextMenu>(); // 新增静态属性存储菜单实例

  private isResizing = false;
  private isActive = false;

  static create(value: { src: string; align: string }) {
    const node = super.create();
    // 修改样式类名以区分模式
    node.classList.add("image-container", `image-align-${value.align}`, "inline-mode");
    node.contentEditable = "false";
    node.style.position = "relative";
    
    // 生成唯一ID并设置到容器
    const containerId = `image-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    node.id = containerId;

    const img = document.createElement("img");
    img.className = "image-content";
    img.src = value.src;
    node.appendChild(img);
    
    // 抽离创建句柄逻辑
    this.createResizeHandles(containerId);

    img.onload = () => {
      node.style.width = img.naturalWidth + "px";
      node.style.height = img.naturalHeight + "px";
      img.style.width = "100%";
      img.style.height = "100%";
      // 延迟执行确保布局更新
      requestAnimationFrame(() => {
        this.bindImageEvents(node, img);
        this.syncHandlesPosition(node);
      });
    };
    return node;
  }

  // 新增独立的句柄创建方法
  private static createResizeHandles(containerId: string) {
    const positions = ["top-left", "top-right", "bottom-left", "bottom-right"];
    positions.forEach((pos) => {
      const handle = document.createElement("div");
      handle.className = "resize-handle external-resize-handle";
      handle.dataset.position = pos;
      // 统一使用data-image-id属性
      handle.dataset.imageId = containerId;
      document.body.appendChild(handle);
    });
  }

  // 新增句柄位置同步方法
  private static syncHandlesPosition(container: HTMLElement) {
    const editorRoot = document.querySelector('.editor-content');
    if (!editorRoot) return;

    // 新增对齐方式变化监听
    const mutationObserver = new MutationObserver(() => {
      this.updateHandlePositions(container);
    });
    mutationObserver.observe(container, { 
      attributes: true,
      attributeFilter: ['class'] 
    });

    // 统一更新位置逻辑
    this.updateHandlePositions(container);
    
    // 监听滚动事件更新位置
    const scrollHandler = () => requestAnimationFrame(() => this.updateHandlePositions(container));
    window.addEventListener('scroll', scrollHandler, true);
  }

  private static updateHandlePositions(container: HTMLElement) {
    const editorRoot = document.querySelector('.editor-content');
    if (!container.isConnected) return;

    const rect = container.getBoundingClientRect();
    const offset = 3; // 改为句柄半径的一半
    const scrollLeft = editorRoot?.scrollLeft || 0;
    const scrollTop = editorRoot?.scrollTop || 0;
    
    document.querySelectorAll<HTMLElement>(`[data-image-id="${container.id}"]`).forEach(handle => {
      const pos = handle.dataset.position;
      const handleWidth = handle.offsetWidth / 2;
      const handleHeight = handle.offsetHeight / 2;
      
      switch (pos) {
        case "top-left":
          handle.style.left = `${rect.left + scrollLeft - handleWidth}px`;
          handle.style.top = `${rect.top + scrollTop - handleHeight}px`;
          break;
        case "top-right":
          handle.style.left = `${rect.right + scrollLeft + handleWidth}px`;
          handle.style.top = `${rect.top + scrollTop - handleHeight}px`;
          break;
        case "bottom-left":
          handle.style.left = `${rect.left + scrollLeft - handleWidth}px`;
          handle.style.top = `${rect.bottom + scrollTop + handleHeight}px`;
          break;
        case "bottom-right":
          handle.style.left = `${rect.right + scrollLeft + handleWidth}px`;
          handle.style.top = `${rect.bottom + scrollTop + handleHeight}px`;
      }
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
      // 显示所有关联的外部句柄
      document.querySelectorAll(`[data-image-id="${blotContainer.id}"]`).forEach(handle => {
        handle.classList.add('show-handle');
      });
    };
    
    const mouseLeaveHandler = () => {
      if (!this.prototype.isResizing) {
        this.prototype.isActive = false;
        blotContainer.classList.remove("active-resize");
        // 隐藏所有关联的外部句柄
        document.querySelectorAll(`[data-image-id="${blotContainer.id}"]`).forEach(handle => {
          handle.classList.remove('show-handle');
        });
      }
    };

    // 鼠标进入/离开事件（改为具名函数）
    blotContainer.addEventListener("mouseenter", mouseEnterHandler);
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

        // 新增清理外部调整句柄逻辑
        editorRoot?.querySelectorAll(`[data-image-id="${container.id}"]`).forEach(handle => {
          handle.remove();
        });

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
