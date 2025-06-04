import Quill from 'quill-next';
import katex from 'katex';
import 'katex/dist/katex.min.css';

export class FormulaModal {
  private quill: Quill;
  private modal: HTMLDivElement = document.createElement('div');
  private input: HTMLTextAreaElement = document.createElement('textarea');
  private preview: HTMLDivElement = document.createElement('div');
  private currentFormulaElement: HTMLElement | null = null;

  // 公式分类数据
  private formulaCategories = [
    {
      name: '基础数学',
      items: [
        { display: 'x²', latex: 'x^2' },
        { display: '√x', latex: '\\sqrt{x}' },
        { display: 'ⁿ√x', latex: '\\sqrt[n]{x}' },
        { display: 'a/b', latex: '\\frac{a}{b}' },
        { display: '∑', latex: '\\sum_{i=1}^n' },
        { display: '∫', latex: '\\int_{a}^b' },
        { display: '∏', latex: '\\prod_{i=1}^n' },
        { display: 'lim', latex: '\\lim_{x \\to \\infty}' }
      ]
    },
    {
      name: '希腊字母',
      items: [
        { display: 'α', latex: '\\alpha' },
        { display: 'β', latex: '\\beta' },
        { display: 'γ', latex: '\\gamma' },
        { display: 'δ', latex: '\\delta' },
        { display: 'ε', latex: '\\epsilon' },
        { display: 'θ', latex: '\\theta' },
        { display: 'λ', latex: '\\lambda' },
        { display: 'π', latex: '\\pi' },
        { display: 'σ', latex: '\\sigma' },
        { display: 'φ', latex: '\\phi' },
        { display: 'ω', latex: '\\omega' },
        { display: 'Δ', latex: '\\Delta' }
      ]
    },
    {
      name: '运算符',
      items: [
        { display: '±', latex: '\\pm' },
        { display: '×', latex: '\\times' },
        { display: '÷', latex: '\\div' },
        { display: '≠', latex: '\\neq' },
        { display: '≤', latex: '\\leq' },
        { display: '≥', latex: '\\geq' },
        { display: '≈', latex: '\\approx' },
        { display: '∞', latex: '\\infty' }
      ]
    },
    {
      name: '矩阵',
      items: [
        { 
          display: '2×2',
          latex: '\\begin{pmatrix} a & b \\\\ c & d \\end{pmatrix}'
        },
        { 
          display: '3×3',
          latex: '\\begin{pmatrix} a & b & c \\\\ d & e & f \\\\ g & h & i \\end{pmatrix}'
        },
        {
          display: '|2×2|',
          latex: '\\begin{vmatrix} a & b \\\\ c & d \\end{vmatrix}'
        }
      ]
    },
    {
      name: '集合',
      items: [
        { display: '∈', latex: '\\in' },
        { display: '∉', latex: '\\notin' },
        { display: '⊆', latex: '\\subseteq' },
        { display: '⊂', latex: '\\subset' },
        { display: '∪', latex: '\\cup' },
        { display: '∩', latex: '\\cap' },
        { display: '∅', latex: '\\emptyset' }
      ]
    }
  ];

  constructor(quill: Quill) {
    this.quill = quill;
    this.createModal();
    this.bindEvents();
  }

  private createFormulaButton(item: { display: string; latex: string }): HTMLButtonElement {
    const button = document.createElement('button');
    button.type = 'button';
    button.title = item.latex;
    
    // 创建一个容器来包装 KaTeX 渲染的内容
    const wrapper = document.createElement('div');
    wrapper.style.width = '100%';
    wrapper.style.height = '100%';
    wrapper.style.position = 'relative';
    
    try {
      katex.render(item.latex, wrapper, {
        throwOnError: false,
        displayMode: false
      });
      
      // 获取渲染后的 KaTeX 元素
      const katexElement = wrapper.querySelector('.katex') as HTMLElement;
      if (katexElement) {
        // 计算缩放比例
        const containerSize = 32; // 按钮的内部可用空间
        const width = katexElement.offsetWidth;
        const height = katexElement.offsetHeight;
        const scale = Math.min(
          containerSize / width,
          containerSize / height,
          1
        );
        
        // 应用缩放
        katexElement.style.setProperty('--scale', scale.toString());
      }
    } catch (error) {
      console.error('Formula render error:', error);
      wrapper.textContent = item.display;
    }
    
    button.appendChild(wrapper);
    button.addEventListener('click', () => this.insertFormulaTemplate(item.latex));
    return button;
  }

  private createModal(): void {
    this.modal.className = 'formula-modal';
    
    const container = document.createElement('div');
    container.className = 'formula-modal-container';

    // 创建标题栏
    const header = document.createElement('div');
    header.className = 'formula-modal-header';
    
    const title = document.createElement('h3');
    title.textContent = '插入公式';
    
    const closeButton = document.createElement('button');
    closeButton.className = 'close-button';
    closeButton.innerHTML = '&times;';
    closeButton.addEventListener('click', () => this.hide());
    
    header.appendChild(title);
    header.appendChild(closeButton);

    // 创建主体内容
    const body = document.createElement('div');
    body.className = 'formula-modal-body';

    // 创建公式分类区域
    const categoriesContainer = document.createElement('div');
    categoriesContainer.className = 'formula-categories';

    this.formulaCategories.forEach(category => {
      const categoryDiv = document.createElement('div');
      categoryDiv.className = 'category';
      
      const categoryTitle = document.createElement('h4');
      categoryTitle.textContent = category.name;
      
      const itemsDiv = document.createElement('div');
      itemsDiv.className = 'formula-items';
      
      category.items.forEach(item => {
        const button = this.createFormulaButton(item);
        itemsDiv.appendChild(button);
      });
      
      categoryDiv.appendChild(categoryTitle);
      categoryDiv.appendChild(itemsDiv);
      categoriesContainer.appendChild(categoryDiv);
    });

    // 创建输入和预览区域
    const editorContainer = document.createElement('div');
    editorContainer.className = 'formula-editor-container';

    // 创建输入区域
    const inputWrapper = document.createElement('div');
    inputWrapper.className = 'formula-input-wrapper';
    
    const inputTitle = document.createElement('div');
    inputTitle.className = 'formula-section-title';
    inputTitle.textContent = 'LaTeX 公式';
    
    this.input.placeholder = '输入 LaTeX 公式...';
    this.input.className = 'formula-input';
    
    inputWrapper.appendChild(inputTitle);
    inputWrapper.appendChild(this.input);

    // 创建预览区域
    const previewWrapper = document.createElement('div');
    previewWrapper.className = 'formula-preview-wrapper';
    
    const previewTitle = document.createElement('div');
    previewTitle.className = 'formula-section-title';
    previewTitle.textContent = '预览';
    
    this.preview.className = 'formula-preview';
    
    previewWrapper.appendChild(previewTitle);
    previewWrapper.appendChild(this.preview);

    // 组装编辑器容器
    editorContainer.appendChild(inputWrapper);
    editorContainer.appendChild(previewWrapper);

    // 创建按钮容器
    const buttonContainer = document.createElement('div');
    buttonContainer.className = 'formula-button-container';

    const insertButton = document.createElement('button');
    insertButton.textContent = '插入';
    insertButton.className = 'formula-button insert';
    insertButton.addEventListener('click', () => this.handleInsert());

    const cancelButton = document.createElement('button');
    cancelButton.textContent = '取消';
    cancelButton.className = 'formula-button cancel';
    cancelButton.addEventListener('click', () => this.hide());

    buttonContainer.appendChild(insertButton);
    buttonContainer.appendChild(cancelButton);

    // 组装所有元素
    body.appendChild(categoriesContainer);
    body.appendChild(editorContainer);
    body.appendChild(buttonContainer);

    container.appendChild(header);
    container.appendChild(body);
    this.modal.appendChild(container);

    document.body.appendChild(this.modal);
  }

  private insertFormulaTemplate(latex: string): void {
    const cursorPos = this.input.selectionStart;
    const currentValue = this.input.value;
    
    this.input.value = 
      currentValue.substring(0, cursorPos) +
      latex +
      currentValue.substring(this.input.selectionEnd);
    
    // 更新光标位置
    const newCursorPos = cursorPos + latex.length;
    this.input.setSelectionRange(newCursorPos, newCursorPos);
    
    // 更新预览
    this.updatePreview();
    
    // 聚焦回输入框
    this.input.focus();
  }

  private bindEvents(): void {
    this.input.addEventListener('input', () => {
      this.updatePreview();
    });

    // 点击模态框外部关闭
    this.modal.addEventListener('click', (e) => {
      if (e.target === this.modal) {
        this.hide();
      }
    });

    // 添加键盘快捷键支持
    this.modal.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        this.hide();
      } else if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
        this.handleInsert();
      }
    });
  }

  private updatePreview(): void {
    try {
      const formula = this.input.value;
      katex.render(formula, this.preview, {
        throwOnError: false,
        displayMode: true
      });
    } catch (error) {
      this.preview.textContent = '预览出错';
    }
  }

  private handleInsert(): void {
    const formula = this.input.value;
    if (!formula) return;

    const range = this.currentFormulaElement
      ? this.quill.getSelection()
      : this.quill.getSelection(true);

    if (range) {
      if (this.currentFormulaElement) {
        // 更新现有公式
        const found = Quill.find(this.currentFormulaElement);
        if (found && 'parent' in found) { // Check if it's a Blot
          const index = this.quill.getIndex(found);
          if (index !== -1) {
            this.quill.deleteText(index, 1);
            this.quill.insertEmbed(index, 'formula', formula);
          }
        }
      } else {
        // 插入新公式
        this.quill.insertEmbed(range.index, 'formula', formula);
        this.quill.setSelection(range.index + 1);
      }
    }

    this.hide();
  }

  public show(formulaElement?: HTMLElement): void {
    this.currentFormulaElement = formulaElement || null;
    if (formulaElement) {
      this.input.value = formulaElement.getAttribute('data-formula') || '';
    } else {
      this.input.value = '';
    }
    this.updatePreview();
    this.modal.style.display = 'flex';
    this.input.focus();
  }

  public hide(): void {
    this.modal.style.display = 'none';
    this.currentFormulaElement = null;
    this.input.value = '';
    this.preview.innerHTML = '';
  }
} 