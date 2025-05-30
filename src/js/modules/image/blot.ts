import { BlockEmbed } from "quill/blots/block";

interface CustomImageValue {
  src: string;
  alt: string;
}

export class CustomImageBlot extends BlockEmbed {
  static create(value: CustomImageValue) {
    return `<img src="${value.src}" alt="${value.alt}"></div>`;
  }
  html() {
    const node = this.domNode;
    const src = node.getAttribute('src');
    const width = node.getAttribute('width');
    const alt = node.getAttribute('alt');
    // 其他需要保存的参数，都可以存储在 data-xxx 上
    return `<img src="${src}" width="${width}" alt="${alt}">`;
  }
}
