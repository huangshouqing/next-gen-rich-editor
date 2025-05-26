import EditorCore from "@/js/core/EditorCore";
import "@/css/table.css";
import ContextMenu from "@/js/modules/ContextMenu";
interface EditorDialog {
  dialog: HTMLDivElement | null;
}

export default class TableModule implements EditorDialog {
  public editor: EditorCore;
  public dialog: HTMLDivElement | null;
  private tableMenus = new Map<HTMLElement, ContextMenu>();

  constructor(editor: EditorCore) {
    this.editor = editor;
    this.dialog = null;
  }
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
      const ev = e as MouseEvent; // 显式断言为 MouseEvent
      const target = e.target as HTMLElement;
      let table: HTMLTableElement | null = null;
      if (target.tagName === "TD" || target.tagName === "TH") {
        target.classList.add("selected-cell");
        table = target.closest("table");
      } else if (target.tagName === "TABLE") {
        table = target;
      }
      if (!table) return;
      e.preventDefault();
      // 全局隐藏所有已存在的上下文菜单
      this.tableMenus.forEach((menu) => {
        if (menu) {
          menu.hide();
        }
      });
      const menuItems = [
        {
          label: "新增行",
          action: "add-row",
          handler: () => this.addRow(table),
        },
        {
          label: "新增列",
          action: "add-col",
          handler: () => this.addColumn(table),
        },
        {
          label: "删除行",
          action: "delete-row",
          handler: () => this.deleteRow(table),
        },
        {
          label: "删除列",
          action: "delete-col",
          handler: () => this.deleteColumn(table),
        },
        {
          label: "合并单元格",
          action: "merge-cells",
          handler: () => this.mergeCells(table),
        },
        {
          label: "取消合并",
          action: "unmerge-cells",
          handler: () => this.unmergeCells(table),
        },
        {
          label: "设置背景色",
          action: "set-bgcolor",
          handler: () => this.openColorPickerForSelection(table),
        },
      ];
      let contextMenu = this.tableMenus.get(target);
      if (contextMenu) {
        contextMenu.show(ev.clientX, ev.clientY); // 如果已存在菜单，直接复用并显示
        return;
      }
      contextMenu = new ContextMenu(menuItems);
      contextMenu.show(ev.clientX, ev.clientY);
      this.tableMenus.set(target, contextMenu);
      // 点击其他地方清除 menu
      const closeMenu = () => {
        if (this.tableMenus.get(target)) {
          contextMenu.hide();
        }
      };
      setTimeout(() => document.addEventListener("click", closeMenu), 0);
      // 新增全局点击监听
      const handleGlobalClick = (ev: MouseEvent) => {
        debugger;
        if (!table?.contains(ev.target as Node)) {
          this._clearCellSelection(table!);
          document.removeEventListener("click", handleGlobalClick);
        }
      };
      document.addEventListener("click", handleGlobalClick);
    });
  }
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
  /**
   * 
   * @param table 
   */
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
        cell.removeAttribute("data-merged");
        cell.style.display = ""; // 恢复显示
      });

    // 移除合并属性
    mergedCell.removeAttribute("rowspan");
    mergedCell.removeAttribute("colspan");

    // 重建单元格结构
    const affectedRows = Array.from(table.rows).filter((row) => {
      return Array.from(row.cells).some(
        (cell) => cell && cell.dataset && cell.dataset.merged
      );
    });

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

  /**
   * 添加右键菜单
   */
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
