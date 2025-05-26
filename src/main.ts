// 从核心模块导入
import RichEditor from "@/js/core/EditorCore.ts";
// 按需引入扩展模块
import TableModule from "@/js/modules/TableModule.ts";
import ImageModule from "@/js/modules/ImageModule.ts";
import LinkModule from "@/js/modules/LinkModule";
import FontSizeModule from "@/js/modules/FontSizeModule";
import FontColorModule from "@/js/modules/FontColorModule";
import BackgroundColorModule from "./js/modules/BackgroundColorModule";
// 导入样式
import "@/css/base.css";
import "@/css/dialog.css";
import "@/css/toolbar.css";
import "@/css/table.css";
import "@/css/image.css";

export {
  RichEditor,
  TableModule,
  ImageModule,
  LinkModule,
  FontSizeModule,
  FontColorModule,
  BackgroundColorModule,
};
