// 初始化编辑器
import {
  RichEditor,
  TableEditor,
  ImageEditor,
  LinkModule,
  FontSizeModule,
} from "./src/main";
new RichEditor("#editor", {
  toolbar: [
    ["bold", "italic", "underline", "strikeThrough"],
    ["justifyLeft", "justifyCenter", "justifyRight", "justifyFull"],
    ["insertUnorderedList", "insertOrderedList"],
    ["indent", "outdent"],
    ["insertTable", "createLink", "insertImage"],
    ["foreColor", "hiliteColor"],
    ["undo", "redo"],
    ["clear", "insertSample", "toMarkdown"],
    ["fontSize"],
  ],
  modules: [TableEditor, ImageEditor, LinkModule, FontSizeModule],
});
