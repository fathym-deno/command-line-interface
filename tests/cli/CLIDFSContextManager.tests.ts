import { assertEquals, assertThrows } from "../test.deps.ts";
import { CLIDFSContextManager } from "../../src/CLIDFSContextManager.ts";
import { IoCContainer, join } from "../../src/.deps.ts";

Deno.test("CLIDFSContextManager – discovers project root via .cli.json", async () => {
  const ioc = new IoCContainer();
  const dfs = new CLIDFSContextManager(ioc);

  const tmp = await Deno.makeTempDir();
  const projectRoot = join(tmp, "proj");
  const nestedDir = join(projectRoot, "commands");
  await Deno.mkdir(nestedDir, { recursive: true });

  await Deno.writeTextFile(join(projectRoot, ".cli.json"), "{}");
  const nestedFile = join(nestedDir, "hello.ts");
  await Deno.writeTextFile(nestedFile, "// test");

  const registeredRoot = dfs.RegisterProjectDFS(nestedFile);
  assertEquals(registeredRoot, projectRoot);

  const projectDFS = await dfs.GetProjectDFS();
  const resolved = await projectDFS.ResolvePath("commands", "hello.ts");
  assertEquals(resolved, join(projectRoot, "commands", "hello.ts"));
});

Deno.test("CLIDFSContextManager – RegisterExecutionDFS uses provided cwd", async () => {
  const ioc = new IoCContainer();
  const dfs = new CLIDFSContextManager(ioc);

  const cwd = await Deno.makeTempDir();
  const root = dfs.RegisterExecutionDFS(cwd);
  const execDFS = await dfs.GetExecutionDFS();

  assertEquals(root, cwd);
  const resolved = await execDFS.ResolvePath("a", "b.txt");
  assertEquals(resolved, join(cwd, "a", "b.txt"));
});

Deno.test("CLIDFSContextManager – throws when root marker is missing", () => {
  const ioc = new IoCContainer();
  const dfs = new CLIDFSContextManager(ioc);

  const path = join(Deno.cwd(), "nonexistent", "file.ts");
  assertThrows(() => dfs.RegisterProjectDFS(path));
});

Deno.test("CLIDFSContextManager – RegisterConfigDFS creates directory and registers DFS", async () => {
  const ioc = new IoCContainer();
  const dfsCtx = new CLIDFSContextManager(ioc);

  // Create a temp directory to act as "home" and override environment
  const tempHome = await Deno.makeTempDir();
  const originalEnv = Deno.build.os === "windows"
    ? Deno.env.get("USERPROFILE")
    : Deno.env.get("HOME");

  try {
    // Override home directory for test
    if (Deno.build.os === "windows") {
      Deno.env.set("USERPROFILE", tempHome);
    } else {
      Deno.env.set("HOME", tempHome);
    }

    // Disable env var checking to ensure we use user home
    const configPath = await dfsCtx.RegisterConfigDFS({
      name: ".test-cli",
      token: "test",
      rootEnvVar: "", // Disable env var checking
    });

    // Verify directory was created
    const stat = await Deno.stat(configPath);
    assertEquals(stat.isDirectory, true);

    // Verify path is correct
    assertEquals(configPath, join(tempHome, ".test-cli"));

    // Verify DFS is accessible
    const configDfs = await dfsCtx.GetConfigDFS();
    const resolved = await configDfs.ResolvePath("config.json");
    assertEquals(resolved, join(tempHome, ".test-cli", "config.json"));
  } finally {
    // Restore environment
    if (Deno.build.os === "windows") {
      if (originalEnv) Deno.env.set("USERPROFILE", originalEnv);
    } else {
      if (originalEnv) Deno.env.set("HOME", originalEnv);
    }
    await Deno.remove(tempHome, { recursive: true });
  }
});

Deno.test("CLIDFSContextManager – GetConfigDFS throws when not registered", async () => {
  const ioc = new IoCContainer();
  const dfsCtx = new CLIDFSContextManager(ioc);

  // GetConfigDFS should throw when config DFS has not been registered
  let threw = false;
  try {
    await dfsCtx.GetConfigDFS();
  } catch {
    threw = true;
  }
  assertEquals(threw, true);
});

// ─── ConfigDFS Root Resolution Precedence Tests ─────────────────────────────

Deno.test("CLIDFSContextManager – ConfigDFS uses custom env var when set", async () => {
  const ioc = new IoCContainer();
  const dfsCtx = new CLIDFSContextManager(ioc);

  const tempRoot = await Deno.makeTempDir();
  const customEnvVar = "TEST_CUSTOM_CONFIG_ROOT";

  try {
    // Set custom env var
    Deno.env.set(customEnvVar, tempRoot);

    const configPath = await dfsCtx.RegisterConfigDFS({
      name: ".test-cli",
      token: "test",
      rootEnvVar: customEnvVar,
    });

    // Should use the custom env var value as root
    assertEquals(configPath, join(tempRoot, ".test-cli"));
  } finally {
    Deno.env.delete(customEnvVar);
    await Deno.remove(tempRoot, { recursive: true });
  }
});

Deno.test("CLIDFSContextManager – ConfigDFS uses explicit root when custom env var is empty", async () => {
  const ioc = new IoCContainer();
  const dfsCtx = new CLIDFSContextManager(ioc);

  const tempRoot = await Deno.makeTempDir();
  const customEnvVar = "TEST_EMPTY_ENV_VAR";

  try {
    // Set custom env var to empty (simulating unset)
    Deno.env.delete(customEnvVar);

    const configPath = await dfsCtx.RegisterConfigDFS({
      name: ".test-cli",
      token: "test",
      rootEnvVar: customEnvVar, // Custom env var that doesn't exist
      root: tempRoot, // Explicit root should be used
    });

    // Should fall back to explicit root since custom env var is empty
    assertEquals(configPath, join(tempRoot, ".test-cli"));
  } finally {
    await Deno.remove(tempRoot, { recursive: true });
  }
});

Deno.test("CLIDFSContextManager – ConfigDFS uses default env var when rootEnvVar is undefined", async () => {
  const ioc = new IoCContainer();
  const dfsCtx = new CLIDFSContextManager(ioc);

  const tempRoot = await Deno.makeTempDir();
  const defaultEnvVar = "MYCLI_CONFIG_ROOT"; // Derived from token "mycli"

  try {
    // Set default env var (TOKEN_CONFIG_ROOT)
    Deno.env.set(defaultEnvVar, tempRoot);

    const configPath = await dfsCtx.RegisterConfigDFS({
      name: ".mycli",
      token: "mycli",
      // rootEnvVar is undefined, so default env var should be checked
    });

    // Should use the default env var value as root
    assertEquals(configPath, join(tempRoot, ".mycli"));
  } finally {
    Deno.env.delete(defaultEnvVar);
    await Deno.remove(tempRoot, { recursive: true });
  }
});

Deno.test("CLIDFSContextManager – ConfigDFS skips default env var when rootEnvVar is empty string", async () => {
  const ioc = new IoCContainer();
  const dfsCtx = new CLIDFSContextManager(ioc);

  const tempHome = await Deno.makeTempDir();
  const tempEnvRoot = await Deno.makeTempDir();
  const defaultEnvVar = "SKIPCLI_CONFIG_ROOT";
  const originalEnv = Deno.build.os === "windows"
    ? Deno.env.get("USERPROFILE")
    : Deno.env.get("HOME");

  try {
    // Set default env var - this should be IGNORED
    Deno.env.set(defaultEnvVar, tempEnvRoot);

    // Override home directory
    if (Deno.build.os === "windows") {
      Deno.env.set("USERPROFILE", tempHome);
    } else {
      Deno.env.set("HOME", tempHome);
    }

    const configPath = await dfsCtx.RegisterConfigDFS({
      name: ".skipcli",
      token: "skipcli",
      rootEnvVar: "", // Empty string disables ALL env var checking
    });

    // Should use user home, NOT the default env var
    assertEquals(configPath, join(tempHome, ".skipcli"));
  } finally {
    Deno.env.delete(defaultEnvVar);
    if (Deno.build.os === "windows") {
      if (originalEnv) Deno.env.set("USERPROFILE", originalEnv);
    } else {
      if (originalEnv) Deno.env.set("HOME", originalEnv);
    }
    await Deno.remove(tempHome, { recursive: true });
    await Deno.remove(tempEnvRoot, { recursive: true });
  }
});

Deno.test("CLIDFSContextManager – ConfigDFS precedence: custom env > explicit root", async () => {
  const ioc = new IoCContainer();
  const dfsCtx = new CLIDFSContextManager(ioc);

  const envRoot = await Deno.makeTempDir();
  const explicitRoot = await Deno.makeTempDir();
  const customEnvVar = "TEST_PRECEDENCE_ENV";

  try {
    // Set custom env var
    Deno.env.set(customEnvVar, envRoot);

    const configPath = await dfsCtx.RegisterConfigDFS({
      name: ".test",
      token: "test",
      rootEnvVar: customEnvVar,
      root: explicitRoot, // This should be ignored since custom env var has value
    });

    // Custom env var takes precedence over explicit root
    assertEquals(configPath, join(envRoot, ".test"));
  } finally {
    Deno.env.delete(customEnvVar);
    await Deno.remove(envRoot, { recursive: true });
    await Deno.remove(explicitRoot, { recursive: true });
  }
});

Deno.test("CLIDFSContextManager – ConfigDFS precedence: explicit root > default env var", async () => {
  const ioc = new IoCContainer();
  const dfsCtx = new CLIDFSContextManager(ioc);

  const explicitRoot = await Deno.makeTempDir();
  const envRoot = await Deno.makeTempDir();
  const defaultEnvVar = "PRECCLI_CONFIG_ROOT"; // Derived from token "preccli"

  try {
    // Set default env var - this should be IGNORED because explicit root is set
    Deno.env.set(defaultEnvVar, envRoot);

    const configPath = await dfsCtx.RegisterConfigDFS({
      name: ".preccli",
      token: "preccli",
      root: explicitRoot, // Explicit root takes precedence over default env var
      // rootEnvVar is undefined, so default would normally be checked
    });

    // Explicit root takes precedence over default env var
    assertEquals(configPath, join(explicitRoot, ".preccli"));
  } finally {
    Deno.env.delete(defaultEnvVar);
    await Deno.remove(explicitRoot, { recursive: true });
    await Deno.remove(envRoot, { recursive: true });
  }
});

Deno.test("CLIDFSContextManager – ConfigDFS precedence: default env var > user home", async () => {
  const ioc = new IoCContainer();
  const dfsCtx = new CLIDFSContextManager(ioc);

  const envRoot = await Deno.makeTempDir();
  const tempHome = await Deno.makeTempDir();
  const defaultEnvVar = "HOMECLI_CONFIG_ROOT";
  const originalEnv = Deno.build.os === "windows"
    ? Deno.env.get("USERPROFILE")
    : Deno.env.get("HOME");

  try {
    // Set default env var
    Deno.env.set(defaultEnvVar, envRoot);

    // Override home directory - this should be IGNORED
    if (Deno.build.os === "windows") {
      Deno.env.set("USERPROFILE", tempHome);
    } else {
      Deno.env.set("HOME", tempHome);
    }

    const configPath = await dfsCtx.RegisterConfigDFS({
      name: ".homecli",
      token: "homecli",
      // No explicit root, no custom rootEnvVar
    });

    // Default env var takes precedence over user home
    assertEquals(configPath, join(envRoot, ".homecli"));
  } finally {
    Deno.env.delete(defaultEnvVar);
    if (Deno.build.os === "windows") {
      if (originalEnv) Deno.env.set("USERPROFILE", originalEnv);
    } else {
      if (originalEnv) Deno.env.set("HOME", originalEnv);
    }
    await Deno.remove(envRoot, { recursive: true });
    await Deno.remove(tempHome, { recursive: true });
  }
});

Deno.test("CLIDFSContextManager – ConfigDFS converts token to uppercase for default env var", async () => {
  const ioc = new IoCContainer();
  const dfsCtx = new CLIDFSContextManager(ioc);

  const tempRoot = await Deno.makeTempDir();
  // Token is lowercase "myapp", env var should be "MYAPP_CONFIG_ROOT"
  const expectedEnvVar = "MYAPP_CONFIG_ROOT";

  try {
    Deno.env.set(expectedEnvVar, tempRoot);

    const configPath = await dfsCtx.RegisterConfigDFS({
      name: ".myapp",
      token: "myapp", // lowercase token
    });

    // Should find MYAPP_CONFIG_ROOT (uppercase)
    assertEquals(configPath, join(tempRoot, ".myapp"));
  } finally {
    Deno.env.delete(expectedEnvVar);
    await Deno.remove(tempRoot, { recursive: true });
  }
});

Deno.test("CLIDFSContextManager – ConfigDFS falls back to user home when no env vars or root set", async () => {
  const ioc = new IoCContainer();
  const dfsCtx = new CLIDFSContextManager(ioc);

  const tempHome = await Deno.makeTempDir();
  const originalEnv = Deno.build.os === "windows"
    ? Deno.env.get("USERPROFILE")
    : Deno.env.get("HOME");

  // Ensure the default env var is NOT set
  const defaultEnvVar = "FALLBACK_CONFIG_ROOT";

  try {
    Deno.env.delete(defaultEnvVar);

    if (Deno.build.os === "windows") {
      Deno.env.set("USERPROFILE", tempHome);
    } else {
      Deno.env.set("HOME", tempHome);
    }

    const configPath = await dfsCtx.RegisterConfigDFS({
      name: ".fallback",
      token: "fallback",
      // No root, no rootEnvVar, default env var not set
    });

    // Should fall back to user home
    assertEquals(configPath, join(tempHome, ".fallback"));
  } finally {
    if (Deno.build.os === "windows") {
      if (originalEnv) Deno.env.set("USERPROFILE", originalEnv);
    } else {
      if (originalEnv) Deno.env.set("HOME", originalEnv);
    }
    await Deno.remove(tempHome, { recursive: true });
  }
});

Deno.test("CLIDFSContextManager – ConfigDFS creates directory when using env var root", async () => {
  const ioc = new IoCContainer();
  const dfsCtx = new CLIDFSContextManager(ioc);

  const tempRoot = await Deno.makeTempDir();
  const customEnvVar = "TEST_DIR_CREATE_ENV";

  try {
    Deno.env.set(customEnvVar, tempRoot);

    const configPath = await dfsCtx.RegisterConfigDFS({
      name: ".newdir",
      token: "test",
      rootEnvVar: customEnvVar,
    });

    // Verify the directory was created
    const stat = await Deno.stat(configPath);
    assertEquals(stat.isDirectory, true);
    assertEquals(configPath, join(tempRoot, ".newdir"));
  } finally {
    Deno.env.delete(customEnvVar);
    await Deno.remove(tempRoot, { recursive: true });
  }
});

Deno.test("CLIDFSContextManager – ConfigDFS creates directory when using explicit root", async () => {
  const ioc = new IoCContainer();
  const dfsCtx = new CLIDFSContextManager(ioc);

  const explicitRoot = await Deno.makeTempDir();

  try {
    const configPath = await dfsCtx.RegisterConfigDFS({
      name: ".explicitdir",
      token: "test",
      root: explicitRoot,
      rootEnvVar: "", // Disable env var checking
    });

    // Verify the directory was created
    const stat = await Deno.stat(configPath);
    assertEquals(stat.isDirectory, true);
    assertEquals(configPath, join(explicitRoot, ".explicitdir"));
  } finally {
    await Deno.remove(explicitRoot, { recursive: true });
  }
});
