import Quill from "quill-next";

export class TableSelection {
  private quill: Quill;
  private selectedCells: HTMLElement[] = [];
  private startCell: HTMLElement | null = null;
  private isSelecting = false;

  constructor(quill: Quill) {
    this.quill = quill;
    this.setupListeners();
  }

  private setupListeners() {
    const editor = this.quill.root;

    editor.addEventListener("mousedown", (e) => {
      const cell = (e.target as HTMLElement).closest("td");
      if (!cell) {
        this.clearSelection();
        return;
      }

      this.startCell = cell as HTMLElement;
      this.isSelecting = true;
      this.updateSelection([cell as HTMLElement]);
    });

    editor.addEventListener("mouseover", (e) => {
      if (!this.isSelecting || !this.startCell) return;

      const cell = (e.target as HTMLElement).closest("td");
      if (!cell) return;

      const range = this.getCellRange(this.startCell, cell as HTMLElement);
      this.updateSelection(range);
    });

    editor.addEventListener("mouseup", () => {
      this.isSelecting = false;
    });

    // 处理工具栏事件
    editor.addEventListener("click", (e) => {
      const target = e.target as HTMLElement;
      const button = target.closest("button");
      if (!button) return;

      switch (button.className) {
        case "ql-table-merge":
          this.mergeCells();
          break;
        case "ql-table-unmerge":
          this.unmergeCells();
          break;
        case "ql-table-insert-row-above":
          this.insertRow("above");
          break;
        case "ql-table-insert-row-below":
          this.insertRow("below");
          break;
        case "ql-table-insert-column-left":
          this.insertColumn("left");
          break;
        case "ql-table-insert-column-right":
          this.insertColumn("right");
          break;
        case "ql-table-delete-row":
          this.deleteRow();
          break;
        case "ql-table-delete-column":
          this.deleteColumn();
          break;
        case "ql-table-background":
          this.showBackgroundPicker(button);
          break;
      }
    });
  }

  private getCellRange(start: HTMLElement, end: HTMLElement): HTMLElement[] {
    const table = start.closest("table");
    if (!table) return [];

    const cells = Array.from(table.querySelectorAll("td"));
    const startIndex = cells.indexOf(start);
    const endIndex = cells.indexOf(end);

    const startRow = parseInt(start.dataset.row || "0");
    const startCol = parseInt(start.dataset.col || "0");
    const endRow = parseInt(end.dataset.row || "0");
    const endCol = parseInt(end.dataset.col || "0");

    const minRow = Math.min(startRow, endRow);
    const maxRow = Math.max(startRow, endRow);
    const minCol = Math.min(startCol, endCol);
    const maxCol = Math.max(startCol, endCol);

    return cells.filter((cell) => {
      const row = parseInt(cell.dataset.row || "0");
      const col = parseInt(cell.dataset.col || "0");
      return row >= minRow && row <= maxRow && col >= minCol && col <= maxCol;
    });
  }

  private updateSelection(cells: HTMLElement[]) {
    // 清除旧的选择
    this.selectedCells.forEach((cell) => {
      cell.classList.remove("ql-table-cell-selected");
    });

    // 更新新的选择
    this.selectedCells = cells;
    this.selectedCells.forEach((cell) => {
      cell.classList.add("ql-table-cell-selected");
    });
  }

  private clearSelection() {
    this.updateSelection([]);
    this.startCell = null;
    this.isSelecting = false;
  }

  // 合并单元格
  private mergeCells() {
    if (this.selectedCells.length < 2) return;

    const first = this.selectedCells[0];
    const table = first.closest("table");
    if (!table) return;

    const minRow = Math.min(...this.selectedCells.map(cell => parseInt(cell.dataset.row || "0")));
    const maxRow = Math.max(...this.selectedCells.map(cell => parseInt(cell.dataset.row || "0")));
    const minCol = Math.min(...this.selectedCells.map(cell => parseInt(cell.dataset.col || "0")));
    const maxCol = Math.max(...this.selectedCells.map(cell => parseInt(cell.dataset.col || "0")));

    const rowspan = maxRow - minRow + 1;
    const colspan = maxCol - minCol + 1;

    first.setAttribute("rowspan", rowspan.toString());
    first.setAttribute("colspan", colspan.toString());

    // 移除其他单元格
    this.selectedCells.slice(1).forEach(cell => cell.remove());
    this.clearSelection();
  }

  // 取消合并
  private unmergeCells() {
    this.selectedCells.forEach(cell => {
      const rowspan = parseInt(cell.getAttribute("rowspan") || "1");
      const colspan = parseInt(cell.getAttribute("colspan") || "1");
      if (rowspan === 1 && colspan === 1) return;

      const table = cell.closest("table");
      if (!table) return;

      const row = parseInt(cell.dataset.row || "0");
      const col = parseInt(cell.dataset.col || "0");

      // 创建新单元格
      for (let i = 0; i < rowspan; i++) {
        for (let j = 0; j < colspan; j++) {
          if (i === 0 && j === 0) continue;

          const newCell = document.createElement("td");
          newCell.setAttribute("contenteditable", "true");
          newCell.dataset.row = (row + i).toString();
          newCell.dataset.col = (col + j).toString();

          // 找到正确的插入位置
          const targetRow = table.rows[row + i];
          const refCell = Array.from(targetRow.cells).find(
            c => parseInt(c.dataset.col || "0") > col + j
          );
          targetRow.insertBefore(newCell, refCell || null);
        }
      }

      cell.removeAttribute("rowspan");
      cell.removeAttribute("colspan");
    });
    this.clearSelection();
  }

  // 插入行
  private insertRow(position: "above" | "below") {
    if (!this.selectedCells.length) return;

    const cell = this.selectedCells[0];
    const table = cell.closest("table");
    if (!table) return;

    const row = parseInt(cell.dataset.row || "0");
    const targetRow = position === "above" ? row : row + 1;

    const tr = document.createElement("tr");
    const cols = table.rows[0].cells.length;

    for (let i = 0; i < cols; i++) {
      const td = document.createElement("td");
      td.setAttribute("contenteditable", "true");
      td.dataset.row = targetRow.toString();
      td.dataset.col = i.toString();
      tr.appendChild(td);
    }

    table.rows[row].insertAdjacentElement(
      position === "above" ? "beforebegin" : "afterend",
      tr
    );

    // 更新后续行的行号
    Array.from(table.rows).slice(targetRow + 1).forEach(row => {
      Array.from(row.cells).forEach(cell => {
        const currentRow = parseInt(cell.dataset.row || "0");
        cell.dataset.row = (currentRow + 1).toString();
      });
    });

    this.clearSelection();
  }

  // 插入列
  private insertColumn(position: "left" | "right") {
    if (!this.selectedCells.length) return;

    const cell = this.selectedCells[0];
    const table = cell.closest("table");
    if (!table) return;

    const col = parseInt(cell.dataset.col || "0");
    const targetCol = position === "left" ? col : col + 1;

    Array.from(table.rows).forEach((row, rowIndex) => {
      const td = document.createElement("td");
      td.setAttribute("contenteditable", "true");
      td.dataset.row = rowIndex.toString();
      td.dataset.col = targetCol.toString();

      const refCell = Array.from(row.cells).find(
        c => parseInt(c.dataset.col || "0") === targetCol
      );
      row.insertBefore(td, refCell || null);
    });

    // 更新后续列的列号
    Array.from(table.rows).forEach(row => {
      Array.from(row.cells).slice(targetCol + 1).forEach(cell => {
        const currentCol = parseInt(cell.dataset.col || "0");
        cell.dataset.col = (currentCol + 1).toString();
      });
    });

    this.clearSelection();
  }

  // 删除行
  private deleteRow() {
    if (!this.selectedCells.length) return;

    const rows = new Set(
      this.selectedCells.map(cell => parseInt(cell.dataset.row || "0"))
    );

    rows.forEach(rowIndex => {
      const table = this.selectedCells[0].closest("table");
      if (!table) return;

      table.rows[rowIndex].remove();

      // 更新后续行的行号
      Array.from(table.rows).slice(rowIndex).forEach(row => {
        Array.from(row.cells).forEach(cell => {
          const currentRow = parseInt(cell.dataset.row || "0");
          cell.dataset.row = (currentRow - 1).toString();
        });
      });
    });

    this.clearSelection();
  }

  // 删除列
  private deleteColumn() {
    if (!this.selectedCells.length) return;

    const cols = new Set(
      this.selectedCells.map(cell => parseInt(cell.dataset.col || "0"))
    );

    cols.forEach(colIndex => {
      const table = this.selectedCells[0].closest("table");
      if (!table) return;

      Array.from(table.rows).forEach(row => {
        const cell = Array.from(row.cells).find(
          c => parseInt(c.dataset.col || "0") === colIndex
        );
        if (cell) cell.remove();
      });

      // 更新后续列的列号
      Array.from(table.rows).forEach(row => {
        Array.from(row.cells).forEach(cell => {
          const currentCol = parseInt(cell.dataset.col || "0");
          if (currentCol > colIndex) {
            cell.dataset.col = (currentCol - 1).toString();
          }
        });
      });
    });

    this.clearSelection();
  }

  // 显示背景颜色选择器
  private showBackgroundPicker(button: HTMLElement) {
    const colors = [
      "#ffffff", "#f8f9fa", "#e9ecef", "#dee2e6",
      "#ced4da", "#adb5bd", "#6c757d", "#495057",
      "#343a40", "#212529", "#f8d7da", "#f1aeb5",
      "#dc3545", "#58151c", "#d1e7dd", "#75b798",
      "#198754", "#0a3622", "#cff4fc", "#9eeaf9",
      "#0dcaf0", "#055160", "#fff3cd", "#ffe69c",
      "#ffc107", "#664d03"
    ];

    const picker = document.createElement("div");
    picker.className = "ql-table-background-picker";

    colors.forEach(color => {
      const item = document.createElement("div");
      item.className = "color-item";
      item.style.backgroundColor = color;
      item.addEventListener("click", () => {
        this.selectedCells.forEach(cell => {
          cell.style.backgroundColor = color;
        });
        picker.remove();
      });
      picker.appendChild(item);
    });

    const buttonRect = button.getBoundingClientRect();
    picker.style.position = "absolute";
    picker.style.top = `${buttonRect.bottom + 5}px`;
    picker.style.left = `${buttonRect.left}px`;
    document.body.appendChild(picker);

    // 点击外部关闭选择器
    document.addEventListener("mousedown", (e) => {
      if (!picker.contains(e.target as Node)) {
        picker.remove();
      }
    }, { once: true });
  }
} 