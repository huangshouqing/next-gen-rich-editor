import Quill from "quill-next";
import { css } from "./utils/index";

const MAX_ROWS = 10;
const MAX_COLS = 10;
const CELL_SIZE = 20;
const CELL_GAP = 1;

export default class TablePicker {
  constructor(options = {}) {
    this.options = {
      minRows: 1,
      minCols: 1,
      maxRows: MAX_ROWS,
      maxCols: MAX_COLS,
      ...options
    };
    this.selectedRows = 0;
    this.selectedCols = 0;
    this.onSelect = options.onSelect || (() => {});
    this.onCancel = options.onCancel || (() => {});
    
    this.domNode = null;
    this.gridNode = null;
    this.sizeDisplay = null;
    this.cells = [];
    
    // 绑定 this 上下文
    this.outsideClickHandler = this.outsideClickHandler.bind(this);
    
    this.createPicker();
  }

  createPicker() {
    // 创建主容器 - 使用与 SCSS 一致的类名
    this.domNode = document.createElement("div");
    this.domNode.className = "table-picker";
    
    // 创建表格大小显示
    this.sizeDisplay = document.createElement("div");
    this.sizeDisplay.className = "picker-header";
    this.sizeDisplay.textContent = "0 × 0";
    this.domNode.appendChild(this.sizeDisplay);
    
    // 创建网格容器
    this.gridNode = document.createElement("div");
    this.gridNode.className = "picker-grid";
    this.domNode.appendChild(this.gridNode);
    
    this.createGrid();
  }

  createGrid() {
    // 清空网格和单元格数组
    this.gridNode.innerHTML = "";
    this.cells = [];
    
    // 创建单元格
    for (let i = 0; i < this.options.maxRows * this.options.maxCols; i++) {
      const cell = document.createElement("div");
      cell.className = "picker-cell";
      cell.dataset.index = i;
      this.gridNode.appendChild(cell);
      this.cells.push(cell);
    }
    
    // 绑定事件
    this.bindEvents();
  }

  bindEvents() {
    // 鼠标移动事件 - 用于预览选择
    this.gridNode.addEventListener("mouseover", (e) => {
      const cell = e.target.closest(".picker-cell");
      if (!cell) return;
      
      this.updateSelection(cell);
    });

    // 点击事件 - 确认选择
    this.gridNode.addEventListener("click", (e) => {
      const cell = e.target.closest(".picker-cell");
      if (!cell) return;
      
      const { row, col } = this.updateSelection(cell);
      if (row >= this.options.minRows && col >= this.options.minCols) {
        this.onSelect(row, col);
        this.destroy();
      }
    });

    // 鼠标离开网格时重置显示
    this.gridNode.addEventListener("mouseleave", () => {
      this.sizeDisplay.textContent = "0 × 0";
      this.cells.forEach(cell => {
        cell.classList.remove("hover", "selected");
      });
    });
  }

  updateSelection(currentCell) {
    const index = parseInt(currentCell.dataset.index);
    const row = Math.floor(index / this.options.maxCols) + 1;
    const col = (index % this.options.maxCols) + 1;

    // 更新大小显示
    this.sizeDisplay.textContent = `${row} × ${col}`;

    // 高亮选中的单元格 - 使用 hover 类名与 SCSS 保持一致
    this.cells.forEach((cell, i) => {
      const cellRow = Math.floor(i / this.options.maxCols) + 1;
      const cellCol = (i % this.options.maxCols) + 1;
      const isSelected = cellRow <= row && cellCol <= col;
      
      cell.classList.toggle("hover", isSelected);
      cell.classList.remove("selected"); // 移除之前的选中状态
    });

    this.selectedRows = row;
    this.selectedCols = col;

    return { row, col };
  }

  show(container, position = {}) {
    if (container) {
      container.appendChild(this.domNode);
    } else {
      document.body.appendChild(this.domNode);
    }
    
    // 设置位置
    if (position.left !== undefined) {
      this.domNode.style.left = position.left + "px";
    }
    if (position.top !== undefined) {
      this.domNode.style.top = position.top + "px";
    }
    
    // 添加点击外部关闭的事件监听
    setTimeout(() => {
      document.addEventListener("mousedown", this.outsideClickHandler, true);
    }, 0);
  }

  outsideClickHandler(e) {
    if (!this.domNode.contains(e.target)) {
      this.destroy();
    }
  }

  destroy() {
    document.removeEventListener("mousedown", this.outsideClickHandler, true);
    if (this.domNode && this.domNode.parentNode) {
      this.domNode.parentNode.removeChild(this.domNode);
    }
    this.onCancel();
  }
} 