import type { StyleOptions } from "../styling/StyleKeys.ts";
import type { TextContent } from "../styling/TextContent.ts";
import { appendStyles } from "./appendStyles.ts";

export function buildTextContent(
  content?: string | TextContent,
): string {
  let result = "";

  if (content) {
    if (typeof content === "string") {
      content = { Text: content };
    }

    const contentStyles: StyleOptions[] = (!content.Styles || Array.isArray(content.Styles) ? content.Styles : [content.Styles]) || [];

    result = content.Text;

    result = contentStyles?.reduce((txt, nextStyle) => {
      return appendStyles(txt, nextStyle);
    }, result) ?? result;
  }

  return result;
}
