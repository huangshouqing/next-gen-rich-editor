import Container from "quill-next/dist/blots/container";

class TableRowBlot extends Container {
  static blotName = "table-row";
  static tagName = "tr";
  declare domNode: HTMLElement;

  optimize() {
    super.optimize();
    const parent = this.parent;
    if (parent && parent.statics.blotName !== "table-pro") {
      this.unwrap();
    }
  }
}

export default TableRowBlot; 