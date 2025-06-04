import { BlockEmbed } from "quill-next/dist/blots/block";
import Quill from "quill-next";

interface TableCell {
  row: number;
  col: number;
  element: HTMLElement;
}

interface TableSelection {
  start: TableCell | null;
  end: TableCell | null;
  cells: TableCell[];
}

interface MenuItem {
  text?: string;
  action?: () => void;
  submenu?: MenuItem[];
  separator?: boolean;
}

class TableProBlot extends BlockEmbed {
  static blotName = "table-pro";
  static tagName = "div";
  static className = "ql-table-container";

  private static selection: TableSelection = {
    start: null,
    end: null,
    cells: []
  };

  private static contextMenu: HTMLElement | null = null;
  private static toolbar: HTMLElement | null = null;
  private static propertiesDialog: HTMLElement | null = null;
  private static isSelecting = false;
  private static isResizing = false;

  static create(value: { rows: number; cols: number }) {
    const container = super.create() as HTMLDivElement;
    
    // 创建表格
    const table = document.createElement('table');
    table.classList.add('ql-table-pro');
    table.setAttribute("contenteditable", "false");
    
    const tbody = document.createElement("tbody");
    for (let i = 0; i < value.rows; i++) {
      const tr = document.createElement("tr");
      for (let j = 0; j < value.cols; j++) {
        const td = document.createElement("td");
        td.setAttribute("contenteditable", "true");
        // td.setAttribute("tabindex", "0"); // 使单元格可以获得焦点
        td.dataset.row = i.toString();
        td.dataset.col = j.toString();
        
        // 添加调整大小的手柄
        if (j < value.cols - 1) {
          const colHandle = document.createElement("div");
          colHandle.className = "resize-handle col-resize";
          td.appendChild(colHandle);
        }
        if (i < value.rows - 1) {
          const rowHandle = document.createElement("div");
          rowHandle.className = "resize-handle row-resize";
          td.appendChild(rowHandle);
        }

        tr.appendChild(td);
      }
      tbody.appendChild(tr);
    }
    table.appendChild(tbody);
    container.appendChild(table);

    // 创建工具栏
    const toolbar = this.createToolbar();
    container.insertBefore(toolbar, table);
    this.toolbar = toolbar;

    this.bindTableEvents(table);
    return container;
  }

  private static createToolbar(): HTMLElement {
    const toolbar = document.createElement('div');
    toolbar.className = 'ql-table-toolbar';
    toolbar.style.display = 'none';

    const groups = [
      {
        name: 'table',
        buttons: [
          { icon: 'table-properties', title: '表格属性', action: 'showProperties' },
          { icon: 'delete-table', title: '删除表格', action: 'deleteTable' }
        ]
      },
      {
        name: 'row',
        buttons: [
          { icon: 'insert-row-above', title: '在上方插入行', action: 'insertRowAbove' },
          { icon: 'insert-row-below', title: '在下方插入行', action: 'insertRowBelow' },
          { icon: 'delete-row', title: '删除行', action: 'deleteRow' }
        ]
      },
      {
        name: 'column',
        buttons: [
          { icon: 'insert-column-left', title: '在左侧插入列', action: 'insertColumnLeft' },
          { icon: 'insert-column-right', title: '在右侧插入列', action: 'insertColumnRight' },
          { icon: 'delete-column', title: '删除列', action: 'deleteColumn' }
        ]
      },
      {
        name: 'merge',
        buttons: [
          { icon: 'merge-cells', title: '合并单元格', action: 'mergeCells' },
          { icon: 'split-cells', title: '拆分单元格', action: 'splitCells' }
        ]
      }
    ];

    groups.forEach(group => {
      const groupDiv = document.createElement('div');
      groupDiv.className = 'toolbar-group';

      group.buttons.forEach(button => {
        const btn = document.createElement('button');
        btn.title = button.title;
        btn.innerHTML = `<span>${button.title}</span>`;
        btn.dataset.action = button.action;
        btn.addEventListener('click', (e) => {
          e.preventDefault();
          e.stopPropagation();
          this.handleToolbarAction(button.action);
        });
        groupDiv.appendChild(btn);
      });

      toolbar.appendChild(groupDiv);
    });

    return toolbar;
  }

  private static handleToolbarAction(action: string) {
    switch (action) {
      case 'showProperties':
        this.showPropertiesDialog();
        break;
      case 'deleteTable':
        this.deleteTable();
        break;
      case 'insertRowAbove':
        this.insertRow('above');
        break;
      case 'insertRowBelow':
        this.insertRow('below');
        break;
      case 'deleteRow':
        this.deleteRow();
        break;
      case 'insertColumnLeft':
        this.insertColumn('left');
        break;
      case 'insertColumnRight':
        this.insertColumn('right');
        break;
      case 'deleteColumn':
        this.deleteColumn();
        break;
      case 'mergeCells':
        this.mergeCells();
        break;
      case 'splitCells':
        this.splitCells();
        break;
    }
  }

  private static bindTableEvents(table: HTMLTableElement) {
    // 选择相关事件
    table.addEventListener('mousedown', (e: MouseEvent) => {
      if (e.button !== 0) return; // 只处理左键点击

      const target = e.target as HTMLElement;
      
      // 处理调整大小
      if (target.closest('.resize-handle')) {
        this.isResizing = true;
        this.startResize(e, target.closest('.resize-handle') as HTMLElement);
        return;
      }

      // 处理选择
      const cell = target.closest('td');
      if (cell) {
        // 如果点击的是单元格内部的文本区域，不阻止默认行为
        if (target === cell) {
          e.preventDefault(); // 只在点击单元格边缘时阻止文本选择
        }
        
        this.isSelecting = true;
        const cellInfo = this.getCellInfo(cell as HTMLElement);
        
        if (!e.shiftKey) {
          this.clearSelection();
        }
        
        this.updateSelection(cellInfo, cellInfo);
        this.showToolbar();
      }
    });

    // 处理单元格编辑
    table.addEventListener('dblclick', (e: MouseEvent) => {
      const cell = (e.target as HTMLElement).closest('td');
      if (cell) {
        cell.focus();
      }
    });

    // 处理单元格失焦
    table.addEventListener('blur', (e: FocusEvent) => {
      const cell = (e.target as HTMLElement).closest('td');
      if (cell) {
        // 可以在这里添加内容保存逻辑
      }
    }, true);

    table.addEventListener('mousemove', (e: MouseEvent) => {
      if (!this.isSelecting || this.isResizing) return;

      const cell = (e.target as HTMLElement).closest('td');
      if (cell && this.selection.start) {
        const currentCell = this.getCellInfo(cell as HTMLElement);
        this.updateSelection(this.selection.start, currentCell);
      }
    });

    table.addEventListener('mouseup', () => {
      this.isSelecting = false;
      this.isResizing = false;
    });

    // 右键菜单
    table.addEventListener('contextmenu', (e: MouseEvent) => {
      e.preventDefault();
      const cell = (e.target as HTMLElement).closest('td');
      if (cell) {
        const cellInfo = this.getCellInfo(cell as HTMLElement);
        if (!this.selection.cells.some(c => c.row === cellInfo.row && c.col === cellInfo.col)) {
          this.clearSelection();
          this.updateSelection(cellInfo, cellInfo);
        }
        this.showContextMenu(e.clientX, e.clientY);
      }
    });

    // 点击其他地方取消选择
    document.addEventListener('click', (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (!target.closest('.ql-table-pro') && 
          !target.closest('.ql-table-toolbar') && 
          !target.closest('.table-context-menu')) {
        this.clearSelection();
      }
    });

    // 阻止冒泡到编辑器
    table.addEventListener('click', (e: MouseEvent) => {
      e.stopPropagation();
    });
  }

  private static startResize(e: MouseEvent, handle: HTMLElement) {
    const cell = handle.closest('td');
    if (!cell) return;

    const isColumn = handle.classList.contains('col-resize');
    const table = cell.closest('table');
    if (!table) return;

    const startPos = isColumn ? e.clientX : e.clientY;
    const cellRect = cell.getBoundingClientRect();
    const startSize = isColumn ? cellRect.width : cellRect.height;
    
    handle.classList.add('dragging');

    const moveHandler = (e: MouseEvent) => {
      if (!this.isResizing) return;
      
      const currentPos = isColumn ? e.clientX : e.clientY;
      const diff = currentPos - startPos;
      const newSize = Math.max(20, startSize + diff);

      if (isColumn) {
        const colIndex = parseInt(cell.dataset.col || "0");
        Array.from(table.rows).forEach(row => {
          const targetCell = row.cells[colIndex];
          if (targetCell) targetCell.style.width = `${newSize}px`;
        });
      } else {
        const rowIndex = parseInt(cell.dataset.row || "0");
        const row = table.rows[rowIndex];
        if (row) {
          Array.from(row.cells).forEach(cell => {
            cell.style.height = `${newSize}px`;
          });
        }
      }
    };

    const upHandler = () => {
      this.isResizing = false;
      handle.classList.remove('dragging');
      document.removeEventListener('mousemove', moveHandler);
      document.removeEventListener('mouseup', upHandler);
    };

    document.addEventListener('mousemove', moveHandler);
    document.addEventListener('mouseup', upHandler);
  }

  private static getCellInfo(cell: HTMLElement): TableCell {
    return {
      row: parseInt(cell.dataset.row || "0"),
      col: parseInt(cell.dataset.col || "0"),
      element: cell
    };
  }

  private static updateSelection(start: TableCell, end: TableCell) {
    const minRow = Math.min(start.row, end.row);
    const maxRow = Math.max(start.row, end.row);
    const minCol = Math.min(start.col, end.col);
    const maxCol = Math.max(start.col, end.col);

    // 清除之前的选择
    this.selection.cells.forEach(cell => {
      cell.element.classList.remove('selected');
    });

    // 更新选择
    this.selection.start = start;
    this.selection.end = end;
    this.selection.cells = [];

    const table = start.element.closest('table');
    if (!table) return;

    // 收集选中的单元格
    for (let i = minRow; i <= maxRow; i++) {
      for (let j = minCol; j <= maxCol; j++) {
        const cell = Array.from(table.rows[i].cells).find(
          cell => parseInt(cell.dataset.col || "0") === j
        );
        if (cell) {
          cell.classList.add('selected');
          this.selection.cells.push({
            row: i,
            col: j,
            element: cell as HTMLElement
          });
        }
      }
    }
  }

  private static clearSelection() {
    this.selection.cells.forEach(cell => {
      cell.element.classList.remove('selected');
    });
    this.selection.start = null;
    this.selection.end = null;
    this.selection.cells = [];

    if (this.toolbar) {
      this.toolbar.style.display = 'none';
    }
  }

  private static showToolbar() {
    if (!this.toolbar || this.selection.cells.length === 0) return;
    this.toolbar.style.display = 'flex';
  }

  private static showContextMenu(x: number, y: number) {
    if (this.contextMenu) {
      this.contextMenu.remove();
    }

    const menu = document.createElement('div');
    menu.className = 'table-context-menu';

    const items: MenuItem[] = [
      { text: '合并单元格', action: () => this.mergeCells() },
      { text: '拆分单元格', action: () => this.splitCells() },
      { separator: true },
      { text: '插入行', submenu: [
        { text: '在上方插入', action: () => this.insertRow('above') },
        { text: '在下方插入', action: () => this.insertRow('below') }
      ]},
      { text: '插入列', submenu: [
        { text: '在左侧插入', action: () => this.insertColumn('left') },
        { text: '在右侧插入', action: () => this.insertColumn('right') }
      ]},
      { separator: true },
      { text: '删除行', action: () => this.deleteRow() },
      { text: '删除列', action: () => this.deleteColumn() },
      { separator: true },
      { text: '表格属性', action: () => this.showPropertiesDialog() }
    ];

    items.forEach(item => {
      if (item.separator) {
        const separator = document.createElement('div');
        separator.className = 'menu-separator';
        menu.appendChild(separator);
      } else {
        const menuItem = document.createElement('div');
        menuItem.className = 'menu-item';
        if (item.submenu) {
          menuItem.classList.add('has-submenu');
        }
        menuItem.textContent = item.text || '';
        menuItem.addEventListener('click', () => {
          if (item.action) {
            item.action();
            menu.remove();
          }
        });
        menu.appendChild(menuItem);
      }
    });

    document.body.appendChild(menu);
    this.contextMenu = menu;

    // 调整位置
    const menuRect = menu.getBoundingClientRect();
    if (x + menuRect.width > window.innerWidth) {
      x = window.innerWidth - menuRect.width;
    }
    if (y + menuRect.height > window.innerHeight) {
      y = window.innerHeight - menuRect.height;
    }

    menu.style.left = `${x}px`;
    menu.style.top = `${y}px`;

    // 点击其他地方关闭菜单
    const closeMenu = (e: MouseEvent) => {
      if (!menu.contains(e.target as Node)) {
        menu.remove();
        document.removeEventListener('click', closeMenu);
      }
    };
    document.addEventListener('click', closeMenu);
  }

  private static showPropertiesDialog() {
    if (this.propertiesDialog) {
      this.propertiesDialog.remove();
    }

    const overlay = document.createElement('div');
    overlay.className = 'dialog-overlay';

    const dialog = document.createElement('div');
    dialog.className = 'table-properties-dialog';

    dialog.innerHTML = `
      <div class="dialog-header">表格属性</div>
      <div class="dialog-body">
        <div class="form-group">
          <label>边框颜色</label>
          <input type="color" value="#cccccc">
        </div>
        <div class="form-group">
          <label>背景颜色</label>
          <input type="color" value="#ffffff">
        </div>
        <div class="form-group">
          <label>对齐方式</label>
          <select>
            <option value="left">左对齐</option>
            <option value="center">居中</option>
            <option value="right">右对齐</option>
          </select>
        </div>
      </div>
      <div class="dialog-footer">
        <button class="secondary">取消</button>
        <button class="primary">确定</button>
      </div>
    `;

    document.body.appendChild(overlay);
    document.body.appendChild(dialog);
    this.propertiesDialog = dialog;

    const closeDialog = () => {
      dialog.remove();
      overlay.remove();
      this.propertiesDialog = null;
    };

    overlay.addEventListener('click', closeDialog);
    dialog.querySelector('.secondary')?.addEventListener('click', closeDialog);
    dialog.querySelector('.primary')?.addEventListener('click', () => {
      // 应用属性
      const table = this.selection.cells[0]?.element.closest('table');
      if (table) {
        const borderColor = (dialog.querySelector('input[type="color"]') as HTMLInputElement).value;
        const bgColor = (dialog.querySelector('input[type="color"]:last-of-type') as HTMLInputElement).value;
        const align = (dialog.querySelector('select') as HTMLSelectElement).value;

        Array.from(table.querySelectorAll('td')).forEach(td => {
          td.style.borderColor = borderColor;
          td.style.backgroundColor = bgColor;
          td.style.textAlign = align;
        });
      }
      closeDialog();
    });
  }

  private static deleteTable() {
    const container = this.selection.cells[0]?.element.closest('.ql-table-container');
    if (container) {
      container.remove();
      this.clearSelection();
    }
  }

  private static mergeCells() {
    if (this.selection.cells.length < 2) return;

    const firstCell = this.selection.cells[0].element;
    const lastCell = this.selection.cells[this.selection.cells.length - 1].element;
    
    const startRow = Math.min(
      parseInt(firstCell.dataset.row || "0"),
      parseInt(lastCell.dataset.row || "0")
    );
    const endRow = Math.max(
      parseInt(firstCell.dataset.row || "0"),
      parseInt(lastCell.dataset.row || "0")
    );
    const startCol = Math.min(
      parseInt(firstCell.dataset.col || "0"),
      parseInt(lastCell.dataset.col || "0")
    );
    const endCol = Math.max(
      parseInt(firstCell.dataset.col || "0"),
      parseInt(lastCell.dataset.col || "0")
    );

    firstCell.setAttribute('rowspan', (endRow - startRow + 1).toString());
    firstCell.setAttribute('colspan', (endCol - startCol + 1).toString());

    // 删除其他被合并的单元格
    this.selection.cells.slice(1).forEach(cell => cell.element.remove());
    this.selection.cells = [this.selection.cells[0]];
    this.showToolbar();
  }

  private static splitCells() {
    this.selection.cells.forEach(cell => {
      const element = cell.element;
      const rowspan = parseInt(element.getAttribute('rowspan') || "1");
      const colspan = parseInt(element.getAttribute('colspan') || "1");
      
      if (rowspan > 1 || colspan > 1) {
        element.removeAttribute('rowspan');
        element.removeAttribute('colspan');
        
        const table = element.closest('table');
        if (!table) return;

        const row = parseInt(element.dataset.row || "0");
        const col = parseInt(element.dataset.col || "0");
        
        for (let i = 0; i < rowspan; i++) {
          for (let j = 0; j < colspan; j++) {
            if (i === 0 && j === 0) continue;
            
            const newCell = document.createElement('td');
            newCell.setAttribute('contenteditable', 'true');
            newCell.dataset.row = (row + i).toString();
            newCell.dataset.col = (col + j).toString();
            
            const targetRow = table.rows[row + i];
            if (targetRow) {
              const referenceCell = Array.from(targetRow.cells).find(
                cell => parseInt(cell.dataset.col || "0") > col + j
              );
              targetRow.insertBefore(newCell, referenceCell || null);
            }
          }
        }
      }
    });
    this.showToolbar();
  }

  private static insertRow(position: 'above' | 'below') {
    if (this.selection.cells.length === 0) return;
    
    const cell = this.selection.cells[0].element;
    const row = parseInt(cell.dataset.row || "0");
    const table = cell.closest('table');
    if (!table) return;

    const tr = document.createElement('tr');
    const targetRow = cell.closest('tr');
    if (!targetRow) return;

    // 复制当前行的结构
    Array.from(targetRow.cells).forEach(sourceCell => {
      const td = document.createElement('td');
      td.setAttribute('contenteditable', 'true');
      
      // 如果源单元格有 rowspan，需要调整
      const rowspan = parseInt(sourceCell.getAttribute('rowspan') || "1");
      if (rowspan > 1) {
        if (position === 'above') {
          // 在上方插入时，新单元格不需要 rowspan
          sourceCell.setAttribute('rowspan', (rowspan + 1).toString());
          return; // 跳过创建新单元格
        } else {
          // 在下方插入时，需要考虑 rowspan 的影响
          td.setAttribute('rowspan', rowspan.toString());
        }
      }

      const colspan = sourceCell.getAttribute('colspan');
      if (colspan) td.setAttribute('colspan', colspan);

      td.dataset.row = (position === 'above' ? row : row + 1).toString();
      td.dataset.col = sourceCell.dataset.col || "0";
      tr.appendChild(td);
    });

    if (position === 'above') {
      targetRow.parentElement?.insertBefore(tr, targetRow);
    } else {
      targetRow.parentElement?.insertBefore(tr, targetRow.nextSibling);
    }

    this.updateRowIndices(table, row + (position === 'above' ? 0 : 1));
    this.showToolbar();
  }

  private static insertColumn(position: 'left' | 'right') {
    if (this.selection.cells.length === 0) return;
    
    const cell = this.selection.cells[0].element;
    const col = parseInt(cell.dataset.col || "0");
    const table = cell.closest('table') as HTMLTableElement;
    if (!table) return;

    Array.from(table.rows).forEach((row: HTMLTableRowElement) => {
      const td = document.createElement('td');
      td.setAttribute('contenteditable', 'true');
      td.dataset.row = row.rowIndex.toString();
      td.dataset.col = (position === 'left' ? col : col + 1).toString();
      
      const referenceCell = Array.from(row.cells).find(cell => 
        parseInt(cell.dataset.col || "0") === col
      ) as HTMLTableCellElement;
      
      if (referenceCell) {
        if (position === 'left') {
          row.insertBefore(td, referenceCell);
        } else {
          row.insertBefore(td, referenceCell.nextSibling);
        }
      }
    });

    this.updateColumnIndices(table, col + (position === 'left' ? 0 : 1));
    this.showToolbar();
  }

  private static deleteRow() {
    if (this.selection.cells.length === 0) return;
    
    const cell = this.selection.cells[0].element;
    const row = cell.closest('tr');
    const table = cell.closest('table');
    if (!row || !table || table.rows.length <= 1) return;

    const rowIndex = parseInt(cell.dataset.row || "0");
    row.remove();
    this.updateRowIndices(table as HTMLTableElement, rowIndex);
    this.clearSelection();
  }

  private static deleteColumn() {
    if (this.selection.cells.length === 0) return;
    
    const cell = this.selection.cells[0].element;
    const table = cell.closest('table') as HTMLTableElement;
    if (!table || table.rows[0].cells.length <= 1) return;

    const colIndex = parseInt(cell.dataset.col || "0");

    Array.from(table.rows).forEach((row: HTMLTableRowElement) => {
      const cells = Array.from(row.cells);
      const targetCell = cells.find(cell => 
        parseInt(cell.dataset.col || "0") === colIndex
      ) as HTMLTableCellElement;
      
      if (targetCell) {
        targetCell.remove();
      }
    });

    this.updateColumnIndices(table, colIndex);
    this.clearSelection();
  }

  private static updateRowIndices(table: HTMLTableElement, startRow: number) {
    Array.from(table.rows).forEach((row, i) => {
      if (i >= startRow) {
        Array.from(row.cells).forEach(cell => {
          cell.dataset.row = i.toString();
        });
      }
    });
  }

  private static updateColumnIndices(table: HTMLTableElement, startCol: number) {
    Array.from(table.rows).forEach(row => {
      Array.from(row.cells).forEach((cell, j) => {
        if (j >= startCol) {
          cell.dataset.col = j.toString();
        }
      });
    });
  }

  static value(node: HTMLElement) {
    const table = node.querySelector('table');
    const rows = table?.querySelectorAll("tr").length || 0;
    const firstRow = table?.querySelector("tr");
    const cols = firstRow ? firstRow.querySelectorAll("td").length : 0;
    return { rows, cols };
  }
}

export default TableProBlot; 