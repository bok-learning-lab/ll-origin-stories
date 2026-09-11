#!/usr/bin/env node
import {run} from './lib/cli.mjs';
run('image').catch(error => { console.error(error.message); process.exitCode = 1; });
