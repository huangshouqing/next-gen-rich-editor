import EditorCore from "@/js/core/EditorCore";
import "@/css/table.css";
interface EditorDialog {
  dialog: HTMLDivElement | null;
}

export default class TableEditor implements EditorDialog {
  public editor: EditorCore;
  public dialog: HTMLDivElement | null;

  constructor(editor: EditorCore) {
    this.editor = editor;
    this.dialog = null;
  }

  /**
   * 打开网格选择器弹窗
   */
  /**
   * 打开网格选择器弹窗
   */
  public openGridSelector(): void {
    this.editor.saveSelection();
    const _this = this;
    const selector = document.createElement("div");
    selector.className = "table-grid-selector";
    selector.style.position = "absolute";
    selector.style.zIndex = "9999";
    selector.style.backgroundColor = "#fff";
    selector.style.border = "1px solid #ccc";
    selector.style.padding = "8px";
    selector.style.boxShadow = "0 2px 8px rgba(0,0,0,0.15)";
    selector.style.borderRadius = "4px";

    // 创建 5x5 的网格 + 确认按钮
    for (let r = 0; r < 10; r++) {
      const row = document.createElement("div");
      row.className = "grid-row";
      row.style.display = "flex";
      for (let c = 0; c < 10; c++) {
        const cell = document.createElement("div");
        cell.className = "grid-cell";
        cell.dataset.row = r.toString();
        cell.dataset.col = c.toString();
        cell.style.width = "15px";
        cell.style.height = "15px";
        cell.style.border = "1px solid #ddd";
        cell.style.cursor = "pointer";
        cell.style.margin = "2px";
        cell.style.backgroundColor = "#f9f9f9";
        row.appendChild(cell);
      }
      selector.appendChild(row);
    }

    // 添加信息提示和确认按钮
    const infoBar = document.createElement("div");
    infoBar.className = "selection-info";
    infoBar.style.marginTop = "10px";
    infoBar.style.fontSize = "14px";
    infoBar.style.textAlign = "center";
    infoBar.innerText = "请选择行列";
    selector.appendChild(infoBar);
    const confirmBtn = document.createElement("button");
    confirmBtn.className = "editor-table-cell-select-confirm-btn";
    confirmBtn.style.width = "100%";
    confirmBtn.style.padding = "6px";
    confirmBtn.style.fontSize = "14px";
    confirmBtn.style.backgroundColor = "#007bff";
    confirmBtn.style.color = "white";
    confirmBtn.style.border = "none";
    confirmBtn.style.borderRadius = "4px";
    confirmBtn.style.cursor = "pointer";
    confirmBtn.style.display = "none"; // 初始隐藏
    confirmBtn.innerText = "确认";
    selector.appendChild(confirmBtn);
    // 设置位置：紧贴工具栏按钮下方
    const toolbarBtn = document.querySelector(
      "#insert-table-btn"
    ) as HTMLElement;
    if (toolbarBtn) {
      const rect = toolbarBtn.getBoundingClientRect();
      // 基于视口位置设置
      selector.style.top = `${rect.bottom + window.scrollY}px`;
      selector.style.left = `${rect.left + window.scrollX}px`;
    }
    document.body.appendChild(selector);
    let isDragging = false;
    // 鼠标进入高亮
    selector.querySelectorAll(".grid-cell").forEach((cell) => {
      cell.addEventListener("mouseenter", () => {
        if (!isDragging) return;
        clearSelection();
        highlightCells(
          parseInt(cell.dataset.row!),
          parseInt(cell.dataset.col!)
        );
      });

      cell.addEventListener("mousedown", () => {
        isDragging = true;
        clearSelection();
        highlightCells(
          parseInt(cell.dataset.row!),
          parseInt(cell.dataset.col!)
        );
      });
    });

    selector.addEventListener("mousedown", (e) => {
      isDragging = false;
    });
    // 点击外部关闭弹窗
    const handleClickOutside = (ev: MouseEvent) => {
      if (!selector.contains(ev.target as Node)) {
        selector.remove();
        document.removeEventListener("click", handleClickOutside);
      }
    };
    setTimeout(() => document.addEventListener("click", handleClickOutside), 0);
    let selectedRows = 0;
    let selectedCols = 0;
    function highlightCells(row: number, col: number) {
      selectedRows = row + 1;
      selectedCols = col + 1;

      selector.querySelectorAll(".grid-cell").forEach((cell) => {
        const r = parseInt(cell.dataset.row!);
        const c = parseInt(cell.dataset.col!);
        if (r <= row && c <= col) {
          cell.classList.add("selected");
        } else {
          cell.classList.remove("selected");
        }
      });

      const infoBar = selector.querySelector(".selection-info") as HTMLElement;
      infoBar.innerText = `已选中：${selectedRows} 行 × ${selectedCols} 列`;

      const confirmBtn = selector.querySelector(
        ".editor-table-cell-select-confirm-btn"
      ) as HTMLButtonElement;
      confirmBtn.style.display = "block";

      confirmBtn.onclick = () => {
        if (selectedRows > 0 && selectedCols > 0) {
          _this.insertTable(selectedRows, selectedCols);
          selector.remove();
          window.getSelection()?.removeAllRanges();
        }
      };
    }
    function clearSelection() {
      selector
        .querySelectorAll(".grid-cell")
        .forEach((cell) => cell.classList.remove("selected"));
    }
  }

  /**
   * 插入表格到编辑器内容中
   * @param rows 行数
   * @param cols 列数
   */
  public insertTable(rows: number, cols: number): void {
    const table = document.createElement("table");
    for (let i = 0; i < rows; i++) {
      const tr = table.insertRow();
      for (let j = 0; j < cols; j++) {
        const td = tr.insertCell();
        td.innerHTML = "&nbsp;";
      }
    }
    const editorContent =
      this.editor.container?.querySelector(".editor-content");
    if (!editorContent) {
      console.error("无法找到 .editor-content 元素");
      return;
    }
    // 确保编辑区域有焦点
    editorContent.focus();
    this.editor.restoreSelection();
    // 创建 Range 并插入表格
    const selection = window.getSelection();
    const range = selection?.getRangeAt(0);
    if (range) {
      const parser = new DOMParser();
      const doc = parser.parseFromString(table.outerHTML, "text/html");
      const parsedTable = doc.body.firstChild as HTMLElement;
      range.insertNode(parsedTable); // 插入表格节点
    } else {
      editorContent.appendChild(table); // 默认追加到最后
    }
    // 新增失焦监听清空选中 cell 效果
    table.addEventListener("focusout", (e) => {
      this._clearCellSelection(table);
    });
  }

  /**
   * 初始化右键菜单功能
   */
  public initContextMenu(editorContent: Element): void {
    editorContent.addEventListener("contextmenu", (e: Event) => {
      const target = e.target as HTMLElement;

      let table: HTMLTableElement | null = null;
      if (target.tagName === "TD" || target.tagName === "TH") {
        // this._clearCellSelection(target.closest("table")!); // 先清空其他选中
        target.classList.add("selected-cell");
        table = target.closest("table");
      } else if (target.tagName === "TABLE") {
        table = target;
      }

      if (!table) return;

      e.preventDefault();

      // 创建右键菜单
      const menu = document.createElement("div");
      menu.className = "table-context-menu";
      menu.innerHTML = `
        <ul>
          <li data-action="add-row">新增行</li>
          <li data-action="add-col">新增列</li>
          <li data-action="delete-row">删除行</li>
          <li data-action="delete-col">删除列</li>
          <li data-action="merge-cells">合并单元格</li>
          <li data-action="unmerge-cells">取消合并</li>
          <li data-action="set-bgcolor">设置背景色</li>
        </ul>
      `;
      menu.style.position = "absolute";
      menu.style.top = `${e.clientY}px`;
      menu.style.left = `${e.clientX}px`;
      menu.style.backgroundColor = "#fff";
      menu.style.border = "1px solid #ccc";
      menu.style.padding = "8px";
      menu.style.zIndex = "9999";
      menu.style.boxShadow = "0 2px 8px rgba(0,0,0,0.1)";
      menu.style.fontSize = "14px";
      menu.style.cursor = "pointer";

      document.body.appendChild(menu);

      menu.querySelectorAll("li").forEach((item) => {
        item.addEventListener("click", () => {
          const action = item.getAttribute("data-action");
          switch (action) {
            case "merge-cells":
              this.mergeCells(table!);
              break;
            case "unmerge-cells":
              this.unmergeCells(table!);
              break;
            case "set-bgcolor":
              this.openColorPickerForSelection(table!);
              break;
            case "add-row":
              this.addRow(table!);
              break;
            case "add-col":
              this.addColumn(table!);
              break;
            case "delete-row":
              this.deleteRow(table!);
              break;
            case "delete-col":
              this.deleteColumn(table!);
              break;
          }
          menu.remove();
        });
      });

      const closeMenu = (ev: MouseEvent) => {
        if (!menu.contains(ev.target as Node)) {
          menu.remove();
          document.removeEventListener("click", closeMenu);
        }
      };
      setTimeout(() => document.addEventListener("click", closeMenu), 0);

      // 新增全局点击监听
      const handleGlobalClick = (ev: MouseEvent) => {
        if (!table?.contains(ev.target as Node)) {
          this._clearCellSelection(table!);
          document.removeEventListener("click", handleGlobalClick);
        }
      };
      document.addEventListener("click", handleGlobalClick);
    });
  }

  /**
   * 初始化表格内单元格拖动选择功能
   */
  // public initTableCellSelection(table: HTMLTableElement): void {
  //   let isSelecting = false;
  //   let startCell: HTMLTableCellElement | null = null;

  //   // 新增：防止事件冒泡干扰
  //   const stopPropagation = (e: MouseEvent) => e.stopPropagation();

  //   const handleMouseDown = (e: MouseEvent) => {
  //     const target = e.target as HTMLElement;
  //     if (target.tagName === "TD" || target.tagName === "TH") {
  //       isSelecting = true;
  //       startCell = target as HTMLTableCellElement;
  //       clearSelection();
  //       highlightCell(startCell);
  //       table.style.userSelect = "none"; // 禁用文本选择
  //     }
  //   };

  //   const handleMouseMove = (e: MouseEvent) => {
  //     if (!isSelecting || !startCell) return;
  //     const target = e.target as HTMLElement;
  //     if (target.tagName === "TD" || target.tagName === "TH") {
  //       highlightCell(target as HTMLTableCellElement);
  //     }
  //   };

  //   const handleMouseUp = () => {
  //     isSelecting = false;
  //     startCell = null;
  //     table.style.userSelect = ""; // 恢复文本选择
  //   };

  //   // 优化后的高亮逻辑
  //   const highlightCell = (endCell: HTMLTableCellElement) => {
  //     const startRow = startCell!.parentElement!.rowIndex;
  //     const startCol = startCell!.cellIndex;
  //     const endRow = endCell.parentElement!.rowIndex;
  //     const endCol = endCell.cellIndex;

  //     const minRow = Math.min(startRow, endRow);
  //     const maxRow = Math.max(startRow, endRow);
  //     const minCol = Math.min(startCol, endCol);
  //     const maxCol = Math.max(startCol, endCol);

  //     // 遍历所有可见单元格（考虑合并单元格）
  //     table.querySelectorAll("td, th").forEach(cell => {
  //       const cellRow = cell.parentElement!.rowIndex;
  //       const cellCol = cell.cellIndex;

  //       // 判断是否在选中区域内
  //       const isInRange =
  //         cellRow >= minRow &&
  //         cellRow <= maxRow &&
  //         cellCol >= minCol &&
  //         cellCol <= maxCol;

  //       cell.classList.toggle("selected-cell", isInRange);
  //     });
  //   };

  //   // 绑定事件（新增 mousemove 监听）
  //   table.addEventListener("mousedown", handleMouseDown);
  //   table.addEventListener("mousemove", handleMouseMove);
  //   document.addEventListener("mouseup", handleMouseUp);

  //   // 防止事件冲突
  //   table.addEventListener("mousedown", stopPropagation);
  // }
  /**
   * 新增一行
   */
  public addRow(table: HTMLTableElement): void {
    const newRow = table.insertRow();
    const firstRow = table.rows[0];
    for (let i = 0; i < firstRow.cells.length; i++) {
      const newCell = newRow.insertCell();
      newCell.innerHTML = "&nbsp;";
    }
  }

  /**
   * 新增一列
   */
  public addColumn(table: HTMLTableElement): void {
    for (let row of Array.from(table.rows)) {
      const newCell = row.insertCell();
      newCell.innerHTML = "&nbsp;";
    }
  }

  /**
   * 删除当前选中行
   */
  public deleteRow(table: HTMLTableElement): void {
    // 获取被右键点击的单元格
    const selectedCell = table.querySelector(
      ".selected-cell"
    ) as HTMLTableCellElement;
    if (!selectedCell) return;

    // 找到对应的行
    const row = selectedCell.closest("tr") as HTMLTableRowElement;
    if (!row) return;

    // 删除前清理选中状态
    this._clearCellSelection(table);

    // 执行删除
    try {
      table.deleteRow(row.rowIndex);
    } catch (error) {
      console.error("删除行失败:", error);
    }
  }
  private _clearCellSelection(table?: HTMLTableElement): void {
    // 支持全局清除
    const tables = table
      ? [table]
      : Array.from(document.querySelectorAll("table"));
    tables.forEach((t) => {
      t.querySelectorAll(".selected-cell").forEach((cell) => {
        cell.classList.remove("selected-cell");
      });
    });
  }

  /**
   * 删除当前选中列
   */
  public deleteColumn(table: HTMLTableElement): void {
    // 获取被右键点击的单元格
    const selectedCell = table.querySelector(
      ".selected-cell"
    ) as HTMLTableCellElement;
    if (!selectedCell) return;

    const colIndex = selectedCell.cellIndex;

    // 遍历所有行（考虑合并单元格）
    Array.from(table.rows).forEach((row) => {
      // 找到当前行对应的列（可能被合并）
      const cell = row.cells[colIndex];
      if (!cell) return;

      // 处理跨列合并的情况
      if (cell.colSpan > 1) {
        cell.colSpan -= 1; // 减少合并跨度
      } else {
        row.deleteCell(colIndex); // 直接删除
      }
    });

    // 清理选中状态
    this._clearCellSelection(table);
  }

  /**
   * 合并单元格
   */
  public mergeCells(table: HTMLTableElement): void {
    const selectedCells = Array.from(
      table.querySelectorAll(".selected-cell")
    ) as HTMLTableCellElement[];

    if (selectedCells.length <= 1) return;

    // 获取合并区域边界
    const minRow = Math.min(
      ...selectedCells.map((c) => c.parentElement!.rowIndex)
    );
    const maxRow = Math.max(
      ...selectedCells.map((c) => c.parentElement!.rowIndex)
    );
    const minCol = Math.min(...selectedCells.map((c) => c.cellIndex));
    const maxCol = Math.max(...selectedCells.map((c) => c.cellIndex));

    // 主合并单元格
    const mergedCell = table.rows[minRow].cells[minCol];

    // 保存被合并单元格的原始内容（不删除）
    const hiddenCells = selectedCells.filter((c) => c !== mergedCell);
    hiddenCells.forEach((cell) => {
      cell.style.display = "none"; // 改为隐藏
      cell.dataset.merged = "true"; // 标记为被合并
    });

    // 设置合并属性
    mergedCell.rowSpan = maxRow - minRow + 1;
    mergedCell.colSpan = maxCol - minCol + 1;
    mergedCell.dataset.merged = "true"; // 标记主单元格

    this._clearCellSelection(table);
  }

  /**
   * 取消合并
   */
  public unmergeCells(table: HTMLTableElement): void {
    const mergedCell = table.querySelector(
      '[data-merged="true"]'
    ) as HTMLTableCellElement;
    if (!mergedCell) return;

    // 恢复隐藏的单元格
    table
      .querySelectorAll<HTMLTableCellElement>('[data-merged="true"]')
      .forEach((cell) => {
        cell.style.display = "";
        delete cell.dataset.merged;
      });

    // 移除合并属性
    mergedCell.removeAttribute("rowspan");
    mergedCell.removeAttribute("colspan");

    // 重建单元格结构
    const affectedRows = Array.from(table.rows).filter((row) =>
      row.cells.some((cell) => cell.dataset.merged)
    );

    affectedRows.forEach((row) => {
      const newCells = Array.from(row.cells).map((cell) => {
        if (cell.dataset.merged) {
          const newCell = document.createElement("td");
          newCell.innerHTML = cell.innerHTML;
          return newCell;
        }
        return cell;
      });

      row.innerHTML = "";
      newCells.forEach((cell) => row.appendChild(cell));
    });

    this._clearCellSelection(table);
  }

  /**
   * 设置单元格背景颜色
   */
  public setTableCellBgColor(table: HTMLTableElement): void {
    const selection = window.getSelection();
    if (!selection || !selection.anchorNode || !selection.focusNode) return;

    const start = selection.anchorNode.parentElement as HTMLTableCellElement;
    const end = selection.focusNode.parentElement as HTMLTableCellElement;

    const minRow = Math.min(
      start.parentElement!.rowIndex,
      end.parentElement!.rowIndex
    );
    const maxRow = Math.max(
      start.parentElement!.rowIndex,
      end.parentElement!.rowIndex
    );
    const minCol = Math.min(start.cellIndex, end.cellIndex);
    const maxCol = Math.max(start.cellIndex, end.cellIndex);

    for (let r = minRow; r <= maxRow; r++) {
      for (let c = minCol; c <= maxCol; c++) {
        const cell = table.rows[r]?.cells[c];
        if (cell) cell.style.backgroundColor = "#ffeb3b"; // 黄色示例
      }
    }
  }

  initRightClickMenu() {
    // 初始化右键菜单
    const editorContent =
      this.editor.container.querySelector(".editor-content");
    if (editorContent) {
      this.initContextMenu(editorContent);
    }
  }

  /**
   * 打开颜色选择器，设置选中单元格背景色
   */
  public openColorPickerForSelection(table: HTMLTableElement): void {
    const selection = window.getSelection();
    if (!selection || !selection.anchorNode || !selection.focusNode) return;

    const start = selection.anchorNode.parentElement as HTMLTableCellElement;
    const end = selection.focusNode.parentElement as HTMLTableCellElement;

    if (!start || !end) return;

    const startRow = start.parentElement!.rowIndex;
    const startCol = start.cellIndex;
    const endRow = end.parentElement!.rowIndex;
    const endCol = end.cellIndex;

    const minRow = Math.min(startRow, endRow);
    const maxRow = Math.max(startRow, endRow);
    const minCol = Math.min(startCol, endCol);
    const maxCol = Math.max(startCol, endCol);

    // 创建颜色选择器弹窗
    const colorPicker = document.createElement("input");
    colorPicker.type = "color";
    colorPicker.style.position = "absolute";
    colorPicker.style.top = `${window.scrollY + 20}px`;
    colorPicker.style.left = `${window.scrollX + 20}px`;
    colorPicker.style.zIndex = "9999";
    colorPicker.value = "#ffffff";

    document.body.appendChild(colorPicker);
    colorPicker.focus();
    colorPicker.click();

    colorPicker.addEventListener("change", () => {
      const selectedColor = colorPicker.value;
      for (let r = minRow; r <= maxRow; r++) {
        for (let c = minCol; c <= maxCol; c++) {
          const cell = table.rows[r]?.cells[c];
          if (cell) {
            cell.style.backgroundColor = selectedColor;
          }
        }
      }
      document.body.removeChild(colorPicker);
    });

    colorPicker.addEventListener("blur", () => {
      document.body.removeChild(colorPicker);
    });
  }
}
