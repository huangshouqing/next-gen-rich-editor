export default class ContextMenu {
  private menu: HTMLElement;
  constructor(items: { label: string; handler: () => void }[]) {
    this.menu = document.createElement("div");
    this.menu.className = "next-gen-rich-editor-context-menu";
    this.menu.style.position = "absolute";
    this.menu.style.zIndex = "9999";
    this.menu.style.background = "#fff";
    this.menu.style.border = "1px solid #ccc";
    this.menu.style.padding = "8px";
    this.menu.style.borderRadius = "4px";
    this.menu.style.boxShadow = "0 2px 8px rgba(0,0,0,0.15)";
    this.menu.style.fontSize = "14px";
    this.menu.style.minWidth = "110px";
    this.menu.style.display = "none";

    items.forEach((item) => {
      const itemElement = document.createElement("div");
      itemElement.textContent = item.label;
      itemElement.style.padding = "6px 16px";
      itemElement.style.cursor = "pointer";
      itemElement.style.transition = "background 0.2s";
      itemElement.addEventListener("click", () => {
        item.handler();
        this.hide();
      });
      itemElement.addEventListener("mouseenter", () => {
        itemElement.style.backgroundColor = "#f0f0f0";
      });
      itemElement.addEventListener("mouseleave", () => {
        itemElement.style.backgroundColor = "transparent";
      });
      this.menu.appendChild(itemElement);
    });
    document.body.appendChild(this.menu);
  }

  public show(x: number, y: number): void {
    this.menu.style.top = `${y}px`;
    this.menu.style.left = `${x}px`;
    this.menu.style.display = "block";
  }

  public hide(): void {
    this.menu.style.display = "none";
  }

  public destroy(): void {
    document.body.removeChild(this.menu);
  }
}
