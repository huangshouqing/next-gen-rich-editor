// 初始化编辑器
import {
  EditorCore,
  ImageModule,
  LinkModule,
  FontSizeModule,
  FontColorModule,
  BackgroundColorModule,
  HtmlToMarkdown,
  FormulaModule
} from "./src/main";
new EditorCore("#editor", {
  toolbar: [
    ["fontSize"],
    ["bold", "italic", "underline", "strikeThrough"],
    ["justifyLeft", "justifyCenter", "justifyRight", "justifyFull"],
    ["insertUnorderedList", "insertOrderedList"],
    ["indent", "outdent"],
    ["table-pro", "createLink", "insertImage"],
    ["foreColor", "hiliteColor"],
    ["undo", "redo"],
    ["clear", "insertSample", "toMarkdown", "clearFormat"],
    ['formula']
  ],
  modules: [
    ImageModule,
    LinkModule,
    FontSizeModule,
    FontColorModule,
    BackgroundColorModule,
    HtmlToMarkdown,
    FormulaModule
  ],
});
