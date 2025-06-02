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

    this.initRowTool();
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
    const tableHeight = Array.from(this.table.querySelectorAll("tr")).reduce(
      (sum, row) => sum + row.offsetHeight,
      0
    );

    // 使用表格实际高度作为工具栏高度
    const toolStyle = {
      width: `${ROW_TOOL_WIDTH}px`,
      height: `${tableHeight}px`, // 明确设置高度
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
  // 用来表格内输入内容同步高度的
  syncRowHeightsWithContent() {
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
    let rowElement = null;

    // 在mousedown时获取最新的行索引
    const handleMousedown = (e) => {
      document.addEventListener("mousemove", handleDrag, false);
      document.addEventListener("mouseup", handleMouseup, false);

      tableRect = this.table.getBoundingClientRect();
      cellRect = cell.getBoundingClientRect();

      // 获取行元素的实际高度
      const existCells = Array.from(
        this.domNode.querySelectorAll(".qldb-row-tool-cell")
      );
      const rowIndex = existCells.indexOf(cell);
      rowElement = tableContainer.rows()[rowIndex]?.domNode;
      height0 = rowElement?.offsetHeight || CELL_MIN_HEIGHT;

      $helpLine = document.createElement("div");
      css($helpLine, {
        position: "fixed",
        left: `${cellRect.left}px`,
        top: `${cellRect.top + cellRect.height - 1}px`,
        zIndex: "100",
        width: `${tableRect.width + ROW_TOOL_WIDTH + 4}px`,
        height: "1px",
        backgroundColor: PRIMARY_COLOR,
      });

      document.body.appendChild($helpLine);

      dragging = true;
      y0 = e.clientY;
      $holder.classList.add("dragging");
    };

    const handleDrag = (e) => {
      e.preventDefault();

      if (dragging) {
        y = e.clientY;

        // 计算delta为相对于初始位置的垂直差值
        delta = y - y0;
        console.log(this.getRowContentMinHeight(rowElement));
        // 确保行高不小于最小值
        if (height0 + delta >= CELL_MIN_HEIGHT) {
          css($helpLine, {
            top: `${cellRect.top + cellRect.height - 1 + delta}px`,
          });
        } else {
          delta = CELL_MIN_HEIGHT - height0;
          css($helpLine, {
            top: `${cellRect.top + cellRect.height - 1 + delta}px`,
          });
        }
      }
    };

    const handleMouseup = (e) => {
      e.preventDefault();

      const existCells = Array.from(
        this.domNode.querySelectorAll(".qldb-row-tool-cell")
      );
      const rowIndex = existCells.indexOf(cell);
      const rowsInTable = tableContainer.rows();
      const rowBlot = rowsInTable[rowIndex];

      if (dragging && rowBlot && rowIndex >= 0) {
        // 确保行高不小于最小值
        const newHeight = Math.max(height0 + delta, CELL_MIN_HEIGHT);
        const rowElement = rowBlot.domNode;
        if (rowElement) {
          if (height0 + delta <= this.getRowContentMinHeight(rowElement)) {
            // 这边还需要添加一段逻辑，即行高不能小于内部元素加在一起的 offsetheight
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

        y0 = 0;
        y = 0;
        delta = 0;
        height0 = 0;
        dragging = false;
        $holder.classList.remove("dragging");
      }

      document.removeEventListener("mousemove", handleDrag, false);
      document.removeEventListener("mouseup", handleMouseup, false);
      tableRect = {};
      cellRect = {};
      $helpLine.remove();
      $helpLine = null;

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
    if (this.domNode) {
      css(this.domNode, {
        height: `${tableHeight}px`,
      });

      // 添加调试信息
      console.log("更新工具栏高度:", tableHeight);
    }
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
    const cells = Array.from(rowElement.querySelectorAll('td, th'));
    let maxContentHeight = 0;
    
    // 计算每个单元格内子元素的高度总和
    cells.forEach(cell => {
      let cellTotalHeight = 0;
      
      // 获取所有可见子元素
      const visibleChildren = Array.from(cell.children).filter(child => {
        const style = window.getComputedStyle(child);
        return style.display !== 'none' && style.visibility !== 'hidden';
      });
      
      // 累加子元素高度
      visibleChildren.forEach(child => {
        cellTotalHeight += child.offsetHeight;
      });
      
      // 考虑子元素之间的间隙
      if (visibleChildren.length > 1) {
        const margins = visibleChildren.slice(0, -1).reduce((sum, child) => {
          const marginBottom = parseInt(window.getComputedStyle(child).marginBottom) || 0;
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
}
