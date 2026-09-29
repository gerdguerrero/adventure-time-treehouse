import * as THREE from 'three';

/** A restrained painted surface sheen; no second scene render or refraction pass. */
export function addPondSheen(material:THREE.MeshStandardMaterial,time:{value:number}){
 const prior=material.onBeforeCompile.bind(material);
 material.onBeforeCompile=(shader,renderer)=>{
  prior(shader,renderer);shader.uniforms.pondTime=time;
  shader.vertexShader='varying vec3 pondWorld;\n'+shader.vertexShader;
  shader.vertexShader=shader.vertexShader.replace('#include <begin_vertex>','#include <begin_vertex>\npondWorld=(modelMatrix*vec4(position,1.)).xyz;');
  shader.fragmentShader='varying vec3 pondWorld;\nuniform float pondTime;\n'+shader.fragmentShader;
  shader.fragmentShader=shader.fragmentShader.replace('#include <emissivemap_fragment>',`#include <emissivemap_fragment>
   float wave=sin(pondWorld.x*3.8+pondWorld.z*7.2+pondTime*.34)+sin(pondWorld.z*9.7-pondTime*.23)*.28;
   float sheen=smoothstep(.88,1.17,wave)*.045;
   totalEmissiveRadiance+=vec3(.48,.69,.68)*sheen;`);
 };
 material.customProgramCacheKey=()=> 'miniature-pond-sheen-v1';
}
