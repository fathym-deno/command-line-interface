// deno-lint-ignore-file no-explicit-any
import { assertEquals } from "../../test.deps.ts";
import { CommandIntents } from "../../test.deps.ts";
import { CommandModuleBuilder } from "../../../src/fluent/CommandModuleBuilder.ts";
import { z } from "../../test.deps.ts";
import { CommandParams } from "../../../src/commands/CommandParams.ts";

const NoopArgsSchema = z.tuple([]);

const NoopFlagsSchema: z.ZodType<Record<PropertyKey, never>> = z.object({});

class NoopParams extends CommandParams<
  z.infer<typeof NoopArgsSchema>,
  z.infer<typeof NoopFlagsSchema>
> {}

const builder = new CommandModuleBuilder("noop", "Noop")
  .Args(NoopArgsSchema)
  .Flags(NoopFlagsSchema)
  .Params(NoopParams)
  .Run(() => {});

// Track calls across the test suite to verify BeforeAll executes
const executionOrder: string[] = [];

// This registers a test that will run and populate executionOrder
CommandIntents(
  "CommandIntents – BeforeAll execution verification",
  builder as any,
  "./test-cli/.cli.json",
)
  .BeforeAll(() => {
    executionOrder.push("beforeAll");
  })
  .WithInit((_ioc, _config) => {
    executionOrder.push("init");
  })
  .Intent("first intent", (b) => b.ExpectExit(0))
  .Intent("second intent", (b) => b.ExpectExit(0))
  .Run();

// This test runs after the above to verify execution order
Deno.test("CommandIntents – BeforeAll runs once before all intents", () => {
  // BeforeAll should have run once, Init should have run twice (once per intent)
  assertEquals(executionOrder[0], "beforeAll");
  assertEquals(executionOrder.filter((e) => e === "beforeAll").length, 1);
  assertEquals(executionOrder.filter((e) => e === "init").length, 2);
});

Deno.test("CommandIntents – BeforeAll accepts sync function", () => {
  let called = false;

  const intents = CommandIntents(
    "BeforeAll sync test",
    builder as any,
    "./test-cli/.cli.json",
  )
    .BeforeAll(() => {
      called = true;
    })
    .Intent("test", (b) => b.ExpectExit(0));

  // Verify the function is stored and returns this for chaining
  assertEquals(typeof (intents as any).beforeAllFn, "function");

  // Call the function directly to verify it works
  (intents as any).beforeAllFn();
  assertEquals(called, true);
});

Deno.test("CommandIntents – BeforeAll accepts async function", () => {
  const intents = CommandIntents(
    "BeforeAll async",
    builder as any,
    "./test-cli/.cli.json",
  )
    .BeforeAll(async () => {
      await Promise.resolve();
    })
    .Intent("test", (b) => b.ExpectExit(0));

  // Verify the function is stored
  assertEquals(typeof (intents as any).beforeAllFn, "function");
});

Deno.test("CommandIntents – BeforeAll is optional", () => {
  const intents = CommandIntents(
    "BeforeAll optional",
    builder as any,
    "./test-cli/.cli.json",
  ).Intent("test", (b) => b.ExpectExit(0));

  // Verify beforeAllFn is undefined when not set
  assertEquals((intents as any).beforeAllFn, undefined);
});

Deno.test("CommandIntents – BeforeAll returns this for chaining", () => {
  const intents = CommandIntents(
    "BeforeAll chaining",
    builder as any,
    "./test-cli/.cli.json",
  );

  const result = intents.BeforeAll(() => {});

  // Should return the same instance for method chaining
  assertEquals(result, intents);
});
