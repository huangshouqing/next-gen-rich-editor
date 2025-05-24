// js/modules/ContextMenu.js
export default class ContextMenu {
  constructor(editor) {
    this.editor = editor;
    this.menu = this._createMenu();
    document.addEventListener(
      "contextmenu",
      this._handleContextMenu.bind(this)
    );
  }

  _createMenu() {
    const menu = document.createElement("div");
    menu.className = "context-menu";
    menu.innerHTML = `
        <div class="context-menu-item" data-action="cut">剪切</div>
        <div class="context-menu-item" data-action="copy">复制</div>
        <div class="context-menu-item" data-action="delete">删除</div>
      `;
    document.body.appendChild(menu);
    return menu;
  }

  _handleContextMenu(e) {
    if (e.target.closest(".editor-content")) {
      e.preventDefault();
      this._showMenu(e.clientX, e.clientY);
      this._setupMenuActions(e.target);
    }
  }

  _showMenu(x, y) {
    this.menu.style.display = "block";
    this.menu.style.left = `${x}px`;
    this.menu.style.top = `${y}px`;
  }

  _setupMenuActions(target) {
    this.menu.querySelectorAll(".context-menu-item").forEach((item) => {
      item.addEventListener("click", () => {
        const action = item.dataset.action;
        this._handleAction(action, target);
        this.menu.style.display = "none";
      });
    });
  }

  _handleAction(action, target) {
    switch (action) {
      case "delete":
        target.parentNode.removeChild(target);
        break;
      case "copy":
        navigator.clipboard.writeText(target.textContent);
        break;
      case "cut":
        navigator.clipboard.writeText(target.textContent);
        target.parentNode.removeChild(target);
        break;
    }
  }
}
