import { Colors } from '../.deps.ts';
import type { RGBStyleKeys, StyleKeys, StyleOptions } from '../styling/StyleKeys.ts';

export function appendStyles(text: string, styleKey: StyleOptions): string {
  let append: (txt: string) => string;

  let [style, ...rgb] = styleKey.split(':') as [
    StyleKeys | RGBStyleKeys,
    string | number,
    string | number | undefined,
    string | number | undefined,
  ];

  if (rgb) {
    rgb = rgb.map((x) => x !== undefined ? Number.parseInt(x as string) : undefined) as [
      number,
      number | undefined,
      number | undefined,
    ];
  }

  if (
    style === 'bgRgb24' ||
    style === 'rgb24' ||
    style === 'rgb8' ||
    style === 'bgRgb8'
  ) {
    if (!rgb[1]) {
      const call = Colors[style] as (str: string, color: number) => string;

      append = (txt) => call(txt, rgb[0] as number);
    } else {
      const color = {
        r: rgb[0],
        g: rgb[1]!,
        b: rgb[2]!,
      } as Colors.Rgb;

      const call = Colors[style] as (str: string, color: Colors.Rgb) => string;

      append = (txt) => call(txt, color);
    }
  } else {
    const call = Colors[style] as (str: string) => string;

    append = (txt) => call(txt);
  }

  text = append(text);

  return text;
}
