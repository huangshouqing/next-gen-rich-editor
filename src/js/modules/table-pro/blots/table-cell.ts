import Container from "quill-next/dist/blots/container";

class TableCellBlot extends Container {
  static blotName = "table-cell";
  static tagName = "td";
  declare domNode: HTMLElement;

  static create(value: any) {
    const node = super.create() as HTMLElement;
    if (value) {
      if (value.rowspan) node.setAttribute("rowspan", value.rowspan);
      if (value.colspan) node.setAttribute("colspan", value.colspan);
      if (value.background) node.style.backgroundColor = value.background;
    }
    return node;
  }

  static formats(node: HTMLElement) {
    const formats: any = {};
    if (node.hasAttribute("rowspan")) {
      formats.rowspan = node.getAttribute("rowspan");
    }
    if (node.hasAttribute("colspan")) {
      formats.colspan = node.getAttribute("colspan");
    }
    if (node.style.backgroundColor) {
      formats.background = node.style.backgroundColor;
    }
    return formats;
  }

  formatAt(index: number, length: number, name: string, value: any) {
    if (name === "rowspan" || name === "colspan") {
      if (value) {
        this.domNode.setAttribute(name, value);
      } else {
        this.domNode.removeAttribute(name);
      }
    } else if (name === "background") {
      if (value) {
        this.domNode.style.backgroundColor = value;
      } else {
        this.domNode.style.backgroundColor = "";
      }
    } else {
      super.formatAt(index, length, name, value);
    }
  }

  optimize(context: any) {
    super.optimize(context);
    const parent = this.parent;
    if (parent && parent.statics.blotName !== "table-row") {
      this.unwrap();
    }
  }
}

export default TableCellBlot; 