import Quill from "quill";

const Block = Quill.import("blots/block") as any;
const Container = Quill.import("blots/container") as any;

class TableCellBlot extends Block {
  static blotName = "table-cell";
  static tagName = "td";

  static create() {
    const node = super.create();
    node.setAttribute("contenteditable", true);
    node.classList.add("ql-table-cell");
    node.textContent = "Cell"; // 确保有内容
    return node;
  }

  value() {
    return {}; // 返回 Blot 的数据
  }
}

class TableRowBlot extends Container {
  static blotName = "table-row";
  static tagName = "tr";

  static create() {
    const node = super.create();
    node.classList.add("ql-table-row");
    return node;
  }

  value() {
    return {};
  }

  insertBefore(blot: any, ref: any) {
    super.insertBefore(blot, ref);
    this.optimizeCells();
  }

  optimizeCells() {
    this.children.forEach((child: { remove: () => void; }, index: number) => {
      if (!(child instanceof TableCellBlot)) {
        const cell = this.scroll.create(TableCellBlot.blotName);
        cell.appendChild(child);
        this.insertBefore(cell, index === 0 ? this.children.head : child);
        child.remove();
      }
    });
  }
}

class TableBlot extends Container {
  static blotName = "table";
  static tagName = "table";

  static create() {
    const node = super.create();
    debugger;
    node.classList.add("custom-table");
    return node;
  }

  value() {
    return {};
  }

  insertBefore(blot: any, ref: any) {
    super.insertBefore(blot, ref);
    this.optimizeRows();
  }

  optimizeRows() {
    this.children.forEach((child: { remove: () => void; }, index: number) => {
      if (!(child instanceof TableRowBlot)) {
        const row = this.scroll.create(TableRowBlot.blotName);
        const cell = this.scroll.create(TableCellBlot.blotName);
        row.appendChild(cell);
        cell.appendChild(child);
        this.insertBefore(row, index === 0 ? this.children.head : child);
        child.remove();
      }
    });
  }
}
TableCellBlot.className = "custom-table-cell";
TableRowBlot.className = "custom-table-row";
TableBlot.className = "custom-table";
function rowId() {
  const id = Math.random().toString(36).slice(2, 6);
  return `row-${id}`;
}

function cellId() {
  const id = Math.random().toString(36).slice(2, 6);
  return `cell-${id}`;
}
// ✅ 添加注册语句
Quill.register({
  "formats/table-cell": TableCellBlot,
  "formats/table-row": TableRowBlot,
  "formats/table": TableBlot,
});
export { Quill, TableCellBlot, TableRowBlot, TableBlot, rowId, cellId };
