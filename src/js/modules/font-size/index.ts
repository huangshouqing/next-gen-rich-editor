// src/js/modules/FontSizeModule.ts
import { EditorCore } from "../../core";

export default class FontSizeModule {
  public name = "FontSizeModule";
  private editor: EditorCore;
  private fontSizeButton: HTMLElement | null = null;
  
  constructor(editor: EditorCore) {
    this.editor = editor;
  }
  
  /**
   * 注册实例
   * @returns
   */
  public register(): void {
    const toolbar = this.editor.container?.querySelector(
      ".toolbar"
    ) as HTMLElement;
    if (!toolbar) return;
    // 修改为监听 toolbar 内部特定按钮的点击事件
    this.fontSizeButton = toolbar.querySelector(
      "#font-size-btn"
    ) as HTMLElement;

    // 添加现代化样式
    this.addModernStyles();
  }

  private addModernStyles(): void {
    // 添加现代化字体大小选择器样式
    if (!document.querySelector('#modern-fontsize-styles')) {
      const style = document.createElement('style');
      style.id = 'modern-fontsize-styles';
      style.textContent = `
        .font-size-dropdown {
          position: absolute;
          z-index: 9999;
          background: #ffffff;
          border: 1px solid #e5e7eb;
          border-radius: 12px;
          box-shadow: 0 10px 25px rgba(0, 0, 0, 0.12), 0 4px 10px rgba(0, 0, 0, 0.08);
          padding: 8px 0;
          backdrop-filter: blur(20px);
          animation: dropdownSlideIn 0.2s cubic-bezier(0.4, 0, 0.2, 1);
          min-width: 120px;
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        }

        @keyframes dropdownSlideIn {
          from {
            opacity: 0;
            transform: translateY(-8px) scale(0.95);
          }
          to {
            opacity: 1;
            transform: translateY(0) scale(1);
          }
        }

        .font-size-dropdown-item {
          display: flex;
          align-items: center;
          padding: 10px 16px;
          cursor: pointer;
          transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
          color: #374151;
          font-size: 14px;
          font-weight: 500;
          position: relative;
          margin: 0 4px;
          border-radius: 8px;
        }

        .font-size-dropdown-item:hover {
          background: linear-gradient(135deg, rgba(5, 137, 243, 0.08), rgba(5, 137, 243, 0.04));
          color: #0589f3;
          transform: translateX(4px);
        }

        .font-size-dropdown-item:hover::before {
          content: '';
          position: absolute;
          left: -4px;
          top: 50%;
          transform: translateY(-50%);
          width: 3px;
          height: 20px;
          background: #0589f3;
          border-radius: 2px;
          opacity: 1;
        }

        .font-size-dropdown-item::before {
          content: '';
          position: absolute;
          left: -4px;
          top: 50%;
          transform: translateY(-50%);
          width: 3px;
          height: 20px;
          background: #0589f3;
          border-radius: 2px;
          opacity: 0;
          transition: opacity 0.2s;
        }

        .font-size-dropdown-item .size-preview {
          margin-left: auto;
          color: #6b7280;
          font-size: 12px;
          opacity: 0;
          transition: opacity 0.2s;
        }

        .font-size-dropdown-item:hover .size-preview {
          opacity: 1;
          color: #0589f3;
        }
      `;
      document.head.appendChild(style);
    }
  }
  
  public createFontSizeSelect(): void {
    if (!this.fontSizeButton) return;
    // 先清除旧的下拉框
    this.removeExistingDropdown();
    
    const dropdown = document.createElement("div");
    dropdown.className = "font-size-dropdown";
    
    const sizes = [
      { value: "10", label: "10px", preview: "极小" },
      { value: "12", label: "12px", preview: "小" },
      { value: "14", label: "14px", preview: "正常" },
      { value: "16", label: "16px", preview: "中等" },
      { value: "18", label: "18px", preview: "大" },
      { value: "24", label: "24px", preview: "很大" },
      { value: "32", label: "32px", preview: "极大" }
    ];
    
    sizes.forEach((size) => {
      const item = document.createElement("div");
      item.className = "font-size-dropdown-item";
      
      const label = document.createElement("span");
      label.textContent = size.label;
      
      const preview = document.createElement("span");
      preview.className = "size-preview";
      preview.textContent = size.preview;
      
      item.appendChild(label);
      item.appendChild(preview);
      item.dataset.value = size.value;
      
      item.addEventListener("click", () => {
        this.editor.restoreSelection();
        this.editor.execCommand("fontSize", size.value);
        this.removeExistingDropdown();
      });
      
      dropdown.appendChild(item);
    });
    
    // 定位下拉框
    const rect = this.fontSizeButton.getBoundingClientRect();
    dropdown.style.top = `${rect.bottom + window.scrollY + 5}px`;
    dropdown.style.left = `${rect.left + window.scrollX}px`;
    
    document.body.appendChild(dropdown);
    
    // 添加失焦关闭功能
    const closeHandler = (e: MouseEvent) => {
      if (!dropdown.contains(e.target as Node) && e.target !== this.fontSizeButton) {
        this.removeExistingDropdown();
        document.removeEventListener('mousedown', closeHandler);
      }
    };
    
    // 延迟添加事件监听器，避免立即触发
    setTimeout(() => {
      document.addEventListener('mousedown', closeHandler);
    }, 0);
  }
  
  private removeExistingDropdown(): void {
    const existing = document.querySelector(".font-size-dropdown");
    if (existing) {
      existing.remove();
    }
  }
}
