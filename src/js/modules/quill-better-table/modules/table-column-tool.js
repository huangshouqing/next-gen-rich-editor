import Quill from 'quill-next'
import { css } from '../utils'

const COL_TOOL_HEIGHT = 12
const COL_TOOL_CELL_HEIGHT = 12
const ROW_TOOL_WIDTH = 12
const CELL_MIN_WIDTH = 50
const PRIMARY_COLOR = '#35A7ED'

export default class TableColumnTool {
  constructor (table, quill, options) {
    if (!table) return null
    this.table = table
    this.quill = quill
    this.options = options
    this.domNode = null
    
    // 添加活动拖拽状态跟踪
    this.activeDragData = new Set() // 跟踪所有活动的拖拽操作

    this.initColTool()
    this.setupGlobalCleanup() // 添加全局清理机制
  }

  // 添加全局清理机制
  setupGlobalCleanup() {
    // 当窗口失焦时清理所有拖拽状态
    this.windowBlurHandler = () => {
      this.cleanupAllDragStates();
    };
    
    // 当鼠标离开窗口时清理
    this.windowMouseLeaveHandler = () => {
      this.cleanupAllDragStates();
    };
    
    // 当按下 ESC 键时清理
    this.escKeyHandler = (e) => {
      if (e.key === 'Escape') {
        this.cleanupAllDragStates();
      }
    };
    
    // 定时清理遗留的辅助线元素
    this.cleanupInterval = setInterval(() => {
      this.cleanupOrphanedHelpLines();
    }, 2000); // 每2秒检查一次
    
    window.addEventListener('blur', this.windowBlurHandler);
    document.addEventListener('mouseleave', this.windowMouseLeaveHandler);
    document.addEventListener('keydown', this.escKeyHandler);
  }

  // 清理所有拖拽状态
  cleanupAllDragStates() {
    console.log('执行列工具全局拖拽状态清理');
    
    // 清理所有活动的拖拽数据
    this.activeDragData.forEach(dragData => {
      this.cleanupDragState(dragData);
    });
    this.activeDragData.clear();
    
    // 清理所有可能遗留的辅助线
    this.cleanupOrphanedHelpLines();
  }

  // 清理单个拖拽状态
  cleanupDragState(dragData) {
    if (!dragData) return;
    
    // 移除事件监听器
    if (dragData.handleDrag) {
      document.removeEventListener("mousemove", dragData.handleDrag, false);
    }
    if (dragData.handleMouseup) {
      document.removeEventListener("mouseup", dragData.handleMouseup, false);
    }
    
    // 清理辅助线
    if (dragData.$helpLine && dragData.$helpLine.parentNode) {
      dragData.$helpLine.remove();
    }
    
    // 重置拖拽状态
    if (dragData.$holder) {
      dragData.$holder.classList.remove("dragging");
    }
    
    // 重置变量
    dragData.dragging = false;
    dragData.$helpLine = null;
  }

  // 清理遗留的辅助线元素
  cleanupOrphanedHelpLines() {
    // 查找所有可能的辅助线元素（根据样式特征）
    const potentialHelpLines = document.querySelectorAll('div[style*="position: fixed"][style*="background-color: rgb(53, 167, 237)"]');
    
    potentialHelpLines.forEach(element => {
      // 检查是否是遗留的辅助线
      const styles = element.style;
      if (styles.position === 'fixed' && 
          styles.zIndex === '100' && 
          styles.backgroundColor === 'rgb(53, 167, 237)' &&
          (styles.height === '1px' || styles.width === '1px')) {
        console.log('发现并清理遗留的列工具辅助线元素');
        element.remove();
      }
    });
  }

  initColTool () {
    const parent = this.quill.root.parentNode
    const tableRect = this.table.getBoundingClientRect()
    const containerRect = parent.getBoundingClientRect()
    const tableViewRect = this.table.parentNode.getBoundingClientRect()

    this.domNode = document.createElement('div')
    this.domNode.classList.add('qlbt-col-tool')
    this.updateToolCells()
    parent.appendChild(this.domNode)
    css(this.domNode, {
      width: `${tableViewRect.width}px`,
      height: `${COL_TOOL_HEIGHT}px`,
      left: `${tableViewRect.left - containerRect.left + parent.scrollLeft}px`,
      top: `${tableViewRect.top - containerRect.top + parent.scrollTop - COL_TOOL_HEIGHT - 5}px`
    })
  }

  createToolCell () {
    const toolCell = document.createElement('div')
    toolCell.classList.add('qlbt-col-tool-cell')
    const resizeHolder = document.createElement('div')
    resizeHolder.classList.add('qlbt-col-tool-cell-holder')
    css(toolCell, {
      'height': `${COL_TOOL_CELL_HEIGHT}px`
    })
    toolCell.appendChild(resizeHolder)
    return toolCell
  }

  updateToolCells () {
    const tableContainer = Quill.find(this.table)
    const CellsInFirstRow = tableContainer.children.tail.children.head.children
    const tableCols = tableContainer.colGroup().children
    const cellsNumber = computeCellsNumber(CellsInFirstRow)
    let existCells = Array.from(this.domNode.querySelectorAll('.qlbt-col-tool-cell'))

    for (let index = 0; index < Math.max(cellsNumber, existCells.length); index++) {
      let col = tableCols.at(index)
      let colWidth = col && parseInt(col.formats()[col.statics.blotName].width, 10)
      // if cell already exist
      let toolCell = null
      if (!existCells[index]) {
        toolCell = this.createToolCell()
        this.domNode.appendChild(toolCell)
        this.addColCellHolderHandler(toolCell)
        // set tool cell min-width
        css(toolCell, {
          'min-width': `${colWidth}px`
        })
      } else if (existCells[index] && index >= cellsNumber) {
        existCells[index].remove()
      } else {
        toolCell = existCells[index]
        // set tool cell min-width
        css(toolCell, {
          'min-width': `${colWidth}px`
        })
      }
    }
  }

  destroy () {
    // 清理所有活动的拖拽状态
    this.cleanupAllDragStates();
    
    // 清理全局事件监听器
    if (this.windowBlurHandler) {
      window.removeEventListener('blur', this.windowBlurHandler);
      this.windowBlurHandler = null;
    }
    
    if (this.windowMouseLeaveHandler) {
      document.removeEventListener('mouseleave', this.windowMouseLeaveHandler);
      this.windowMouseLeaveHandler = null;
    }
    
    if (this.escKeyHandler) {
      document.removeEventListener('keydown', this.escKeyHandler);
      this.escKeyHandler = null;
    }
    
    // 清理定时清理器
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
    }
    
    // 清理活动拖拽数据集合
    if (this.activeDragData) {
      this.activeDragData.clear();
      this.activeDragData = null;
    }
    
    this.domNode.remove()
    return null
  }

  addColCellHolderHandler(cell) {
    const tableContainer = Quill.find(this.table)
    const $holder = cell.querySelector(".qlbt-col-tool-cell-holder")
    
    // 创建拖拽数据对象，用于跟踪和清理
    const dragData = {
      dragging: false,
      x0: 0,
      x: 0,
      delta: 0,
      width0: 0,
      tableRect: {},
      cellRect: {},
      $helpLine: null,
      $holder: $holder,
      handleDrag: null,
      handleMouseup: null
    };

    const handleDrag = (e, dragData) => {
      e.preventDefault()

      if (dragData.dragging && dragData.$helpLine) {
        dragData.x = e.clientX

        if (dragData.width0 + dragData.x - dragData.x0 >= CELL_MIN_WIDTH) {
          dragData.delta = dragData.x - dragData.x0
        } else {
          dragData.delta = CELL_MIN_WIDTH - dragData.width0
        }

        css(dragData.$helpLine, {
          'left': `${dragData.cellRect.left + dragData.cellRect.width - 1 + dragData.delta}px`
        })
      }
    }

    const handleMouseup = (e, dragData) => {
      e.preventDefault()
      
      // 清理超时定时器
      if (dragData.timeoutCleanup) {
        clearTimeout(dragData.timeoutCleanup);
      }
      
      const existCells = Array.from(this.domNode.querySelectorAll('.qlbt-col-tool-cell'))
      const colIndex = existCells.indexOf(cell)
      const colBlot = tableContainer.colGroup().children.at(colIndex)

      if (dragData.dragging) {
        colBlot.format('width', dragData.width0 + dragData.delta)
        css(cell, { 'min-width': `${dragData.width0 + dragData.delta}px` })
      }

      // 清理拖拽状态
      this.cleanupDragState(dragData);
      this.activeDragData.delete(dragData);

      // 移除额外的事件监听器
      document.removeEventListener("mouseleave", dragData.handleMouseup, false);
      window.removeEventListener("blur", dragData.handleMouseup, false);

      tableContainer.updateTableWidth()

      const tableSelection = this.quill.getModule('better-table').tableSelection
      tableSelection && tableSelection.clearSelection()
    }

    const handleMousedown = e => {
      // 先清理其他可能的拖拽状态
      this.cleanupAllDragStates();
      
      // 创建新的事件处理器并绑定到 dragData
      dragData.handleDrag = (e) => handleDrag(e, dragData);
      dragData.handleMouseup = (e) => handleMouseup(e, dragData);
      
      document.addEventListener('mousemove', dragData.handleDrag, false)
      document.addEventListener('mouseup', dragData.handleMouseup, false)
      
      // 添加额外的清理触发器
      document.addEventListener("mouseleave", dragData.handleMouseup, false);
      window.addEventListener("blur", dragData.handleMouseup, false);

      dragData.tableRect = this.table.getBoundingClientRect()
      dragData.cellRect = cell.getBoundingClientRect()
      dragData.$helpLine = document.createElement('div')
      css(dragData.$helpLine, {
        position: 'fixed',
        top: `${dragData.cellRect.top}px`,
        left: `${dragData.cellRect.left + dragData.cellRect.width - 1}px`,
        zIndex: '100',
        height: `${dragData.tableRect.height + COL_TOOL_HEIGHT + 4}px`,
        width: '1px',
        backgroundColor: PRIMARY_COLOR
      })

      document.body.appendChild(dragData.$helpLine)
      dragData.dragging = true
      dragData.x0 = e.clientX
      dragData.width0 = dragData.cellRect.width
      $holder.classList.add('dragging')
      
      // 将拖拽数据添加到活动跟踪集合
      this.activeDragData.add(dragData);
      
      // 添加超时清理作为最后的保障
      dragData.timeoutCleanup = setTimeout(() => {
        console.log('列工具拖拽超时，执行强制清理');
        this.cleanupDragState(dragData);
        this.activeDragData.delete(dragData);
      }, 10000); // 10秒后强制清理
    }
    $holder.addEventListener('mousedown', handleMousedown, false)
  }

  colToolCells () {
    return Array.from(this.domNode.querySelectorAll('.qlbt-col-tool-cell'))
  }
}

function computeCellsNumber (CellsInFirstRow) {
  return CellsInFirstRow.reduce((sum, cell) => {
    const cellColspan = cell.formats().colspan
    sum = sum + parseInt(cellColspan, 10)
    return sum
  }, 0)
}
