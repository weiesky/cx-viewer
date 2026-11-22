// Fixed upstream model preset catalogue. Listing is file reads/string operations;
// it never launches Git, creates memory directories, or changes prompt selection.
import {readFileSync} from 'node:fs';
import {expandModelIdVariants} from './model-id-variants.js';

const ROOT=new URL('../system-prompt-templates/presets/',import.meta.url);
const NAME=/^[A-Za-z0-9][A-Za-z0-9._-]{0,63}$/;

export function listSystemPromptPresets(){
  let manifest;
  try {manifest=JSON.parse(readFileSync(new URL('index.json',ROOT),'utf8'));}
  catch {console.warn('[CX Viewer] Built-in prompt manifest is unavailable');return [];}
  const out=[];
  for(const[category,entries]of Object.entries(manifest.categories||{})){
    if(!Array.isArray(entries))continue;
    for(const entry of entries){
      if(!NAME.test(entry?.id||'')||!NAME.test(entry?.match||'')||entry.file!==`${entry.id}.md`)continue;
      try{
        const text=readFileSync(new URL(entry.file,ROOT),'utf8').replace(/<!--[\s\S]*?-->/g,'')
          .split('__SYSTEM_PROMPT_DYNAMIC_BOUNDARY__').map(part=>part.trim()).filter(Boolean).join('\n\n');
        if(!text||Buffer.byteLength(text)>128*1024)throw new Error('Invalid preset size');
        out.push({id:entry.id,title:entry.title||entry.id,description:entry.description||'',match:entry.match,
          category,defaultMode:entry.defaultMode==='override'?'override':'append',text});
      }catch{console.warn(`[CX Viewer] Built-in prompt ${entry.id} is unavailable`);}
    }
  }
  return out;
}

export function listBuiltinModelPrompts(){
  return listSystemPromptPresets().map(p=>({...p,name:p.match.toUpperCase(),scope:'builtin',mode:p.defaultMode}));
}

export function matchBuiltinModelPrompt(model){
  const variants=expandModelIdVariants(model);
  if(!variants.length)return null;
  return listBuiltinModelPrompts().filter(p=>variants.some(value=>value.includes(p.match.toLowerCase())))
    .sort((a,b)=>b.match.length-a.match.length||a.name.localeCompare(b.name))[0]||null;
}
