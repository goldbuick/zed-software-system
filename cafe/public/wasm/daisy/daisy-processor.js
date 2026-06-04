/**
 * GENERATED — do not edit. Run `yarn bundle:daisy-processor`.
 * Classic AudioWorklet bundle (Emscripten glue + DaisyProcessor).
 */
async function ZssDaisy(moduleArg={}){var moduleRtn;var Module=moduleArg;var ENVIRONMENT_IS_WEB=!!globalThis.window;var ENVIRONMENT_IS_WORKER=!!globalThis.WorkerGlobalScope;var ENVIRONMENT_IS_NODE=globalThis.process?.versions?.node&&globalThis.process?.type!="renderer";var arguments_=[];var thisProgram="./this.program";var _scriptName="";var scriptDirectory="";function locateFile(path){if(Module["locateFile"]){return Module["locateFile"](path,scriptDirectory)}return scriptDirectory+path}var readAsync,readBinary;if(ENVIRONMENT_IS_WEB||ENVIRONMENT_IS_WORKER){try{scriptDirectory=new URL(".",_scriptName).href}catch{}{if(ENVIRONMENT_IS_WORKER){readBinary=url=>{var xhr=new XMLHttpRequest;xhr.open("GET",url,false);xhr.responseType="arraybuffer";xhr.send(null);return new Uint8Array(xhr.response)}}readAsync=async url=>{var response=await fetch(url,{credentials:"same-origin"});if(response.ok){return response.arrayBuffer()}throw new Error(response.status+" : "+response.url)}}}else{}var out=console.log.bind(console);var err=console.error.bind(console);var wasmBinary;var ABORT=false;class EmscriptenEH{}class EmscriptenSjLj extends EmscriptenEH{}var readyPromiseResolve,readyPromiseReject;var runtimeInitialized=false;function updateMemoryViews(){var b=wasmMemory.buffer;HEAP8=new Int8Array(b);HEAP16=new Int16Array(b);HEAPU8=new Uint8Array(b);HEAPU16=new Uint16Array(b);HEAP32=new Int32Array(b);HEAPU32=new Uint32Array(b);Module["HEAPF32"]=HEAPF32=new Float32Array(b);Module["HEAPF64"]=HEAPF64=new Float64Array(b);HEAP64=new BigInt64Array(b);HEAPU64=new BigUint64Array(b)}function preRun(){if(Module["preRun"]){if(typeof Module["preRun"]=="function")Module["preRun"]=[Module["preRun"]];while(Module["preRun"].length){addOnPreRun(Module["preRun"].shift())}}callRuntimeCallbacks(onPreRuns)}function initRuntime(){runtimeInitialized=true;wasmExports["c"]()}function postRun(){if(Module["postRun"]){if(typeof Module["postRun"]=="function")Module["postRun"]=[Module["postRun"]];while(Module["postRun"].length){addOnPostRun(Module["postRun"].shift())}}callRuntimeCallbacks(onPostRuns)}function abort(what){Module["onAbort"]?.(what);what=`Aborted(${what})`;err(what);ABORT=true;what+=". Build with -sASSERTIONS for more info.";var e=new WebAssembly.RuntimeError(what);readyPromiseReject?.(e);throw e}var wasmBinaryFile;function findWasmBinary(){if(Module["locateFile"]){return locateFile("zss_daisy.wasm")}throw new Error("wasmBinary required in worklet")}function getBinarySync(file){if(file==wasmBinaryFile&&wasmBinary){return new Uint8Array(wasmBinary)}if(readBinary){return readBinary(file)}throw"both async and sync fetching of the wasm failed"}async function getWasmBinary(binaryFile){if(!wasmBinary){try{var response=await readAsync(binaryFile);return new Uint8Array(response)}catch{}}return getBinarySync(binaryFile)}async function instantiateArrayBuffer(binaryFile,imports){try{var binary=await getWasmBinary(binaryFile);var instance=await WebAssembly.instantiate(binary,imports);return instance}catch(reason){err(`failed to asynchronously prepare wasm: ${reason}`);abort(reason)}}async function instantiateAsync(binary,binaryFile,imports){if(!binary){try{var response=fetch(binaryFile,{credentials:"same-origin"});var instantiationResult=await WebAssembly.instantiateStreaming(response,imports);return instantiationResult}catch(reason){err(`wasm streaming compile failed: ${reason}`);err("falling back to ArrayBuffer instantiation")}}return instantiateArrayBuffer(binaryFile,imports)}function getWasmImports(){var imports={a:wasmImports};return imports}async function createWasm(){function receiveInstance(instance,module){wasmExports=instance.exports;assignWasmExports(wasmExports);updateMemoryViews();return wasmExports}function receiveInstantiationResult(result){return receiveInstance(result["instance"])}var info=getWasmImports();if(Module["instantiateWasm"]){return new Promise((resolve,reject)=>{Module["instantiateWasm"](info,(inst,mod)=>{resolve(receiveInstance(inst,mod))})})}wasmBinaryFile??=findWasmBinary();var result=await instantiateAsync(wasmBinary,wasmBinaryFile,info);var exports=receiveInstantiationResult(result);return exports}class ExitStatus{name="ExitStatus";constructor(status){this.message=`Program terminated with exit(${status})`;this.status=status}}var HEAP16;var HEAP32;var HEAP64;var HEAP8;var HEAPF32;var HEAPF64;var HEAPU16;var HEAPU32;var HEAPU64;var HEAPU8;var callRuntimeCallbacks=callbacks=>{while(callbacks.length>0){callbacks.shift()(Module)}};var onPostRuns=[];var addOnPostRun=cb=>onPostRuns.push(cb);var onPreRuns=[];var addOnPreRun=cb=>onPreRuns.push(cb);function getValue(ptr,type="i8"){if(type.endsWith("*"))type="*";switch(type){case"i1":return HEAP8[ptr];case"i8":return HEAP8[ptr];case"i16":return HEAP16[ptr>>1];case"i32":return HEAP32[ptr>>2];case"i64":return HEAP64[ptr>>3];case"float":return HEAPF32[ptr>>2];case"double":return HEAPF64[ptr>>3];case"*":return HEAPU32[ptr>>2];default:abort(`invalid type for getValue: ${type}`)}}var noExitRuntime=true;function setValue(ptr,value,type="i8"){if(type.endsWith("*"))type="*";switch(type){case"i1":HEAP8[ptr]=value;break;case"i8":HEAP8[ptr]=value;break;case"i16":HEAP16[ptr>>1]=value;break;case"i32":HEAP32[ptr>>2]=value;break;case"i64":HEAP64[ptr>>3]=BigInt(value);break;case"float":HEAPF32[ptr>>2]=value;break;case"double":HEAPF64[ptr>>3]=value;break;case"*":HEAPU32[ptr>>2]=value;break;default:abort(`invalid type for setValue: ${type}`)}}var stackRestore=val=>__emscripten_stack_restore(val);var stackSave=()=>_emscripten_stack_get_current();var abortOnCannotGrowMemory=requestedSize=>{abort("OOM")};var _emscripten_resize_heap=requestedSize=>{var oldSize=HEAPU8.length;requestedSize>>>=0;abortOnCannotGrowMemory(requestedSize)};var getCFunc=ident=>{var func=Module["_"+ident];return func};var writeArrayToMemory=(array,buffer)=>{HEAP8.set(array,buffer)};var lengthBytesUTF8=str=>{var len=0;for(var i=0;i<str.length;++i){var c=str.charCodeAt(i);if(c<=127){len++}else if(c<=2047){len+=2}else if(c>=55296&&c<=57343){len+=4;++i}else{len+=3}}return len};var stringToUTF8Array=(str,heap,outIdx,maxBytesToWrite)=>{if(!(maxBytesToWrite>0))return 0;var startIdx=outIdx;var endIdx=outIdx+maxBytesToWrite-1;for(var i=0;i<str.length;++i){var u=str.codePointAt(i);if(u<=127){if(outIdx>=endIdx)break;heap[outIdx++]=u}else if(u<=2047){if(outIdx+1>=endIdx)break;heap[outIdx++]=192|u>>6;heap[outIdx++]=128|u&63}else if(u<=65535){if(outIdx+2>=endIdx)break;heap[outIdx++]=224|u>>12;heap[outIdx++]=128|u>>6&63;heap[outIdx++]=128|u&63}else{if(outIdx+3>=endIdx)break;heap[outIdx++]=240|u>>18;heap[outIdx++]=128|u>>12&63;heap[outIdx++]=128|u>>6&63;heap[outIdx++]=128|u&63;i++}}heap[outIdx]=0;return outIdx-startIdx};var stringToUTF8=(str,outPtr,maxBytesToWrite)=>stringToUTF8Array(str,HEAPU8,outPtr,maxBytesToWrite);var stackAlloc=sz=>__emscripten_stack_alloc(sz);var stringToUTF8OnStack=str=>{var size=lengthBytesUTF8(str)+1;var ret=stackAlloc(size);stringToUTF8(str,ret,size);return ret};var UTF8Decoder=globalThis.TextDecoder&&new TextDecoder;var findStringEnd=(heapOrArray,idx,maxBytesToRead,ignoreNul)=>{var maxIdx=idx+maxBytesToRead;if(ignoreNul)return maxIdx;while(heapOrArray[idx]&&!(idx>=maxIdx))++idx;return idx};var UTF8ArrayToString=(heapOrArray,idx=0,maxBytesToRead,ignoreNul)=>{var endPtr=findStringEnd(heapOrArray,idx,maxBytesToRead,ignoreNul);if(endPtr-idx>16&&heapOrArray.buffer&&UTF8Decoder){return UTF8Decoder.decode(heapOrArray.subarray(idx,endPtr))}var str="";while(idx<endPtr){var u0=heapOrArray[idx++];if(!(u0&128)){str+=String.fromCharCode(u0);continue}var u1=heapOrArray[idx++]&63;if((u0&224)==192){str+=String.fromCharCode((u0&31)<<6|u1);continue}var u2=heapOrArray[idx++]&63;if((u0&240)==224){u0=(u0&15)<<12|u1<<6|u2}else{u0=(u0&7)<<18|u1<<12|u2<<6|heapOrArray[idx++]&63}if(u0<65536){str+=String.fromCharCode(u0)}else{var ch=u0-65536;str+=String.fromCharCode(55296|ch>>10,56320|ch&1023)}}return str};var UTF8ToString=(ptr,maxBytesToRead,ignoreNul)=>ptr?UTF8ArrayToString(HEAPU8,ptr,maxBytesToRead,ignoreNul):"";var ccall=(ident,returnType,argTypes,args,opts)=>{var toC={string:str=>{var ret=0;if(str!==null&&str!==undefined&&str!==0){ret=stringToUTF8OnStack(str)}return ret},array:arr=>{var ret=stackAlloc(arr.length);writeArrayToMemory(arr,ret);return ret}};function convertReturnValue(ret){if(returnType==="string"){return UTF8ToString(ret)}if(returnType==="boolean")return Boolean(ret);return ret}var func=getCFunc(ident);var cArgs=[];var stack=0;if(args){for(var i=0;i<args.length;i++){var converter=toC[argTypes[i]];if(converter){if(stack===0)stack=stackSave();cArgs[i]=converter(args[i])}else{cArgs[i]=args[i]}}}var ret=func(...cArgs);function onDone(ret){if(stack!==0)stackRestore(stack);return convertReturnValue(ret)}ret=onDone(ret);return ret};var cwrap=(ident,returnType,argTypes,opts)=>{var numericArgs=!argTypes||argTypes.every(type=>type==="number"||type==="boolean");var numericRet=returnType!=="string";if(numericRet&&numericArgs&&!opts){return getCFunc(ident)}return(...args)=>ccall(ident,returnType,argTypes,args,opts)};{if(Module["noExitRuntime"])noExitRuntime=Module["noExitRuntime"];if(Module["print"])out=Module["print"];if(Module["printErr"])err=Module["printErr"];if(Module["wasmBinary"])wasmBinary=Module["wasmBinary"];if(Module["arguments"])arguments_=Module["arguments"];if(Module["thisProgram"])thisProgram=Module["thisProgram"];if(Module["preInit"]){if(typeof Module["preInit"]=="function")Module["preInit"]=[Module["preInit"]];while(Module["preInit"].length>0){Module["preInit"].shift()()}}}Module["cwrap"]=cwrap;Module["setValue"]=setValue;Module["getValue"]=getValue;var _zss_init,_zss_control_ptr,_zss_control_len,_zss_razzle_tag,_zss_process,_malloc,_free,__emscripten_stack_restore,__emscripten_stack_alloc,_emscripten_stack_get_current,memory,__indirect_function_table,wasmMemory;function assignWasmExports(wasmExports){_zss_init=Module["_zss_init"]=wasmExports["d"];_zss_control_ptr=Module["_zss_control_ptr"]=wasmExports["e"];_zss_control_len=Module["_zss_control_len"]=wasmExports["f"];_zss_razzle_tag=Module["_zss_razzle_tag"]=wasmExports["g"];_zss_process=Module["_zss_process"]=wasmExports["h"];_malloc=Module["_malloc"]=wasmExports["i"];_free=Module["_free"]=wasmExports["j"];__emscripten_stack_restore=wasmExports["k"];__emscripten_stack_alloc=wasmExports["l"];_emscripten_stack_get_current=wasmExports["m"];memory=wasmMemory=wasmExports["b"];__indirect_function_table=wasmExports["__indirect_function_table"]}var wasmImports={a:_emscripten_resize_heap};function run(){preRun();function doRun(){Module["calledRun"]=true;if(ABORT)return;initRuntime();readyPromiseResolve?.(Module);Module["onRuntimeInitialized"]?.();postRun()}if(Module["setStatus"]){Module["setStatus"]("Running...");setTimeout(()=>{setTimeout(()=>Module["setStatus"](""),1);doRun()},1)}else{doRun()}}var wasmExports;wasmExports=await (createWasm());run();if(runtimeInitialized){moduleRtn=Module}else{moduleRtn=new Promise((resolve,reject)=>{readyPromiseResolve=resolve;readyPromiseReject=reject})}
;return moduleRtn}
/**
 * ZSS DaisySP AudioWorklet source — bundled with zss_daisy.js as a classic script
 * (no ES module imports; Firefox-compatible like maximilian maxi-processor.js).
 */

// @generated-start daisy-sab-layout
const DAISY_SAB_CHANNEL_OFFSET = {
  "zss_voices": 0,
  "zss_drums": 48,
  "zss_main": 68,
  "zss_fx": 73,
  "zss_voicecfg": 181,
  "zss_osccfg": 261,
  "zss_algocfg": 429,
  "zss_vibrato": 637
}
const DAISY_SAB_CHANNEL_LEN = {
  "zss_voices": 48,
  "zss_drums": 20,
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

