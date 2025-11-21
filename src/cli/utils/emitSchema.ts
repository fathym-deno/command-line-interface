import { join, type ZodSchema, zodToJsonSchema } from "../.deps.ts";

/**
 * Emits a given Zod schema as a JSON Schema to the `schemas/` directory.
 *
 * @param schema - The Zod schema to convert
 * @param schemaName - The name used to generate the output filename
 * @param outputDir - The folder where the file should be written (default: `./schemas`)
 */
export async function emitSchema(
  schema: ZodSchema,
  schemaName: string,
  outputDir = "./schemas",
) {
  const jsonSchema = zodToJsonSchema(schema, schemaName);

  const fileName = `${schemaName}.schema.json`;

  const outPath = join(outputDir, fileName);

  await Deno.mkdir(outputDir, { recursive: true });

  await Deno.writeTextFile(outPath, JSON.stringify(jsonSchema, null, 2));

  console.log(`✅ Schema "${schemaName}" written to ${outPath}`);
}
