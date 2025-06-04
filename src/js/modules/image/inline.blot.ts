import InlineEmbed from "quill-next/dist/blots/inline";
import ContextMenu from "../../utils/ContextMenu";
export default class CustomImageBlot extends InlineEmbed {
  static blotName = "custom-inline-image";
  static tagName = "p";
  static className = "ql-custom-image";
  static imageMenus = new Map<HTMLImageElement, ContextMenu>(); // 新增静态属性存储菜单实例
  
  private static currentRotation = 0;
  private static isFlippedHorizontal = false;
  private static isFlippedVertical = false;

  static create(value: { src: string; align: string; rotation?: number; flipH?: boolean; flipV?: boolean }) {
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
    node.style.transformOrigin = "center center";

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
    if (value.flipH && value.flipV) {
      node.classList.add("flip-both");
    }

    // 强制清空现有内容（防止复用旧节点时残留内容）
    while (node.firstChild) {
      node.removeChild(node.firstChild);
    }

    // 生成唯一ID并设置到容器
    const containerId = `image-${Date.now()}-${Math.random()
      .toString(36)
      .substr(2, 9)}`;
    node.id = containerId;

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

    // 添加工具栏和旋转指示器到容器
    node.appendChild(toolbar);
    node.appendChild(rotationIndicator);

    // 添加图片到包裹容器
    wrapper.appendChild(img.cloneNode(true));
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
          container.classList.remove(
            "image-align-center",
            "image-align-right",
            "image-align-inline",
            "image-align-fill"
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
            "image-align-inline",
            "image-align-fill"
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
            "image-align-inline",
            "image-align-fill"
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
            "image-align-right",
            "image-align-fill"
          );
          container.classList.add("image-align-inline");
        },
      },
      {
        label: "铺满宽度",
        handler: () => {
          container.classList.remove(
            "image-align-left",
            "image-align-center",
            "image-align-right",
            "image-align-inline"
          );
          
          container.classList.add("image-align-fill");
          
          container.style.width = "100%";
          const currentImg = container.querySelector("img")!;
          currentImg.style.width = "100%";
          currentImg.style.height = "auto";
          
          requestAnimationFrame(() => {
            this.syncHandlesPosition(container);
            this.updateHandlePositions(container);
          });
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
          this.updateHandlePositions(container);
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
        this.updateHandlePositions(blotContainer);
      });

      // 右旋转
      toolbar.querySelector(".rotate-right")?.addEventListener("click", (e) => {
        e.stopPropagation();
        this.currentRotation = (this.currentRotation + 90) % 360;
        blotContainer.dataset.rotation = this.currentRotation.toString();
        this.showRotationFeedback(rotationIndicator, this.currentRotation);
        this.updateHandlePositions(blotContainer);
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
        this.updateHandlePositions(blotContainer);
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
        this.updateHandlePositions(blotContainer);
      });
    }
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
