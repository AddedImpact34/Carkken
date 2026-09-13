const mode = process.argv[2];

if (mode === "mcp") {
  import("./mcp-server");
} else {
  import("./cli");
}
