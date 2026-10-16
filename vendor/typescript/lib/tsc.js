try {
  const { enableCompileCache } = require("node:module");
  if (enableCompileCache) enableCompileCache();
} catch {}
module.exports = require("./_tsc.js");
