export default class ClearFormatModule {
  public name: string = "ClearFormatModule";
  public editor: any;
  constructor(editor: any) {
    this.editor = editor;
  }
  public clearFormat(): void {
    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0) {
      return console.warn("选区内容为空");
    }
    const range = selection.getRangeAt(0);
    const fragment = range.cloneContents();

    // 移除所有子元素的样式
    const elements = fragment.querySelectorAll("*");
    elements.forEach((el) => {
      el.removeAttribute("style");
    });

    // ❌ 问题：直接删除内容并插入新节点会破坏原有选区
    range.deleteContents();
    range.insertNode(fragment);

    // ✅ 新增：恢复选区到插入内容的末尾
    range.setStartAfter(fragment.lastChild || fragment);
    range.collapse(true);
    selection.removeAllRanges();
    selection.addRange(range);
  }
}
