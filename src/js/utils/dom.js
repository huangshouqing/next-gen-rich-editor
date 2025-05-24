// js/utils/dom.js
export const DomUtils = {
  createElement(tag, attrs = {}) {
    const el = document.createElement(tag);
    Object.entries(attrs).forEach(([key, value]) => {
      el[key] = value;
    });
    return el;
  },

  getSelectionRange() {
    return window.getSelection().getRangeAt(0);
  },

  restoreSelection(range) {
    const sel = window.getSelection();
    sel.removeAllRanges();
    sel.addRange(range);
  },
};
