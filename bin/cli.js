#!/usr/bin/env node
import { run } from '../dist/index.js';

run(process.argv).catch(error => {
  // run() already reports known errors; this is the last-resort guard.
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
