// 初始化编辑器
import {
  RichEditor,
  TableEditor,
  ImageEditor,
  LinkModule,
  FontModule,
} from "./src/main";
const editor = new RichEditor("#editor", {
  modules: [TableEditor, ImageEditor, LinkModule, FontModule],
});
