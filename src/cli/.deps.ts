export { parseArgs } from 'jsr:@std/cli@1.0.17/parse-args';
export * as Colors from 'jsr:@std/fmt@1.0.8/colors';
export { ensureDir, walk } from 'jsr:@std/fs@1.0.17';
export { toText } from 'jsr:@std/streams@1.0.9';
export {
  dirname,
  fromFileUrl,
  isAbsolute,
  join,
  relative,
  resolve,
  toFileUrl,
} from 'jsr:@std/path@1.0.9';
export { assert } from 'jsr:@std/assert@^0.221.0/assert';

export { pascalCase } from 'jsr:@luca/cases@1.0.0';

export { IoCContainer, type IoCServiceConstructor } from 'jsr:@fathym/ioc@0.0.14';

export {
  z,
  type ZodSchema,
  zodToJsonSchema,
  ZodType,
} from 'jsr:@fathym/common@0.2.287-integration/third-party/zod';
export { Handlebars } from 'jsr:@fathym/common@0.2.287-integration/third-party/handlebars';

export { writeAll, writeAllSync, type Writer, type WriterSync } from 'jsr:@std/io@0.225.2';

export { findClosestMatch } from 'jsr:@fathym/common@0.2.287-integration/matches';
export { merge, mergeWithArrays } from 'jsr:@fathym/common@0.2.287-integration/merge';

export { exists, existsSync } from 'jsr:@fathym/common@0.2.287-integration/path';

export {
  DFSFileHandler,
  LocalDFSFileHandler,
  type LocalDFSFileHandlerDetails,
} from 'jsr:@fathym/dfs@0.0.9-integration';
