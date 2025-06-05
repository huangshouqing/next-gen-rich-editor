// 添加行高调整工具类
import Quill from "quill-next";
import { css } from "../utils";
const ROW_TOOL_WIDTH = 12;
const ROW_TOOL_HEIGHT = 12;
const CELL_MIN_HEIGHT = 30;
const PRIMARY_COLOR = "#35A7ED";
export default class TableRowTool {
  constructor(table, quill, options) {
    if (!table) return null;
    this.table = table;
    this.quill = quill;
    this.options = options;
    this.domNode = null;
    
    // 添加观察器
    this.resizeObserver = null;
    this.mutationObserver = null;
    this.observedCells = new Set();
    
    // 添加活动拖拽状态跟踪
    this.activeDragData = new Set(); // 跟踪所有活动的拖拽操作
    
    // 防抖函数，避免频繁更新
    this.updateDebounced = this.debounce(() => {
      this.syncRowHeightsWithContent();
    }, 30); // 从100ms减少到30ms，响应更快

    this.initRowTool();
    this.setupAutoHeightListening();
    this.setupGlobalCleanup(); // 添加全局清理机制
  }

  // 添加防抖函数
  debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
      const later = () => {
        clearTimeout(timeout);
        func(...args);
      };
      clearTimeout(timeout);
      timeout = setTimeout(later, wait);
    };
  }

  // 设置自动高度监听
  setupAutoHeightListening() {
    // 使用 ResizeObserver 监听单元格尺寸变化
    if (window.ResizeObserver) {
      this.resizeObserver = new ResizeObserver((entries) => {
        let shouldUpdate = false;
        let hasSignificantChange = false;
        
        entries.forEach((entry) => {
          // 检查是否是高度变化
          const newHeight = entry.contentRect.height;
          const element = entry.target;
          
          if (element._lastObservedHeight !== newHeight) {
            console.log(`ResizeObserver 检测到高度变化: ${element._lastObservedHeight} -> ${newHeight}`);
            element._lastObservedHeight = newHeight;
            shouldUpdate = true;
            
            // 如果高度变化超过5px，认为是显著变化，立即更新
            const heightDifference = Math.abs(newHeight - (element._lastObservedHeight || 0));
            if (heightDifference > 5) {
              hasSignificantChange = true;
            }
          }
        });
        
        if (shouldUpdate) {
          if (hasSignificantChange) {
            // 显著变化立即更新，不使用防抖
            this.syncRowHeightsWithContent();
          } else {
            // 小幅变化使用防抖
            this.updateDebounced();
          }
        }
      });
    }

    // 使用 MutationObserver 监听 DOM 结构变化
    this.mutationObserver = new MutationObserver((mutations) => {
      let shouldUpdate = false;
      
      mutations.forEach((mutation) => {
        // 监听子节点变化（包括删除）
        if (mutation.type === 'childList') {
          if (mutation.addedNodes.length > 0) {
            console.log('MutationObserver 检测到节点添加:', mutation.addedNodes);
            shouldUpdate = true;
          }
          if (mutation.removedNodes.length > 0) {
            console.log('MutationObserver 检测到节点删除:', mutation.removedNodes);
            shouldUpdate = true;
            
            // 对于删除操作，延迟一下再检查，确保DOM更新完成
            setTimeout(() => {
              this.updateDebounced();
            }, 20);
          }
        }
        
        // 监听属性变化（如 style 属性）
        if (mutation.type === 'attributes') {
          if (mutation.attributeName === 'style') {
            console.log('MutationObserver 检测到样式变化:', mutation.target);
            shouldUpdate = true;
          }
          if (mutation.attributeName === 'class') {
            console.log('MutationObserver 检测到类名变化:', mutation.target);
            shouldUpdate = true;
          }
        }
        
        // 监听文本内容变化
        if (mutation.type === 'characterData') {
          console.log('MutationObserver 检测到文本变化:', mutation.target);
          shouldUpdate = true;
        }
      });
      
      if (shouldUpdate) {
        this.updateDebounced();
      }
    });

    // 开始监听表格
    this.startObserving();
    
    // 额外添加一个定时检查机制，作为备用方案
    this.setupPeriodicCheck();
    
    // 监听 Quill 编辑器的文本变化事件
    this.setupQuillTextChangeListener();
  }

  // 添加定时检查机制作为备用方案
  setupPeriodicCheck() {
    this.cellHeightCache = new Map();
    
    // 每500ms检查一次单元格高度变化（作为备用机制）
    this.periodicCheckInterval = setInterval(() => {
      const cells = this.table.querySelectorAll('td, th');
      let hasHeightChange = false;
      
      cells.forEach(cell => {
        const currentHeight = cell.offsetHeight;
        const cachedHeight = this.cellHeightCache.get(cell);
        
        if (cachedHeight !== undefined && cachedHeight !== currentHeight) {
          console.log(`定时检查发现高度变化: ${cachedHeight} -> ${currentHeight}`);
          hasHeightChange = true;
        }
        
        this.cellHeightCache.set(cell, currentHeight);
      });
      
      if (hasHeightChange) {
        this.updateDebounced();
      }
    }, 200); // 从500ms减少到200ms，更快响应
  }

  // 监听 Quill 编辑器的文本变化
  setupQuillTextChangeListener() {
    this.quillTextChangeHandler = (delta, oldDelta, source) => {
      // 检查变化是否发生在当前表格内
      const range = this.quill.getSelection();
      if (range) {
        const [line] = this.quill.getLine(range.index);
        const cell = line?.parent?.parent;
        
        // 如果变化发生在当前表格的单元格内
        if (cell && this.table.contains(cell.domNode)) {
          console.log('Quill 文本变化检测到表格内容修改');
          // 延迟执行，确保DOM更新完成
          setTimeout(() => {
            this.updateDebounced();
          }, 50); // 从100ms减少到50ms
        }
      }
    };
    
    this.quill.on('text-change', this.quillTextChangeHandler);
  }

  // 开始监听表格中的所有单元格
  startObserving() {
    const cells = this.table.querySelectorAll('td, th');
    
    cells.forEach(cell => {
      this.observeCell(cell);
    });
  }

  // 监听单个单元格
  observeCell(cell) {
    if (this.observedCells.has(cell)) return;
    
    this.observedCells.add(cell);
    
    // ResizeObserver 监听尺寸变化
    if (this.resizeObserver) {
      this.resizeObserver.observe(cell);
      // 初始化高度记录
      cell._lastObservedHeight = cell.offsetHeight;
    }
    
    // MutationObserver 监听内容变化
    if (this.mutationObserver) {
      this.mutationObserver.observe(cell, {
        childList: true,
        subtree: true,
        attributes: true,
        attributeFilter: ['style', 'class'],
        characterData: true
      });
    }
  }

  // 停止监听单个单元格
  unobserveCell(cell) {
    if (!this.observedCells.has(cell)) return;
    
    this.observedCells.delete(cell);
    
    if (this.resizeObserver) {
      this.resizeObserver.unobserve(cell);
    }
    
    // MutationObserver 不支持单独取消监听，需要重新设置
    // 这里我们保持监听，在 destroy 时统一清理
  }

  // 重新扫描并监听新添加的单元格
  refreshObservedCells() {
    const currentCells = this.table.querySelectorAll('td, th');
    
    // 监听新添加的单元格
    currentCells.forEach(cell => {
      if (!this.observedCells.has(cell)) {
        this.observeCell(cell);
      }
    });
    
    // 清理已删除的单元格（可选，因为观察器会自动处理）
    this.observedCells.forEach(cell => {
      if (!this.table.contains(cell)) {
        this.unobserveCell(cell);
      }
    });
  }

  initRowTool() {
    const parent = this.quill.root.parentNode;
    const tableRect = this.table.getBoundingClientRect();
    const containerRect = parent.getBoundingClientRect();

    // 获取表格实际位置
    const tableViewRect = this.table.getBoundingClientRect();

    this.domNode = document.createElement("div");
    this.domNode.classList.add("qldb-row-tool");
    this.updateRowTools();

    // 计算表格总高度
    const tableHeight =
      Array.from(this.table.querySelectorAll("tr")).reduce(
        (sum, row) => sum + row.offsetHeight,
        0
      ) + 1;

    // 使用表格实际高度作为工具栏高度
    const toolStyle = {
      width: `${ROW_TOOL_WIDTH}px`,
      // height: `${tableHeight}px`, // 明确设置高度
      left: `${
        tableViewRect.left -
        containerRect.left +
        parent.scrollLeft -
        ROW_TOOL_WIDTH -
        5
      }px`,
      top: `${tableViewRect.top - containerRect.top + parent.scrollTop}px`,
    };

    css(this.domNode, toolStyle);
    parent.appendChild(this.domNode);

    // 添加调试信息
    console.log("初始化工具栏高度:", tableHeight);
  }
  // 更新表格行工具列和内容区同步
  syncRowHeightsWithContent() {
    console.log("自动触发行高同步更新");
    this.updateRowToolContainerHeight();
    this.updateRowTools();
  }
  createRowToolCell() {
    const toolCell = document.createElement("div");
    toolCell.classList.add("qldb-row-tool-cell");
    const resizeHolder = document.createElement("div");
    resizeHolder.classList.add("qldb-row-tool-cell-holder");

    // 修改样式为垂直方向调整
    const cellStyle = {
      width: `${ROW_TOOL_WIDTH}px`,
      position: "relative",
      cursor: "ns-resize",
      "min-height": `${CELL_MIN_HEIGHT}px`,
    };

    css(toolCell, cellStyle);
    toolCell.appendChild(resizeHolder);
    this.addRowCellHolderHandler(toolCell);

    return toolCell;
  }

  updateRowTools() {
    const tableContainer = Quill.find(this.table);
    const rowsInTable = tableContainer.rows();
    const existCells = Array.from(
      this.domNode.querySelectorAll(".qldb-row-tool-cell")
    );

    // 添加调试信息
    console.log("表格行数:", rowsInTable.length);
    console.log("现有工具单元格数:", existCells.length);

    for (
      let index = 0;
      index < Math.max(rowsInTable.length, existCells.length);
      index++
    ) {
      let row = rowsInTable[index];
      let toolCell = null;

      if (!existCells[index]) {
        toolCell = this.createRowToolCell();
        this.domNode.appendChild(toolCell);
        // 设置工具单元格的初始宽度
        const rowHeight = row?.domNode?.offsetHeight || CELL_MIN_HEIGHT;
        css(toolCell, {
          width: `${ROW_TOOL_WIDTH}px`,
          "min-height": `${rowHeight}px`,
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
        const rowHeight = row?.domNode?.offsetHeight || CELL_MIN_HEIGHT;
        css(toolCell, {
          "min-height": `${rowHeight}px`,
        });

        // 添加调试信息
        console.log(`更新单元格 - 索引:${index}, 高度:${rowHeight}`);
      }
    }
    
    // 刷新观察的单元格
    this.refreshObservedCells();
  }

  destroy() {
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
    
    // 清理观察器
    if (this.resizeObserver) {
      this.resizeObserver.disconnect();
      this.resizeObserver = null;
    }
    
    if (this.mutationObserver) {
      this.mutationObserver.disconnect();
      this.mutationObserver = null;
    }
    
    // 清理定时检查器
    if (this.periodicCheckInterval) {
      clearInterval(this.periodicCheckInterval);
      this.periodicCheckInterval = null;
    }
    
    // 清理高度缓存
    if (this.cellHeightCache) {
      this.cellHeightCache.clear();
      this.cellHeightCache = null;
    }
    
    // 清理 Quill 文本变化监听器
    if (this.quillTextChangeHandler) {
      this.quill.off('text-change', this.quillTextChangeHandler);
      this.quillTextChangeHandler = null;
    }
    
    // 清理观察的单元格集合
    this.observedCells.clear();
    
    // 清理活动拖拽数据集合
    if (this.activeDragData) {
      this.activeDragData.clear();
      this.activeDragData = null;
    }
    
    // 移除 DOM 节点
    if (this.domNode) {
      this.domNode.remove();
    }
    
    return null;
  }

  addRowCellHolderHandler(cell) {
    const tableContainer = Quill.find(this.table);
    const $holder = cell.querySelector(".qldb-row-tool-cell-holder");
    
    // 创建拖拽数据对象，用于跟踪和清理
    const dragData = {
      dragging: false,
      y0: 0,
      y: 0,
      delta: 0,
      height0: 0,
      tableRect: {},
      cellRect: {},
      $helpLine: null,
      rowElement: null,
      $holder: $holder,
      handleDrag: null,
      handleMouseup: null
    };

    // 在mousedown时获取最新的行索引
    const handleMousedown = (e) => {
      // 先清理其他可能的拖拽状态
      this.cleanupAllDragStates();
      
      // 创建新的事件处理器并绑定到 dragData
      dragData.handleDrag = (e) => handleDrag(e, dragData);
      dragData.handleMouseup = (e) => handleMouseup(e, dragData);
      
      document.addEventListener("mousemove", dragData.handleDrag, false);
      document.addEventListener("mouseup", dragData.handleMouseup, false);
      
      // 添加额外的清理触发器
      document.addEventListener("mouseleave", dragData.handleMouseup, false);
      window.addEventListener("blur", dragData.handleMouseup, false);

      dragData.tableRect = this.table.getBoundingClientRect();
      dragData.cellRect = cell.getBoundingClientRect();

      // 获取行元素的实际高度
      const existCells = Array.from(
        this.domNode.querySelectorAll(".qldb-row-tool-cell")
      );
      const rowIndex = existCells.indexOf(cell);
      dragData.rowElement = tableContainer.rows()[rowIndex]?.domNode;
      dragData.height0 = dragData.rowElement?.offsetHeight || CELL_MIN_HEIGHT;

      dragData.$helpLine = document.createElement("div");
      css(dragData.$helpLine, {
        position: "fixed",
        left: `${dragData.cellRect.left}px`,
        top: `${dragData.cellRect.top + dragData.cellRect.height - 1}px`,
        zIndex: "100",
        width: `${dragData.tableRect.width + ROW_TOOL_WIDTH + 4}px`,
        height: "1px",
        backgroundColor: PRIMARY_COLOR,
      });

      document.body.appendChild(dragData.$helpLine);

      dragData.dragging = true;
      dragData.y0 = e.clientY;
      $holder.classList.add("dragging");
      
      // 将拖拽数据添加到活动跟踪集合
      this.activeDragData.add(dragData);
      
      // 添加超时清理作为最后的保障
      dragData.timeoutCleanup = setTimeout(() => {
        console.log('拖拽超时，执行强制清理');
        this.cleanupDragState(dragData);
        this.activeDragData.delete(dragData);
      }, 10000); // 10秒后强制清理
    };

    const handleDrag = (e, dragData) => {
      e.preventDefault();

      if (dragData.dragging && dragData.$helpLine) {
        dragData.y = e.clientY;

        // 计算delta为相对于初始位置的垂直差值
        dragData.delta = dragData.y - dragData.y0;
        console.log(this.getRowContentMinHeight(dragData.rowElement));
        // 确保行高不小于最小值
        if (dragData.height0 + dragData.delta >= CELL_MIN_HEIGHT) {
          css(dragData.$helpLine, {
            top: `${dragData.cellRect.top + dragData.cellRect.height - 1 + dragData.delta}px`,
          });
        } else {
          dragData.delta = CELL_MIN_HEIGHT - dragData.height0;
          css(dragData.$helpLine, {
            top: `${dragData.cellRect.top + dragData.cellRect.height - 1 + dragData.delta}px`,
          });
        }
      }
    };

    const handleMouseup = (e, dragData) => {
      e.preventDefault();
      
      // 清理超时定时器
      if (dragData.timeoutCleanup) {
        clearTimeout(dragData.timeoutCleanup);
      }

      const existCells = Array.from(
        this.domNode.querySelectorAll(".qldb-row-tool-cell")
      );
      const rowIndex = existCells.indexOf(cell);
      const rowsInTable = tableContainer.rows();
      const rowBlot = rowsInTable[rowIndex];

      if (dragData.dragging && rowBlot && rowIndex >= 0) {
        // 确保行高不小于最小值
        const newHeight = Math.max(dragData.height0 + dragData.delta, CELL_MIN_HEIGHT);
        const rowElement = rowBlot.domNode;
        if (rowElement) {
          if (dragData.height0 + dragData.delta <= this.getRowContentMinHeight(rowElement)) {
            // 这边还需要添加一段逻辑，即行高不能小于内部元素加在一起的 offsetheight
            css(rowElement, {
              "min-height": `${this.getRowContentMinHeight(rowElement)}px`,
              height: `${this.getRowContentMinHeight(rowElement)}px`,
            });

            css(cell, {
              "min-height": `${this.getRowContentMinHeight(rowElement)}px`,
              height: `${this.getRowContentMinHeight(rowElement)}px`,
            });
          } else {
            // 同步更新行和工具单元格的高度
            css(rowElement, {
              "min-height": `${newHeight}px`,
              height: `${newHeight}px`,
            });

            css(cell, {
              "min-height": `${newHeight}px`,
              height: `${newHeight}px`,
            });
          }

          // 延迟执行高度更新以确保DOM更新完成
          setTimeout(() => {
            this.updateRowToolContainerHeight();
          }, 0);
        }
      }

      // 清理拖拽状态
      this.cleanupDragState(dragData);
      this.activeDragData.delete(dragData);

      // 移除额外的事件监听器
      document.removeEventListener("mouseleave", dragData.handleMouseup, false);
      window.removeEventListener("blur", dragData.handleMouseup, false);

      tableContainer.updateTableWidth();

      const tableSelection =
        this.quill.getModule("better-table").tableSelection;
      tableSelection && tableSelection.clearSelection();
    };

    $holder.addEventListener("mousedown", handleMousedown, false);
  }

  rowToolCells() {
    return Array.from(this.domNode.querySelectorAll(".qldb-row-tool-cell"));
  }

  updateRowToolContainerHeight() {
    const tableContainer = Quill.find(this.table);

    // 使用表格的实际高度作为工具栏高度
    const tableHeight = this.table.offsetHeight;

    // 更新工具栏容器高度
    // if (this.domNode) {
    //   css(this.domNode, {
    //     height: `${tableHeight}px`,
    //   });

    //   // 添加调试信息
    //   console.log("更新工具栏高度:", tableHeight);
    // }
  }

  // 新增方法：获取单元格最小宽度（考虑内部元素）
  getCellMinWidth(cell) {
    if (!cell) return CELL_MIN_HEIGHT;

    // 考虑padding和border
    const padding =
      parseInt(window.getComputedStyle(cell).paddingLeft) +
      parseInt(window.getComputedStyle(cell).paddingRight);
    const border =
      parseInt(window.getComputedStyle(cell).borderLeftWidth) +
      parseInt(window.getComputedStyle(cell).borderRightWidth);

    // 计算实际内容宽度
    const contentWidth = cell.scrollWidth;

    // 添加额外的安全边距
    return contentWidth + padding + border + 4; // 添加4px安全间距
  }

  // 新增方法：获取单元格最小高度（考虑内部元素）
  // getCellMinHeight(cell) {
  //   if (!cell) return CELL_MIN_HEIGHT;

  //   // 考虑padding和border
  //   const padding =
  //     parseInt(window.getComputedStyle(cell).paddingTop) +
  //     parseInt(window.getComputedStyle(cell).paddingBottom);
  //   const border =
  //     parseInt(window.getComputedStyle(cell).borderTopWidth) +
  //     parseInt(window.getComputedStyle(cell).borderBottomWidth);

  //   // 计算实际内容高度
  //   const contentHeight = cell.scrollHeight;

  //   // 添加额外的安全边距
  //   return contentHeight + padding + border + 4; // 添加4px安全间距
  // }

  // 修改方法：获取行内容最小高度（基于子元素高度总和）
  getRowContentMinHeight(rowElement) {
    if (!rowElement) return CELL_MIN_WIDTH;

    // 获取行内所有单元格
    const cells = Array.from(rowElement.querySelectorAll("td, th"));
    let maxContentHeight = 0;

    // 计算每个单元格内子元素的高度总和
    cells.forEach((cell) => {
      let cellTotalHeight = 0;

      // 获取所有可见子元素
      const visibleChildren = Array.from(cell.children).filter((child) => {
        const style = window.getComputedStyle(child);
        return style.display !== "none" && style.visibility !== "hidden";
      });

      // 累加子元素高度
      visibleChildren.forEach((child) => {
        cellTotalHeight += child.offsetHeight;
      });

      // 考虑子元素之间的间隙
      if (visibleChildren.length > 1) {
        const margins = visibleChildren.slice(0, -1).reduce((sum, child) => {
          const marginBottom =
            parseInt(window.getComputedStyle(child).marginBottom) || 0;
          return sum + marginBottom;
        }, 0);

        cellTotalHeight += margins;
      }

      // 更新最大高度
      if (cellTotalHeight > maxContentHeight) {
        maxContentHeight = cellTotalHeight;
      }
    });

    // 添加额外的安全边距
    return maxContentHeight + 8; // 增加安全间距
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
    console.log('执行全局拖拽状态清理');
    
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
        console.log('发现并清理遗留的辅助线元素');
        element.remove();
      }
    });
  }
}
