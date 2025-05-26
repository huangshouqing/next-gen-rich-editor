// 初始化编辑器
import {
  RichEditor,
  TableModule,
  ImageModule,
  LinkModule,
  FontSizeModule,
  FontColorModule,
  BackgroundColorModule,
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
    ["clear", "insertSample", "toMarkdown"],
  ],
  modules: [
    TableModule,
    ImageModule,
    LinkModule,
    FontSizeModule,
    FontColorModule,
    BackgroundColorModule,],
});
