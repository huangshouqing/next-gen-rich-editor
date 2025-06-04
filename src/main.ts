// 从核心模块导入
import { EditorCore } from "./js/core/index.ts";
// 按需引入扩展模块
import ImageModule from "./js/modules/image/index.ts";
import LinkModule from "./js/modules/link";
import FontSizeModule from "./js/modules/font-size";
import FontColorModule from "./js/modules/font-color";
import BackgroundColorModule from "./js/modules/back-ground-color";
import HtmlToMarkdown from "./js/modules/tomd";
import FormulaModule from "./js/modules/formula";

export {
  EditorCore,
  ImageModule,
  LinkModule,
  FontSizeModule,
  FontColorModule,
  BackgroundColorModule,
  HtmlToMarkdown,
  FormulaModule,
};
