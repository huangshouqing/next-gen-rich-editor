// 初始化编辑器
import {
  RichEditor,
  ImageModule,
  LinkModule,
  FontSizeModule,
  FontColorModule,
  BackgroundColorModule,
  HtmlToMarkdown
} from "./src/main";
new RichEditor("#editor", {
  toolbar: [
    ["fontSize"],
    ["bold", "italic", "underline", "strikeThrough"],
    ["justifyLeft", "justifyCenter", "justifyRight", "justifyFull"],
    ["insertUnorderedList", "insertOrderedList"],
    ["indent", "outdent"],
    ["insertTable", "createLink", "insertImage"],
    ["foreColor", "hiliteColor"],
    ["undo", "redo"],
    ["clear", "insertSample", "toMarkdown", "clearFormat"],
  ],
  modules: [
    ImageModule,
    LinkModule,
    FontSizeModule,
    FontColorModule,
    BackgroundColorModule,
    HtmlToMarkdown
  ],
});
