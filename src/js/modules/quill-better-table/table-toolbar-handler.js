import Quill from "quill-next";
import TablePicker from "./table-picker";

/**
 * 表格工具栏处理器
 * 用于处理工具栏中表格按钮的点击事件
 */
export class TableToolbarHandler {
  constructor(quill) {
    this.quill = quill;
    this.tablePicker = null;
    this.init();
  }

  init() {
    // 监听工具栏按钮点击事件
    const toolbar = this.quill.getModule('toolbar');
    if (toolbar && toolbar.container) {
      // 查找表格按钮
      const tableButton = toolbar.container.querySelector('.ql-table');
      if (tableButton) {
        // 移除默认的点击处理
        tableButton.removeAttribute('data-value');
        
        // 添加自定义点击处理
        tableButton.addEventListener('click', (e) => {
          e.preventDefault();
          e.stopPropagation();
          this.handleTableButtonClick(tableButton);
        });
      }
    }
  }

  handleTableButtonClick(buttonElement) {
    // 如果已有选择器，先销毁
    if (this.tablePicker) {
      this.tablePicker.destroy();
      this.tablePicker = null;
    }

    // 获取按钮位置信息
    const buttonRect = buttonElement.getBoundingClientRect();
    
    // 创建表格选择器
    this.tablePicker = new TablePicker({
      onSelect: (rows, cols) => {
        this.insertTable(rows, cols);
        this.tablePicker = null;
      },
      onCancel: () => {
        this.tablePicker = null;
      }
    });

    // 显示选择器，定位在按钮下方
    this.tablePicker.show(document.body, {
      left: buttonRect.left,
      top: buttonRect.bottom + 5
    });
  }

  insertTable(rows, cols) {
    const betterTableModule = this.quill.getModule('better-table');
    if (betterTableModule) {
      betterTableModule.insertTable(rows, cols);
    }
  }

  destroy() {
    if (this.tablePicker) {
      this.tablePicker.destroy();
      this.tablePicker = null;
    }
  }
} 