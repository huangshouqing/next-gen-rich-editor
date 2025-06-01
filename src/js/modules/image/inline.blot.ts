import InlineEmbed from "quill/blots/inline";
import ContextMenu from "../../utils/ContextMenu";
export default class CustomImageBlot extends InlineEmbed {
  static blotName = "custom-inline-image";
  static tagName = "p";
  static className = "ql-custom-image";
  static imageMenus = new Map<HTMLImageElement, ContextMenu>(); // 新增静态属性存储菜单实例
  static create(value: { src: string; align: string }) {
    // 创建新节点时确保干净的结构
    const node = super.create();
    node.classList.add(
      "image-container",
      `image-align-${value.align}`,
      "inline-mode"
    );
    node.contentEditable = "false";
    node.style.position = "relative";
    node.style.display = "inline-block";
    node.style.verticalAlign = "middle";

    // 强制清空现有内容（防止复用旧节点时残留内容）
    while (node.firstChild) {
      node.removeChild(node.firstChild);
    }

    // 生成唯一ID并设置到容器
    const containerId = `image-${Date.now()}-${Math.random()
      .toString(36)
      .substr(2, 9)}`;
    node.id = containerId;

    // 创建新的图片元素
    const img = document.createElement("img");
    img.className = "image-content";
    img.src = value.src;
    img.style.display = "block";

    // 创建独立的包裹容器
    const wrapper = document.createElement("span");
    wrapper.className = "image-wrapper";
    wrapper.style.position = "relative";
    wrapper.style.display = "inline-block";
    wrapper.style.maxWidth = "100%";

    // 严格保证独立结构
    wrapper.appendChild(img.cloneNode(true)); // 克隆确保独立
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
      const currentImg = node.querySelector("img")!;
      currentImg.style.width = "100%";
      currentImg.style.height = "auto";

      // 延迟执行确保布局更新并更新光标位置
      requestAnimationFrame(() => {
        this.bindImageEvents(node, currentImg);
        this.syncHandlesPosition(node);

        // 直接通过Quill API更新光标位置
        if ((window as any).quill) {
          const quill = (window as any).quill;
          const range = quill.getSelection();
          if (range) {
            // 确保在当前blot之后设置光标
            const index = range.index + 1;
            quill.setSelection(index, 0);
            quill.scrollIntoView();
          }
        }
      });
    };

    // 处理图片加载
    if (img.complete && img.naturalWidth !== 0) {
      handleImageLoad();
    } else {
      img.addEventListener("load", handleImageLoad);
      img.addEventListener("error", () => {
        console.error("Image load failed:", img.src);
        node.remove();
      });
    }

    return node;
  }

  // 新增独立的句柄创建方法
  private static createResizeHandles(containerId: string) {
    const positions = ["top-left", "top-right", "bottom-left", "bottom-right"];
    positions.forEach((pos) => {
      const handle = document.createElement("div");
      handle.className = "external-resize-handle";
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
    const editorRoot = document.querySelector(".editor-content");
    if (!container.isConnected || !container.offsetParent) return;

    const rect = container.getBoundingClientRect();
    const offset = 3; // 句柄半径的一半
    const scrollLeft = editorRoot?.scrollLeft || 0;
    const scrollTop = editorRoot?.scrollTop || 0;

    document
      .querySelectorAll<HTMLElement>(`[data-image-id="${container.id}"]`)
      .forEach((handle) => {
        const pos = handle.dataset.position;
        const handleWidth = handle.offsetWidth / 2;
        const handleHeight = handle.offsetHeight / 2;

        // 获取图片实际尺寸
        const img = container.querySelector("img");
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

  // 修改右键菜单项实现
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
        label: "独占一行",
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
        label: "铺满宽度",
        handler: () => {
          // 移除其他对齐方式并应用铺满样式
          container.classList.remove(
            "image-align-left",
            "image-align-center",
            "image-align-right",
            "image-align-inline"
          );
          
          // 添加铺满类名
          container.classList.add("image-align-fill");
          
          // 应用样式
          container.style.width = "100%";
          const currentImg = container.querySelector("img")!;
          currentImg.style.width = "100%";
          currentImg.style.height = "auto";
          
          // 强制更新句柄位置
          requestAnimationFrame(() => {
            this.syncHandlesPosition(container);
            this.updateHandlePositions(container);
          });
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

      const widthDelta = containerStartWidth + deltaX;
      const heightDelta = containerStartHeight + deltaY;

      const ratioDelta = Math.max(
        widthDelta / naturalWidth,
        heightDelta / naturalHeight
      );

      let newWidth = Math.max(minSize, naturalWidth * ratioDelta);
      let newHeight = Math.max(minSize, naturalHeight * ratioDelta);

      if (position.includes("top")) {
        newHeight = Math.max(minSize, newHeight - deltaY * 2);
      }
      if (position.includes("left")) {
        newWidth = Math.max(minSize, newWidth - deltaX * 2);
      }

      newWidth = Math.max(minSize, newWidth);
      newHeight = Math.max(minSize, newHeight);

      container.style.width = `${newWidth}px`;
      container.style.height = `${newHeight}px`;
      img.style.width = "100%";
      img.style.height = "auto";

      // 使用raf实现平滑连续更新
      requestAnimationFrame(() => {
        // 强制同步更新位置
        CustomImageBlot.syncHandlesPosition(container);
        CustomImageBlot.updateHandlePositions(container);
        // 强制重排确保视觉同步
        void container.offsetWidth;
      });
    };

    const stopResize = () => {
      container.classList.remove("resizing");
      document.removeEventListener("mousemove", doResize);
      document.removeEventListener("mouseup", stopResize);
      document.body.style.cursor = "";

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

    // 添加文档级别的事件监听
    document.addEventListener("mousemove", doResize);
    document.addEventListener("mouseup", stopResize);

    // 添加视觉反馈
    document.body.style.cursor = "nwse-resize";
    container.classList.add("resizing");
  }

  // 在bindImageEvents中添加容器变化监听
  private static bindImageEvents(
    blotContainer: HTMLElement,
    img: HTMLImageElement
  ) {
    const minSize = 50;

    // 用于存储当前激活的句柄元素
    let activeHandles: NodeListOf<HTMLElement> | null = null;

    // 点击容器显示句柄
    const mouseEnterHandler = () => {
      activeHandles = document.querySelectorAll<HTMLElement>(
        `[data-image-id="${blotContainer.id}"]`
      );
      // 强制立即更新位置
      this.syncHandlesPosition(blotContainer);
      this.updateHandlePositions(blotContainer);
      activeHandles.forEach((handle) => {
        handle.classList.add("show-handle");
      });
    };
    const mouseLeaveHandler = () => {
      activeHandles = document.querySelectorAll<HTMLElement>(
        `[data-image-id="${blotContainer.id}"]`
      );
      activeHandles.forEach((handle) => {
        handle.classList.remove("show-handle");
      });
    };

    // 拖拽开始事件
    const handleMouseDown = (e: Event) => {
      e.preventDefault();
      e.stopPropagation();

      // 开始拖拽前先更新位置
      requestAnimationFrame(() => {
        this.syncHandlesPosition(blotContainer);
        this.updateHandlePositions(blotContainer);
      });

      this.prototype.startResize(
        blotContainer,
        (e.currentTarget as HTMLElement).dataset.position!,
        minSize
      );
    };

    // 添加事件监听器
    blotContainer.addEventListener("mouseenter", mouseEnterHandler);
    blotContainer.addEventListener("mouseleave", mouseLeaveHandler);

    // 绑定拖拽事件到外部句柄
    document
      .querySelectorAll<HTMLElement>(`[data-image-id="${blotContainer.id}"]`)
      .forEach((handle) => {
        handle.addEventListener("mousedown", handleMouseDown);
        // 句柄自身添加hover更新
        handle.addEventListener("mouseenter", () => {
          requestAnimationFrame(() => {
            this.syncHandlesPosition(blotContainer);
            this.updateHandlePositions(blotContainer);
          });
        });
      });

    // 新增尺寸变化监听器
    const resizeObserver = new ResizeObserver(() => {
      // 当容器被铺满时保持比例更新
      if (blotContainer.style.width === "100%") {
        requestAnimationFrame(() => {
          this.syncHandlesPosition(blotContainer);
          this.updateHandlePositions(blotContainer);
        });
      }
    });
    resizeObserver.observe(img);

    // 新增窗口大小变化监听
    const windowResizeHandler = () => {
      requestAnimationFrame(() => {
        this.syncHandlesPosition(blotContainer);
        this.updateHandlePositions(blotContainer);
      });
    };
    window.addEventListener("resize", windowResizeHandler);

    // 监听容器属性变化
    const mutationObserver = new MutationObserver((mutations) => {
      for (const mutation of mutations) {
        if (mutation.type === "attributes" && mutation.attributeName === "style") {
          // 当宽度变为100%时强制更新布局
          if (blotContainer.style.width === "100%") {
            requestAnimationFrame(() => {
              this.syncHandlesPosition(blotContainer);
              this.updateHandlePositions(blotContainer);
            });
          }
        }
      }
    });
    
    mutationObserver.observe(blotContainer, {
      attributes: true
    });
    
    // 清理逻辑新增
    const observer = new MutationObserver(() => {
      if (!document.contains(img)) {
        // 清理窗口大小监听
        window.removeEventListener("resize", windowResizeHandler);

        // 清理句柄事件
        document
          .querySelectorAll<HTMLElement>(
            `[data-image-id="${blotContainer.id}"]`
          )
          .forEach((handle) => {
            handle.removeEventListener("mouseenter", () => {});
          });

        // 清理尺寸变化监听
        resizeObserver.disconnect();
        
        // 清理mutationObserver
        mutationObserver.disconnect();
      }
    });
    observer.observe(blotContainer, { childList: true, subtree: true });

    // 右键菜单事件
    const contextMenuHandler = (e: MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();
      // 在右键菜单显示前确保位置正确
      requestAnimationFrame(() => {
        this.syncHandlesPosition(blotContainer);
        this.updateHandlePositions(blotContainer);
      });
      CustomImageBlot.showImageContextMenu(img, e);
    };
    blotContainer.addEventListener("contextmenu", contextMenuHandler);
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
