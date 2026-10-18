import {cp,mkdir,rm,writeFile} from 'node:fs/promises';
import {resolve} from 'node:path';
const root=resolve(import.meta.dirname,'..'),dist=resolve(root,'dist');
await rm(dist,{recursive:true,force:true});await mkdir(dist,{recursive:true});
for(const file of ['index.html','styles.css','js'])await cp(resolve(root,file),resolve(dist,file),{recursive:true});
await mkdir(resolve(dist,'assets'),{recursive:true});
await cp(resolve(root,'assets/favicon.svg'),resolve(dist,'assets/favicon.svg'));
// Include only images actively referenced by the catalog; unverified art is not shipped.
const {CARS,SHIPS}=await import('../js/vehicles.js');
for(const v of [...CARS,...SHIPS])if(v.image){const target=resolve(dist,v.image);if(!target.startsWith(dist+'/'))throw Error('Invalid asset path');await mkdir(resolve(target,'..'),{recursive:true});await cp(resolve(root,v.image),target);}
await writeFile(resolve(dist,'.nojekyll'),'');
console.log(`Built ${dist} (static HTML5, no runtime package dependencies)`);
