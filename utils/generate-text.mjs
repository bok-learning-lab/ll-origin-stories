#!/usr/bin/env node
import {run} from './lib/cli.mjs';
run('text').catch(error => { console.error(error.message); process.exitCode = 1; });
