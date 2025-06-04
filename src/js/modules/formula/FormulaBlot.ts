import Quill from 'quill-next';
import katex from 'katex';

const Embed = Quill.import('blots/embed') as any;

class FormulaBlot extends Embed {
  static blotName = 'formula';
  static tagName = 'span';
  static className = 'formula-wrapper';

  static create(value: string) {
    const node = super.create();
    node.setAttribute('data-formula', value);
    
    // 创建一个内部容器来放置公式
    const formulaContainer = document.createElement('span');
    formulaContainer.className = 'formula-content';
    
    try {
      katex.render(value, formulaContainer, {
        throwOnError: false,
        displayMode: false
      });
    } catch (error) {
      console.error('Formula render error:', error);
      formulaContainer.textContent = value;
    }
    
    node.appendChild(formulaContainer);
    return node;
  }

  static value(node: HTMLElement) {
    return node.getAttribute('data-formula') || '';
  }
}

// 注册 Blot
Quill.register('formats/formula', FormulaBlot);

export default FormulaBlot; 