import fs from 'node:fs/promises';
import validator from 'gltf-validator';
const file=process.argv[2]??'public/models/treehouse-final.glb';
const bytes=new Uint8Array(await fs.readFile(file));
const result=await validator.validateBytes(bytes,{uri:file,maxIssues:100});
await fs.mkdir('renders',{recursive:true});
await fs.writeFile('renders/web-glb-validation.json',JSON.stringify(result,null,2));
console.log(JSON.stringify({file,bytes:bytes.byteLength,errors:result.issues.numErrors,warnings:result.issues.numWarnings,details:result.issues.messages.filter(m=>m.severity<2)},null,2));
process.exitCode=result.issues.numErrors?1:0;

