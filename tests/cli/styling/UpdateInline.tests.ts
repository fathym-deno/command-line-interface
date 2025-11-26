// import { assert, assertEquals, delay } from "../../test.deps.ts";
// import { UpdateInline } from "../../../src/styling/UpdateInline.ts";
// import { showCursor } from "../../../src/utils/showCursor.ts";
// import { hideCursor } from "../../../src/utils/hideCursor.ts";

// Deno.test("Update Inline Tests", async (t) => {
//   await t.step("Quick Texts", async () => {
//     let message = "Loading...";

//     const spinner = new Spinner({ message, color: "yellow" });

//     spinner.start();

//     for (let i = 0; i < 100; i++) {
//       await delay(80);

//       spinner.message = message = message + ".";
//     }

//     await delay(3000);

//     spinner.stop();

//     console.log("Finished loading!");
//   });

//   await t.step("Quick Texts", async () => {
//     console.log("From another system.");

//     const inliner = new UpdateInline();

//     await delay(2000);

//     inliner.Configure("Whats up?");

//     await delay(2000);

//     inliner.Configure("Whats up hommie?");

//     await delay(2000);

//     inliner.Configure("Whats up my hommie?");

//     await delay(2000);

//     inliner.Configure("Whats up my super cool hommie?");
//   });

//   await t.step("Quick Texts - Long", async () => {
//     console.log("From another system.");

//     const inliner = new UpdateInline();

//     await delay(2000);

//     inliner.Configure(
//       "Whats up? Whats up? Whats up? Whats up? Whats up? Whats up? Whats up? Whats up? Whats up? Whats up? Whats up? Whats up? Whats up? Whats up? Whats up? Whats up? Whats up? Whats up? Whats up? Whats up? Whats up? Whats up? Whats up? Whats up? Whats up? ",
//     );

//     await delay(2000);

//     inliner.Configure(
//       "Whats up hommie? Whats up hommie? Whats up hommie? Whats up hommie? Whats up hommie? Whats up hommie? Whats up hommie? Whats up hommie? Whats up hommie? Whats up hommie? Whats up hommie? Whats up hommie? Whats up hommie? Whats up hommie? Whats up hommie?",
//     );

//     await delay(2000);

//     inliner.Configure(
//       "Whats up my hommie? Whats up my hommie? Whats up my hommie? Whats up my hommie? Whats up my hommie? Whats up my hommie? Whats up my hommie? Whats up my hommie? Whats up my hommie? Whats up my hommie? Whats up my hommie? Whats up my hommie? Whats up my hommie?",
//     );

//     await delay(2000);

//     inliner.Configure(
//       "Whats up my super cool hommie? Whats up my super cool hommie? Whats up my super cool hommie? Whats up my super cool hommie? Whats up my super cool hommie? Whats up my super cool hommie? Whats up my super cool hommie? Whats up my super cool hommie?",
//     );
//   });

//   await t.step("Only Text", async () => {
//     const inliner = new UpdateInline();

//     await delay(5000);

//     hideCursor(Deno.stdout, new TextEncoder());

//     await inliner.Configure("Hello");

//     assertEquals(inliner.LastInlined, "Hello");

//     await inliner.Configure("Hello2");

//     assertEquals(inliner.LastInlined, "Hello2");

//     await delay(5000);

//     showCursor(Deno.stdout, new TextEncoder());

//     await delay(5000);
//   });

//   await t.step("Blue background", async () => {
//     const inliner = new UpdateInline();

//     await inliner.Configure({
//       Styles: ["blue"],
//       Text: "Hello",
//     });

//     assert(inliner);
//     assertEquals(inliner.LastInlined, "\x1b[34mHello\x1b[39m");
//   });

//   await t.step("MixedStyles", async () => {
//     const inliner = new UpdateInline();

//     await inliner.Configure({
//       Styles: ["bgBrightBlue"],
//       Text: {
//         Text: "Hello",
//         Styles: ["italic"],
//       },
//       PrefixText: {
//         Text: "DEBUG",
//         Styles: ["bgBlue"],
//       },
//     });

//     assert(inliner);
//     assertEquals(
//       inliner.LastInlined,
//       "\x1b[104m\x1b[44mDEBUG\x1b[104m \x1b[3mHello\x1b[23m\x1b[49m",
//     );
//   });

//   await t.step("MixedStyles with Suffix", async () => {
//     const inliner = new UpdateInline();

//     await inliner.Configure({
//       Styles: ["bgBrightBlue"],
//       Text: {
//         Text: "Hello",
//         Styles: ["italic"],
//       },
//       PrefixText: {
//         Text: "DEBUG",
//         Styles: ["bgBlue"],
//       },
//       SuffixText: ".......",
//     });

//     assert(inliner);
//     assertEquals(
//       inliner.LastInlined,
//       "\x1b[104m\x1b[44mDEBUG\x1b[104m \x1b[3mHello\x1b[23m\x1b[49m\n.......",
//     );
//   });
// });
