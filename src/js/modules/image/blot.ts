import { BlockEmbed } from "quill/blots/block";

export default class CustomImageBlot extends BlockEmbed {
  static blotName = "custom-image";
  static tagName = "div";
  static className = "ql-custom-image";

  static create(value: { src: string; align: string }) {
    const node = super.create();
    node.classList.add("image-container", `image-align-${value.align}`);
    node.contentEditable = false;
  
    // 创建图片元素时添加onload回调
    const img = document.createElement('img');
    img.className = 'image-content';
    img.src = value.src;
  
    // 在图片加载完成后设置容器尺寸
    img.onload = () => {
      node.style.width = img.naturalWidth + 'px';
      node.style.height = img.naturalHeight + 'px';
      // 确保图片始终填充容器
      img.style.width = '100%';
      img.style.height = '100%';
    };

    node.appendChild(img);
  
    // 创建调整句柄（保持原有逻辑）
    ['top-left', 'top-right', 'bottom-left', 'bottom-right'].forEach(pos => {
      const handle = document.createElement('div');
      handle.className = 'resize-handle';
      handle.dataset.position = pos;
      node.appendChild(handle);
    });

    return node;
  }

  static value(node: HTMLElement) {
    return {
      src: node.querySelector("img")?.src || "",
      align:
        Array.from(node.classList)
          .find((c) => c.startsWith("image-align-"))
          ?.split("-")[2] || "inline",
    };
  }
}
