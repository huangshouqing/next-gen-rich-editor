import InlineEmbed from "quill/blots/inline";
import ContextMenu from "../../utils/ContextMenu";
import "./image.scss";
import "./inline.scss"; // 内联模式样式

export default class CustomImageBlot extends InlineEmbed {
  static blotName = "custom-inline-image";
  static tagName = "p";
  static className = "ql-custom-image";
  static imageMenus = new Map<HTMLImageElement, ContextMenu>(); // 新增静态属性存储菜单实例

  private isResizing = false;
  private isActive = false;

  static create(value: { src: string; align: string }) {
    const node = super.create();
    node.classList.add("image-container", `image-align-${value.align}`, "inline-mode");
    node.contentEditable = "false";
    node.style.position = "relative";
    node.style.display = "inline-block"; // 保持内联特性
    node.style.verticalAlign = "middle"; // 修复垂直对齐
    
    // 生成唯一ID并设置到容器
    const containerId = `image-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    node.id = containerId;

    const img = document.createElement("img");
    img.className = "image-content";
    img.src = value.src;
    img.style.display = "block"; // 避免底部空白
    
    // 创建独立的包裹容器
    const wrapper = document.createElement("span");
    wrapper.className = "image-wrapper";
    wrapper.style.position = "relative";
    wrapper.style.display = "inline-block";
    wrapper.style.maxWidth = "100%";
    
    // 结构优化：先包裹再插入
    wrapper.appendChild(img);
    node.appendChild(wrapper);
    
    // 抽离创建句柄逻辑
    this.createResizeHandles(containerId);

    // 图片加载完成后的尺寸处理
    const handleImageLoad = () => {
      if (!img.naturalWidth) return; // 防止重复触发
      
      // 设置容器为图片原始尺寸
      node.style.width = "auto";
      node.style.maxWidth = "100%";
      node.style.height = "auto";
      
      // 设置图片为100%尺寸
      img.style.width = "100%";
      img.style.height = "auto";
      
      // 延迟执行确保布局更新
      requestAnimationFrame(() => {
        this.bindImageEvents(node, img);
        this.syncHandlesPosition(node);
      });
    };

    // 处理图片加载
    if (img.complete && img.naturalWidth !== 0) {
      handleImageLoad();
    } else {
      img.addEventListener('load', handleImageLoad);
      img.addEventListener('error', () => {
        console.error('Image load failed:', img.src);
        node.remove(); // 加载失败移除容器
      });
    }
    
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
    const editorRoot = document.querySelector(".editor-content");
    if (!editorRoot) return;

    // 新增对齐方式变化监听
    const mutationObserver = new MutationObserver(() => {
      this.updateHandlePositions(container);
    });
    mutationObserver.observe(container, {
      attributes: true,
      attributeFilter: ["class"],
    });

    // 统一更新位置逻辑
    this.updateHandlePositions(container);

    // 监听滚动事件更新位置
    const scrollHandler = () =>
      requestAnimationFrame(() => this.updateHandlePositions(container));
    window.addEventListener("scroll", scrollHandler, true);
  }

  private static updateHandlePositions(container: HTMLElement) {
    const editorRoot = document.querySelector('.editor-content');
    if (!container.isConnected || !container.offsetParent) return;

    const rect = container.getBoundingClientRect();
    const offset = 3; // 句柄半径的一半
    const scrollLeft = editorRoot?.scrollLeft || 0;
    const scrollTop = editorRoot?.scrollTop || 0;
    
    document.querySelectorAll<HTMLElement>(`[data-image-id="${container.id}"]`).forEach(handle => {
      const pos = handle.dataset.position;
      const handleWidth = handle.offsetWidth / 2;
      const handleHeight = handle.offsetHeight / 2;
      
      // 获取图片实际尺寸
      const img = container.querySelector('img');
      if (!img) return;
      
      const imgRect = img.getBoundingClientRect();
      const containerRect = container.getBoundingClientRect();
      
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
    
    // 用于存储当前激活的句柄元素
    let activeHandles: NodeListOf<HTMLElement> | null = null;
    
    // 点击容器显示句柄
    const containerClickHandler = () => {
      activeHandles = document.querySelectorAll<HTMLElement>(`[data-image-id="${blotContainer.id}"]`);
      activeHandles.forEach(handle => {
        handle.classList.add('show-handle');
      });
    };
    
    // 点击外部区域隐藏句柄
    const documentClickHandler = (e: MouseEvent) => {
      if (!blotContainer.contains(e.target as Node)) {
        document.querySelectorAll<HTMLElement>(`[data-image-id="${blotContainer.id}"]`).forEach(handle => {
          handle.classList.remove('show-handle');
        });
      }
    };

    // 拖拽开始事件
    const handleMouseDown = (e: Event) => {
      e.preventDefault();
      e.stopPropagation();
      this.prototype.isResizing = true;
      this.prototype.startResize(
        blotContainer,
        (e.currentTarget as HTMLElement).dataset.position!,
        minSize
      );
    };

    // 添加事件监听器
    blotContainer.addEventListener('click', containerClickHandler);
    document.addEventListener('click', documentClickHandler);
    
    // 绑定拖拽事件到外部句柄
    document.querySelectorAll<HTMLElement>(`[data-image-id="${blotContainer.id}"]`).forEach(handle => {
      handle.addEventListener('mousedown', handleMouseDown);
    });

    // 动态计算句柄位置
    const updateHandlePosition = () => {
      const handles =
        blotContainer.querySelectorAll<HTMLElement>('.resize-handle');
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

    // 清理逻辑
    const observer = new MutationObserver(() => {
      if (!document.contains(img)) {
        // 清理事件监听
        blotContainer.removeEventListener('click', containerClickHandler);
        document.removeEventListener('click', documentClickHandler);
        blotContainer.removeEventListener('contextmenu', contextMenuHandler);
        
        // 清理句柄事件
        document.querySelectorAll<HTMLElement>(`[data-image-id="${blotContainer.id}"]`).forEach(handle => {
          handle.removeEventListener('mousedown', handleMouseDown);
          handle.remove();
        });
        
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

    // 获取原始宽高比
    const naturalWidth = img.naturalWidth;
    const naturalHeight = img.naturalHeight;
    const aspectRatio = naturalWidth / naturalHeight;

    const doResize = (e: MouseEvent) => {
      const deltaX = e.clientX - startX;
      const deltaY = e.clientY - startY;

      let newWidth = containerStartWidth;
      let newHeight = containerStartHeight;

      // 根据不同方向调整尺寸并保持比例
      switch (position) {
        case "top-right":
          newWidth = Math.max(minSize, containerStartWidth + deltaX);
          newHeight = newWidth / aspectRatio;
          break;
        case "bottom-left":
          newHeight = Math.max(minSize, containerStartHeight + deltaY);
          newWidth = newHeight * aspectRatio;
          break;
        case "bottom-right":
          const widthDelta = containerStartWidth + deltaX;
          const heightDelta = containerStartHeight + deltaY;
          const ratioDelta = Math.max(
            widthDelta / naturalWidth,
            heightDelta / naturalHeight
          );
          newWidth = naturalWidth * ratioDelta;
          newHeight = naturalHeight * ratioDelta;
          break;
        default:
          newWidth = Math.max(minSize, containerStartWidth - deltaX);
          newHeight = newWidth / aspectRatio;
      }

      // 应用新尺寸
      newWidth = Math.max(minSize, newWidth);
      newHeight = Math.max(minSize, newHeight);

      container.style.width = `${newWidth}px`;
      container.style.height = `${newHeight}px`;
      img.style.width = "100%";
      img.style.height = "100%";

      // 实时更新句柄位置
      requestAnimationFrame(() => {
        CustomImageBlot.syncHandlesPosition(container);
        CustomImageBlot.updateHandlePositions(container);
      });
    };

    const stopResize = () => {
      this.isResizing = false;
      if (!this.isActive) {
        container.classList.remove("active-resize");
      }
      document.removeEventListener("mousemove", doResize);
      document.removeEventListener("mouseup", stopResize);

      // 移除文档级别的样式修改
      document.body.style.cursor = "";

      // 触发尺寸更新事件
      requestAnimationFrame(() => {
        const currentWidth = parseInt(container.style.width);
        const currentHeight = parseInt(container.style.height);
        if (!isNaN(currentWidth) && !isNaN(currentHeight)) {
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
