// 从核心模块导入
import RichEditor from "@/js/core/EditorCore.ts";
// 按需引入扩展模块
import TableEditor from "@/js/modules/TableEditor.ts";
import ImageEditor from "@/js/modules/ImageEditor.ts";
import LinkModule from "@/js/modules/LinkModule";
import FontModule from "@/js/modules/FontModule";

// 初始化编辑器
const editor = new RichEditor("#editor", {
  modules: [TableEditor, ImageEditor, LinkModule, FontModule],
});