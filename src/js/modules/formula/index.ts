import { EditorCore } from "../../core/index";
import "./formula.scss";

/**
 * 公式编辑器类，用于插入LaTeX公式到富文本中
 */
export default class FormulaModule {
  private editor: EditorCore;
  private formulaDialog: HTMLElement | null = null;

  constructor(editor: EditorCore) {
    this.editor = editor;
    this.init();
  }

  /**
   * 初始化公式模块
   */
  private init(): void {
    // 确保MathQuill已加载
    const checkMathQuill = setInterval(() => {
      if (typeof MathQuill !== 'undefined' && MathQuill?.MathField) {
        clearInterval(checkMathQuill);
        this.createFormulaDialog();
        this.bindEvents();
      }
    }, 100);
    
    // 设置最大等待时间（5秒）
    setTimeout(() => {
      clearInterval(checkMathQuill);
      if (typeof MathQuill === 'undefined' || !MathQuill?.MathField) {
        console.error('MathQuill加载超时');
        this.createFallbackDialog();
      }
    }, 5000);
  }

  /**
   * 创建公式弹窗
   */
  private createFormulaDialog(): void {
    this.formulaDialog = document.createElement("div");
    this.formulaDialog.className = "editor-dialog formula-editor-dialog";
    this.formulaDialog.innerHTML = `
      <div class="dialog-header">
        <span>插入公式</span>
        <button class="close-btn">&times;</button>
      </div>
      <div class="dialog-body">
        <div class="formula-list">
          <div class="formula-group">
            <h4>常用公式</h4>
            <div class="formulas">
              <div class="formula-item" data-formula="x^2 + y^2 = z^2">$$ x^2 + y^2 = z^2 $$</div>
              <div class="formula-item" data-formula="\int_{a}^{b} f(x) dx">$$ \int_{a}^{b} f(x) dx $$</div>
              <div class="formula-item" data-formula="\sum_{i=1}^{n} i = \frac{n(n+1)}{2}">$$ \sum_{i=1}^{n} i = \frac{n(n+1)}{2} $$</div>
              <div class="formula-item" data-formula="\sqrt{a^2 + b^2}">$$ \sqrt{a^2 + b^2} $$</div>
              <div class="formula-item" data-formula="\lim_{x \to \infty} f(x)">$$ \lim_{x \to \infty} f(x) $$</div>
            </div>
          </div>
          
          <div class="formula-group">
            <h4>希腊字母</h4>
            <div class="formulas">
              <div class="formula-item" data-formula="\alpha">$$ \alpha $$</div>
              <div class="formula-item" data-formula="\beta">$$ \beta $$</div>
              <div class="formula-item" data-formula="\gamma">$$ \gamma $$</div>
              <div class="formula-item" data-formula="\delta">$$ \delta $$</div>
              <div class="formula-item" data-formula="\epsilon">$$ \epsilon $$</div>
            </div>
          </div>
          
          <div class="formula-group">
            <h4>运算符</h4>
            <div class="formulas">
              <div class="formula-item" data-formula="\pm">$$ \pm $$</div>
              <div class="formula-item" data-formula="\times">$$ \times $$</div>
              <div class="formula-item" data-formula="\div">$$ \div $$</div>
              <div class="formula-item" data-formula="\cdot">$$ \cdot $$</div>
              <div class="formula-item" data-formula="\cap">$$ \cap $$</div>
            </div>
          </div>
        </div>
        
        <div class="formula-preview">
          <div class="preview-title">预览：</div>
          <div class="preview-content"></div>
        </div>
      </div>
      <div class="dialog-footer">
        <input type="text" class="formula-input" placeholder="输入自定义LaTeX公式...">
        <button class="insert-btn">插入</button>
      </div>
    `;

    document.body.appendChild(this.formulaDialog);
  }

  /**
   * 创建降级对话框
   */
  private createFallbackDialog(): void {
    this.formulaDialog = document.createElement("div");
    this.formulaDialog.className = "editor-dialog formula-editor-dialog";
    this.formulaDialog.innerHTML = `
      <div class="dialog-header">
        <span>公式编辑器不可用</span>
        <button class="close-btn">&times;</button>
      </div>
      <div class="dialog-body">
        <p>无法加载MathQuill，请检查网络连接或稍后重试。</p>
      </div>
    `;

    document.body.appendChild(this.formulaDialog);
  }

  /**
   * 绑定事件监听器
   */
  private bindEvents(): void {
    // 关闭按钮点击事件
    const closeButton = this.formulaDialog?.querySelector(".close-btn");
    if (closeButton) {
      closeButton.addEventListener("click", () => {
        this.hideDialog();
      });
    }

    // 插入按钮点击事件
    const insertButton = this.formulaDialog?.querySelector(".insert-btn");
    if (insertButton) {
      insertButton.addEventListener("click", () => {
        const input = this.formulaDialog?.querySelector(
          ".formula-input"
        ) as HTMLInputElement;
        if (input && input.value.trim()) {
          this.insertFormula(input.value.trim(), true);
          this.hideDialog();
        }
      });
    }

    // 点击外部区域关闭弹窗
    document.addEventListener("click", (e) => {
      if (
        this.formulaDialog &&
        !this.formulaDialog.contains(e.target as Node)
      ) {
        debugger
        this.hideDialog();
      }
    });

    // 公式点击事件
    this.formulaDialog?.addEventListener("click", (e) => {
      const target = e.target as HTMLElement;
      if (target.classList.contains("formula-item")) {
        const formula = target.dataset.formula;
        if (formula) {
          this.insertFormula(formula, true);
          this.hideDialog();
        }
      }
    });

    // 预览公式
    const input = this.formulaDialog?.querySelector('.formula-input') as HTMLInputElement;
    if (input) {
      input.addEventListener('input', () => {
        const preview = this.formulaDialog?.querySelector('.preview-content') as HTMLElement;
        if (preview) {
          try {
            // 使用MathQuill渲染预览
            preview.textContent = '';
            
            // 通过window对象访问MathQuill
            const mathQuill = (window as any).MathQuill;
            if (typeof mathQuill !== 'undefined') {
              const mathField = mathQuill.MathField(preview);
              mathField.latex(input.value);
            }
          } catch (error) {
            preview.textContent = '';
          }
        }
      });
    }
  }

  /**
   * 显示公式弹窗
   */
  private showDialog(): void {
    if (this.formulaDialog) {
      const toolbarButton = document.getElementById("formula-btn");
      if (toolbarButton) {
        const rect = toolbarButton.getBoundingClientRect();
        this.formulaDialog.style.position = "absolute";
        this.formulaDialog.style.top = `${rect.bottom}px`;
        this.formulaDialog.style.left = `${rect.left}px`;
        this.formulaDialog.style.zIndex = "9999";
        this.formulaDialog.style.display = "block";
      }
    }
  }

  /**
   * 隐藏公式弹窗
   */
  private hideDialog(): void {
    if (this.formulaDialog) {
      this.formulaDialog.style.display = "none";

      // 清空预览和输入框
      const input = this.formulaDialog.querySelector(
        ".formula-input"
      ) as HTMLInputElement;
      const preview = this.formulaDialog.querySelector(".preview-content");
      if (input) input.value = "";
      if (preview) preview.textContent = "";
    }
  }

  /**
   * 插入公式到编辑器
   * @param formula LaTex公式字符串
   * @param displayMode 是否为块级公式（居中显示）
   */
  private insertFormula(formula: string, displayMode: boolean = false): void {
    // 使用Quill API插入公式
    const range = this.editor.quill.getSelection();
    if (range) {
      // 替换选中文本或插入新公式
      this.editor.quill.deleteText(range.index, range.length);
      
      // 创建MathQuill公式元素
      const formulaElement = document.createElement('span');
      formulaElement.className = 'mathquill-formula';
      formulaElement.setAttribute('data-mathquill', 'block');
      formulaElement.textContent = formula;
      
      // 使用Quill的格式化API插入公式
      this.editor.quill.insertEmbed(
        range.index,
        'formula',
        formulaElement.outerHTML,
        'user'
      );
      
      // 移动光标到公式后面
      this.editor.quill.setSelection(range.index + 1, 0);
    }
  }
}
