# 富文本编辑器使用文档

## 📦 安装与运行

```bash
npm run dev # 开发模式，访问 http://localhost:3000 查看示例

npm run build # 构建生产环境代码，生成 dist 目录

# 本地调试
npm link
cd test-project
npm link rich-editor
```

### ⚙️ 环境要求
| 工具 | 版本 |
|------|------|
| Node.js | v18.20.3 |
| npm | v6.14.17 |

---

## 🧩 核心接口

### 🔁 内容操作方法

| 方法 | 参数 | 返回值 | 功能说明 |
|------|------|--------|----------|
| [getContent()](file:///Users/huangshouqing/Desktop/代码/rich-editor/src/js/core/EditorCore.ts#L491-L498) | 无 | `string` | 获取当前 HTML 内容 |
| [setContent(content)](file:///Users/huangshouqing/Desktop/代码/rich-editor/src/js/core/EditorCore.ts#L504-L514) | `content: string` | `void` | 设置新的 HTML 内容 |
| [getPlainText()](file:///Users/huangshouqing/Desktop/代码/rich-editor/src/js/core/EditorCore.ts#L519-L526) | 无 | `string` | 获取纯文本内容 |
| [insertContent(html)](file:///Users/huangshouqing/Desktop/代码/rich-editor/src/js/core/EditorCore.ts#L532-L553) | `html: string` | `void` | 在当前光标处插入内容 |
| [replaceSelection(html)](file:///Users/huangshouqing/Desktop/代码/rich-editor/src/js/core/EditorCore.ts#L559-L590) | `html: string` | `void` | 替换当前选中内容 |
| [clearContent()](file:///Users/huangshouqing/Desktop/代码/rich-editor/src/js/core/EditorCore.ts#L613-L624) | 无 | `void` | 清空编辑器内容 |

---

## 🛠 使用示例

### 初始化编辑器
```javascript
const editor = new EditorCore("#editor-container", {
  modules: [TableEditor, ImageEditor]
});
```

### 设置初始化内容
```javascript
editor.setContent(`
  <h1>标题</h1>
  <p>这是一段初始化内容</p>
`);
```

### 获取内容
```javascript
const htmlContent = editor.getContent(); // 获取 HTML
const plainText = editor.getPlainText(); // 获取纯文本
```

### 插入内容
```javascript
editor.insertContent("<p>这是插入的新段落</p>");
```

### 替换选中内容
```javascript
editor.replaceSelection("<strong>加粗替换内容</strong>");
```

### 清空内容
```javascript
editor.clearContent();
```

---

## 🔄 历史记录功能

### 撤销/重做操作

| 方法 | 参数 | 返回值 | 功能说明 |
|------|------|--------|----------|
| undo() | 无 | `void` | 执行撤销操作 |
| redo() | 无 | `void` | 执行重做操作 |

### 使用示例

```javascript
// 撤销上一步操作
editor.undo();

// 重做已撤销的操作
editor.redo();
```

---

## 📦 HTML 转换工具

### 将 HTML 转换为 DOM 元素

```typescript
/**
 * 将 HTML 字符串转换为 DOM 元素
 * @param htmlString - HTML 字符串
 * @returns 包含解析内容的 div 元素
 */
public parseHTML(htmlString: string): HTMLElement {
  const parser = new DOMParser();
  const doc = parser.parseFromString(htmlString, "text/html");
  const container = document.createElement("div");

  // 复制所有子节点到容器中
  while (doc.body.firstChild) {
    container.appendChild(doc.body.firstChild);
  }

  return container;
}
```

---

## 📌 注意事项

- **XSS 防护**：如需防止脚本注入，建议对输入内容进行清理
- **内容验证**：插入前应确保 HTML 格式正确
- **性能优化**：大文档操作时注意性能影响
- **数据绑定**：可结合 Vue/React 等框架实现双向绑定

如需进一步集成表单提交、JSON 序列化或 Markdown 支持，请告知具体需求。