// Compatibility entry point. Raw inputs must be backed up outside this repository.
import {spawnSync} from 'node:child_process';
import {resolve} from 'node:path';
const result=spawnSync(process.execPath,[resolve(import.meta.dirname,'optimize-images.mjs'),...process.argv.slice(2)],{stdio:'inherit'});
if(result.error)throw result.error;
process.exit(result.status??1);
