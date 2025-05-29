import { ContentAlign, ContentList, FontSize } from "./types";
export function isRTL(): boolean {
  if (!document || !document.documentElement) {
    return false;
  }

  const htmlDir: string | null = document.documentElement.getAttribute("dir");
  return htmlDir !== null && htmlDir === "rtl";
}
export class DeckdeckgoInlineEditorUtils {
  static async getBold(
    element: HTMLElement
  ): Promise<"bold" | "initial" | undefined> {
    if (await this.isTag(element, "b")) {
      return "bold";
    }

    if (await this.isTag(element, "strong")) {
      return "bold";
    }

    return element.style.fontWeight === "bold"
      ? "bold"
      : element.style.fontWeight === "initial"
      ? "initial"
      : undefined;
  }

  static async getItalic(
    element: HTMLElement
  ): Promise<"italic" | "initial" | undefined> {
    if (await this.isTag(element, "i")) {
      return "italic";
    }

    if (await this.isTag(element, "em")) {
      return "italic";
    }

    if (element.style.fontStyle === "italic") {
      return "italic";
    }

    if (element.style.fontStyle === "initial") {
      return "initial";
    }

    if (!element.hasChildNodes()) {
      return undefined;
    }

    const children: HTMLCollection = element.children;
    if (children && children.length > 0) {
      const selectedChild: HTMLElement = Array.from(children).find(
        (child: HTMLElement) => {
          return (
            child.style.fontStyle === "italic" ||
            child.style.fontStyle === "initial"
          );
        }
      ) as HTMLElement;

      if (selectedChild) {
        return selectedChild.style.fontStyle === "italic"
          ? "italic"
          : "initial";
      }
    }

    return undefined;
  }

  static async getUnderline(
    element: HTMLElement
  ): Promise<"underline" | "initial" | undefined> {
    if (await this.isTag(element, "u")) {
      return "underline";
    }

    if (element.style.textDecoration === "underline") {
      return "underline";
    }

    if (element.style.textDecoration === "initial") {
      return "initial";
    }

    if (!element.hasChildNodes()) {
      return undefined;
    }

    const children: HTMLCollection = element.children;
    if (children && children.length > 0) {
      const selectedChild: HTMLElement = Array.from(children).find(
        (child: HTMLElement) => {
          return (
            child.style.textDecorationLine === "underline" ||
            child.style.textDecorationLine === "initial"
          );
        }
      ) as HTMLElement;

      if (selectedChild) {
        return selectedChild.style.fontStyle === "underline"
          ? "underline"
          : "initial";
      }
    }

    return undefined;
  }

  static async getStrikeThrough(
    element: HTMLElement
  ): Promise<"strikethrough" | "initial" | undefined> {
    if (await this.isTag(element, "strike")) {
      return "strikethrough";
    }

    if (element.style.textDecoration === "line-through") {
      return "strikethrough";
    }

    if (element.style.textDecoration === "initial") {
      return "initial";
    }

    if (!element.hasChildNodes()) {
      return undefined;
    }

    const children: HTMLCollection = element.children;
    if (children && children.length > 0) {
      const selectedChild: HTMLElement = Array.from(children).find(
        (child: HTMLElement) => {
          return (
            child.style.textDecoration === "line-through" ||
            child.style.textDecoration === "initial"
          );
        }
      ) as HTMLElement;

      if (selectedChild) {
        return selectedChild.style.fontStyle === "line-through"
          ? "strikethrough"
          : "initial";
      }
    }

    return undefined;
  }

  static async getList(element: HTMLElement): Promise<ContentList | undefined> {
    if (!element) {
      return undefined;
    }

    if (
      element.nodeName &&
      element.nodeName.toLowerCase() === "li" &&
      element.parentElement &&
      element.parentElement.nodeName
    ) {
      return element.parentElement.nodeName.toLowerCase() === "ol"
        ? ContentList.ORDERED
        : element.parentElement.nodeName.toLowerCase() === "ul"
        ? ContentList.UNORDERED
        : undefined;
    }

    return undefined;
  }

  static async getContentAlignment(
    element: HTMLElement
  ): Promise<ContentAlign> {
    const style: CSSStyleDeclaration = window.getComputedStyle(element);

    if (style.textAlign === "center") {
      return ContentAlign.CENTER;
    } else if (style.textAlign === "right") {
      return ContentAlign.RIGHT;
    } else if (style.textAlign === "left") {
      return ContentAlign.LEFT;
    }

    return isRTL() ? ContentAlign.RIGHT : ContentAlign.LEFT;
  }

  private static async isTag(
    element: HTMLElement,
    tagName: string
  ): Promise<boolean> {
    if (!element) {
      return false;
    }

    if (element.nodeName.toLowerCase() === tagName) {
      return true;
    }

    if (element.hasChildNodes()) {
      const children: HTMLCollection = element.getElementsByTagName(tagName);
      return children && children.length > 0;
    }

    return false;
  }

  static isContainer(containers: string, element: Node): boolean {
    const containerTypes: string[] = containers.toLowerCase().split(",");
    return (
      element &&
      element.nodeName &&
      containerTypes.indexOf(element.nodeName.toLowerCase()) > -1
    );
  }

  static isAnchorImage(
    anchorEvent: MouseEvent | TouchEvent,
    imgAnchor: string
  ): Promise<boolean> {
    return new Promise<boolean>((resolve) => {
      if (!anchorEvent) {
        resolve(false);
        return;
      }

      if (!anchorEvent.target || !(anchorEvent.target instanceof HTMLElement)) {
        resolve(false);
        return;
      }

      const target: HTMLElement = anchorEvent.target;

      resolve(target.nodeName && target.nodeName.toLowerCase() === imgAnchor);
    });
  }

  static findContainer(
    containers: string,
    element: HTMLElement
  ): Promise<HTMLElement> {
    return new Promise<HTMLElement>(async (resolve) => {
      if (!element) {
        resolve();
        return;
      }

      // Just in case
      if (
        element.nodeName.toUpperCase() === "HTML" ||
        element.nodeName.toUpperCase() === "BODY" ||
        !element.parentElement
      ) {
        resolve(element);
        return;
      }

      if (DeckdeckgoInlineEditorUtils.isContainer(containers, element)) {
        resolve(element);
      } else {
        const container: HTMLElement = await this.findContainer(
          containers,
          element.parentElement
        );

        resolve(container);
      }
    });
  }

  static async getFontSize(
    element: HTMLElement
  ): Promise<FontSize | undefined> {
    if (!element || !element.hasAttribute("size")) {
      return undefined;
    }

    return element.getAttribute("size") as FontSize;
  }
}
export async function hexToRgb(hex: string): Promise<string | undefined> {
  if (!hex || hex === undefined || hex === "") {
    return undefined;
  }

  const result: RegExpExecArray | null =
    /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);

  return result
    ? `${parseInt(result[1], 16)}, ${parseInt(result[2], 16)}, ${parseInt(
        result[3],
        16
      )}`
    : undefined;
}
