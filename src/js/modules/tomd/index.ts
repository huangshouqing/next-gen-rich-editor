export default class HtmlToMarkdown {
    /**
     * 将 HTML 转换为 Markdown
     */
    public convert(html: string): string {
      if (!html) return "";
      
      // 创建容器
      const container = document.createElement("div");
      container.innerHTML = html;
      
      // 转换内容
      return this.convertElement(container);
    }
  
    /**
     * 将单个元素转换为 Markdown
     */
    private convertElement(element: HTMLElement): string {
      let result = "";
      
      Array.from(element.childNodes).forEach((node) => {
        if (node.nodeType === Node.TEXT_NODE && node.textContent?.trim()) {
          result += node.textContent;
        } else if (node.nodeType === Node.ELEMENT_NODE) {
          const el = node as HTMLElement;
          
          switch (el.tagName.toLowerCase()) {
            case "p":
              result += `\n\n${this.handleParagraph(el)}`;
              break;
            case "h1":
            case "h2":
            case "h3":
            case "h4":
            case "h5":
            case "h6":
              result += `\n\n${"#".repeat(parseInt(el.tagName[1]))} ${this.convertElement(el)}\n`;
              break;
            case "strong":
            case "b":
              result += `**${this.convertElement(el)}**`;
              break;
            case "em":
            case "i":
              result += `*${this.convertElement(el)}*`;
              break;
            case "u":
              result += `__${this.convertElement(el)}__`;
              break;
            case "strike":
            case "s":
              result += `~~${this.convertElement(el)}~~`;
              break;
            case "a":
              const href = el.getAttribute("href") || "";
              const title = el.getAttribute("title") ? ` "${el.getAttribute("title")}"` : "";
              result += `[${this.convertElement(el)}](${href}${title})`;
              break;
            case "ul":
              result += `\n\n${this.handleList(el)}`;
              break;
            case "ol":
              result += `\n\n${this.handleOrderedList(el)}`;
              break;
            case "li":
              result += `\n- ${this.convertElement(el)}`;
              break;
            case "img":
              const src = el.getAttribute("src") || "";
              const alt = el.getAttribute("alt") || "";
              const titleAttr = el.getAttribute("title") || "";
              result += `![${alt}](${src}${titleAttr ? ` "${titleAttr}"` : ""})`;
              break;
            case "blockquote":
              result += `\n\n> ${this.convertElement(el).replace(/\n/g, "\n> ")}`;
              break;
            case "code":
              if (el.parentElement?.tagName.toLowerCase() === "pre") {
                // 代码块
                result += `\n\n\`\`\`${el.className || ""}\n${el.textContent}\n\`\`\``;
              } else {
                // 行内代码
                result += `\`${el.textContent}\``;
              }
              break;
            case "table":
              result += `\n\n${this.handleTable(el)}`;
              break;
            case "br":
              result += "\n";
              break;
            default:
              result += this.convertElement(el);
          }
        }
      });
      
      return result.trim();
    }
  
    /**
     * 处理段落标签
     */
    private handleParagraph(element: HTMLElement): string {
      return `${this.convertElement(element)}`;
    }
  
    /**
     * 处理无序列表
     */
    private handleList(element: HTMLElement): string {
      let result = "";
      
      Array.from(element.querySelectorAll("li")).forEach((li) => {
        result += `\n- ${this.convertElement(li)}`;
      });
      
      return result;
    }
  
    /**
     * 处理有序列表
     */
    private handleOrderedList(element: HTMLElement): string {
      let result = "";
      let index = 1;
      
      Array.from(element.querySelectorAll("li")).forEach((li) => {
        result += `\n${index}. ${this.convertElement(li)}`;
        index++;
      });
      
      return result;
    }
  
    /**
     * 处理表格
     */
    private handleTable(table: HTMLElement): string {
      const rows = table.querySelectorAll("tr");
      if (rows.length < 1) return "";
      
      let markdown = "\n";
      
      // 处理表头
      const headerRow = rows[0];
      const headers = Array.from(headerRow.querySelectorAll("th")) as HTMLElement[];
      if (headers.length > 0) {
        markdown += "| ";
        markdown += headers.map(h => this.convertElement(h)).join(" | ");
        markdown += " |\n";
        
        // 分隔行
        markdown += "| ";
        markdown += new Array(headers.length).fill("---").join(" | ");
        markdown += " |\n";
        
        // 处理内容行
        for (let i = 1; i < rows.length; i++) {
          const row = rows[i];
          const cells = Array.from(row.querySelectorAll("td")) as HTMLElement[];
          
          if (cells.length > 0) {
            markdown += "| ";
            markdown += cells.map(c => this.convertElement(c)).join(" | ");
            markdown += " |\n";
          }
        }
      } else {
        // 如果没有表头，将所有行视为数据行
        Array.from(rows).forEach(row => {
          const cells = Array.from(row.querySelectorAll("td, th")) as HTMLElement[];
          
          if (cells.length > 0) {
            markdown += "| ";
            markdown += cells.map(c => this.convertElement(c)).join(" | ");
            markdown += " |\n";
          }
        });
      }
      
      return markdown;
    }
  }