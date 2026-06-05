/**
 * GENERATED — do not edit. Run `yarn bundle:daisy-processor`.
 * Classic AudioWorklet bundle (Emscripten glue + DaisyProcessor).
 */

var ZssDaisy = (() => {
  var _scriptName = "";
  
  return (
function(moduleArg = {}) {
  var moduleRtn;

var Module=moduleArg;var readyPromiseResolve,readyPromiseReject;var readyPromise=new Promise((resolve,reject)=>{readyPromiseResolve=resolve;readyPromiseReject=reject});var ENVIRONMENT_IS_WEB=typeof window=="object";var ENVIRONMENT_IS_WORKER=typeof importScripts=="function";var ENVIRONMENT_IS_NODE=typeof process=="object"&&typeof process.versions=="object"&&typeof process.versions.node=="string";var moduleOverrides=Object.assign({},Module);var arguments_=[];var thisProgram="./this.program";var quit_=(status,toThrow)=>{throw toThrow};var scriptDirectory="";function locateFile(path){if(Module["locateFile"]){return Module["locateFile"](path,scriptDirectory)}return scriptDirectory+path}var readAsync,readBinary;if(ENVIRONMENT_IS_WEB||ENVIRONMENT_IS_WORKER){if(ENVIRONMENT_IS_WORKER){scriptDirectory=self.location.href}else if(typeof document!="undefined"&&document.currentScript){scriptDirectory=document.currentScript.src}if(_scriptName){scriptDirectory=_scriptName}if(scriptDirectory.startsWith("blob:")){scriptDirectory=""}else{scriptDirectory=scriptDirectory.substr(0,scriptDirectory.replace(/[?#].*/,"").lastIndexOf("/")+1)}{if(ENVIRONMENT_IS_WORKER){readBinary=url=>{var xhr=new XMLHttpRequest;xhr.open("GET",url,false);xhr.responseType="arraybuffer";xhr.send(null);return new Uint8Array(xhr.response)}}readAsync=url=>fetch(url,{credentials:"same-origin"}).then(response=>{if(response.ok){return response.arrayBuffer()}return Promise.reject(new Error(response.status+" : "+response.url))})}}else{}var out=Module["print"]||console.log.bind(console);var err=Module["printErr"]||console.error.bind(console);Object.assign(Module,moduleOverrides);moduleOverrides=null;if(Module["arguments"])arguments_=Module["arguments"];if(Module["thisProgram"])thisProgram=Module["thisProgram"];if(Module["quit"])quit_=Module["quit"];var wasmBinary;if(Module["wasmBinary"])wasmBinary=Module["wasmBinary"];var wasmMemory;var ABORT=false;var EXITSTATUS;var HEAP8,HEAPU8,HEAP16,HEAPU16,HEAP32,HEAPU32,HEAPF32,HEAPF64;function updateMemoryViews(){var b=wasmMemory.buffer;Module["HEAP8"]=HEAP8=new Int8Array(b);Module["HEAP16"]=HEAP16=new Int16Array(b);Module["HEAPU8"]=HEAPU8=new Uint8Array(b);Module["HEAPU16"]=HEAPU16=new Uint16Array(b);Module["HEAP32"]=HEAP32=new Int32Array(b);Module["HEAPU32"]=HEAPU32=new Uint32Array(b);Module["HEAPF32"]=HEAPF32=new Float32Array(b);Module["HEAPF64"]=HEAPF64=new Float64Array(b)}var __ATPRERUN__=[];var __ATINIT__=[];var __ATPOSTRUN__=[];var runtimeInitialized=false;function preRun(){if(Module["preRun"]){if(typeof Module["preRun"]=="function")Module["preRun"]=[Module["preRun"]];while(Module["preRun"].length){addOnPreRun(Module["preRun"].shift())}}callRuntimeCallbacks(__ATPRERUN__)}function initRuntime(){runtimeInitialized=true;callRuntimeCallbacks(__ATINIT__)}function postRun(){if(Module["postRun"]){if(typeof Module["postRun"]=="function")Module["postRun"]=[Module["postRun"]];while(Module["postRun"].length){addOnPostRun(Module["postRun"].shift())}}callRuntimeCallbacks(__ATPOSTRUN__)}function addOnPreRun(cb){__ATPRERUN__.unshift(cb)}function addOnInit(cb){__ATINIT__.unshift(cb)}function addOnPostRun(cb){__ATPOSTRUN__.unshift(cb)}var runDependencies=0;var runDependencyWatcher=null;var dependenciesFulfilled=null;function addRunDependency(id){runDependencies++;Module["monitorRunDependencies"]?.(runDependencies)}function removeRunDependency(id){runDependencies--;Module["monitorRunDependencies"]?.(runDependencies);if(runDependencies==0){if(runDependencyWatcher!==null){clearInterval(runDependencyWatcher);runDependencyWatcher=null}if(dependenciesFulfilled){var callback=dependenciesFulfilled;dependenciesFulfilled=null;callback()}}}function abort(what){Module["onAbort"]?.(what);what="Aborted("+what+")";err(what);ABORT=true;EXITSTATUS=1;what+=". Build with -sASSERTIONS for more info.";var e=new WebAssembly.RuntimeError(what);readyPromiseReject(e);throw e}var dataURIPrefix="data:application/octet-stream;base64,";var isDataURI=filename=>filename.startsWith(dataURIPrefix);function findWasmBinary(){if(Module["locateFile"]){var f="zss_daisy.wasm";if(!isDataURI(f)){return locateFile(f)}return f}throw new Error("wasmBinary required in worklet")}var wasmBinaryFile;function getBinarySync(file){if(file==wasmBinaryFile&&wasmBinary){return new Uint8Array(wasmBinary)}if(readBinary){return readBinary(file)}throw"both async and sync fetching of the wasm failed"}function getBinaryPromise(binaryFile){if(!wasmBinary){return readAsync(binaryFile).then(response=>new Uint8Array(response),()=>getBinarySync(binaryFile))}return Promise.resolve().then(()=>getBinarySync(binaryFile))}function instantiateArrayBuffer(binaryFile,imports,receiver){return getBinaryPromise(binaryFile).then(binary=>WebAssembly.instantiate(binary,imports)).then(receiver,reason=>{err(`failed to asynchronously prepare wasm: ${reason}`);abort(reason)})}function instantiateAsync(binary,binaryFile,imports,callback){if(!binary&&typeof WebAssembly.instantiateStreaming=="function"&&!isDataURI(binaryFile)&&typeof fetch=="function"){return fetch(binaryFile,{credentials:"same-origin"}).then(response=>{var result=WebAssembly.instantiateStreaming(response,imports);return result.then(callback,function(reason){err(`wasm streaming compile failed: ${reason}`);err("falling back to ArrayBuffer instantiation");return instantiateArrayBuffer(binaryFile,imports,callback)})})}return instantiateArrayBuffer(binaryFile,imports,callback)}function getWasmImports(){return{a:wasmImports}}function createWasm(){var info=getWasmImports();function receiveInstance(instance,module){wasmExports=instance.exports;wasmMemory=wasmExports["b"];updateMemoryViews();addOnInit(wasmExports["c"]);removeRunDependency("wasm-instantiate");return wasmExports}addRunDependency("wasm-instantiate");function receiveInstantiationResult(result){receiveInstance(result["instance"])}if(Module["instantiateWasm"]){try{return Module["instantiateWasm"](info,receiveInstance)}catch(e){err(`Module.instantiateWasm callback failed with error: ${e}`);readyPromiseReject(e)}}if(!wasmBinaryFile)wasmBinaryFile=findWasmBinary();instantiateAsync(wasmBinary,wasmBinaryFile,info,receiveInstantiationResult).catch(readyPromiseReject);return{}}var callRuntimeCallbacks=callbacks=>{while(callbacks.length>0){callbacks.shift()(Module)}};function getValue(ptr,type="i8"){if(type.endsWith("*"))type="*";switch(type){case"i1":return HEAP8[ptr];case"i8":return HEAP8[ptr];case"i16":return HEAP16[ptr>>1];case"i32":return HEAP32[ptr>>2];case"i64":abort("to do getValue(i64) use WASM_BIGINT");case"float":return HEAPF32[ptr>>2];case"double":return HEAPF64[ptr>>3];case"*":return HEAPU32[ptr>>2];default:abort(`invalid type for getValue: ${type}`)}}var noExitRuntime=Module["noExitRuntime"]||true;function setValue(ptr,value,type="i8"){if(type.endsWith("*"))type="*";switch(type){case"i1":HEAP8[ptr]=value;break;case"i8":HEAP8[ptr]=value;break;case"i16":HEAP16[ptr>>1]=value;break;case"i32":HEAP32[ptr>>2]=value;break;case"i64":abort("to do setValue(i64) use WASM_BIGINT");case"float":HEAPF32[ptr>>2]=value;break;case"double":HEAPF64[ptr>>3]=value;break;case"*":HEAPU32[ptr>>2]=value;break;default:abort(`invalid type for setValue: ${type}`)}}var stackRestore=val=>__emscripten_stack_restore(val);var stackSave=()=>_emscripten_stack_get_current();var abortOnCannotGrowMemory=requestedSize=>{abort("OOM")};var _emscripten_resize_heap=requestedSize=>{var oldSize=HEAPU8.length;requestedSize>>>=0;abortOnCannotGrowMemory(requestedSize)};var getCFunc=ident=>{var func=Module["_"+ident];return func};var writeArrayToMemory=(array,buffer)=>{HEAP8.set(array,buffer)};var lengthBytesUTF8=str=>{var len=0;for(var i=0;i<str.length;++i){var c=str.charCodeAt(i);if(c<=127){len++}else if(c<=2047){len+=2}else if(c>=55296&&c<=57343){len+=4;++i}else{len+=3}}return len};var stringToUTF8Array=(str,heap,outIdx,maxBytesToWrite)=>{if(!(maxBytesToWrite>0))return 0;var startIdx=outIdx;var endIdx=outIdx+maxBytesToWrite-1;for(var i=0;i<str.length;++i){var u=str.charCodeAt(i);if(u>=55296&&u<=57343){var u1=str.charCodeAt(++i);u=65536+((u&1023)<<10)|u1&1023}if(u<=127){if(outIdx>=endIdx)break;heap[outIdx++]=u}else if(u<=2047){if(outIdx+1>=endIdx)break;heap[outIdx++]=192|u>>6;heap[outIdx++]=128|u&63}else if(u<=65535){if(outIdx+2>=endIdx)break;heap[outIdx++]=224|u>>12;heap[outIdx++]=128|u>>6&63;heap[outIdx++]=128|u&63}else{if(outIdx+3>=endIdx)break;heap[outIdx++]=240|u>>18;heap[outIdx++]=128|u>>12&63;heap[outIdx++]=128|u>>6&63;heap[outIdx++]=128|u&63}}heap[outIdx]=0;return outIdx-startIdx};var stringToUTF8=(str,outPtr,maxBytesToWrite)=>stringToUTF8Array(str,HEAPU8,outPtr,maxBytesToWrite);var stackAlloc=sz=>__emscripten_stack_alloc(sz);var stringToUTF8OnStack=str=>{var size=lengthBytesUTF8(str)+1;var ret=stackAlloc(size);stringToUTF8(str,ret,size);return ret};var UTF8Decoder=typeof TextDecoder!="undefined"?new TextDecoder:undefined;var UTF8ArrayToString=(heapOrArray,idx,maxBytesToRead)=>{var endIdx=idx+maxBytesToRead;var endPtr=idx;while(heapOrArray[endPtr]&&!(endPtr>=endIdx))++endPtr;if(endPtr-idx>16&&heapOrArray.buffer&&UTF8Decoder){return UTF8Decoder.decode(heapOrArray.subarray(idx,endPtr))}var str="";while(idx<endPtr){var u0=heapOrArray[idx++];if(!(u0&128)){str+=String.fromCharCode(u0);continue}var u1=heapOrArray[idx++]&63;if((u0&224)==192){str+=String.fromCharCode((u0&31)<<6|u1);continue}var u2=heapOrArray[idx++]&63;if((u0&240)==224){u0=(u0&15)<<12|u1<<6|u2}else{u0=(u0&7)<<18|u1<<12|u2<<6|heapOrArray[idx++]&63}if(u0<65536){str+=String.fromCharCode(u0)}else{var ch=u0-65536;str+=String.fromCharCode(55296|ch>>10,56320|ch&1023)}}return str};var UTF8ToString=(ptr,maxBytesToRead)=>ptr?UTF8ArrayToString(HEAPU8,ptr,maxBytesToRead):"";var ccall=(ident,returnType,argTypes,args,opts)=>{var toC={string:str=>{var ret=0;if(str!==null&&str!==undefined&&str!==0){ret=stringToUTF8OnStack(str)}return ret},array:arr=>{var ret=stackAlloc(arr.length);writeArrayToMemory(arr,ret);return ret}};function convertReturnValue(ret){if(returnType==="string"){return UTF8ToString(ret)}if(returnType==="boolean")return Boolean(ret);return ret}var func=getCFunc(ident);var cArgs=[];var stack=0;if(args){for(var i=0;i<args.length;i++){var converter=toC[argTypes[i]];if(converter){if(stack===0)stack=stackSave();cArgs[i]=converter(args[i])}else{cArgs[i]=args[i]}}}var ret=func(...cArgs);function onDone(ret){if(stack!==0)stackRestore(stack);return convertReturnValue(ret)}ret=onDone(ret);return ret};var cwrap=(ident,returnType,argTypes,opts)=>{var numericArgs=!argTypes||argTypes.every(type=>type==="number"||type==="boolean");var numericRet=returnType!=="string";if(numericRet&&numericArgs&&!opts){return getCFunc(ident)}return(...args)=>ccall(ident,returnType,argTypes,args,opts)};var wasmImports={a:_emscripten_resize_heap};var wasmExports;createWasm();var ___wasm_call_ctors=()=>(___wasm_call_ctors=wasmExports["c"])();var _zss_init=Module["_zss_init"]=a0=>(_zss_init=Module["_zss_init"]=wasmExports["d"])(a0);var _zss_control_ptr=Module["_zss_control_ptr"]=()=>(_zss_control_ptr=Module["_zss_control_ptr"]=wasmExports["e"])();var _zss_control_len=Module["_zss_control_len"]=()=>(_zss_control_len=Module["_zss_control_len"]=wasmExports["f"])();var _zss_razzle_tag=Module["_zss_razzle_tag"]=()=>(_zss_razzle_tag=Module["_zss_razzle_tag"]=wasmExports["g"])();var _zss_process=Module["_zss_process"]=(a0,a1,a2)=>(_zss_process=Module["_zss_process"]=wasmExports["h"])(a0,a1,a2);var _malloc=Module["_malloc"]=a0=>(_malloc=Module["_malloc"]=wasmExports["j"])(a0);var _free=Module["_free"]=a0=>(_free=Module["_free"]=wasmExports["k"])(a0);var __emscripten_stack_restore=a0=>(__emscripten_stack_restore=wasmExports["l"])(a0);var __emscripten_stack_alloc=a0=>(__emscripten_stack_alloc=wasmExports["m"])(a0);var _emscripten_stack_get_current=()=>(_emscripten_stack_get_current=wasmExports["n"])();Module["cwrap"]=cwrap;Module["setValue"]=setValue;Module["getValue"]=getValue;var calledRun;dependenciesFulfilled=function runCaller(){if(!calledRun)run();if(!calledRun)dependenciesFulfilled=runCaller};function run(){if(runDependencies>0){return}preRun();if(runDependencies>0){return}function doRun(){if(calledRun)return;calledRun=true;Module["calledRun"]=true;if(ABORT)return;initRuntime();readyPromiseResolve(Module);Module["onRuntimeInitialized"]?.();postRun()}if(Module["setStatus"]){Module["setStatus"]("Running...");setTimeout(function(){setTimeout(function(){Module["setStatus"]("")},1);doRun()},1)}else{doRun()}}if(Module["preInit"]){if(typeof Module["preInit"]=="function")Module["preInit"]=[Module["preInit"]];while(Module["preInit"].length>0){Module["preInit"].pop()()}}run();moduleRtn=readyPromise;


  return moduleRtn;
}
);
})();

/**
 * ZSS DaisySP AudioWorklet source — bundled with zss_daisy.js as a classic script
 * (no ES module imports; Firefox-compatible like maximilian maxi-processor.js).
 */

// @generated-start daisy-sab-layout
const DAISY_SAB_CHANNEL_OFFSET = {
  "zss_voices": 0,
  "zss_drums": 48,
  "zss_main": 72,
  "zss_fx": 77,
  "zss_voicecfg": 185,
  "zss_osccfg": 265,
  "zss_algocfg": 433,
  "zss_vibrato": 641
}
const DAISY_SAB_CHANNEL_LEN = {
  "zss_voices": 48,
  "zss_drums": 24,
  "zss_main": 5,
  "zss_fx": 108,
  "zss_voicecfg": 80,
  "zss_osccfg": 168,
  "zss_algocfg": 208,
  "zss_vibrato": 13
}
// @generated-end daisy-sab-layout

const DAISY_EM_INIT_TIMEOUT_SEC = 5

function postdspstage(port, stage) {
  port.postMessage({ zss_dsp_stage: stage })
}

class DaisyProcessor extends AudioWorkletProcessor {
  constructor(options) {
    super()
    this.sabviews = []
    this.controlview = null
    this.outptr = 0
    this.ttsptr = 0
    this.ready = false
    this.bootstarted = false
    this.pendingwasmbytes = null
    this.eminitstartframe = null
    this.eminiterrposted = false
    const optbytes = options?.processorOptions?.wasmbytes
    if (optbytes) {
      this.pendingwasmbytes = optbytes
      postdspstage(this.port, 'processor_options_wasm')
    }
    this.port.onmessage = (event) => this.onmessage(event)
    postdspstage(this.port, 'constructor')
  }

  bootwasm(wasmbytes) {
    if (this.bootstarted) {
      return
    }
    this.bootstarted = true
    this.eminitstartframe = currentFrame
    postdspstage(this.port, 'bootwasm_enter')

    if (!wasmbytes) {
      this.port.postMessage({
        zss_dsp_error: 'missing wasm bytes for daisy boot',
      })
      return
    }

    const port = this.port
    // eslint-disable-next-line @typescript-eslint/no-this-alias
    const processor = this
    let wasmmodule
    try {
      wasmmodule = new WebAssembly.Module(wasmbytes)
    } catch (err) {
      port.postMessage({ zss_dsp_error: String(err) })
      return
    }
    postdspstage(port, 'module_compiled')

    const wasmbin =
      wasmbytes instanceof ArrayBuffer ? new Uint8Array(wasmbytes) : wasmbytes

    const modcfg = {
      wasmBinary: wasmbin,
      instantiateWasm: (imports, receiveinstance) => {
        try {
          const instance = new WebAssembly.Instance(wasmmodule, imports)
          receiveinstance(instance, wasmmodule)
        } catch (err) {
          port.postMessage({ zss_dsp_error: String(err) })
          throw err
        }
        return {}
      },
      onRuntimeInitialized() {
        try {
          postdspstage(port, 'runtime_init')
          const ptr = modcfg._zss_control_ptr()
          const len = modcfg._zss_control_len()
          const base = ptr >> 3
          processor.controlview = modcfg.HEAPF64.subarray(base, base + len)
          modcfg._zss_init(sampleRate)
          processor.outptr = modcfg._malloc(128 * 4)
          processor.ttsptr = modcfg._malloc(128 * 4)
          processor.wasm = modcfg
          processor.ready = true
          processor.eminitstartframe = null
          postdspstage(port, 'ready')
          const razzletag =
            typeof modcfg._zss_razzle_tag === 'function'
              ? modcfg._zss_razzle_tag()
              : 0
          port.postMessage({ zss_dsp_ready: 1, zss_razzle_tag: razzletag })
        } catch (err) {
          port.postMessage({ zss_dsp_error: String(err) })
        }
      },
    }

    postdspstage(port, 'emscripten_start')

    ZssDaisy(modcfg).catch((err) => {
      port.postMessage({ zss_dsp_error: String(err) })
    })
  }

  checkeminitdeadline() {
    if (
      this.ready ||
      !this.bootstarted ||
      this.eminitstartframe === null ||
      this.eminiterrposted
    ) {
      return
    }
    const elapsed = (currentFrame - this.eminitstartframe) / sampleRate
    if (elapsed >= DAISY_EM_INIT_TIMEOUT_SEC) {
      this.eminiterrposted = true
      this.port.postMessage({
        zss_dsp_error: 'daisy emscripten init timed out',
      })
    }
  }

  onmessage(event) {
    const data = event.data
    if (data?.zss_boot) {
      postdspstage(this.port, 'onmessage_zss_boot')
      const wasmbytes = data.wasmbytes ?? this.pendingwasmbytes
      this.pendingwasmbytes = wasmbytes
      this.bootwasm(wasmbytes)
      return
    }
    if (data?.zss_sab_register && data.channelID && data.sab && data.length) {
      const offset = DAISY_SAB_CHANNEL_OFFSET[data.channelID]
      const expected = DAISY_SAB_CHANNEL_LEN[data.channelID]
      if (offset === undefined || expected === undefined) {
        return
      }
      const view = new Float64Array(data.sab, 0, data.length)
      this.sabviews.push({ view, offset, length: expected })
      return
    }
    if (data?.zss_sab_push && data.channelID && data.data) {
      const offset = DAISY_SAB_CHANNEL_OFFSET[data.channelID]
      const expected = DAISY_SAB_CHANNEL_LEN[data.channelID]
      if (offset === undefined || !this.controlview) {
        return
      }
      const len = Math.min(data.data.length, expected ?? data.data.length)
      for (let i = 0; i < len; i++) {
        this.controlview[offset + i] = data.data[i]
      }
    }
  }

  synccontrol() {
    const ctrl = this.controlview
    if (!ctrl) {
      return
    }
    for (let i = 0; i < this.sabviews.length; i++) {
      const { view, offset, length } = this.sabviews[i]
      const n = Math.min(view.length, length)
      for (let j = 0; j < n; j++) {
        ctrl[offset + j] = view[j]
      }
    }
  }

  process(inputs, outputs) {
    this.checkeminitdeadline()
    if (!this.bootstarted && this.pendingwasmbytes) {
      postdspstage(this.port, 'process_boot')
      this.bootwasm(this.pendingwasmbytes)
    }
    if (!this.ready || !this.wasm || !this.controlview) {
      return true
    }
    const output = outputs[0]?.[0]
    if (!output) {
      return true
    }
    this.synccontrol()
    const tts = inputs[0]?.[0]
    const heap = this.wasm.HEAPF32
    let ttsptr = 0
    if (tts && tts.length > 0 && this.ttsptr) {
      const ttsbase = this.ttsptr >> 2
      const n = Math.min(tts.length, output.length)
      for (let i = 0; i < n; i++) {
        heap[ttsbase + i] = tts[i]
      }
      for (let i = n; i < output.length; i++) {
        heap[ttsbase + i] = 0
      }
      ttsptr = this.ttsptr
    }
    this.wasm._zss_process(this.outptr, output.length, ttsptr)
    const base = this.outptr >> 2
    for (let i = 0; i < output.length; i++) {
      output[i] = heap[base + i]
    }
    return true
  }
}

registerProcessor('zss-daisy-processor', DaisyProcessor)

