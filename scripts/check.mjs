import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
const root=process.cwd();
function walk(dir){return fs.readdirSync(dir,{withFileTypes:true}).flatMap(x=>x.isDirectory()?walk(path.join(dir,x.name)):[path.join(dir,x.name)]);}
const files=walk(root).filter(f=>/\.(js|mjs)$/.test(f)&&!f.includes('node_modules'));
let bad=0;
for(const f of files){const r=spawnSync(process.execPath,['--check',f],{encoding:'utf8'});if(r.status!==0){console.error('Syntax error:',path.relative(root,f),r.stderr||r.stdout);bad++;}}
if(bad){process.exitCode=1;console.error(`${bad} JavaScript file(s) failed.`);}else console.log(`Syntax OK: ${files.length} JavaScript files checked.`);
