// 添加行高调整工具类
import Quill from "quill-next";
import { css } from '../utils'
const ROW_TOOL_WIDTH = 12
const ROW_TOOL_HEIGHT = 12
const CELL_MIN_HEIGHT = 30 // 新增的最小行高常量
const PRIMARY_COLOR = '#35A7ED';
export default class TableRowTool {
  constructor(table, quill, options) {
    if (!table) return null;
    this.table = table;
    this.quill = quill;
    this.options = options;
    this.domNode = null;
    
    this.initRowTool();
  }

  initRowTool() {
    const parent = this.quill.root.parentNode;
    const tableRect = this.table.getBoundingClientRect();
    const containerRect = parent.getBoundingClientRect();
    const tableViewRect = this.table.parentNode.getBoundingClientRect();

    this.domNode = document.createElement('div');
    this.domNode.classList.add('qldb-row-tool');
    this.updateRowTools();
    
    // 计算行工具的位置和样式
    const toolStyle = {
      width: `${tableViewRect.width}px`,
      height: `${ROW_TOOL_HEIGHT}px`,
      left: `${tableViewRect.left - containerRect.left + parent.scrollLeft}px`,
      top: `${tableViewRect.top - containerRect.top + parent.scrollTop}px`
    };
    
    // 在表格上方添加行高调整工具
    css(this.domNode, toolStyle);
    
    parent.appendChild(this.domNode);
  }

  createRowToolCell() {
    const toolCell = document.createElement('div');
    toolCell.classList.add('qldb-row-tool-cell');
    const resizeHolder = document.createElement('div');
    resizeHolder.classList.add('qldb-row-tool-cell-holder');
    
    // 设置行工具单元格的基本样式
    const cellStyle = {
      'height': `${ROW_TOOL_HEIGHT}px`,
      'position': 'relative',
      'cursor': 'ns-resize'
    };
    
    css(toolCell, cellStyle);
    toolCell.appendChild(resizeHolder);
    
    // 添加拖拽事件处理
    this.addRowCellHolderHandler(toolCell);
    
    return toolCell;
  }

  updateRowTools() {
    const tableContainer = Quill.find(this.table);
    const rowsInTable = tableContainer.rows();
    const existCells = Array.from(this.domNode.querySelectorAll('.qldb-row-tool-cell'));
    
    for (let index = 0; index < Math.max(rowsInTable.length, existCells.length); index++) {
      let row = rowsInTable[index];
      let toolCell = null;
      
      if (!existCells[index]) {
        toolCell = this.createRowToolCell();
        this.domNode.appendChild(toolCell);
        // 设置工具单元格的初始高度
        const rowHeight = row.domNode.offsetHeight;
        css(toolCell, {
          'min-height': `${rowHeight}px`
        });
      } else if (existCells[index] && index >= rowsInTable.length) {
        existCells[index].remove();
      } else {
        toolCell = existCells[index];
        // 更新工具单元格的高度
        const rowHeight = row.domNode.offsetHeight;
        css(toolCell, {
          'min-height': `${rowHeight}px`
        });
      }
    }
  }

  destroy() {
    this.domNode.remove();
    return null;
  }

  addRowCellHolderHandler(cell) {
    const tableContainer = Quill.find(this.table);
    const $holder = cell.querySelector(".qldb-row-tool-cell-holder");
    let dragging = false;
    let y0 = 0;
    let y = 0;
    let delta = 0;
    let height0 = 0;
    // 辅助线相关变量
    let tableRect = {};
    let cellRect = {};
    let $helpLine = null;

    const handleDrag = e => {
      e.preventDefault();

      if (dragging) {
        y = e.clientY;
        
        // 计算最小行高为20像素
        if (height0 + y - y0 >= 20) {
          delta = y - y0;
        } else {
          delta = 20 - height0;
        }
        
        // 更新辅助线位置
        css($helpLine, {
          'top': `${cellRect.top + cellRect.height - 1 + delta}px`
        });
      }
    };

    const handleMouseup = e => {
      e.preventDefault();
      const existCells = Array.from(this.domNode.querySelectorAll('.qldb-row-tool-cell'));
      const rowIndex = existCells.indexOf(cell);
      const rowBlot = tableContainer.rows()[rowIndex];

      if (dragging) {
        // 应用新的行高
        const newHeight = height0 + delta;
        rowBlot.format('height', newHeight);
        
        // 更新行高样式
        css(cell, { 'min-height': `${newHeight}px` });
        
        y0 = 0;
        y = 0;
        delta = 0;
        height0 = 0;
        dragging = false;
        $holder.classList.remove('dragging');
      }

      document.removeEventListener('mousemove', handleDrag, false);
      document.removeEventListener('mouseup', handleMouseup, false);
      tableRect = {};
      cellRect = {};
      $helpLine.remove();
      $helpLine = null;
      
      // 触发表格重绘
      tableContainer.updateTableWidth();
      
      const tableSelection = this.quill.getModule('better-table').tableSelection;
      tableSelection && tableSelection.clearSelection();
    };

    const handleMousedown = e => {
      document.addEventListener('mousemove', handleDrag, false);
      document.addEventListener('mouseup', handleMouseup, false);

      tableRect = this.table.getBoundingClientRect();
      cellRect = cell.getBoundingClientRect();
      
      // 创建辅助线
      $helpLine = document.createElement('div');
      css($helpLine, {
        position: 'fixed',
        left: `${cellRect.left}px`,
        top: `${cellRect.top + cellRect.height - 1}px`,
        zIndex: '100',
        width: `${tableRect.width + ROW_TOOL_WIDTH + 4}px`,
        height: '1px',
        backgroundColor: PRIMARY_COLOR
      });
      
      document.body.appendChild($helpLine);
      
      dragging = true;
      y0 = e.clientY;
      height0 = cellRect.height;
      $holder.classList.add('dragging');
    };
    
    $holder.addEventListener('mousedown', handleMousedown, false);
  }

  rowToolCells() {
    return Array.from(this.domNode.querySelectorAll('.qldb-row-tool-cell'));
  }
}
