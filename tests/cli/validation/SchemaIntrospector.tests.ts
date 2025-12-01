import { assertEquals } from "jsr:@std/assert@^1.0.0";
import { describe, it } from "jsr:@std/testing@^1.0.0/bdd";
import { z } from "../../../src/.deps.ts";
import { SchemaIntrospector } from "../../../src/validation/SchemaIntrospector.ts";

describe("SchemaIntrospector", () => {
  const introspector = new SchemaIntrospector();

  describe("isComplexType", () => {
    it("returns true for ZodObject", () => {
      assertEquals(
        introspector.isComplexType(z.object({ key: z.string() })),
        true,
      );
    });

    it("returns true for ZodArray", () => {
      assertEquals(introspector.isComplexType(z.array(z.number())), true);
    });

    it("returns true for ZodRecord", () => {
      assertEquals(
        introspector.isComplexType(z.record(z.string(), z.string())),
        true,
      );
    });

    it("returns false for ZodString", () => {
      assertEquals(introspector.isComplexType(z.string()), false);
    });

    it("returns false for ZodNumber", () => {
      assertEquals(introspector.isComplexType(z.number()), false);
    });

    it("returns false for ZodBoolean", () => {
      assertEquals(introspector.isComplexType(z.boolean()), false);
    });

    it("unwraps optional and returns inner type check", () => {
      assertEquals(introspector.isComplexType(z.object({}).optional()), true);
      assertEquals(introspector.isComplexType(z.string().optional()), false);
    });
  });

  describe("shouldFileCheck", () => {
    it("returns true for complex types by default", () => {
      assertEquals(introspector.shouldFileCheck(z.object({})), true);
      assertEquals(introspector.shouldFileCheck(z.array(z.string())), true);
    });

    it("returns false for primitive types by default", () => {
      assertEquals(introspector.shouldFileCheck(z.string()), false);
      assertEquals(introspector.shouldFileCheck(z.number()), false);
    });

    it("respects explicit fileCheck: true on primitives", () => {
      assertEquals(
        introspector.shouldFileCheck(z.string().meta({ fileCheck: true })),
        true,
      );
    });

    it("respects explicit fileCheck: false on complex types", () => {
      assertEquals(
        introspector.shouldFileCheck(z.object({}).meta({ fileCheck: false })),
        false,
      );
    });
  });

  describe("getMeta", () => {
    it("extracts meta from schema", () => {
      const schema = z.string().meta({ argName: "myArg" });
      const meta = introspector.getMeta(schema);
      assertEquals(meta.argName, "myArg");
    });

    it("returns empty object for schema without meta", () => {
      const meta = introspector.getMeta(z.string());
      assertEquals(meta, {});
    });
  });

  describe("getTypeName", () => {
    it("returns type name for various schemas", () => {
      // Zod 4 returns capitalized type names (ZodString, ZodNumber, etc.)
      const stringType = introspector.getTypeName(z.string());
      const numberType = introspector.getTypeName(z.number());
      const booleanType = introspector.getTypeName(z.boolean());
      const objectType = introspector.getTypeName(z.object({}));
      const arrayType = introspector.getTypeName(z.array(z.string()));

      // Check for lowercase or Zod-style names
      assertEquals(stringType.toLowerCase().includes("string"), true);
      assertEquals(numberType.toLowerCase().includes("number"), true);
      assertEquals(booleanType.toLowerCase().includes("boolean"), true);
      assertEquals(objectType.toLowerCase().includes("object"), true);
      assertEquals(arrayType.toLowerCase().includes("array"), true);
    });
  });

  describe("getObjectShape", () => {
    it("returns shape for object schema", () => {
      const schema = z.object({ name: z.string(), age: z.number() });
      const shape = introspector.getObjectShape(schema);
      assertEquals(Object.keys(shape ?? {}), ["name", "age"]);
    });

    it("returns undefined for non-object schema", () => {
      assertEquals(introspector.getObjectShape(z.string()), undefined);
    });
  });
});
