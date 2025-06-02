// 添加行高调整工具类
import Quill from "quill-next";
import { css } from '../utils'
const ROW_TOOL_WIDTH = 12
const ROW_TOOL_HEIGHT = 12
const CELL_MIN_WIDTH = 30 // 修改为最小宽度
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
    
    // 获取表格实际位置
    const tableViewRect = this.table.getBoundingClientRect();
    
    this.domNode = document.createElement('div');
    this.domNode.classList.add('qldb-row-tool');
    this.updateRowTools();
    
    // 计算表格总高度
    const tableHeight = Array.from(this.table.querySelectorAll('tr'))
      .reduce((sum, row) => sum + row.offsetHeight, 0);
    
    // 使用表格实际高度作为工具栏高度
    const toolStyle = {
      width: `${ROW_TOOL_WIDTH}px`,
      height: `${tableHeight}px`, // 明确设置高度
      left: `${tableViewRect.left - containerRect.left + parent.scrollLeft - ROW_TOOL_WIDTH - 5}px`,
      top: `${tableViewRect.top - containerRect.top + parent.scrollTop}px`
    };
    
    css(this.domNode, toolStyle);
    parent.appendChild(this.domNode);
    
    // 添加调试信息
    console.log('初始化工具栏高度:', tableHeight);
  }

  createRowToolCell() {
    const toolCell = document.createElement('div');
    toolCell.classList.add('qldb-row-tool-cell');
    const resizeHolder = document.createElement('div');
    resizeHolder.classList.add('qldb-row-tool-cell-holder');
    
    // 修改样式为垂直方向调整
    const cellStyle = {
      'width': `${ROW_TOOL_WIDTH}px`,
      'position': 'relative',
      'cursor': 'ns-resize',
      'min-height': `${CELL_MIN_WIDTH}px`
    };
    
    css(toolCell, cellStyle);
    toolCell.appendChild(resizeHolder);
    this.addRowCellHolderHandler(toolCell);
    
    return toolCell;
  }

  updateRowTools() {
    const tableContainer = Quill.find(this.table);
    const rowsInTable = tableContainer.rows();
    const existCells = Array.from(this.domNode.querySelectorAll('.qldb-row-tool-cell'));
    
    // 添加调试信息
    console.log('表格行数:', rowsInTable.length);
    console.log('现有工具单元格数:', existCells.length);
    
    for (let index = 0; index < Math.max(rowsInTable.length, existCells.length); index++) {
      let row = rowsInTable[index];
      let toolCell = null;
      
      if (!existCells[index]) {
        toolCell = this.createRowToolCell();
        this.domNode.appendChild(toolCell);
        // 设置工具单元格的初始宽度
        const rowHeight = row?.domNode?.offsetHeight || CELL_MIN_WIDTH;
        css(toolCell, {
          'width': `${ROW_TOOL_WIDTH}px`,
          'min-height': `${rowHeight}px`
        });
        
        // 添加调试信息
        console.log(`创建新单元格 - 索引:${index}, 高度:${rowHeight}`);
      } else if (existCells[index] && index >= rowsInTable.length) {
        existCells[index].remove();
        // 添加调试信息
        console.log(`移除多余单元格 - 索引:${index}`);
      } else {
        toolCell = existCells[index];
        // 更新工具单元格的高度
        const rowHeight = row?.domNode?.offsetHeight || CELL_MIN_WIDTH;
        css(toolCell, {
          'min-height': `${rowHeight}px`
        });
        
        // 添加调试信息
        console.log(`更新单元格 - 索引:${index}, 高度:${rowHeight}`);
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
    let tableRect = {};
    let cellRect = {};
    let $helpLine = null;
    
    // 在mousedown时获取最新的行索引
    const handleMousedown = e => {
      // 每次点击时重新获取最新的行索引
      const existCells = Array.from(this.domNode.querySelectorAll('.qldb-row-tool-cell'));
      const rowIndex = existCells.indexOf(cell);
      
      document.addEventListener('mousemove', handleDrag, false);
      document.addEventListener('mouseup', handleMouseup, false);

      tableRect = this.table.getBoundingClientRect();
      cellRect = cell.getBoundingClientRect();
      
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
    
    const handleDrag = e => {
      e.preventDefault();

      if (dragging) {
        y = e.clientY;
        
        if (height0 + y - y0 >= CELL_MIN_WIDTH) {
          delta = y - y0;
        } else {
          delta = CELL_MIN_WIDTH - height0;
        }

        css($helpLine, {
          'top': `${cellRect.top + cellRect.height - 1 + delta}px`
        });
      }
    };

    const handleMouseup = e => {
      e.preventDefault();
      
      // 在mouseup时再次获取最新的行索引
      const existCells = Array.from(this.domNode.querySelectorAll('.qldb-row-tool-cell'));
      const rowIndex = existCells.indexOf(cell);
      const rowsInTable = tableContainer.rows();
      const rowBlot = rowsInTable[rowIndex];

      if (dragging && rowBlot && rowIndex >= 0) {
        const newHeight = height0 + delta;
        const rowElement = rowBlot.domNode;
        if (rowElement) {
          // 同步更新行和工具单元格的高度
          css(rowElement, {
            'min-height': `${newHeight}px`,
            'height': `${newHeight}px`
          });
          
          css(cell, { 
            'min-height': `${newHeight}px`,
            'height': `${newHeight}px`
          });
          
          // 延迟执行高度更新以确保DOM更新完成
          setTimeout(() => {
            this.updateRowToolContainerHeight();
          }, 0);
        }
        
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
      
      tableContainer.updateTableWidth();
      
      const tableSelection = this.quill.getModule('better-table').tableSelection;
      tableSelection && tableSelection.clearSelection();
    };
    
    $holder.addEventListener('mousedown', handleMousedown, false);
  }

  rowToolCells() {
    return Array.from(this.domNode.querySelectorAll('.qldb-row-tool-cell'));
  }

  updateRowToolContainerHeight() {
    const tableContainer = Quill.find(this.table);
    
    // 使用表格的实际高度作为工具栏高度
    const tableHeight = this.table.offsetHeight;
    
    // 更新工具栏容器高度
    if (this.domNode) {
      css(this.domNode, {
        'height': `${tableHeight}px`
      });
      
      // 添加调试信息
      console.log('更新工具栏高度:', tableHeight);
    }
  }
}
