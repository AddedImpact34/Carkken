const mode = process.argv[2];

if (mode === "mcp") {
  process.argv.splice(2, 1);
  import("./mcp-server");
} else if (mode === "cli") {
  process.argv.splice(2, 1);
  import("./cli");
} else {
  import("./cli");
}
