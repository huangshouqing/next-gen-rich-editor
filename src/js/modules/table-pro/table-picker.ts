interface TablePickerOptions {
  rows: number;
  cols: number;
  minRows: number;
  minCols: number;
  maxRows: number;
  maxCols: number;
  onSelect: (rows: number, cols: number) => void;
}

export function createTablePicker(options: TablePickerOptions): HTMLElement {
  const wrapper = document.createElement("div");
  wrapper.className = "ql-table-picker";

  // 创建表格大小显示
  const sizeDisplay = document.createElement("div");
  sizeDisplay.className = "ql-table-picker-size";
  sizeDisplay.textContent = "0 × 0";
  wrapper.appendChild(sizeDisplay);

  // 创建网格容器
  const grid = document.createElement("div");
  grid.className = "ql-table-picker-grid";
  wrapper.appendChild(grid);

  // 创建单元格
  const cells: HTMLElement[] = [];
  for (let i = 0; i < options.maxRows * options.maxCols; i++) {
    const cell = document.createElement("div");
    cell.className = "ql-table-picker-cell";
    grid.appendChild(cell);
    cells.push(cell);
  }

  // 处理鼠标移动事件
  let isMouseDown = false;
  let startCell: HTMLElement | null = null;

  function updateSelection(currentCell: HTMLElement) {
    const index = cells.indexOf(currentCell);
    const row = Math.floor(index / options.maxCols) + 1;
    const col = (index % options.maxCols) + 1;

    // 更新大小显示
    sizeDisplay.textContent = `${row} × ${col}`;

    // 高亮选中的单元格
    cells.forEach((cell, i) => {
      const cellRow = Math.floor(i / options.maxCols) + 1;
      const cellCol = (i % options.maxCols) + 1;
      cell.classList.toggle("active", cellRow <= row && cellCol <= col);
    });

    return { row, col };
  }

  grid.addEventListener("mouseover", (e) => {
    const cell = (e.target as HTMLElement).closest(".ql-table-picker-cell");
    if (!cell) return;

    updateSelection(cell as HTMLElement);
  });

  grid.addEventListener("mousedown", (e) => {
    const cell = (e.target as HTMLElement).closest(".ql-table-picker-cell");
    if (!cell) return;

    isMouseDown = true;
    startCell = cell as HTMLElement;
    e.preventDefault();
  });

  grid.addEventListener("click", (e) => {
    const cell = (e.target as HTMLElement).closest(".ql-table-picker-cell");
    if (!cell) return;

    const { row, col } = updateSelection(cell as HTMLElement);
    if (row >= options.minRows && col >= options.minCols) {
      options.onSelect(row, col);
      wrapper.remove();
    }
  });

  // 处理点击外部关闭
  document.addEventListener("mousedown", (e) => {
    if (!wrapper.contains(e.target as Node)) {
      wrapper.remove();
    }
  }, { once: true });

  return wrapper;
} 