const Yh="176";const $h=0,Kh=1,Zh=2,jh=3,Jh=0,Qh=1,ef=2,tf=0;const nf=1;const rf=0;const sf=4;const af=1e3;const of=1003;const lf=1006;const cf=1009;const uf=1014,hf=1015,ff=1016;const df=1020;const pf=1023;const mf=1027,_f=1028;const gf=1030;const xf=1033;const vf=3200;const Sf="",wt="srgb",Nn="srgb-linear",Di="linear",je="srgb";const Mf=35048,wr="300 es";class On{addEventListener(e,t){this._listeners===void 0&&(this._listeners={});const n=this._listeners;n[e]===void 0&&(n[e]=[]),n[e].indexOf(t)===-1&&n[e].push(t)}hasEventListener(e,t){const n=this._listeners;return n===void 0?!1:n[e]!==void 0&&n[e].indexOf(t)!==-1}removeEventListener(e,t){const n=this._listeners;if(n===void 0)return;const r=n[e];if(r!==void 0){const s=r.indexOf(t);s!==-1&&r.splice(s,1)}}dispatchEvent(e){const t=this._listeners;if(t===void 0)return;const n=t[e.type];if(n!==void 0){e.target=this;const r=n.slice(0);for(let s=0,a=r.length;s<a;s++)r[s].call(this,e);e.target=null}}}const dt=["00","01","02","03","04","05","06","07","08","09","0a","0b","0c","0d","0e","0f","10","11","12","13","14","15","16","17","18","19","1a","1b","1c","1d","1e","1f","20","21","22","23","24","25","26","27","28","29","2a","2b","2c","2d","2e","2f","30","31","32","33","34","35","36","37","38","39","3a","3b","3c","3d","3e","3f","40","41","42","43","44","45","46","47","48","49","4a","4b","4c","4d","4e","4f","50","51","52","53","54","55","56","57","58","59","5a","5b","5c","5d","5e","5f","60","61","62","63","64","65","66","67","68","69","6a","6b","6c","6d","6e","6f","70","71","72","73","74","75","76","77","78","79","7a","7b","7c","7d","7e","7f","80","81","82","83","84","85","86","87","88","89","8a","8b","8c","8d","8e","8f","90","91","92","93","94","95","96","97","98","99","9a","9b","9c","9d","9e","9f","a0","a1","a2","a3","a4","a5","a6","a7","a8","a9","aa","ab","ac","ad","ae","af","b0","b1","b2","b3","b4","b5","b6","b7","b8","b9","ba","bb","bc","bd","be","bf","c0","c1","c2","c3","c4","c5","c6","c7","c8","c9","ca","cb","cc","cd","ce","cf","d0","d1","d2","d3","d4","d5","d6","d7","d8","d9","da","db","dc","dd","de","df","e0","e1","e2","e3","e4","e5","e6","e7","e8","e9","ea","eb","ec","ed","ee","ef","f0","f1","f2","f3","f4","f5","f6","f7","f8","f9","fa","fb","fc","fd","fe","ff"];let Cr=1234567;const Zn=Math.PI/180,Jn=180/Math.PI;function Gn(){const i=Math.random()*4294967295|0,e=Math.random()*4294967295|0,t=Math.random()*4294967295|0,n=Math.random()*4294967295|0;return(dt[i&255]+dt[i>>8&255]+dt[i>>16&255]+dt[i>>24&255]+"-"+dt[e&255]+dt[e>>8&255]+"-"+dt[e>>16&15|64]+dt[e>>24&255]+"-"+dt[t&63|128]+dt[t>>8&255]+"-"+dt[t>>16&255]+dt[t>>24&255]+dt[n&255]+dt[n>>8&255]+dt[n>>16&255]+dt[n>>24&255]).toLowerCase()}function Ge(i,e,t){return Math.max(e,Math.min(t,i))}function pr(i,e){return(i%e+e)%e}function ea(i,e,t,n,r){return n+(i-e)*(r-n)/(t-e)}function ta(i,e,t){return i!==e?(t-i)/(e-i):0}function jn(i,e,t){return(1-t)*i+t*e}function na(i,e,t,n){return jn(i,e,1-Math.exp(-t*n))}function ia(i,e=1){return e-Math.abs(pr(i,e*2)-e)}function ra(i,e,t){return i<=e?0:i>=t?1:(i=(i-e)/(t-e),i*i*(3-2*i))}function sa(i,e,t){return i<=e?0:i>=t?1:(i=(i-e)/(t-e),i*i*i*(i*(i*6-15)+10))}function aa(i,e){return i+Math.floor(Math.random()*(e-i+1))}function oa(i,e){return i+Math.random()*(e-i)}function la(i){return i*(.5-Math.random())}function ca(i){i!==void 0&&(Cr=i);let e=Cr+=1831565813;return e=Math.imul(e^e>>>15,e|1),e^=e+Math.imul(e^e>>>7,e|61),((e^e>>>14)>>>0)/4294967296}function ua(i){return i*Zn}function ha(i){return i*Jn}function fa(i){return(i&i-1)===0&&i!==0}function da(i){return Math.pow(2,Math.ceil(Math.log(i)/Math.LN2))}function pa(i){return Math.pow(2,Math.floor(Math.log(i)/Math.LN2))}function ma(i,e,t,n,r){const s=Math.cos,a=Math.sin,o=s(t/2),u=a(t/2),f=s((e+n)/2),c=a((e+n)/2),p=s((e-n)/2),m=a((e-n)/2),g=s((n-e)/2),S=a((n-e)/2);switch(r){case"XYX":i.set(o*c,u*p,u*m,o*f);break;case"YZY":i.set(u*m,o*c,u*p,o*f);break;case"ZXZ":i.set(u*p,u*m,o*c,o*f);break;case"XZX":i.set(o*c,u*S,u*g,o*f);break;case"YXY":i.set(u*g,o*c,u*S,o*f);break;case"ZYZ":i.set(u*S,u*g,o*c,o*f);break;default:console.warn("THREE.MathUtils: .setQuaternionFromProperEuler() encountered an unknown order: "+r)}}function Un(i,e){switch(e.constructor){case Float32Array:return i;case Uint32Array:return i/4294967295;case Uint16Array:return i/65535;case Uint8Array:return i/255;case Int32Array:return Math.max(i/2147483647,-1);case Int16Array:return Math.max(i/32767,-1);case Int8Array:return Math.max(i/127,-1);default:throw new Error("Invalid component type.")}}function gt(i,e){switch(e.constructor){case Float32Array:return i;case Uint32Array:return Math.round(i*4294967295);case Uint16Array:return Math.round(i*65535);case Uint8Array:return Math.round(i*255);case Int32Array:return Math.round(i*2147483647);case Int16Array:return Math.round(i*32767);case Int8Array:return Math.round(i*127);default:throw new Error("Invalid component type.")}}const Ef={DEG2RAD:Zn,RAD2DEG:Jn,generateUUID:Gn,clamp:Ge,euclideanModulo:pr,mapLinear:ea,inverseLerp:ta,lerp:jn,damp:na,pingpong:ia,smoothstep:ra,smootherstep:sa,randInt:aa,randFloat:oa,randFloatSpread:la,seededRandom:ca,degToRad:ua,radToDeg:ha,isPowerOfTwo:fa,ceilPowerOfTwo:da,floorPowerOfTwo:pa,setQuaternionFromProperEuler:ma,normalize:gt,denormalize:Un};class qe{constructor(e=0,t=0){qe.prototype.isVector2=!0,this.x=e,this.y=t}get width(){return this.x}set width(e){this.x=e}get height(){return this.y}set height(e){this.y=e}set(e,t){return this.x=e,this.y=t,this}setScalar(e){return this.x=e,this.y=e,this}setX(e){return this.x=e,this}setY(e){return this.y=e,this}setComponent(e,t){switch(e){case 0:this.x=t;break;case 1:this.y=t;break;default:throw new Error("index is out of range: "+e)}return this}getComponent(e){switch(e){case 0:return this.x;case 1:return this.y;default:throw new Error("index is out of range: "+e)}}clone(){return new this.constructor(this.x,this.y)}copy(e){return this.x=e.x,this.y=e.y,this}add(e){return this.x+=e.x,this.y+=e.y,this}addScalar(e){return this.x+=e,this.y+=e,this}addVectors(e,t){return this.x=e.x+t.x,this.y=e.y+t.y,this}addScaledVector(e,t){return this.x+=e.x*t,this.y+=e.y*t,this}sub(e){return this.x-=e.x,this.y-=e.y,this}subScalar(e){return this.x-=e,this.y-=e,this}subVectors(e,t){return this.x=e.x-t.x,this.y=e.y-t.y,this}multiply(e){return this.x*=e.x,this.y*=e.y,this}multiplyScalar(e){return this.x*=e,this.y*=e,this}divide(e){return this.x/=e.x,this.y/=e.y,this}divideScalar(e){return this.multiplyScalar(1/e)}applyMatrix3(e){const t=this.x,n=this.y,r=e.elements;return this.x=r[0]*t+r[3]*n+r[6],this.y=r[1]*t+r[4]*n+r[7],this}min(e){return this.x=Math.min(this.x,e.x),this.y=Math.min(this.y,e.y),this}max(e){return this.x=Math.max(this.x,e.x),this.y=Math.max(this.y,e.y),this}clamp(e,t){return this.x=Ge(this.x,e.x,t.x),this.y=Ge(this.y,e.y,t.y),this}clampScalar(e,t){return this.x=Ge(this.x,e,t),this.y=Ge(this.y,e,t),this}clampLength(e,t){const n=this.length();return this.divideScalar(n||1).multiplyScalar(Ge(n,e,t))}floor(){return this.x=Math.floor(this.x),this.y=Math.floor(this.y),this}ceil(){return this.x=Math.ceil(this.x),this.y=Math.ceil(this.y),this}round(){return this.x=Math.round(this.x),this.y=Math.round(this.y),this}roundToZero(){return this.x=Math.trunc(this.x),this.y=Math.trunc(this.y),this}negate(){return this.x=-this.x,this.y=-this.y,this}dot(e){return this.x*e.x+this.y*e.y}cross(e){return this.x*e.y-this.y*e.x}lengthSq(){return this.x*this.x+this.y*this.y}length(){return Math.sqrt(this.x*this.x+this.y*this.y)}manhattanLength(){return Math.abs(this.x)+Math.abs(this.y)}normalize(){return this.divideScalar(this.length()||1)}angle(){return Math.atan2(-this.y,-this.x)+Math.PI}angleTo(e){const t=Math.sqrt(this.lengthSq()*e.lengthSq());if(t===0)return Math.PI/2;const n=this.dot(e)/t;return Math.acos(Ge(n,-1,1))}distanceTo(e){return Math.sqrt(this.distanceToSquared(e))}distanceToSquared(e){const t=this.x-e.x,n=this.y-e.y;return t*t+n*n}manhattanDistanceTo(e){return Math.abs(this.x-e.x)+Math.abs(this.y-e.y)}setLength(e){return this.normalize().multiplyScalar(e)}lerp(e,t){return this.x+=(e.x-this.x)*t,this.y+=(e.y-this.y)*t,this}lerpVectors(e,t,n){return this.x=e.x+(t.x-e.x)*n,this.y=e.y+(t.y-e.y)*n,this}equals(e){return e.x===this.x&&e.y===this.y}fromArray(e,t=0){return this.x=e[t],this.y=e[t+1],this}toArray(e=[],t=0){return e[t]=this.x,e[t+1]=this.y,e}fromBufferAttribute(e,t){return this.x=e.getX(t),this.y=e.getY(t),this}rotateAround(e,t){const n=Math.cos(t),r=Math.sin(t),s=this.x-e.x,a=this.y-e.y;return this.x=s*n-a*r+e.x,this.y=s*r+a*n+e.y,this}random(){return this.x=Math.random(),this.y=Math.random(),this}*[Symbol.iterator](){yield this.x,yield this.y}}class Ue{constructor(e,t,n,r,s,a,o,u,f){Ue.prototype.isMatrix3=!0,this.elements=[1,0,0,0,1,0,0,0,1],e!==void 0&&this.set(e,t,n,r,s,a,o,u,f)}set(e,t,n,r,s,a,o,u,f){const c=this.elements;return c[0]=e,c[1]=r,c[2]=o,c[3]=t,c[4]=s,c[5]=u,c[6]=n,c[7]=a,c[8]=f,this}identity(){return this.set(1,0,0,0,1,0,0,0,1),this}copy(e){const t=this.elements,n=e.elements;return t[0]=n[0],t[1]=n[1],t[2]=n[2],t[3]=n[3],t[4]=n[4],t[5]=n[5],t[6]=n[6],t[7]=n[7],t[8]=n[8],this}extractBasis(e,t,n){return e.setFromMatrix3Column(this,0),t.setFromMatrix3Column(this,1),n.setFromMatrix3Column(this,2),this}setFromMatrix4(e){const t=e.elements;return this.set(t[0],t[4],t[8],t[1],t[5],t[9],t[2],t[6],t[10]),this}multiply(e){return this.multiplyMatrices(this,e)}premultiply(e){return this.multiplyMatrices(e,this)}multiplyMatrices(e,t){const n=e.elements,r=t.elements,s=this.elements,a=n[0],o=n[3],u=n[6],f=n[1],c=n[4],p=n[7],m=n[2],g=n[5],S=n[8],T=r[0],_=r[3],d=r[6],U=r[1],C=r[4],R=r[7],z=r[2],L=r[5],F=r[8];return s[0]=a*T+o*U+u*z,s[3]=a*_+o*C+u*L,s[6]=a*d+o*R+u*F,s[1]=f*T+c*U+p*z,s[4]=f*_+c*C+p*L,s[7]=f*d+c*R+p*F,s[2]=m*T+g*U+S*z,s[5]=m*_+g*C+S*L,s[8]=m*d+g*R+S*F,this}multiplyScalar(e){const t=this.elements;return t[0]*=e,t[3]*=e,t[6]*=e,t[1]*=e,t[4]*=e,t[7]*=e,t[2]*=e,t[5]*=e,t[8]*=e,this}determinant(){const e=this.elements,t=e[0],n=e[1],r=e[2],s=e[3],a=e[4],o=e[5],u=e[6],f=e[7],c=e[8];return t*a*c-t*o*f-n*s*c+n*o*u+r*s*f-r*a*u}invert(){const e=this.elements,t=e[0],n=e[1],r=e[2],s=e[3],a=e[4],o=e[5],u=e[6],f=e[7],c=e[8],p=c*a-o*f,m=o*u-c*s,g=f*s-a*u,S=t*p+n*m+r*g;if(S===0)return this.set(0,0,0,0,0,0,0,0,0);const T=1/S;return e[0]=p*T,e[1]=(r*f-c*n)*T,e[2]=(o*n-r*a)*T,e[3]=m*T,e[4]=(c*t-r*u)*T,e[5]=(r*s-o*t)*T,e[6]=g*T,e[7]=(n*u-f*t)*T,e[8]=(a*t-n*s)*T,this}transpose(){let e;const t=this.elements;return e=t[1],t[1]=t[3],t[3]=e,e=t[2],t[2]=t[6],t[6]=e,e=t[5],t[5]=t[7],t[7]=e,this}getNormalMatrix(e){return this.setFromMatrix4(e).invert().transpose()}transposeIntoArray(e){const t=this.elements;return e[0]=t[0],e[1]=t[3],e[2]=t[6],e[3]=t[1],e[4]=t[4],e[5]=t[7],e[6]=t[2],e[7]=t[5],e[8]=t[8],this}setUvTransform(e,t,n,r,s,a,o){const u=Math.cos(s),f=Math.sin(s);return this.set(n*u,n*f,-n*(u*a+f*o)+a+e,-r*f,r*u,-r*(-f*a+u*o)+o+t,0,0,1),this}scale(e,t){return this.premultiply(Bi.makeScale(e,t)),this}rotate(e){return this.premultiply(Bi.makeRotation(-e)),this}translate(e,t){return this.premultiply(Bi.makeTranslation(e,t)),this}makeTranslation(e,t){return e.isVector2?this.set(1,0,e.x,0,1,e.y,0,0,1):this.set(1,0,e,0,1,t,0,0,1),this}makeRotation(e){const t=Math.cos(e),n=Math.sin(e);return this.set(t,-n,0,n,t,0,0,0,1),this}makeScale(e,t){return this.set(e,0,0,0,t,0,0,0,1),this}equals(e){const t=this.elements,n=e.elements;for(let r=0;r<9;r++)if(t[r]!==n[r])return!1;return!0}fromArray(e,t=0){for(let n=0;n<9;n++)this.elements[n]=e[n+t];return this}toArray(e=[],t=0){const n=this.elements;return e[t]=n[0],e[t+1]=n[1],e[t+2]=n[2],e[t+3]=n[3],e[t+4]=n[4],e[t+5]=n[5],e[t+6]=n[6],e[t+7]=n[7],e[t+8]=n[8],e}clone(){return new this.constructor().fromArray(this.elements)}}const Bi=new Ue;function ws(i){for(let e=i.length-1;e>=0;--e)if(i[e]>=65535)return!0;return!1}function Qn(i){return document.createElementNS("http://www.w3.org/1999/xhtml",i)}function _a(){const i=Qn("canvas");return i.style.display="block",i}const Pr={};function Ci(i){i in Pr||(Pr[i]=!0,console.warn(i))}function ga(i,e,t){return new Promise(function(n,r){function s(){switch(i.clientWaitSync(e,i.SYNC_FLUSH_COMMANDS_BIT,0)){case i.WAIT_FAILED:r();break;case i.TIMEOUT_EXPIRED:setTimeout(s,t);break;default:n()}}setTimeout(s,t)})}function xa(i){const e=i.elements;e[2]=.5*e[2]+.5*e[3],e[6]=.5*e[6]+.5*e[7],e[10]=.5*e[10]+.5*e[11],e[14]=.5*e[14]+.5*e[15]}function va(i){const e=i.elements;e[11]===-1?(e[10]=-e[10]-1,e[14]=-e[14]):(e[10]=-e[10],e[14]=-e[14]+1)}const Dr=new Ue().set(.4123908,.3575843,.1804808,.212639,.7151687,.0721923,.0193308,.1191948,.9505322),Ir=new Ue().set(3.2409699,-1.5373832,-.4986108,-.9692436,1.8759675,.0415551,.0556301,-.203977,1.0569715);function Sa(){const i={enabled:!0,workingColorSpace:Nn,spaces:{},convert:function(r,s,a){return this.enabled===!1||s===a||!s||!a||(this.spaces[s].transfer===je&&(r.r=qt(r.r),r.g=qt(r.g),r.b=qt(r.b)),this.spaces[s].primaries!==this.spaces[a].primaries&&(r.applyMatrix3(this.spaces[s].toXYZ),r.applyMatrix3(this.spaces[a].fromXYZ)),this.spaces[a].transfer===je&&(r.r=Fn(r.r),r.g=Fn(r.g),r.b=Fn(r.b))),r},fromWorkingColorSpace:function(r,s){return this.convert(r,this.workingColorSpace,s)},toWorkingColorSpace:function(r,s){return this.convert(r,s,this.workingColorSpace)},getPrimaries:function(r){return this.spaces[r].primaries},getTransfer:function(r){return r===""?Di:this.spaces[r].transfer},getLuminanceCoefficients:function(r,s=this.workingColorSpace){return r.fromArray(this.spaces[s].luminanceCoefficients)},define:function(r){Object.assign(this.spaces,r)},_getMatrix:function(r,s,a){return r.copy(this.spaces[s].toXYZ).multiply(this.spaces[a].fromXYZ)},_getDrawingBufferColorSpace:function(r){return this.spaces[r].outputColorSpaceConfig.drawingBufferColorSpace},_getUnpackColorSpace:function(r=this.workingColorSpace){return this.spaces[r].workingColorSpaceConfig.unpackColorSpace}},e=[.64,.33,.3,.6,.15,.06],t=[.2126,.7152,.0722],n=[.3127,.329];return i.define({[Nn]:{primaries:e,whitePoint:n,transfer:Di,toXYZ:Dr,fromXYZ:Ir,luminanceCoefficients:t,workingColorSpaceConfig:{unpackColorSpace:wt},outputColorSpaceConfig:{drawingBufferColorSpace:wt}},[wt]:{primaries:e,whitePoint:n,transfer:je,toXYZ:Dr,fromXYZ:Ir,luminanceCoefficients:t,outputColorSpaceConfig:{drawingBufferColorSpace:wt}}}),i}const ke=Sa();function qt(i){return i<.04045?i*.0773993808:Math.pow(i*.9478672986+.0521327014,2.4)}function Fn(i){return i<.0031308?i*12.92:1.055*Math.pow(i,.41666)-.055}let xn;class Ma{static getDataURL(e,t="image/png"){if(/^data:/i.test(e.src)||typeof HTMLCanvasElement>"u")return e.src;let n;if(e instanceof HTMLCanvasElement)n=e;else{xn===void 0&&(xn=Qn("canvas")),xn.width=e.width,xn.height=e.height;const r=xn.getContext("2d");e instanceof ImageData?r.putImageData(e,0,0):r.drawImage(e,0,0,e.width,e.height),n=xn}return n.toDataURL(t)}static sRGBToLinear(e){if(typeof HTMLImageElement<"u"&&e instanceof HTMLImageElement||typeof HTMLCanvasElement<"u"&&e instanceof HTMLCanvasElement||typeof ImageBitmap<"u"&&e instanceof ImageBitmap){const t=Qn("canvas");t.width=e.width,t.height=e.height;const n=t.getContext("2d");n.drawImage(e,0,0,e.width,e.height);const r=n.getImageData(0,0,e.width,e.height),s=r.data;for(let a=0;a<s.length;a++)s[a]=qt(s[a]/255)*255;return n.putImageData(r,0,0),t}else if(e.data){const t=e.data.slice(0);for(let n=0;n<t.length;n++)t instanceof Uint8Array||t instanceof Uint8ClampedArray?t[n]=Math.floor(qt(t[n]/255)*255):t[n]=qt(t[n]);return{data:t,width:e.width,height:e.height}}else return console.warn("THREE.ImageUtils.sRGBToLinear(): Unsupported image type. No color space conversion applied."),e}}let Ea=0;class mr{constructor(e=null){this.isSource=!0,Object.defineProperty(this,"id",{value:Ea++}),this.uuid=Gn(),this.data=e,this.dataReady=!0,this.version=0}set needsUpdate(e){e===!0&&this.version++}toJSON(e){const t=e===void 0||typeof e=="string";if(!t&&e.images[this.uuid]!==void 0)return e.images[this.uuid];const n={uuid:this.uuid,url:""},r=this.data;if(r!==null){let s;if(Array.isArray(r)){s=[];for(let a=0,o=r.length;a<o;a++)r[a].isDataTexture?s.push(Oi(r[a].image)):s.push(Oi(r[a]))}else s=Oi(r);n.url=s}return t||(e.images[this.uuid]=n),n}}function Oi(i){return typeof HTMLImageElement<"u"&&i instanceof HTMLImageElement||typeof HTMLCanvasElement<"u"&&i instanceof HTMLCanvasElement||typeof ImageBitmap<"u"&&i instanceof ImageBitmap?Ma.getDataURL(i):i.data?{data:Array.from(i.data),width:i.width,height:i.height,type:i.data.constructor.name}:(console.warn("THREE.Texture: Unable to serialize Texture."),{})}let ya=0;class ht extends On{constructor(e=ht.DEFAULT_IMAGE,t=ht.DEFAULT_MAPPING,n=1001,r=1001,s=1006,a=1008,o=1023,u=1009,f=ht.DEFAULT_ANISOTROPY,c=""){super(),this.isTexture=!0,Object.defineProperty(this,"id",{value:ya++}),this.uuid=Gn(),this.name="",this.source=new mr(e),this.mipmaps=[],this.mapping=t,this.channel=0,this.wrapS=n,this.wrapT=r,this.magFilter=s,this.minFilter=a,this.anisotropy=f,this.format=o,this.internalFormat=null,this.type=u,this.offset=new qe(0,0),this.repeat=new qe(1,1),this.center=new qe(0,0),this.rotation=0,this.matrixAutoUpdate=!0,this.matrix=new Ue,this.generateMipmaps=!0,this.premultiplyAlpha=!1,this.flipY=!0,this.unpackAlignment=4,this.colorSpace=c,this.userData={},this.version=0,this.onUpdate=null,this.renderTarget=null,this.isRenderTargetTexture=!1,this.isTextureArray=!1,this.pmremVersion=0}get image(){return this.source.data}set image(e=null){this.source.data=e}updateMatrix(){this.matrix.setUvTransform(this.offset.x,this.offset.y,this.repeat.x,this.repeat.y,this.rotation,this.center.x,this.center.y)}clone(){return new this.constructor().copy(this)}copy(e){return this.name=e.name,this.source=e.source,this.mipmaps=e.mipmaps.slice(0),this.mapping=e.mapping,this.channel=e.channel,this.wrapS=e.wrapS,this.wrapT=e.wrapT,this.magFilter=e.magFilter,this.minFilter=e.minFilter,this.anisotropy=e.anisotropy,this.format=e.format,this.internalFormat=e.internalFormat,this.type=e.type,this.offset.copy(e.offset),this.repeat.copy(e.repeat),this.center.copy(e.center),this.rotation=e.rotation,this.matrixAutoUpdate=e.matrixAutoUpdate,this.matrix.copy(e.matrix),this.generateMipmaps=e.generateMipmaps,this.premultiplyAlpha=e.premultiplyAlpha,this.flipY=e.flipY,this.unpackAlignment=e.unpackAlignment,this.colorSpace=e.colorSpace,this.renderTarget=e.renderTarget,this.isRenderTargetTexture=e.isRenderTargetTexture,this.isTextureArray=e.isTextureArray,this.userData=JSON.parse(JSON.stringify(e.userData)),this.needsUpdate=!0,this}toJSON(e){const t=e===void 0||typeof e=="string";if(!t&&e.textures[this.uuid]!==void 0)return e.textures[this.uuid];const n={metadata:{version:4.6,type:"Texture",generator:"Texture.toJSON"},uuid:this.uuid,name:this.name,image:this.source.toJSON(e).uuid,mapping:this.mapping,channel:this.channel,repeat:[this.repeat.x,this.repeat.y],offset:[this.offset.x,this.offset.y],center:[this.center.x,this.center.y],rotation:this.rotation,wrap:[this.wrapS,this.wrapT],format:this.format,internalFormat:this.internalFormat,type:this.type,colorSpace:this.colorSpace,minFilter:this.minFilter,magFilter:this.magFilter,anisotropy:this.anisotropy,flipY:this.flipY,generateMipmaps:this.generateMipmaps,premultiplyAlpha:this.premultiplyAlpha,unpackAlignment:this.unpackAlignment};return Object.keys(this.userData).length>0&&(n.userData=this.userData),t||(e.textures[this.uuid]=n),n}dispose(){this.dispatchEvent({type:"dispose"})}transformUv(e){if(this.mapping!==300)return e;if(e.applyMatrix3(this.matrix),e.x<0||e.x>1)switch(this.wrapS){case 1e3:e.x=e.x-Math.floor(e.x);break;case 1001:e.x=e.x<0?0:1;break;case 1002:Math.abs(Math.floor(e.x)%2)===1?e.x=Math.ceil(e.x)-e.x:e.x=e.x-Math.floor(e.x);break}if(e.y<0||e.y>1)switch(this.wrapT){case 1e3:e.y=e.y-Math.floor(e.y);break;case 1001:e.y=e.y<0?0:1;break;case 1002:Math.abs(Math.floor(e.y)%2)===1?e.y=Math.ceil(e.y)-e.y:e.y=e.y-Math.floor(e.y);break}return this.flipY&&(e.y=1-e.y),e}set needsUpdate(e){e===!0&&(this.version++,this.source.needsUpdate=!0)}set needsPMREMUpdate(e){e===!0&&this.pmremVersion++}}ht.DEFAULT_IMAGE=null;ht.DEFAULT_MAPPING=300;ht.DEFAULT_ANISOTROPY=1;class rt{constructor(e=0,t=0,n=0,r=1){rt.prototype.isVector4=!0,this.x=e,this.y=t,this.z=n,this.w=r}get width(){return this.z}set width(e){this.z=e}get height(){return this.w}set height(e){this.w=e}set(e,t,n,r){return this.x=e,this.y=t,this.z=n,this.w=r,this}setScalar(e){return this.x=e,this.y=e,this.z=e,this.w=e,this}setX(e){return this.x=e,this}setY(e){return this.y=e,this}setZ(e){return this.z=e,this}setW(e){return this.w=e,this}setComponent(e,t){switch(e){case 0:this.x=t;break;case 1:this.y=t;break;case 2:this.z=t;break;case 3:this.w=t;break;default:throw new Error("index is out of range: "+e)}return this}getComponent(e){switch(e){case 0:return this.x;case 1:return this.y;case 2:return this.z;case 3:return this.w;default:throw new Error("index is out of range: "+e)}}clone(){return new this.constructor(this.x,this.y,this.z,this.w)}copy(e){return this.x=e.x,this.y=e.y,this.z=e.z,this.w=e.w!==void 0?e.w:1,this}add(e){return this.x+=e.x,this.y+=e.y,this.z+=e.z,this.w+=e.w,this}addScalar(e){return this.x+=e,this.y+=e,this.z+=e,this.w+=e,this}addVectors(e,t){return this.x=e.x+t.x,this.y=e.y+t.y,this.z=e.z+t.z,this.w=e.w+t.w,this}addScaledVector(e,t){return this.x+=e.x*t,this.y+=e.y*t,this.z+=e.z*t,this.w+=e.w*t,this}sub(e){return this.x-=e.x,this.y-=e.y,this.z-=e.z,this.w-=e.w,this}subScalar(e){return this.x-=e,this.y-=e,this.z-=e,this.w-=e,this}subVectors(e,t){return this.x=e.x-t.x,this.y=e.y-t.y,this.z=e.z-t.z,this.w=e.w-t.w,this}multiply(e){return this.x*=e.x,this.y*=e.y,this.z*=e.z,this.w*=e.w,this}multiplyScalar(e){return this.x*=e,this.y*=e,this.z*=e,this.w*=e,this}applyMatrix4(e){const t=this.x,n=this.y,r=this.z,s=this.w,a=e.elements;return this.x=a[0]*t+a[4]*n+a[8]*r+a[12]*s,this.y=a[1]*t+a[5]*n+a[9]*r+a[13]*s,this.z=a[2]*t+a[6]*n+a[10]*r+a[14]*s,this.w=a[3]*t+a[7]*n+a[11]*r+a[15]*s,this}divide(e){return this.x/=e.x,this.y/=e.y,this.z/=e.z,this.w/=e.w,this}divideScalar(e){return this.multiplyScalar(1/e)}setAxisAngleFromQuaternion(e){this.w=2*Math.acos(e.w);const t=Math.sqrt(1-e.w*e.w);return t<1e-4?(this.x=1,this.y=0,this.z=0):(this.x=e.x/t,this.y=e.y/t,this.z=e.z/t),this}setAxisAngleFromRotationMatrix(e){let t,n,r,s;const u=e.elements,f=u[0],c=u[4],p=u[8],m=u[1],g=u[5],S=u[9],T=u[2],_=u[6],d=u[10];if(Math.abs(c-m)<.01&&Math.abs(p-T)<.01&&Math.abs(S-_)<.01){if(Math.abs(c+m)<.1&&Math.abs(p+T)<.1&&Math.abs(S+_)<.1&&Math.abs(f+g+d-3)<.1)return this.set(1,0,0,0),this;t=Math.PI;const C=(f+1)/2,R=(g+1)/2,z=(d+1)/2,L=(c+m)/4,F=(p+T)/4,G=(S+_)/4;return C>R&&C>z?C<.01?(n=0,r=.707106781,s=.707106781):(n=Math.sqrt(C),r=L/n,s=F/n):R>z?R<.01?(n=.707106781,r=0,s=.707106781):(r=Math.sqrt(R),n=L/r,s=G/r):z<.01?(n=.707106781,r=.707106781,s=0):(s=Math.sqrt(z),n=F/s,r=G/s),this.set(n,r,s,t),this}let U=Math.sqrt((_-S)*(_-S)+(p-T)*(p-T)+(m-c)*(m-c));return Math.abs(U)<.001&&(U=1),this.x=(_-S)/U,this.y=(p-T)/U,this.z=(m-c)/U,this.w=Math.acos((f+g+d-1)/2),this}setFromMatrixPosition(e){const t=e.elements;return this.x=t[12],this.y=t[13],this.z=t[14],this.w=t[15],this}min(e){return this.x=Math.min(this.x,e.x),this.y=Math.min(this.y,e.y),this.z=Math.min(this.z,e.z),this.w=Math.min(this.w,e.w),this}max(e){return this.x=Math.max(this.x,e.x),this.y=Math.max(this.y,e.y),this.z=Math.max(this.z,e.z),this.w=Math.max(this.w,e.w),this}clamp(e,t){return this.x=Ge(this.x,e.x,t.x),this.y=Ge(this.y,e.y,t.y),this.z=Ge(this.z,e.z,t.z),this.w=Ge(this.w,e.w,t.w),this}clampScalar(e,t){return this.x=Ge(this.x,e,t),this.y=Ge(this.y,e,t),this.z=Ge(this.z,e,t),this.w=Ge(this.w,e,t),this}clampLength(e,t){const n=this.length();return this.divideScalar(n||1).multiplyScalar(Ge(n,e,t))}floor(){return this.x=Math.floor(this.x),this.y=Math.floor(this.y),this.z=Math.floor(this.z),this.w=Math.floor(this.w),this}ceil(){return this.x=Math.ceil(this.x),this.y=Math.ceil(this.y),this.z=Math.ceil(this.z),this.w=Math.ceil(this.w),this}round(){return this.x=Math.round(this.x),this.y=Math.round(this.y),this.z=Math.round(this.z),this.w=Math.round(this.w),this}roundToZero(){return this.x=Math.trunc(this.x),this.y=Math.trunc(this.y),this.z=Math.trunc(this.z),this.w=Math.trunc(this.w),this}negate(){return this.x=-this.x,this.y=-this.y,this.z=-this.z,this.w=-this.w,this}dot(e){return this.x*e.x+this.y*e.y+this.z*e.z+this.w*e.w}lengthSq(){return this.x*this.x+this.y*this.y+this.z*this.z+this.w*this.w}length(){return Math.sqrt(this.x*this.x+this.y*this.y+this.z*this.z+this.w*this.w)}manhattanLength(){return Math.abs(this.x)+Math.abs(this.y)+Math.abs(this.z)+Math.abs(this.w)}normalize(){return this.divideScalar(this.length()||1)}setLength(e){return this.normalize().multiplyScalar(e)}lerp(e,t){return this.x+=(e.x-this.x)*t,this.y+=(e.y-this.y)*t,this.z+=(e.z-this.z)*t,this.w+=(e.w-this.w)*t,this}lerpVectors(e,t,n){return this.x=e.x+(t.x-e.x)*n,this.y=e.y+(t.y-e.y)*n,this.z=e.z+(t.z-e.z)*n,this.w=e.w+(t.w-e.w)*n,this}equals(e){return e.x===this.x&&e.y===this.y&&e.z===this.z&&e.w===this.w}fromArray(e,t=0){return this.x=e[t],this.y=e[t+1],this.z=e[t+2],this.w=e[t+3],this}toArray(e=[],t=0){return e[t]=this.x,e[t+1]=this.y,e[t+2]=this.z,e[t+3]=this.w,e}fromBufferAttribute(e,t){return this.x=e.getX(t),this.y=e.getY(t),this.z=e.getZ(t),this.w=e.getW(t),this}random(){return this.x=Math.random(),this.y=Math.random(),this.z=Math.random(),this.w=Math.random(),this}*[Symbol.iterator](){yield this.x,yield this.y,yield this.z,yield this.w}}class Ta extends On{constructor(e=1,t=1,n={}){super(),this.isRenderTarget=!0,this.width=e,this.height=t,this.depth=n.depth?n.depth:1,this.scissor=new rt(0,0,e,t),this.scissorTest=!1,this.viewport=new rt(0,0,e,t);const r={width:e,height:t,depth:this.depth};n=Object.assign({generateMipmaps:!1,internalFormat:null,minFilter:1006,depthBuffer:!0,stencilBuffer:!1,resolveDepthBuffer:!0,resolveStencilBuffer:!0,depthTexture:null,samples:0,count:1,multiview:!1},n);const s=new ht(r,n.mapping,n.wrapS,n.wrapT,n.magFilter,n.minFilter,n.format,n.type,n.anisotropy,n.colorSpace);s.flipY=!1,s.generateMipmaps=n.generateMipmaps,s.internalFormat=n.internalFormat,this.textures=[];const a=n.count;for(let o=0;o<a;o++)this.textures[o]=s.clone(),this.textures[o].isRenderTargetTexture=!0,this.textures[o].renderTarget=this;this.depthBuffer=n.depthBuffer,this.stencilBuffer=n.stencilBuffer,this.resolveDepthBuffer=n.resolveDepthBuffer,this.resolveStencilBuffer=n.resolveStencilBuffer,this._depthTexture=null,this.depthTexture=n.depthTexture,this.samples=n.samples,this.multiview=n.multiview}get texture(){return this.textures[0]}set texture(e){this.textures[0]=e}set depthTexture(e){this._depthTexture!==null&&(this._depthTexture.renderTarget=null),e!==null&&(e.renderTarget=this),this._depthTexture=e}get depthTexture(){return this._depthTexture}setSize(e,t,n=1){if(this.width!==e||this.height!==t||this.depth!==n){this.width=e,this.height=t,this.depth=n;for(let r=0,s=this.textures.length;r<s;r++)this.textures[r].image.width=e,this.textures[r].image.height=t,this.textures[r].image.depth=n;this.dispose()}this.viewport.set(0,0,e,t),this.scissor.set(0,0,e,t)}clone(){return new this.constructor().copy(this)}copy(e){this.width=e.width,this.height=e.height,this.depth=e.depth,this.scissor.copy(e.scissor),this.scissorTest=e.scissorTest,this.viewport.copy(e.viewport),this.textures.length=0;for(let t=0,n=e.textures.length;t<n;t++){this.textures[t]=e.textures[t].clone(),this.textures[t].isRenderTargetTexture=!0,this.textures[t].renderTarget=this;const r=Object.assign({},e.textures[t].image);this.textures[t].source=new mr(r)}return this.depthBuffer=e.depthBuffer,this.stencilBuffer=e.stencilBuffer,this.resolveDepthBuffer=e.resolveDepthBuffer,this.resolveStencilBuffer=e.resolveStencilBuffer,e.depthTexture!==null&&(this.depthTexture=e.depthTexture.clone()),this.samples=e.samples,this}dispose(){this.dispatchEvent({type:"dispose"})}}class mn extends Ta{constructor(e=1,t=1,n={}){super(e,t,n),this.isWebGLRenderTarget=!0}}class Cs extends ht{constructor(e=null,t=1,n=1,r=1){super(null),this.isDataArrayTexture=!0,this.image={data:e,width:t,height:n,depth:r},this.magFilter=1003,this.minFilter=1003,this.wrapR=1001,this.generateMipmaps=!1,this.flipY=!1,this.unpackAlignment=1,this.layerUpdates=new Set}addLayerUpdate(e){this.layerUpdates.add(e)}clearLayerUpdates(){this.layerUpdates.clear()}}class Aa extends ht{constructor(e=null,t=1,n=1,r=1){super(null),this.isData3DTexture=!0,this.image={data:e,width:t,height:n,depth:r},this.magFilter=1003,this.minFilter=1003,this.wrapR=1001,this.generateMipmaps=!1,this.flipY=!1,this.unpackAlignment=1}}class ei{constructor(e=0,t=0,n=0,r=1){this.isQuaternion=!0,this._x=e,this._y=t,this._z=n,this._w=r}static slerpFlat(e,t,n,r,s,a,o){let u=n[r+0],f=n[r+1],c=n[r+2],p=n[r+3];const m=s[a+0],g=s[a+1],S=s[a+2],T=s[a+3];if(o===0){e[t+0]=u,e[t+1]=f,e[t+2]=c,e[t+3]=p;return}if(o===1){e[t+0]=m,e[t+1]=g,e[t+2]=S,e[t+3]=T;return}if(p!==T||u!==m||f!==g||c!==S){let _=1-o;const d=u*m+f*g+c*S+p*T,U=d>=0?1:-1,C=1-d*d;if(C>Number.EPSILON){const z=Math.sqrt(C),L=Math.atan2(z,d*U);_=Math.sin(_*L)/z,o=Math.sin(o*L)/z}const R=o*U;if(u=u*_+m*R,f=f*_+g*R,c=c*_+S*R,p=p*_+T*R,_===1-o){const z=1/Math.sqrt(u*u+f*f+c*c+p*p);u*=z,f*=z,c*=z,p*=z}}e[t]=u,e[t+1]=f,e[t+2]=c,e[t+3]=p}static multiplyQuaternionsFlat(e,t,n,r,s,a){const o=n[r],u=n[r+1],f=n[r+2],c=n[r+3],p=s[a],m=s[a+1],g=s[a+2],S=s[a+3];return e[t]=o*S+c*p+u*g-f*m,e[t+1]=u*S+c*m+f*p-o*g,e[t+2]=f*S+c*g+o*m-u*p,e[t+3]=c*S-o*p-u*m-f*g,e}get x(){return this._x}set x(e){this._x=e,this._onChangeCallback()}get y(){return this._y}set y(e){this._y=e,this._onChangeCallback()}get z(){return this._z}set z(e){this._z=e,this._onChangeCallback()}get w(){return this._w}set w(e){this._w=e,this._onChangeCallback()}set(e,t,n,r){return this._x=e,this._y=t,this._z=n,this._w=r,this._onChangeCallback(),this}clone(){return new this.constructor(this._x,this._y,this._z,this._w)}copy(e){return this._x=e.x,this._y=e.y,this._z=e.z,this._w=e.w,this._onChangeCallback(),this}setFromEuler(e,t=!0){const n=e._x,r=e._y,s=e._z,a=e._order,o=Math.cos,u=Math.sin,f=o(n/2),c=o(r/2),p=o(s/2),m=u(n/2),g=u(r/2),S=u(s/2);switch(a){case"XYZ":this._x=m*c*p+f*g*S,this._y=f*g*p-m*c*S,this._z=f*c*S+m*g*p,this._w=f*c*p-m*g*S;break;case"YXZ":this._x=m*c*p+f*g*S,this._y=f*g*p-m*c*S,this._z=f*c*S-m*g*p,this._w=f*c*p+m*g*S;break;case"ZXY":this._x=m*c*p-f*g*S,this._y=f*g*p+m*c*S,this._z=f*c*S+m*g*p,this._w=f*c*p-m*g*S;break;case"ZYX":this._x=m*c*p-f*g*S,this._y=f*g*p+m*c*S,this._z=f*c*S-m*g*p,this._w=f*c*p+m*g*S;break;case"YZX":this._x=m*c*p+f*g*S,this._y=f*g*p+m*c*S,this._z=f*c*S-m*g*p,this._w=f*c*p-m*g*S;break;case"XZY":this._x=m*c*p-f*g*S,this._y=f*g*p-m*c*S,this._z=f*c*S+m*g*p,this._w=f*c*p+m*g*S;break;default:console.warn("THREE.Quaternion: .setFromEuler() encountered an unknown order: "+a)}return t===!0&&this._onChangeCallback(),this}setFromAxisAngle(e,t){const n=t/2,r=Math.sin(n);return this._x=e.x*r,this._y=e.y*r,this._z=e.z*r,this._w=Math.cos(n),this._onChangeCallback(),this}setFromRotationMatrix(e){const t=e.elements,n=t[0],r=t[4],s=t[8],a=t[1],o=t[5],u=t[9],f=t[2],c=t[6],p=t[10],m=n+o+p;if(m>0){const g=.5/Math.sqrt(m+1);this._w=.25/g,this._x=(c-u)*g,this._y=(s-f)*g,this._z=(a-r)*g}else if(n>o&&n>p){const g=2*Math.sqrt(1+n-o-p);this._w=(c-u)/g,this._x=.25*g,this._y=(r+a)/g,this._z=(s+f)/g}else if(o>p){const g=2*Math.sqrt(1+o-n-p);this._w=(s-f)/g,this._x=(r+a)/g,this._y=.25*g,this._z=(u+c)/g}else{const g=2*Math.sqrt(1+p-n-o);this._w=(a-r)/g,this._x=(s+f)/g,this._y=(u+c)/g,this._z=.25*g}return this._onChangeCallback(),this}setFromUnitVectors(e,t){let n=e.dot(t)+1;return n<Number.EPSILON?(n=0,Math.abs(e.x)>Math.abs(e.z)?(this._x=-e.y,this._y=e.x,this._z=0,this._w=n):(this._x=0,this._y=-e.z,this._z=e.y,this._w=n)):(this._x=e.y*t.z-e.z*t.y,this._y=e.z*t.x-e.x*t.z,this._z=e.x*t.y-e.y*t.x,this._w=n),this.normalize()}angleTo(e){return 2*Math.acos(Math.abs(Ge(this.dot(e),-1,1)))}rotateTowards(e,t){const n=this.angleTo(e);if(n===0)return this;const r=Math.min(1,t/n);return this.slerp(e,r),this}identity(){return this.set(0,0,0,1)}invert(){return this.conjugate()}conjugate(){return this._x*=-1,this._y*=-1,this._z*=-1,this._onChangeCallback(),this}dot(e){return this._x*e._x+this._y*e._y+this._z*e._z+this._w*e._w}lengthSq(){return this._x*this._x+this._y*this._y+this._z*this._z+this._w*this._w}length(){return Math.sqrt(this._x*this._x+this._y*this._y+this._z*this._z+this._w*this._w)}normalize(){let e=this.length();return e===0?(this._x=0,this._y=0,this._z=0,this._w=1):(e=1/e,this._x=this._x*e,this._y=this._y*e,this._z=this._z*e,this._w=this._w*e),this._onChangeCallback(),this}multiply(e){return this.multiplyQuaternions(this,e)}premultiply(e){return this.multiplyQuaternions(e,this)}multiplyQuaternions(e,t){const n=e._x,r=e._y,s=e._z,a=e._w,o=t._x,u=t._y,f=t._z,c=t._w;return this._x=n*c+a*o+r*f-s*u,this._y=r*c+a*u+s*o-n*f,this._z=s*c+a*f+n*u-r*o,this._w=a*c-n*o-r*u-s*f,this._onChangeCallback(),this}slerp(e,t){if(t===0)return this;if(t===1)return this.copy(e);const n=this._x,r=this._y,s=this._z,a=this._w;let o=a*e._w+n*e._x+r*e._y+s*e._z;if(o<0?(this._w=-e._w,this._x=-e._x,this._y=-e._y,this._z=-e._z,o=-o):this.copy(e),o>=1)return this._w=a,this._x=n,this._y=r,this._z=s,this;const u=1-o*o;if(u<=Number.EPSILON){const g=1-t;return this._w=g*a+t*this._w,this._x=g*n+t*this._x,this._y=g*r+t*this._y,this._z=g*s+t*this._z,this.normalize(),this}const f=Math.sqrt(u),c=Math.atan2(f,o),p=Math.sin((1-t)*c)/f,m=Math.sin(t*c)/f;return this._w=a*p+this._w*m,this._x=n*p+this._x*m,this._y=r*p+this._y*m,this._z=s*p+this._z*m,this._onChangeCallback(),this}slerpQuaternions(e,t,n){return this.copy(e).slerp(t,n)}random(){const e=2*Math.PI*Math.random(),t=2*Math.PI*Math.random(),n=Math.random(),r=Math.sqrt(1-n),s=Math.sqrt(n);return this.set(r*Math.sin(e),r*Math.cos(e),s*Math.sin(t),s*Math.cos(t))}equals(e){return e._x===this._x&&e._y===this._y&&e._z===this._z&&e._w===this._w}fromArray(e,t=0){return this._x=e[t],this._y=e[t+1],this._z=e[t+2],this._w=e[t+3],this._onChangeCallback(),this}toArray(e=[],t=0){return e[t]=this._x,e[t+1]=this._y,e[t+2]=this._z,e[t+3]=this._w,e}fromBufferAttribute(e,t){return this._x=e.getX(t),this._y=e.getY(t),this._z=e.getZ(t),this._w=e.getW(t),this._onChangeCallback(),this}toJSON(){return this.toArray()}_onChange(e){return this._onChangeCallback=e,this}_onChangeCallback(){}*[Symbol.iterator](){yield this._x,yield this._y,yield this._z,yield this._w}}class q{constructor(e=0,t=0,n=0){q.prototype.isVector3=!0,this.x=e,this.y=t,this.z=n}set(e,t,n){return n===void 0&&(n=this.z),this.x=e,this.y=t,this.z=n,this}setScalar(e){return this.x=e,this.y=e,this.z=e,this}setX(e){return this.x=e,this}setY(e){return this.y=e,this}setZ(e){return this.z=e,this}setComponent(e,t){switch(e){case 0:this.x=t;break;case 1:this.y=t;break;case 2:this.z=t;break;default:throw new Error("index is out of range: "+e)}return this}getComponent(e){switch(e){case 0:return this.x;case 1:return this.y;case 2:return this.z;default:throw new Error("index is out of range: "+e)}}clone(){return new this.constructor(this.x,this.y,this.z)}copy(e){return this.x=e.x,this.y=e.y,this.z=e.z,this}add(e){return this.x+=e.x,this.y+=e.y,this.z+=e.z,this}addScalar(e){return this.x+=e,this.y+=e,this.z+=e,this}addVectors(e,t){return this.x=e.x+t.x,this.y=e.y+t.y,this.z=e.z+t.z,this}addScaledVector(e,t){return this.x+=e.x*t,this.y+=e.y*t,this.z+=e.z*t,this}sub(e){return this.x-=e.x,this.y-=e.y,this.z-=e.z,this}subScalar(e){return this.x-=e,this.y-=e,this.z-=e,this}subVectors(e,t){return this.x=e.x-t.x,this.y=e.y-t.y,this.z=e.z-t.z,this}multiply(e){return this.x*=e.x,this.y*=e.y,this.z*=e.z,this}multiplyScalar(e){return this.x*=e,this.y*=e,this.z*=e,this}multiplyVectors(e,t){return this.x=e.x*t.x,this.y=e.y*t.y,this.z=e.z*t.z,this}applyEuler(e){return this.applyQuaternion(Ur.setFromEuler(e))}applyAxisAngle(e,t){return this.applyQuaternion(Ur.setFromAxisAngle(e,t))}applyMatrix3(e){const t=this.x,n=this.y,r=this.z,s=e.elements;return this.x=s[0]*t+s[3]*n+s[6]*r,this.y=s[1]*t+s[4]*n+s[7]*r,this.z=s[2]*t+s[5]*n+s[8]*r,this}applyNormalMatrix(e){return this.applyMatrix3(e).normalize()}applyMatrix4(e){const t=this.x,n=this.y,r=this.z,s=e.elements,a=1/(s[3]*t+s[7]*n+s[11]*r+s[15]);return this.x=(s[0]*t+s[4]*n+s[8]*r+s[12])*a,this.y=(s[1]*t+s[5]*n+s[9]*r+s[13])*a,this.z=(s[2]*t+s[6]*n+s[10]*r+s[14])*a,this}applyQuaternion(e){const t=this.x,n=this.y,r=this.z,s=e.x,a=e.y,o=e.z,u=e.w,f=2*(a*r-o*n),c=2*(o*t-s*r),p=2*(s*n-a*t);return this.x=t+u*f+a*p-o*c,this.y=n+u*c+o*f-s*p,this.z=r+u*p+s*c-a*f,this}project(e){return this.applyMatrix4(e.matrixWorldInverse).applyMatrix4(e.projectionMatrix)}unproject(e){return this.applyMatrix4(e.projectionMatrixInverse).applyMatrix4(e.matrixWorld)}transformDirection(e){const t=this.x,n=this.y,r=this.z,s=e.elements;return this.x=s[0]*t+s[4]*n+s[8]*r,this.y=s[1]*t+s[5]*n+s[9]*r,this.z=s[2]*t+s[6]*n+s[10]*r,this.normalize()}divide(e){return this.x/=e.x,this.y/=e.y,this.z/=e.z,this}divideScalar(e){return this.multiplyScalar(1/e)}min(e){return this.x=Math.min(this.x,e.x),this.y=Math.min(this.y,e.y),this.z=Math.min(this.z,e.z),this}max(e){return this.x=Math.max(this.x,e.x),this.y=Math.max(this.y,e.y),this.z=Math.max(this.z,e.z),this}clamp(e,t){return this.x=Ge(this.x,e.x,t.x),this.y=Ge(this.y,e.y,t.y),this.z=Ge(this.z,e.z,t.z),this}clampScalar(e,t){return this.x=Ge(this.x,e,t),this.y=Ge(this.y,e,t),this.z=Ge(this.z,e,t),this}clampLength(e,t){const n=this.length();return this.divideScalar(n||1).multiplyScalar(Ge(n,e,t))}floor(){return this.x=Math.floor(this.x),this.y=Math.floor(this.y),this.z=Math.floor(this.z),this}ceil(){return this.x=Math.ceil(this.x),this.y=Math.ceil(this.y),this.z=Math.ceil(this.z),this}round(){return this.x=Math.round(this.x),this.y=Math.round(this.y),this.z=Math.round(this.z),this}roundToZero(){return this.x=Math.trunc(this.x),this.y=Math.trunc(this.y),this.z=Math.trunc(this.z),this}negate(){return this.x=-this.x,this.y=-this.y,this.z=-this.z,this}dot(e){return this.x*e.x+this.y*e.y+this.z*e.z}lengthSq(){return this.x*this.x+this.y*this.y+this.z*this.z}length(){return Math.sqrt(this.x*this.x+this.y*this.y+this.z*this.z)}manhattanLength(){return Math.abs(this.x)+Math.abs(this.y)+Math.abs(this.z)}normalize(){return this.divideScalar(this.length()||1)}setLength(e){return this.normalize().multiplyScalar(e)}lerp(e,t){return this.x+=(e.x-this.x)*t,this.y+=(e.y-this.y)*t,this.z+=(e.z-this.z)*t,this}lerpVectors(e,t,n){return this.x=e.x+(t.x-e.x)*n,this.y=e.y+(t.y-e.y)*n,this.z=e.z+(t.z-e.z)*n,this}cross(e){return this.crossVectors(this,e)}crossVectors(e,t){const n=e.x,r=e.y,s=e.z,a=t.x,o=t.y,u=t.z;return this.x=r*u-s*o,this.y=s*a-n*u,this.z=n*o-r*a,this}projectOnVector(e){const t=e.lengthSq();if(t===0)return this.set(0,0,0);const n=e.dot(this)/t;return this.copy(e).multiplyScalar(n)}projectOnPlane(e){return Gi.copy(this).projectOnVector(e),this.sub(Gi)}reflect(e){return this.sub(Gi.copy(e).multiplyScalar(2*this.dot(e)))}angleTo(e){const t=Math.sqrt(this.lengthSq()*e.lengthSq());if(t===0)return Math.PI/2;const n=this.dot(e)/t;return Math.acos(Ge(n,-1,1))}distanceTo(e){return Math.sqrt(this.distanceToSquared(e))}distanceToSquared(e){const t=this.x-e.x,n=this.y-e.y,r=this.z-e.z;return t*t+n*n+r*r}manhattanDistanceTo(e){return Math.abs(this.x-e.x)+Math.abs(this.y-e.y)+Math.abs(this.z-e.z)}setFromSpherical(e){return this.setFromSphericalCoords(e.radius,e.phi,e.theta)}setFromSphericalCoords(e,t,n){const r=Math.sin(t)*e;return this.x=r*Math.sin(n),this.y=Math.cos(t)*e,this.z=r*Math.cos(n),this}setFromCylindrical(e){return this.setFromCylindricalCoords(e.radius,e.theta,e.y)}setFromCylindricalCoords(e,t,n){return this.x=e*Math.sin(t),this.y=n,this.z=e*Math.cos(t),this}setFromMatrixPosition(e){const t=e.elements;return this.x=t[12],this.y=t[13],this.z=t[14],this}setFromMatrixScale(e){const t=this.setFromMatrixColumn(e,0).length(),n=this.setFromMatrixColumn(e,1).length(),r=this.setFromMatrixColumn(e,2).length();return this.x=t,this.y=n,this.z=r,this}setFromMatrixColumn(e,t){return this.fromArray(e.elements,t*4)}setFromMatrix3Column(e,t){return this.fromArray(e.elements,t*3)}setFromEuler(e){return this.x=e._x,this.y=e._y,this.z=e._z,this}setFromColor(e){return this.x=e.r,this.y=e.g,this.z=e.b,this}equals(e){return e.x===this.x&&e.y===this.y&&e.z===this.z}fromArray(e,t=0){return this.x=e[t],this.y=e[t+1],this.z=e[t+2],this}toArray(e=[],t=0){return e[t]=this.x,e[t+1]=this.y,e[t+2]=this.z,e}fromBufferAttribute(e,t){return this.x=e.getX(t),this.y=e.getY(t),this.z=e.getZ(t),this}random(){return this.x=Math.random(),this.y=Math.random(),this.z=Math.random(),this}randomDirection(){const e=Math.random()*Math.PI*2,t=Math.random()*2-1,n=Math.sqrt(1-t*t);return this.x=n*Math.cos(e),this.y=t,this.z=n*Math.sin(e),this}*[Symbol.iterator](){yield this.x,yield this.y,yield this.z}}const Gi=new q,Ur=new ei;class _n{constructor(e=new q(1/0,1/0,1/0),t=new q(-1/0,-1/0,-1/0)){this.isBox3=!0,this.min=e,this.max=t}set(e,t){return this.min.copy(e),this.max.copy(t),this}setFromArray(e){this.makeEmpty();for(let t=0,n=e.length;t<n;t+=3)this.expandByPoint(Dt.fromArray(e,t));return this}setFromBufferAttribute(e){this.makeEmpty();for(let t=0,n=e.count;t<n;t++)this.expandByPoint(Dt.fromBufferAttribute(e,t));return this}setFromPoints(e){this.makeEmpty();for(let t=0,n=e.length;t<n;t++)this.expandByPoint(e[t]);return this}setFromCenterAndSize(e,t){const n=Dt.copy(t).multiplyScalar(.5);return this.min.copy(e).sub(n),this.max.copy(e).add(n),this}setFromObject(e,t=!1){return this.makeEmpty(),this.expandByObject(e,t)}clone(){return new this.constructor().copy(this)}copy(e){return this.min.copy(e.min),this.max.copy(e.max),this}makeEmpty(){return this.min.x=this.min.y=this.min.z=1/0,this.max.x=this.max.y=this.max.z=-1/0,this}isEmpty(){return this.max.x<this.min.x||this.max.y<this.min.y||this.max.z<this.min.z}getCenter(e){return this.isEmpty()?e.set(0,0,0):e.addVectors(this.min,this.max).multiplyScalar(.5)}getSize(e){return this.isEmpty()?e.set(0,0,0):e.subVectors(this.max,this.min)}expandByPoint(e){return this.min.min(e),this.max.max(e),this}expandByVector(e){return this.min.sub(e),this.max.add(e),this}expandByScalar(e){return this.min.addScalar(-e),this.max.addScalar(e),this}expandByObject(e,t=!1){e.updateWorldMatrix(!1,!1);const n=e.geometry;if(n!==void 0){const s=n.getAttribute("position");if(t===!0&&s!==void 0&&e.isInstancedMesh!==!0)for(let a=0,o=s.count;a<o;a++)e.isMesh===!0?e.getVertexPosition(a,Dt):Dt.fromBufferAttribute(s,a),Dt.applyMatrix4(e.matrixWorld),this.expandByPoint(Dt);else e.boundingBox!==void 0?(e.boundingBox===null&&e.computeBoundingBox(),si.copy(e.boundingBox)):(n.boundingBox===null&&n.computeBoundingBox(),si.copy(n.boundingBox)),si.applyMatrix4(e.matrixWorld),this.union(si)}const r=e.children;for(let s=0,a=r.length;s<a;s++)this.expandByObject(r[s],t);return this}containsPoint(e){return e.x>=this.min.x&&e.x<=this.max.x&&e.y>=this.min.y&&e.y<=this.max.y&&e.z>=this.min.z&&e.z<=this.max.z}containsBox(e){return this.min.x<=e.min.x&&e.max.x<=this.max.x&&this.min.y<=e.min.y&&e.max.y<=this.max.y&&this.min.z<=e.min.z&&e.max.z<=this.max.z}getParameter(e,t){return t.set((e.x-this.min.x)/(this.max.x-this.min.x),(e.y-this.min.y)/(this.max.y-this.min.y),(e.z-this.min.z)/(this.max.z-this.min.z))}intersectsBox(e){return e.max.x>=this.min.x&&e.min.x<=this.max.x&&e.max.y>=this.min.y&&e.min.y<=this.max.y&&e.max.z>=this.min.z&&e.min.z<=this.max.z}intersectsSphere(e){return this.clampPoint(e.center,Dt),Dt.distanceToSquared(e.center)<=e.radius*e.radius}intersectsPlane(e){let t,n;return e.normal.x>0?(t=e.normal.x*this.min.x,n=e.normal.x*this.max.x):(t=e.normal.x*this.max.x,n=e.normal.x*this.min.x),e.normal.y>0?(t+=e.normal.y*this.min.y,n+=e.normal.y*this.max.y):(t+=e.normal.y*this.max.y,n+=e.normal.y*this.min.y),e.normal.z>0?(t+=e.normal.z*this.min.z,n+=e.normal.z*this.max.z):(t+=e.normal.z*this.max.z,n+=e.normal.z*this.min.z),t<=-e.constant&&n>=-e.constant}intersectsTriangle(e){if(this.isEmpty())return!1;this.getCenter(kn),ai.subVectors(this.max,kn),vn.subVectors(e.a,kn),Sn.subVectors(e.b,kn),Mn.subVectors(e.c,kn),Zt.subVectors(Sn,vn),jt.subVectors(Mn,Sn),an.subVectors(vn,Mn);let t=[0,-Zt.z,Zt.y,0,-jt.z,jt.y,0,-an.z,an.y,Zt.z,0,-Zt.x,jt.z,0,-jt.x,an.z,0,-an.x,-Zt.y,Zt.x,0,-jt.y,jt.x,0,-an.y,an.x,0];return!zi(t,vn,Sn,Mn,ai)||(t=[1,0,0,0,1,0,0,0,1],!zi(t,vn,Sn,Mn,ai))?!1:(oi.crossVectors(Zt,jt),t=[oi.x,oi.y,oi.z],zi(t,vn,Sn,Mn,ai))}clampPoint(e,t){return t.copy(e).clamp(this.min,this.max)}distanceToPoint(e){return this.clampPoint(e,Dt).distanceTo(e)}getBoundingSphere(e){return this.isEmpty()?e.makeEmpty():(this.getCenter(e.center),e.radius=this.getSize(Dt).length()*.5),e}intersect(e){return this.min.max(e.min),this.max.min(e.max),this.isEmpty()&&this.makeEmpty(),this}union(e){return this.min.min(e.min),this.max.max(e.max),this}applyMatrix4(e){return this.isEmpty()?this:(Vt[0].set(this.min.x,this.min.y,this.min.z).applyMatrix4(e),Vt[1].set(this.min.x,this.min.y,this.max.z).applyMatrix4(e),Vt[2].set(this.min.x,this.max.y,this.min.z).applyMatrix4(e),Vt[3].set(this.min.x,this.max.y,this.max.z).applyMatrix4(e),Vt[4].set(this.max.x,this.min.y,this.min.z).applyMatrix4(e),Vt[5].set(this.max.x,this.min.y,this.max.z).applyMatrix4(e),Vt[6].set(this.max.x,this.max.y,this.min.z).applyMatrix4(e),Vt[7].set(this.max.x,this.max.y,this.max.z).applyMatrix4(e),this.setFromPoints(Vt),this)}translate(e){return this.min.add(e),this.max.add(e),this}equals(e){return e.min.equals(this.min)&&e.max.equals(this.max)}}const Vt=[new q,new q,new q,new q,new q,new q,new q,new q],Dt=new q,si=new _n,vn=new q,Sn=new q,Mn=new q,Zt=new q,jt=new q,an=new q,kn=new q,ai=new q,oi=new q,on=new q;function zi(i,e,t,n,r){for(let s=0,a=i.length-3;s<=a;s+=3){on.fromArray(i,s);const o=r.x*Math.abs(on.x)+r.y*Math.abs(on.y)+r.z*Math.abs(on.z),u=e.dot(on),f=t.dot(on),c=n.dot(on);if(Math.max(-Math.max(u,f,c),Math.min(u,f,c))>o)return!1}return!0}const ba=new _n,Wn=new q,Vi=new q;class zn{constructor(e=new q,t=-1){this.isSphere=!0,this.center=e,this.radius=t}set(e,t){return this.center.copy(e),this.radius=t,this}setFromPoints(e,t){const n=this.center;t!==void 0?n.copy(t):ba.setFromPoints(e).getCenter(n);let r=0;for(let s=0,a=e.length;s<a;s++)r=Math.max(r,n.distanceToSquared(e[s]));return this.radius=Math.sqrt(r),this}copy(e){return this.center.copy(e.center),this.radius=e.radius,this}isEmpty(){return this.radius<0}makeEmpty(){return this.center.set(0,0,0),this.radius=-1,this}containsPoint(e){return e.distanceToSquared(this.center)<=this.radius*this.radius}distanceToPoint(e){return e.distanceTo(this.center)-this.radius}intersectsSphere(e){const t=this.radius+e.radius;return e.center.distanceToSquared(this.center)<=t*t}intersectsBox(e){return e.intersectsSphere(this)}intersectsPlane(e){return Math.abs(e.distanceToPoint(this.center))<=this.radius}clampPoint(e,t){const n=this.center.distanceToSquared(e);return t.copy(e),n>this.radius*this.radius&&(t.sub(this.center).normalize(),t.multiplyScalar(this.radius).add(this.center)),t}getBoundingBox(e){return this.isEmpty()?(e.makeEmpty(),e):(e.set(this.center,this.center),e.expandByScalar(this.radius),e)}applyMatrix4(e){return this.center.applyMatrix4(e),this.radius=this.radius*e.getMaxScaleOnAxis(),this}translate(e){return this.center.add(e),this}expandByPoint(e){if(this.isEmpty())return this.center.copy(e),this.radius=0,this;Wn.subVectors(e,this.center);const t=Wn.lengthSq();if(t>this.radius*this.radius){const n=Math.sqrt(t),r=(n-this.radius)*.5;this.center.addScaledVector(Wn,r/n),this.radius+=r}return this}union(e){return e.isEmpty()?this:this.isEmpty()?(this.copy(e),this):(this.center.equals(e.center)===!0?this.radius=Math.max(this.radius,e.radius):(Vi.subVectors(e.center,this.center).setLength(e.radius),this.expandByPoint(Wn.copy(e.center).add(Vi)),this.expandByPoint(Wn.copy(e.center).sub(Vi))),this)}equals(e){return e.center.equals(this.center)&&e.radius===this.radius}clone(){return new this.constructor().copy(this)}}const Ht=new q,Hi=new q,li=new q,Jt=new q,ki=new q,ci=new q,Wi=new q;class _r{constructor(e=new q,t=new q(0,0,-1)){this.origin=e,this.direction=t}set(e,t){return this.origin.copy(e),this.direction.copy(t),this}copy(e){return this.origin.copy(e.origin),this.direction.copy(e.direction),this}at(e,t){return t.copy(this.origin).addScaledVector(this.direction,e)}lookAt(e){return this.direction.copy(e).sub(this.origin).normalize(),this}recast(e){return this.origin.copy(this.at(e,Ht)),this}closestPointToPoint(e,t){t.subVectors(e,this.origin);const n=t.dot(this.direction);return n<0?t.copy(this.origin):t.copy(this.origin).addScaledVector(this.direction,n)}distanceToPoint(e){return Math.sqrt(this.distanceSqToPoint(e))}distanceSqToPoint(e){const t=Ht.subVectors(e,this.origin).dot(this.direction);return t<0?this.origin.distanceToSquared(e):(Ht.copy(this.origin).addScaledVector(this.direction,t),Ht.distanceToSquared(e))}distanceSqToSegment(e,t,n,r){Hi.copy(e).add(t).multiplyScalar(.5),li.copy(t).sub(e).normalize(),Jt.copy(this.origin).sub(Hi);const s=e.distanceTo(t)*.5,a=-this.direction.dot(li),o=Jt.dot(this.direction),u=-Jt.dot(li),f=Jt.lengthSq(),c=Math.abs(1-a*a);let p,m,g,S;if(c>0)if(p=a*u-o,m=a*o-u,S=s*c,p>=0)if(m>=-S)if(m<=S){const T=1/c;p*=T,m*=T,g=p*(p+a*m+2*o)+m*(a*p+m+2*u)+f}else m=s,p=Math.max(0,-(a*m+o)),g=-p*p+m*(m+2*u)+f;else m=-s,p=Math.max(0,-(a*m+o)),g=-p*p+m*(m+2*u)+f;else m<=-S?(p=Math.max(0,-(-a*s+o)),m=p>0?-s:Math.min(Math.max(-s,-u),s),g=-p*p+m*(m+2*u)+f):m<=S?(p=0,m=Math.min(Math.max(-s,-u),s),g=m*(m+2*u)+f):(p=Math.max(0,-(a*s+o)),m=p>0?s:Math.min(Math.max(-s,-u),s),g=-p*p+m*(m+2*u)+f);else m=a>0?-s:s,p=Math.max(0,-(a*m+o)),g=-p*p+m*(m+2*u)+f;return n&&n.copy(this.origin).addScaledVector(this.direction,p),r&&r.copy(Hi).addScaledVector(li,m),g}intersectSphere(e,t){Ht.subVectors(e.center,this.origin);const n=Ht.dot(this.direction),r=Ht.dot(Ht)-n*n,s=e.radius*e.radius;if(r>s)return null;const a=Math.sqrt(s-r),o=n-a,u=n+a;return u<0?null:o<0?this.at(u,t):this.at(o,t)}intersectsSphere(e){return this.distanceSqToPoint(e.center)<=e.radius*e.radius}distanceToPlane(e){const t=e.normal.dot(this.direction);if(t===0)return e.distanceToPoint(this.origin)===0?0:null;const n=-(this.origin.dot(e.normal)+e.constant)/t;return n>=0?n:null}intersectPlane(e,t){const n=this.distanceToPlane(e);return n===null?null:this.at(n,t)}intersectsPlane(e){const t=e.distanceToPoint(this.origin);return t===0||e.normal.dot(this.direction)*t<0}intersectBox(e,t){let n,r,s,a,o,u;const f=1/this.direction.x,c=1/this.direction.y,p=1/this.direction.z,m=this.origin;return f>=0?(n=(e.min.x-m.x)*f,r=(e.max.x-m.x)*f):(n=(e.max.x-m.x)*f,r=(e.min.x-m.x)*f),c>=0?(s=(e.min.y-m.y)*c,a=(e.max.y-m.y)*c):(s=(e.max.y-m.y)*c,a=(e.min.y-m.y)*c),n>a||s>r||((s>n||isNaN(n))&&(n=s),(a<r||isNaN(r))&&(r=a),p>=0?(o=(e.min.z-m.z)*p,u=(e.max.z-m.z)*p):(o=(e.max.z-m.z)*p,u=(e.min.z-m.z)*p),n>u||o>r)||((o>n||n!==n)&&(n=o),(u<r||r!==r)&&(r=u),r<0)?null:this.at(n>=0?n:r,t)}intersectsBox(e){return this.intersectBox(e,Ht)!==null}intersectTriangle(e,t,n,r,s){ki.subVectors(t,e),ci.subVectors(n,e),Wi.crossVectors(ki,ci);let a=this.direction.dot(Wi),o;if(a>0){if(r)return null;o=1}else if(a<0)o=-1,a=-a;else return null;Jt.subVectors(this.origin,e);const u=o*this.direction.dot(ci.crossVectors(Jt,ci));if(u<0)return null;const f=o*this.direction.dot(ki.cross(Jt));if(f<0||u+f>a)return null;const c=-o*Jt.dot(Wi);return c<0?null:this.at(c/a,s)}applyMatrix4(e){return this.origin.applyMatrix4(e),this.direction.transformDirection(e),this}equals(e){return e.origin.equals(this.origin)&&e.direction.equals(this.direction)}clone(){return new this.constructor().copy(this)}}class et{constructor(e,t,n,r,s,a,o,u,f,c,p,m,g,S,T,_){et.prototype.isMatrix4=!0,this.elements=[1,0,0,0,0,1,0,0,0,0,1,0,0,0,0,1],e!==void 0&&this.set(e,t,n,r,s,a,o,u,f,c,p,m,g,S,T,_)}set(e,t,n,r,s,a,o,u,f,c,p,m,g,S,T,_){const d=this.elements;return d[0]=e,d[4]=t,d[8]=n,d[12]=r,d[1]=s,d[5]=a,d[9]=o,d[13]=u,d[2]=f,d[6]=c,d[10]=p,d[14]=m,d[3]=g,d[7]=S,d[11]=T,d[15]=_,this}identity(){return this.set(1,0,0,0,0,1,0,0,0,0,1,0,0,0,0,1),this}clone(){return new et().fromArray(this.elements)}copy(e){const t=this.elements,n=e.elements;return t[0]=n[0],t[1]=n[1],t[2]=n[2],t[3]=n[3],t[4]=n[4],t[5]=n[5],t[6]=n[6],t[7]=n[7],t[8]=n[8],t[9]=n[9],t[10]=n[10],t[11]=n[11],t[12]=n[12],t[13]=n[13],t[14]=n[14],t[15]=n[15],this}copyPosition(e){const t=this.elements,n=e.elements;return t[12]=n[12],t[13]=n[13],t[14]=n[14],this}setFromMatrix3(e){const t=e.elements;return this.set(t[0],t[3],t[6],0,t[1],t[4],t[7],0,t[2],t[5],t[8],0,0,0,0,1),this}extractBasis(e,t,n){return e.setFromMatrixColumn(this,0),t.setFromMatrixColumn(this,1),n.setFromMatrixColumn(this,2),this}makeBasis(e,t,n){return this.set(e.x,t.x,n.x,0,e.y,t.y,n.y,0,e.z,t.z,n.z,0,0,0,0,1),this}extractRotation(e){const t=this.elements,n=e.elements,r=1/En.setFromMatrixColumn(e,0).length(),s=1/En.setFromMatrixColumn(e,1).length(),a=1/En.setFromMatrixColumn(e,2).length();return t[0]=n[0]*r,t[1]=n[1]*r,t[2]=n[2]*r,t[3]=0,t[4]=n[4]*s,t[5]=n[5]*s,t[6]=n[6]*s,t[7]=0,t[8]=n[8]*a,t[9]=n[9]*a,t[10]=n[10]*a,t[11]=0,t[12]=0,t[13]=0,t[14]=0,t[15]=1,this}makeRotationFromEuler(e){const t=this.elements,n=e.x,r=e.y,s=e.z,a=Math.cos(n),o=Math.sin(n),u=Math.cos(r),f=Math.sin(r),c=Math.cos(s),p=Math.sin(s);if(e.order==="XYZ"){const m=a*c,g=a*p,S=o*c,T=o*p;t[0]=u*c,t[4]=-u*p,t[8]=f,t[1]=g+S*f,t[5]=m-T*f,t[9]=-o*u,t[2]=T-m*f,t[6]=S+g*f,t[10]=a*u}else if(e.order==="YXZ"){const m=u*c,g=u*p,S=f*c,T=f*p;t[0]=m+T*o,t[4]=S*o-g,t[8]=a*f,t[1]=a*p,t[5]=a*c,t[9]=-o,t[2]=g*o-S,t[6]=T+m*o,t[10]=a*u}else if(e.order==="ZXY"){const m=u*c,g=u*p,S=f*c,T=f*p;t[0]=m-T*o,t[4]=-a*p,t[8]=S+g*o,t[1]=g+S*o,t[5]=a*c,t[9]=T-m*o,t[2]=-a*f,t[6]=o,t[10]=a*u}else if(e.order==="ZYX"){const m=a*c,g=a*p,S=o*c,T=o*p;t[0]=u*c,t[4]=S*f-g,t[8]=m*f+T,t[1]=u*p,t[5]=T*f+m,t[9]=g*f-S,t[2]=-f,t[6]=o*u,t[10]=a*u}else if(e.order==="YZX"){const m=a*u,g=a*f,S=o*u,T=o*f;t[0]=u*c,t[4]=T-m*p,t[8]=S*p+g,t[1]=p,t[5]=a*c,t[9]=-o*c,t[2]=-f*c,t[6]=g*p+S,t[10]=m-T*p}else if(e.order==="XZY"){const m=a*u,g=a*f,S=o*u,T=o*f;t[0]=u*c,t[4]=-p,t[8]=f*c,t[1]=m*p+T,t[5]=a*c,t[9]=g*p-S,t[2]=S*p-g,t[6]=o*c,t[10]=T*p+m}return t[3]=0,t[7]=0,t[11]=0,t[12]=0,t[13]=0,t[14]=0,t[15]=1,this}makeRotationFromQuaternion(e){return this.compose(Ra,e,wa)}lookAt(e,t,n){const r=this.elements;return Et.subVectors(e,t),Et.lengthSq()===0&&(Et.z=1),Et.normalize(),Qt.crossVectors(n,Et),Qt.lengthSq()===0&&(Math.abs(n.z)===1?Et.x+=1e-4:Et.z+=1e-4,Et.normalize(),Qt.crossVectors(n,Et)),Qt.normalize(),ui.crossVectors(Et,Qt),r[0]=Qt.x,r[4]=ui.x,r[8]=Et.x,r[1]=Qt.y,r[5]=ui.y,r[9]=Et.y,r[2]=Qt.z,r[6]=ui.z,r[10]=Et.z,this}multiply(e){return this.multiplyMatrices(this,e)}premultiply(e){return this.multiplyMatrices(e,this)}multiplyMatrices(e,t){const n=e.elements,r=t.elements,s=this.elements,a=n[0],o=n[4],u=n[8],f=n[12],c=n[1],p=n[5],m=n[9],g=n[13],S=n[2],T=n[6],_=n[10],d=n[14],U=n[3],C=n[7],R=n[11],z=n[15],L=r[0],F=r[4],G=r[8],A=r[12],y=r[1],N=r[5],ee=r[9],Y=r[13],Q=r[2],ie=r[6],j=r[10],oe=r[14],K=r[3],fe=r[7],_e=r[11],Ee=r[15];return s[0]=a*L+o*y+u*Q+f*K,s[4]=a*F+o*N+u*ie+f*fe,s[8]=a*G+o*ee+u*j+f*_e,s[12]=a*A+o*Y+u*oe+f*Ee,s[1]=c*L+p*y+m*Q+g*K,s[5]=c*F+p*N+m*ie+g*fe,s[9]=c*G+p*ee+m*j+g*_e,s[13]=c*A+p*Y+m*oe+g*Ee,s[2]=S*L+T*y+_*Q+d*K,s[6]=S*F+T*N+_*ie+d*fe,s[10]=S*G+T*ee+_*j+d*_e,s[14]=S*A+T*Y+_*oe+d*Ee,s[3]=U*L+C*y+R*Q+z*K,s[7]=U*F+C*N+R*ie+z*fe,s[11]=U*G+C*ee+R*j+z*_e,s[15]=U*A+C*Y+R*oe+z*Ee,this}multiplyScalar(e){const t=this.elements;return t[0]*=e,t[4]*=e,t[8]*=e,t[12]*=e,t[1]*=e,t[5]*=e,t[9]*=e,t[13]*=e,t[2]*=e,t[6]*=e,t[10]*=e,t[14]*=e,t[3]*=e,t[7]*=e,t[11]*=e,t[15]*=e,this}determinant(){const e=this.elements,t=e[0],n=e[4],r=e[8],s=e[12],a=e[1],o=e[5],u=e[9],f=e[13],c=e[2],p=e[6],m=e[10],g=e[14],S=e[3],T=e[7],_=e[11],d=e[15];return S*(+s*u*p-r*f*p-s*o*m+n*f*m+r*o*g-n*u*g)+T*(+t*u*g-t*f*m+s*a*m-r*a*g+r*f*c-s*u*c)+_*(+t*f*p-t*o*g-s*a*p+n*a*g+s*o*c-n*f*c)+d*(-r*o*c-t*u*p+t*o*m+r*a*p-n*a*m+n*u*c)}transpose(){const e=this.elements;let t;return t=e[1],e[1]=e[4],e[4]=t,t=e[2],e[2]=e[8],e[8]=t,t=e[6],e[6]=e[9],e[9]=t,t=e[3],e[3]=e[12],e[12]=t,t=e[7],e[7]=e[13],e[13]=t,t=e[11],e[11]=e[14],e[14]=t,this}setPosition(e,t,n){const r=this.elements;return e.isVector3?(r[12]=e.x,r[13]=e.y,r[14]=e.z):(r[12]=e,r[13]=t,r[14]=n),this}invert(){const e=this.elements,t=e[0],n=e[1],r=e[2],s=e[3],a=e[4],o=e[5],u=e[6],f=e[7],c=e[8],p=e[9],m=e[10],g=e[11],S=e[12],T=e[13],_=e[14],d=e[15],U=p*_*f-T*m*f+T*u*g-o*_*g-p*u*d+o*m*d,C=S*m*f-c*_*f-S*u*g+a*_*g+c*u*d-a*m*d,R=c*T*f-S*p*f+S*o*g-a*T*g-c*o*d+a*p*d,z=S*p*u-c*T*u-S*o*m+a*T*m+c*o*_-a*p*_,L=t*U+n*C+r*R+s*z;if(L===0)return this.set(0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0);const F=1/L;return e[0]=U*F,e[1]=(T*m*s-p*_*s-T*r*g+n*_*g+p*r*d-n*m*d)*F,e[2]=(o*_*s-T*u*s+T*r*f-n*_*f-o*r*d+n*u*d)*F,e[3]=(p*u*s-o*m*s-p*r*f+n*m*f+o*r*g-n*u*g)*F,e[4]=C*F,e[5]=(c*_*s-S*m*s+S*r*g-t*_*g-c*r*d+t*m*d)*F,e[6]=(S*u*s-a*_*s-S*r*f+t*_*f+a*r*d-t*u*d)*F,e[7]=(a*m*s-c*u*s+c*r*f-t*m*f-a*r*g+t*u*g)*F,e[8]=R*F,e[9]=(S*p*s-c*T*s-S*n*g+t*T*g+c*n*d-t*p*d)*F,e[10]=(a*T*s-S*o*s+S*n*f-t*T*f-a*n*d+t*o*d)*F,e[11]=(c*o*s-a*p*s-c*n*f+t*p*f+a*n*g-t*o*g)*F,e[12]=z*F,e[13]=(c*T*r-S*p*r+S*n*m-t*T*m-c*n*_+t*p*_)*F,e[14]=(S*o*r-a*T*r-S*n*u+t*T*u+a*n*_-t*o*_)*F,e[15]=(a*p*r-c*o*r+c*n*u-t*p*u-a*n*m+t*o*m)*F,this}scale(e){const t=this.elements,n=e.x,r=e.y,s=e.z;return t[0]*=n,t[4]*=r,t[8]*=s,t[1]*=n,t[5]*=r,t[9]*=s,t[2]*=n,t[6]*=r,t[10]*=s,t[3]*=n,t[7]*=r,t[11]*=s,this}getMaxScaleOnAxis(){const e=this.elements,t=e[0]*e[0]+e[1]*e[1]+e[2]*e[2],n=e[4]*e[4]+e[5]*e[5]+e[6]*e[6],r=e[8]*e[8]+e[9]*e[9]+e[10]*e[10];return Math.sqrt(Math.max(t,n,r))}makeTranslation(e,t,n){return e.isVector3?this.set(1,0,0,e.x,0,1,0,e.y,0,0,1,e.z,0,0,0,1):this.set(1,0,0,e,0,1,0,t,0,0,1,n,0,0,0,1),this}makeRotationX(e){const t=Math.cos(e),n=Math.sin(e);return this.set(1,0,0,0,0,t,-n,0,0,n,t,0,0,0,0,1),this}makeRotationY(e){const t=Math.cos(e),n=Math.sin(e);return this.set(t,0,n,0,0,1,0,0,-n,0,t,0,0,0,0,1),this}makeRotationZ(e){const t=Math.cos(e),n=Math.sin(e);return this.set(t,-n,0,0,n,t,0,0,0,0,1,0,0,0,0,1),this}makeRotationAxis(e,t){const n=Math.cos(t),r=Math.sin(t),s=1-n,a=e.x,o=e.y,u=e.z,f=s*a,c=s*o;return this.set(f*a+n,f*o-r*u,f*u+r*o,0,f*o+r*u,c*o+n,c*u-r*a,0,f*u-r*o,c*u+r*a,s*u*u+n,0,0,0,0,1),this}makeScale(e,t,n){return this.set(e,0,0,0,0,t,0,0,0,0,n,0,0,0,0,1),this}makeShear(e,t,n,r,s,a){return this.set(1,n,s,0,e,1,a,0,t,r,1,0,0,0,0,1),this}compose(e,t,n){const r=this.elements,s=t._x,a=t._y,o=t._z,u=t._w,f=s+s,c=a+a,p=o+o,m=s*f,g=s*c,S=s*p,T=a*c,_=a*p,d=o*p,U=u*f,C=u*c,R=u*p,z=n.x,L=n.y,F=n.z;return r[0]=(1-(T+d))*z,r[1]=(g+R)*z,r[2]=(S-C)*z,r[3]=0,r[4]=(g-R)*L,r[5]=(1-(m+d))*L,r[6]=(_+U)*L,r[7]=0,r[8]=(S+C)*F,r[9]=(_-U)*F,r[10]=(1-(m+T))*F,r[11]=0,r[12]=e.x,r[13]=e.y,r[14]=e.z,r[15]=1,this}decompose(e,t,n){const r=this.elements;let s=En.set(r[0],r[1],r[2]).length();const a=En.set(r[4],r[5],r[6]).length(),o=En.set(r[8],r[9],r[10]).length();this.determinant()<0&&(s=-s),e.x=r[12],e.y=r[13],e.z=r[14],It.copy(this);const f=1/s,c=1/a,p=1/o;return It.elements[0]*=f,It.elements[1]*=f,It.elements[2]*=f,It.elements[4]*=c,It.elements[5]*=c,It.elements[6]*=c,It.elements[8]*=p,It.elements[9]*=p,It.elements[10]*=p,t.setFromRotationMatrix(It),n.x=s,n.y=a,n.z=o,this}makePerspective(e,t,n,r,s,a,o=2e3){const u=this.elements,f=2*s/(t-e),c=2*s/(n-r),p=(t+e)/(t-e),m=(n+r)/(n-r);let g,S;if(o===2e3)g=-(a+s)/(a-s),S=-2*a*s/(a-s);else if(o===2001)g=-a/(a-s),S=-a*s/(a-s);else throw new Error("THREE.Matrix4.makePerspective(): Invalid coordinate system: "+o);return u[0]=f,u[4]=0,u[8]=p,u[12]=0,u[1]=0,u[5]=c,u[9]=m,u[13]=0,u[2]=0,u[6]=0,u[10]=g,u[14]=S,u[3]=0,u[7]=0,u[11]=-1,u[15]=0,this}makeOrthographic(e,t,n,r,s,a,o=2e3){const u=this.elements,f=1/(t-e),c=1/(n-r),p=1/(a-s),m=(t+e)*f,g=(n+r)*c;let S,T;if(o===2e3)S=(a+s)*p,T=-2*p;else if(o===2001)S=s*p,T=-1*p;else throw new Error("THREE.Matrix4.makeOrthographic(): Invalid coordinate system: "+o);return u[0]=2*f,u[4]=0,u[8]=0,u[12]=-m,u[1]=0,u[5]=2*c,u[9]=0,u[13]=-g,u[2]=0,u[6]=0,u[10]=T,u[14]=-S,u[3]=0,u[7]=0,u[11]=0,u[15]=1,this}equals(e){const t=this.elements,n=e.elements;for(let r=0;r<16;r++)if(t[r]!==n[r])return!1;return!0}fromArray(e,t=0){for(let n=0;n<16;n++)this.elements[n]=e[n+t];return this}toArray(e=[],t=0){const n=this.elements;return e[t]=n[0],e[t+1]=n[1],e[t+2]=n[2],e[t+3]=n[3],e[t+4]=n[4],e[t+5]=n[5],e[t+6]=n[6],e[t+7]=n[7],e[t+8]=n[8],e[t+9]=n[9],e[t+10]=n[10],e[t+11]=n[11],e[t+12]=n[12],e[t+13]=n[13],e[t+14]=n[14],e[t+15]=n[15],e}}const En=new q,It=new et,Ra=new q(0,0,0),wa=new q(1,1,1),Qt=new q,ui=new q,Et=new q,Lr=new et,Fr=new ei;class $t{constructor(e=0,t=0,n=0,r=$t.DEFAULT_ORDER){this.isEuler=!0,this._x=e,this._y=t,this._z=n,this._order=r}get x(){return this._x}set x(e){this._x=e,this._onChangeCallback()}get y(){return this._y}set y(e){this._y=e,this._onChangeCallback()}get z(){return this._z}set z(e){this._z=e,this._onChangeCallback()}get order(){return this._order}set order(e){this._order=e,this._onChangeCallback()}set(e,t,n,r=this._order){return this._x=e,this._y=t,this._z=n,this._order=r,this._onChangeCallback(),this}clone(){return new this.constructor(this._x,this._y,this._z,this._order)}copy(e){return this._x=e._x,this._y=e._y,this._z=e._z,this._order=e._order,this._onChangeCallback(),this}setFromRotationMatrix(e,t=this._order,n=!0){const r=e.elements,s=r[0],a=r[4],o=r[8],u=r[1],f=r[5],c=r[9],p=r[2],m=r[6],g=r[10];switch(t){case"XYZ":this._y=Math.asin(Ge(o,-1,1)),Math.abs(o)<.9999999?(this._x=Math.atan2(-c,g),this._z=Math.atan2(-a,s)):(this._x=Math.atan2(m,f),this._z=0);break;case"YXZ":this._x=Math.asin(-Ge(c,-1,1)),Math.abs(c)<.9999999?(this._y=Math.atan2(o,g),this._z=Math.atan2(u,f)):(this._y=Math.atan2(-p,s),this._z=0);break;case"ZXY":this._x=Math.asin(Ge(m,-1,1)),Math.abs(m)<.9999999?(this._y=Math.atan2(-p,g),this._z=Math.atan2(-a,f)):(this._y=0,this._z=Math.atan2(u,s));break;case"ZYX":this._y=Math.asin(-Ge(p,-1,1)),Math.abs(p)<.9999999?(this._x=Math.atan2(m,g),this._z=Math.atan2(u,s)):(this._x=0,this._z=Math.atan2(-a,f));break;case"YZX":this._z=Math.asin(Ge(u,-1,1)),Math.abs(u)<.9999999?(this._x=Math.atan2(-c,f),this._y=Math.atan2(-p,s)):(this._x=0,this._y=Math.atan2(o,g));break;case"XZY":this._z=Math.asin(-Ge(a,-1,1)),Math.abs(a)<.9999999?(this._x=Math.atan2(m,f),this._y=Math.atan2(o,s)):(this._x=Math.atan2(-c,g),this._y=0);break;default:console.warn("THREE.Euler: .setFromRotationMatrix() encountered an unknown order: "+t)}return this._order=t,n===!0&&this._onChangeCallback(),this}setFromQuaternion(e,t,n){return Lr.makeRotationFromQuaternion(e),this.setFromRotationMatrix(Lr,t,n)}setFromVector3(e,t=this._order){return this.set(e.x,e.y,e.z,t)}reorder(e){return Fr.setFromEuler(this),this.setFromQuaternion(Fr,e)}equals(e){return e._x===this._x&&e._y===this._y&&e._z===this._z&&e._order===this._order}fromArray(e){return this._x=e[0],this._y=e[1],this._z=e[2],e[3]!==void 0&&(this._order=e[3]),this._onChangeCallback(),this}toArray(e=[],t=0){return e[t]=this._x,e[t+1]=this._y,e[t+2]=this._z,e[t+3]=this._order,e}_onChange(e){return this._onChangeCallback=e,this}_onChangeCallback(){}*[Symbol.iterator](){yield this._x,yield this._y,yield this._z,yield this._order}}$t.DEFAULT_ORDER="XYZ";class gr{constructor(){this.mask=1}set(e){this.mask=(1<<e|0)>>>0}enable(e){this.mask|=1<<e|0}enableAll(){this.mask=-1}toggle(e){this.mask^=1<<e|0}disable(e){this.mask&=~(1<<e|0)}disableAll(){this.mask=0}test(e){return(this.mask&e.mask)!==0}isEnabled(e){return(this.mask&(1<<e|0))!==0}}let Ca=0;const Nr=new q,yn=new ei,kt=new et,hi=new q,Xn=new q,Pa=new q,Da=new ei,Br=new q(1,0,0),Or=new q(0,1,0),Gr=new q(0,0,1),zr={type:"added"},Ia={type:"removed"},Tn={type:"childadded",child:null},Xi={type:"childremoved",child:null};class St extends On{constructor(){super(),this.isObject3D=!0,Object.defineProperty(this,"id",{value:Ca++}),this.uuid=Gn(),this.name="",this.type="Object3D",this.parent=null,this.children=[],this.up=St.DEFAULT_UP.clone();const e=new q,t=new $t,n=new ei,r=new q(1,1,1);function s(){n.setFromEuler(t,!1)}function a(){t.setFromQuaternion(n,void 0,!1)}t._onChange(s),n._onChange(a),Object.defineProperties(this,{position:{configurable:!0,enumerable:!0,value:e},rotation:{configurable:!0,enumerable:!0,value:t},quaternion:{configurable:!0,enumerable:!0,value:n},scale:{configurable:!0,enumerable:!0,value:r},modelViewMatrix:{value:new et},normalMatrix:{value:new Ue}}),this.matrix=new et,this.matrixWorld=new et,this.matrixAutoUpdate=St.DEFAULT_MATRIX_AUTO_UPDATE,this.matrixWorldAutoUpdate=St.DEFAULT_MATRIX_WORLD_AUTO_UPDATE,this.matrixWorldNeedsUpdate=!1,this.layers=new gr,this.visible=!0,this.castShadow=!1,this.receiveShadow=!1,this.frustumCulled=!0,this.renderOrder=0,this.animations=[],this.customDepthMaterial=void 0,this.customDistanceMaterial=void 0,this.userData={}}onBeforeShadow(){}onAfterShadow(){}onBeforeRender(){}onAfterRender(){}applyMatrix4(e){this.matrixAutoUpdate&&this.updateMatrix(),this.matrix.premultiply(e),this.matrix.decompose(this.position,this.quaternion,this.scale)}applyQuaternion(e){return this.quaternion.premultiply(e),this}setRotationFromAxisAngle(e,t){this.quaternion.setFromAxisAngle(e,t)}setRotationFromEuler(e){this.quaternion.setFromEuler(e,!0)}setRotationFromMatrix(e){this.quaternion.setFromRotationMatrix(e)}setRotationFromQuaternion(e){this.quaternion.copy(e)}rotateOnAxis(e,t){return yn.setFromAxisAngle(e,t),this.quaternion.multiply(yn),this}rotateOnWorldAxis(e,t){return yn.setFromAxisAngle(e,t),this.quaternion.premultiply(yn),this}rotateX(e){return this.rotateOnAxis(Br,e)}rotateY(e){return this.rotateOnAxis(Or,e)}rotateZ(e){return this.rotateOnAxis(Gr,e)}translateOnAxis(e,t){return Nr.copy(e).applyQuaternion(this.quaternion),this.position.add(Nr.multiplyScalar(t)),this}translateX(e){return this.translateOnAxis(Br,e)}translateY(e){return this.translateOnAxis(Or,e)}translateZ(e){return this.translateOnAxis(Gr,e)}localToWorld(e){return this.updateWorldMatrix(!0,!1),e.applyMatrix4(this.matrixWorld)}worldToLocal(e){return this.updateWorldMatrix(!0,!1),e.applyMatrix4(kt.copy(this.matrixWorld).invert())}lookAt(e,t,n){e.isVector3?hi.copy(e):hi.set(e,t,n);const r=this.parent;this.updateWorldMatrix(!0,!1),Xn.setFromMatrixPosition(this.matrixWorld),this.isCamera||this.isLight?kt.lookAt(Xn,hi,this.up):kt.lookAt(hi,Xn,this.up),this.quaternion.setFromRotationMatrix(kt),r&&(kt.extractRotation(r.matrixWorld),yn.setFromRotationMatrix(kt),this.quaternion.premultiply(yn.invert()))}add(e){if(arguments.length>1){for(let t=0;t<arguments.length;t++)this.add(arguments[t]);return this}return e===this?(console.error("THREE.Object3D.add: object can't be added as a child of itself.",e),this):(e&&e.isObject3D?(e.removeFromParent(),e.parent=this,this.children.push(e),e.dispatchEvent(zr),Tn.child=e,this.dispatchEvent(Tn),Tn.child=null):console.error("THREE.Object3D.add: object not an instance of THREE.Object3D.",e),this)}remove(e){if(arguments.length>1){for(let n=0;n<arguments.length;n++)this.remove(arguments[n]);return this}const t=this.children.indexOf(e);return t!==-1&&(e.parent=null,this.children.splice(t,1),e.dispatchEvent(Ia),Xi.child=e,this.dispatchEvent(Xi),Xi.child=null),this}removeFromParent(){const e=this.parent;return e!==null&&e.remove(this),this}clear(){return this.remove(...this.children)}attach(e){return this.updateWorldMatrix(!0,!1),kt.copy(this.matrixWorld).invert(),e.parent!==null&&(e.parent.updateWorldMatrix(!0,!1),kt.multiply(e.parent.matrixWorld)),e.applyMatrix4(kt),e.removeFromParent(),e.parent=this,this.children.push(e),e.updateWorldMatrix(!1,!0),e.dispatchEvent(zr),Tn.child=e,this.dispatchEvent(Tn),Tn.child=null,this}getObjectById(e){return this.getObjectByProperty("id",e)}getObjectByName(e){return this.getObjectByProperty("name",e)}getObjectByProperty(e,t){if(this[e]===t)return this;for(let n=0,r=this.children.length;n<r;n++){const a=this.children[n].getObjectByProperty(e,t);if(a!==void 0)return a}}getObjectsByProperty(e,t,n=[]){this[e]===t&&n.push(this);const r=this.children;for(let s=0,a=r.length;s<a;s++)r[s].getObjectsByProperty(e,t,n);return n}getWorldPosition(e){return this.updateWorldMatrix(!0,!1),e.setFromMatrixPosition(this.matrixWorld)}getWorldQuaternion(e){return this.updateWorldMatrix(!0,!1),this.matrixWorld.decompose(Xn,e,Pa),e}getWorldScale(e){return this.updateWorldMatrix(!0,!1),this.matrixWorld.decompose(Xn,Da,e),e}getWorldDirection(e){this.updateWorldMatrix(!0,!1);const t=this.matrixWorld.elements;return e.set(t[8],t[9],t[10]).normalize()}raycast(){}traverse(e){e(this);const t=this.children;for(let n=0,r=t.length;n<r;n++)t[n].traverse(e)}traverseVisible(e){if(this.visible===!1)return;e(this);const t=this.children;for(let n=0,r=t.length;n<r;n++)t[n].traverseVisible(e)}traverseAncestors(e){const t=this.parent;t!==null&&(e(t),t.traverseAncestors(e))}updateMatrix(){this.matrix.compose(this.position,this.quaternion,this.scale),this.matrixWorldNeedsUpdate=!0}updateMatrixWorld(e){this.matrixAutoUpdate&&this.updateMatrix(),(this.matrixWorldNeedsUpdate||e)&&(this.matrixWorldAutoUpdate===!0&&(this.parent===null?this.matrixWorld.copy(this.matrix):this.matrixWorld.multiplyMatrices(this.parent.matrixWorld,this.matrix)),this.matrixWorldNeedsUpdate=!1,e=!0);const t=this.children;for(let n=0,r=t.length;n<r;n++)t[n].updateMatrixWorld(e)}updateWorldMatrix(e,t){const n=this.parent;if(e===!0&&n!==null&&n.updateWorldMatrix(!0,!1),this.matrixAutoUpdate&&this.updateMatrix(),this.matrixWorldAutoUpdate===!0&&(this.parent===null?this.matrixWorld.copy(this.matrix):this.matrixWorld.multiplyMatrices(this.parent.matrixWorld,this.matrix)),t===!0){const r=this.children;for(let s=0,a=r.length;s<a;s++)r[s].updateWorldMatrix(!1,!0)}}toJSON(e){const t=e===void 0||typeof e=="string",n={};t&&(e={geometries:{},materials:{},textures:{},images:{},shapes:{},skeletons:{},animations:{},nodes:{}},n.metadata={version:4.6,type:"Object",generator:"Object3D.toJSON"});const r={};r.uuid=this.uuid,r.type=this.type,this.name!==""&&(r.name=this.name),this.castShadow===!0&&(r.castShadow=!0),this.receiveShadow===!0&&(r.receiveShadow=!0),this.visible===!1&&(r.visible=!1),this.frustumCulled===!1&&(r.frustumCulled=!1),this.renderOrder!==0&&(r.renderOrder=this.renderOrder),Object.keys(this.userData).length>0&&(r.userData=this.userData),r.layers=this.layers.mask,r.matrix=this.matrix.toArray(),r.up=this.up.toArray(),this.matrixAutoUpdate===!1&&(r.matrixAutoUpdate=!1),this.isInstancedMesh&&(r.type="InstancedMesh",r.count=this.count,r.instanceMatrix=this.instanceMatrix.toJSON(),this.instanceColor!==null&&(r.instanceColor=this.instanceColor.toJSON())),this.isBatchedMesh&&(r.type="BatchedMesh",r.perObjectFrustumCulled=this.perObjectFrustumCulled,r.sortObjects=this.sortObjects,r.drawRanges=this._drawRanges,r.reservedRanges=this._reservedRanges,r.geometryInfo=this._geometryInfo.map(o=>({...o,boundingBox:o.boundingBox?{min:o.boundingBox.min.toArray(),max:o.boundingBox.max.toArray()}:void 0,boundingSphere:o.boundingSphere?{radius:o.boundingSphere.radius,center:o.boundingSphere.center.toArray()}:void 0})),r.instanceInfo=this._instanceInfo.map(o=>({...o})),r.availableInstanceIds=this._availableInstanceIds.slice(),r.availableGeometryIds=this._availableGeometryIds.slice(),r.nextIndexStart=this._nextIndexStart,r.nextVertexStart=this._nextVertexStart,r.geometryCount=this._geometryCount,r.maxInstanceCount=this._maxInstanceCount,r.maxVertexCount=this._maxVertexCount,r.maxIndexCount=this._maxIndexCount,r.geometryInitialized=this._geometryInitialized,r.matricesTexture=this._matricesTexture.toJSON(e),r.indirectTexture=this._indirectTexture.toJSON(e),this._colorsTexture!==null&&(r.colorsTexture=this._colorsTexture.toJSON(e)),this.boundingSphere!==null&&(r.boundingSphere={center:this.boundingSphere.center.toArray(),radius:this.boundingSphere.radius}),this.boundingBox!==null&&(r.boundingBox={min:this.boundingBox.min.toArray(),max:this.boundingBox.max.toArray()}));function s(o,u){return o[u.uuid]===void 0&&(o[u.uuid]=u.toJSON(e)),u.uuid}if(this.isScene)this.background&&(this.background.isColor?r.background=this.background.toJSON():this.background.isTexture&&(r.background=this.background.toJSON(e).uuid)),this.environment&&this.environment.isTexture&&this.environment.isRenderTargetTexture!==!0&&(r.environment=this.environment.toJSON(e).uuid);else if(this.isMesh||this.isLine||this.isPoints){r.geometry=s(e.geometries,this.geometry);const o=this.geometry.parameters;if(o!==void 0&&o.shapes!==void 0){const u=o.shapes;if(Array.isArray(u))for(let f=0,c=u.length;f<c;f++){const p=u[f];s(e.shapes,p)}else s(e.shapes,u)}}if(this.isSkinnedMesh&&(r.bindMode=this.bindMode,r.bindMatrix=this.bindMatrix.toArray(),this.skeleton!==void 0&&(s(e.skeletons,this.skeleton),r.skeleton=this.skeleton.uuid)),this.material!==void 0)if(Array.isArray(this.material)){const o=[];for(let u=0,f=this.material.length;u<f;u++)o.push(s(e.materials,this.material[u]));r.material=o}else r.material=s(e.materials,this.material);if(this.children.length>0){r.children=[];for(let o=0;o<this.children.length;o++)r.children.push(this.children[o].toJSON(e).object)}if(this.animations.length>0){r.animations=[];for(let o=0;o<this.animations.length;o++){const u=this.animations[o];r.animations.push(s(e.animations,u))}}if(t){const o=a(e.geometries),u=a(e.materials),f=a(e.textures),c=a(e.images),p=a(e.shapes),m=a(e.skeletons),g=a(e.animations),S=a(e.nodes);o.length>0&&(n.geometries=o),u.length>0&&(n.materials=u),f.length>0&&(n.textures=f),c.length>0&&(n.images=c),p.length>0&&(n.shapes=p),m.length>0&&(n.skeletons=m),g.length>0&&(n.animations=g),S.length>0&&(n.nodes=S)}return n.object=r,n;function a(o){const u=[];for(const f in o){const c=o[f];delete c.metadata,u.push(c)}return u}}clone(e){return new this.constructor().copy(this,e)}copy(e,t=!0){if(this.name=e.name,this.up.copy(e.up),this.position.copy(e.position),this.rotation.order=e.rotation.order,this.quaternion.copy(e.quaternion),this.scale.copy(e.scale),this.matrix.copy(e.matrix),this.matrixWorld.copy(e.matrixWorld),this.matrixAutoUpdate=e.matrixAutoUpdate,this.matrixWorldAutoUpdate=e.matrixWorldAutoUpdate,this.matrixWorldNeedsUpdate=e.matrixWorldNeedsUpdate,this.layers.mask=e.layers.mask,this.visible=e.visible,this.castShadow=e.castShadow,this.receiveShadow=e.receiveShadow,this.frustumCulled=e.frustumCulled,this.renderOrder=e.renderOrder,this.animations=e.animations.slice(),this.userData=JSON.parse(JSON.stringify(e.userData)),t===!0)for(let n=0;n<e.children.length;n++){const r=e.children[n];this.add(r.clone())}return this}}St.DEFAULT_UP=new q(0,1,0);St.DEFAULT_MATRIX_AUTO_UPDATE=!0;St.DEFAULT_MATRIX_WORLD_AUTO_UPDATE=!0;const Ut=new q,Wt=new q,qi=new q,Xt=new q,An=new q,bn=new q,Vr=new q,Yi=new q,$i=new q,Ki=new q,Zi=new rt,ji=new rt,Ji=new rt;class Ft{constructor(e=new q,t=new q,n=new q){this.a=e,this.b=t,this.c=n}static getNormal(e,t,n,r){r.subVectors(n,t),Ut.subVectors(e,t),r.cross(Ut);const s=r.lengthSq();return s>0?r.multiplyScalar(1/Math.sqrt(s)):r.set(0,0,0)}static getBarycoord(e,t,n,r,s){Ut.subVectors(r,t),Wt.subVectors(n,t),qi.subVectors(e,t);const a=Ut.dot(Ut),o=Ut.dot(Wt),u=Ut.dot(qi),f=Wt.dot(Wt),c=Wt.dot(qi),p=a*f-o*o;if(p===0)return s.set(0,0,0),null;const m=1/p,g=(f*u-o*c)*m,S=(a*c-o*u)*m;return s.set(1-g-S,S,g)}static containsPoint(e,t,n,r){return this.getBarycoord(e,t,n,r,Xt)===null?!1:Xt.x>=0&&Xt.y>=0&&Xt.x+Xt.y<=1}static getInterpolation(e,t,n,r,s,a,o,u){return this.getBarycoord(e,t,n,r,Xt)===null?(u.x=0,u.y=0,"z"in u&&(u.z=0),"w"in u&&(u.w=0),null):(u.setScalar(0),u.addScaledVector(s,Xt.x),u.addScaledVector(a,Xt.y),u.addScaledVector(o,Xt.z),u)}static getInterpolatedAttribute(e,t,n,r,s,a){return Zi.setScalar(0),ji.setScalar(0),Ji.setScalar(0),Zi.fromBufferAttribute(e,t),ji.fromBufferAttribute(e,n),Ji.fromBufferAttribute(e,r),a.setScalar(0),a.addScaledVector(Zi,s.x),a.addScaledVector(ji,s.y),a.addScaledVector(Ji,s.z),a}static isFrontFacing(e,t,n,r){return Ut.subVectors(n,t),Wt.subVectors(e,t),Ut.cross(Wt).dot(r)<0}set(e,t,n){return this.a.copy(e),this.b.copy(t),this.c.copy(n),this}setFromPointsAndIndices(e,t,n,r){return this.a.copy(e[t]),this.b.copy(e[n]),this.c.copy(e[r]),this}setFromAttributeAndIndices(e,t,n,r){return this.a.fromBufferAttribute(e,t),this.b.fromBufferAttribute(e,n),this.c.fromBufferAttribute(e,r),this}clone(){return new this.constructor().copy(this)}copy(e){return this.a.copy(e.a),this.b.copy(e.b),this.c.copy(e.c),this}getArea(){return Ut.subVectors(this.c,this.b),Wt.subVectors(this.a,this.b),Ut.cross(Wt).length()*.5}getMidpoint(e){return e.addVectors(this.a,this.b).add(this.c).multiplyScalar(1/3)}getNormal(e){return Ft.getNormal(this.a,this.b,this.c,e)}getPlane(e){return e.setFromCoplanarPoints(this.a,this.b,this.c)}getBarycoord(e,t){return Ft.getBarycoord(e,this.a,this.b,this.c,t)}getInterpolation(e,t,n,r,s){return Ft.getInterpolation(e,this.a,this.b,this.c,t,n,r,s)}containsPoint(e){return Ft.containsPoint(e,this.a,this.b,this.c)}isFrontFacing(e){return Ft.isFrontFacing(this.a,this.b,this.c,e)}intersectsBox(e){return e.intersectsTriangle(this)}closestPointToPoint(e,t){const n=this.a,r=this.b,s=this.c;let a,o;An.subVectors(r,n),bn.subVectors(s,n),Yi.subVectors(e,n);const u=An.dot(Yi),f=bn.dot(Yi);if(u<=0&&f<=0)return t.copy(n);$i.subVectors(e,r);const c=An.dot($i),p=bn.dot($i);if(c>=0&&p<=c)return t.copy(r);const m=u*p-c*f;if(m<=0&&u>=0&&c<=0)return a=u/(u-c),t.copy(n).addScaledVector(An,a);Ki.subVectors(e,s);const g=An.dot(Ki),S=bn.dot(Ki);if(S>=0&&g<=S)return t.copy(s);const T=g*f-u*S;if(T<=0&&f>=0&&S<=0)return o=f/(f-S),t.copy(n).addScaledVector(bn,o);const _=c*S-g*p;if(_<=0&&p-c>=0&&g-S>=0)return Vr.subVectors(s,r),o=(p-c)/(p-c+(g-S)),t.copy(r).addScaledVector(Vr,o);const d=1/(_+T+m);return a=T*d,o=m*d,t.copy(n).addScaledVector(An,a).addScaledVector(bn,o)}equals(e){return e.a.equals(this.a)&&e.b.equals(this.b)&&e.c.equals(this.c)}}const Ps={aliceblue:15792383,antiquewhite:16444375,aqua:65535,aquamarine:8388564,azure:15794175,beige:16119260,bisque:16770244,black:0,blanchedalmond:16772045,blue:255,blueviolet:9055202,brown:10824234,burlywood:14596231,cadetblue:6266528,chartreuse:8388352,chocolate:13789470,coral:16744272,cornflowerblue:6591981,cornsilk:16775388,crimson:14423100,cyan:65535,darkblue:139,darkcyan:35723,darkgoldenrod:12092939,darkgray:11119017,darkgreen:25600,darkgrey:11119017,darkkhaki:12433259,darkmagenta:9109643,darkolivegreen:5597999,darkorange:16747520,darkorchid:10040012,darkred:9109504,darksalmon:15308410,darkseagreen:9419919,darkslateblue:4734347,darkslategray:3100495,darkslategrey:3100495,darkturquoise:52945,darkviolet:9699539,deeppink:16716947,deepskyblue:49151,dimgray:6908265,dimgrey:6908265,dodgerblue:2003199,firebrick:11674146,floralwhite:16775920,forestgreen:2263842,fuchsia:16711935,gainsboro:14474460,ghostwhite:16316671,gold:16766720,goldenrod:14329120,gray:8421504,green:32768,greenyellow:11403055,grey:8421504,honeydew:15794160,hotpink:16738740,indianred:13458524,indigo:4915330,ivory:16777200,khaki:15787660,lavender:15132410,lavenderblush:16773365,lawngreen:8190976,lemonchiffon:16775885,lightblue:11393254,lightcoral:15761536,lightcyan:14745599,lightgoldenrodyellow:16448210,lightgray:13882323,lightgreen:9498256,lightgrey:13882323,lightpink:16758465,lightsalmon:16752762,lightseagreen:2142890,lightskyblue:8900346,lightslategray:7833753,lightslategrey:7833753,lightsteelblue:11584734,lightyellow:16777184,lime:65280,limegreen:3329330,linen:16445670,magenta:16711935,maroon:8388608,mediumaquamarine:6737322,mediumblue:205,mediumorchid:12211667,mediumpurple:9662683,mediumseagreen:3978097,mediumslateblue:8087790,mediumspringgreen:64154,mediumturquoise:4772300,mediumvioletred:13047173,midnightblue:1644912,mintcream:16121850,mistyrose:16770273,moccasin:16770229,navajowhite:16768685,navy:128,oldlace:16643558,olive:8421376,olivedrab:7048739,orange:16753920,orangered:16729344,orchid:14315734,palegoldenrod:15657130,palegreen:10025880,paleturquoise:11529966,palevioletred:14381203,papayawhip:16773077,peachpuff:16767673,peru:13468991,pink:16761035,plum:14524637,powderblue:11591910,purple:8388736,rebeccapurple:6697881,red:16711680,rosybrown:12357519,royalblue:4286945,saddlebrown:9127187,salmon:16416882,sandybrown:16032864,seagreen:3050327,seashell:16774638,sienna:10506797,silver:12632256,skyblue:8900331,slateblue:6970061,slategray:7372944,slategrey:7372944,snow:16775930,springgreen:65407,steelblue:4620980,tan:13808780,teal:32896,thistle:14204888,tomato:16737095,turquoise:4251856,violet:15631086,wheat:16113331,white:16777215,whitesmoke:16119285,yellow:16776960,yellowgreen:10145074},en={h:0,s:0,l:0},fi={h:0,s:0,l:0};function Qi(i,e,t){return t<0&&(t+=1),t>1&&(t-=1),t<1/6?i+(e-i)*6*t:t<1/2?e:t<2/3?i+(e-i)*6*(2/3-t):i}class Ke{constructor(e,t,n){return this.isColor=!0,this.r=1,this.g=1,this.b=1,this.set(e,t,n)}set(e,t,n){if(t===void 0&&n===void 0){const r=e;r&&r.isColor?this.copy(r):typeof r=="number"?this.setHex(r):typeof r=="string"&&this.setStyle(r)}else this.setRGB(e,t,n);return this}setScalar(e){return this.r=e,this.g=e,this.b=e,this}setHex(e,t=wt){return e=Math.floor(e),this.r=(e>>16&255)/255,this.g=(e>>8&255)/255,this.b=(e&255)/255,ke.toWorkingColorSpace(this,t),this}setRGB(e,t,n,r=ke.workingColorSpace){return this.r=e,this.g=t,this.b=n,ke.toWorkingColorSpace(this,r),this}setHSL(e,t,n,r=ke.workingColorSpace){if(e=pr(e,1),t=Ge(t,0,1),n=Ge(n,0,1),t===0)this.r=this.g=this.b=n;else{const s=n<=.5?n*(1+t):n+t-n*t,a=2*n-s;this.r=Qi(a,s,e+1/3),this.g=Qi(a,s,e),this.b=Qi(a,s,e-1/3)}return ke.toWorkingColorSpace(this,r),this}setStyle(e,t=wt){function n(s){s!==void 0&&parseFloat(s)<1&&console.warn("THREE.Color: Alpha component of "+e+" will be ignored.")}let r;if(r=/^(\w+)\(([^\)]*)\)/.exec(e)){let s;const a=r[1],o=r[2];switch(a){case"rgb":case"rgba":if(s=/^\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*(?:,\s*(\d*\.?\d+)\s*)?$/.exec(o))return n(s[4]),this.setRGB(Math.min(255,parseInt(s[1],10))/255,Math.min(255,parseInt(s[2],10))/255,Math.min(255,parseInt(s[3],10))/255,t);if(s=/^\s*(\d+)\%\s*,\s*(\d+)\%\s*,\s*(\d+)\%\s*(?:,\s*(\d*\.?\d+)\s*)?$/.exec(o))return n(s[4]),this.setRGB(Math.min(100,parseInt(s[1],10))/100,Math.min(100,parseInt(s[2],10))/100,Math.min(100,parseInt(s[3],10))/100,t);break;case"hsl":case"hsla":if(s=/^\s*(\d*\.?\d+)\s*,\s*(\d*\.?\d+)\%\s*,\s*(\d*\.?\d+)\%\s*(?:,\s*(\d*\.?\d+)\s*)?$/.exec(o))return n(s[4]),this.setHSL(parseFloat(s[1])/360,parseFloat(s[2])/100,parseFloat(s[3])/100,t);break;default:console.warn("THREE.Color: Unknown color model "+e)}}else if(r=/^\#([A-Fa-f\d]+)$/.exec(e)){const s=r[1],a=s.length;if(a===3)return this.setRGB(parseInt(s.charAt(0),16)/15,parseInt(s.charAt(1),16)/15,parseInt(s.charAt(2),16)/15,t);if(a===6)return this.setHex(parseInt(s,16),t);console.warn("THREE.Color: Invalid hex color "+e)}else if(e&&e.length>0)return this.setColorName(e,t);return this}setColorName(e,t=wt){const n=Ps[e.toLowerCase()];return n!==void 0?this.setHex(n,t):console.warn("THREE.Color: Unknown color "+e),this}clone(){return new this.constructor(this.r,this.g,this.b)}copy(e){return this.r=e.r,this.g=e.g,this.b=e.b,this}copySRGBToLinear(e){return this.r=qt(e.r),this.g=qt(e.g),this.b=qt(e.b),this}copyLinearToSRGB(e){return this.r=Fn(e.r),this.g=Fn(e.g),this.b=Fn(e.b),this}convertSRGBToLinear(){return this.copySRGBToLinear(this),this}convertLinearToSRGB(){return this.copyLinearToSRGB(this),this}getHex(e=wt){return ke.fromWorkingColorSpace(pt.copy(this),e),Math.round(Ge(pt.r*255,0,255))*65536+Math.round(Ge(pt.g*255,0,255))*256+Math.round(Ge(pt.b*255,0,255))}getHexString(e=wt){return("000000"+this.getHex(e).toString(16)).slice(-6)}getHSL(e,t=ke.workingColorSpace){ke.fromWorkingColorSpace(pt.copy(this),t);const n=pt.r,r=pt.g,s=pt.b,a=Math.max(n,r,s),o=Math.min(n,r,s);let u,f;const c=(o+a)/2;if(o===a)u=0,f=0;else{const p=a-o;switch(f=c<=.5?p/(a+o):p/(2-a-o),a){case n:u=(r-s)/p+(r<s?6:0);break;case r:u=(s-n)/p+2;break;case s:u=(n-r)/p+4;break}u/=6}return e.h=u,e.s=f,e.l=c,e}getRGB(e,t=ke.workingColorSpace){return ke.fromWorkingColorSpace(pt.copy(this),t),e.r=pt.r,e.g=pt.g,e.b=pt.b,e}getStyle(e=wt){ke.fromWorkingColorSpace(pt.copy(this),e);const t=pt.r,n=pt.g,r=pt.b;return e!==wt?`color(${e} ${t.toFixed(3)} ${n.toFixed(3)} ${r.toFixed(3)})`:`rgb(${Math.round(t*255)},${Math.round(n*255)},${Math.round(r*255)})`}offsetHSL(e,t,n){return this.getHSL(en),this.setHSL(en.h+e,en.s+t,en.l+n)}add(e){return this.r+=e.r,this.g+=e.g,this.b+=e.b,this}addColors(e,t){return this.r=e.r+t.r,this.g=e.g+t.g,this.b=e.b+t.b,this}addScalar(e){return this.r+=e,this.g+=e,this.b+=e,this}sub(e){return this.r=Math.max(0,this.r-e.r),this.g=Math.max(0,this.g-e.g),this.b=Math.max(0,this.b-e.b),this}multiply(e){return this.r*=e.r,this.g*=e.g,this.b*=e.b,this}multiplyScalar(e){return this.r*=e,this.g*=e,this.b*=e,this}lerp(e,t){return this.r+=(e.r-this.r)*t,this.g+=(e.g-this.g)*t,this.b+=(e.b-this.b)*t,this}lerpColors(e,t,n){return this.r=e.r+(t.r-e.r)*n,this.g=e.g+(t.g-e.g)*n,this.b=e.b+(t.b-e.b)*n,this}lerpHSL(e,t){this.getHSL(en),e.getHSL(fi);const n=jn(en.h,fi.h,t),r=jn(en.s,fi.s,t),s=jn(en.l,fi.l,t);return this.setHSL(n,r,s),this}setFromVector3(e){return this.r=e.x,this.g=e.y,this.b=e.z,this}applyMatrix3(e){const t=this.r,n=this.g,r=this.b,s=e.elements;return this.r=s[0]*t+s[3]*n+s[6]*r,this.g=s[1]*t+s[4]*n+s[7]*r,this.b=s[2]*t+s[5]*n+s[8]*r,this}equals(e){return e.r===this.r&&e.g===this.g&&e.b===this.b}fromArray(e,t=0){return this.r=e[t],this.g=e[t+1],this.b=e[t+2],this}toArray(e=[],t=0){return e[t]=this.r,e[t+1]=this.g,e[t+2]=this.b,e}fromBufferAttribute(e,t){return this.r=e.getX(t),this.g=e.getY(t),this.b=e.getZ(t),this}toJSON(){return this.getHex()}*[Symbol.iterator](){yield this.r,yield this.g,yield this.b}}const pt=new Ke;Ke.NAMES=Ps;let Ua=0;class ti extends On{constructor(){super(),this.isMaterial=!0,Object.defineProperty(this,"id",{value:Ua++}),this.uuid=Gn(),this.name="",this.type="Material",this.blending=1,this.side=0,this.vertexColors=!1,this.opacity=1,this.transparent=!1,this.alphaHash=!1,this.blendSrc=204,this.blendDst=205,this.blendEquation=100,this.blendSrcAlpha=null,this.blendDstAlpha=null,this.blendEquationAlpha=null,this.blendColor=new Ke(0,0,0),this.blendAlpha=0,this.depthFunc=3,this.depthTest=!0,this.depthWrite=!0,this.stencilWriteMask=255,this.stencilFunc=519,this.stencilRef=0,this.stencilFuncMask=255,this.stencilFail=7680,this.stencilZFail=7680,this.stencilZPass=7680,this.stencilWrite=!1,this.clippingPlanes=null,this.clipIntersection=!1,this.clipShadows=!1,this.shadowSide=null,this.colorWrite=!0,this.precision=null,this.polygonOffset=!1,this.polygonOffsetFactor=0,this.polygonOffsetUnits=0,this.dithering=!1,this.alphaToCoverage=!1,this.premultipliedAlpha=!1,this.forceSinglePass=!1,this.allowOverride=!0,this.visible=!0,this.toneMapped=!0,this.userData={},this.version=0,this._alphaTest=0}get alphaTest(){return this._alphaTest}set alphaTest(e){this._alphaTest>0!=e>0&&this.version++,this._alphaTest=e}onBeforeRender(){}onBeforeCompile(){}customProgramCacheKey(){return this.onBeforeCompile.toString()}setValues(e){if(e!==void 0)for(const t in e){const n=e[t];if(n===void 0){console.warn(`THREE.Material: parameter '${t}' has value of undefined.`);continue}const r=this[t];if(r===void 0){console.warn(`THREE.Material: '${t}' is not a property of THREE.${this.type}.`);continue}r&&r.isColor?r.set(n):r&&r.isVector3&&n&&n.isVector3?r.copy(n):this[t]=n}}toJSON(e){const t=e===void 0||typeof e=="string";t&&(e={textures:{},images:{}});const n={metadata:{version:4.6,type:"Material",generator:"Material.toJSON"}};n.uuid=this.uuid,n.type=this.type,this.name!==""&&(n.name=this.name),this.color&&this.color.isColor&&(n.color=this.color.getHex()),this.roughness!==void 0&&(n.roughness=this.roughness),this.metalness!==void 0&&(n.metalness=this.metalness),this.sheen!==void 0&&(n.sheen=this.sheen),this.sheenColor&&this.sheenColor.isColor&&(n.sheenColor=this.sheenColor.getHex()),this.sheenRoughness!==void 0&&(n.sheenRoughness=this.sheenRoughness),this.emissive&&this.emissive.isColor&&(n.emissive=this.emissive.getHex()),this.emissiveIntensity!==void 0&&this.emissiveIntensity!==1&&(n.emissiveIntensity=this.emissiveIntensity),this.specular&&this.specular.isColor&&(n.specular=this.specular.getHex()),this.specularIntensity!==void 0&&(n.specularIntensity=this.specularIntensity),this.specularColor&&this.specularColor.isColor&&(n.specularColor=this.specularColor.getHex()),this.shininess!==void 0&&(n.shininess=this.shininess),this.clearcoat!==void 0&&(n.clearcoat=this.clearcoat),this.clearcoatRoughness!==void 0&&(n.clearcoatRoughness=this.clearcoatRoughness),this.clearcoatMap&&this.clearcoatMap.isTexture&&(n.clearcoatMap=this.clearcoatMap.toJSON(e).uuid),this.clearcoatRoughnessMap&&this.clearcoatRoughnessMap.isTexture&&(n.clearcoatRoughnessMap=this.clearcoatRoughnessMap.toJSON(e).uuid),this.clearcoatNormalMap&&this.clearcoatNormalMap.isTexture&&(n.clearcoatNormalMap=this.clearcoatNormalMap.toJSON(e).uuid,n.clearcoatNormalScale=this.clearcoatNormalScale.toArray()),this.dispersion!==void 0&&(n.dispersion=this.dispersion),this.iridescence!==void 0&&(n.iridescence=this.iridescence),this.iridescenceIOR!==void 0&&(n.iridescenceIOR=this.iridescenceIOR),this.iridescenceThicknessRange!==void 0&&(n.iridescenceThicknessRange=this.iridescenceThicknessRange),this.iridescenceMap&&this.iridescenceMap.isTexture&&(n.iridescenceMap=this.iridescenceMap.toJSON(e).uuid),this.iridescenceThicknessMap&&this.iridescenceThicknessMap.isTexture&&(n.iridescenceThicknessMap=this.iridescenceThicknessMap.toJSON(e).uuid),this.anisotropy!==void 0&&(n.anisotropy=this.anisotropy),this.anisotropyRotation!==void 0&&(n.anisotropyRotation=this.anisotropyRotation),this.anisotropyMap&&this.anisotropyMap.isTexture&&(n.anisotropyMap=this.anisotropyMap.toJSON(e).uuid),this.map&&this.map.isTexture&&(n.map=this.map.toJSON(e).uuid),this.matcap&&this.matcap.isTexture&&(n.matcap=this.matcap.toJSON(e).uuid),this.alphaMap&&this.alphaMap.isTexture&&(n.alphaMap=this.alphaMap.toJSON(e).uuid),this.lightMap&&this.lightMap.isTexture&&(n.lightMap=this.lightMap.toJSON(e).uuid,n.lightMapIntensity=this.lightMapIntensity),this.aoMap&&this.aoMap.isTexture&&(n.aoMap=this.aoMap.toJSON(e).uuid,n.aoMapIntensity=this.aoMapIntensity),this.bumpMap&&this.bumpMap.isTexture&&(n.bumpMap=this.bumpMap.toJSON(e).uuid,n.bumpScale=this.bumpScale),this.normalMap&&this.normalMap.isTexture&&(n.normalMap=this.normalMap.toJSON(e).uuid,n.normalMapType=this.normalMapType,n.normalScale=this.normalScale.toArray()),this.displacementMap&&this.displacementMap.isTexture&&(n.displacementMap=this.displacementMap.toJSON(e).uuid,n.displacementScale=this.displacementScale,n.displacementBias=this.displacementBias),this.roughnessMap&&this.roughnessMap.isTexture&&(n.roughnessMap=this.roughnessMap.toJSON(e).uuid),this.metalnessMap&&this.metalnessMap.isTexture&&(n.metalnessMap=this.metalnessMap.toJSON(e).uuid),this.emissiveMap&&this.emissiveMap.isTexture&&(n.emissiveMap=this.emissiveMap.toJSON(e).uuid),this.specularMap&&this.specularMap.isTexture&&(n.specularMap=this.specularMap.toJSON(e).uuid),this.specularIntensityMap&&this.specularIntensityMap.isTexture&&(n.specularIntensityMap=this.specularIntensityMap.toJSON(e).uuid),this.specularColorMap&&this.specularColorMap.isTexture&&(n.specularColorMap=this.specularColorMap.toJSON(e).uuid),this.envMap&&this.envMap.isTexture&&(n.envMap=this.envMap.toJSON(e).uuid,this.combine!==void 0&&(n.combine=this.combine)),this.envMapRotation!==void 0&&(n.envMapRotation=this.envMapRotation.toArray()),this.envMapIntensity!==void 0&&(n.envMapIntensity=this.envMapIntensity),this.reflectivity!==void 0&&(n.reflectivity=this.reflectivity),this.refractionRatio!==void 0&&(n.refractionRatio=this.refractionRatio),this.gradientMap&&this.gradientMap.isTexture&&(n.gradientMap=this.gradientMap.toJSON(e).uuid),this.transmission!==void 0&&(n.transmission=this.transmission),this.transmissionMap&&this.transmissionMap.isTexture&&(n.transmissionMap=this.transmissionMap.toJSON(e).uuid),this.thickness!==void 0&&(n.thickness=this.thickness),this.thicknessMap&&this.thicknessMap.isTexture&&(n.thicknessMap=this.thicknessMap.toJSON(e).uuid),this.attenuationDistance!==void 0&&this.attenuationDistance!==1/0&&(n.attenuationDistance=this.attenuationDistance),this.attenuationColor!==void 0&&(n.attenuationColor=this.attenuationColor.getHex()),this.size!==void 0&&(n.size=this.size),this.shadowSide!==null&&(n.shadowSide=this.shadowSide),this.sizeAttenuation!==void 0&&(n.sizeAttenuation=this.sizeAttenuation),this.blending!==1&&(n.blending=this.blending),this.side!==0&&(n.side=this.side),this.vertexColors===!0&&(n.vertexColors=!0),this.opacity<1&&(n.opacity=this.opacity),this.transparent===!0&&(n.transparent=!0),this.blendSrc!==204&&(n.blendSrc=this.blendSrc),this.blendDst!==205&&(n.blendDst=this.blendDst),this.blendEquation!==100&&(n.blendEquation=this.blendEquation),this.blendSrcAlpha!==null&&(n.blendSrcAlpha=this.blendSrcAlpha),this.blendDstAlpha!==null&&(n.blendDstAlpha=this.blendDstAlpha),this.blendEquationAlpha!==null&&(n.blendEquationAlpha=this.blendEquationAlpha),this.blendColor&&this.blendColor.isColor&&(n.blendColor=this.blendColor.getHex()),this.blendAlpha!==0&&(n.blendAlpha=this.blendAlpha),this.depthFunc!==3&&(n.depthFunc=this.depthFunc),this.depthTest===!1&&(n.depthTest=this.depthTest),this.depthWrite===!1&&(n.depthWrite=this.depthWrite),this.colorWrite===!1&&(n.colorWrite=this.colorWrite),this.stencilWriteMask!==255&&(n.stencilWriteMask=this.stencilWriteMask),this.stencilFunc!==519&&(n.stencilFunc=this.stencilFunc),this.stencilRef!==0&&(n.stencilRef=this.stencilRef),this.stencilFuncMask!==255&&(n.stencilFuncMask=this.stencilFuncMask),this.stencilFail!==7680&&(n.stencilFail=this.stencilFail),this.stencilZFail!==7680&&(n.stencilZFail=this.stencilZFail),this.stencilZPass!==7680&&(n.stencilZPass=this.stencilZPass),this.stencilWrite===!0&&(n.stencilWrite=this.stencilWrite),this.rotation!==void 0&&this.rotation!==0&&(n.rotation=this.rotation),this.polygonOffset===!0&&(n.polygonOffset=!0),this.polygonOffsetFactor!==0&&(n.polygonOffsetFactor=this.polygonOffsetFactor),this.polygonOffsetUnits!==0&&(n.polygonOffsetUnits=this.polygonOffsetUnits),this.linewidth!==void 0&&this.linewidth!==1&&(n.linewidth=this.linewidth),this.dashSize!==void 0&&(n.dashSize=this.dashSize),this.gapSize!==void 0&&(n.gapSize=this.gapSize),this.scale!==void 0&&(n.scale=this.scale),this.dithering===!0&&(n.dithering=!0),this.alphaTest>0&&(n.alphaTest=this.alphaTest),this.alphaHash===!0&&(n.alphaHash=!0),this.alphaToCoverage===!0&&(n.alphaToCoverage=!0),this.premultipliedAlpha===!0&&(n.premultipliedAlpha=!0),this.forceSinglePass===!0&&(n.forceSinglePass=!0),this.wireframe===!0&&(n.wireframe=!0),this.wireframeLinewidth>1&&(n.wireframeLinewidth=this.wireframeLinewidth),this.wireframeLinecap!=="round"&&(n.wireframeLinecap=this.wireframeLinecap),this.wireframeLinejoin!=="round"&&(n.wireframeLinejoin=this.wireframeLinejoin),this.flatShading===!0&&(n.flatShading=!0),this.visible===!1&&(n.visible=!1),this.toneMapped===!1&&(n.toneMapped=!1),this.fog===!1&&(n.fog=!1),Object.keys(this.userData).length>0&&(n.userData=this.userData);function r(s){const a=[];for(const o in s){const u=s[o];delete u.metadata,a.push(u)}return a}if(t){const s=r(e.textures),a=r(e.images);s.length>0&&(n.textures=s),a.length>0&&(n.images=a)}return n}clone(){return new this.constructor().copy(this)}copy(e){this.name=e.name,this.blending=e.blending,this.side=e.side,this.vertexColors=e.vertexColors,this.opacity=e.opacity,this.transparent=e.transparent,this.blendSrc=e.blendSrc,this.blendDst=e.blendDst,this.blendEquation=e.blendEquation,this.blendSrcAlpha=e.blendSrcAlpha,this.blendDstAlpha=e.blendDstAlpha,this.blendEquationAlpha=e.blendEquationAlpha,this.blendColor.copy(e.blendColor),this.blendAlpha=e.blendAlpha,this.depthFunc=e.depthFunc,this.depthTest=e.depthTest,this.depthWrite=e.depthWrite,this.stencilWriteMask=e.stencilWriteMask,this.stencilFunc=e.stencilFunc,this.stencilRef=e.stencilRef,this.stencilFuncMask=e.stencilFuncMask,this.stencilFail=e.stencilFail,this.stencilZFail=e.stencilZFail,this.stencilZPass=e.stencilZPass,this.stencilWrite=e.stencilWrite;const t=e.clippingPlanes;let n=null;if(t!==null){const r=t.length;n=new Array(r);for(let s=0;s!==r;++s)n[s]=t[s].clone()}return this.clippingPlanes=n,this.clipIntersection=e.clipIntersection,this.clipShadows=e.clipShadows,this.shadowSide=e.shadowSide,this.colorWrite=e.colorWrite,this.precision=e.precision,this.polygonOffset=e.polygonOffset,this.polygonOffsetFactor=e.polygonOffsetFactor,this.polygonOffsetUnits=e.polygonOffsetUnits,this.dithering=e.dithering,this.alphaTest=e.alphaTest,this.alphaHash=e.alphaHash,this.alphaToCoverage=e.alphaToCoverage,this.premultipliedAlpha=e.premultipliedAlpha,this.forceSinglePass=e.forceSinglePass,this.visible=e.visible,this.toneMapped=e.toneMapped,this.userData=JSON.parse(JSON.stringify(e.userData)),this}dispose(){this.dispatchEvent({type:"dispose"})}set needsUpdate(e){e===!0&&this.version++}}class Ds extends ti{constructor(e){super(),this.isMeshBasicMaterial=!0,this.type="MeshBasicMaterial",this.color=new Ke(16777215),this.map=null,this.lightMap=null,this.lightMapIntensity=1,this.aoMap=null,this.aoMapIntensity=1,this.specularMap=null,this.alphaMap=null,this.envMap=null,this.envMapRotation=new $t,this.combine=0,this.reflectivity=1,this.refractionRatio=.98,this.wireframe=!1,this.wireframeLinewidth=1,this.wireframeLinecap="round",this.wireframeLinejoin="round",this.fog=!0,this.setValues(e)}copy(e){return super.copy(e),this.color.copy(e.color),this.map=e.map,this.lightMap=e.lightMap,this.lightMapIntensity=e.lightMapIntensity,this.aoMap=e.aoMap,this.aoMapIntensity=e.aoMapIntensity,this.specularMap=e.specularMap,this.alphaMap=e.alphaMap,this.envMap=e.envMap,this.envMapRotation.copy(e.envMapRotation),this.combine=e.combine,this.reflectivity=e.reflectivity,this.refractionRatio=e.refractionRatio,this.wireframe=e.wireframe,this.wireframeLinewidth=e.wireframeLinewidth,this.wireframeLinecap=e.wireframeLinecap,this.wireframeLinejoin=e.wireframeLinejoin,this.fog=e.fog,this}}const at=new q,di=new qe;let La=0;class Bt{constructor(e,t,n=!1){if(Array.isArray(e))throw new TypeError("THREE.BufferAttribute: array should be a Typed Array.");this.isBufferAttribute=!0,Object.defineProperty(this,"id",{value:La++}),this.name="",this.array=e,this.itemSize=t,this.count=e!==void 0?e.length/t:0,this.normalized=n,this.usage=35044,this.updateRanges=[],this.gpuType=1015,this.version=0}onUploadCallback(){}set needsUpdate(e){e===!0&&this.version++}setUsage(e){return this.usage=e,this}addUpdateRange(e,t){this.updateRanges.push({start:e,count:t})}clearUpdateRanges(){this.updateRanges.length=0}copy(e){return this.name=e.name,this.array=new e.array.constructor(e.array),this.itemSize=e.itemSize,this.count=e.count,this.normalized=e.normalized,this.usage=e.usage,this.gpuType=e.gpuType,this}copyAt(e,t,n){e*=this.itemSize,n*=t.itemSize;for(let r=0,s=this.itemSize;r<s;r++)this.array[e+r]=t.array[n+r];return this}copyArray(e){return this.array.set(e),this}applyMatrix3(e){if(this.itemSize===2)for(let t=0,n=this.count;t<n;t++)di.fromBufferAttribute(this,t),di.applyMatrix3(e),this.setXY(t,di.x,di.y);else if(this.itemSize===3)for(let t=0,n=this.count;t<n;t++)at.fromBufferAttribute(this,t),at.applyMatrix3(e),this.setXYZ(t,at.x,at.y,at.z);return this}applyMatrix4(e){for(let t=0,n=this.count;t<n;t++)at.fromBufferAttribute(this,t),at.applyMatrix4(e),this.setXYZ(t,at.x,at.y,at.z);return this}applyNormalMatrix(e){for(let t=0,n=this.count;t<n;t++)at.fromBufferAttribute(this,t),at.applyNormalMatrix(e),this.setXYZ(t,at.x,at.y,at.z);return this}transformDirection(e){for(let t=0,n=this.count;t<n;t++)at.fromBufferAttribute(this,t),at.transformDirection(e),this.setXYZ(t,at.x,at.y,at.z);return this}set(e,t=0){return this.array.set(e,t),this}getComponent(e,t){let n=this.array[e*this.itemSize+t];return this.normalized&&(n=Un(n,this.array)),n}setComponent(e,t,n){return this.normalized&&(n=gt(n,this.array)),this.array[e*this.itemSize+t]=n,this}getX(e){let t=this.array[e*this.itemSize];return this.normalized&&(t=Un(t,this.array)),t}setX(e,t){return this.normalized&&(t=gt(t,this.array)),this.array[e*this.itemSize]=t,this}getY(e){let t=this.array[e*this.itemSize+1];return this.normalized&&(t=Un(t,this.array)),t}setY(e,t){return this.normalized&&(t=gt(t,this.array)),this.array[e*this.itemSize+1]=t,this}getZ(e){let t=this.array[e*this.itemSize+2];return this.normalized&&(t=Un(t,this.array)),t}setZ(e,t){return this.normalized&&(t=gt(t,this.array)),this.array[e*this.itemSize+2]=t,this}getW(e){let t=this.array[e*this.itemSize+3];return this.normalized&&(t=Un(t,this.array)),t}setW(e,t){return this.normalized&&(t=gt(t,this.array)),this.array[e*this.itemSize+3]=t,this}setXY(e,t,n){return e*=this.itemSize,this.normalized&&(t=gt(t,this.array),n=gt(n,this.array)),this.array[e+0]=t,this.array[e+1]=n,this}setXYZ(e,t,n,r){return e*=this.itemSize,this.normalized&&(t=gt(t,this.array),n=gt(n,this.array),r=gt(r,this.array)),this.array[e+0]=t,this.array[e+1]=n,this.array[e+2]=r,this}setXYZW(e,t,n,r,s){return e*=this.itemSize,this.normalized&&(t=gt(t,this.array),n=gt(n,this.array),r=gt(r,this.array),s=gt(s,this.array)),this.array[e+0]=t,this.array[e+1]=n,this.array[e+2]=r,this.array[e+3]=s,this}onUpload(e){return this.onUploadCallback=e,this}clone(){return new this.constructor(this.array,this.itemSize).copy(this)}toJSON(){const e={itemSize:this.itemSize,type:this.array.constructor.name,array:Array.from(this.array),normalized:this.normalized};return this.name!==""&&(e.name=this.name),this.usage!==35044&&(e.usage=this.usage),e}}class Is extends Bt{constructor(e,t,n){super(new Uint16Array(e),t,n)}}class Us extends Bt{constructor(e,t,n){super(new Uint32Array(e),t,n)}}class Yt extends Bt{constructor(e,t,n){super(new Float32Array(e),t,n)}}let Fa=0;const bt=new et,er=new St,Rn=new q,yt=new _n,qn=new _n,ct=new q;class Kt extends On{constructor(){super(),this.isBufferGeometry=!0,Object.defineProperty(this,"id",{value:Fa++}),this.uuid=Gn(),this.name="",this.type="BufferGeometry",this.index=null,this.indirect=null,this.attributes={},this.morphAttributes={},this.morphTargetsRelative=!1,this.groups=[],this.boundingBox=null,this.boundingSphere=null,this.drawRange={start:0,count:1/0},this.userData={}}getIndex(){return this.index}setIndex(e){return Array.isArray(e)?this.index=new(ws(e)?Us:Is)(e,1):this.index=e,this}setIndirect(e){return this.indirect=e,this}getIndirect(){return this.indirect}getAttribute(e){return this.attributes[e]}setAttribute(e,t){return this.attributes[e]=t,this}deleteAttribute(e){return delete this.attributes[e],this}hasAttribute(e){return this.attributes[e]!==void 0}addGroup(e,t,n=0){this.groups.push({start:e,count:t,materialIndex:n})}clearGroups(){this.groups=[]}setDrawRange(e,t){this.drawRange.start=e,this.drawRange.count=t}applyMatrix4(e){const t=this.attributes.position;t!==void 0&&(t.applyMatrix4(e),t.needsUpdate=!0);const n=this.attributes.normal;if(n!==void 0){const s=new Ue().getNormalMatrix(e);n.applyNormalMatrix(s),n.needsUpdate=!0}const r=this.attributes.tangent;return r!==void 0&&(r.transformDirection(e),r.needsUpdate=!0),this.boundingBox!==null&&this.computeBoundingBox(),this.boundingSphere!==null&&this.computeBoundingSphere(),this}applyQuaternion(e){return bt.makeRotationFromQuaternion(e),this.applyMatrix4(bt),this}rotateX(e){return bt.makeRotationX(e),this.applyMatrix4(bt),this}rotateY(e){return bt.makeRotationY(e),this.applyMatrix4(bt),this}rotateZ(e){return bt.makeRotationZ(e),this.applyMatrix4(bt),this}translate(e,t,n){return bt.makeTranslation(e,t,n),this.applyMatrix4(bt),this}scale(e,t,n){return bt.makeScale(e,t,n),this.applyMatrix4(bt),this}lookAt(e){return er.lookAt(e),er.updateMatrix(),this.applyMatrix4(er.matrix),this}center(){return this.computeBoundingBox(),this.boundingBox.getCenter(Rn).negate(),this.translate(Rn.x,Rn.y,Rn.z),this}setFromPoints(e){const t=this.getAttribute("position");if(t===void 0){const n=[];for(let r=0,s=e.length;r<s;r++){const a=e[r];n.push(a.x,a.y,a.z||0)}this.setAttribute("position",new Yt(n,3))}else{const n=Math.min(e.length,t.count);for(let r=0;r<n;r++){const s=e[r];t.setXYZ(r,s.x,s.y,s.z||0)}e.length>t.count&&console.warn("THREE.BufferGeometry: Buffer size too small for points data. Use .dispose() and create a new geometry."),t.needsUpdate=!0}return this}computeBoundingBox(){this.boundingBox===null&&(this.boundingBox=new _n);const e=this.attributes.position,t=this.morphAttributes.position;if(e&&e.isGLBufferAttribute){console.error("THREE.BufferGeometry.computeBoundingBox(): GLBufferAttribute requires a manual bounding box.",this),this.boundingBox.set(new q(-1/0,-1/0,-1/0),new q(1/0,1/0,1/0));return}if(e!==void 0){if(this.boundingBox.setFromBufferAttribute(e),t)for(let n=0,r=t.length;n<r;n++){const s=t[n];yt.setFromBufferAttribute(s),this.morphTargetsRelative?(ct.addVectors(this.boundingBox.min,yt.min),this.boundingBox.expandByPoint(ct),ct.addVectors(this.boundingBox.max,yt.max),this.boundingBox.expandByPoint(ct)):(this.boundingBox.expandByPoint(yt.min),this.boundingBox.expandByPoint(yt.max))}}else this.boundingBox.makeEmpty();(isNaN(this.boundingBox.min.x)||isNaN(this.boundingBox.min.y)||isNaN(this.boundingBox.min.z))&&console.error('THREE.BufferGeometry.computeBoundingBox(): Computed min/max have NaN values. The "position" attribute is likely to have NaN values.',this)}computeBoundingSphere(){this.boundingSphere===null&&(this.boundingSphere=new zn);const e=this.attributes.position,t=this.morphAttributes.position;if(e&&e.isGLBufferAttribute){console.error("THREE.BufferGeometry.computeBoundingSphere(): GLBufferAttribute requires a manual bounding sphere.",this),this.boundingSphere.set(new q,1/0);return}if(e){const n=this.boundingSphere.center;if(yt.setFromBufferAttribute(e),t)for(let s=0,a=t.length;s<a;s++){const o=t[s];qn.setFromBufferAttribute(o),this.morphTargetsRelative?(ct.addVectors(yt.min,qn.min),yt.expandByPoint(ct),ct.addVectors(yt.max,qn.max),yt.expandByPoint(ct)):(yt.expandByPoint(qn.min),yt.expandByPoint(qn.max))}yt.getCenter(n);let r=0;for(let s=0,a=e.count;s<a;s++)ct.fromBufferAttribute(e,s),r=Math.max(r,n.distanceToSquared(ct));if(t)for(let s=0,a=t.length;s<a;s++){const o=t[s],u=this.morphTargetsRelative;for(let f=0,c=o.count;f<c;f++)ct.fromBufferAttribute(o,f),u&&(Rn.fromBufferAttribute(e,f),ct.add(Rn)),r=Math.max(r,n.distanceToSquared(ct))}this.boundingSphere.radius=Math.sqrt(r),isNaN(this.boundingSphere.radius)&&console.error('THREE.BufferGeometry.computeBoundingSphere(): Computed radius is NaN. The "position" attribute is likely to have NaN values.',this)}}computeTangents(){const e=this.index,t=this.attributes;if(e===null||t.position===void 0||t.normal===void 0||t.uv===void 0){console.error("THREE.BufferGeometry: .computeTangents() failed. Missing required attributes (index, position, normal or uv)");return}const n=t.position,r=t.normal,s=t.uv;this.hasAttribute("tangent")===!1&&this.setAttribute("tangent",new Bt(new Float32Array(4*n.count),4));const a=this.getAttribute("tangent"),o=[],u=[];for(let G=0;G<n.count;G++)o[G]=new q,u[G]=new q;const f=new q,c=new q,p=new q,m=new qe,g=new qe,S=new qe,T=new q,_=new q;function d(G,A,y){f.fromBufferAttribute(n,G),c.fromBufferAttribute(n,A),p.fromBufferAttribute(n,y),m.fromBufferAttribute(s,G),g.fromBufferAttribute(s,A),S.fromBufferAttribute(s,y),c.sub(f),p.sub(f),g.sub(m),S.sub(m);const N=1/(g.x*S.y-S.x*g.y);isFinite(N)&&(T.copy(c).multiplyScalar(S.y).addScaledVector(p,-g.y).multiplyScalar(N),_.copy(p).multiplyScalar(g.x).addScaledVector(c,-S.x).multiplyScalar(N),o[G].add(T),o[A].add(T),o[y].add(T),u[G].add(_),u[A].add(_),u[y].add(_))}let U=this.groups;U.length===0&&(U=[{start:0,count:e.count}]);for(let G=0,A=U.length;G<A;++G){const y=U[G],N=y.start,ee=y.count;for(let Y=N,Q=N+ee;Y<Q;Y+=3)d(e.getX(Y+0),e.getX(Y+1),e.getX(Y+2))}const C=new q,R=new q,z=new q,L=new q;function F(G){z.fromBufferAttribute(r,G),L.copy(z);const A=o[G];C.copy(A),C.sub(z.multiplyScalar(z.dot(A))).normalize(),R.crossVectors(L,A);const N=R.dot(u[G])<0?-1:1;a.setXYZW(G,C.x,C.y,C.z,N)}for(let G=0,A=U.length;G<A;++G){const y=U[G],N=y.start,ee=y.count;for(let Y=N,Q=N+ee;Y<Q;Y+=3)F(e.getX(Y+0)),F(e.getX(Y+1)),F(e.getX(Y+2))}}computeVertexNormals(){const e=this.index,t=this.getAttribute("position");if(t!==void 0){let n=this.getAttribute("normal");if(n===void 0)n=new Bt(new Float32Array(t.count*3),3),this.setAttribute("normal",n);else for(let m=0,g=n.count;m<g;m++)n.setXYZ(m,0,0,0);const r=new q,s=new q,a=new q,o=new q,u=new q,f=new q,c=new q,p=new q;if(e)for(let m=0,g=e.count;m<g;m+=3){const S=e.getX(m+0),T=e.getX(m+1),_=e.getX(m+2);r.fromBufferAttribute(t,S),s.fromBufferAttribute(t,T),a.fromBufferAttribute(t,_),c.subVectors(a,s),p.subVectors(r,s),c.cross(p),o.fromBufferAttribute(n,S),u.fromBufferAttribute(n,T),f.fromBufferAttribute(n,_),o.add(c),u.add(c),f.add(c),n.setXYZ(S,o.x,o.y,o.z),n.setXYZ(T,u.x,u.y,u.z),n.setXYZ(_,f.x,f.y,f.z)}else for(let m=0,g=t.count;m<g;m+=3)r.fromBufferAttribute(t,m+0),s.fromBufferAttribute(t,m+1),a.fromBufferAttribute(t,m+2),c.subVectors(a,s),p.subVectors(r,s),c.cross(p),n.setXYZ(m+0,c.x,c.y,c.z),n.setXYZ(m+1,c.x,c.y,c.z),n.setXYZ(m+2,c.x,c.y,c.z);this.normalizeNormals(),n.needsUpdate=!0}}normalizeNormals(){const e=this.attributes.normal;for(let t=0,n=e.count;t<n;t++)ct.fromBufferAttribute(e,t),ct.normalize(),e.setXYZ(t,ct.x,ct.y,ct.z)}toNonIndexed(){function e(o,u){const f=o.array,c=o.itemSize,p=o.normalized,m=new f.constructor(u.length*c);let g=0,S=0;for(let T=0,_=u.length;T<_;T++){o.isInterleavedBufferAttribute?g=u[T]*o.data.stride+o.offset:g=u[T]*c;for(let d=0;d<c;d++)m[S++]=f[g++]}return new Bt(m,c,p)}if(this.index===null)return console.warn("THREE.BufferGeometry.toNonIndexed(): BufferGeometry is already non-indexed."),this;const t=new Kt,n=this.index.array,r=this.attributes;for(const o in r){const u=r[o],f=e(u,n);t.setAttribute(o,f)}const s=this.morphAttributes;for(const o in s){const u=[],f=s[o];for(let c=0,p=f.length;c<p;c++){const m=f[c],g=e(m,n);u.push(g)}t.morphAttributes[o]=u}t.morphTargetsRelative=this.morphTargetsRelative;const a=this.groups;for(let o=0,u=a.length;o<u;o++){const f=a[o];t.addGroup(f.start,f.count,f.materialIndex)}return t}toJSON(){const e={metadata:{version:4.6,type:"BufferGeometry",generator:"BufferGeometry.toJSON"}};if(e.uuid=this.uuid,e.type=this.type,this.name!==""&&(e.name=this.name),Object.keys(this.userData).length>0&&(e.userData=this.userData),this.parameters!==void 0){const u=this.parameters;for(const f in u)u[f]!==void 0&&(e[f]=u[f]);return e}e.data={attributes:{}};const t=this.index;t!==null&&(e.data.index={type:t.array.constructor.name,array:Array.prototype.slice.call(t.array)});const n=this.attributes;for(const u in n){const f=n[u];e.data.attributes[u]=f.toJSON(e.data)}const r={};let s=!1;for(const u in this.morphAttributes){const f=this.morphAttributes[u],c=[];for(let p=0,m=f.length;p<m;p++){const g=f[p];c.push(g.toJSON(e.data))}c.length>0&&(r[u]=c,s=!0)}s&&(e.data.morphAttributes=r,e.data.morphTargetsRelative=this.morphTargetsRelative);const a=this.groups;a.length>0&&(e.data.groups=JSON.parse(JSON.stringify(a)));const o=this.boundingSphere;return o!==null&&(e.data.boundingSphere={center:o.center.toArray(),radius:o.radius}),e}clone(){return new this.constructor().copy(this)}copy(e){this.index=null,this.attributes={},this.morphAttributes={},this.groups=[],this.boundingBox=null,this.boundingSphere=null;const t={};this.name=e.name;const n=e.index;n!==null&&this.setIndex(n.clone());const r=e.attributes;for(const f in r){const c=r[f];this.setAttribute(f,c.clone(t))}const s=e.morphAttributes;for(const f in s){const c=[],p=s[f];for(let m=0,g=p.length;m<g;m++)c.push(p[m].clone(t));this.morphAttributes[f]=c}this.morphTargetsRelative=e.morphTargetsRelative;const a=e.groups;for(let f=0,c=a.length;f<c;f++){const p=a[f];this.addGroup(p.start,p.count,p.materialIndex)}const o=e.boundingBox;o!==null&&(this.boundingBox=o.clone());const u=e.boundingSphere;return u!==null&&(this.boundingSphere=u.clone()),this.drawRange.start=e.drawRange.start,this.drawRange.count=e.drawRange.count,this.userData=e.userData,this}dispose(){this.dispatchEvent({type:"dispose"})}}const Hr=new et,ln=new _r,pi=new zn,kr=new q,mi=new q,_i=new q,gi=new q,tr=new q,xi=new q,Wr=new q,vi=new q;class Nt extends St{constructor(e=new Kt,t=new Ds){super(),this.isMesh=!0,this.type="Mesh",this.geometry=e,this.material=t,this.morphTargetDictionary=void 0,this.morphTargetInfluences=void 0,this.updateMorphTargets()}copy(e,t){return super.copy(e,t),e.morphTargetInfluences!==void 0&&(this.morphTargetInfluences=e.morphTargetInfluences.slice()),e.morphTargetDictionary!==void 0&&(this.morphTargetDictionary=Object.assign({},e.morphTargetDictionary)),this.material=Array.isArray(e.material)?e.material.slice():e.material,this.geometry=e.geometry,this}updateMorphTargets(){const t=this.geometry.morphAttributes,n=Object.keys(t);if(n.length>0){const r=t[n[0]];if(r!==void 0){this.morphTargetInfluences=[],this.morphTargetDictionary={};for(let s=0,a=r.length;s<a;s++){const o=r[s].name||String(s);this.morphTargetInfluences.push(0),this.morphTargetDictionary[o]=s}}}}getVertexPosition(e,t){const n=this.geometry,r=n.attributes.position,s=n.morphAttributes.position,a=n.morphTargetsRelative;t.fromBufferAttribute(r,e);const o=this.morphTargetInfluences;if(s&&o){xi.set(0,0,0);for(let u=0,f=s.length;u<f;u++){const c=o[u],p=s[u];c!==0&&(tr.fromBufferAttribute(p,e),a?xi.addScaledVector(tr,c):xi.addScaledVector(tr.sub(t),c))}t.add(xi)}return t}raycast(e,t){const n=this.geometry,r=this.material,s=this.matrixWorld;r!==void 0&&(n.boundingSphere===null&&n.computeBoundingSphere(),pi.copy(n.boundingSphere),pi.applyMatrix4(s),ln.copy(e.ray).recast(e.near),!(pi.containsPoint(ln.origin)===!1&&(ln.intersectSphere(pi,kr)===null||ln.origin.distanceToSquared(kr)>(e.far-e.near)**2))&&(Hr.copy(s).invert(),ln.copy(e.ray).applyMatrix4(Hr),!(n.boundingBox!==null&&ln.intersectsBox(n.boundingBox)===!1)&&this._computeIntersections(e,t,ln)))}_computeIntersections(e,t,n){let r;const s=this.geometry,a=this.material,o=s.index,u=s.attributes.position,f=s.attributes.uv,c=s.attributes.uv1,p=s.attributes.normal,m=s.groups,g=s.drawRange;if(o!==null)if(Array.isArray(a))for(let S=0,T=m.length;S<T;S++){const _=m[S],d=a[_.materialIndex],U=Math.max(_.start,g.start),C=Math.min(o.count,Math.min(_.start+_.count,g.start+g.count));for(let R=U,z=C;R<z;R+=3){const L=o.getX(R),F=o.getX(R+1),G=o.getX(R+2);r=Si(this,d,e,n,f,c,p,L,F,G),r&&(r.faceIndex=Math.floor(R/3),r.face.materialIndex=_.materialIndex,t.push(r))}}else{const S=Math.max(0,g.start),T=Math.min(o.count,g.start+g.count);for(let _=S,d=T;_<d;_+=3){const U=o.getX(_),C=o.getX(_+1),R=o.getX(_+2);r=Si(this,a,e,n,f,c,p,U,C,R),r&&(r.faceIndex=Math.floor(_/3),t.push(r))}}else if(u!==void 0)if(Array.isArray(a))for(let S=0,T=m.length;S<T;S++){const _=m[S],d=a[_.materialIndex],U=Math.max(_.start,g.start),C=Math.min(u.count,Math.min(_.start+_.count,g.start+g.count));for(let R=U,z=C;R<z;R+=3){const L=R,F=R+1,G=R+2;r=Si(this,d,e,n,f,c,p,L,F,G),r&&(r.faceIndex=Math.floor(R/3),r.face.materialIndex=_.materialIndex,t.push(r))}}else{const S=Math.max(0,g.start),T=Math.min(u.count,g.start+g.count);for(let _=S,d=T;_<d;_+=3){const U=_,C=_+1,R=_+2;r=Si(this,a,e,n,f,c,p,U,C,R),r&&(r.faceIndex=Math.floor(_/3),t.push(r))}}}}function Na(i,e,t,n,r,s,a,o){let u;if(e.side===1?u=n.intersectTriangle(a,s,r,!0,o):u=n.intersectTriangle(r,s,a,e.side===0,o),u===null)return null;vi.copy(o),vi.applyMatrix4(i.matrixWorld);const f=t.ray.origin.distanceTo(vi);return f<t.near||f>t.far?null:{distance:f,point:vi.clone(),object:i}}function Si(i,e,t,n,r,s,a,o,u,f){i.getVertexPosition(o,mi),i.getVertexPosition(u,_i),i.getVertexPosition(f,gi);const c=Na(i,e,t,n,mi,_i,gi,Wr);if(c){const p=new q;Ft.getBarycoord(Wr,mi,_i,gi,p),r&&(c.uv=Ft.getInterpolatedAttribute(r,o,u,f,p,new qe)),s&&(c.uv1=Ft.getInterpolatedAttribute(s,o,u,f,p,new qe)),a&&(c.normal=Ft.getInterpolatedAttribute(a,o,u,f,p,new q),c.normal.dot(n.direction)>0&&c.normal.multiplyScalar(-1));const m={a:o,b:u,c:f,normal:new q,materialIndex:0};Ft.getNormal(mi,_i,gi,m.normal),c.face=m,c.barycoord=p}return c}class ni extends Kt{constructor(e=1,t=1,n=1,r=1,s=1,a=1){super(),this.type="BoxGeometry",this.parameters={width:e,height:t,depth:n,widthSegments:r,heightSegments:s,depthSegments:a};const o=this;r=Math.floor(r),s=Math.floor(s),a=Math.floor(a);const u=[],f=[],c=[],p=[];let m=0,g=0;S("z","y","x",-1,-1,n,t,e,a,s,0),S("z","y","x",1,-1,n,t,-e,a,s,1),S("x","z","y",1,1,e,n,t,r,a,2),S("x","z","y",1,-1,e,n,-t,r,a,3),S("x","y","z",1,-1,e,t,n,r,s,4),S("x","y","z",-1,-1,e,t,-n,r,s,5),this.setIndex(u),this.setAttribute("position",new Yt(f,3)),this.setAttribute("normal",new Yt(c,3)),this.setAttribute("uv",new Yt(p,2));function S(T,_,d,U,C,R,z,L,F,G,A){const y=R/F,N=z/G,ee=R/2,Y=z/2,Q=L/2,ie=F+1,j=G+1;let oe=0,K=0;const fe=new q;for(let _e=0;_e<j;_e++){const Ee=_e*N-Y;for(let Be=0;Be<ie;Be++){const Ye=Be*y-ee;fe[T]=Ye*U,fe[_]=Ee*C,fe[d]=Q,f.push(fe.x,fe.y,fe.z),fe[T]=0,fe[_]=0,fe[d]=L>0?1:-1,c.push(fe.x,fe.y,fe.z),p.push(Be/F),p.push(1-_e/G),oe+=1}}for(let _e=0;_e<G;_e++)for(let Ee=0;Ee<F;Ee++){const Be=m+Ee+ie*_e,Ye=m+Ee+ie*(_e+1),$=m+(Ee+1)+ie*(_e+1),re=m+(Ee+1)+ie*_e;u.push(Be,Ye,re),u.push(Ye,$,re),K+=6}o.addGroup(g,K,A),g+=K,m+=oe}}copy(e){return super.copy(e),this.parameters=Object.assign({},e.parameters),this}static fromJSON(e){return new ni(e.width,e.height,e.depth,e.widthSegments,e.heightSegments,e.depthSegments)}}function Bn(i){const e={};for(const t in i){e[t]={};for(const n in i[t]){const r=i[t][n];r&&(r.isColor||r.isMatrix3||r.isMatrix4||r.isVector2||r.isVector3||r.isVector4||r.isTexture||r.isQuaternion)?r.isRenderTargetTexture?(console.warn("UniformsUtils: Textures of render targets cannot be cloned via cloneUniforms() or mergeUniforms()."),e[t][n]=null):e[t][n]=r.clone():Array.isArray(r)?e[t][n]=r.slice():e[t][n]=r}}return e}function xt(i){const e={};for(let t=0;t<i.length;t++){const n=Bn(i[t]);for(const r in n)e[r]=n[r]}return e}function Ba(i){const e=[];for(let t=0;t<i.length;t++)e.push(i[t].clone());return e}function Ls(i){const e=i.getRenderTarget();return e===null?i.outputColorSpace:e.isXRRenderTarget===!0?e.texture.colorSpace:ke.workingColorSpace}const Oa={clone:Bn,merge:xt};var Ga=`void main() {
	gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );
}`,za=`void main() {
	gl_FragColor = vec4( 1.0, 0.0, 0.0, 1.0 );
}`;class nn extends ti{constructor(e){super(),this.isShaderMaterial=!0,this.type="ShaderMaterial",this.defines={},this.uniforms={},this.uniformsGroups=[],this.vertexShader=Ga,this.fragmentShader=za,this.linewidth=1,this.wireframe=!1,this.wireframeLinewidth=1,this.fog=!1,this.lights=!1,this.clipping=!1,this.forceSinglePass=!0,this.extensions={clipCullDistance:!1,multiDraw:!1},this.defaultAttributeValues={color:[1,1,1],uv:[0,0],uv1:[0,0]},this.index0AttributeName=void 0,this.uniformsNeedUpdate=!1,this.glslVersion=null,e!==void 0&&this.setValues(e)}copy(e){return super.copy(e),this.fragmentShader=e.fragmentShader,this.vertexShader=e.vertexShader,this.uniforms=Bn(e.uniforms),this.uniformsGroups=Ba(e.uniformsGroups),this.defines=Object.assign({},e.defines),this.wireframe=e.wireframe,this.wireframeLinewidth=e.wireframeLinewidth,this.fog=e.fog,this.lights=e.lights,this.clipping=e.clipping,this.extensions=Object.assign({},e.extensions),this.glslVersion=e.glslVersion,this}toJSON(e){const t=super.toJSON(e);t.glslVersion=this.glslVersion,t.uniforms={};for(const r in this.uniforms){const a=this.uniforms[r].value;a&&a.isTexture?t.uniforms[r]={type:"t",value:a.toJSON(e).uuid}:a&&a.isColor?t.uniforms[r]={type:"c",value:a.getHex()}:a&&a.isVector2?t.uniforms[r]={type:"v2",value:a.toArray()}:a&&a.isVector3?t.uniforms[r]={type:"v3",value:a.toArray()}:a&&a.isVector4?t.uniforms[r]={type:"v4",value:a.toArray()}:a&&a.isMatrix3?t.uniforms[r]={type:"m3",value:a.toArray()}:a&&a.isMatrix4?t.uniforms[r]={type:"m4",value:a.toArray()}:t.uniforms[r]={value:a}}Object.keys(this.defines).length>0&&(t.defines=this.defines),t.vertexShader=this.vertexShader,t.fragmentShader=this.fragmentShader,t.lights=this.lights,t.clipping=this.clipping;const n={};for(const r in this.extensions)this.extensions[r]===!0&&(n[r]=!0);return Object.keys(n).length>0&&(t.extensions=n),t}}class Fs extends St{constructor(){super(),this.isCamera=!0,this.type="Camera",this.matrixWorldInverse=new et,this.projectionMatrix=new et,this.projectionMatrixInverse=new et,this.coordinateSystem=2e3}copy(e,t){return super.copy(e,t),this.matrixWorldInverse.copy(e.matrixWorldInverse),this.projectionMatrix.copy(e.projectionMatrix),this.projectionMatrixInverse.copy(e.projectionMatrixInverse),this.coordinateSystem=e.coordinateSystem,this}getWorldDirection(e){return super.getWorldDirection(e).negate()}updateMatrixWorld(e){super.updateMatrixWorld(e),this.matrixWorldInverse.copy(this.matrixWorld).invert()}updateWorldMatrix(e,t){super.updateWorldMatrix(e,t),this.matrixWorldInverse.copy(this.matrixWorld).invert()}clone(){return new this.constructor().copy(this)}}const tn=new q,Xr=new qe,qr=new qe;class Lt extends Fs{constructor(e=50,t=1,n=.1,r=2e3){super(),this.isPerspectiveCamera=!0,this.type="PerspectiveCamera",this.fov=e,this.zoom=1,this.near=n,this.far=r,this.focus=10,this.aspect=t,this.view=null,this.filmGauge=35,this.filmOffset=0,this.updateProjectionMatrix()}copy(e,t){return super.copy(e,t),this.fov=e.fov,this.zoom=e.zoom,this.near=e.near,this.far=e.far,this.focus=e.focus,this.aspect=e.aspect,this.view=e.view===null?null:Object.assign({},e.view),this.filmGauge=e.filmGauge,this.filmOffset=e.filmOffset,this}setFocalLength(e){const t=.5*this.getFilmHeight()/e;this.fov=Jn*2*Math.atan(t),this.updateProjectionMatrix()}getFocalLength(){const e=Math.tan(Zn*.5*this.fov);return .5*this.getFilmHeight()/e}getEffectiveFOV(){return Jn*2*Math.atan(Math.tan(Zn*.5*this.fov)/this.zoom)}getFilmWidth(){return this.filmGauge*Math.min(this.aspect,1)}getFilmHeight(){return this.filmGauge/Math.max(this.aspect,1)}getViewBounds(e,t,n){tn.set(-1,-1,.5).applyMatrix4(this.projectionMatrixInverse),t.set(tn.x,tn.y).multiplyScalar(-e/tn.z),tn.set(1,1,.5).applyMatrix4(this.projectionMatrixInverse),n.set(tn.x,tn.y).multiplyScalar(-e/tn.z)}getViewSize(e,t){return this.getViewBounds(e,Xr,qr),t.subVectors(qr,Xr)}setViewOffset(e,t,n,r,s,a){this.aspect=e/t,this.view===null&&(this.view={enabled:!0,fullWidth:1,fullHeight:1,offsetX:0,offsetY:0,width:1,height:1}),this.view.enabled=!0,this.view.fullWidth=e,this.view.fullHeight=t,this.view.offsetX=n,this.view.offsetY=r,this.view.width=s,this.view.height=a,this.updateProjectionMatrix()}clearViewOffset(){this.view!==null&&(this.view.enabled=!1),this.updateProjectionMatrix()}updateProjectionMatrix(){const e=this.near;let t=e*Math.tan(Zn*.5*this.fov)/this.zoom,n=2*t,r=this.aspect*n,s=-.5*r;const a=this.view;if(this.view!==null&&this.view.enabled){const u=a.fullWidth,f=a.fullHeight;s+=a.offsetX*r/u,t-=a.offsetY*n/f,r*=a.width/u,n*=a.height/f}const o=this.filmOffset;o!==0&&(s+=e*o/this.getFilmWidth()),this.projectionMatrix.makePerspective(s,s+r,t,t-n,e,this.far,this.coordinateSystem),this.projectionMatrixInverse.copy(this.projectionMatrix).invert()}toJSON(e){const t=super.toJSON(e);return t.object.fov=this.fov,t.object.zoom=this.zoom,t.object.near=this.near,t.object.far=this.far,t.object.focus=this.focus,t.object.aspect=this.aspect,this.view!==null&&(t.object.view=Object.assign({},this.view)),t.object.filmGauge=this.filmGauge,t.object.filmOffset=this.filmOffset,t}}const wn=-90,Cn=1;class Va extends St{constructor(e,t,n){super(),this.type="CubeCamera",this.renderTarget=n,this.coordinateSystem=null,this.activeMipmapLevel=0;const r=new Lt(wn,Cn,e,t);r.layers=this.layers,this.add(r);const s=new Lt(wn,Cn,e,t);s.layers=this.layers,this.add(s);const a=new Lt(wn,Cn,e,t);a.layers=this.layers,this.add(a);const o=new Lt(wn,Cn,e,t);o.layers=this.layers,this.add(o);const u=new Lt(wn,Cn,e,t);u.layers=this.layers,this.add(u);const f=new Lt(wn,Cn,e,t);f.layers=this.layers,this.add(f)}updateCoordinateSystem(){const e=this.coordinateSystem,t=this.children.concat(),[n,r,s,a,o,u]=t;for(const f of t)this.remove(f);if(e===2e3)n.up.set(0,1,0),n.lookAt(1,0,0),r.up.set(0,1,0),r.lookAt(-1,0,0),s.up.set(0,0,-1),s.lookAt(0,1,0),a.up.set(0,0,1),a.lookAt(0,-1,0),o.up.set(0,1,0),o.lookAt(0,0,1),u.up.set(0,1,0),u.lookAt(0,0,-1);else if(e===2001)n.up.set(0,-1,0),n.lookAt(-1,0,0),r.up.set(0,-1,0),r.lookAt(1,0,0),s.up.set(0,0,1),s.lookAt(0,1,0),a.up.set(0,0,-1),a.lookAt(0,-1,0),o.up.set(0,-1,0),o.lookAt(0,0,1),u.up.set(0,-1,0),u.lookAt(0,0,-1);else throw new Error("THREE.CubeCamera.updateCoordinateSystem(): Invalid coordinate system: "+e);for(const f of t)this.add(f),f.updateMatrixWorld()}update(e,t){this.parent===null&&this.updateMatrixWorld();const{renderTarget:n,activeMipmapLevel:r}=this;this.coordinateSystem!==e.coordinateSystem&&(this.coordinateSystem=e.coordinateSystem,this.updateCoordinateSystem());const[s,a,o,u,f,c]=this.children,p=e.getRenderTarget(),m=e.getActiveCubeFace(),g=e.getActiveMipmapLevel(),S=e.xr.enabled;e.xr.enabled=!1;const T=n.texture.generateMipmaps;n.texture.generateMipmaps=!1,e.setRenderTarget(n,0,r),e.render(t,s),e.setRenderTarget(n,1,r),e.render(t,a),e.setRenderTarget(n,2,r),e.render(t,o),e.setRenderTarget(n,3,r),e.render(t,u),e.setRenderTarget(n,4,r),e.render(t,f),n.texture.generateMipmaps=T,e.setRenderTarget(n,5,r),e.render(t,c),e.setRenderTarget(p,m,g),e.xr.enabled=S,n.texture.needsPMREMUpdate=!0}}class Ns extends ht{constructor(e=[],t=301,n,r,s,a,o,u,f,c){super(e,t,n,r,s,a,o,u,f,c),this.isCubeTexture=!0,this.flipY=!1}get images(){return this.image}set images(e){this.image=e}}class Ha extends mn{constructor(e=1,t={}){super(e,e,t),this.isWebGLCubeRenderTarget=!0;const n={width:e,height:e,depth:1},r=[n,n,n,n,n,n];this.texture=new Ns(r,t.mapping,t.wrapS,t.wrapT,t.magFilter,t.minFilter,t.format,t.type,t.anisotropy,t.colorSpace),this.texture.isRenderTargetTexture=!0,this.texture.generateMipmaps=t.generateMipmaps!==void 0?t.generateMipmaps:!1,this.texture.minFilter=t.minFilter!==void 0?t.minFilter:1006}fromEquirectangularTexture(e,t){this.texture.type=t.type,this.texture.colorSpace=t.colorSpace,this.texture.generateMipmaps=t.generateMipmaps,this.texture.minFilter=t.minFilter,this.texture.magFilter=t.magFilter;const n={uniforms:{tEquirect:{value:null}},vertexShader:`

				varying vec3 vWorldDirection;

				vec3 transformDirection( in vec3 dir, in mat4 matrix ) {

					return normalize( ( matrix * vec4( dir, 0.0 ) ).xyz );

				}

				void main() {

					vWorldDirection = transformDirection( position, modelMatrix );

					#include <begin_vertex>
					#include <project_vertex>

				}
			`,fragmentShader:`

				uniform sampler2D tEquirect;

				varying vec3 vWorldDirection;

				#include <common>

				void main() {

					vec3 direction = normalize( vWorldDirection );

					vec2 sampleUV = equirectUv( direction );

					gl_FragColor = texture2D( tEquirect, sampleUV );

				}
			`},r=new ni(5,5,5),s=new nn({name:"CubemapFromEquirect",uniforms:Bn(n.uniforms),vertexShader:n.vertexShader,fragmentShader:n.fragmentShader,side:1,blending:0});s.uniforms.tEquirect.value=t;const a=new Nt(r,s),o=t.minFilter;return t.minFilter===1008&&(t.minFilter=1006),new Va(1,10,this).update(e,a),t.minFilter=o,a.geometry.dispose(),a.material.dispose(),this}clear(e,t=!0,n=!0,r=!0){const s=e.getRenderTarget();for(let a=0;a<6;a++)e.setRenderTarget(this,a),e.clear(t,n,r);e.setRenderTarget(s)}}class Mi extends St{constructor(){super(),this.isGroup=!0,this.type="Group"}}const ka={type:"move"};class nr{constructor(){this._targetRay=null,this._grip=null,this._hand=null}getHandSpace(){return this._hand===null&&(this._hand=new Mi,this._hand.matrixAutoUpdate=!1,this._hand.visible=!1,this._hand.joints={},this._hand.inputState={pinching:!1}),this._hand}getTargetRaySpace(){return this._targetRay===null&&(this._targetRay=new Mi,this._targetRay.matrixAutoUpdate=!1,this._targetRay.visible=!1,this._targetRay.hasLinearVelocity=!1,this._targetRay.linearVelocity=new q,this._targetRay.hasAngularVelocity=!1,this._targetRay.angularVelocity=new q),this._targetRay}getGripSpace(){return this._grip===null&&(this._grip=new Mi,this._grip.matrixAutoUpdate=!1,this._grip.visible=!1,this._grip.hasLinearVelocity=!1,this._grip.linearVelocity=new q,this._grip.hasAngularVelocity=!1,this._grip.angularVelocity=new q),this._grip}dispatchEvent(e){return this._targetRay!==null&&this._targetRay.dispatchEvent(e),this._grip!==null&&this._grip.dispatchEvent(e),this._hand!==null&&this._hand.dispatchEvent(e),this}connect(e){if(e&&e.hand){const t=this._hand;if(t)for(const n of e.hand.values())this._getHandJoint(t,n)}return this.dispatchEvent({type:"connected",data:e}),this}disconnect(e){return this.dispatchEvent({type:"disconnected",data:e}),this._targetRay!==null&&(this._targetRay.visible=!1),this._grip!==null&&(this._grip.visible=!1),this._hand!==null&&(this._hand.visible=!1),this}update(e,t,n){let r=null,s=null,a=null;const o=this._targetRay,u=this._grip,f=this._hand;if(e&&t.session.visibilityState!=="visible-blurred"){if(f&&e.hand){a=!0;for(const T of e.hand.values()){const _=t.getJointPose(T,n),d=this._getHandJoint(f,T);_!==null&&(d.matrix.fromArray(_.transform.matrix),d.matrix.decompose(d.position,d.rotation,d.scale),d.matrixWorldNeedsUpdate=!0,d.jointRadius=_.radius),d.visible=_!==null}const c=f.joints["index-finger-tip"],p=f.joints["thumb-tip"],m=c.position.distanceTo(p.position),g=.02,S=.005;f.inputState.pinching&&m>g+S?(f.inputState.pinching=!1,this.dispatchEvent({type:"pinchend",handedness:e.handedness,target:this})):!f.inputState.pinching&&m<=g-S&&(f.inputState.pinching=!0,this.dispatchEvent({type:"pinchstart",handedness:e.handedness,target:this}))}else u!==null&&e.gripSpace&&(s=t.getPose(e.gripSpace,n),s!==null&&(u.matrix.fromArray(s.transform.matrix),u.matrix.decompose(u.position,u.rotation,u.scale),u.matrixWorldNeedsUpdate=!0,s.linearVelocity?(u.hasLinearVelocity=!0,u.linearVelocity.copy(s.linearVelocity)):u.hasLinearVelocity=!1,s.angularVelocity?(u.hasAngularVelocity=!0,u.angularVelocity.copy(s.angularVelocity)):u.hasAngularVelocity=!1));o!==null&&(r=t.getPose(e.targetRaySpace,n),r===null&&s!==null&&(r=s),r!==null&&(o.matrix.fromArray(r.transform.matrix),o.matrix.decompose(o.position,o.rotation,o.scale),o.matrixWorldNeedsUpdate=!0,r.linearVelocity?(o.hasLinearVelocity=!0,o.linearVelocity.copy(r.linearVelocity)):o.hasLinearVelocity=!1,r.angularVelocity?(o.hasAngularVelocity=!0,o.angularVelocity.copy(r.angularVelocity)):o.hasAngularVelocity=!1,this.dispatchEvent(ka)))}return o!==null&&(o.visible=r!==null),u!==null&&(u.visible=s!==null),f!==null&&(f.visible=a!==null),this}_getHandJoint(e,t){if(e.joints[t.jointName]===void 0){const n=new Mi;n.matrixAutoUpdate=!1,n.visible=!1,e.joints[t.jointName]=n,e.add(n)}return e.joints[t.jointName]}}class yf extends St{constructor(){super(),this.isScene=!0,this.type="Scene",this.background=null,this.environment=null,this.fog=null,this.backgroundBlurriness=0,this.backgroundIntensity=1,this.backgroundRotation=new $t,this.environmentIntensity=1,this.environmentRotation=new $t,this.overrideMaterial=null,typeof __THREE_DEVTOOLS__<"u"&&__THREE_DEVTOOLS__.dispatchEvent(new CustomEvent("observe",{detail:this}))}copy(e,t){return super.copy(e,t),e.background!==null&&(this.background=e.background.clone()),e.environment!==null&&(this.environment=e.environment.clone()),e.fog!==null&&(this.fog=e.fog.clone()),this.backgroundBlurriness=e.backgroundBlurriness,this.backgroundIntensity=e.backgroundIntensity,this.backgroundRotation.copy(e.backgroundRotation),this.environmentIntensity=e.environmentIntensity,this.environmentRotation.copy(e.environmentRotation),e.overrideMaterial!==null&&(this.overrideMaterial=e.overrideMaterial.clone()),this.matrixAutoUpdate=e.matrixAutoUpdate,this}toJSON(e){const t=super.toJSON(e);return this.fog!==null&&(t.object.fog=this.fog.toJSON()),this.backgroundBlurriness>0&&(t.object.backgroundBlurriness=this.backgroundBlurriness),this.backgroundIntensity!==1&&(t.object.backgroundIntensity=this.backgroundIntensity),t.object.backgroundRotation=this.backgroundRotation.toArray(),this.environmentIntensity!==1&&(t.object.environmentIntensity=this.environmentIntensity),t.object.environmentRotation=this.environmentRotation.toArray(),t}}class Wa extends ht{constructor(e=null,t=1,n=1,r,s,a,o,u,f=1003,c=1003,p,m){super(null,a,o,u,f,c,r,s,p,m),this.isDataTexture=!0,this.image={data:e,width:t,height:n},this.generateMipmaps=!1,this.flipY=!1,this.unpackAlignment=1}}class Yr extends Bt{constructor(e,t,n,r=1){super(e,t,n),this.isInstancedBufferAttribute=!0,this.meshPerAttribute=r}copy(e){return super.copy(e),this.meshPerAttribute=e.meshPerAttribute,this}toJSON(){const e=super.toJSON();return e.meshPerAttribute=this.meshPerAttribute,e.isInstancedBufferAttribute=!0,e}}const Pn=new et,$r=new et,Ei=[],Kr=new _n,Xa=new et,Yn=new Nt,$n=new zn;class Tf extends Nt{constructor(e,t,n){super(e,t),this.isInstancedMesh=!0,this.instanceMatrix=new Yr(new Float32Array(n*16),16),this.instanceColor=null,this.morphTexture=null,this.count=n,this.boundingBox=null,this.boundingSphere=null;for(let r=0;r<n;r++)this.setMatrixAt(r,Xa)}computeBoundingBox(){const e=this.geometry,t=this.count;this.boundingBox===null&&(this.boundingBox=new _n),e.boundingBox===null&&e.computeBoundingBox(),this.boundingBox.makeEmpty();for(let n=0;n<t;n++)this.getMatrixAt(n,Pn),Kr.copy(e.boundingBox).applyMatrix4(Pn),this.boundingBox.union(Kr)}computeBoundingSphere(){const e=this.geometry,t=this.count;this.boundingSphere===null&&(this.boundingSphere=new zn),e.boundingSphere===null&&e.computeBoundingSphere(),this.boundingSphere.makeEmpty();for(let n=0;n<t;n++)this.getMatrixAt(n,Pn),$n.copy(e.boundingSphere).applyMatrix4(Pn),this.boundingSphere.union($n)}copy(e,t){return super.copy(e,t),this.instanceMatrix.copy(e.instanceMatrix),e.morphTexture!==null&&(this.morphTexture=e.morphTexture.clone()),e.instanceColor!==null&&(this.instanceColor=e.instanceColor.clone()),this.count=e.count,e.boundingBox!==null&&(this.boundingBox=e.boundingBox.clone()),e.boundingSphere!==null&&(this.boundingSphere=e.boundingSphere.clone()),this}getColorAt(e,t){t.fromArray(this.instanceColor.array,e*3)}getMatrixAt(e,t){t.fromArray(this.instanceMatrix.array,e*16)}getMorphAt(e,t){const n=t.morphTargetInfluences,r=this.morphTexture.source.data.data,s=n.length+1,a=e*s+1;for(let o=0;o<n.length;o++)n[o]=r[a+o]}raycast(e,t){const n=this.matrixWorld,r=this.count;if(Yn.geometry=this.geometry,Yn.material=this.material,Yn.material!==void 0&&(this.boundingSphere===null&&this.computeBoundingSphere(),$n.copy(this.boundingSphere),$n.applyMatrix4(n),e.ray.intersectsSphere($n)!==!1))for(let s=0;s<r;s++){this.getMatrixAt(s,Pn),$r.multiplyMatrices(n,Pn),Yn.matrixWorld=$r,Yn.raycast(e,Ei);for(let a=0,o=Ei.length;a<o;a++){const u=Ei[a];u.instanceId=s,u.object=this,t.push(u)}Ei.length=0}}setColorAt(e,t){this.instanceColor===null&&(this.instanceColor=new Yr(new Float32Array(this.instanceMatrix.count*3).fill(1),3)),t.toArray(this.instanceColor.array,e*3)}setMatrixAt(e,t){t.toArray(this.instanceMatrix.array,e*16)}setMorphAt(e,t){const n=t.morphTargetInfluences,r=n.length+1;this.morphTexture===null&&(this.morphTexture=new Wa(new Float32Array(r*this.count),r,this.count,1028,1015));const s=this.morphTexture.source.data.data;let a=0;for(let f=0;f<n.length;f++)a+=n[f];const o=this.geometry.morphTargetsRelative?1:1-a,u=r*e;s[u]=o,s.set(n,u+1)}updateMorphTargets(){}dispose(){this.dispatchEvent({type:"dispose"}),this.morphTexture!==null&&(this.morphTexture.dispose(),this.morphTexture=null)}}const ir=new q,qa=new q,Ya=new Ue;class fn{constructor(e=new q(1,0,0),t=0){this.isPlane=!0,this.normal=e,this.constant=t}set(e,t){return this.normal.copy(e),this.constant=t,this}setComponents(e,t,n,r){return this.normal.set(e,t,n),this.constant=r,this}setFromNormalAndCoplanarPoint(e,t){return this.normal.copy(e),this.constant=-t.dot(this.normal),this}setFromCoplanarPoints(e,t,n){const r=ir.subVectors(n,t).cross(qa.subVectors(e,t)).normalize();return this.setFromNormalAndCoplanarPoint(r,e),this}copy(e){return this.normal.copy(e.normal),this.constant=e.constant,this}normalize(){const e=1/this.normal.length();return this.normal.multiplyScalar(e),this.constant*=e,this}negate(){return this.constant*=-1,this.normal.negate(),this}distanceToPoint(e){return this.normal.dot(e)+this.constant}distanceToSphere(e){return this.distanceToPoint(e.center)-e.radius}projectPoint(e,t){return t.copy(e).addScaledVector(this.normal,-this.distanceToPoint(e))}intersectLine(e,t){const n=e.delta(ir),r=this.normal.dot(n);if(r===0)return this.distanceToPoint(e.start)===0?t.copy(e.start):null;const s=-(e.start.dot(this.normal)+this.constant)/r;return s<0||s>1?null:t.copy(e.start).addScaledVector(n,s)}intersectsLine(e){const t=this.distanceToPoint(e.start),n=this.distanceToPoint(e.end);return t<0&&n>0||n<0&&t>0}intersectsBox(e){return e.intersectsPlane(this)}intersectsSphere(e){return e.intersectsPlane(this)}coplanarPoint(e){return e.copy(this.normal).multiplyScalar(-this.constant)}applyMatrix4(e,t){const n=t||Ya.getNormalMatrix(e),r=this.coplanarPoint(ir).applyMatrix4(e),s=this.normal.applyMatrix3(n).normalize();return this.constant=-r.dot(s),this}translate(e){return this.constant-=e.dot(this.normal),this}equals(e){return e.normal.equals(this.normal)&&e.constant===this.constant}clone(){return new this.constructor().copy(this)}}const cn=new zn,yi=new q;class Bs{constructor(e=new fn,t=new fn,n=new fn,r=new fn,s=new fn,a=new fn){this.planes=[e,t,n,r,s,a]}set(e,t,n,r,s,a){const o=this.planes;return o[0].copy(e),o[1].copy(t),o[2].copy(n),o[3].copy(r),o[4].copy(s),o[5].copy(a),this}copy(e){const t=this.planes;for(let n=0;n<6;n++)t[n].copy(e.planes[n]);return this}setFromProjectionMatrix(e,t=2e3){const n=this.planes,r=e.elements,s=r[0],a=r[1],o=r[2],u=r[3],f=r[4],c=r[5],p=r[6],m=r[7],g=r[8],S=r[9],T=r[10],_=r[11],d=r[12],U=r[13],C=r[14],R=r[15];if(n[0].setComponents(u-s,m-f,_-g,R-d).normalize(),n[1].setComponents(u+s,m+f,_+g,R+d).normalize(),n[2].setComponents(u+a,m+c,_+S,R+U).normalize(),n[3].setComponents(u-a,m-c,_-S,R-U).normalize(),n[4].setComponents(u-o,m-p,_-T,R-C).normalize(),t===2e3)n[5].setComponents(u+o,m+p,_+T,R+C).normalize();else if(t===2001)n[5].setComponents(o,p,T,C).normalize();else throw new Error("THREE.Frustum.setFromProjectionMatrix(): Invalid coordinate system: "+t);return this}intersectsObject(e){if(e.boundingSphere!==void 0)e.boundingSphere===null&&e.computeBoundingSphere(),cn.copy(e.boundingSphere).applyMatrix4(e.matrixWorld);else{const t=e.geometry;t.boundingSphere===null&&t.computeBoundingSphere(),cn.copy(t.boundingSphere).applyMatrix4(e.matrixWorld)}return this.intersectsSphere(cn)}intersectsSprite(e){return cn.center.set(0,0,0),cn.radius=.7071067811865476,cn.applyMatrix4(e.matrixWorld),this.intersectsSphere(cn)}intersectsSphere(e){const t=this.planes,n=e.center,r=-e.radius;for(let s=0;s<6;s++)if(t[s].distanceToPoint(n)<r)return!1;return!0}intersectsBox(e){const t=this.planes;for(let n=0;n<6;n++){const r=t[n];if(yi.x=r.normal.x>0?e.max.x:e.min.x,yi.y=r.normal.y>0?e.max.y:e.min.y,yi.z=r.normal.z>0?e.max.z:e.min.z,r.distanceToPoint(yi)<0)return!1}return!0}containsPoint(e){const t=this.planes;for(let n=0;n<6;n++)if(t[n].distanceToPoint(e)<0)return!1;return!0}clone(){return new this.constructor().copy(this)}}class $a extends ti{constructor(e){super(),this.isPointsMaterial=!0,this.type="PointsMaterial",this.color=new Ke(16777215),this.map=null,this.alphaMap=null,this.size=1,this.sizeAttenuation=!0,this.fog=!0,this.setValues(e)}copy(e){return super.copy(e),this.color.copy(e.color),this.map=e.map,this.alphaMap=e.alphaMap,this.size=e.size,this.sizeAttenuation=e.sizeAttenuation,this.fog=e.fog,this}}const Zr=new et,hr=new _r,Ti=new zn,Ai=new q;class Af extends St{constructor(e=new Kt,t=new $a){super(),this.isPoints=!0,this.type="Points",this.geometry=e,this.material=t,this.morphTargetDictionary=void 0,this.morphTargetInfluences=void 0,this.updateMorphTargets()}copy(e,t){return super.copy(e,t),this.material=Array.isArray(e.material)?e.material.slice():e.material,this.geometry=e.geometry,this}raycast(e,t){const n=this.geometry,r=this.matrixWorld,s=e.params.Points.threshold,a=n.drawRange;if(n.boundingSphere===null&&n.computeBoundingSphere(),Ti.copy(n.boundingSphere),Ti.applyMatrix4(r),Ti.radius+=s,e.ray.intersectsSphere(Ti)===!1)return;Zr.copy(r).invert(),hr.copy(e.ray).applyMatrix4(Zr);const o=s/((this.scale.x+this.scale.y+this.scale.z)/3),u=o*o,f=n.index,p=n.attributes.position;if(f!==null){const m=Math.max(0,a.start),g=Math.min(f.count,a.start+a.count);for(let S=m,T=g;S<T;S++){const _=f.getX(S);Ai.fromBufferAttribute(p,_),jr(Ai,_,u,r,e,t,this)}}else{const m=Math.max(0,a.start),g=Math.min(p.count,a.start+a.count);for(let S=m,T=g;S<T;S++)Ai.fromBufferAttribute(p,S),jr(Ai,S,u,r,e,t,this)}}updateMorphTargets(){const t=this.geometry.morphAttributes,n=Object.keys(t);if(n.length>0){const r=t[n[0]];if(r!==void 0){this.morphTargetInfluences=[],this.morphTargetDictionary={};for(let s=0,a=r.length;s<a;s++){const o=r[s].name||String(s);this.morphTargetInfluences.push(0),this.morphTargetDictionary[o]=s}}}}}function jr(i,e,t,n,r,s,a){const o=hr.distanceSqToPoint(i);if(o<t){const u=new q;hr.closestPointToPoint(i,u),u.applyMatrix4(n);const f=r.ray.origin.distanceTo(u);if(f<r.near||f>r.far)return;s.push({distance:f,distanceToRay:Math.sqrt(o),point:u,index:e,face:null,faceIndex:null,barycoord:null,object:a})}}class bf extends ht{constructor(e,t,n,r,s,a,o,u,f){super(e,t,n,r,s,a,o,u,f),this.isCanvasTexture=!0,this.needsUpdate=!0}}class Os extends ht{constructor(e,t,n=1014,r,s,a,o=1003,u=1003,f,c=1026){if(c!==1026&&c!==1027)throw new Error("DepthTexture format must be either THREE.DepthFormat or THREE.DepthStencilFormat");super(null,r,s,a,o,u,c,n,f),this.isDepthTexture=!0,this.image={width:e,height:t},this.flipY=!1,this.generateMipmaps=!1,this.compareFunction=null}copy(e){return super.copy(e),this.source=new mr(Object.assign({},e.image)),this.compareFunction=e.compareFunction,this}toJSON(e){const t=super.toJSON(e);return this.compareFunction!==null&&(t.compareFunction=this.compareFunction),t}}class Ii extends Kt{constructor(e=1,t=1,n=1,r=1){super(),this.type="PlaneGeometry",this.parameters={width:e,height:t,widthSegments:n,heightSegments:r};const s=e/2,a=t/2,o=Math.floor(n),u=Math.floor(r),f=o+1,c=u+1,p=e/o,m=t/u,g=[],S=[],T=[],_=[];for(let d=0;d<c;d++){const U=d*m-a;for(let C=0;C<f;C++){const R=C*p-s;S.push(R,-U,0),T.push(0,0,1),_.push(C/o),_.push(1-d/u)}}for(let d=0;d<u;d++)for(let U=0;U<o;U++){const C=U+f*d,R=U+f*(d+1),z=U+1+f*(d+1),L=U+1+f*d;g.push(C,R,L),g.push(R,z,L)}this.setIndex(g),this.setAttribute("position",new Yt(S,3)),this.setAttribute("normal",new Yt(T,3)),this.setAttribute("uv",new Yt(_,2))}copy(e){return super.copy(e),this.parameters=Object.assign({},e.parameters),this}static fromJSON(e){return new Ii(e.width,e.height,e.widthSegments,e.heightSegments)}}class Ka extends ti{constructor(e){super(),this.isMeshDepthMaterial=!0,this.type="MeshDepthMaterial",this.depthPacking=3200,this.map=null,this.alphaMap=null,this.displacementMap=null,this.displacementScale=1,this.displacementBias=0,this.wireframe=!1,this.wireframeLinewidth=1,this.setValues(e)}copy(e){return super.copy(e),this.depthPacking=e.depthPacking,this.map=e.map,this.alphaMap=e.alphaMap,this.displacementMap=e.displacementMap,this.displacementScale=e.displacementScale,this.displacementBias=e.displacementBias,this.wireframe=e.wireframe,this.wireframeLinewidth=e.wireframeLinewidth,this}}class Za extends ti{constructor(e){super(),this.isMeshDistanceMaterial=!0,this.type="MeshDistanceMaterial",this.map=null,this.alphaMap=null,this.displacementMap=null,this.displacementScale=1,this.displacementBias=0,this.setValues(e)}copy(e){return super.copy(e),this.map=e.map,this.alphaMap=e.alphaMap,this.displacementMap=e.displacementMap,this.displacementScale=e.displacementScale,this.displacementBias=e.displacementBias,this}}const Jr={enabled:!1,files:{},add:function(i,e){this.enabled!==!1&&(this.files[i]=e)},get:function(i){if(this.enabled!==!1)return this.files[i]},remove:function(i){delete this.files[i]},clear:function(){this.files={}}};class ja{constructor(e,t,n){const r=this;let s=!1,a=0,o=0,u;const f=[];this.onStart=void 0,this.onLoad=e,this.onProgress=t,this.onError=n,this.itemStart=function(c){o++,s===!1&&r.onStart!==void 0&&r.onStart(c,a,o),s=!0},this.itemEnd=function(c){a++,r.onProgress!==void 0&&r.onProgress(c,a,o),a===o&&(s=!1,r.onLoad!==void 0&&r.onLoad())},this.itemError=function(c){r.onError!==void 0&&r.onError(c)},this.resolveURL=function(c){return u?u(c):c},this.setURLModifier=function(c){return u=c,this},this.addHandler=function(c,p){return f.push(c,p),this},this.removeHandler=function(c){const p=f.indexOf(c);return p!==-1&&f.splice(p,2),this},this.getHandler=function(c){for(let p=0,m=f.length;p<m;p+=2){const g=f[p],S=f[p+1];if(g.global&&(g.lastIndex=0),g.test(c))return S}return null}}}const Ja=new ja;class xr{constructor(e){this.manager=e!==void 0?e:Ja,this.crossOrigin="anonymous",this.withCredentials=!1,this.path="",this.resourcePath="",this.requestHeader={}}load(){}loadAsync(e,t){const n=this;return new Promise(function(r,s){n.load(e,r,t,s)})}parse(){}setCrossOrigin(e){return this.crossOrigin=e,this}setWithCredentials(e){return this.withCredentials=e,this}setPath(e){return this.path=e,this}setResourcePath(e){return this.resourcePath=e,this}setRequestHeader(e){return this.requestHeader=e,this}}xr.DEFAULT_MATERIAL_NAME="__DEFAULT";class Qa extends xr{constructor(e){super(e)}load(e,t,n,r){this.path!==void 0&&(e=this.path+e),e=this.manager.resolveURL(e);const s=this,a=Jr.get(e);if(a!==void 0)return s.manager.itemStart(e),setTimeout(function(){t&&t(a),s.manager.itemEnd(e)},0),a;const o=Qn("img");function u(){c(),Jr.add(e,this),t&&t(this),s.manager.itemEnd(e)}function f(p){c(),r&&r(p),s.manager.itemError(e),s.manager.itemEnd(e)}function c(){o.removeEventListener("load",u,!1),o.removeEventListener("error",f,!1)}return o.addEventListener("load",u,!1),o.addEventListener("error",f,!1),e.slice(0,5)!=="data:"&&this.crossOrigin!==void 0&&(o.crossOrigin=this.crossOrigin),s.manager.itemStart(e),o.src=e,o}}class Rf extends xr{constructor(e){super(e)}load(e,t,n,r){const s=new ht,a=new Qa(this.manager);return a.setCrossOrigin(this.crossOrigin),a.setPath(this.path),a.load(e,function(o){s.image=o,s.needsUpdate=!0,t!==void 0&&t(s)},n,r),s}}class Gs extends Fs{constructor(e=-1,t=1,n=1,r=-1,s=.1,a=2e3){super(),this.isOrthographicCamera=!0,this.type="OrthographicCamera",this.zoom=1,this.view=null,this.left=e,this.right=t,this.top=n,this.bottom=r,this.near=s,this.far=a,this.updateProjectionMatrix()}copy(e,t){return super.copy(e,t),this.left=e.left,this.right=e.right,this.top=e.top,this.bottom=e.bottom,this.near=e.near,this.far=e.far,this.zoom=e.zoom,this.view=e.view===null?null:Object.assign({},e.view),this}setViewOffset(e,t,n,r,s,a){this.view===null&&(this.view={enabled:!0,fullWidth:1,fullHeight:1,offsetX:0,offsetY:0,width:1,height:1}),this.view.enabled=!0,this.view.fullWidth=e,this.view.fullHeight=t,this.view.offsetX=n,this.view.offsetY=r,this.view.width=s,this.view.height=a,this.updateProjectionMatrix()}clearViewOffset(){this.view!==null&&(this.view.enabled=!1),this.updateProjectionMatrix()}updateProjectionMatrix(){const e=(this.right-this.left)/(2*this.zoom),t=(this.top-this.bottom)/(2*this.zoom),n=(this.right+this.left)/2,r=(this.top+this.bottom)/2;let s=n-e,a=n+e,o=r+t,u=r-t;if(this.view!==null&&this.view.enabled){const f=(this.right-this.left)/this.view.fullWidth/this.zoom,c=(this.top-this.bottom)/this.view.fullHeight/this.zoom;s+=f*this.view.offsetX,a=s+f*this.view.width,o-=c*this.view.offsetY,u=o-c*this.view.height}this.projectionMatrix.makeOrthographic(s,a,o,u,this.near,this.far,this.coordinateSystem),this.projectionMatrixInverse.copy(this.projectionMatrix).invert()}toJSON(e){const t=super.toJSON(e);return t.object.zoom=this.zoom,t.object.left=this.left,t.object.right=this.right,t.object.top=this.top,t.object.bottom=this.bottom,t.object.near=this.near,t.object.far=this.far,this.view!==null&&(t.object.view=Object.assign({},this.view)),t}}class eo extends Lt{constructor(e=[]){super(),this.isArrayCamera=!0,this.isMultiViewCamera=!1,this.cameras=e}}class wf{constructor(e=!0){this.autoStart=e,this.startTime=0,this.oldTime=0,this.elapsedTime=0,this.running=!1}start(){this.startTime=Qr(),this.oldTime=this.startTime,this.elapsedTime=0,this.running=!0}stop(){this.getElapsedTime(),this.running=!1,this.autoStart=!1}getElapsedTime(){return this.getDelta(),this.elapsedTime}getDelta(){let e=0;if(this.autoStart&&!this.running)return this.start(),0;if(this.running){const t=Qr();e=(t-this.oldTime)/1e3,this.oldTime=t,this.elapsedTime+=e}return e}}function Qr(){return performance.now()}class zs{constructor(e){this.value=e}clone(){return new zs(this.value.clone===void 0?this.value:this.value.clone())}}const es=new et;class Cf{constructor(e,t,n=0,r=1/0){this.ray=new _r(e,t),this.near=n,this.far=r,this.camera=null,this.layers=new gr,this.params={Mesh:{},Line:{threshold:1},LOD:{},Points:{threshold:1},Sprite:{}}}set(e,t){this.ray.set(e,t)}setFromCamera(e,t){t.isPerspectiveCamera?(this.ray.origin.setFromMatrixPosition(t.matrixWorld),this.ray.direction.set(e.x,e.y,.5).unproject(t).sub(this.ray.origin).normalize(),this.camera=t):t.isOrthographicCamera?(this.ray.origin.set(e.x,e.y,(t.near+t.far)/(t.near-t.far)).unproject(t),this.ray.direction.set(0,0,-1).transformDirection(t.matrixWorld),this.camera=t):console.error("THREE.Raycaster: Unsupported camera type: "+t.type)}setFromXRController(e){return es.identity().extractRotation(e.matrixWorld),this.ray.origin.setFromMatrixPosition(e.matrixWorld),this.ray.direction.set(0,0,-1).applyMatrix4(es),this}intersectObject(e,t=!0,n=[]){return fr(e,this,n,t),n.sort(ts),n}intersectObjects(e,t=!0,n=[]){for(let r=0,s=e.length;r<s;r++)fr(e[r],this,n,t);return n.sort(ts),n}}function ts(i,e){return i.distance-e.distance}function fr(i,e,t,n){let r=!0;if(i.layers.test(e.layers)&&i.raycast(e,t)===!1&&(r=!1),r===!0&&n===!0){const s=i.children;for(let a=0,o=s.length;a<o;a++)fr(s[a],e,t,!0)}}const ns=new qe;class Pf{constructor(e=new qe(1/0,1/0),t=new qe(-1/0,-1/0)){this.isBox2=!0,this.min=e,this.max=t}set(e,t){return this.min.copy(e),this.max.copy(t),this}setFromPoints(e){this.makeEmpty();for(let t=0,n=e.length;t<n;t++)this.expandByPoint(e[t]);return this}setFromCenterAndSize(e,t){const n=ns.copy(t).multiplyScalar(.5);return this.min.copy(e).sub(n),this.max.copy(e).add(n),this}clone(){return new this.constructor().copy(this)}copy(e){return this.min.copy(e.min),this.max.copy(e.max),this}makeEmpty(){return this.min.x=this.min.y=1/0,this.max.x=this.max.y=-1/0,this}isEmpty(){return this.max.x<this.min.x||this.max.y<this.min.y}getCenter(e){return this.isEmpty()?e.set(0,0):e.addVectors(this.min,this.max).multiplyScalar(.5)}getSize(e){return this.isEmpty()?e.set(0,0):e.subVectors(this.max,this.min)}expandByPoint(e){return this.min.min(e),this.max.max(e),this}expandByVector(e){return this.min.sub(e),this.max.add(e),this}expandByScalar(e){return this.min.addScalar(-e),this.max.addScalar(e),this}containsPoint(e){return e.x>=this.min.x&&e.x<=this.max.x&&e.y>=this.min.y&&e.y<=this.max.y}containsBox(e){return this.min.x<=e.min.x&&e.max.x<=this.max.x&&this.min.y<=e.min.y&&e.max.y<=this.max.y}getParameter(e,t){return t.set((e.x-this.min.x)/(this.max.x-this.min.x),(e.y-this.min.y)/(this.max.y-this.min.y))}intersectsBox(e){return e.max.x>=this.min.x&&e.min.x<=this.max.x&&e.max.y>=this.min.y&&e.min.y<=this.max.y}clampPoint(e,t){return t.copy(e).clamp(this.min,this.max)}distanceToPoint(e){return this.clampPoint(e,ns).distanceTo(e)}intersect(e){return this.min.max(e.min),this.max.min(e.max),this.isEmpty()&&this.makeEmpty(),this}union(e){return this.min.min(e.min),this.max.max(e.max),this}translate(e){return this.min.add(e),this.max.add(e),this}equals(e){return e.min.equals(this.min)&&e.max.equals(this.max)}}function is(i,e,t,n){const r=to(n);switch(t){case 1021:return i*e;case 1028:return i*e/r.components*r.byteLength;case 1029:return i*e/r.components*r.byteLength;case 1030:return i*e*2/r.components*r.byteLength;case 1031:return i*e*2/r.components*r.byteLength;case 1022:return i*e*3/r.components*r.byteLength;case 1023:return i*e*4/r.components*r.byteLength;case 1033:return i*e*4/r.components*r.byteLength;case 33776:case 33777:return Math.floor((i+3)/4)*Math.floor((e+3)/4)*8;case 33778:case 33779:return Math.floor((i+3)/4)*Math.floor((e+3)/4)*16;case 35841:case 35843:return Math.max(i,16)*Math.max(e,8)/4;case 35840:case 35842:return Math.max(i,8)*Math.max(e,8)/2;case 36196:case 37492:return Math.floor((i+3)/4)*Math.floor((e+3)/4)*8;case 37496:return Math.floor((i+3)/4)*Math.floor((e+3)/4)*16;case 37808:return Math.floor((i+3)/4)*Math.floor((e+3)/4)*16;case 37809:return Math.floor((i+4)/5)*Math.floor((e+3)/4)*16;case 37810:return Math.floor((i+4)/5)*Math.floor((e+4)/5)*16;case 37811:return Math.floor((i+5)/6)*Math.floor((e+4)/5)*16;case 37812:return Math.floor((i+5)/6)*Math.floor((e+5)/6)*16;case 37813:return Math.floor((i+7)/8)*Math.floor((e+4)/5)*16;case 37814:return Math.floor((i+7)/8)*Math.floor((e+5)/6)*16;case 37815:return Math.floor((i+7)/8)*Math.floor((e+7)/8)*16;case 37816:return Math.floor((i+9)/10)*Math.floor((e+4)/5)*16;case 37817:return Math.floor((i+9)/10)*Math.floor((e+5)/6)*16;case 37818:return Math.floor((i+9)/10)*Math.floor((e+7)/8)*16;case 37819:return Math.floor((i+9)/10)*Math.floor((e+9)/10)*16;case 37820:return Math.floor((i+11)/12)*Math.floor((e+9)/10)*16;case 37821:return Math.floor((i+11)/12)*Math.floor((e+11)/12)*16;case 36492:case 36494:case 36495:return Math.ceil(i/4)*Math.ceil(e/4)*16;case 36283:case 36284:return Math.ceil(i/4)*Math.ceil(e/4)*8;case 36285:case 36286:return Math.ceil(i/4)*Math.ceil(e/4)*16}throw new Error(`Unable to determine texture byte length for ${t} format.`)}function to(i){switch(i){case 1009:case 1010:return{byteLength:1,components:1};case 1012:case 1011:case 1016:return{byteLength:2,components:1};case 1017:case 1018:return{byteLength:2,components:4};case 1014:case 1013:case 1015:return{byteLength:4,components:1};case 35902:return{byteLength:4,components:3}}throw new Error(`Unknown texture type ${i}.`)}typeof __THREE_DEVTOOLS__<"u"&&__THREE_DEVTOOLS__.dispatchEvent(new CustomEvent("register",{detail:{revision:"176"}}));typeof window<"u"&&(window.__THREE__?console.warn("WARNING: Multiple instances of Three.js being imported."):window.__THREE__="176");function Vs(){let i=null,e=!1,t=null,n=null;function r(s,a){t(s,a),n=i.requestAnimationFrame(r)}return{start:function(){e!==!0&&t!==null&&(n=i.requestAnimationFrame(r),e=!0)},stop:function(){i.cancelAnimationFrame(n),e=!1},setAnimationLoop:function(s){t=s},setContext:function(s){i=s}}}function no(i){const e=new WeakMap;function t(o,u){const f=o.array,c=o.usage,p=f.byteLength,m=i.createBuffer();i.bindBuffer(u,m),i.bufferData(u,f,c),o.onUploadCallback();let g;if(f instanceof Float32Array)g=i.FLOAT;else if(f instanceof Uint16Array)o.isFloat16BufferAttribute?g=i.HALF_FLOAT:g=i.UNSIGNED_SHORT;else if(f instanceof Int16Array)g=i.SHORT;else if(f instanceof Uint32Array)g=i.UNSIGNED_INT;else if(f instanceof Int32Array)g=i.INT;else if(f instanceof Int8Array)g=i.BYTE;else if(f instanceof Uint8Array)g=i.UNSIGNED_BYTE;else if(f instanceof Uint8ClampedArray)g=i.UNSIGNED_BYTE;else throw new Error("THREE.WebGLAttributes: Unsupported buffer data format: "+f);return{buffer:m,type:g,bytesPerElement:f.BYTES_PER_ELEMENT,version:o.version,size:p}}function n(o,u,f){const c=u.array,p=u.updateRanges;if(i.bindBuffer(f,o),p.length===0)i.bufferSubData(f,0,c);else{p.sort((g,S)=>g.start-S.start);let m=0;for(let g=1;g<p.length;g++){const S=p[m],T=p[g];T.start<=S.start+S.count+1?S.count=Math.max(S.count,T.start+T.count-S.start):(++m,p[m]=T)}p.length=m+1;for(let g=0,S=p.length;g<S;g++){const T=p[g];i.bufferSubData(f,T.start*c.BYTES_PER_ELEMENT,c,T.start,T.count)}u.clearUpdateRanges()}u.onUploadCallback()}function r(o){return o.isInterleavedBufferAttribute&&(o=o.data),e.get(o)}function s(o){o.isInterleavedBufferAttribute&&(o=o.data);const u=e.get(o);u&&(i.deleteBuffer(u.buffer),e.delete(o))}function a(o,u){if(o.isInterleavedBufferAttribute&&(o=o.data),o.isGLBufferAttribute){const c=e.get(o);(!c||c.version<o.version)&&e.set(o,{buffer:o.buffer,type:o.type,bytesPerElement:o.elementSize,version:o.version});return}const f=e.get(o);if(f===void 0)e.set(o,t(o,u));else if(f.version<o.version){if(f.size!==o.array.byteLength)throw new Error("THREE.WebGLAttributes: The size of the buffer attribute's array buffer does not match the original size. Resizing buffer attributes is not supported.");n(f.buffer,o,u),f.version=o.version}}return{get:r,remove:s,update:a}}var io=`#ifdef USE_ALPHAHASH
	if ( diffuseColor.a < getAlphaHashThreshold( vPosition ) ) discard;
#endif`,ro=`#ifdef USE_ALPHAHASH
	const float ALPHA_HASH_SCALE = 0.05;
	float hash2D( vec2 value ) {
		return fract( 1.0e4 * sin( 17.0 * value.x + 0.1 * value.y ) * ( 0.1 + abs( sin( 13.0 * value.y + value.x ) ) ) );
	}
	float hash3D( vec3 value ) {
		return hash2D( vec2( hash2D( value.xy ), value.z ) );
	}
	float getAlphaHashThreshold( vec3 position ) {
		float maxDeriv = max(
			length( dFdx( position.xyz ) ),
			length( dFdy( position.xyz ) )
		);
		float pixScale = 1.0 / ( ALPHA_HASH_SCALE * maxDeriv );
		vec2 pixScales = vec2(
			exp2( floor( log2( pixScale ) ) ),
			exp2( ceil( log2( pixScale ) ) )
		);
		vec2 alpha = vec2(
			hash3D( floor( pixScales.x * position.xyz ) ),
			hash3D( floor( pixScales.y * position.xyz ) )
		);
		float lerpFactor = fract( log2( pixScale ) );
		float x = ( 1.0 - lerpFactor ) * alpha.x + lerpFactor * alpha.y;
		float a = min( lerpFactor, 1.0 - lerpFactor );
		vec3 cases = vec3(
			x * x / ( 2.0 * a * ( 1.0 - a ) ),
			( x - 0.5 * a ) / ( 1.0 - a ),
			1.0 - ( ( 1.0 - x ) * ( 1.0 - x ) / ( 2.0 * a * ( 1.0 - a ) ) )
		);
		float threshold = ( x < ( 1.0 - a ) )
			? ( ( x < a ) ? cases.x : cases.y )
			: cases.z;
		return clamp( threshold , 1.0e-6, 1.0 );
	}
#endif`,so=`#ifdef USE_ALPHAMAP
	diffuseColor.a *= texture2D( alphaMap, vAlphaMapUv ).g;
#endif`,ao=`#ifdef USE_ALPHAMAP
	uniform sampler2D alphaMap;
#endif`,oo=`#ifdef USE_ALPHATEST
	#ifdef ALPHA_TO_COVERAGE
	diffuseColor.a = smoothstep( alphaTest, alphaTest + fwidth( diffuseColor.a ), diffuseColor.a );
	if ( diffuseColor.a == 0.0 ) discard;
	#else
	if ( diffuseColor.a < alphaTest ) discard;
	#endif
#endif`,lo=`#ifdef USE_ALPHATEST
	uniform float alphaTest;
#endif`,co=`#ifdef USE_AOMAP
	float ambientOcclusion = ( texture2D( aoMap, vAoMapUv ).r - 1.0 ) * aoMapIntensity + 1.0;
	reflectedLight.indirectDiffuse *= ambientOcclusion;
	#if defined( USE_CLEARCOAT ) 
		clearcoatSpecularIndirect *= ambientOcclusion;
	#endif
	#if defined( USE_SHEEN ) 
		sheenSpecularIndirect *= ambientOcclusion;
	#endif
	#if defined( USE_ENVMAP ) && defined( STANDARD )
		float dotNV = saturate( dot( geometryNormal, geometryViewDir ) );
		reflectedLight.indirectSpecular *= computeSpecularOcclusion( dotNV, ambientOcclusion, material.roughness );
	#endif
#endif`,uo=`#ifdef USE_AOMAP
	uniform sampler2D aoMap;
	uniform float aoMapIntensity;
#endif`,ho=`#ifdef USE_BATCHING
	#if ! defined( GL_ANGLE_multi_draw )
	#define gl_DrawID _gl_DrawID
	uniform int _gl_DrawID;
	#endif
	uniform highp sampler2D batchingTexture;
	uniform highp usampler2D batchingIdTexture;
	mat4 getBatchingMatrix( const in float i ) {
		int size = textureSize( batchingTexture, 0 ).x;
		int j = int( i ) * 4;
		int x = j % size;
		int y = j / size;
		vec4 v1 = texelFetch( batchingTexture, ivec2( x, y ), 0 );
		vec4 v2 = texelFetch( batchingTexture, ivec2( x + 1, y ), 0 );
		vec4 v3 = texelFetch( batchingTexture, ivec2( x + 2, y ), 0 );
		vec4 v4 = texelFetch( batchingTexture, ivec2( x + 3, y ), 0 );
		return mat4( v1, v2, v3, v4 );
	}
	float getIndirectIndex( const in int i ) {
		int size = textureSize( batchingIdTexture, 0 ).x;
		int x = i % size;
		int y = i / size;
		return float( texelFetch( batchingIdTexture, ivec2( x, y ), 0 ).r );
	}
#endif
#ifdef USE_BATCHING_COLOR
	uniform sampler2D batchingColorTexture;
	vec3 getBatchingColor( const in float i ) {
		int size = textureSize( batchingColorTexture, 0 ).x;
		int j = int( i );
		int x = j % size;
		int y = j / size;
		return texelFetch( batchingColorTexture, ivec2( x, y ), 0 ).rgb;
	}
#endif`,fo=`#ifdef USE_BATCHING
	mat4 batchingMatrix = getBatchingMatrix( getIndirectIndex( gl_DrawID ) );
#endif`,po=`vec3 transformed = vec3( position );
#ifdef USE_ALPHAHASH
	vPosition = vec3( position );
#endif`,mo=`vec3 objectNormal = vec3( normal );
#ifdef USE_TANGENT
	vec3 objectTangent = vec3( tangent.xyz );
#endif`,_o=`float G_BlinnPhong_Implicit( ) {
	return 0.25;
}
float D_BlinnPhong( const in float shininess, const in float dotNH ) {
	return RECIPROCAL_PI * ( shininess * 0.5 + 1.0 ) * pow( dotNH, shininess );
}
vec3 BRDF_BlinnPhong( const in vec3 lightDir, const in vec3 viewDir, const in vec3 normal, const in vec3 specularColor, const in float shininess ) {
	vec3 halfDir = normalize( lightDir + viewDir );
	float dotNH = saturate( dot( normal, halfDir ) );
	float dotVH = saturate( dot( viewDir, halfDir ) );
	vec3 F = F_Schlick( specularColor, 1.0, dotVH );
	float G = G_BlinnPhong_Implicit( );
	float D = D_BlinnPhong( shininess, dotNH );
	return F * ( G * D );
} // validated`,go=`#ifdef USE_IRIDESCENCE
	const mat3 XYZ_TO_REC709 = mat3(
		 3.2404542, -0.9692660,  0.0556434,
		-1.5371385,  1.8760108, -0.2040259,
		-0.4985314,  0.0415560,  1.0572252
	);
	vec3 Fresnel0ToIor( vec3 fresnel0 ) {
		vec3 sqrtF0 = sqrt( fresnel0 );
		return ( vec3( 1.0 ) + sqrtF0 ) / ( vec3( 1.0 ) - sqrtF0 );
	}
	vec3 IorToFresnel0( vec3 transmittedIor, float incidentIor ) {
		return pow2( ( transmittedIor - vec3( incidentIor ) ) / ( transmittedIor + vec3( incidentIor ) ) );
	}
	float IorToFresnel0( float transmittedIor, float incidentIor ) {
		return pow2( ( transmittedIor - incidentIor ) / ( transmittedIor + incidentIor ));
	}
	vec3 evalSensitivity( float OPD, vec3 shift ) {
		float phase = 2.0 * PI * OPD * 1.0e-9;
		vec3 val = vec3( 5.4856e-13, 4.4201e-13, 5.2481e-13 );
		vec3 pos = vec3( 1.6810e+06, 1.7953e+06, 2.2084e+06 );
		vec3 var = vec3( 4.3278e+09, 9.3046e+09, 6.6121e+09 );
		vec3 xyz = val * sqrt( 2.0 * PI * var ) * cos( pos * phase + shift ) * exp( - pow2( phase ) * var );
		xyz.x += 9.7470e-14 * sqrt( 2.0 * PI * 4.5282e+09 ) * cos( 2.2399e+06 * phase + shift[ 0 ] ) * exp( - 4.5282e+09 * pow2( phase ) );
		xyz /= 1.0685e-7;
		vec3 rgb = XYZ_TO_REC709 * xyz;
		return rgb;
	}
	vec3 evalIridescence( float outsideIOR, float eta2, float cosTheta1, float thinFilmThickness, vec3 baseF0 ) {
		vec3 I;
		float iridescenceIOR = mix( outsideIOR, eta2, smoothstep( 0.0, 0.03, thinFilmThickness ) );
		float sinTheta2Sq = pow2( outsideIOR / iridescenceIOR ) * ( 1.0 - pow2( cosTheta1 ) );
		float cosTheta2Sq = 1.0 - sinTheta2Sq;
		if ( cosTheta2Sq < 0.0 ) {
			return vec3( 1.0 );
		}
		float cosTheta2 = sqrt( cosTheta2Sq );
		float R0 = IorToFresnel0( iridescenceIOR, outsideIOR );
		float R12 = F_Schlick( R0, 1.0, cosTheta1 );
		float T121 = 1.0 - R12;
		float phi12 = 0.0;
		if ( iridescenceIOR < outsideIOR ) phi12 = PI;
		float phi21 = PI - phi12;
		vec3 baseIOR = Fresnel0ToIor( clamp( baseF0, 0.0, 0.9999 ) );		vec3 R1 = IorToFresnel0( baseIOR, iridescenceIOR );
		vec3 R23 = F_Schlick( R1, 1.0, cosTheta2 );
		vec3 phi23 = vec3( 0.0 );
		if ( baseIOR[ 0 ] < iridescenceIOR ) phi23[ 0 ] = PI;
		if ( baseIOR[ 1 ] < iridescenceIOR ) phi23[ 1 ] = PI;
		if ( baseIOR[ 2 ] < iridescenceIOR ) phi23[ 2 ] = PI;
		float OPD = 2.0 * iridescenceIOR * thinFilmThickness * cosTheta2;
		vec3 phi = vec3( phi21 ) + phi23;
		vec3 R123 = clamp( R12 * R23, 1e-5, 0.9999 );
		vec3 r123 = sqrt( R123 );
		vec3 Rs = pow2( T121 ) * R23 / ( vec3( 1.0 ) - R123 );
		vec3 C0 = R12 + Rs;
		I = C0;
		vec3 Cm = Rs - T121;
		for ( int m = 1; m <= 2; ++ m ) {
			Cm *= r123;
			vec3 Sm = 2.0 * evalSensitivity( float( m ) * OPD, float( m ) * phi );
			I += Cm * Sm;
		}
		return max( I, vec3( 0.0 ) );
	}
#endif`,xo=`#ifdef USE_BUMPMAP
	uniform sampler2D bumpMap;
	uniform float bumpScale;
	vec2 dHdxy_fwd() {
		vec2 dSTdx = dFdx( vBumpMapUv );
		vec2 dSTdy = dFdy( vBumpMapUv );
		float Hll = bumpScale * texture2D( bumpMap, vBumpMapUv ).x;
		float dBx = bumpScale * texture2D( bumpMap, vBumpMapUv + dSTdx ).x - Hll;
		float dBy = bumpScale * texture2D( bumpMap, vBumpMapUv + dSTdy ).x - Hll;
		return vec2( dBx, dBy );
	}
	vec3 perturbNormalArb( vec3 surf_pos, vec3 surf_norm, vec2 dHdxy, float faceDirection ) {
		vec3 vSigmaX = normalize( dFdx( surf_pos.xyz ) );
		vec3 vSigmaY = normalize( dFdy( surf_pos.xyz ) );
		vec3 vN = surf_norm;
		vec3 R1 = cross( vSigmaY, vN );
		vec3 R2 = cross( vN, vSigmaX );
		float fDet = dot( vSigmaX, R1 ) * faceDirection;
		vec3 vGrad = sign( fDet ) * ( dHdxy.x * R1 + dHdxy.y * R2 );
		return normalize( abs( fDet ) * surf_norm - vGrad );
	}
#endif`,vo=`#if NUM_CLIPPING_PLANES > 0
	vec4 plane;
	#ifdef ALPHA_TO_COVERAGE
		float distanceToPlane, distanceGradient;
		float clipOpacity = 1.0;
		#pragma unroll_loop_start
		for ( int i = 0; i < UNION_CLIPPING_PLANES; i ++ ) {
			plane = clippingPlanes[ i ];
			distanceToPlane = - dot( vClipPosition, plane.xyz ) + plane.w;
			distanceGradient = fwidth( distanceToPlane ) / 2.0;
			clipOpacity *= smoothstep( - distanceGradient, distanceGradient, distanceToPlane );
			if ( clipOpacity == 0.0 ) discard;
		}
		#pragma unroll_loop_end
		#if UNION_CLIPPING_PLANES < NUM_CLIPPING_PLANES
			float unionClipOpacity = 1.0;
			#pragma unroll_loop_start
			for ( int i = UNION_CLIPPING_PLANES; i < NUM_CLIPPING_PLANES; i ++ ) {
				plane = clippingPlanes[ i ];
				distanceToPlane = - dot( vClipPosition, plane.xyz ) + plane.w;
				distanceGradient = fwidth( distanceToPlane ) / 2.0;
				unionClipOpacity *= 1.0 - smoothstep( - distanceGradient, distanceGradient, distanceToPlane );
			}
			#pragma unroll_loop_end
			clipOpacity *= 1.0 - unionClipOpacity;
		#endif
		diffuseColor.a *= clipOpacity;
		if ( diffuseColor.a == 0.0 ) discard;
	#else
		#pragma unroll_loop_start
		for ( int i = 0; i < UNION_CLIPPING_PLANES; i ++ ) {
			plane = clippingPlanes[ i ];
			if ( dot( vClipPosition, plane.xyz ) > plane.w ) discard;
		}
		#pragma unroll_loop_end
		#if UNION_CLIPPING_PLANES < NUM_CLIPPING_PLANES
			bool clipped = true;
			#pragma unroll_loop_start
			for ( int i = UNION_CLIPPING_PLANES; i < NUM_CLIPPING_PLANES; i ++ ) {
				plane = clippingPlanes[ i ];
				clipped = ( dot( vClipPosition, plane.xyz ) > plane.w ) && clipped;
			}
			#pragma unroll_loop_end
			if ( clipped ) discard;
		#endif
	#endif
#endif`,So=`#if NUM_CLIPPING_PLANES > 0
	varying vec3 vClipPosition;
	uniform vec4 clippingPlanes[ NUM_CLIPPING_PLANES ];
#endif`,Mo=`#if NUM_CLIPPING_PLANES > 0
	varying vec3 vClipPosition;
#endif`,Eo=`#if NUM_CLIPPING_PLANES > 0
	vClipPosition = - mvPosition.xyz;
#endif`,yo=`#if defined( USE_COLOR_ALPHA )
	diffuseColor *= vColor;
#elif defined( USE_COLOR )
	diffuseColor.rgb *= vColor;
#endif`,To=`#if defined( USE_COLOR_ALPHA )
	varying vec4 vColor;
#elif defined( USE_COLOR )
	varying vec3 vColor;
#endif`,Ao=`#if defined( USE_COLOR_ALPHA )
	varying vec4 vColor;
#elif defined( USE_COLOR ) || defined( USE_INSTANCING_COLOR ) || defined( USE_BATCHING_COLOR )
	varying vec3 vColor;
#endif`,bo=`#if defined( USE_COLOR_ALPHA )
	vColor = vec4( 1.0 );
#elif defined( USE_COLOR ) || defined( USE_INSTANCING_COLOR ) || defined( USE_BATCHING_COLOR )
	vColor = vec3( 1.0 );
#endif
#ifdef USE_COLOR
	vColor *= color;
#endif
#ifdef USE_INSTANCING_COLOR
	vColor.xyz *= instanceColor.xyz;
#endif
#ifdef USE_BATCHING_COLOR
	vec3 batchingColor = getBatchingColor( getIndirectIndex( gl_DrawID ) );
	vColor.xyz *= batchingColor.xyz;
#endif`,Ro=`#define PI 3.141592653589793
#define PI2 6.283185307179586
#define PI_HALF 1.5707963267948966
#define RECIPROCAL_PI 0.3183098861837907
#define RECIPROCAL_PI2 0.15915494309189535
#define EPSILON 1e-6
#ifndef saturate
#define saturate( a ) clamp( a, 0.0, 1.0 )
#endif
#define whiteComplement( a ) ( 1.0 - saturate( a ) )
float pow2( const in float x ) { return x*x; }
vec3 pow2( const in vec3 x ) { return x*x; }
float pow3( const in float x ) { return x*x*x; }
float pow4( const in float x ) { float x2 = x*x; return x2*x2; }
float max3( const in vec3 v ) { return max( max( v.x, v.y ), v.z ); }
float average( const in vec3 v ) { return dot( v, vec3( 0.3333333 ) ); }
highp float rand( const in vec2 uv ) {
	const highp float a = 12.9898, b = 78.233, c = 43758.5453;
	highp float dt = dot( uv.xy, vec2( a,b ) ), sn = mod( dt, PI );
	return fract( sin( sn ) * c );
}
#ifdef HIGH_PRECISION
	float precisionSafeLength( vec3 v ) { return length( v ); }
#else
	float precisionSafeLength( vec3 v ) {
		float maxComponent = max3( abs( v ) );
		return length( v / maxComponent ) * maxComponent;
	}
#endif
struct IncidentLight {
	vec3 color;
	vec3 direction;
	bool visible;
};
struct ReflectedLight {
	vec3 directDiffuse;
	vec3 directSpecular;
	vec3 indirectDiffuse;
	vec3 indirectSpecular;
};
#ifdef USE_ALPHAHASH
	varying vec3 vPosition;
#endif
vec3 transformDirection( in vec3 dir, in mat4 matrix ) {
	return normalize( ( matrix * vec4( dir, 0.0 ) ).xyz );
}
vec3 inverseTransformDirection( in vec3 dir, in mat4 matrix ) {
	return normalize( ( vec4( dir, 0.0 ) * matrix ).xyz );
}
mat3 transposeMat3( const in mat3 m ) {
	mat3 tmp;
	tmp[ 0 ] = vec3( m[ 0 ].x, m[ 1 ].x, m[ 2 ].x );
	tmp[ 1 ] = vec3( m[ 0 ].y, m[ 1 ].y, m[ 2 ].y );
	tmp[ 2 ] = vec3( m[ 0 ].z, m[ 1 ].z, m[ 2 ].z );
	return tmp;
}
bool isPerspectiveMatrix( mat4 m ) {
	return m[ 2 ][ 3 ] == - 1.0;
}
vec2 equirectUv( in vec3 dir ) {
	float u = atan( dir.z, dir.x ) * RECIPROCAL_PI2 + 0.5;
	float v = asin( clamp( dir.y, - 1.0, 1.0 ) ) * RECIPROCAL_PI + 0.5;
	return vec2( u, v );
}
vec3 BRDF_Lambert( const in vec3 diffuseColor ) {
	return RECIPROCAL_PI * diffuseColor;
}
vec3 F_Schlick( const in vec3 f0, const in float f90, const in float dotVH ) {
	float fresnel = exp2( ( - 5.55473 * dotVH - 6.98316 ) * dotVH );
	return f0 * ( 1.0 - fresnel ) + ( f90 * fresnel );
}
float F_Schlick( const in float f0, const in float f90, const in float dotVH ) {
	float fresnel = exp2( ( - 5.55473 * dotVH - 6.98316 ) * dotVH );
	return f0 * ( 1.0 - fresnel ) + ( f90 * fresnel );
} // validated`,wo=`#ifdef ENVMAP_TYPE_CUBE_UV
	#define cubeUV_minMipLevel 4.0
	#define cubeUV_minTileSize 16.0
	float getFace( vec3 direction ) {
		vec3 absDirection = abs( direction );
		float face = - 1.0;
		if ( absDirection.x > absDirection.z ) {
			if ( absDirection.x > absDirection.y )
				face = direction.x > 0.0 ? 0.0 : 3.0;
			else
				face = direction.y > 0.0 ? 1.0 : 4.0;
		} else {
			if ( absDirection.z > absDirection.y )
				face = direction.z > 0.0 ? 2.0 : 5.0;
			else
				face = direction.y > 0.0 ? 1.0 : 4.0;
		}
		return face;
	}
	vec2 getUV( vec3 direction, float face ) {
		vec2 uv;
		if ( face == 0.0 ) {
			uv = vec2( direction.z, direction.y ) / abs( direction.x );
		} else if ( face == 1.0 ) {
			uv = vec2( - direction.x, - direction.z ) / abs( direction.y );
		} else if ( face == 2.0 ) {
			uv = vec2( - direction.x, direction.y ) / abs( direction.z );
		} else if ( face == 3.0 ) {
			uv = vec2( - direction.z, direction.y ) / abs( direction.x );
		} else if ( face == 4.0 ) {
			uv = vec2( - direction.x, direction.z ) / abs( direction.y );
		} else {
			uv = vec2( direction.x, direction.y ) / abs( direction.z );
		}
		return 0.5 * ( uv + 1.0 );
	}
	vec3 bilinearCubeUV( sampler2D envMap, vec3 direction, float mipInt ) {
		float face = getFace( direction );
		float filterInt = max( cubeUV_minMipLevel - mipInt, 0.0 );
		mipInt = max( mipInt, cubeUV_minMipLevel );
		float faceSize = exp2( mipInt );
		highp vec2 uv = getUV( direction, face ) * ( faceSize - 2.0 ) + 1.0;
		if ( face > 2.0 ) {
			uv.y += faceSize;
			face -= 3.0;
		}
		uv.x += face * faceSize;
		uv.x += filterInt * 3.0 * cubeUV_minTileSize;
		uv.y += 4.0 * ( exp2( CUBEUV_MAX_MIP ) - faceSize );
		uv.x *= CUBEUV_TEXEL_WIDTH;
		uv.y *= CUBEUV_TEXEL_HEIGHT;
		#ifdef texture2DGradEXT
			return texture2DGradEXT( envMap, uv, vec2( 0.0 ), vec2( 0.0 ) ).rgb;
		#else
			return texture2D( envMap, uv ).rgb;
		#endif
	}
	#define cubeUV_r0 1.0
	#define cubeUV_m0 - 2.0
	#define cubeUV_r1 0.8
	#define cubeUV_m1 - 1.0
	#define cubeUV_r4 0.4
	#define cubeUV_m4 2.0
	#define cubeUV_r5 0.305
	#define cubeUV_m5 3.0
	#define cubeUV_r6 0.21
	#define cubeUV_m6 4.0
	float roughnessToMip( float roughness ) {
		float mip = 0.0;
		if ( roughness >= cubeUV_r1 ) {
			mip = ( cubeUV_r0 - roughness ) * ( cubeUV_m1 - cubeUV_m0 ) / ( cubeUV_r0 - cubeUV_r1 ) + cubeUV_m0;
		} else if ( roughness >= cubeUV_r4 ) {
			mip = ( cubeUV_r1 - roughness ) * ( cubeUV_m4 - cubeUV_m1 ) / ( cubeUV_r1 - cubeUV_r4 ) + cubeUV_m1;
		} else if ( roughness >= cubeUV_r5 ) {
			mip = ( cubeUV_r4 - roughness ) * ( cubeUV_m5 - cubeUV_m4 ) / ( cubeUV_r4 - cubeUV_r5 ) + cubeUV_m4;
		} else if ( roughness >= cubeUV_r6 ) {
			mip = ( cubeUV_r5 - roughness ) * ( cubeUV_m6 - cubeUV_m5 ) / ( cubeUV_r5 - cubeUV_r6 ) + cubeUV_m5;
		} else {
			mip = - 2.0 * log2( 1.16 * roughness );		}
		return mip;
	}
	vec4 textureCubeUV( sampler2D envMap, vec3 sampleDir, float roughness ) {
		float mip = clamp( roughnessToMip( roughness ), cubeUV_m0, CUBEUV_MAX_MIP );
		float mipF = fract( mip );
		float mipInt = floor( mip );
		vec3 color0 = bilinearCubeUV( envMap, sampleDir, mipInt );
		if ( mipF == 0.0 ) {
			return vec4( color0, 1.0 );
		} else {
			vec3 color1 = bilinearCubeUV( envMap, sampleDir, mipInt + 1.0 );
			return vec4( mix( color0, color1, mipF ), 1.0 );
		}
	}
#endif`,Co=`vec3 transformedNormal = objectNormal;
#ifdef USE_TANGENT
	vec3 transformedTangent = objectTangent;
#endif
#ifdef USE_BATCHING
	mat3 bm = mat3( batchingMatrix );
	transformedNormal /= vec3( dot( bm[ 0 ], bm[ 0 ] ), dot( bm[ 1 ], bm[ 1 ] ), dot( bm[ 2 ], bm[ 2 ] ) );
	transformedNormal = bm * transformedNormal;
	#ifdef USE_TANGENT
		transformedTangent = bm * transformedTangent;
	#endif
#endif
#ifdef USE_INSTANCING
	mat3 im = mat3( instanceMatrix );
	transformedNormal /= vec3( dot( im[ 0 ], im[ 0 ] ), dot( im[ 1 ], im[ 1 ] ), dot( im[ 2 ], im[ 2 ] ) );
	transformedNormal = im * transformedNormal;
	#ifdef USE_TANGENT
		transformedTangent = im * transformedTangent;
	#endif
#endif
transformedNormal = normalMatrix * transformedNormal;
#ifdef FLIP_SIDED
	transformedNormal = - transformedNormal;
#endif
#ifdef USE_TANGENT
	transformedTangent = ( modelViewMatrix * vec4( transformedTangent, 0.0 ) ).xyz;
	#ifdef FLIP_SIDED
		transformedTangent = - transformedTangent;
	#endif
#endif`,Po=`#ifdef USE_DISPLACEMENTMAP
	uniform sampler2D displacementMap;
	uniform float displacementScale;
	uniform float displacementBias;
#endif`,Do=`#ifdef USE_DISPLACEMENTMAP
	transformed += normalize( objectNormal ) * ( texture2D( displacementMap, vDisplacementMapUv ).x * displacementScale + displacementBias );
#endif`,Io=`#ifdef USE_EMISSIVEMAP
	vec4 emissiveColor = texture2D( emissiveMap, vEmissiveMapUv );
	#ifdef DECODE_VIDEO_TEXTURE_EMISSIVE
		emissiveColor = sRGBTransferEOTF( emissiveColor );
	#endif
	totalEmissiveRadiance *= emissiveColor.rgb;
#endif`,Uo=`#ifdef USE_EMISSIVEMAP
	uniform sampler2D emissiveMap;
#endif`,Lo="gl_FragColor = linearToOutputTexel( gl_FragColor );",Fo=`vec4 LinearTransferOETF( in vec4 value ) {
	return value;
}
vec4 sRGBTransferEOTF( in vec4 value ) {
	return vec4( mix( pow( value.rgb * 0.9478672986 + vec3( 0.0521327014 ), vec3( 2.4 ) ), value.rgb * 0.0773993808, vec3( lessThanEqual( value.rgb, vec3( 0.04045 ) ) ) ), value.a );
}
vec4 sRGBTransferOETF( in vec4 value ) {
	return vec4( mix( pow( value.rgb, vec3( 0.41666 ) ) * 1.055 - vec3( 0.055 ), value.rgb * 12.92, vec3( lessThanEqual( value.rgb, vec3( 0.0031308 ) ) ) ), value.a );
}`,No=`#ifdef USE_ENVMAP
	#ifdef ENV_WORLDPOS
		vec3 cameraToFrag;
		if ( isOrthographic ) {
			cameraToFrag = normalize( vec3( - viewMatrix[ 0 ][ 2 ], - viewMatrix[ 1 ][ 2 ], - viewMatrix[ 2 ][ 2 ] ) );
		} else {
			cameraToFrag = normalize( vWorldPosition - cameraPosition );
		}
		vec3 worldNormal = inverseTransformDirection( normal, viewMatrix );
		#ifdef ENVMAP_MODE_REFLECTION
			vec3 reflectVec = reflect( cameraToFrag, worldNormal );
		#else
			vec3 reflectVec = refract( cameraToFrag, worldNormal, refractionRatio );
		#endif
	#else
		vec3 reflectVec = vReflect;
	#endif
	#ifdef ENVMAP_TYPE_CUBE
		vec4 envColor = textureCube( envMap, envMapRotation * vec3( flipEnvMap * reflectVec.x, reflectVec.yz ) );
	#else
		vec4 envColor = vec4( 0.0 );
	#endif
	#ifdef ENVMAP_BLENDING_MULTIPLY
		outgoingLight = mix( outgoingLight, outgoingLight * envColor.xyz, specularStrength * reflectivity );
	#elif defined( ENVMAP_BLENDING_MIX )
		outgoingLight = mix( outgoingLight, envColor.xyz, specularStrength * reflectivity );
	#elif defined( ENVMAP_BLENDING_ADD )
		outgoingLight += envColor.xyz * specularStrength * reflectivity;
	#endif
#endif`,Bo=`#ifdef USE_ENVMAP
	uniform float envMapIntensity;
	uniform float flipEnvMap;
	uniform mat3 envMapRotation;
	#ifdef ENVMAP_TYPE_CUBE
		uniform samplerCube envMap;
	#else
		uniform sampler2D envMap;
	#endif
	
#endif`,Oo=`#ifdef USE_ENVMAP
	uniform float reflectivity;
	#if defined( USE_BUMPMAP ) || defined( USE_NORMALMAP ) || defined( PHONG ) || defined( LAMBERT )
		#define ENV_WORLDPOS
	#endif
	#ifdef ENV_WORLDPOS
		varying vec3 vWorldPosition;
		uniform float refractionRatio;
	#else
		varying vec3 vReflect;
	#endif
#endif`,Go=`#ifdef USE_ENVMAP
	#if defined( USE_BUMPMAP ) || defined( USE_NORMALMAP ) || defined( PHONG ) || defined( LAMBERT )
		#define ENV_WORLDPOS
	#endif
	#ifdef ENV_WORLDPOS
		
		varying vec3 vWorldPosition;
	#else
		varying vec3 vReflect;
		uniform float refractionRatio;
	#endif
#endif`,zo=`#ifdef USE_ENVMAP
	#ifdef ENV_WORLDPOS
		vWorldPosition = worldPosition.xyz;
	#else
		vec3 cameraToVertex;
		if ( isOrthographic ) {
			cameraToVertex = normalize( vec3( - viewMatrix[ 0 ][ 2 ], - viewMatrix[ 1 ][ 2 ], - viewMatrix[ 2 ][ 2 ] ) );
		} else {
			cameraToVertex = normalize( worldPosition.xyz - cameraPosition );
		}
		vec3 worldNormal = inverseTransformDirection( transformedNormal, viewMatrix );
		#ifdef ENVMAP_MODE_REFLECTION
			vReflect = reflect( cameraToVertex, worldNormal );
		#else
			vReflect = refract( cameraToVertex, worldNormal, refractionRatio );
		#endif
	#endif
#endif`,Vo=`#ifdef USE_FOG
	vFogDepth = - mvPosition.z;
#endif`,Ho=`#ifdef USE_FOG
	varying float vFogDepth;
#endif`,ko=`#ifdef USE_FOG
	#ifdef FOG_EXP2
		float fogFactor = 1.0 - exp( - fogDensity * fogDensity * vFogDepth * vFogDepth );
	#else
		float fogFactor = smoothstep( fogNear, fogFar, vFogDepth );
	#endif
	gl_FragColor.rgb = mix( gl_FragColor.rgb, fogColor, fogFactor );
#endif`,Wo=`#ifdef USE_FOG
	uniform vec3 fogColor;
	varying float vFogDepth;
	#ifdef FOG_EXP2
		uniform float fogDensity;
	#else
		uniform float fogNear;
		uniform float fogFar;
	#endif
#endif`,Xo=`#ifdef USE_GRADIENTMAP
	uniform sampler2D gradientMap;
#endif
vec3 getGradientIrradiance( vec3 normal, vec3 lightDirection ) {
	float dotNL = dot( normal, lightDirection );
	vec2 coord = vec2( dotNL * 0.5 + 0.5, 0.0 );
	#ifdef USE_GRADIENTMAP
		return vec3( texture2D( gradientMap, coord ).r );
	#else
		vec2 fw = fwidth( coord ) * 0.5;
		return mix( vec3( 0.7 ), vec3( 1.0 ), smoothstep( 0.7 - fw.x, 0.7 + fw.x, coord.x ) );
	#endif
}`,qo=`#ifdef USE_LIGHTMAP
	uniform sampler2D lightMap;
	uniform float lightMapIntensity;
#endif`,Yo=`LambertMaterial material;
material.diffuseColor = diffuseColor.rgb;
material.specularStrength = specularStrength;`,$o=`varying vec3 vViewPosition;
struct LambertMaterial {
	vec3 diffuseColor;
	float specularStrength;
};
void RE_Direct_Lambert( const in IncidentLight directLight, const in vec3 geometryPosition, const in vec3 geometryNormal, const in vec3 geometryViewDir, const in vec3 geometryClearcoatNormal, const in LambertMaterial material, inout ReflectedLight reflectedLight ) {
	float dotNL = saturate( dot( geometryNormal, directLight.direction ) );
	vec3 irradiance = dotNL * directLight.color;
	reflectedLight.directDiffuse += irradiance * BRDF_Lambert( material.diffuseColor );
}
void RE_IndirectDiffuse_Lambert( const in vec3 irradiance, const in vec3 geometryPosition, const in vec3 geometryNormal, const in vec3 geometryViewDir, const in vec3 geometryClearcoatNormal, const in LambertMaterial material, inout ReflectedLight reflectedLight ) {
	reflectedLight.indirectDiffuse += irradiance * BRDF_Lambert( material.diffuseColor );
}
#define RE_Direct				RE_Direct_Lambert
#define RE_IndirectDiffuse		RE_IndirectDiffuse_Lambert`,Ko=`uniform bool receiveShadow;
uniform vec3 ambientLightColor;
#if defined( USE_LIGHT_PROBES )
	uniform vec3 lightProbe[ 9 ];
#endif
vec3 shGetIrradianceAt( in vec3 normal, in vec3 shCoefficients[ 9 ] ) {
	float x = normal.x, y = normal.y, z = normal.z;
	vec3 result = shCoefficients[ 0 ] * 0.886227;
	result += shCoefficients[ 1 ] * 2.0 * 0.511664 * y;
	result += shCoefficients[ 2 ] * 2.0 * 0.511664 * z;
	result += shCoefficients[ 3 ] * 2.0 * 0.511664 * x;
	result += shCoefficients[ 4 ] * 2.0 * 0.429043 * x * y;
	result += shCoefficients[ 5 ] * 2.0 * 0.429043 * y * z;
	result += shCoefficients[ 6 ] * ( 0.743125 * z * z - 0.247708 );
	result += shCoefficients[ 7 ] * 2.0 * 0.429043 * x * z;
	result += shCoefficients[ 8 ] * 0.429043 * ( x * x - y * y );
	return result;
}
vec3 getLightProbeIrradiance( const in vec3 lightProbe[ 9 ], const in vec3 normal ) {
	vec3 worldNormal = inverseTransformDirection( normal, viewMatrix );
	vec3 irradiance = shGetIrradianceAt( worldNormal, lightProbe );
	return irradiance;
}
vec3 getAmbientLightIrradiance( const in vec3 ambientLightColor ) {
	vec3 irradiance = ambientLightColor;
	return irradiance;
}
float getDistanceAttenuation( const in float lightDistance, const in float cutoffDistance, const in float decayExponent ) {
	float distanceFalloff = 1.0 / max( pow( lightDistance, decayExponent ), 0.01 );
	if ( cutoffDistance > 0.0 ) {
		distanceFalloff *= pow2( saturate( 1.0 - pow4( lightDistance / cutoffDistance ) ) );
	}
	return distanceFalloff;
}
float getSpotAttenuation( const in float coneCosine, const in float penumbraCosine, const in float angleCosine ) {
	return smoothstep( coneCosine, penumbraCosine, angleCosine );
}
#if NUM_DIR_LIGHTS > 0
	struct DirectionalLight {
		vec3 direction;
		vec3 color;
	};
	uniform DirectionalLight directionalLights[ NUM_DIR_LIGHTS ];
	void getDirectionalLightInfo( const in DirectionalLight directionalLight, out IncidentLight light ) {
		light.color = directionalLight.color;
		light.direction = directionalLight.direction;
		light.visible = true;
	}
#endif
#if NUM_POINT_LIGHTS > 0
	struct PointLight {
		vec3 position;
		vec3 color;
		float distance;
		float decay;
	};
	uniform PointLight pointLights[ NUM_POINT_LIGHTS ];
	void getPointLightInfo( const in PointLight pointLight, const in vec3 geometryPosition, out IncidentLight light ) {
		vec3 lVector = pointLight.position - geometryPosition;
		light.direction = normalize( lVector );
		float lightDistance = length( lVector );
		light.color = pointLight.color;
		light.color *= getDistanceAttenuation( lightDistance, pointLight.distance, pointLight.decay );
		light.visible = ( light.color != vec3( 0.0 ) );
	}
#endif
#if NUM_SPOT_LIGHTS > 0
	struct SpotLight {
		vec3 position;
		vec3 direction;
		vec3 color;
		float distance;
		float decay;
		float coneCos;
		float penumbraCos;
	};
	uniform SpotLight spotLights[ NUM_SPOT_LIGHTS ];
	void getSpotLightInfo( const in SpotLight spotLight, const in vec3 geometryPosition, out IncidentLight light ) {
		vec3 lVector = spotLight.position - geometryPosition;
		light.direction = normalize( lVector );
		float angleCos = dot( light.direction, spotLight.direction );
		float spotAttenuation = getSpotAttenuation( spotLight.coneCos, spotLight.penumbraCos, angleCos );
		if ( spotAttenuation > 0.0 ) {
			float lightDistance = length( lVector );
			light.color = spotLight.color * spotAttenuation;
			light.color *= getDistanceAttenuation( lightDistance, spotLight.distance, spotLight.decay );
			light.visible = ( light.color != vec3( 0.0 ) );
		} else {
			light.color = vec3( 0.0 );
			light.visible = false;
		}
	}
#endif
#if NUM_RECT_AREA_LIGHTS > 0
	struct RectAreaLight {
		vec3 color;
		vec3 position;
		vec3 halfWidth;
		vec3 halfHeight;
	};
	uniform sampler2D ltc_1;	uniform sampler2D ltc_2;
	uniform RectAreaLight rectAreaLights[ NUM_RECT_AREA_LIGHTS ];
#endif
#if NUM_HEMI_LIGHTS > 0
	struct HemisphereLight {
		vec3 direction;
		vec3 skyColor;
		vec3 groundColor;
	};
	uniform HemisphereLight hemisphereLights[ NUM_HEMI_LIGHTS ];
	vec3 getHemisphereLightIrradiance( const in HemisphereLight hemiLight, const in vec3 normal ) {
		float dotNL = dot( normal, hemiLight.direction );
		float hemiDiffuseWeight = 0.5 * dotNL + 0.5;
		vec3 irradiance = mix( hemiLight.groundColor, hemiLight.skyColor, hemiDiffuseWeight );
		return irradiance;
	}
#endif`,Zo=`#ifdef USE_ENVMAP
	vec3 getIBLIrradiance( const in vec3 normal ) {
		#ifdef ENVMAP_TYPE_CUBE_UV
			vec3 worldNormal = inverseTransformDirection( normal, viewMatrix );
			vec4 envMapColor = textureCubeUV( envMap, envMapRotation * worldNormal, 1.0 );
			return PI * envMapColor.rgb * envMapIntensity;
		#else
			return vec3( 0.0 );
		#endif
	}
	vec3 getIBLRadiance( const in vec3 viewDir, const in vec3 normal, const in float roughness ) {
		#ifdef ENVMAP_TYPE_CUBE_UV
			vec3 reflectVec = reflect( - viewDir, normal );
			reflectVec = normalize( mix( reflectVec, normal, roughness * roughness) );
			reflectVec = inverseTransformDirection( reflectVec, viewMatrix );
			vec4 envMapColor = textureCubeUV( envMap, envMapRotation * reflectVec, roughness );
			return envMapColor.rgb * envMapIntensity;
		#else
			return vec3( 0.0 );
		#endif
	}
	#ifdef USE_ANISOTROPY
		vec3 getIBLAnisotropyRadiance( const in vec3 viewDir, const in vec3 normal, const in float roughness, const in vec3 bitangent, const in float anisotropy ) {
			#ifdef ENVMAP_TYPE_CUBE_UV
				vec3 bentNormal = cross( bitangent, viewDir );
				bentNormal = normalize( cross( bentNormal, bitangent ) );
				bentNormal = normalize( mix( bentNormal, normal, pow2( pow2( 1.0 - anisotropy * ( 1.0 - roughness ) ) ) ) );
				return getIBLRadiance( viewDir, bentNormal, roughness );
			#else
				return vec3( 0.0 );
			#endif
		}
	#endif
#endif`,jo=`ToonMaterial material;
material.diffuseColor = diffuseColor.rgb;`,Jo=`varying vec3 vViewPosition;
struct ToonMaterial {
	vec3 diffuseColor;
};
void RE_Direct_Toon( const in IncidentLight directLight, const in vec3 geometryPosition, const in vec3 geometryNormal, const in vec3 geometryViewDir, const in vec3 geometryClearcoatNormal, const in ToonMaterial material, inout ReflectedLight reflectedLight ) {
	vec3 irradiance = getGradientIrradiance( geometryNormal, directLight.direction ) * directLight.color;
	reflectedLight.directDiffuse += irradiance * BRDF_Lambert( material.diffuseColor );
}
void RE_IndirectDiffuse_Toon( const in vec3 irradiance, const in vec3 geometryPosition, const in vec3 geometryNormal, const in vec3 geometryViewDir, const in vec3 geometryClearcoatNormal, const in ToonMaterial material, inout ReflectedLight reflectedLight ) {
	reflectedLight.indirectDiffuse += irradiance * BRDF_Lambert( material.diffuseColor );
}
#define RE_Direct				RE_Direct_Toon
#define RE_IndirectDiffuse		RE_IndirectDiffuse_Toon`,Qo=`BlinnPhongMaterial material;
material.diffuseColor = diffuseColor.rgb;
material.specularColor = specular;
material.specularShininess = shininess;
material.specularStrength = specularStrength;`,el=`varying vec3 vViewPosition;
struct BlinnPhongMaterial {
	vec3 diffuseColor;
	vec3 specularColor;
	float specularShininess;
	float specularStrength;
};
void RE_Direct_BlinnPhong( const in IncidentLight directLight, const in vec3 geometryPosition, const in vec3 geometryNormal, const in vec3 geometryViewDir, const in vec3 geometryClearcoatNormal, const in BlinnPhongMaterial material, inout ReflectedLight reflectedLight ) {
	float dotNL = saturate( dot( geometryNormal, directLight.direction ) );
	vec3 irradiance = dotNL * directLight.color;
	reflectedLight.directDiffuse += irradiance * BRDF_Lambert( material.diffuseColor );
	reflectedLight.directSpecular += irradiance * BRDF_BlinnPhong( directLight.direction, geometryViewDir, geometryNormal, material.specularColor, material.specularShininess ) * material.specularStrength;
}
void RE_IndirectDiffuse_BlinnPhong( const in vec3 irradiance, const in vec3 geometryPosition, const in vec3 geometryNormal, const in vec3 geometryViewDir, const in vec3 geometryClearcoatNormal, const in BlinnPhongMaterial material, inout ReflectedLight reflectedLight ) {
	reflectedLight.indirectDiffuse += irradiance * BRDF_Lambert( material.diffuseColor );
}
#define RE_Direct				RE_Direct_BlinnPhong
#define RE_IndirectDiffuse		RE_IndirectDiffuse_BlinnPhong`,tl=`PhysicalMaterial material;
material.diffuseColor = diffuseColor.rgb * ( 1.0 - metalnessFactor );
vec3 dxy = max( abs( dFdx( nonPerturbedNormal ) ), abs( dFdy( nonPerturbedNormal ) ) );
float geometryRoughness = max( max( dxy.x, dxy.y ), dxy.z );
material.roughness = max( roughnessFactor, 0.0525 );material.roughness += geometryRoughness;
material.roughness = min( material.roughness, 1.0 );
#ifdef IOR
	material.ior = ior;
	#ifdef USE_SPECULAR
		float specularIntensityFactor = specularIntensity;
		vec3 specularColorFactor = specularColor;
		#ifdef USE_SPECULAR_COLORMAP
			specularColorFactor *= texture2D( specularColorMap, vSpecularColorMapUv ).rgb;
		#endif
		#ifdef USE_SPECULAR_INTENSITYMAP
			specularIntensityFactor *= texture2D( specularIntensityMap, vSpecularIntensityMapUv ).a;
		#endif
		material.specularF90 = mix( specularIntensityFactor, 1.0, metalnessFactor );
	#else
		float specularIntensityFactor = 1.0;
		vec3 specularColorFactor = vec3( 1.0 );
		material.specularF90 = 1.0;
	#endif
	material.specularColor = mix( min( pow2( ( material.ior - 1.0 ) / ( material.ior + 1.0 ) ) * specularColorFactor, vec3( 1.0 ) ) * specularIntensityFactor, diffuseColor.rgb, metalnessFactor );
#else
	material.specularColor = mix( vec3( 0.04 ), diffuseColor.rgb, metalnessFactor );
	material.specularF90 = 1.0;
#endif
#ifdef USE_CLEARCOAT
	material.clearcoat = clearcoat;
	material.clearcoatRoughness = clearcoatRoughness;
	material.clearcoatF0 = vec3( 0.04 );
	material.clearcoatF90 = 1.0;
	#ifdef USE_CLEARCOATMAP
		material.clearcoat *= texture2D( clearcoatMap, vClearcoatMapUv ).x;
	#endif
	#ifdef USE_CLEARCOAT_ROUGHNESSMAP
		material.clearcoatRoughness *= texture2D( clearcoatRoughnessMap, vClearcoatRoughnessMapUv ).y;
	#endif
	material.clearcoat = saturate( material.clearcoat );	material.clearcoatRoughness = max( material.clearcoatRoughness, 0.0525 );
	material.clearcoatRoughness += geometryRoughness;
	material.clearcoatRoughness = min( material.clearcoatRoughness, 1.0 );
#endif
#ifdef USE_DISPERSION
	material.dispersion = dispersion;
#endif
#ifdef USE_IRIDESCENCE
	material.iridescence = iridescence;
	material.iridescenceIOR = iridescenceIOR;
	#ifdef USE_IRIDESCENCEMAP
		material.iridescence *= texture2D( iridescenceMap, vIridescenceMapUv ).r;
	#endif
	#ifdef USE_IRIDESCENCE_THICKNESSMAP
		material.iridescenceThickness = (iridescenceThicknessMaximum - iridescenceThicknessMinimum) * texture2D( iridescenceThicknessMap, vIridescenceThicknessMapUv ).g + iridescenceThicknessMinimum;
	#else
		material.iridescenceThickness = iridescenceThicknessMaximum;
	#endif
#endif
#ifdef USE_SHEEN
	material.sheenColor = sheenColor;
	#ifdef USE_SHEEN_COLORMAP
		material.sheenColor *= texture2D( sheenColorMap, vSheenColorMapUv ).rgb;
	#endif
	material.sheenRoughness = clamp( sheenRoughness, 0.07, 1.0 );
	#ifdef USE_SHEEN_ROUGHNESSMAP
		material.sheenRoughness *= texture2D( sheenRoughnessMap, vSheenRoughnessMapUv ).a;
	#endif
#endif
#ifdef USE_ANISOTROPY
	#ifdef USE_ANISOTROPYMAP
		mat2 anisotropyMat = mat2( anisotropyVector.x, anisotropyVector.y, - anisotropyVector.y, anisotropyVector.x );
		vec3 anisotropyPolar = texture2D( anisotropyMap, vAnisotropyMapUv ).rgb;
		vec2 anisotropyV = anisotropyMat * normalize( 2.0 * anisotropyPolar.rg - vec2( 1.0 ) ) * anisotropyPolar.b;
	#else
		vec2 anisotropyV = anisotropyVector;
	#endif
	material.anisotropy = length( anisotropyV );
	if( material.anisotropy == 0.0 ) {
		anisotropyV = vec2( 1.0, 0.0 );
	} else {
		anisotropyV /= material.anisotropy;
		material.anisotropy = saturate( material.anisotropy );
	}
	material.alphaT = mix( pow2( material.roughness ), 1.0, pow2( material.anisotropy ) );
	material.anisotropyT = tbn[ 0 ] * anisotropyV.x + tbn[ 1 ] * anisotropyV.y;
	material.anisotropyB = tbn[ 1 ] * anisotropyV.x - tbn[ 0 ] * anisotropyV.y;
#endif`,nl=`struct PhysicalMaterial {
	vec3 diffuseColor;
	float roughness;
	vec3 specularColor;
	float specularF90;
	float dispersion;
	#ifdef USE_CLEARCOAT
		float clearcoat;
		float clearcoatRoughness;
		vec3 clearcoatF0;
		float clearcoatF90;
	#endif
	#ifdef USE_IRIDESCENCE
		float iridescence;
		float iridescenceIOR;
		float iridescenceThickness;
		vec3 iridescenceFresnel;
		vec3 iridescenceF0;
	#endif
	#ifdef USE_SHEEN
		vec3 sheenColor;
		float sheenRoughness;
	#endif
	#ifdef IOR
		float ior;
	#endif
	#ifdef USE_TRANSMISSION
		float transmission;
		float transmissionAlpha;
		float thickness;
		float attenuationDistance;
		vec3 attenuationColor;
	#endif
	#ifdef USE_ANISOTROPY
		float anisotropy;
		float alphaT;
		vec3 anisotropyT;
		vec3 anisotropyB;
	#endif
};
vec3 clearcoatSpecularDirect = vec3( 0.0 );
vec3 clearcoatSpecularIndirect = vec3( 0.0 );
vec3 sheenSpecularDirect = vec3( 0.0 );
vec3 sheenSpecularIndirect = vec3(0.0 );
vec3 Schlick_to_F0( const in vec3 f, const in float f90, const in float dotVH ) {
    float x = clamp( 1.0 - dotVH, 0.0, 1.0 );
    float x2 = x * x;
    float x5 = clamp( x * x2 * x2, 0.0, 0.9999 );
    return ( f - vec3( f90 ) * x5 ) / ( 1.0 - x5 );
}
float V_GGX_SmithCorrelated( const in float alpha, const in float dotNL, const in float dotNV ) {
	float a2 = pow2( alpha );
	float gv = dotNL * sqrt( a2 + ( 1.0 - a2 ) * pow2( dotNV ) );
	float gl = dotNV * sqrt( a2 + ( 1.0 - a2 ) * pow2( dotNL ) );
	return 0.5 / max( gv + gl, EPSILON );
}
float D_GGX( const in float alpha, const in float dotNH ) {
	float a2 = pow2( alpha );
	float denom = pow2( dotNH ) * ( a2 - 1.0 ) + 1.0;
	return RECIPROCAL_PI * a2 / pow2( denom );
}
#ifdef USE_ANISOTROPY
	float V_GGX_SmithCorrelated_Anisotropic( const in float alphaT, const in float alphaB, const in float dotTV, const in float dotBV, const in float dotTL, const in float dotBL, const in float dotNV, const in float dotNL ) {
		float gv = dotNL * length( vec3( alphaT * dotTV, alphaB * dotBV, dotNV ) );
		float gl = dotNV * length( vec3( alphaT * dotTL, alphaB * dotBL, dotNL ) );
		float v = 0.5 / ( gv + gl );
		return saturate(v);
	}
	float D_GGX_Anisotropic( const in float alphaT, const in float alphaB, const in float dotNH, const in float dotTH, const in float dotBH ) {
		float a2 = alphaT * alphaB;
		highp vec3 v = vec3( alphaB * dotTH, alphaT * dotBH, a2 * dotNH );
		highp float v2 = dot( v, v );
		float w2 = a2 / v2;
		return RECIPROCAL_PI * a2 * pow2 ( w2 );
	}
#endif
#ifdef USE_CLEARCOAT
	vec3 BRDF_GGX_Clearcoat( const in vec3 lightDir, const in vec3 viewDir, const in vec3 normal, const in PhysicalMaterial material) {
		vec3 f0 = material.clearcoatF0;
		float f90 = material.clearcoatF90;
		float roughness = material.clearcoatRoughness;
		float alpha = pow2( roughness );
		vec3 halfDir = normalize( lightDir + viewDir );
		float dotNL = saturate( dot( normal, lightDir ) );
		float dotNV = saturate( dot( normal, viewDir ) );
		float dotNH = saturate( dot( normal, halfDir ) );
		float dotVH = saturate( dot( viewDir, halfDir ) );
		vec3 F = F_Schlick( f0, f90, dotVH );
		float V = V_GGX_SmithCorrelated( alpha, dotNL, dotNV );
		float D = D_GGX( alpha, dotNH );
		return F * ( V * D );
	}
#endif
vec3 BRDF_GGX( const in vec3 lightDir, const in vec3 viewDir, const in vec3 normal, const in PhysicalMaterial material ) {
	vec3 f0 = material.specularColor;
	float f90 = material.specularF90;
	float roughness = material.roughness;
	float alpha = pow2( roughness );
	vec3 halfDir = normalize( lightDir + viewDir );
	float dotNL = saturate( dot( normal, lightDir ) );
	float dotNV = saturate( dot( normal, viewDir ) );
	float dotNH = saturate( dot( normal, halfDir ) );
	float dotVH = saturate( dot( viewDir, halfDir ) );
	vec3 F = F_Schlick( f0, f90, dotVH );
	#ifdef USE_IRIDESCENCE
		F = mix( F, material.iridescenceFresnel, material.iridescence );
	#endif
	#ifdef USE_ANISOTROPY
		float dotTL = dot( material.anisotropyT, lightDir );
		float dotTV = dot( material.anisotropyT, viewDir );
		float dotTH = dot( material.anisotropyT, halfDir );
		float dotBL = dot( material.anisotropyB, lightDir );
		float dotBV = dot( material.anisotropyB, viewDir );
		float dotBH = dot( material.anisotropyB, halfDir );
		float V = V_GGX_SmithCorrelated_Anisotropic( material.alphaT, alpha, dotTV, dotBV, dotTL, dotBL, dotNV, dotNL );
		float D = D_GGX_Anisotropic( material.alphaT, alpha, dotNH, dotTH, dotBH );
	#else
		float V = V_GGX_SmithCorrelated( alpha, dotNL, dotNV );
		float D = D_GGX( alpha, dotNH );
	#endif
	return F * ( V * D );
}
vec2 LTC_Uv( const in vec3 N, const in vec3 V, const in float roughness ) {
	const float LUT_SIZE = 64.0;
	const float LUT_SCALE = ( LUT_SIZE - 1.0 ) / LUT_SIZE;
	const float LUT_BIAS = 0.5 / LUT_SIZE;
	float dotNV = saturate( dot( N, V ) );
	vec2 uv = vec2( roughness, sqrt( 1.0 - dotNV ) );
	uv = uv * LUT_SCALE + LUT_BIAS;
	return uv;
}
float LTC_ClippedSphereFormFactor( const in vec3 f ) {
	float l = length( f );
	return max( ( l * l + f.z ) / ( l + 1.0 ), 0.0 );
}
vec3 LTC_EdgeVectorFormFactor( const in vec3 v1, const in vec3 v2 ) {
	float x = dot( v1, v2 );
	float y = abs( x );
	float a = 0.8543985 + ( 0.4965155 + 0.0145206 * y ) * y;
	float b = 3.4175940 + ( 4.1616724 + y ) * y;
	float v = a / b;
	float theta_sintheta = ( x > 0.0 ) ? v : 0.5 * inversesqrt( max( 1.0 - x * x, 1e-7 ) ) - v;
	return cross( v1, v2 ) * theta_sintheta;
}
vec3 LTC_Evaluate( const in vec3 N, const in vec3 V, const in vec3 P, const in mat3 mInv, const in vec3 rectCoords[ 4 ] ) {
	vec3 v1 = rectCoords[ 1 ] - rectCoords[ 0 ];
	vec3 v2 = rectCoords[ 3 ] - rectCoords[ 0 ];
	vec3 lightNormal = cross( v1, v2 );
	if( dot( lightNormal, P - rectCoords[ 0 ] ) < 0.0 ) return vec3( 0.0 );
	vec3 T1, T2;
	T1 = normalize( V - N * dot( V, N ) );
	T2 = - cross( N, T1 );
	mat3 mat = mInv * transposeMat3( mat3( T1, T2, N ) );
	vec3 coords[ 4 ];
	coords[ 0 ] = mat * ( rectCoords[ 0 ] - P );
	coords[ 1 ] = mat * ( rectCoords[ 1 ] - P );
	coords[ 2 ] = mat * ( rectCoords[ 2 ] - P );
	coords[ 3 ] = mat * ( rectCoords[ 3 ] - P );
	coords[ 0 ] = normalize( coords[ 0 ] );
	coords[ 1 ] = normalize( coords[ 1 ] );
	coords[ 2 ] = normalize( coords[ 2 ] );
	coords[ 3 ] = normalize( coords[ 3 ] );
	vec3 vectorFormFactor = vec3( 0.0 );
	vectorFormFactor += LTC_EdgeVectorFormFactor( coords[ 0 ], coords[ 1 ] );
	vectorFormFactor += LTC_EdgeVectorFormFactor( coords[ 1 ], coords[ 2 ] );
	vectorFormFactor += LTC_EdgeVectorFormFactor( coords[ 2 ], coords[ 3 ] );
	vectorFormFactor += LTC_EdgeVectorFormFactor( coords[ 3 ], coords[ 0 ] );
	float result = LTC_ClippedSphereFormFactor( vectorFormFactor );
	return vec3( result );
}
#if defined( USE_SHEEN )
float D_Charlie( float roughness, float dotNH ) {
	float alpha = pow2( roughness );
	float invAlpha = 1.0 / alpha;
	float cos2h = dotNH * dotNH;
	float sin2h = max( 1.0 - cos2h, 0.0078125 );
	return ( 2.0 + invAlpha ) * pow( sin2h, invAlpha * 0.5 ) / ( 2.0 * PI );
}
float V_Neubelt( float dotNV, float dotNL ) {
	return saturate( 1.0 / ( 4.0 * ( dotNL + dotNV - dotNL * dotNV ) ) );
}
vec3 BRDF_Sheen( const in vec3 lightDir, const in vec3 viewDir, const in vec3 normal, vec3 sheenColor, const in float sheenRoughness ) {
	vec3 halfDir = normalize( lightDir + viewDir );
	float dotNL = saturate( dot( normal, lightDir ) );
	float dotNV = saturate( dot( normal, viewDir ) );
	float dotNH = saturate( dot( normal, halfDir ) );
	float D = D_Charlie( sheenRoughness, dotNH );
	float V = V_Neubelt( dotNV, dotNL );
	return sheenColor * ( D * V );
}
#endif
float IBLSheenBRDF( const in vec3 normal, const in vec3 viewDir, const in float roughness ) {
	float dotNV = saturate( dot( normal, viewDir ) );
	float r2 = roughness * roughness;
	float a = roughness < 0.25 ? -339.2 * r2 + 161.4 * roughness - 25.9 : -8.48 * r2 + 14.3 * roughness - 9.95;
	float b = roughness < 0.25 ? 44.0 * r2 - 23.7 * roughness + 3.26 : 1.97 * r2 - 3.27 * roughness + 0.72;
	float DG = exp( a * dotNV + b ) + ( roughness < 0.25 ? 0.0 : 0.1 * ( roughness - 0.25 ) );
	return saturate( DG * RECIPROCAL_PI );
}
vec2 DFGApprox( const in vec3 normal, const in vec3 viewDir, const in float roughness ) {
	float dotNV = saturate( dot( normal, viewDir ) );
	const vec4 c0 = vec4( - 1, - 0.0275, - 0.572, 0.022 );
	const vec4 c1 = vec4( 1, 0.0425, 1.04, - 0.04 );
	vec4 r = roughness * c0 + c1;
	float a004 = min( r.x * r.x, exp2( - 9.28 * dotNV ) ) * r.x + r.y;
	vec2 fab = vec2( - 1.04, 1.04 ) * a004 + r.zw;
	return fab;
}
vec3 EnvironmentBRDF( const in vec3 normal, const in vec3 viewDir, const in vec3 specularColor, const in float specularF90, const in float roughness ) {
	vec2 fab = DFGApprox( normal, viewDir, roughness );
	return specularColor * fab.x + specularF90 * fab.y;
}
#ifdef USE_IRIDESCENCE
void computeMultiscatteringIridescence( const in vec3 normal, const in vec3 viewDir, const in vec3 specularColor, const in float specularF90, const in float iridescence, const in vec3 iridescenceF0, const in float roughness, inout vec3 singleScatter, inout vec3 multiScatter ) {
#else
void computeMultiscattering( const in vec3 normal, const in vec3 viewDir, const in vec3 specularColor, const in float specularF90, const in float roughness, inout vec3 singleScatter, inout vec3 multiScatter ) {
#endif
	vec2 fab = DFGApprox( normal, viewDir, roughness );
	#ifdef USE_IRIDESCENCE
		vec3 Fr = mix( specularColor, iridescenceF0, iridescence );
	#else
		vec3 Fr = specularColor;
	#endif
	vec3 FssEss = Fr * fab.x + specularF90 * fab.y;
	float Ess = fab.x + fab.y;
	float Ems = 1.0 - Ess;
	vec3 Favg = Fr + ( 1.0 - Fr ) * 0.047619;	vec3 Fms = FssEss * Favg / ( 1.0 - Ems * Favg );
	singleScatter += FssEss;
	multiScatter += Fms * Ems;
}
#if NUM_RECT_AREA_LIGHTS > 0
	void RE_Direct_RectArea_Physical( const in RectAreaLight rectAreaLight, const in vec3 geometryPosition, const in vec3 geometryNormal, const in vec3 geometryViewDir, const in vec3 geometryClearcoatNormal, const in PhysicalMaterial material, inout ReflectedLight reflectedLight ) {
		vec3 normal = geometryNormal;
		vec3 viewDir = geometryViewDir;
		vec3 position = geometryPosition;
		vec3 lightPos = rectAreaLight.position;
		vec3 halfWidth = rectAreaLight.halfWidth;
		vec3 halfHeight = rectAreaLight.halfHeight;
		vec3 lightColor = rectAreaLight.color;
		float roughness = material.roughness;
		vec3 rectCoords[ 4 ];
		rectCoords[ 0 ] = lightPos + halfWidth - halfHeight;		rectCoords[ 1 ] = lightPos - halfWidth - halfHeight;
		rectCoords[ 2 ] = lightPos - halfWidth + halfHeight;
		rectCoords[ 3 ] = lightPos + halfWidth + halfHeight;
		vec2 uv = LTC_Uv( normal, viewDir, roughness );
		vec4 t1 = texture2D( ltc_1, uv );
		vec4 t2 = texture2D( ltc_2, uv );
		mat3 mInv = mat3(
			vec3( t1.x, 0, t1.y ),
			vec3(    0, 1,    0 ),
			vec3( t1.z, 0, t1.w )
		);
		vec3 fresnel = ( material.specularColor * t2.x + ( vec3( 1.0 ) - material.specularColor ) * t2.y );
		reflectedLight.directSpecular += lightColor * fresnel * LTC_Evaluate( normal, viewDir, position, mInv, rectCoords );
		reflectedLight.directDiffuse += lightColor * material.diffuseColor * LTC_Evaluate( normal, viewDir, position, mat3( 1.0 ), rectCoords );
	}
#endif
void RE_Direct_Physical( const in IncidentLight directLight, const in vec3 geometryPosition, const in vec3 geometryNormal, const in vec3 geometryViewDir, const in vec3 geometryClearcoatNormal, const in PhysicalMaterial material, inout ReflectedLight reflectedLight ) {
	float dotNL = saturate( dot( geometryNormal, directLight.direction ) );
	vec3 irradiance = dotNL * directLight.color;
	#ifdef USE_CLEARCOAT
		float dotNLcc = saturate( dot( geometryClearcoatNormal, directLight.direction ) );
		vec3 ccIrradiance = dotNLcc * directLight.color;
		clearcoatSpecularDirect += ccIrradiance * BRDF_GGX_Clearcoat( directLight.direction, geometryViewDir, geometryClearcoatNormal, material );
	#endif
	#ifdef USE_SHEEN
		sheenSpecularDirect += irradiance * BRDF_Sheen( directLight.direction, geometryViewDir, geometryNormal, material.sheenColor, material.sheenRoughness );
	#endif
	reflectedLight.directSpecular += irradiance * BRDF_GGX( directLight.direction, geometryViewDir, geometryNormal, material );
	reflectedLight.directDiffuse += irradiance * BRDF_Lambert( material.diffuseColor );
}
void RE_IndirectDiffuse_Physical( const in vec3 irradiance, const in vec3 geometryPosition, const in vec3 geometryNormal, const in vec3 geometryViewDir, const in vec3 geometryClearcoatNormal, const in PhysicalMaterial material, inout ReflectedLight reflectedLight ) {
	reflectedLight.indirectDiffuse += irradiance * BRDF_Lambert( material.diffuseColor );
}
void RE_IndirectSpecular_Physical( const in vec3 radiance, const in vec3 irradiance, const in vec3 clearcoatRadiance, const in vec3 geometryPosition, const in vec3 geometryNormal, const in vec3 geometryViewDir, const in vec3 geometryClearcoatNormal, const in PhysicalMaterial material, inout ReflectedLight reflectedLight) {
	#ifdef USE_CLEARCOAT
		clearcoatSpecularIndirect += clearcoatRadiance * EnvironmentBRDF( geometryClearcoatNormal, geometryViewDir, material.clearcoatF0, material.clearcoatF90, material.clearcoatRoughness );
	#endif
	#ifdef USE_SHEEN
		sheenSpecularIndirect += irradiance * material.sheenColor * IBLSheenBRDF( geometryNormal, geometryViewDir, material.sheenRoughness );
	#endif
	vec3 singleScattering = vec3( 0.0 );
	vec3 multiScattering = vec3( 0.0 );
	vec3 cosineWeightedIrradiance = irradiance * RECIPROCAL_PI;
	#ifdef USE_IRIDESCENCE
		computeMultiscatteringIridescence( geometryNormal, geometryViewDir, material.specularColor, material.specularF90, material.iridescence, material.iridescenceFresnel, material.roughness, singleScattering, multiScattering );
	#else
		computeMultiscattering( geometryNormal, geometryViewDir, material.specularColor, material.specularF90, material.roughness, singleScattering, multiScattering );
	#endif
	vec3 totalScattering = singleScattering + multiScattering;
	vec3 diffuse = material.diffuseColor * ( 1.0 - max( max( totalScattering.r, totalScattering.g ), totalScattering.b ) );
	reflectedLight.indirectSpecular += radiance * singleScattering;
	reflectedLight.indirectSpecular += multiScattering * cosineWeightedIrradiance;
	reflectedLight.indirectDiffuse += diffuse * cosineWeightedIrradiance;
}
#define RE_Direct				RE_Direct_Physical
#define RE_Direct_RectArea		RE_Direct_RectArea_Physical
#define RE_IndirectDiffuse		RE_IndirectDiffuse_Physical
#define RE_IndirectSpecular		RE_IndirectSpecular_Physical
float computeSpecularOcclusion( const in float dotNV, const in float ambientOcclusion, const in float roughness ) {
	return saturate( pow( dotNV + ambientOcclusion, exp2( - 16.0 * roughness - 1.0 ) ) - 1.0 + ambientOcclusion );
}`,il=`
vec3 geometryPosition = - vViewPosition;
vec3 geometryNormal = normal;
vec3 geometryViewDir = ( isOrthographic ) ? vec3( 0, 0, 1 ) : normalize( vViewPosition );
vec3 geometryClearcoatNormal = vec3( 0.0 );
#ifdef USE_CLEARCOAT
	geometryClearcoatNormal = clearcoatNormal;
#endif
#ifdef USE_IRIDESCENCE
	float dotNVi = saturate( dot( normal, geometryViewDir ) );
	if ( material.iridescenceThickness == 0.0 ) {
		material.iridescence = 0.0;
	} else {
		material.iridescence = saturate( material.iridescence );
	}
	if ( material.iridescence > 0.0 ) {
		material.iridescenceFresnel = evalIridescence( 1.0, material.iridescenceIOR, dotNVi, material.iridescenceThickness, material.specularColor );
		material.iridescenceF0 = Schlick_to_F0( material.iridescenceFresnel, 1.0, dotNVi );
	}
#endif
IncidentLight directLight;
#if ( NUM_POINT_LIGHTS > 0 ) && defined( RE_Direct )
	PointLight pointLight;
	#if defined( USE_SHADOWMAP ) && NUM_POINT_LIGHT_SHADOWS > 0
	PointLightShadow pointLightShadow;
	#endif
	#pragma unroll_loop_start
	for ( int i = 0; i < NUM_POINT_LIGHTS; i ++ ) {
		pointLight = pointLights[ i ];
		getPointLightInfo( pointLight, geometryPosition, directLight );
		#if defined( USE_SHADOWMAP ) && ( UNROLLED_LOOP_INDEX < NUM_POINT_LIGHT_SHADOWS )
		pointLightShadow = pointLightShadows[ i ];
		directLight.color *= ( directLight.visible && receiveShadow ) ? getPointShadow( pointShadowMap[ i ], pointLightShadow.shadowMapSize, pointLightShadow.shadowIntensity, pointLightShadow.shadowBias, pointLightShadow.shadowRadius, vPointShadowCoord[ i ], pointLightShadow.shadowCameraNear, pointLightShadow.shadowCameraFar ) : 1.0;
		#endif
		RE_Direct( directLight, geometryPosition, geometryNormal, geometryViewDir, geometryClearcoatNormal, material, reflectedLight );
	}
	#pragma unroll_loop_end
#endif
#if ( NUM_SPOT_LIGHTS > 0 ) && defined( RE_Direct )
	SpotLight spotLight;
	vec4 spotColor;
	vec3 spotLightCoord;
	bool inSpotLightMap;
	#if defined( USE_SHADOWMAP ) && NUM_SPOT_LIGHT_SHADOWS > 0
	SpotLightShadow spotLightShadow;
	#endif
	#pragma unroll_loop_start
	for ( int i = 0; i < NUM_SPOT_LIGHTS; i ++ ) {
		spotLight = spotLights[ i ];
		getSpotLightInfo( spotLight, geometryPosition, directLight );
		#if ( UNROLLED_LOOP_INDEX < NUM_SPOT_LIGHT_SHADOWS_WITH_MAPS )
		#define SPOT_LIGHT_MAP_INDEX UNROLLED_LOOP_INDEX
		#elif ( UNROLLED_LOOP_INDEX < NUM_SPOT_LIGHT_SHADOWS )
		#define SPOT_LIGHT_MAP_INDEX NUM_SPOT_LIGHT_MAPS
		#else
		#define SPOT_LIGHT_MAP_INDEX ( UNROLLED_LOOP_INDEX - NUM_SPOT_LIGHT_SHADOWS + NUM_SPOT_LIGHT_SHADOWS_WITH_MAPS )
		#endif
		#if ( SPOT_LIGHT_MAP_INDEX < NUM_SPOT_LIGHT_MAPS )
			spotLightCoord = vSpotLightCoord[ i ].xyz / vSpotLightCoord[ i ].w;
			inSpotLightMap = all( lessThan( abs( spotLightCoord * 2. - 1. ), vec3( 1.0 ) ) );
			spotColor = texture2D( spotLightMap[ SPOT_LIGHT_MAP_INDEX ], spotLightCoord.xy );
			directLight.color = inSpotLightMap ? directLight.color * spotColor.rgb : directLight.color;
		#endif
		#undef SPOT_LIGHT_MAP_INDEX
		#if defined( USE_SHADOWMAP ) && ( UNROLLED_LOOP_INDEX < NUM_SPOT_LIGHT_SHADOWS )
		spotLightShadow = spotLightShadows[ i ];
		directLight.color *= ( directLight.visible && receiveShadow ) ? getShadow( spotShadowMap[ i ], spotLightShadow.shadowMapSize, spotLightShadow.shadowIntensity, spotLightShadow.shadowBias, spotLightShadow.shadowRadius, vSpotLightCoord[ i ] ) : 1.0;
		#endif
		RE_Direct( directLight, geometryPosition, geometryNormal, geometryViewDir, geometryClearcoatNormal, material, reflectedLight );
	}
	#pragma unroll_loop_end
#endif
#if ( NUM_DIR_LIGHTS > 0 ) && defined( RE_Direct )
	DirectionalLight directionalLight;
	#if defined( USE_SHADOWMAP ) && NUM_DIR_LIGHT_SHADOWS > 0
	DirectionalLightShadow directionalLightShadow;
	#endif
	#pragma unroll_loop_start
	for ( int i = 0; i < NUM_DIR_LIGHTS; i ++ ) {
		directionalLight = directionalLights[ i ];
		getDirectionalLightInfo( directionalLight, directLight );
		#if defined( USE_SHADOWMAP ) && ( UNROLLED_LOOP_INDEX < NUM_DIR_LIGHT_SHADOWS )
		directionalLightShadow = directionalLightShadows[ i ];
		directLight.color *= ( directLight.visible && receiveShadow ) ? getShadow( directionalShadowMap[ i ], directionalLightShadow.shadowMapSize, directionalLightShadow.shadowIntensity, directionalLightShadow.shadowBias, directionalLightShadow.shadowRadius, vDirectionalShadowCoord[ i ] ) : 1.0;
		#endif
		RE_Direct( directLight, geometryPosition, geometryNormal, geometryViewDir, geometryClearcoatNormal, material, reflectedLight );
	}
	#pragma unroll_loop_end
#endif
#if ( NUM_RECT_AREA_LIGHTS > 0 ) && defined( RE_Direct_RectArea )
	RectAreaLight rectAreaLight;
	#pragma unroll_loop_start
	for ( int i = 0; i < NUM_RECT_AREA_LIGHTS; i ++ ) {
		rectAreaLight = rectAreaLights[ i ];
		RE_Direct_RectArea( rectAreaLight, geometryPosition, geometryNormal, geometryViewDir, geometryClearcoatNormal, material, reflectedLight );
	}
	#pragma unroll_loop_end
#endif
#if defined( RE_IndirectDiffuse )
	vec3 iblIrradiance = vec3( 0.0 );
	vec3 irradiance = getAmbientLightIrradiance( ambientLightColor );
	#if defined( USE_LIGHT_PROBES )
		irradiance += getLightProbeIrradiance( lightProbe, geometryNormal );
	#endif
	#if ( NUM_HEMI_LIGHTS > 0 )
		#pragma unroll_loop_start
		for ( int i = 0; i < NUM_HEMI_LIGHTS; i ++ ) {
			irradiance += getHemisphereLightIrradiance( hemisphereLights[ i ], geometryNormal );
		}
		#pragma unroll_loop_end
	#endif
#endif
#if defined( RE_IndirectSpecular )
	vec3 radiance = vec3( 0.0 );
	vec3 clearcoatRadiance = vec3( 0.0 );
#endif`,rl=`#if defined( RE_IndirectDiffuse )
	#ifdef USE_LIGHTMAP
		vec4 lightMapTexel = texture2D( lightMap, vLightMapUv );
		vec3 lightMapIrradiance = lightMapTexel.rgb * lightMapIntensity;
		irradiance += lightMapIrradiance;
	#endif
	#if defined( USE_ENVMAP ) && defined( STANDARD ) && defined( ENVMAP_TYPE_CUBE_UV )
		iblIrradiance += getIBLIrradiance( geometryNormal );
	#endif
#endif
#if defined( USE_ENVMAP ) && defined( RE_IndirectSpecular )
	#ifdef USE_ANISOTROPY
		radiance += getIBLAnisotropyRadiance( geometryViewDir, geometryNormal, material.roughness, material.anisotropyB, material.anisotropy );
	#else
		radiance += getIBLRadiance( geometryViewDir, geometryNormal, material.roughness );
	#endif
	#ifdef USE_CLEARCOAT
		clearcoatRadiance += getIBLRadiance( geometryViewDir, geometryClearcoatNormal, material.clearcoatRoughness );
	#endif
#endif`,sl=`#if defined( RE_IndirectDiffuse )
	RE_IndirectDiffuse( irradiance, geometryPosition, geometryNormal, geometryViewDir, geometryClearcoatNormal, material, reflectedLight );
#endif
#if defined( RE_IndirectSpecular )
	RE_IndirectSpecular( radiance, iblIrradiance, clearcoatRadiance, geometryPosition, geometryNormal, geometryViewDir, geometryClearcoatNormal, material, reflectedLight );
#endif`,al=`#if defined( USE_LOGDEPTHBUF )
	gl_FragDepth = vIsPerspective == 0.0 ? gl_FragCoord.z : log2( vFragDepth ) * logDepthBufFC * 0.5;
#endif`,ol=`#if defined( USE_LOGDEPTHBUF )
	uniform float logDepthBufFC;
	varying float vFragDepth;
	varying float vIsPerspective;
#endif`,ll=`#ifdef USE_LOGDEPTHBUF
	varying float vFragDepth;
	varying float vIsPerspective;
#endif`,cl=`#ifdef USE_LOGDEPTHBUF
	vFragDepth = 1.0 + gl_Position.w;
	vIsPerspective = float( isPerspectiveMatrix( projectionMatrix ) );
#endif`,ul=`#ifdef USE_MAP
	vec4 sampledDiffuseColor = texture2D( map, vMapUv );
	#ifdef DECODE_VIDEO_TEXTURE
		sampledDiffuseColor = sRGBTransferEOTF( sampledDiffuseColor );
	#endif
	diffuseColor *= sampledDiffuseColor;
#endif`,hl=`#ifdef USE_MAP
	uniform sampler2D map;
#endif`,fl=`#if defined( USE_MAP ) || defined( USE_ALPHAMAP )
	#if defined( USE_POINTS_UV )
		vec2 uv = vUv;
	#else
		vec2 uv = ( uvTransform * vec3( gl_PointCoord.x, 1.0 - gl_PointCoord.y, 1 ) ).xy;
	#endif
#endif
#ifdef USE_MAP
	diffuseColor *= texture2D( map, uv );
#endif
#ifdef USE_ALPHAMAP
	diffuseColor.a *= texture2D( alphaMap, uv ).g;
#endif`,dl=`#if defined( USE_POINTS_UV )
	varying vec2 vUv;
#else
	#if defined( USE_MAP ) || defined( USE_ALPHAMAP )
		uniform mat3 uvTransform;
	#endif
#endif
#ifdef USE_MAP
	uniform sampler2D map;
#endif
#ifdef USE_ALPHAMAP
	uniform sampler2D alphaMap;
#endif`,pl=`float metalnessFactor = metalness;
#ifdef USE_METALNESSMAP
	vec4 texelMetalness = texture2D( metalnessMap, vMetalnessMapUv );
	metalnessFactor *= texelMetalness.b;
#endif`,ml=`#ifdef USE_METALNESSMAP
	uniform sampler2D metalnessMap;
#endif`,_l=`#ifdef USE_INSTANCING_MORPH
	float morphTargetInfluences[ MORPHTARGETS_COUNT ];
	float morphTargetBaseInfluence = texelFetch( morphTexture, ivec2( 0, gl_InstanceID ), 0 ).r;
	for ( int i = 0; i < MORPHTARGETS_COUNT; i ++ ) {
		morphTargetInfluences[i] =  texelFetch( morphTexture, ivec2( i + 1, gl_InstanceID ), 0 ).r;
	}
#endif`,gl=`#if defined( USE_MORPHCOLORS )
	vColor *= morphTargetBaseInfluence;
	for ( int i = 0; i < MORPHTARGETS_COUNT; i ++ ) {
		#if defined( USE_COLOR_ALPHA )
			if ( morphTargetInfluences[ i ] != 0.0 ) vColor += getMorph( gl_VertexID, i, 2 ) * morphTargetInfluences[ i ];
		#elif defined( USE_COLOR )
			if ( morphTargetInfluences[ i ] != 0.0 ) vColor += getMorph( gl_VertexID, i, 2 ).rgb * morphTargetInfluences[ i ];
		#endif
	}
#endif`,xl=`#ifdef USE_MORPHNORMALS
	objectNormal *= morphTargetBaseInfluence;
	for ( int i = 0; i < MORPHTARGETS_COUNT; i ++ ) {
		if ( morphTargetInfluences[ i ] != 0.0 ) objectNormal += getMorph( gl_VertexID, i, 1 ).xyz * morphTargetInfluences[ i ];
	}
#endif`,vl=`#ifdef USE_MORPHTARGETS
	#ifndef USE_INSTANCING_MORPH
		uniform float morphTargetBaseInfluence;
		uniform float morphTargetInfluences[ MORPHTARGETS_COUNT ];
	#endif
	uniform sampler2DArray morphTargetsTexture;
	uniform ivec2 morphTargetsTextureSize;
	vec4 getMorph( const in int vertexIndex, const in int morphTargetIndex, const in int offset ) {
		int texelIndex = vertexIndex * MORPHTARGETS_TEXTURE_STRIDE + offset;
		int y = texelIndex / morphTargetsTextureSize.x;
		int x = texelIndex - y * morphTargetsTextureSize.x;
		ivec3 morphUV = ivec3( x, y, morphTargetIndex );
		return texelFetch( morphTargetsTexture, morphUV, 0 );
	}
#endif`,Sl=`#ifdef USE_MORPHTARGETS
	transformed *= morphTargetBaseInfluence;
	for ( int i = 0; i < MORPHTARGETS_COUNT; i ++ ) {
		if ( morphTargetInfluences[ i ] != 0.0 ) transformed += getMorph( gl_VertexID, i, 0 ).xyz * morphTargetInfluences[ i ];
	}
#endif`,Ml=`float faceDirection = gl_FrontFacing ? 1.0 : - 1.0;
#ifdef FLAT_SHADED
	vec3 fdx = dFdx( vViewPosition );
	vec3 fdy = dFdy( vViewPosition );
	vec3 normal = normalize( cross( fdx, fdy ) );
#else
	vec3 normal = normalize( vNormal );
	#ifdef DOUBLE_SIDED
		normal *= faceDirection;
	#endif
#endif
#if defined( USE_NORMALMAP_TANGENTSPACE ) || defined( USE_CLEARCOAT_NORMALMAP ) || defined( USE_ANISOTROPY )
	#ifdef USE_TANGENT
		mat3 tbn = mat3( normalize( vTangent ), normalize( vBitangent ), normal );
	#else
		mat3 tbn = getTangentFrame( - vViewPosition, normal,
		#if defined( USE_NORMALMAP )
			vNormalMapUv
		#elif defined( USE_CLEARCOAT_NORMALMAP )
			vClearcoatNormalMapUv
		#else
			vUv
		#endif
		);
	#endif
	#if defined( DOUBLE_SIDED ) && ! defined( FLAT_SHADED )
		tbn[0] *= faceDirection;
		tbn[1] *= faceDirection;
	#endif
#endif
#ifdef USE_CLEARCOAT_NORMALMAP
	#ifdef USE_TANGENT
		mat3 tbn2 = mat3( normalize( vTangent ), normalize( vBitangent ), normal );
	#else
		mat3 tbn2 = getTangentFrame( - vViewPosition, normal, vClearcoatNormalMapUv );
	#endif
	#if defined( DOUBLE_SIDED ) && ! defined( FLAT_SHADED )
		tbn2[0] *= faceDirection;
		tbn2[1] *= faceDirection;
	#endif
#endif
vec3 nonPerturbedNormal = normal;`,El=`#ifdef USE_NORMALMAP_OBJECTSPACE
	normal = texture2D( normalMap, vNormalMapUv ).xyz * 2.0 - 1.0;
	#ifdef FLIP_SIDED
		normal = - normal;
	#endif
	#ifdef DOUBLE_SIDED
		normal = normal * faceDirection;
	#endif
	normal = normalize( normalMatrix * normal );
#elif defined( USE_NORMALMAP_TANGENTSPACE )
	vec3 mapN = texture2D( normalMap, vNormalMapUv ).xyz * 2.0 - 1.0;
	mapN.xy *= normalScale;
	normal = normalize( tbn * mapN );
#elif defined( USE_BUMPMAP )
	normal = perturbNormalArb( - vViewPosition, normal, dHdxy_fwd(), faceDirection );
#endif`,yl=`#ifndef FLAT_SHADED
	varying vec3 vNormal;
	#ifdef USE_TANGENT
		varying vec3 vTangent;
		varying vec3 vBitangent;
	#endif
#endif`,Tl=`#ifndef FLAT_SHADED
	varying vec3 vNormal;
	#ifdef USE_TANGENT
		varying vec3 vTangent;
		varying vec3 vBitangent;
	#endif
#endif`,Al=`#ifndef FLAT_SHADED
	vNormal = normalize( transformedNormal );
	#ifdef USE_TANGENT
		vTangent = normalize( transformedTangent );
		vBitangent = normalize( cross( vNormal, vTangent ) * tangent.w );
	#endif
#endif`,bl=`#ifdef USE_NORMALMAP
	uniform sampler2D normalMap;
	uniform vec2 normalScale;
#endif
#ifdef USE_NORMALMAP_OBJECTSPACE
	uniform mat3 normalMatrix;
#endif
#if ! defined ( USE_TANGENT ) && ( defined ( USE_NORMALMAP_TANGENTSPACE ) || defined ( USE_CLEARCOAT_NORMALMAP ) || defined( USE_ANISOTROPY ) )
	mat3 getTangentFrame( vec3 eye_pos, vec3 surf_norm, vec2 uv ) {
		vec3 q0 = dFdx( eye_pos.xyz );
		vec3 q1 = dFdy( eye_pos.xyz );
		vec2 st0 = dFdx( uv.st );
		vec2 st1 = dFdy( uv.st );
		vec3 N = surf_norm;
		vec3 q1perp = cross( q1, N );
		vec3 q0perp = cross( N, q0 );
		vec3 T = q1perp * st0.x + q0perp * st1.x;
		vec3 B = q1perp * st0.y + q0perp * st1.y;
		float det = max( dot( T, T ), dot( B, B ) );
		float scale = ( det == 0.0 ) ? 0.0 : inversesqrt( det );
		return mat3( T * scale, B * scale, N );
	}
#endif`,Rl=`#ifdef USE_CLEARCOAT
	vec3 clearcoatNormal = nonPerturbedNormal;
#endif`,wl=`#ifdef USE_CLEARCOAT_NORMALMAP
	vec3 clearcoatMapN = texture2D( clearcoatNormalMap, vClearcoatNormalMapUv ).xyz * 2.0 - 1.0;
	clearcoatMapN.xy *= clearcoatNormalScale;
	clearcoatNormal = normalize( tbn2 * clearcoatMapN );
#endif`,Cl=`#ifdef USE_CLEARCOATMAP
	uniform sampler2D clearcoatMap;
#endif
#ifdef USE_CLEARCOAT_NORMALMAP
	uniform sampler2D clearcoatNormalMap;
	uniform vec2 clearcoatNormalScale;
#endif
#ifdef USE_CLEARCOAT_ROUGHNESSMAP
	uniform sampler2D clearcoatRoughnessMap;
#endif`,Pl=`#ifdef USE_IRIDESCENCEMAP
	uniform sampler2D iridescenceMap;
#endif
#ifdef USE_IRIDESCENCE_THICKNESSMAP
	uniform sampler2D iridescenceThicknessMap;
#endif`,Dl=`#ifdef OPAQUE
diffuseColor.a = 1.0;
#endif
#ifdef USE_TRANSMISSION
diffuseColor.a *= material.transmissionAlpha;
#endif
gl_FragColor = vec4( outgoingLight, diffuseColor.a );`,Il=`vec3 packNormalToRGB( const in vec3 normal ) {
	return normalize( normal ) * 0.5 + 0.5;
}
vec3 unpackRGBToNormal( const in vec3 rgb ) {
	return 2.0 * rgb.xyz - 1.0;
}
const float PackUpscale = 256. / 255.;const float UnpackDownscale = 255. / 256.;const float ShiftRight8 = 1. / 256.;
const float Inv255 = 1. / 255.;
const vec4 PackFactors = vec4( 1.0, 256.0, 256.0 * 256.0, 256.0 * 256.0 * 256.0 );
const vec2 UnpackFactors2 = vec2( UnpackDownscale, 1.0 / PackFactors.g );
const vec3 UnpackFactors3 = vec3( UnpackDownscale / PackFactors.rg, 1.0 / PackFactors.b );
const vec4 UnpackFactors4 = vec4( UnpackDownscale / PackFactors.rgb, 1.0 / PackFactors.a );
vec4 packDepthToRGBA( const in float v ) {
	if( v <= 0.0 )
		return vec4( 0., 0., 0., 0. );
	if( v >= 1.0 )
		return vec4( 1., 1., 1., 1. );
	float vuf;
	float af = modf( v * PackFactors.a, vuf );
	float bf = modf( vuf * ShiftRight8, vuf );
	float gf = modf( vuf * ShiftRight8, vuf );
	return vec4( vuf * Inv255, gf * PackUpscale, bf * PackUpscale, af );
}
vec3 packDepthToRGB( const in float v ) {
	if( v <= 0.0 )
		return vec3( 0., 0., 0. );
	if( v >= 1.0 )
		return vec3( 1., 1., 1. );
	float vuf;
	float bf = modf( v * PackFactors.b, vuf );
	float gf = modf( vuf * ShiftRight8, vuf );
	return vec3( vuf * Inv255, gf * PackUpscale, bf );
}
vec2 packDepthToRG( const in float v ) {
	if( v <= 0.0 )
		return vec2( 0., 0. );
	if( v >= 1.0 )
		return vec2( 1., 1. );
	float vuf;
	float gf = modf( v * 256., vuf );
	return vec2( vuf * Inv255, gf );
}
float unpackRGBAToDepth( const in vec4 v ) {
	return dot( v, UnpackFactors4 );
}
float unpackRGBToDepth( const in vec3 v ) {
	return dot( v, UnpackFactors3 );
}
float unpackRGToDepth( const in vec2 v ) {
	return v.r * UnpackFactors2.r + v.g * UnpackFactors2.g;
}
vec4 pack2HalfToRGBA( const in vec2 v ) {
	vec4 r = vec4( v.x, fract( v.x * 255.0 ), v.y, fract( v.y * 255.0 ) );
	return vec4( r.x - r.y / 255.0, r.y, r.z - r.w / 255.0, r.w );
}
vec2 unpackRGBATo2Half( const in vec4 v ) {
	return vec2( v.x + ( v.y / 255.0 ), v.z + ( v.w / 255.0 ) );
}
float viewZToOrthographicDepth( const in float viewZ, const in float near, const in float far ) {
	return ( viewZ + near ) / ( near - far );
}
float orthographicDepthToViewZ( const in float depth, const in float near, const in float far ) {
	return depth * ( near - far ) - near;
}
float viewZToPerspectiveDepth( const in float viewZ, const in float near, const in float far ) {
	return ( ( near + viewZ ) * far ) / ( ( far - near ) * viewZ );
}
float perspectiveDepthToViewZ( const in float depth, const in float near, const in float far ) {
	return ( near * far ) / ( ( far - near ) * depth - far );
}`,Ul=`#ifdef PREMULTIPLIED_ALPHA
	gl_FragColor.rgb *= gl_FragColor.a;
#endif`,Ll=`vec4 mvPosition = vec4( transformed, 1.0 );
#ifdef USE_BATCHING
	mvPosition = batchingMatrix * mvPosition;
#endif
#ifdef USE_INSTANCING
	mvPosition = instanceMatrix * mvPosition;
#endif
mvPosition = modelViewMatrix * mvPosition;
gl_Position = projectionMatrix * mvPosition;`,Fl=`#ifdef DITHERING
	gl_FragColor.rgb = dithering( gl_FragColor.rgb );
#endif`,Nl=`#ifdef DITHERING
	vec3 dithering( vec3 color ) {
		float grid_position = rand( gl_FragCoord.xy );
		vec3 dither_shift_RGB = vec3( 0.25 / 255.0, -0.25 / 255.0, 0.25 / 255.0 );
		dither_shift_RGB = mix( 2.0 * dither_shift_RGB, -2.0 * dither_shift_RGB, grid_position );
		return color + dither_shift_RGB;
	}
#endif`,Bl=`float roughnessFactor = roughness;
#ifdef USE_ROUGHNESSMAP
	vec4 texelRoughness = texture2D( roughnessMap, vRoughnessMapUv );
	roughnessFactor *= texelRoughness.g;
#endif`,Ol=`#ifdef USE_ROUGHNESSMAP
	uniform sampler2D roughnessMap;
#endif`,Gl=`#if NUM_SPOT_LIGHT_COORDS > 0
	varying vec4 vSpotLightCoord[ NUM_SPOT_LIGHT_COORDS ];
#endif
#if NUM_SPOT_LIGHT_MAPS > 0
	uniform sampler2D spotLightMap[ NUM_SPOT_LIGHT_MAPS ];
#endif
#ifdef USE_SHADOWMAP
	#if NUM_DIR_LIGHT_SHADOWS > 0
		uniform sampler2D directionalShadowMap[ NUM_DIR_LIGHT_SHADOWS ];
		varying vec4 vDirectionalShadowCoord[ NUM_DIR_LIGHT_SHADOWS ];
		struct DirectionalLightShadow {
			float shadowIntensity;
			float shadowBias;
			float shadowNormalBias;
			float shadowRadius;
			vec2 shadowMapSize;
		};
		uniform DirectionalLightShadow directionalLightShadows[ NUM_DIR_LIGHT_SHADOWS ];
	#endif
	#if NUM_SPOT_LIGHT_SHADOWS > 0
		uniform sampler2D spotShadowMap[ NUM_SPOT_LIGHT_SHADOWS ];
		struct SpotLightShadow {
			float shadowIntensity;
			float shadowBias;
			float shadowNormalBias;
			float shadowRadius;
			vec2 shadowMapSize;
		};
		uniform SpotLightShadow spotLightShadows[ NUM_SPOT_LIGHT_SHADOWS ];
	#endif
	#if NUM_POINT_LIGHT_SHADOWS > 0
		uniform sampler2D pointShadowMap[ NUM_POINT_LIGHT_SHADOWS ];
		varying vec4 vPointShadowCoord[ NUM_POINT_LIGHT_SHADOWS ];
		struct PointLightShadow {
			float shadowIntensity;
			float shadowBias;
			float shadowNormalBias;
			float shadowRadius;
			vec2 shadowMapSize;
			float shadowCameraNear;
			float shadowCameraFar;
		};
		uniform PointLightShadow pointLightShadows[ NUM_POINT_LIGHT_SHADOWS ];
	#endif
	float texture2DCompare( sampler2D depths, vec2 uv, float compare ) {
		return step( compare, unpackRGBAToDepth( texture2D( depths, uv ) ) );
	}
	vec2 texture2DDistribution( sampler2D shadow, vec2 uv ) {
		return unpackRGBATo2Half( texture2D( shadow, uv ) );
	}
	float VSMShadow (sampler2D shadow, vec2 uv, float compare ){
		float occlusion = 1.0;
		vec2 distribution = texture2DDistribution( shadow, uv );
		float hard_shadow = step( compare , distribution.x );
		if (hard_shadow != 1.0 ) {
			float distance = compare - distribution.x ;
			float variance = max( 0.00000, distribution.y * distribution.y );
			float softness_probability = variance / (variance + distance * distance );			softness_probability = clamp( ( softness_probability - 0.3 ) / ( 0.95 - 0.3 ), 0.0, 1.0 );			occlusion = clamp( max( hard_shadow, softness_probability ), 0.0, 1.0 );
		}
		return occlusion;
	}
	float getShadow( sampler2D shadowMap, vec2 shadowMapSize, float shadowIntensity, float shadowBias, float shadowRadius, vec4 shadowCoord ) {
		float shadow = 1.0;
		shadowCoord.xyz /= shadowCoord.w;
		shadowCoord.z += shadowBias;
		bool inFrustum = shadowCoord.x >= 0.0 && shadowCoord.x <= 1.0 && shadowCoord.y >= 0.0 && shadowCoord.y <= 1.0;
		bool frustumTest = inFrustum && shadowCoord.z <= 1.0;
		if ( frustumTest ) {
		#if defined( SHADOWMAP_TYPE_PCF )
			vec2 texelSize = vec2( 1.0 ) / shadowMapSize;
			float dx0 = - texelSize.x * shadowRadius;
			float dy0 = - texelSize.y * shadowRadius;
			float dx1 = + texelSize.x * shadowRadius;
			float dy1 = + texelSize.y * shadowRadius;
			float dx2 = dx0 / 2.0;
			float dy2 = dy0 / 2.0;
			float dx3 = dx1 / 2.0;
			float dy3 = dy1 / 2.0;
			shadow = (
				texture2DCompare( shadowMap, shadowCoord.xy + vec2( dx0, dy0 ), shadowCoord.z ) +
				texture2DCompare( shadowMap, shadowCoord.xy + vec2( 0.0, dy0 ), shadowCoord.z ) +
				texture2DCompare( shadowMap, shadowCoord.xy + vec2( dx1, dy0 ), shadowCoord.z ) +
				texture2DCompare( shadowMap, shadowCoord.xy + vec2( dx2, dy2 ), shadowCoord.z ) +
				texture2DCompare( shadowMap, shadowCoord.xy + vec2( 0.0, dy2 ), shadowCoord.z ) +
				texture2DCompare( shadowMap, shadowCoord.xy + vec2( dx3, dy2 ), shadowCoord.z ) +
				texture2DCompare( shadowMap, shadowCoord.xy + vec2( dx0, 0.0 ), shadowCoord.z ) +
				texture2DCompare( shadowMap, shadowCoord.xy + vec2( dx2, 0.0 ), shadowCoord.z ) +
				texture2DCompare( shadowMap, shadowCoord.xy, shadowCoord.z ) +
				texture2DCompare( shadowMap, shadowCoord.xy + vec2( dx3, 0.0 ), shadowCoord.z ) +
				texture2DCompare( shadowMap, shadowCoord.xy + vec2( dx1, 0.0 ), shadowCoord.z ) +
				texture2DCompare( shadowMap, shadowCoord.xy + vec2( dx2, dy3 ), shadowCoord.z ) +
				texture2DCompare( shadowMap, shadowCoord.xy + vec2( 0.0, dy3 ), shadowCoord.z ) +
				texture2DCompare( shadowMap, shadowCoord.xy + vec2( dx3, dy3 ), shadowCoord.z ) +
				texture2DCompare( shadowMap, shadowCoord.xy + vec2( dx0, dy1 ), shadowCoord.z ) +
				texture2DCompare( shadowMap, shadowCoord.xy + vec2( 0.0, dy1 ), shadowCoord.z ) +
				texture2DCompare( shadowMap, shadowCoord.xy + vec2( dx1, dy1 ), shadowCoord.z )
			) * ( 1.0 / 17.0 );
		#elif defined( SHADOWMAP_TYPE_PCF_SOFT )
			vec2 texelSize = vec2( 1.0 ) / shadowMapSize;
			float dx = texelSize.x;
			float dy = texelSize.y;
			vec2 uv = shadowCoord.xy;
			vec2 f = fract( uv * shadowMapSize + 0.5 );
			uv -= f * texelSize;
			shadow = (
				texture2DCompare( shadowMap, uv, shadowCoord.z ) +
				texture2DCompare( shadowMap, uv + vec2( dx, 0.0 ), shadowCoord.z ) +
				texture2DCompare( shadowMap, uv + vec2( 0.0, dy ), shadowCoord.z ) +
				texture2DCompare( shadowMap, uv + texelSize, shadowCoord.z ) +
				mix( texture2DCompare( shadowMap, uv + vec2( -dx, 0.0 ), shadowCoord.z ),
					 texture2DCompare( shadowMap, uv + vec2( 2.0 * dx, 0.0 ), shadowCoord.z ),
					 f.x ) +
				mix( texture2DCompare( shadowMap, uv + vec2( -dx, dy ), shadowCoord.z ),
					 texture2DCompare( shadowMap, uv + vec2( 2.0 * dx, dy ), shadowCoord.z ),
					 f.x ) +
				mix( texture2DCompare( shadowMap, uv + vec2( 0.0, -dy ), shadowCoord.z ),
					 texture2DCompare( shadowMap, uv + vec2( 0.0, 2.0 * dy ), shadowCoord.z ),
					 f.y ) +
				mix( texture2DCompare( shadowMap, uv + vec2( dx, -dy ), shadowCoord.z ),
					 texture2DCompare( shadowMap, uv + vec2( dx, 2.0 * dy ), shadowCoord.z ),
					 f.y ) +
				mix( mix( texture2DCompare( shadowMap, uv + vec2( -dx, -dy ), shadowCoord.z ),
						  texture2DCompare( shadowMap, uv + vec2( 2.0 * dx, -dy ), shadowCoord.z ),
						  f.x ),
					 mix( texture2DCompare( shadowMap, uv + vec2( -dx, 2.0 * dy ), shadowCoord.z ),
						  texture2DCompare( shadowMap, uv + vec2( 2.0 * dx, 2.0 * dy ), shadowCoord.z ),
						  f.x ),
					 f.y )
			) * ( 1.0 / 9.0 );
		#elif defined( SHADOWMAP_TYPE_VSM )
			shadow = VSMShadow( shadowMap, shadowCoord.xy, shadowCoord.z );
		#else
			shadow = texture2DCompare( shadowMap, shadowCoord.xy, shadowCoord.z );
		#endif
		}
		return mix( 1.0, shadow, shadowIntensity );
	}
	vec2 cubeToUV( vec3 v, float texelSizeY ) {
		vec3 absV = abs( v );
		float scaleToCube = 1.0 / max( absV.x, max( absV.y, absV.z ) );
		absV *= scaleToCube;
		v *= scaleToCube * ( 1.0 - 2.0 * texelSizeY );
		vec2 planar = v.xy;
		float almostATexel = 1.5 * texelSizeY;
		float almostOne = 1.0 - almostATexel;
		if ( absV.z >= almostOne ) {
			if ( v.z > 0.0 )
				planar.x = 4.0 - v.x;
		} else if ( absV.x >= almostOne ) {
			float signX = sign( v.x );
			planar.x = v.z * signX + 2.0 * signX;
		} else if ( absV.y >= almostOne ) {
			float signY = sign( v.y );
			planar.x = v.x + 2.0 * signY + 2.0;
			planar.y = v.z * signY - 2.0;
		}
		return vec2( 0.125, 0.25 ) * planar + vec2( 0.375, 0.75 );
	}
	float getPointShadow( sampler2D shadowMap, vec2 shadowMapSize, float shadowIntensity, float shadowBias, float shadowRadius, vec4 shadowCoord, float shadowCameraNear, float shadowCameraFar ) {
		float shadow = 1.0;
		vec3 lightToPosition = shadowCoord.xyz;
		
		float lightToPositionLength = length( lightToPosition );
		if ( lightToPositionLength - shadowCameraFar <= 0.0 && lightToPositionLength - shadowCameraNear >= 0.0 ) {
			float dp = ( lightToPositionLength - shadowCameraNear ) / ( shadowCameraFar - shadowCameraNear );			dp += shadowBias;
			vec3 bd3D = normalize( lightToPosition );
			vec2 texelSize = vec2( 1.0 ) / ( shadowMapSize * vec2( 4.0, 2.0 ) );
			#if defined( SHADOWMAP_TYPE_PCF ) || defined( SHADOWMAP_TYPE_PCF_SOFT ) || defined( SHADOWMAP_TYPE_VSM )
				vec2 offset = vec2( - 1, 1 ) * shadowRadius * texelSize.y;
				shadow = (
					texture2DCompare( shadowMap, cubeToUV( bd3D + offset.xyy, texelSize.y ), dp ) +
					texture2DCompare( shadowMap, cubeToUV( bd3D + offset.yyy, texelSize.y ), dp ) +
					texture2DCompare( shadowMap, cubeToUV( bd3D + offset.xyx, texelSize.y ), dp ) +
					texture2DCompare( shadowMap, cubeToUV( bd3D + offset.yyx, texelSize.y ), dp ) +
					texture2DCompare( shadowMap, cubeToUV( bd3D, texelSize.y ), dp ) +
					texture2DCompare( shadowMap, cubeToUV( bd3D + offset.xxy, texelSize.y ), dp ) +
					texture2DCompare( shadowMap, cubeToUV( bd3D + offset.yxy, texelSize.y ), dp ) +
					texture2DCompare( shadowMap, cubeToUV( bd3D + offset.xxx, texelSize.y ), dp ) +
					texture2DCompare( shadowMap, cubeToUV( bd3D + offset.yxx, texelSize.y ), dp )
				) * ( 1.0 / 9.0 );
			#else
				shadow = texture2DCompare( shadowMap, cubeToUV( bd3D, texelSize.y ), dp );
			#endif
		}
		return mix( 1.0, shadow, shadowIntensity );
	}
#endif`,zl=`#if NUM_SPOT_LIGHT_COORDS > 0
	uniform mat4 spotLightMatrix[ NUM_SPOT_LIGHT_COORDS ];
	varying vec4 vSpotLightCoord[ NUM_SPOT_LIGHT_COORDS ];
#endif
#ifdef USE_SHADOWMAP
	#if NUM_DIR_LIGHT_SHADOWS > 0
		uniform mat4 directionalShadowMatrix[ NUM_DIR_LIGHT_SHADOWS ];
		varying vec4 vDirectionalShadowCoord[ NUM_DIR_LIGHT_SHADOWS ];
		struct DirectionalLightShadow {
			float shadowIntensity;
			float shadowBias;
			float shadowNormalBias;
			float shadowRadius;
			vec2 shadowMapSize;
		};
		uniform DirectionalLightShadow directionalLightShadows[ NUM_DIR_LIGHT_SHADOWS ];
	#endif
	#if NUM_SPOT_LIGHT_SHADOWS > 0
		struct SpotLightShadow {
			float shadowIntensity;
			float shadowBias;
			float shadowNormalBias;
			float shadowRadius;
			vec2 shadowMapSize;
		};
		uniform SpotLightShadow spotLightShadows[ NUM_SPOT_LIGHT_SHADOWS ];
	#endif
	#if NUM_POINT_LIGHT_SHADOWS > 0
		uniform mat4 pointShadowMatrix[ NUM_POINT_LIGHT_SHADOWS ];
		varying vec4 vPointShadowCoord[ NUM_POINT_LIGHT_SHADOWS ];
		struct PointLightShadow {
			float shadowIntensity;
			float shadowBias;
			float shadowNormalBias;
			float shadowRadius;
			vec2 shadowMapSize;
			float shadowCameraNear;
			float shadowCameraFar;
		};
		uniform PointLightShadow pointLightShadows[ NUM_POINT_LIGHT_SHADOWS ];
	#endif
#endif`,Vl=`#if ( defined( USE_SHADOWMAP ) && ( NUM_DIR_LIGHT_SHADOWS > 0 || NUM_POINT_LIGHT_SHADOWS > 0 ) ) || ( NUM_SPOT_LIGHT_COORDS > 0 )
	vec3 shadowWorldNormal = inverseTransformDirection( transformedNormal, viewMatrix );
	vec4 shadowWorldPosition;
#endif
#if defined( USE_SHADOWMAP )
	#if NUM_DIR_LIGHT_SHADOWS > 0
		#pragma unroll_loop_start
		for ( int i = 0; i < NUM_DIR_LIGHT_SHADOWS; i ++ ) {
			shadowWorldPosition = worldPosition + vec4( shadowWorldNormal * directionalLightShadows[ i ].shadowNormalBias, 0 );
			vDirectionalShadowCoord[ i ] = directionalShadowMatrix[ i ] * shadowWorldPosition;
		}
		#pragma unroll_loop_end
	#endif
	#if NUM_POINT_LIGHT_SHADOWS > 0
		#pragma unroll_loop_start
		for ( int i = 0; i < NUM_POINT_LIGHT_SHADOWS; i ++ ) {
			shadowWorldPosition = worldPosition + vec4( shadowWorldNormal * pointLightShadows[ i ].shadowNormalBias, 0 );
			vPointShadowCoord[ i ] = pointShadowMatrix[ i ] * shadowWorldPosition;
		}
		#pragma unroll_loop_end
	#endif
#endif
#if NUM_SPOT_LIGHT_COORDS > 0
	#pragma unroll_loop_start
	for ( int i = 0; i < NUM_SPOT_LIGHT_COORDS; i ++ ) {
		shadowWorldPosition = worldPosition;
		#if ( defined( USE_SHADOWMAP ) && UNROLLED_LOOP_INDEX < NUM_SPOT_LIGHT_SHADOWS )
			shadowWorldPosition.xyz += shadowWorldNormal * spotLightShadows[ i ].shadowNormalBias;
		#endif
		vSpotLightCoord[ i ] = spotLightMatrix[ i ] * shadowWorldPosition;
	}
	#pragma unroll_loop_end
#endif`,Hl=`float getShadowMask() {
	float shadow = 1.0;
	#ifdef USE_SHADOWMAP
	#if NUM_DIR_LIGHT_SHADOWS > 0
	DirectionalLightShadow directionalLight;
	#pragma unroll_loop_start
	for ( int i = 0; i < NUM_DIR_LIGHT_SHADOWS; i ++ ) {
		directionalLight = directionalLightShadows[ i ];
		shadow *= receiveShadow ? getShadow( directionalShadowMap[ i ], directionalLight.shadowMapSize, directionalLight.shadowIntensity, directionalLight.shadowBias, directionalLight.shadowRadius, vDirectionalShadowCoord[ i ] ) : 1.0;
	}
	#pragma unroll_loop_end
	#endif
	#if NUM_SPOT_LIGHT_SHADOWS > 0
	SpotLightShadow spotLight;
	#pragma unroll_loop_start
	for ( int i = 0; i < NUM_SPOT_LIGHT_SHADOWS; i ++ ) {
		spotLight = spotLightShadows[ i ];
		shadow *= receiveShadow ? getShadow( spotShadowMap[ i ], spotLight.shadowMapSize, spotLight.shadowIntensity, spotLight.shadowBias, spotLight.shadowRadius, vSpotLightCoord[ i ] ) : 1.0;
	}
	#pragma unroll_loop_end
	#endif
	#if NUM_POINT_LIGHT_SHADOWS > 0
	PointLightShadow pointLight;
	#pragma unroll_loop_start
	for ( int i = 0; i < NUM_POINT_LIGHT_SHADOWS; i ++ ) {
		pointLight = pointLightShadows[ i ];
		shadow *= receiveShadow ? getPointShadow( pointShadowMap[ i ], pointLight.shadowMapSize, pointLight.shadowIntensity, pointLight.shadowBias, pointLight.shadowRadius, vPointShadowCoord[ i ], pointLight.shadowCameraNear, pointLight.shadowCameraFar ) : 1.0;
	}
	#pragma unroll_loop_end
	#endif
	#endif
	return shadow;
}`,kl=`#ifdef USE_SKINNING
	mat4 boneMatX = getBoneMatrix( skinIndex.x );
	mat4 boneMatY = getBoneMatrix( skinIndex.y );
	mat4 boneMatZ = getBoneMatrix( skinIndex.z );
	mat4 boneMatW = getBoneMatrix( skinIndex.w );
#endif`,Wl=`#ifdef USE_SKINNING
	uniform mat4 bindMatrix;
	uniform mat4 bindMatrixInverse;
	uniform highp sampler2D boneTexture;
	mat4 getBoneMatrix( const in float i ) {
		int size = textureSize( boneTexture, 0 ).x;
		int j = int( i ) * 4;
		int x = j % size;
		int y = j / size;
		vec4 v1 = texelFetch( boneTexture, ivec2( x, y ), 0 );
		vec4 v2 = texelFetch( boneTexture, ivec2( x + 1, y ), 0 );
		vec4 v3 = texelFetch( boneTexture, ivec2( x + 2, y ), 0 );
		vec4 v4 = texelFetch( boneTexture, ivec2( x + 3, y ), 0 );
		return mat4( v1, v2, v3, v4 );
	}
#endif`,Xl=`#ifdef USE_SKINNING
	vec4 skinVertex = bindMatrix * vec4( transformed, 1.0 );
	vec4 skinned = vec4( 0.0 );
	skinned += boneMatX * skinVertex * skinWeight.x;
	skinned += boneMatY * skinVertex * skinWeight.y;
	skinned += boneMatZ * skinVertex * skinWeight.z;
	skinned += boneMatW * skinVertex * skinWeight.w;
	transformed = ( bindMatrixInverse * skinned ).xyz;
#endif`,ql=`#ifdef USE_SKINNING
	mat4 skinMatrix = mat4( 0.0 );
	skinMatrix += skinWeight.x * boneMatX;
	skinMatrix += skinWeight.y * boneMatY;
	skinMatrix += skinWeight.z * boneMatZ;
	skinMatrix += skinWeight.w * boneMatW;
	skinMatrix = bindMatrixInverse * skinMatrix * bindMatrix;
	objectNormal = vec4( skinMatrix * vec4( objectNormal, 0.0 ) ).xyz;
	#ifdef USE_TANGENT
		objectTangent = vec4( skinMatrix * vec4( objectTangent, 0.0 ) ).xyz;
	#endif
#endif`,Yl=`float specularStrength;
#ifdef USE_SPECULARMAP
	vec4 texelSpecular = texture2D( specularMap, vSpecularMapUv );
	specularStrength = texelSpecular.r;
#else
	specularStrength = 1.0;
#endif`,$l=`#ifdef USE_SPECULARMAP
	uniform sampler2D specularMap;
#endif`,Kl=`#if defined( TONE_MAPPING )
	gl_FragColor.rgb = toneMapping( gl_FragColor.rgb );
#endif`,Zl=`#ifndef saturate
#define saturate( a ) clamp( a, 0.0, 1.0 )
#endif
uniform float toneMappingExposure;
vec3 LinearToneMapping( vec3 color ) {
	return saturate( toneMappingExposure * color );
}
vec3 ReinhardToneMapping( vec3 color ) {
	color *= toneMappingExposure;
	return saturate( color / ( vec3( 1.0 ) + color ) );
}
vec3 CineonToneMapping( vec3 color ) {
	color *= toneMappingExposure;
	color = max( vec3( 0.0 ), color - 0.004 );
	return pow( ( color * ( 6.2 * color + 0.5 ) ) / ( color * ( 6.2 * color + 1.7 ) + 0.06 ), vec3( 2.2 ) );
}
vec3 RRTAndODTFit( vec3 v ) {
	vec3 a = v * ( v + 0.0245786 ) - 0.000090537;
	vec3 b = v * ( 0.983729 * v + 0.4329510 ) + 0.238081;
	return a / b;
}
vec3 ACESFilmicToneMapping( vec3 color ) {
	const mat3 ACESInputMat = mat3(
		vec3( 0.59719, 0.07600, 0.02840 ),		vec3( 0.35458, 0.90834, 0.13383 ),
		vec3( 0.04823, 0.01566, 0.83777 )
	);
	const mat3 ACESOutputMat = mat3(
		vec3(  1.60475, -0.10208, -0.00327 ),		vec3( -0.53108,  1.10813, -0.07276 ),
		vec3( -0.07367, -0.00605,  1.07602 )
	);
	color *= toneMappingExposure / 0.6;
	color = ACESInputMat * color;
	color = RRTAndODTFit( color );
	color = ACESOutputMat * color;
	return saturate( color );
}
const mat3 LINEAR_REC2020_TO_LINEAR_SRGB = mat3(
	vec3( 1.6605, - 0.1246, - 0.0182 ),
	vec3( - 0.5876, 1.1329, - 0.1006 ),
	vec3( - 0.0728, - 0.0083, 1.1187 )
);
const mat3 LINEAR_SRGB_TO_LINEAR_REC2020 = mat3(
	vec3( 0.6274, 0.0691, 0.0164 ),
	vec3( 0.3293, 0.9195, 0.0880 ),
	vec3( 0.0433, 0.0113, 0.8956 )
);
vec3 agxDefaultContrastApprox( vec3 x ) {
	vec3 x2 = x * x;
	vec3 x4 = x2 * x2;
	return + 15.5 * x4 * x2
		- 40.14 * x4 * x
		+ 31.96 * x4
		- 6.868 * x2 * x
		+ 0.4298 * x2
		+ 0.1191 * x
		- 0.00232;
}
vec3 AgXToneMapping( vec3 color ) {
	const mat3 AgXInsetMatrix = mat3(
		vec3( 0.856627153315983, 0.137318972929847, 0.11189821299995 ),
		vec3( 0.0951212405381588, 0.761241990602591, 0.0767994186031903 ),
		vec3( 0.0482516061458583, 0.101439036467562, 0.811302368396859 )
	);
	const mat3 AgXOutsetMatrix = mat3(
		vec3( 1.1271005818144368, - 0.1413297634984383, - 0.14132976349843826 ),
		vec3( - 0.11060664309660323, 1.157823702216272, - 0.11060664309660294 ),
		vec3( - 0.016493938717834573, - 0.016493938717834257, 1.2519364065950405 )
	);
	const float AgxMinEv = - 12.47393;	const float AgxMaxEv = 4.026069;
	color *= toneMappingExposure;
	color = LINEAR_SRGB_TO_LINEAR_REC2020 * color;
	color = AgXInsetMatrix * color;
	color = max( color, 1e-10 );	color = log2( color );
	color = ( color - AgxMinEv ) / ( AgxMaxEv - AgxMinEv );
	color = clamp( color, 0.0, 1.0 );
	color = agxDefaultContrastApprox( color );
	color = AgXOutsetMatrix * color;
	color = pow( max( vec3( 0.0 ), color ), vec3( 2.2 ) );
	color = LINEAR_REC2020_TO_LINEAR_SRGB * color;
	color = clamp( color, 0.0, 1.0 );
	return color;
}
vec3 NeutralToneMapping( vec3 color ) {
	const float StartCompression = 0.8 - 0.04;
	const float Desaturation = 0.15;
	color *= toneMappingExposure;
	float x = min( color.r, min( color.g, color.b ) );
	float offset = x < 0.08 ? x - 6.25 * x * x : 0.04;
	color -= offset;
	float peak = max( color.r, max( color.g, color.b ) );
	if ( peak < StartCompression ) return color;
	float d = 1. - StartCompression;
	float newPeak = 1. - d * d / ( peak + d - StartCompression );
	color *= newPeak / peak;
	float g = 1. - 1. / ( Desaturation * ( peak - newPeak ) + 1. );
	return mix( color, vec3( newPeak ), g );
}
vec3 CustomToneMapping( vec3 color ) { return color; }`,jl=`#ifdef USE_TRANSMISSION
	material.transmission = transmission;
	material.transmissionAlpha = 1.0;
	material.thickness = thickness;
	material.attenuationDistance = attenuationDistance;
	material.attenuationColor = attenuationColor;
	#ifdef USE_TRANSMISSIONMAP
		material.transmission *= texture2D( transmissionMap, vTransmissionMapUv ).r;
	#endif
	#ifdef USE_THICKNESSMAP
		material.thickness *= texture2D( thicknessMap, vThicknessMapUv ).g;
	#endif
	vec3 pos = vWorldPosition;
	vec3 v = normalize( cameraPosition - pos );
	vec3 n = inverseTransformDirection( normal, viewMatrix );
	vec4 transmitted = getIBLVolumeRefraction(
		n, v, material.roughness, material.diffuseColor, material.specularColor, material.specularF90,
		pos, modelMatrix, viewMatrix, projectionMatrix, material.dispersion, material.ior, material.thickness,
		material.attenuationColor, material.attenuationDistance );
	material.transmissionAlpha = mix( material.transmissionAlpha, transmitted.a, material.transmission );
	totalDiffuse = mix( totalDiffuse, transmitted.rgb, material.transmission );
#endif`,Jl=`#ifdef USE_TRANSMISSION
	uniform float transmission;
	uniform float thickness;
	uniform float attenuationDistance;
	uniform vec3 attenuationColor;
	#ifdef USE_TRANSMISSIONMAP
		uniform sampler2D transmissionMap;
	#endif
	#ifdef USE_THICKNESSMAP
		uniform sampler2D thicknessMap;
	#endif
	uniform vec2 transmissionSamplerSize;
	uniform sampler2D transmissionSamplerMap;
	uniform mat4 modelMatrix;
	uniform mat4 projectionMatrix;
	varying vec3 vWorldPosition;
	float w0( float a ) {
		return ( 1.0 / 6.0 ) * ( a * ( a * ( - a + 3.0 ) - 3.0 ) + 1.0 );
	}
	float w1( float a ) {
		return ( 1.0 / 6.0 ) * ( a *  a * ( 3.0 * a - 6.0 ) + 4.0 );
	}
	float w2( float a ){
		return ( 1.0 / 6.0 ) * ( a * ( a * ( - 3.0 * a + 3.0 ) + 3.0 ) + 1.0 );
	}
	float w3( float a ) {
		return ( 1.0 / 6.0 ) * ( a * a * a );
	}
	float g0( float a ) {
		return w0( a ) + w1( a );
	}
	float g1( float a ) {
		return w2( a ) + w3( a );
	}
	float h0( float a ) {
		return - 1.0 + w1( a ) / ( w0( a ) + w1( a ) );
	}
	float h1( float a ) {
		return 1.0 + w3( a ) / ( w2( a ) + w3( a ) );
	}
	vec4 bicubic( sampler2D tex, vec2 uv, vec4 texelSize, float lod ) {
		uv = uv * texelSize.zw + 0.5;
		vec2 iuv = floor( uv );
		vec2 fuv = fract( uv );
		float g0x = g0( fuv.x );
		float g1x = g1( fuv.x );
		float h0x = h0( fuv.x );
		float h1x = h1( fuv.x );
		float h0y = h0( fuv.y );
		float h1y = h1( fuv.y );
		vec2 p0 = ( vec2( iuv.x + h0x, iuv.y + h0y ) - 0.5 ) * texelSize.xy;
		vec2 p1 = ( vec2( iuv.x + h1x, iuv.y + h0y ) - 0.5 ) * texelSize.xy;
		vec2 p2 = ( vec2( iuv.x + h0x, iuv.y + h1y ) - 0.5 ) * texelSize.xy;
		vec2 p3 = ( vec2( iuv.x + h1x, iuv.y + h1y ) - 0.5 ) * texelSize.xy;
		return g0( fuv.y ) * ( g0x * textureLod( tex, p0, lod ) + g1x * textureLod( tex, p1, lod ) ) +
			g1( fuv.y ) * ( g0x * textureLod( tex, p2, lod ) + g1x * textureLod( tex, p3, lod ) );
	}
	vec4 textureBicubic( sampler2D sampler, vec2 uv, float lod ) {
		vec2 fLodSize = vec2( textureSize( sampler, int( lod ) ) );
		vec2 cLodSize = vec2( textureSize( sampler, int( lod + 1.0 ) ) );
		vec2 fLodSizeInv = 1.0 / fLodSize;
		vec2 cLodSizeInv = 1.0 / cLodSize;
		vec4 fSample = bicubic( sampler, uv, vec4( fLodSizeInv, fLodSize ), floor( lod ) );
		vec4 cSample = bicubic( sampler, uv, vec4( cLodSizeInv, cLodSize ), ceil( lod ) );
		return mix( fSample, cSample, fract( lod ) );
	}
	vec3 getVolumeTransmissionRay( const in vec3 n, const in vec3 v, const in float thickness, const in float ior, const in mat4 modelMatrix ) {
		vec3 refractionVector = refract( - v, normalize( n ), 1.0 / ior );
		vec3 modelScale;
		modelScale.x = length( vec3( modelMatrix[ 0 ].xyz ) );
		modelScale.y = length( vec3( modelMatrix[ 1 ].xyz ) );
		modelScale.z = length( vec3( modelMatrix[ 2 ].xyz ) );
		return normalize( refractionVector ) * thickness * modelScale;
	}
	float applyIorToRoughness( const in float roughness, const in float ior ) {
		return roughness * clamp( ior * 2.0 - 2.0, 0.0, 1.0 );
	}
	vec4 getTransmissionSample( const in vec2 fragCoord, const in float roughness, const in float ior ) {
		float lod = log2( transmissionSamplerSize.x ) * applyIorToRoughness( roughness, ior );
		return textureBicubic( transmissionSamplerMap, fragCoord.xy, lod );
	}
	vec3 volumeAttenuation( const in float transmissionDistance, const in vec3 attenuationColor, const in float attenuationDistance ) {
		if ( isinf( attenuationDistance ) ) {
			return vec3( 1.0 );
		} else {
			vec3 attenuationCoefficient = -log( attenuationColor ) / attenuationDistance;
			vec3 transmittance = exp( - attenuationCoefficient * transmissionDistance );			return transmittance;
		}
	}
	vec4 getIBLVolumeRefraction( const in vec3 n, const in vec3 v, const in float roughness, const in vec3 diffuseColor,
		const in vec3 specularColor, const in float specularF90, const in vec3 position, const in mat4 modelMatrix,
		const in mat4 viewMatrix, const in mat4 projMatrix, const in float dispersion, const in float ior, const in float thickness,
		const in vec3 attenuationColor, const in float attenuationDistance ) {
		vec4 transmittedLight;
		vec3 transmittance;
		#ifdef USE_DISPERSION
			float halfSpread = ( ior - 1.0 ) * 0.025 * dispersion;
			vec3 iors = vec3( ior - halfSpread, ior, ior + halfSpread );
			for ( int i = 0; i < 3; i ++ ) {
				vec3 transmissionRay = getVolumeTransmissionRay( n, v, thickness, iors[ i ], modelMatrix );
				vec3 refractedRayExit = position + transmissionRay;
				vec4 ndcPos = projMatrix * viewMatrix * vec4( refractedRayExit, 1.0 );
				vec2 refractionCoords = ndcPos.xy / ndcPos.w;
				refractionCoords += 1.0;
				refractionCoords /= 2.0;
				vec4 transmissionSample = getTransmissionSample( refractionCoords, roughness, iors[ i ] );
				transmittedLight[ i ] = transmissionSample[ i ];
				transmittedLight.a += transmissionSample.a;
				transmittance[ i ] = diffuseColor[ i ] * volumeAttenuation( length( transmissionRay ), attenuationColor, attenuationDistance )[ i ];
			}
			transmittedLight.a /= 3.0;
		#else
			vec3 transmissionRay = getVolumeTransmissionRay( n, v, thickness, ior, modelMatrix );
			vec3 refractedRayExit = position + transmissionRay;
			vec4 ndcPos = projMatrix * viewMatrix * vec4( refractedRayExit, 1.0 );
			vec2 refractionCoords = ndcPos.xy / ndcPos.w;
			refractionCoords += 1.0;
			refractionCoords /= 2.0;
			transmittedLight = getTransmissionSample( refractionCoords, roughness, ior );
			transmittance = diffuseColor * volumeAttenuation( length( transmissionRay ), attenuationColor, attenuationDistance );
		#endif
		vec3 attenuatedColor = transmittance * transmittedLight.rgb;
		vec3 F = EnvironmentBRDF( n, v, specularColor, specularF90, roughness );
		float transmittanceFactor = ( transmittance.r + transmittance.g + transmittance.b ) / 3.0;
		return vec4( ( 1.0 - F ) * attenuatedColor, 1.0 - ( 1.0 - transmittedLight.a ) * transmittanceFactor );
	}
#endif`,Ql=`#if defined( USE_UV ) || defined( USE_ANISOTROPY )
	varying vec2 vUv;
#endif
#ifdef USE_MAP
	varying vec2 vMapUv;
#endif
#ifdef USE_ALPHAMAP
	varying vec2 vAlphaMapUv;
#endif
#ifdef USE_LIGHTMAP
	varying vec2 vLightMapUv;
#endif
#ifdef USE_AOMAP
	varying vec2 vAoMapUv;
#endif
#ifdef USE_BUMPMAP
	varying vec2 vBumpMapUv;
#endif
#ifdef USE_NORMALMAP
	varying vec2 vNormalMapUv;
#endif
#ifdef USE_EMISSIVEMAP
	varying vec2 vEmissiveMapUv;
#endif
#ifdef USE_METALNESSMAP
	varying vec2 vMetalnessMapUv;
#endif
#ifdef USE_ROUGHNESSMAP
	varying vec2 vRoughnessMapUv;
#endif
#ifdef USE_ANISOTROPYMAP
	varying vec2 vAnisotropyMapUv;
#endif
#ifdef USE_CLEARCOATMAP
	varying vec2 vClearcoatMapUv;
#endif
#ifdef USE_CLEARCOAT_NORMALMAP
	varying vec2 vClearcoatNormalMapUv;
#endif
#ifdef USE_CLEARCOAT_ROUGHNESSMAP
	varying vec2 vClearcoatRoughnessMapUv;
#endif
#ifdef USE_IRIDESCENCEMAP
	varying vec2 vIridescenceMapUv;
#endif
#ifdef USE_IRIDESCENCE_THICKNESSMAP
	varying vec2 vIridescenceThicknessMapUv;
#endif
#ifdef USE_SHEEN_COLORMAP
	varying vec2 vSheenColorMapUv;
#endif
#ifdef USE_SHEEN_ROUGHNESSMAP
	varying vec2 vSheenRoughnessMapUv;
#endif
#ifdef USE_SPECULARMAP
	varying vec2 vSpecularMapUv;
#endif
#ifdef USE_SPECULAR_COLORMAP
	varying vec2 vSpecularColorMapUv;
#endif
#ifdef USE_SPECULAR_INTENSITYMAP
	varying vec2 vSpecularIntensityMapUv;
#endif
#ifdef USE_TRANSMISSIONMAP
	uniform mat3 transmissionMapTransform;
	varying vec2 vTransmissionMapUv;
#endif
#ifdef USE_THICKNESSMAP
	uniform mat3 thicknessMapTransform;
	varying vec2 vThicknessMapUv;
#endif`,ec=`#if defined( USE_UV ) || defined( USE_ANISOTROPY )
	varying vec2 vUv;
#endif
#ifdef USE_MAP
	uniform mat3 mapTransform;
	varying vec2 vMapUv;
#endif
#ifdef USE_ALPHAMAP
	uniform mat3 alphaMapTransform;
	varying vec2 vAlphaMapUv;
#endif
#ifdef USE_LIGHTMAP
	uniform mat3 lightMapTransform;
	varying vec2 vLightMapUv;
#endif
#ifdef USE_AOMAP
	uniform mat3 aoMapTransform;
	varying vec2 vAoMapUv;
#endif
#ifdef USE_BUMPMAP
	uniform mat3 bumpMapTransform;
	varying vec2 vBumpMapUv;
#endif
#ifdef USE_NORMALMAP
	uniform mat3 normalMapTransform;
	varying vec2 vNormalMapUv;
#endif
#ifdef USE_DISPLACEMENTMAP
	uniform mat3 displacementMapTransform;
	varying vec2 vDisplacementMapUv;
#endif
#ifdef USE_EMISSIVEMAP
	uniform mat3 emissiveMapTransform;
	varying vec2 vEmissiveMapUv;
#endif
#ifdef USE_METALNESSMAP
	uniform mat3 metalnessMapTransform;
	varying vec2 vMetalnessMapUv;
#endif
#ifdef USE_ROUGHNESSMAP
	uniform mat3 roughnessMapTransform;
	varying vec2 vRoughnessMapUv;
#endif
#ifdef USE_ANISOTROPYMAP
	uniform mat3 anisotropyMapTransform;
	varying vec2 vAnisotropyMapUv;
#endif
#ifdef USE_CLEARCOATMAP
	uniform mat3 clearcoatMapTransform;
	varying vec2 vClearcoatMapUv;
#endif
#ifdef USE_CLEARCOAT_NORMALMAP
	uniform mat3 clearcoatNormalMapTransform;
	varying vec2 vClearcoatNormalMapUv;
#endif
#ifdef USE_CLEARCOAT_ROUGHNESSMAP
	uniform mat3 clearcoatRoughnessMapTransform;
	varying vec2 vClearcoatRoughnessMapUv;
#endif
#ifdef USE_SHEEN_COLORMAP
	uniform mat3 sheenColorMapTransform;
	varying vec2 vSheenColorMapUv;
#endif
#ifdef USE_SHEEN_ROUGHNESSMAP
	uniform mat3 sheenRoughnessMapTransform;
	varying vec2 vSheenRoughnessMapUv;
#endif
#ifdef USE_IRIDESCENCEMAP
	uniform mat3 iridescenceMapTransform;
	varying vec2 vIridescenceMapUv;
#endif
#ifdef USE_IRIDESCENCE_THICKNESSMAP
	uniform mat3 iridescenceThicknessMapTransform;
	varying vec2 vIridescenceThicknessMapUv;
#endif
#ifdef USE_SPECULARMAP
	uniform mat3 specularMapTransform;
	varying vec2 vSpecularMapUv;
#endif
#ifdef USE_SPECULAR_COLORMAP
	uniform mat3 specularColorMapTransform;
	varying vec2 vSpecularColorMapUv;
#endif
#ifdef USE_SPECULAR_INTENSITYMAP
	uniform mat3 specularIntensityMapTransform;
	varying vec2 vSpecularIntensityMapUv;
#endif
#ifdef USE_TRANSMISSIONMAP
	uniform mat3 transmissionMapTransform;
	varying vec2 vTransmissionMapUv;
#endif
#ifdef USE_THICKNESSMAP
	uniform mat3 thicknessMapTransform;
	varying vec2 vThicknessMapUv;
#endif`,tc=`#if defined( USE_UV ) || defined( USE_ANISOTROPY )
	vUv = vec3( uv, 1 ).xy;
#endif
#ifdef USE_MAP
	vMapUv = ( mapTransform * vec3( MAP_UV, 1 ) ).xy;
#endif
#ifdef USE_ALPHAMAP
	vAlphaMapUv = ( alphaMapTransform * vec3( ALPHAMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_LIGHTMAP
	vLightMapUv = ( lightMapTransform * vec3( LIGHTMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_AOMAP
	vAoMapUv = ( aoMapTransform * vec3( AOMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_BUMPMAP
	vBumpMapUv = ( bumpMapTransform * vec3( BUMPMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_NORMALMAP
	vNormalMapUv = ( normalMapTransform * vec3( NORMALMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_DISPLACEMENTMAP
	vDisplacementMapUv = ( displacementMapTransform * vec3( DISPLACEMENTMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_EMISSIVEMAP
	vEmissiveMapUv = ( emissiveMapTransform * vec3( EMISSIVEMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_METALNESSMAP
	vMetalnessMapUv = ( metalnessMapTransform * vec3( METALNESSMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_ROUGHNESSMAP
	vRoughnessMapUv = ( roughnessMapTransform * vec3( ROUGHNESSMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_ANISOTROPYMAP
	vAnisotropyMapUv = ( anisotropyMapTransform * vec3( ANISOTROPYMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_CLEARCOATMAP
	vClearcoatMapUv = ( clearcoatMapTransform * vec3( CLEARCOATMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_CLEARCOAT_NORMALMAP
	vClearcoatNormalMapUv = ( clearcoatNormalMapTransform * vec3( CLEARCOAT_NORMALMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_CLEARCOAT_ROUGHNESSMAP
	vClearcoatRoughnessMapUv = ( clearcoatRoughnessMapTransform * vec3( CLEARCOAT_ROUGHNESSMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_IRIDESCENCEMAP
	vIridescenceMapUv = ( iridescenceMapTransform * vec3( IRIDESCENCEMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_IRIDESCENCE_THICKNESSMAP
	vIridescenceThicknessMapUv = ( iridescenceThicknessMapTransform * vec3( IRIDESCENCE_THICKNESSMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_SHEEN_COLORMAP
	vSheenColorMapUv = ( sheenColorMapTransform * vec3( SHEEN_COLORMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_SHEEN_ROUGHNESSMAP
	vSheenRoughnessMapUv = ( sheenRoughnessMapTransform * vec3( SHEEN_ROUGHNESSMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_SPECULARMAP
	vSpecularMapUv = ( specularMapTransform * vec3( SPECULARMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_SPECULAR_COLORMAP
	vSpecularColorMapUv = ( specularColorMapTransform * vec3( SPECULAR_COLORMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_SPECULAR_INTENSITYMAP
	vSpecularIntensityMapUv = ( specularIntensityMapTransform * vec3( SPECULAR_INTENSITYMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_TRANSMISSIONMAP
	vTransmissionMapUv = ( transmissionMapTransform * vec3( TRANSMISSIONMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_THICKNESSMAP
	vThicknessMapUv = ( thicknessMapTransform * vec3( THICKNESSMAP_UV, 1 ) ).xy;
#endif`,nc=`#if defined( USE_ENVMAP ) || defined( DISTANCE ) || defined ( USE_SHADOWMAP ) || defined ( USE_TRANSMISSION ) || NUM_SPOT_LIGHT_COORDS > 0
	vec4 worldPosition = vec4( transformed, 1.0 );
	#ifdef USE_BATCHING
		worldPosition = batchingMatrix * worldPosition;
	#endif
	#ifdef USE_INSTANCING
		worldPosition = instanceMatrix * worldPosition;
	#endif
	worldPosition = modelMatrix * worldPosition;
#endif`;const ic=`varying vec2 vUv;
uniform mat3 uvTransform;
void main() {
	vUv = ( uvTransform * vec3( uv, 1 ) ).xy;
	gl_Position = vec4( position.xy, 1.0, 1.0 );
}`,rc=`uniform sampler2D t2D;
uniform float backgroundIntensity;
varying vec2 vUv;
void main() {
	vec4 texColor = texture2D( t2D, vUv );
	#ifdef DECODE_VIDEO_TEXTURE
		texColor = vec4( mix( pow( texColor.rgb * 0.9478672986 + vec3( 0.0521327014 ), vec3( 2.4 ) ), texColor.rgb * 0.0773993808, vec3( lessThanEqual( texColor.rgb, vec3( 0.04045 ) ) ) ), texColor.w );
	#endif
	texColor.rgb *= backgroundIntensity;
	gl_FragColor = texColor;
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
}`,sc=`varying vec3 vWorldDirection;
#include <common>
void main() {
	vWorldDirection = transformDirection( position, modelMatrix );
	#include <begin_vertex>
	#include <project_vertex>
	gl_Position.z = gl_Position.w;
}`,ac=`#ifdef ENVMAP_TYPE_CUBE
	uniform samplerCube envMap;
#elif defined( ENVMAP_TYPE_CUBE_UV )
	uniform sampler2D envMap;
#endif
uniform float flipEnvMap;
uniform float backgroundBlurriness;
uniform float backgroundIntensity;
uniform mat3 backgroundRotation;
varying vec3 vWorldDirection;
#include <cube_uv_reflection_fragment>
void main() {
	#ifdef ENVMAP_TYPE_CUBE
		vec4 texColor = textureCube( envMap, backgroundRotation * vec3( flipEnvMap * vWorldDirection.x, vWorldDirection.yz ) );
	#elif defined( ENVMAP_TYPE_CUBE_UV )
		vec4 texColor = textureCubeUV( envMap, backgroundRotation * vWorldDirection, backgroundBlurriness );
	#else
		vec4 texColor = vec4( 0.0, 0.0, 0.0, 1.0 );
	#endif
	texColor.rgb *= backgroundIntensity;
	gl_FragColor = texColor;
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
}`,oc=`varying vec3 vWorldDirection;
#include <common>
void main() {
	vWorldDirection = transformDirection( position, modelMatrix );
	#include <begin_vertex>
	#include <project_vertex>
	gl_Position.z = gl_Position.w;
}`,lc=`uniform samplerCube tCube;
uniform float tFlip;
uniform float opacity;
varying vec3 vWorldDirection;
void main() {
	vec4 texColor = textureCube( tCube, vec3( tFlip * vWorldDirection.x, vWorldDirection.yz ) );
	gl_FragColor = texColor;
	gl_FragColor.a *= opacity;
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
}`,cc=`#include <common>
#include <batching_pars_vertex>
#include <uv_pars_vertex>
#include <displacementmap_pars_vertex>
#include <morphtarget_pars_vertex>
#include <skinning_pars_vertex>
#include <logdepthbuf_pars_vertex>
#include <clipping_planes_pars_vertex>
varying vec2 vHighPrecisionZW;
void main() {
	#include <uv_vertex>
	#include <batching_vertex>
	#include <skinbase_vertex>
	#include <morphinstance_vertex>
	#ifdef USE_DISPLACEMENTMAP
		#include <beginnormal_vertex>
		#include <morphnormal_vertex>
		#include <skinnormal_vertex>
	#endif
	#include <begin_vertex>
	#include <morphtarget_vertex>
	#include <skinning_vertex>
	#include <displacementmap_vertex>
	#include <project_vertex>
	#include <logdepthbuf_vertex>
	#include <clipping_planes_vertex>
	vHighPrecisionZW = gl_Position.zw;
}`,uc=`#if DEPTH_PACKING == 3200
	uniform float opacity;
#endif
#include <common>
#include <packing>
#include <uv_pars_fragment>
#include <map_pars_fragment>
#include <alphamap_pars_fragment>
#include <alphatest_pars_fragment>
#include <alphahash_pars_fragment>
#include <logdepthbuf_pars_fragment>
#include <clipping_planes_pars_fragment>
varying vec2 vHighPrecisionZW;
void main() {
	vec4 diffuseColor = vec4( 1.0 );
	#include <clipping_planes_fragment>
	#if DEPTH_PACKING == 3200
		diffuseColor.a = opacity;
	#endif
	#include <map_fragment>
	#include <alphamap_fragment>
	#include <alphatest_fragment>
	#include <alphahash_fragment>
	#include <logdepthbuf_fragment>
	float fragCoordZ = 0.5 * vHighPrecisionZW[0] / vHighPrecisionZW[1] + 0.5;
	#if DEPTH_PACKING == 3200
		gl_FragColor = vec4( vec3( 1.0 - fragCoordZ ), opacity );
	#elif DEPTH_PACKING == 3201
		gl_FragColor = packDepthToRGBA( fragCoordZ );
	#elif DEPTH_PACKING == 3202
		gl_FragColor = vec4( packDepthToRGB( fragCoordZ ), 1.0 );
	#elif DEPTH_PACKING == 3203
		gl_FragColor = vec4( packDepthToRG( fragCoordZ ), 0.0, 1.0 );
	#endif
}`,hc=`#define DISTANCE
varying vec3 vWorldPosition;
#include <common>
#include <batching_pars_vertex>
#include <uv_pars_vertex>
#include <displacementmap_pars_vertex>
#include <morphtarget_pars_vertex>
#include <skinning_pars_vertex>
#include <clipping_planes_pars_vertex>
void main() {
	#include <uv_vertex>
	#include <batching_vertex>
	#include <skinbase_vertex>
	#include <morphinstance_vertex>
	#ifdef USE_DISPLACEMENTMAP
		#include <beginnormal_vertex>
		#include <morphnormal_vertex>
		#include <skinnormal_vertex>
	#endif
	#include <begin_vertex>
	#include <morphtarget_vertex>
	#include <skinning_vertex>
	#include <displacementmap_vertex>
	#include <project_vertex>
	#include <worldpos_vertex>
	#include <clipping_planes_vertex>
	vWorldPosition = worldPosition.xyz;
}`,fc=`#define DISTANCE
uniform vec3 referencePosition;
uniform float nearDistance;
uniform float farDistance;
varying vec3 vWorldPosition;
#include <common>
#include <packing>
#include <uv_pars_fragment>
#include <map_pars_fragment>
#include <alphamap_pars_fragment>
#include <alphatest_pars_fragment>
#include <alphahash_pars_fragment>
#include <clipping_planes_pars_fragment>
void main () {
	vec4 diffuseColor = vec4( 1.0 );
	#include <clipping_planes_fragment>
	#include <map_fragment>
	#include <alphamap_fragment>
	#include <alphatest_fragment>
	#include <alphahash_fragment>
	float dist = length( vWorldPosition - referencePosition );
	dist = ( dist - nearDistance ) / ( farDistance - nearDistance );
	dist = saturate( dist );
	gl_FragColor = packDepthToRGBA( dist );
}`,dc=`varying vec3 vWorldDirection;
#include <common>
void main() {
	vWorldDirection = transformDirection( position, modelMatrix );
	#include <begin_vertex>
	#include <project_vertex>
}`,pc=`uniform sampler2D tEquirect;
varying vec3 vWorldDirection;
#include <common>
void main() {
	vec3 direction = normalize( vWorldDirection );
	vec2 sampleUV = equirectUv( direction );
	gl_FragColor = texture2D( tEquirect, sampleUV );
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
}`,mc=`uniform float scale;
attribute float lineDistance;
varying float vLineDistance;
#include <common>
#include <uv_pars_vertex>
#include <color_pars_vertex>
#include <fog_pars_vertex>
#include <morphtarget_pars_vertex>
#include <logdepthbuf_pars_vertex>
#include <clipping_planes_pars_vertex>
void main() {
	vLineDistance = scale * lineDistance;
	#include <uv_vertex>
	#include <color_vertex>
	#include <morphinstance_vertex>
	#include <morphcolor_vertex>
	#include <begin_vertex>
	#include <morphtarget_vertex>
	#include <project_vertex>
	#include <logdepthbuf_vertex>
	#include <clipping_planes_vertex>
	#include <fog_vertex>
}`,_c=`uniform vec3 diffuse;
uniform float opacity;
uniform float dashSize;
uniform float totalSize;
varying float vLineDistance;
#include <common>
#include <color_pars_fragment>
#include <uv_pars_fragment>
#include <map_pars_fragment>
#include <fog_pars_fragment>
#include <logdepthbuf_pars_fragment>
#include <clipping_planes_pars_fragment>
void main() {
	vec4 diffuseColor = vec4( diffuse, opacity );
	#include <clipping_planes_fragment>
	if ( mod( vLineDistance, totalSize ) > dashSize ) {
		discard;
	}
	vec3 outgoingLight = vec3( 0.0 );
	#include <logdepthbuf_fragment>
	#include <map_fragment>
	#include <color_fragment>
	outgoingLight = diffuseColor.rgb;
	#include <opaque_fragment>
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
	#include <fog_fragment>
	#include <premultiplied_alpha_fragment>
}`,gc=`#include <common>
#include <batching_pars_vertex>
#include <uv_pars_vertex>
#include <envmap_pars_vertex>
#include <color_pars_vertex>
#include <fog_pars_vertex>
#include <morphtarget_pars_vertex>
#include <skinning_pars_vertex>
#include <logdepthbuf_pars_vertex>
#include <clipping_planes_pars_vertex>
void main() {
	#include <uv_vertex>
	#include <color_vertex>
	#include <morphinstance_vertex>
	#include <morphcolor_vertex>
	#include <batching_vertex>
	#if defined ( USE_ENVMAP ) || defined ( USE_SKINNING )
		#include <beginnormal_vertex>
		#include <morphnormal_vertex>
		#include <skinbase_vertex>
		#include <skinnormal_vertex>
		#include <defaultnormal_vertex>
	#endif
	#include <begin_vertex>
	#include <morphtarget_vertex>
	#include <skinning_vertex>
	#include <project_vertex>
	#include <logdepthbuf_vertex>
	#include <clipping_planes_vertex>
	#include <worldpos_vertex>
	#include <envmap_vertex>
	#include <fog_vertex>
}`,xc=`uniform vec3 diffuse;
uniform float opacity;
#ifndef FLAT_SHADED
	varying vec3 vNormal;
#endif
#include <common>
#include <dithering_pars_fragment>
#include <color_pars_fragment>
#include <uv_pars_fragment>
#include <map_pars_fragment>
#include <alphamap_pars_fragment>
#include <alphatest_pars_fragment>
#include <alphahash_pars_fragment>
#include <aomap_pars_fragment>
#include <lightmap_pars_fragment>
#include <envmap_common_pars_fragment>
#include <envmap_pars_fragment>
#include <fog_pars_fragment>
#include <specularmap_pars_fragment>
#include <logdepthbuf_pars_fragment>
#include <clipping_planes_pars_fragment>
void main() {
	vec4 diffuseColor = vec4( diffuse, opacity );
	#include <clipping_planes_fragment>
	#include <logdepthbuf_fragment>
	#include <map_fragment>
	#include <color_fragment>
	#include <alphamap_fragment>
	#include <alphatest_fragment>
	#include <alphahash_fragment>
	#include <specularmap_fragment>
	ReflectedLight reflectedLight = ReflectedLight( vec3( 0.0 ), vec3( 0.0 ), vec3( 0.0 ), vec3( 0.0 ) );
	#ifdef USE_LIGHTMAP
		vec4 lightMapTexel = texture2D( lightMap, vLightMapUv );
		reflectedLight.indirectDiffuse += lightMapTexel.rgb * lightMapIntensity * RECIPROCAL_PI;
	#else
		reflectedLight.indirectDiffuse += vec3( 1.0 );
	#endif
	#include <aomap_fragment>
	reflectedLight.indirectDiffuse *= diffuseColor.rgb;
	vec3 outgoingLight = reflectedLight.indirectDiffuse;
	#include <envmap_fragment>
	#include <opaque_fragment>
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
	#include <fog_fragment>
	#include <premultiplied_alpha_fragment>
	#include <dithering_fragment>
}`,vc=`#define LAMBERT
varying vec3 vViewPosition;
#include <common>
#include <batching_pars_vertex>
#include <uv_pars_vertex>
#include <displacementmap_pars_vertex>
#include <envmap_pars_vertex>
#include <color_pars_vertex>
#include <fog_pars_vertex>
#include <normal_pars_vertex>
#include <morphtarget_pars_vertex>
#include <skinning_pars_vertex>
#include <shadowmap_pars_vertex>
#include <logdepthbuf_pars_vertex>
#include <clipping_planes_pars_vertex>
void main() {
	#include <uv_vertex>
	#include <color_vertex>
	#include <morphinstance_vertex>
	#include <morphcolor_vertex>
	#include <batching_vertex>
	#include <beginnormal_vertex>
	#include <morphnormal_vertex>
	#include <skinbase_vertex>
	#include <skinnormal_vertex>
	#include <defaultnormal_vertex>
	#include <normal_vertex>
	#include <begin_vertex>
	#include <morphtarget_vertex>
	#include <skinning_vertex>
	#include <displacementmap_vertex>
	#include <project_vertex>
	#include <logdepthbuf_vertex>
	#include <clipping_planes_vertex>
	vViewPosition = - mvPosition.xyz;
	#include <worldpos_vertex>
	#include <envmap_vertex>
	#include <shadowmap_vertex>
	#include <fog_vertex>
}`,Sc=`#define LAMBERT
uniform vec3 diffuse;
uniform vec3 emissive;
uniform float opacity;
#include <common>
#include <packing>
#include <dithering_pars_fragment>
#include <color_pars_fragment>
#include <uv_pars_fragment>
#include <map_pars_fragment>
#include <alphamap_pars_fragment>
#include <alphatest_pars_fragment>
#include <alphahash_pars_fragment>
#include <aomap_pars_fragment>
#include <lightmap_pars_fragment>
#include <emissivemap_pars_fragment>
#include <envmap_common_pars_fragment>
#include <envmap_pars_fragment>
#include <fog_pars_fragment>
#include <bsdfs>
#include <lights_pars_begin>
#include <normal_pars_fragment>
#include <lights_lambert_pars_fragment>
#include <shadowmap_pars_fragment>
#include <bumpmap_pars_fragment>
#include <normalmap_pars_fragment>
#include <specularmap_pars_fragment>
#include <logdepthbuf_pars_fragment>
#include <clipping_planes_pars_fragment>
void main() {
	vec4 diffuseColor = vec4( diffuse, opacity );
	#include <clipping_planes_fragment>
	ReflectedLight reflectedLight = ReflectedLight( vec3( 0.0 ), vec3( 0.0 ), vec3( 0.0 ), vec3( 0.0 ) );
	vec3 totalEmissiveRadiance = emissive;
	#include <logdepthbuf_fragment>
	#include <map_fragment>
	#include <color_fragment>
	#include <alphamap_fragment>
	#include <alphatest_fragment>
	#include <alphahash_fragment>
	#include <specularmap_fragment>
	#include <normal_fragment_begin>
	#include <normal_fragment_maps>
	#include <emissivemap_fragment>
	#include <lights_lambert_fragment>
	#include <lights_fragment_begin>
	#include <lights_fragment_maps>
	#include <lights_fragment_end>
	#include <aomap_fragment>
	vec3 outgoingLight = reflectedLight.directDiffuse + reflectedLight.indirectDiffuse + totalEmissiveRadiance;
	#include <envmap_fragment>
	#include <opaque_fragment>
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
	#include <fog_fragment>
	#include <premultiplied_alpha_fragment>
	#include <dithering_fragment>
}`,Mc=`#define MATCAP
varying vec3 vViewPosition;
#include <common>
#include <batching_pars_vertex>
#include <uv_pars_vertex>
#include <color_pars_vertex>
#include <displacementmap_pars_vertex>
#include <fog_pars_vertex>
#include <normal_pars_vertex>
#include <morphtarget_pars_vertex>
#include <skinning_pars_vertex>
#include <logdepthbuf_pars_vertex>
#include <clipping_planes_pars_vertex>
void main() {
	#include <uv_vertex>
	#include <color_vertex>
	#include <morphinstance_vertex>
	#include <morphcolor_vertex>
	#include <batching_vertex>
	#include <beginnormal_vertex>
	#include <morphnormal_vertex>
	#include <skinbase_vertex>
	#include <skinnormal_vertex>
	#include <defaultnormal_vertex>
	#include <normal_vertex>
	#include <begin_vertex>
	#include <morphtarget_vertex>
	#include <skinning_vertex>
	#include <displacementmap_vertex>
	#include <project_vertex>
	#include <logdepthbuf_vertex>
	#include <clipping_planes_vertex>
	#include <fog_vertex>
	vViewPosition = - mvPosition.xyz;
}`,Ec=`#define MATCAP
uniform vec3 diffuse;
uniform float opacity;
uniform sampler2D matcap;
varying vec3 vViewPosition;
#include <common>
#include <dithering_pars_fragment>
#include <color_pars_fragment>
#include <uv_pars_fragment>
#include <map_pars_fragment>
#include <alphamap_pars_fragment>
#include <alphatest_pars_fragment>
#include <alphahash_pars_fragment>
#include <fog_pars_fragment>
#include <normal_pars_fragment>
#include <bumpmap_pars_fragment>
#include <normalmap_pars_fragment>
#include <logdepthbuf_pars_fragment>
#include <clipping_planes_pars_fragment>
void main() {
	vec4 diffuseColor = vec4( diffuse, opacity );
	#include <clipping_planes_fragment>
	#include <logdepthbuf_fragment>
	#include <map_fragment>
	#include <color_fragment>
	#include <alphamap_fragment>
	#include <alphatest_fragment>
	#include <alphahash_fragment>
	#include <normal_fragment_begin>
	#include <normal_fragment_maps>
	vec3 viewDir = normalize( vViewPosition );
	vec3 x = normalize( vec3( viewDir.z, 0.0, - viewDir.x ) );
	vec3 y = cross( viewDir, x );
	vec2 uv = vec2( dot( x, normal ), dot( y, normal ) ) * 0.495 + 0.5;
	#ifdef USE_MATCAP
		vec4 matcapColor = texture2D( matcap, uv );
	#else
		vec4 matcapColor = vec4( vec3( mix( 0.2, 0.8, uv.y ) ), 1.0 );
	#endif
	vec3 outgoingLight = diffuseColor.rgb * matcapColor.rgb;
	#include <opaque_fragment>
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
	#include <fog_fragment>
	#include <premultiplied_alpha_fragment>
	#include <dithering_fragment>
}`,yc=`#define NORMAL
#if defined( FLAT_SHADED ) || defined( USE_BUMPMAP ) || defined( USE_NORMALMAP_TANGENTSPACE )
	varying vec3 vViewPosition;
#endif
#include <common>
#include <batching_pars_vertex>
#include <uv_pars_vertex>
#include <displacementmap_pars_vertex>
#include <normal_pars_vertex>
#include <morphtarget_pars_vertex>
#include <skinning_pars_vertex>
#include <logdepthbuf_pars_vertex>
#include <clipping_planes_pars_vertex>
void main() {
	#include <uv_vertex>
	#include <batching_vertex>
	#include <beginnormal_vertex>
	#include <morphinstance_vertex>
	#include <morphnormal_vertex>
	#include <skinbase_vertex>
	#include <skinnormal_vertex>
	#include <defaultnormal_vertex>
	#include <normal_vertex>
	#include <begin_vertex>
	#include <morphtarget_vertex>
	#include <skinning_vertex>
	#include <displacementmap_vertex>
	#include <project_vertex>
	#include <logdepthbuf_vertex>
	#include <clipping_planes_vertex>
#if defined( FLAT_SHADED ) || defined( USE_BUMPMAP ) || defined( USE_NORMALMAP_TANGENTSPACE )
	vViewPosition = - mvPosition.xyz;
#endif
}`,Tc=`#define NORMAL
uniform float opacity;
#if defined( FLAT_SHADED ) || defined( USE_BUMPMAP ) || defined( USE_NORMALMAP_TANGENTSPACE )
	varying vec3 vViewPosition;
#endif
#include <packing>
#include <uv_pars_fragment>
#include <normal_pars_fragment>
#include <bumpmap_pars_fragment>
#include <normalmap_pars_fragment>
#include <logdepthbuf_pars_fragment>
#include <clipping_planes_pars_fragment>
void main() {
	vec4 diffuseColor = vec4( 0.0, 0.0, 0.0, opacity );
	#include <clipping_planes_fragment>
	#include <logdepthbuf_fragment>
	#include <normal_fragment_begin>
	#include <normal_fragment_maps>
	gl_FragColor = vec4( packNormalToRGB( normal ), diffuseColor.a );
	#ifdef OPAQUE
		gl_FragColor.a = 1.0;
	#endif
}`,Ac=`#define PHONG
varying vec3 vViewPosition;
#include <common>
#include <batching_pars_vertex>
#include <uv_pars_vertex>
#include <displacementmap_pars_vertex>
#include <envmap_pars_vertex>
#include <color_pars_vertex>
#include <fog_pars_vertex>
#include <normal_pars_vertex>
#include <morphtarget_pars_vertex>
#include <skinning_pars_vertex>
#include <shadowmap_pars_vertex>
#include <logdepthbuf_pars_vertex>
#include <clipping_planes_pars_vertex>
void main() {
	#include <uv_vertex>
	#include <color_vertex>
	#include <morphcolor_vertex>
	#include <batching_vertex>
	#include <beginnormal_vertex>
	#include <morphinstance_vertex>
	#include <morphnormal_vertex>
	#include <skinbase_vertex>
	#include <skinnormal_vertex>
	#include <defaultnormal_vertex>
	#include <normal_vertex>
	#include <begin_vertex>
	#include <morphtarget_vertex>
	#include <skinning_vertex>
	#include <displacementmap_vertex>
	#include <project_vertex>
	#include <logdepthbuf_vertex>
	#include <clipping_planes_vertex>
	vViewPosition = - mvPosition.xyz;
	#include <worldpos_vertex>
	#include <envmap_vertex>
	#include <shadowmap_vertex>
	#include <fog_vertex>
}`,bc=`#define PHONG
uniform vec3 diffuse;
uniform vec3 emissive;
uniform vec3 specular;
uniform float shininess;
uniform float opacity;
#include <common>
#include <packing>
#include <dithering_pars_fragment>
#include <color_pars_fragment>
#include <uv_pars_fragment>
#include <map_pars_fragment>
#include <alphamap_pars_fragment>
#include <alphatest_pars_fragment>
#include <alphahash_pars_fragment>
#include <aomap_pars_fragment>
#include <lightmap_pars_fragment>
#include <emissivemap_pars_fragment>
#include <envmap_common_pars_fragment>
#include <envmap_pars_fragment>
#include <fog_pars_fragment>
#include <bsdfs>
#include <lights_pars_begin>
#include <normal_pars_fragment>
#include <lights_phong_pars_fragment>
#include <shadowmap_pars_fragment>
#include <bumpmap_pars_fragment>
#include <normalmap_pars_fragment>
#include <specularmap_pars_fragment>
#include <logdepthbuf_pars_fragment>
#include <clipping_planes_pars_fragment>
void main() {
	vec4 diffuseColor = vec4( diffuse, opacity );
	#include <clipping_planes_fragment>
	ReflectedLight reflectedLight = ReflectedLight( vec3( 0.0 ), vec3( 0.0 ), vec3( 0.0 ), vec3( 0.0 ) );
	vec3 totalEmissiveRadiance = emissive;
	#include <logdepthbuf_fragment>
	#include <map_fragment>
	#include <color_fragment>
	#include <alphamap_fragment>
	#include <alphatest_fragment>
	#include <alphahash_fragment>
	#include <specularmap_fragment>
	#include <normal_fragment_begin>
	#include <normal_fragment_maps>
	#include <emissivemap_fragment>
	#include <lights_phong_fragment>
	#include <lights_fragment_begin>
	#include <lights_fragment_maps>
	#include <lights_fragment_end>
	#include <aomap_fragment>
	vec3 outgoingLight = reflectedLight.directDiffuse + reflectedLight.indirectDiffuse + reflectedLight.directSpecular + reflectedLight.indirectSpecular + totalEmissiveRadiance;
	#include <envmap_fragment>
	#include <opaque_fragment>
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
	#include <fog_fragment>
	#include <premultiplied_alpha_fragment>
	#include <dithering_fragment>
}`,Rc=`#define STANDARD
varying vec3 vViewPosition;
#ifdef USE_TRANSMISSION
	varying vec3 vWorldPosition;
#endif
#include <common>
#include <batching_pars_vertex>
#include <uv_pars_vertex>
#include <displacementmap_pars_vertex>
#include <color_pars_vertex>
#include <fog_pars_vertex>
#include <normal_pars_vertex>
#include <morphtarget_pars_vertex>
#include <skinning_pars_vertex>
#include <shadowmap_pars_vertex>
#include <logdepthbuf_pars_vertex>
#include <clipping_planes_pars_vertex>
void main() {
	#include <uv_vertex>
	#include <color_vertex>
	#include <morphinstance_vertex>
	#include <morphcolor_vertex>
	#include <batching_vertex>
	#include <beginnormal_vertex>
	#include <morphnormal_vertex>
	#include <skinbase_vertex>
	#include <skinnormal_vertex>
	#include <defaultnormal_vertex>
	#include <normal_vertex>
	#include <begin_vertex>
	#include <morphtarget_vertex>
	#include <skinning_vertex>
	#include <displacementmap_vertex>
	#include <project_vertex>
	#include <logdepthbuf_vertex>
	#include <clipping_planes_vertex>
	vViewPosition = - mvPosition.xyz;
	#include <worldpos_vertex>
	#include <shadowmap_vertex>
	#include <fog_vertex>
#ifdef USE_TRANSMISSION
	vWorldPosition = worldPosition.xyz;
#endif
}`,wc=`#define STANDARD
#ifdef PHYSICAL
	#define IOR
	#define USE_SPECULAR
#endif
uniform vec3 diffuse;
uniform vec3 emissive;
uniform float roughness;
uniform float metalness;
uniform float opacity;
#ifdef IOR
	uniform float ior;
#endif
#ifdef USE_SPECULAR
	uniform float specularIntensity;
	uniform vec3 specularColor;
	#ifdef USE_SPECULAR_COLORMAP
		uniform sampler2D specularColorMap;
	#endif
	#ifdef USE_SPECULAR_INTENSITYMAP
		uniform sampler2D specularIntensityMap;
	#endif
#endif
#ifdef USE_CLEARCOAT
	uniform float clearcoat;
	uniform float clearcoatRoughness;
#endif
#ifdef USE_DISPERSION
	uniform float dispersion;
#endif
#ifdef USE_IRIDESCENCE
	uniform float iridescence;
	uniform float iridescenceIOR;
	uniform float iridescenceThicknessMinimum;
	uniform float iridescenceThicknessMaximum;
#endif
#ifdef USE_SHEEN
	uniform vec3 sheenColor;
	uniform float sheenRoughness;
	#ifdef USE_SHEEN_COLORMAP
		uniform sampler2D sheenColorMap;
	#endif
	#ifdef USE_SHEEN_ROUGHNESSMAP
		uniform sampler2D sheenRoughnessMap;
	#endif
#endif
#ifdef USE_ANISOTROPY
	uniform vec2 anisotropyVector;
	#ifdef USE_ANISOTROPYMAP
		uniform sampler2D anisotropyMap;
	#endif
#endif
varying vec3 vViewPosition;
#include <common>
#include <packing>
#include <dithering_pars_fragment>
#include <color_pars_fragment>
#include <uv_pars_fragment>
#include <map_pars_fragment>
#include <alphamap_pars_fragment>
#include <alphatest_pars_fragment>
#include <alphahash_pars_fragment>
#include <aomap_pars_fragment>
#include <lightmap_pars_fragment>
#include <emissivemap_pars_fragment>
#include <iridescence_fragment>
#include <cube_uv_reflection_fragment>
#include <envmap_common_pars_fragment>
#include <envmap_physical_pars_fragment>
#include <fog_pars_fragment>
#include <lights_pars_begin>
#include <normal_pars_fragment>
#include <lights_physical_pars_fragment>
#include <transmission_pars_fragment>
#include <shadowmap_pars_fragment>
#include <bumpmap_pars_fragment>
#include <normalmap_pars_fragment>
#include <clearcoat_pars_fragment>
#include <iridescence_pars_fragment>
#include <roughnessmap_pars_fragment>
#include <metalnessmap_pars_fragment>
#include <logdepthbuf_pars_fragment>
#include <clipping_planes_pars_fragment>
void main() {
	vec4 diffuseColor = vec4( diffuse, opacity );
	#include <clipping_planes_fragment>
	ReflectedLight reflectedLight = ReflectedLight( vec3( 0.0 ), vec3( 0.0 ), vec3( 0.0 ), vec3( 0.0 ) );
	vec3 totalEmissiveRadiance = emissive;
	#include <logdepthbuf_fragment>
	#include <map_fragment>
	#include <color_fragment>
	#include <alphamap_fragment>
	#include <alphatest_fragment>
	#include <alphahash_fragment>
	#include <roughnessmap_fragment>
	#include <metalnessmap_fragment>
	#include <normal_fragment_begin>
	#include <normal_fragment_maps>
	#include <clearcoat_normal_fragment_begin>
	#include <clearcoat_normal_fragment_maps>
	#include <emissivemap_fragment>
	#include <lights_physical_fragment>
	#include <lights_fragment_begin>
	#include <lights_fragment_maps>
	#include <lights_fragment_end>
	#include <aomap_fragment>
	vec3 totalDiffuse = reflectedLight.directDiffuse + reflectedLight.indirectDiffuse;
	vec3 totalSpecular = reflectedLight.directSpecular + reflectedLight.indirectSpecular;
	#include <transmission_fragment>
	vec3 outgoingLight = totalDiffuse + totalSpecular + totalEmissiveRadiance;
	#ifdef USE_SHEEN
		float sheenEnergyComp = 1.0 - 0.157 * max3( material.sheenColor );
		outgoingLight = outgoingLight * sheenEnergyComp + sheenSpecularDirect + sheenSpecularIndirect;
	#endif
	#ifdef USE_CLEARCOAT
		float dotNVcc = saturate( dot( geometryClearcoatNormal, geometryViewDir ) );
		vec3 Fcc = F_Schlick( material.clearcoatF0, material.clearcoatF90, dotNVcc );
		outgoingLight = outgoingLight * ( 1.0 - material.clearcoat * Fcc ) + ( clearcoatSpecularDirect + clearcoatSpecularIndirect ) * material.clearcoat;
	#endif
	#include <opaque_fragment>
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
	#include <fog_fragment>
	#include <premultiplied_alpha_fragment>
	#include <dithering_fragment>
}`,Cc=`#define TOON
varying vec3 vViewPosition;
#include <common>
#include <batching_pars_vertex>
#include <uv_pars_vertex>
#include <displacementmap_pars_vertex>
#include <color_pars_vertex>
#include <fog_pars_vertex>
#include <normal_pars_vertex>
#include <morphtarget_pars_vertex>
#include <skinning_pars_vertex>
#include <shadowmap_pars_vertex>
#include <logdepthbuf_pars_vertex>
#include <clipping_planes_pars_vertex>
void main() {
	#include <uv_vertex>
	#include <color_vertex>
	#include <morphinstance_vertex>
	#include <morphcolor_vertex>
	#include <batching_vertex>
	#include <beginnormal_vertex>
	#include <morphnormal_vertex>
	#include <skinbase_vertex>
	#include <skinnormal_vertex>
	#include <defaultnormal_vertex>
	#include <normal_vertex>
	#include <begin_vertex>
	#include <morphtarget_vertex>
	#include <skinning_vertex>
	#include <displacementmap_vertex>
	#include <project_vertex>
	#include <logdepthbuf_vertex>
	#include <clipping_planes_vertex>
	vViewPosition = - mvPosition.xyz;
	#include <worldpos_vertex>
	#include <shadowmap_vertex>
	#include <fog_vertex>
}`,Pc=`#define TOON
uniform vec3 diffuse;
uniform vec3 emissive;
uniform float opacity;
#include <common>
#include <packing>
#include <dithering_pars_fragment>
#include <color_pars_fragment>
#include <uv_pars_fragment>
#include <map_pars_fragment>
#include <alphamap_pars_fragment>
#include <alphatest_pars_fragment>
#include <alphahash_pars_fragment>
#include <aomap_pars_fragment>
#include <lightmap_pars_fragment>
#include <emissivemap_pars_fragment>
#include <gradientmap_pars_fragment>
#include <fog_pars_fragment>
#include <bsdfs>
#include <lights_pars_begin>
#include <normal_pars_fragment>
#include <lights_toon_pars_fragment>
#include <shadowmap_pars_fragment>
#include <bumpmap_pars_fragment>
#include <normalmap_pars_fragment>
#include <logdepthbuf_pars_fragment>
#include <clipping_planes_pars_fragment>
void main() {
	vec4 diffuseColor = vec4( diffuse, opacity );
	#include <clipping_planes_fragment>
	ReflectedLight reflectedLight = ReflectedLight( vec3( 0.0 ), vec3( 0.0 ), vec3( 0.0 ), vec3( 0.0 ) );
	vec3 totalEmissiveRadiance = emissive;
	#include <logdepthbuf_fragment>
	#include <map_fragment>
	#include <color_fragment>
	#include <alphamap_fragment>
	#include <alphatest_fragment>
	#include <alphahash_fragment>
	#include <normal_fragment_begin>
	#include <normal_fragment_maps>
	#include <emissivemap_fragment>
	#include <lights_toon_fragment>
	#include <lights_fragment_begin>
	#include <lights_fragment_maps>
	#include <lights_fragment_end>
	#include <aomap_fragment>
	vec3 outgoingLight = reflectedLight.directDiffuse + reflectedLight.indirectDiffuse + totalEmissiveRadiance;
	#include <opaque_fragment>
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
	#include <fog_fragment>
	#include <premultiplied_alpha_fragment>
	#include <dithering_fragment>
}`,Dc=`uniform float size;
uniform float scale;
#include <common>
#include <color_pars_vertex>
#include <fog_pars_vertex>
#include <morphtarget_pars_vertex>
#include <logdepthbuf_pars_vertex>
#include <clipping_planes_pars_vertex>
#ifdef USE_POINTS_UV
	varying vec2 vUv;
	uniform mat3 uvTransform;
#endif
void main() {
	#ifdef USE_POINTS_UV
		vUv = ( uvTransform * vec3( uv, 1 ) ).xy;
	#endif
	#include <color_vertex>
	#include <morphinstance_vertex>
	#include <morphcolor_vertex>
	#include <begin_vertex>
	#include <morphtarget_vertex>
	#include <project_vertex>
	gl_PointSize = size;
	#ifdef USE_SIZEATTENUATION
		bool isPerspective = isPerspectiveMatrix( projectionMatrix );
		if ( isPerspective ) gl_PointSize *= ( scale / - mvPosition.z );
	#endif
	#include <logdepthbuf_vertex>
	#include <clipping_planes_vertex>
	#include <worldpos_vertex>
	#include <fog_vertex>
}`,Ic=`uniform vec3 diffuse;
uniform float opacity;
#include <common>
#include <color_pars_fragment>
#include <map_particle_pars_fragment>
#include <alphatest_pars_fragment>
#include <alphahash_pars_fragment>
#include <fog_pars_fragment>
#include <logdepthbuf_pars_fragment>
#include <clipping_planes_pars_fragment>
void main() {
	vec4 diffuseColor = vec4( diffuse, opacity );
	#include <clipping_planes_fragment>
	vec3 outgoingLight = vec3( 0.0 );
	#include <logdepthbuf_fragment>
	#include <map_particle_fragment>
	#include <color_fragment>
	#include <alphatest_fragment>
	#include <alphahash_fragment>
	outgoingLight = diffuseColor.rgb;
	#include <opaque_fragment>
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
	#include <fog_fragment>
	#include <premultiplied_alpha_fragment>
}`,Uc=`#include <common>
#include <batching_pars_vertex>
#include <fog_pars_vertex>
#include <morphtarget_pars_vertex>
#include <skinning_pars_vertex>
#include <logdepthbuf_pars_vertex>
#include <shadowmap_pars_vertex>
void main() {
	#include <batching_vertex>
	#include <beginnormal_vertex>
	#include <morphinstance_vertex>
	#include <morphnormal_vertex>
	#include <skinbase_vertex>
	#include <skinnormal_vertex>
	#include <defaultnormal_vertex>
	#include <begin_vertex>
	#include <morphtarget_vertex>
	#include <skinning_vertex>
	#include <project_vertex>
	#include <logdepthbuf_vertex>
	#include <worldpos_vertex>
	#include <shadowmap_vertex>
	#include <fog_vertex>
}`,Lc=`uniform vec3 color;
uniform float opacity;
#include <common>
#include <packing>
#include <fog_pars_fragment>
#include <bsdfs>
#include <lights_pars_begin>
#include <logdepthbuf_pars_fragment>
#include <shadowmap_pars_fragment>
#include <shadowmask_pars_fragment>
void main() {
	#include <logdepthbuf_fragment>
	gl_FragColor = vec4( color, opacity * ( 1.0 - getShadowMask() ) );
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
	#include <fog_fragment>
}`,Fc=`uniform float rotation;
uniform vec2 center;
#include <common>
#include <uv_pars_vertex>
#include <fog_pars_vertex>
#include <logdepthbuf_pars_vertex>
#include <clipping_planes_pars_vertex>
void main() {
	#include <uv_vertex>
	vec4 mvPosition = modelViewMatrix[ 3 ];
	vec2 scale = vec2( length( modelMatrix[ 0 ].xyz ), length( modelMatrix[ 1 ].xyz ) );
	#ifndef USE_SIZEATTENUATION
		bool isPerspective = isPerspectiveMatrix( projectionMatrix );
		if ( isPerspective ) scale *= - mvPosition.z;
	#endif
	vec2 alignedPosition = ( position.xy - ( center - vec2( 0.5 ) ) ) * scale;
	vec2 rotatedPosition;
	rotatedPosition.x = cos( rotation ) * alignedPosition.x - sin( rotation ) * alignedPosition.y;
	rotatedPosition.y = sin( rotation ) * alignedPosition.x + cos( rotation ) * alignedPosition.y;
	mvPosition.xy += rotatedPosition;
	gl_Position = projectionMatrix * mvPosition;
	#include <logdepthbuf_vertex>
	#include <clipping_planes_vertex>
	#include <fog_vertex>
}`,Nc=`uniform vec3 diffuse;
uniform float opacity;
#include <common>
#include <uv_pars_fragment>
#include <map_pars_fragment>
#include <alphamap_pars_fragment>
#include <alphatest_pars_fragment>
#include <alphahash_pars_fragment>
#include <fog_pars_fragment>
#include <logdepthbuf_pars_fragment>
#include <clipping_planes_pars_fragment>
void main() {
	vec4 diffuseColor = vec4( diffuse, opacity );
	#include <clipping_planes_fragment>
	vec3 outgoingLight = vec3( 0.0 );
	#include <logdepthbuf_fragment>
	#include <map_fragment>
	#include <alphamap_fragment>
	#include <alphatest_fragment>
	#include <alphahash_fragment>
	outgoingLight = diffuseColor.rgb;
	#include <opaque_fragment>
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
	#include <fog_fragment>
}`,Ne={alphahash_fragment:io,alphahash_pars_fragment:ro,alphamap_fragment:so,alphamap_pars_fragment:ao,alphatest_fragment:oo,alphatest_pars_fragment:lo,aomap_fragment:co,aomap_pars_fragment:uo,batching_pars_vertex:ho,batching_vertex:fo,begin_vertex:po,beginnormal_vertex:mo,bsdfs:_o,iridescence_fragment:go,bumpmap_pars_fragment:xo,clipping_planes_fragment:vo,clipping_planes_pars_fragment:So,clipping_planes_pars_vertex:Mo,clipping_planes_vertex:Eo,color_fragment:yo,color_pars_fragment:To,color_pars_vertex:Ao,color_vertex:bo,common:Ro,cube_uv_reflection_fragment:wo,defaultnormal_vertex:Co,displacementmap_pars_vertex:Po,displacementmap_vertex:Do,emissivemap_fragment:Io,emissivemap_pars_fragment:Uo,colorspace_fragment:Lo,colorspace_pars_fragment:Fo,envmap_fragment:No,envmap_common_pars_fragment:Bo,envmap_pars_fragment:Oo,envmap_pars_vertex:Go,envmap_physical_pars_fragment:Zo,envmap_vertex:zo,fog_vertex:Vo,fog_pars_vertex:Ho,fog_fragment:ko,fog_pars_fragment:Wo,gradientmap_pars_fragment:Xo,lightmap_pars_fragment:qo,lights_lambert_fragment:Yo,lights_lambert_pars_fragment:$o,lights_pars_begin:Ko,lights_toon_fragment:jo,lights_toon_pars_fragment:Jo,lights_phong_fragment:Qo,lights_phong_pars_fragment:el,lights_physical_fragment:tl,lights_physical_pars_fragment:nl,lights_fragment_begin:il,lights_fragment_maps:rl,lights_fragment_end:sl,logdepthbuf_fragment:al,logdepthbuf_pars_fragment:ol,logdepthbuf_pars_vertex:ll,logdepthbuf_vertex:cl,map_fragment:ul,map_pars_fragment:hl,map_particle_fragment:fl,map_particle_pars_fragment:dl,metalnessmap_fragment:pl,metalnessmap_pars_fragment:ml,morphinstance_vertex:_l,morphcolor_vertex:gl,morphnormal_vertex:xl,morphtarget_pars_vertex:vl,morphtarget_vertex:Sl,normal_fragment_begin:Ml,normal_fragment_maps:El,normal_pars_fragment:yl,normal_pars_vertex:Tl,normal_vertex:Al,normalmap_pars_fragment:bl,clearcoat_normal_fragment_begin:Rl,clearcoat_normal_fragment_maps:wl,clearcoat_pars_fragment:Cl,iridescence_pars_fragment:Pl,opaque_fragment:Dl,packing:Il,premultiplied_alpha_fragment:Ul,project_vertex:Ll,dithering_fragment:Fl,dithering_pars_fragment:Nl,roughnessmap_fragment:Bl,roughnessmap_pars_fragment:Ol,shadowmap_pars_fragment:Gl,shadowmap_pars_vertex:zl,shadowmap_vertex:Vl,shadowmask_pars_fragment:Hl,skinbase_vertex:kl,skinning_pars_vertex:Wl,skinning_vertex:Xl,skinnormal_vertex:ql,specularmap_fragment:Yl,specularmap_pars_fragment:$l,tonemapping_fragment:Kl,tonemapping_pars_fragment:Zl,transmission_fragment:jl,transmission_pars_fragment:Jl,uv_pars_fragment:Ql,uv_pars_vertex:ec,uv_vertex:tc,worldpos_vertex:nc,background_vert:ic,background_frag:rc,backgroundCube_vert:sc,backgroundCube_frag:ac,cube_vert:oc,cube_frag:lc,depth_vert:cc,depth_frag:uc,distanceRGBA_vert:hc,distanceRGBA_frag:fc,equirect_vert:dc,equirect_frag:pc,linedashed_vert:mc,linedashed_frag:_c,meshbasic_vert:gc,meshbasic_frag:xc,meshlambert_vert:vc,meshlambert_frag:Sc,meshmatcap_vert:Mc,meshmatcap_frag:Ec,meshnormal_vert:yc,meshnormal_frag:Tc,meshphong_vert:Ac,meshphong_frag:bc,meshphysical_vert:Rc,meshphysical_frag:wc,meshtoon_vert:Cc,meshtoon_frag:Pc,points_vert:Dc,points_frag:Ic,shadow_vert:Uc,shadow_frag:Lc,sprite_vert:Fc,sprite_frag:Nc},ue={common:{diffuse:{value:new Ke(16777215)},opacity:{value:1},map:{value:null},mapTransform:{value:new Ue},alphaMap:{value:null},alphaMapTransform:{value:new Ue},alphaTest:{value:0}},specularmap:{specularMap:{value:null},specularMapTransform:{value:new Ue}},envmap:{envMap:{value:null},envMapRotation:{value:new Ue},flipEnvMap:{value:-1},reflectivity:{value:1},ior:{value:1.5},refractionRatio:{value:.98}},aomap:{aoMap:{value:null},aoMapIntensity:{value:1},aoMapTransform:{value:new Ue}},lightmap:{lightMap:{value:null},lightMapIntensity:{value:1},lightMapTransform:{value:new Ue}},bumpmap:{bumpMap:{value:null},bumpMapTransform:{value:new Ue},bumpScale:{value:1}},normalmap:{normalMap:{value:null},normalMapTransform:{value:new Ue},normalScale:{value:new qe(1,1)}},displacementmap:{displacementMap:{value:null},displacementMapTransform:{value:new Ue},displacementScale:{value:1},displacementBias:{value:0}},emissivemap:{emissiveMap:{value:null},emissiveMapTransform:{value:new Ue}},metalnessmap:{metalnessMap:{value:null},metalnessMapTransform:{value:new Ue}},roughnessmap:{roughnessMap:{value:null},roughnessMapTransform:{value:new Ue}},gradientmap:{gradientMap:{value:null}},fog:{fogDensity:{value:25e-5},fogNear:{value:1},fogFar:{value:2e3},fogColor:{value:new Ke(16777215)}},lights:{ambientLightColor:{value:[]},lightProbe:{value:[]},directionalLights:{value:[],properties:{direction:{},color:{}}},directionalLightShadows:{value:[],properties:{shadowIntensity:1,shadowBias:{},shadowNormalBias:{},shadowRadius:{},shadowMapSize:{}}},directionalShadowMap:{value:[]},directionalShadowMatrix:{value:[]},spotLights:{value:[],properties:{color:{},position:{},direction:{},distance:{},coneCos:{},penumbraCos:{},decay:{}}},spotLightShadows:{value:[],properties:{shadowIntensity:1,shadowBias:{},shadowNormalBias:{},shadowRadius:{},shadowMapSize:{}}},spotLightMap:{value:[]},spotShadowMap:{value:[]},spotLightMatrix:{value:[]},pointLights:{value:[],properties:{color:{},position:{},decay:{},distance:{}}},pointLightShadows:{value:[],properties:{shadowIntensity:1,shadowBias:{},shadowNormalBias:{},shadowRadius:{},shadowMapSize:{},shadowCameraNear:{},shadowCameraFar:{}}},pointShadowMap:{value:[]},pointShadowMatrix:{value:[]},hemisphereLights:{value:[],properties:{direction:{},skyColor:{},groundColor:{}}},rectAreaLights:{value:[],properties:{color:{},position:{},width:{},height:{}}},ltc_1:{value:null},ltc_2:{value:null}},points:{diffuse:{value:new Ke(16777215)},opacity:{value:1},size:{value:1},scale:{value:1},map:{value:null},alphaMap:{value:null},alphaMapTransform:{value:new Ue},alphaTest:{value:0},uvTransform:{value:new Ue}},sprite:{diffuse:{value:new Ke(16777215)},opacity:{value:1},center:{value:new qe(.5,.5)},rotation:{value:0},map:{value:null},mapTransform:{value:new Ue},alphaMap:{value:null},alphaMapTransform:{value:new Ue},alphaTest:{value:0}}},Ot={basic:{uniforms:xt([ue.common,ue.specularmap,ue.envmap,ue.aomap,ue.lightmap,ue.fog]),vertexShader:Ne.meshbasic_vert,fragmentShader:Ne.meshbasic_frag},lambert:{uniforms:xt([ue.common,ue.specularmap,ue.envmap,ue.aomap,ue.lightmap,ue.emissivemap,ue.bumpmap,ue.normalmap,ue.displacementmap,ue.fog,ue.lights,{emissive:{value:new Ke(0)}}]),vertexShader:Ne.meshlambert_vert,fragmentShader:Ne.meshlambert_frag},phong:{uniforms:xt([ue.common,ue.specularmap,ue.envmap,ue.aomap,ue.lightmap,ue.emissivemap,ue.bumpmap,ue.normalmap,ue.displacementmap,ue.fog,ue.lights,{emissive:{value:new Ke(0)},specular:{value:new Ke(1118481)},shininess:{value:30}}]),vertexShader:Ne.meshphong_vert,fragmentShader:Ne.meshphong_frag},standard:{uniforms:xt([ue.common,ue.envmap,ue.aomap,ue.lightmap,ue.emissivemap,ue.bumpmap,ue.normalmap,ue.displacementmap,ue.roughnessmap,ue.metalnessmap,ue.fog,ue.lights,{emissive:{value:new Ke(0)},roughness:{value:1},metalness:{value:0},envMapIntensity:{value:1}}]),vertexShader:Ne.meshphysical_vert,fragmentShader:Ne.meshphysical_frag},toon:{uniforms:xt([ue.common,ue.aomap,ue.lightmap,ue.emissivemap,ue.bumpmap,ue.normalmap,ue.displacementmap,ue.gradientmap,ue.fog,ue.lights,{emissive:{value:new Ke(0)}}]),vertexShader:Ne.meshtoon_vert,fragmentShader:Ne.meshtoon_frag},matcap:{uniforms:xt([ue.common,ue.bumpmap,ue.normalmap,ue.displacementmap,ue.fog,{matcap:{value:null}}]),vertexShader:Ne.meshmatcap_vert,fragmentShader:Ne.meshmatcap_frag},points:{uniforms:xt([ue.points,ue.fog]),vertexShader:Ne.points_vert,fragmentShader:Ne.points_frag},dashed:{uniforms:xt([ue.common,ue.fog,{scale:{value:1},dashSize:{value:1},totalSize:{value:2}}]),vertexShader:Ne.linedashed_vert,fragmentShader:Ne.linedashed_frag},depth:{uniforms:xt([ue.common,ue.displacementmap]),vertexShader:Ne.depth_vert,fragmentShader:Ne.depth_frag},normal:{uniforms:xt([ue.common,ue.bumpmap,ue.normalmap,ue.displacementmap,{opacity:{value:1}}]),vertexShader:Ne.meshnormal_vert,fragmentShader:Ne.meshnormal_frag},sprite:{uniforms:xt([ue.sprite,ue.fog]),vertexShader:Ne.sprite_vert,fragmentShader:Ne.sprite_frag},background:{uniforms:{uvTransform:{value:new Ue},t2D:{value:null},backgroundIntensity:{value:1}},vertexShader:Ne.background_vert,fragmentShader:Ne.background_frag},backgroundCube:{uniforms:{envMap:{value:null},flipEnvMap:{value:-1},backgroundBlurriness:{value:0},backgroundIntensity:{value:1},backgroundRotation:{value:new Ue}},vertexShader:Ne.backgroundCube_vert,fragmentShader:Ne.backgroundCube_frag},cube:{uniforms:{tCube:{value:null},tFlip:{value:-1},opacity:{value:1}},vertexShader:Ne.cube_vert,fragmentShader:Ne.cube_frag},equirect:{uniforms:{tEquirect:{value:null}},vertexShader:Ne.equirect_vert,fragmentShader:Ne.equirect_frag},distanceRGBA:{uniforms:xt([ue.common,ue.displacementmap,{referencePosition:{value:new q},nearDistance:{value:1},farDistance:{value:1e3}}]),vertexShader:Ne.distanceRGBA_vert,fragmentShader:Ne.distanceRGBA_frag},shadow:{uniforms:xt([ue.lights,ue.fog,{color:{value:new Ke(0)},opacity:{value:1}}]),vertexShader:Ne.shadow_vert,fragmentShader:Ne.shadow_frag}};Ot.physical={uniforms:xt([Ot.standard.uniforms,{clearcoat:{value:0},clearcoatMap:{value:null},clearcoatMapTransform:{value:new Ue},clearcoatNormalMap:{value:null},clearcoatNormalMapTransform:{value:new Ue},clearcoatNormalScale:{value:new qe(1,1)},clearcoatRoughness:{value:0},clearcoatRoughnessMap:{value:null},clearcoatRoughnessMapTransform:{value:new Ue},dispersion:{value:0},iridescence:{value:0},iridescenceMap:{value:null},iridescenceMapTransform:{value:new Ue},iridescenceIOR:{value:1.3},iridescenceThicknessMinimum:{value:100},iridescenceThicknessMaximum:{value:400},iridescenceThicknessMap:{value:null},iridescenceThicknessMapTransform:{value:new Ue},sheen:{value:0},sheenColor:{value:new Ke(0)},sheenColorMap:{value:null},sheenColorMapTransform:{value:new Ue},sheenRoughness:{value:1},sheenRoughnessMap:{value:null},sheenRoughnessMapTransform:{value:new Ue},transmission:{value:0},transmissionMap:{value:null},transmissionMapTransform:{value:new Ue},transmissionSamplerSize:{value:new qe},transmissionSamplerMap:{value:null},thickness:{value:0},thicknessMap:{value:null},thicknessMapTransform:{value:new Ue},attenuationDistance:{value:0},attenuationColor:{value:new Ke(0)},specularColor:{value:new Ke(1,1,1)},specularColorMap:{value:null},specularColorMapTransform:{value:new Ue},specularIntensity:{value:1},specularIntensityMap:{value:null},specularIntensityMapTransform:{value:new Ue},anisotropyVector:{value:new qe},anisotropyMap:{value:null},anisotropyMapTransform:{value:new Ue}}]),vertexShader:Ne.meshphysical_vert,fragmentShader:Ne.meshphysical_frag};const bi={r:0,b:0,g:0},un=new $t,Bc=new et;function Oc(i,e,t,n,r,s,a){const o=new Ke(0);let u=s===!0?0:1,f,c,p=null,m=0,g=null;function S(C){let R=C.isScene===!0?C.background:null;return R&&R.isTexture&&(R=(C.backgroundBlurriness>0?t:e).get(R)),R}function T(C){let R=!1;const z=S(C);z===null?d(o,u):z&&z.isColor&&(d(z,1),R=!0);const L=i.xr.getEnvironmentBlendMode();L==="additive"?n.buffers.color.setClear(0,0,0,1,a):L==="alpha-blend"&&n.buffers.color.setClear(0,0,0,0,a),(i.autoClear||R)&&(n.buffers.depth.setTest(!0),n.buffers.depth.setMask(!0),n.buffers.color.setMask(!0),i.clear(i.autoClearColor,i.autoClearDepth,i.autoClearStencil))}function _(C,R){const z=S(R);z&&(z.isCubeTexture||z.mapping===306)?(c===void 0&&(c=new Nt(new ni(1,1,1),new nn({name:"BackgroundCubeMaterial",uniforms:Bn(Ot.backgroundCube.uniforms),vertexShader:Ot.backgroundCube.vertexShader,fragmentShader:Ot.backgroundCube.fragmentShader,side:1,depthTest:!1,depthWrite:!1,fog:!1,allowOverride:!1})),c.geometry.deleteAttribute("normal"),c.geometry.deleteAttribute("uv"),c.onBeforeRender=function(L,F,G){this.matrixWorld.copyPosition(G.matrixWorld)},Object.defineProperty(c.material,"envMap",{get:function(){return this.uniforms.envMap.value}}),r.update(c)),un.copy(R.backgroundRotation),un.x*=-1,un.y*=-1,un.z*=-1,z.isCubeTexture&&z.isRenderTargetTexture===!1&&(un.y*=-1,un.z*=-1),c.material.uniforms.envMap.value=z,c.material.uniforms.flipEnvMap.value=z.isCubeTexture&&z.isRenderTargetTexture===!1?-1:1,c.material.uniforms.backgroundBlurriness.value=R.backgroundBlurriness,c.material.uniforms.backgroundIntensity.value=R.backgroundIntensity,c.material.uniforms.backgroundRotation.value.setFromMatrix4(Bc.makeRotationFromEuler(un)),c.material.toneMapped=ke.getTransfer(z.colorSpace)!==je,(p!==z||m!==z.version||g!==i.toneMapping)&&(c.material.needsUpdate=!0,p=z,m=z.version,g=i.toneMapping),c.layers.enableAll(),C.unshift(c,c.geometry,c.material,0,0,null)):z&&z.isTexture&&(f===void 0&&(f=new Nt(new Ii(2,2),new nn({name:"BackgroundMaterial",uniforms:Bn(Ot.background.uniforms),vertexShader:Ot.background.vertexShader,fragmentShader:Ot.background.fragmentShader,side:0,depthTest:!1,depthWrite:!1,fog:!1,allowOverride:!1})),f.geometry.deleteAttribute("normal"),Object.defineProperty(f.material,"map",{get:function(){return this.uniforms.t2D.value}}),r.update(f)),f.material.uniforms.t2D.value=z,f.material.uniforms.backgroundIntensity.value=R.backgroundIntensity,f.material.toneMapped=ke.getTransfer(z.colorSpace)!==je,z.matrixAutoUpdate===!0&&z.updateMatrix(),f.material.uniforms.uvTransform.value.copy(z.matrix),(p!==z||m!==z.version||g!==i.toneMapping)&&(f.material.needsUpdate=!0,p=z,m=z.version,g=i.toneMapping),f.layers.enableAll(),C.unshift(f,f.geometry,f.material,0,0,null))}function d(C,R){C.getRGB(bi,Ls(i)),n.buffers.color.setClear(bi.r,bi.g,bi.b,R,a)}function U(){c!==void 0&&(c.geometry.dispose(),c.material.dispose(),c=void 0),f!==void 0&&(f.geometry.dispose(),f.material.dispose(),f=void 0)}return{getClearColor:function(){return o},setClearColor:function(C,R=1){o.set(C),u=R,d(o,u)},getClearAlpha:function(){return u},setClearAlpha:function(C){u=C,d(o,u)},render:T,addToRenderList:_,dispose:U}}function Gc(i,e){const t=i.getParameter(i.MAX_VERTEX_ATTRIBS),n={},r=m(null);let s=r,a=!1;function o(y,N,ee,Y,Q){let ie=!1;const j=p(Y,ee,N);s!==j&&(s=j,f(s.object)),ie=g(y,Y,ee,Q),ie&&S(y,Y,ee,Q),Q!==null&&e.update(Q,i.ELEMENT_ARRAY_BUFFER),(ie||a)&&(a=!1,R(y,N,ee,Y),Q!==null&&i.bindBuffer(i.ELEMENT_ARRAY_BUFFER,e.get(Q).buffer))}function u(){return i.createVertexArray()}function f(y){return i.bindVertexArray(y)}function c(y){return i.deleteVertexArray(y)}function p(y,N,ee){const Y=ee.wireframe===!0;let Q=n[y.id];Q===void 0&&(Q={},n[y.id]=Q);let ie=Q[N.id];ie===void 0&&(ie={},Q[N.id]=ie);let j=ie[Y];return j===void 0&&(j=m(u()),ie[Y]=j),j}function m(y){const N=[],ee=[],Y=[];for(let Q=0;Q<t;Q++)N[Q]=0,ee[Q]=0,Y[Q]=0;return{geometry:null,program:null,wireframe:!1,newAttributes:N,enabledAttributes:ee,attributeDivisors:Y,object:y,attributes:{},index:null}}function g(y,N,ee,Y){const Q=s.attributes,ie=N.attributes;let j=0;const oe=ee.getAttributes();for(const K in oe)if(oe[K].location>=0){const _e=Q[K];let Ee=ie[K];if(Ee===void 0&&(K==="instanceMatrix"&&y.instanceMatrix&&(Ee=y.instanceMatrix),K==="instanceColor"&&y.instanceColor&&(Ee=y.instanceColor)),_e===void 0||_e.attribute!==Ee||Ee&&_e.data!==Ee.data)return!0;j++}return s.attributesNum!==j||s.index!==Y}function S(y,N,ee,Y){const Q={},ie=N.attributes;let j=0;const oe=ee.getAttributes();for(const K in oe)if(oe[K].location>=0){let _e=ie[K];_e===void 0&&(K==="instanceMatrix"&&y.instanceMatrix&&(_e=y.instanceMatrix),K==="instanceColor"&&y.instanceColor&&(_e=y.instanceColor));const Ee={};Ee.attribute=_e,_e&&_e.data&&(Ee.data=_e.data),Q[K]=Ee,j++}s.attributes=Q,s.attributesNum=j,s.index=Y}function T(){const y=s.newAttributes;for(let N=0,ee=y.length;N<ee;N++)y[N]=0}function _(y){d(y,0)}function d(y,N){const ee=s.newAttributes,Y=s.enabledAttributes,Q=s.attributeDivisors;ee[y]=1,Y[y]===0&&(i.enableVertexAttribArray(y),Y[y]=1),Q[y]!==N&&(i.vertexAttribDivisor(y,N),Q[y]=N)}function U(){const y=s.newAttributes,N=s.enabledAttributes;for(let ee=0,Y=N.length;ee<Y;ee++)N[ee]!==y[ee]&&(i.disableVertexAttribArray(ee),N[ee]=0)}function C(y,N,ee,Y,Q,ie,j){j===!0?i.vertexAttribIPointer(y,N,ee,Q,ie):i.vertexAttribPointer(y,N,ee,Y,Q,ie)}function R(y,N,ee,Y){T();const Q=Y.attributes,ie=ee.getAttributes(),j=N.defaultAttributeValues;for(const oe in ie){const K=ie[oe];if(K.location>=0){let fe=Q[oe];if(fe===void 0&&(oe==="instanceMatrix"&&y.instanceMatrix&&(fe=y.instanceMatrix),oe==="instanceColor"&&y.instanceColor&&(fe=y.instanceColor)),fe!==void 0){const _e=fe.normalized,Ee=fe.itemSize,Be=e.get(fe);if(Be===void 0)continue;const Ye=Be.buffer,$=Be.type,re=Be.bytesPerElement,ve=$===i.INT||$===i.UNSIGNED_INT||fe.gpuType===1013;if(fe.isInterleavedBufferAttribute){const he=fe.data,Te=he.stride,ze=fe.offset;if(he.isInstancedInterleavedBuffer){for(let we=0;we<K.locationSize;we++)d(K.location+we,he.meshPerAttribute);y.isInstancedMesh!==!0&&Y._maxInstanceCount===void 0&&(Y._maxInstanceCount=he.meshPerAttribute*he.count)}else for(let we=0;we<K.locationSize;we++)_(K.location+we);i.bindBuffer(i.ARRAY_BUFFER,Ye);for(let we=0;we<K.locationSize;we++)C(K.location+we,Ee/K.locationSize,$,_e,Te*re,(ze+Ee/K.locationSize*we)*re,ve)}else{if(fe.isInstancedBufferAttribute){for(let he=0;he<K.locationSize;he++)d(K.location+he,fe.meshPerAttribute);y.isInstancedMesh!==!0&&Y._maxInstanceCount===void 0&&(Y._maxInstanceCount=fe.meshPerAttribute*fe.count)}else for(let he=0;he<K.locationSize;he++)_(K.location+he);i.bindBuffer(i.ARRAY_BUFFER,Ye);for(let he=0;he<K.locationSize;he++)C(K.location+he,Ee/K.locationSize,$,_e,Ee*re,Ee/K.locationSize*he*re,ve)}}else if(j!==void 0){const _e=j[oe];if(_e!==void 0)switch(_e.length){case 2:i.vertexAttrib2fv(K.location,_e);break;case 3:i.vertexAttrib3fv(K.location,_e);break;case 4:i.vertexAttrib4fv(K.location,_e);break;default:i.vertexAttrib1fv(K.location,_e)}}}}U()}function z(){G();for(const y in n){const N=n[y];for(const ee in N){const Y=N[ee];for(const Q in Y)c(Y[Q].object),delete Y[Q];delete N[ee]}delete n[y]}}function L(y){if(n[y.id]===void 0)return;const N=n[y.id];for(const ee in N){const Y=N[ee];for(const Q in Y)c(Y[Q].object),delete Y[Q];delete N[ee]}delete n[y.id]}function F(y){for(const N in n){const ee=n[N];if(ee[y.id]===void 0)continue;const Y=ee[y.id];for(const Q in Y)c(Y[Q].object),delete Y[Q];delete ee[y.id]}}function G(){A(),a=!0,s!==r&&(s=r,f(s.object))}function A(){r.geometry=null,r.program=null,r.wireframe=!1}return{setup:o,reset:G,resetDefaultState:A,dispose:z,releaseStatesOfGeometry:L,releaseStatesOfProgram:F,initAttributes:T,enableAttribute:_,disableUnusedAttributes:U}}function zc(i,e,t){let n;function r(f){n=f}function s(f,c){i.drawArrays(n,f,c),t.update(c,n,1)}function a(f,c,p){p!==0&&(i.drawArraysInstanced(n,f,c,p),t.update(c,n,p))}function o(f,c,p){if(p===0)return;e.get("WEBGL_multi_draw").multiDrawArraysWEBGL(n,f,0,c,0,p);let g=0;for(let S=0;S<p;S++)g+=c[S];t.update(g,n,1)}function u(f,c,p,m){if(p===0)return;const g=e.get("WEBGL_multi_draw");if(g===null)for(let S=0;S<f.length;S++)a(f[S],c[S],m[S]);else{g.multiDrawArraysInstancedWEBGL(n,f,0,c,0,m,0,p);let S=0;for(let T=0;T<p;T++)S+=c[T]*m[T];t.update(S,n,1)}}this.setMode=r,this.render=s,this.renderInstances=a,this.renderMultiDraw=o,this.renderMultiDrawInstances=u}function Vc(i,e,t,n){let r;function s(){if(r!==void 0)return r;if(e.has("EXT_texture_filter_anisotropic")===!0){const F=e.get("EXT_texture_filter_anisotropic");r=i.getParameter(F.MAX_TEXTURE_MAX_ANISOTROPY_EXT)}else r=0;return r}function a(F){return!(F!==1023&&n.convert(F)!==i.getParameter(i.IMPLEMENTATION_COLOR_READ_FORMAT))}function o(F){const G=F===1016&&(e.has("EXT_color_buffer_half_float")||e.has("EXT_color_buffer_float"));return!(F!==1009&&n.convert(F)!==i.getParameter(i.IMPLEMENTATION_COLOR_READ_TYPE)&&F!==1015&&!G)}function u(F){if(F==="highp"){if(i.getShaderPrecisionFormat(i.VERTEX_SHADER,i.HIGH_FLOAT).precision>0&&i.getShaderPrecisionFormat(i.FRAGMENT_SHADER,i.HIGH_FLOAT).precision>0)return"highp";F="mediump"}return F==="mediump"&&i.getShaderPrecisionFormat(i.VERTEX_SHADER,i.MEDIUM_FLOAT).precision>0&&i.getShaderPrecisionFormat(i.FRAGMENT_SHADER,i.MEDIUM_FLOAT).precision>0?"mediump":"lowp"}let f=t.precision!==void 0?t.precision:"highp";const c=u(f);c!==f&&(console.warn("THREE.WebGLRenderer:",f,"not supported, using",c,"instead."),f=c);const p=t.logarithmicDepthBuffer===!0,m=t.reverseDepthBuffer===!0&&e.has("EXT_clip_control"),g=i.getParameter(i.MAX_TEXTURE_IMAGE_UNITS),S=i.getParameter(i.MAX_VERTEX_TEXTURE_IMAGE_UNITS),T=i.getParameter(i.MAX_TEXTURE_SIZE),_=i.getParameter(i.MAX_CUBE_MAP_TEXTURE_SIZE),d=i.getParameter(i.MAX_VERTEX_ATTRIBS),U=i.getParameter(i.MAX_VERTEX_UNIFORM_VECTORS),C=i.getParameter(i.MAX_VARYING_VECTORS),R=i.getParameter(i.MAX_FRAGMENT_UNIFORM_VECTORS),z=S>0,L=i.getParameter(i.MAX_SAMPLES);return{isWebGL2:!0,getMaxAnisotropy:s,getMaxPrecision:u,textureFormatReadable:a,textureTypeReadable:o,precision:f,logarithmicDepthBuffer:p,reverseDepthBuffer:m,maxTextures:g,maxVertexTextures:S,maxTextureSize:T,maxCubemapSize:_,maxAttributes:d,maxVertexUniforms:U,maxVaryings:C,maxFragmentUniforms:R,vertexTextures:z,maxSamples:L}}function Hc(i){const e=this;let t=null,n=0,r=!1,s=!1;const a=new fn,o=new Ue,u={value:null,needsUpdate:!1};this.uniform=u,this.numPlanes=0,this.numIntersection=0,this.init=function(p,m){const g=p.length!==0||m||n!==0||r;return r=m,n=p.length,g},this.beginShadows=function(){s=!0,c(null)},this.endShadows=function(){s=!1},this.setGlobalState=function(p,m){t=c(p,m,0)},this.setState=function(p,m,g){const S=p.clippingPlanes,T=p.clipIntersection,_=p.clipShadows,d=i.get(p);if(!r||S===null||S.length===0||s&&!_)s?c(null):f();else{const U=s?0:n,C=U*4;let R=d.clippingState||null;u.value=R,R=c(S,m,C,g);for(let z=0;z!==C;++z)R[z]=t[z];d.clippingState=R,this.numIntersection=T?this.numPlanes:0,this.numPlanes+=U}};function f(){u.value!==t&&(u.value=t,u.needsUpdate=n>0),e.numPlanes=n,e.numIntersection=0}function c(p,m,g,S){const T=p!==null?p.length:0;let _=null;if(T!==0){if(_=u.value,S!==!0||_===null){const d=g+T*4,U=m.matrixWorldInverse;o.getNormalMatrix(U),(_===null||_.length<d)&&(_=new Float32Array(d));for(let C=0,R=g;C!==T;++C,R+=4)a.copy(p[C]).applyMatrix4(U,o),a.normal.toArray(_,R),_[R+3]=a.constant}u.value=_,u.needsUpdate=!0}return e.numPlanes=T,e.numIntersection=0,_}}function kc(i){let e=new WeakMap;function t(a,o){return o===303?a.mapping=301:o===304&&(a.mapping=302),a}function n(a){if(a&&a.isTexture){const o=a.mapping;if(o===303||o===304)if(e.has(a)){const u=e.get(a).texture;return t(u,a.mapping)}else{const u=a.image;if(u&&u.height>0){const f=new Ha(u.height);return f.fromEquirectangularTexture(i,a),e.set(a,f),a.addEventListener("dispose",r),t(f.texture,a.mapping)}else return null}}return a}function r(a){const o=a.target;o.removeEventListener("dispose",r);const u=e.get(o);u!==void 0&&(e.delete(o),u.dispose())}function s(){e=new WeakMap}return{get:n,dispose:s}}const Ln=4,rs=[.125,.215,.35,.446,.526,.582],pn=20,rr=new Gs,ss=new Ke;let sr=null,ar=0,or=0,lr=!1;const dn=(1+Math.sqrt(5))/2,Dn=1/dn,as=[new q(-dn,Dn,0),new q(dn,Dn,0),new q(-Dn,0,dn),new q(Dn,0,dn),new q(0,dn,-Dn),new q(0,dn,Dn),new q(-1,1,-1),new q(1,1,-1),new q(-1,1,1),new q(1,1,1)],Wc=new q;class os{constructor(e){this._renderer=e,this._pingPongRenderTarget=null,this._lodMax=0,this._cubeSize=0,this._lodPlanes=[],this._sizeLods=[],this._sigmas=[],this._blurMaterial=null,this._cubemapMaterial=null,this._equirectMaterial=null,this._compileMaterial(this._blurMaterial)}fromScene(e,t=0,n=.1,r=100,s={}){const{size:a=256,position:o=Wc}=s;sr=this._renderer.getRenderTarget(),ar=this._renderer.getActiveCubeFace(),or=this._renderer.getActiveMipmapLevel(),lr=this._renderer.xr.enabled,this._renderer.xr.enabled=!1,this._setSize(a);const u=this._allocateTargets();return u.depthBuffer=!0,this._sceneToCubeUV(e,n,r,u,o),t>0&&this._blur(u,0,0,t),this._applyPMREM(u),this._cleanup(u),u}fromEquirectangular(e,t=null){return this._fromTexture(e,t)}fromCubemap(e,t=null){return this._fromTexture(e,t)}compileCubemapShader(){this._cubemapMaterial===null&&(this._cubemapMaterial=us(),this._compileMaterial(this._cubemapMaterial))}compileEquirectangularShader(){this._equirectMaterial===null&&(this._equirectMaterial=cs(),this._compileMaterial(this._equirectMaterial))}dispose(){this._dispose(),this._cubemapMaterial!==null&&this._cubemapMaterial.dispose(),this._equirectMaterial!==null&&this._equirectMaterial.dispose()}_setSize(e){this._lodMax=Math.floor(Math.log2(e)),this._cubeSize=Math.pow(2,this._lodMax)}_dispose(){this._blurMaterial!==null&&this._blurMaterial.dispose(),this._pingPongRenderTarget!==null&&this._pingPongRenderTarget.dispose();for(let e=0;e<this._lodPlanes.length;e++)this._lodPlanes[e].dispose()}_cleanup(e){this._renderer.setRenderTarget(sr,ar,or),this._renderer.xr.enabled=lr,e.scissorTest=!1,Ri(e,0,0,e.width,e.height)}_fromTexture(e,t){e.mapping===301||e.mapping===302?this._setSize(e.image.length===0?16:e.image[0].width||e.image[0].image.width):this._setSize(e.image.width/4),sr=this._renderer.getRenderTarget(),ar=this._renderer.getActiveCubeFace(),or=this._renderer.getActiveMipmapLevel(),lr=this._renderer.xr.enabled,this._renderer.xr.enabled=!1;const n=t||this._allocateTargets();return this._textureToCubeUV(e,n),this._applyPMREM(n),this._cleanup(n),n}_allocateTargets(){const e=3*Math.max(this._cubeSize,112),t=4*this._cubeSize,n={magFilter:1006,minFilter:1006,generateMipmaps:!1,type:1016,format:1023,colorSpace:Nn,depthBuffer:!1},r=ls(e,t,n);if(this._pingPongRenderTarget===null||this._pingPongRenderTarget.width!==e||this._pingPongRenderTarget.height!==t){this._pingPongRenderTarget!==null&&this._dispose(),this._pingPongRenderTarget=ls(e,t,n);const{_lodMax:s}=this;({sizeLods:this._sizeLods,lodPlanes:this._lodPlanes,sigmas:this._sigmas}=Xc(s)),this._blurMaterial=qc(s,e,t)}return r}_compileMaterial(e){const t=new Nt(this._lodPlanes[0],e);this._renderer.compile(t,rr)}_sceneToCubeUV(e,t,n,r,s){const u=new Lt(90,1,t,n),f=[1,-1,1,1,1,1],c=[1,1,1,-1,-1,-1],p=this._renderer,m=p.autoClear,g=p.toneMapping;p.getClearColor(ss),p.toneMapping=0,p.autoClear=!1;const S=new Ds({name:"PMREM.Background",side:1,depthWrite:!1,depthTest:!1}),T=new Nt(new ni,S);let _=!1;const d=e.background;d?d.isColor&&(S.color.copy(d),e.background=null,_=!0):(S.color.copy(ss),_=!0);for(let U=0;U<6;U++){const C=U%3;C===0?(u.up.set(0,f[U],0),u.position.set(s.x,s.y,s.z),u.lookAt(s.x+c[U],s.y,s.z)):C===1?(u.up.set(0,0,f[U]),u.position.set(s.x,s.y,s.z),u.lookAt(s.x,s.y+c[U],s.z)):(u.up.set(0,f[U],0),u.position.set(s.x,s.y,s.z),u.lookAt(s.x,s.y,s.z+c[U]));const R=this._cubeSize;Ri(r,C*R,U>2?R:0,R,R),p.setRenderTarget(r),_&&p.render(T,u),p.render(e,u)}T.geometry.dispose(),T.material.dispose(),p.toneMapping=g,p.autoClear=m,e.background=d}_textureToCubeUV(e,t){const n=this._renderer,r=e.mapping===301||e.mapping===302;r?(this._cubemapMaterial===null&&(this._cubemapMaterial=us()),this._cubemapMaterial.uniforms.flipEnvMap.value=e.isRenderTargetTexture===!1?-1:1):this._equirectMaterial===null&&(this._equirectMaterial=cs());const s=r?this._cubemapMaterial:this._equirectMaterial,a=new Nt(this._lodPlanes[0],s),o=s.uniforms;o.envMap.value=e;const u=this._cubeSize;Ri(t,0,0,3*u,2*u),n.setRenderTarget(t),n.render(a,rr)}_applyPMREM(e){const t=this._renderer,n=t.autoClear;t.autoClear=!1;const r=this._lodPlanes.length;for(let s=1;s<r;s++){const a=Math.sqrt(this._sigmas[s]*this._sigmas[s]-this._sigmas[s-1]*this._sigmas[s-1]),o=as[(r-s-1)%as.length];this._blur(e,s-1,s,a,o)}t.autoClear=n}_blur(e,t,n,r,s){const a=this._pingPongRenderTarget;this._halfBlur(e,a,t,n,r,"latitudinal",s),this._halfBlur(a,e,n,n,r,"longitudinal",s)}_halfBlur(e,t,n,r,s,a,o){const u=this._renderer,f=this._blurMaterial;a!=="latitudinal"&&a!=="longitudinal"&&console.error("blur direction must be either latitudinal or longitudinal!");const c=3,p=new Nt(this._lodPlanes[r],f),m=f.uniforms,g=this._sizeLods[n]-1,S=isFinite(s)?Math.PI/(2*g):2*Math.PI/(2*pn-1),T=s/S,_=isFinite(s)?1+Math.floor(c*T):pn;_>pn&&console.warn(`sigmaRadians, ${s}, is too large and will clip, as it requested ${_} samples when the maximum is set to ${pn}`);const d=[];let U=0;for(let F=0;F<pn;++F){const G=F/T,A=Math.exp(-G*G/2);d.push(A),F===0?U+=A:F<_&&(U+=2*A)}for(let F=0;F<d.length;F++)d[F]=d[F]/U;m.envMap.value=e.texture,m.samples.value=_,m.weights.value=d,m.latitudinal.value=a==="latitudinal",o&&(m.poleAxis.value=o);const{_lodMax:C}=this;m.dTheta.value=S,m.mipInt.value=C-n;const R=this._sizeLods[r],z=3*R*(r>C-Ln?r-C+Ln:0),L=4*(this._cubeSize-R);Ri(t,z,L,3*R,2*R),u.setRenderTarget(t),u.render(p,rr)}}function Xc(i){const e=[],t=[],n=[];let r=i;const s=i-Ln+1+rs.length;for(let a=0;a<s;a++){const o=Math.pow(2,r);t.push(o);let u=1/o;a>i-Ln?u=rs[a-i+Ln-1]:a===0&&(u=0),n.push(u);const f=1/(o-2),c=-f,p=1+f,m=[c,c,p,c,p,p,c,c,p,p,c,p],g=6,S=6,T=3,_=2,d=1,U=new Float32Array(T*S*g),C=new Float32Array(_*S*g),R=new Float32Array(d*S*g);for(let L=0;L<g;L++){const F=L%3*2/3-1,G=L>2?0:-1,A=[F,G,0,F+2/3,G,0,F+2/3,G+1,0,F,G,0,F+2/3,G+1,0,F,G+1,0];U.set(A,T*S*L),C.set(m,_*S*L);const y=[L,L,L,L,L,L];R.set(y,d*S*L)}const z=new Kt;z.setAttribute("position",new Bt(U,T)),z.setAttribute("uv",new Bt(C,_)),z.setAttribute("faceIndex",new Bt(R,d)),e.push(z),r>Ln&&r--}return{lodPlanes:e,sizeLods:t,sigmas:n}}function ls(i,e,t){const n=new mn(i,e,t);return n.texture.mapping=306,n.texture.name="PMREM.cubeUv",n.scissorTest=!0,n}function Ri(i,e,t,n,r){i.viewport.set(e,t,n,r),i.scissor.set(e,t,n,r)}function qc(i,e,t){const n=new Float32Array(pn),r=new q(0,1,0);return new nn({name:"SphericalGaussianBlur",defines:{n:pn,CUBEUV_TEXEL_WIDTH:1/e,CUBEUV_TEXEL_HEIGHT:1/t,CUBEUV_MAX_MIP:`${i}.0`},uniforms:{envMap:{value:null},samples:{value:1},weights:{value:n},latitudinal:{value:!1},dTheta:{value:0},mipInt:{value:0},poleAxis:{value:r}},vertexShader:vr(),fragmentShader:`

			precision mediump float;
			precision mediump int;

			varying vec3 vOutputDirection;

			uniform sampler2D envMap;
			uniform int samples;
			uniform float weights[ n ];
			uniform bool latitudinal;
			uniform float dTheta;
			uniform float mipInt;
			uniform vec3 poleAxis;

			#define ENVMAP_TYPE_CUBE_UV
			#include <cube_uv_reflection_fragment>

			vec3 getSample( float theta, vec3 axis ) {

				float cosTheta = cos( theta );
				// Rodrigues' axis-angle rotation
				vec3 sampleDirection = vOutputDirection * cosTheta
					+ cross( axis, vOutputDirection ) * sin( theta )
					+ axis * dot( axis, vOutputDirection ) * ( 1.0 - cosTheta );

				return bilinearCubeUV( envMap, sampleDirection, mipInt );

			}

			void main() {

				vec3 axis = latitudinal ? poleAxis : cross( poleAxis, vOutputDirection );

				if ( all( equal( axis, vec3( 0.0 ) ) ) ) {

					axis = vec3( vOutputDirection.z, 0.0, - vOutputDirection.x );

				}

				axis = normalize( axis );

				gl_FragColor = vec4( 0.0, 0.0, 0.0, 1.0 );
				gl_FragColor.rgb += weights[ 0 ] * getSample( 0.0, axis );

				for ( int i = 1; i < n; i++ ) {

					if ( i >= samples ) {

						break;

					}

					float theta = dTheta * float( i );
					gl_FragColor.rgb += weights[ i ] * getSample( -1.0 * theta, axis );
					gl_FragColor.rgb += weights[ i ] * getSample( theta, axis );

				}

			}
		`,blending:0,depthTest:!1,depthWrite:!1})}function cs(){return new nn({name:"EquirectangularToCubeUV",uniforms:{envMap:{value:null}},vertexShader:vr(),fragmentShader:`

			precision mediump float;
			precision mediump int;

			varying vec3 vOutputDirection;

			uniform sampler2D envMap;

			#include <common>

			void main() {

				vec3 outputDirection = normalize( vOutputDirection );
				vec2 uv = equirectUv( outputDirection );

				gl_FragColor = vec4( texture2D ( envMap, uv ).rgb, 1.0 );

			}
		`,blending:0,depthTest:!1,depthWrite:!1})}function us(){return new nn({name:"CubemapToCubeUV",uniforms:{envMap:{value:null},flipEnvMap:{value:-1}},vertexShader:vr(),fragmentShader:`

			precision mediump float;
			precision mediump int;

			uniform float flipEnvMap;

			varying vec3 vOutputDirection;

			uniform samplerCube envMap;

			void main() {

				gl_FragColor = textureCube( envMap, vec3( flipEnvMap * vOutputDirection.x, vOutputDirection.yz ) );

			}
		`,blending:0,depthTest:!1,depthWrite:!1})}function vr(){return`

		precision mediump float;
		precision mediump int;

		attribute float faceIndex;

		varying vec3 vOutputDirection;

		// RH coordinate system; PMREM face-indexing convention
		vec3 getDirection( vec2 uv, float face ) {

			uv = 2.0 * uv - 1.0;

			vec3 direction = vec3( uv, 1.0 );

			if ( face == 0.0 ) {

				direction = direction.zyx; // ( 1, v, u ) pos x

			} else if ( face == 1.0 ) {

				direction = direction.xzy;
				direction.xz *= -1.0; // ( -u, 1, -v ) pos y

			} else if ( face == 2.0 ) {

				direction.x *= -1.0; // ( -u, v, 1 ) pos z

			} else if ( face == 3.0 ) {

				direction = direction.zyx;
				direction.xz *= -1.0; // ( -1, v, -u ) neg x

			} else if ( face == 4.0 ) {

				direction = direction.xzy;
				direction.xy *= -1.0; // ( -u, -1, v ) neg y

			} else if ( face == 5.0 ) {

				direction.z *= -1.0; // ( u, v, -1 ) neg z

			}

			return direction;

		}

		void main() {

			vOutputDirection = getDirection( uv, faceIndex );
			gl_Position = vec4( position, 1.0 );

		}
	`}function Yc(i){let e=new WeakMap,t=null;function n(o){if(o&&o.isTexture){const u=o.mapping,f=u===303||u===304,c=u===301||u===302;if(f||c){let p=e.get(o);const m=p!==void 0?p.texture.pmremVersion:0;if(o.isRenderTargetTexture&&o.pmremVersion!==m)return t===null&&(t=new os(i)),p=f?t.fromEquirectangular(o,p):t.fromCubemap(o,p),p.texture.pmremVersion=o.pmremVersion,e.set(o,p),p.texture;if(p!==void 0)return p.texture;{const g=o.image;return f&&g&&g.height>0||c&&g&&r(g)?(t===null&&(t=new os(i)),p=f?t.fromEquirectangular(o):t.fromCubemap(o),p.texture.pmremVersion=o.pmremVersion,e.set(o,p),o.addEventListener("dispose",s),p.texture):null}}}return o}function r(o){let u=0;const f=6;for(let c=0;c<f;c++)o[c]!==void 0&&u++;return u===f}function s(o){const u=o.target;u.removeEventListener("dispose",s);const f=e.get(u);f!==void 0&&(e.delete(u),f.dispose())}function a(){e=new WeakMap,t!==null&&(t.dispose(),t=null)}return{get:n,dispose:a}}function $c(i){const e={};function t(n){if(e[n]!==void 0)return e[n];let r;switch(n){case"WEBGL_depth_texture":r=i.getExtension("WEBGL_depth_texture")||i.getExtension("MOZ_WEBGL_depth_texture")||i.getExtension("WEBKIT_WEBGL_depth_texture");break;case"EXT_texture_filter_anisotropic":r=i.getExtension("EXT_texture_filter_anisotropic")||i.getExtension("MOZ_EXT_texture_filter_anisotropic")||i.getExtension("WEBKIT_EXT_texture_filter_anisotropic");break;case"WEBGL_compressed_texture_s3tc":r=i.getExtension("WEBGL_compressed_texture_s3tc")||i.getExtension("MOZ_WEBGL_compressed_texture_s3tc")||i.getExtension("WEBKIT_WEBGL_compressed_texture_s3tc");break;case"WEBGL_compressed_texture_pvrtc":r=i.getExtension("WEBGL_compressed_texture_pvrtc")||i.getExtension("WEBKIT_WEBGL_compressed_texture_pvrtc");break;default:r=i.getExtension(n)}return e[n]=r,r}return{has:function(n){return t(n)!==null},init:function(){t("EXT_color_buffer_float"),t("WEBGL_clip_cull_distance"),t("OES_texture_float_linear"),t("EXT_color_buffer_half_float"),t("WEBGL_multisampled_render_to_texture"),t("WEBGL_render_shared_exponent")},get:function(n){const r=t(n);return r===null&&Ci("THREE.WebGLRenderer: "+n+" extension not supported."),r}}}function Kc(i,e,t,n){const r={},s=new WeakMap;function a(p){const m=p.target;m.index!==null&&e.remove(m.index);for(const S in m.attributes)e.remove(m.attributes[S]);m.removeEventListener("dispose",a),delete r[m.id];const g=s.get(m);g&&(e.remove(g),s.delete(m)),n.releaseStatesOfGeometry(m),m.isInstancedBufferGeometry===!0&&delete m._maxInstanceCount,t.memory.geometries--}function o(p,m){return r[m.id]===!0||(m.addEventListener("dispose",a),r[m.id]=!0,t.memory.geometries++),m}function u(p){const m=p.attributes;for(const g in m)e.update(m[g],i.ARRAY_BUFFER)}function f(p){const m=[],g=p.index,S=p.attributes.position;let T=0;if(g!==null){const U=g.array;T=g.version;for(let C=0,R=U.length;C<R;C+=3){const z=U[C+0],L=U[C+1],F=U[C+2];m.push(z,L,L,F,F,z)}}else if(S!==void 0){const U=S.array;T=S.version;for(let C=0,R=U.length/3-1;C<R;C+=3){const z=C+0,L=C+1,F=C+2;m.push(z,L,L,F,F,z)}}else return;const _=new(ws(m)?Us:Is)(m,1);_.version=T;const d=s.get(p);d&&e.remove(d),s.set(p,_)}function c(p){const m=s.get(p);if(m){const g=p.index;g!==null&&m.version<g.version&&f(p)}else f(p);return s.get(p)}return{get:o,update:u,getWireframeAttribute:c}}function Zc(i,e,t){let n;function r(m){n=m}let s,a;function o(m){s=m.type,a=m.bytesPerElement}function u(m,g){i.drawElements(n,g,s,m*a),t.update(g,n,1)}function f(m,g,S){S!==0&&(i.drawElementsInstanced(n,g,s,m*a,S),t.update(g,n,S))}function c(m,g,S){if(S===0)return;e.get("WEBGL_multi_draw").multiDrawElementsWEBGL(n,g,0,s,m,0,S);let _=0;for(let d=0;d<S;d++)_+=g[d];t.update(_,n,1)}function p(m,g,S,T){if(S===0)return;const _=e.get("WEBGL_multi_draw");if(_===null)for(let d=0;d<m.length;d++)f(m[d]/a,g[d],T[d]);else{_.multiDrawElementsInstancedWEBGL(n,g,0,s,m,0,T,0,S);let d=0;for(let U=0;U<S;U++)d+=g[U]*T[U];t.update(d,n,1)}}this.setMode=r,this.setIndex=o,this.render=u,this.renderInstances=f,this.renderMultiDraw=c,this.renderMultiDrawInstances=p}function jc(i){const e={geometries:0,textures:0},t={frame:0,calls:0,triangles:0,points:0,lines:0};function n(s,a,o){switch(t.calls++,a){case i.TRIANGLES:t.triangles+=o*(s/3);break;case i.LINES:t.lines+=o*(s/2);break;case i.LINE_STRIP:t.lines+=o*(s-1);break;case i.LINE_LOOP:t.lines+=o*s;break;case i.POINTS:t.points+=o*s;break;default:console.error("THREE.WebGLInfo: Unknown draw mode:",a);break}}function r(){t.calls=0,t.triangles=0,t.points=0,t.lines=0}return{memory:e,render:t,programs:null,autoReset:!0,reset:r,update:n}}function Jc(i,e,t){const n=new WeakMap,r=new rt;function s(a,o,u){const f=a.morphTargetInfluences,c=o.morphAttributes.position||o.morphAttributes.normal||o.morphAttributes.color,p=c!==void 0?c.length:0;let m=n.get(o);if(m===void 0||m.count!==p){let A=function(){F.dispose(),n.delete(o),o.removeEventListener("dispose",A)};m!==void 0&&m.texture.dispose();const g=o.morphAttributes.position!==void 0,S=o.morphAttributes.normal!==void 0,T=o.morphAttributes.color!==void 0,_=o.morphAttributes.position||[],d=o.morphAttributes.normal||[],U=o.morphAttributes.color||[];let C=0;g===!0&&(C=1),S===!0&&(C=2),T===!0&&(C=3);let R=o.attributes.position.count*C,z=1;R>e.maxTextureSize&&(z=Math.ceil(R/e.maxTextureSize),R=e.maxTextureSize);const L=new Float32Array(R*z*4*p),F=new Cs(L,R,z,p);F.type=1015,F.needsUpdate=!0;const G=C*4;for(let y=0;y<p;y++){const N=_[y],ee=d[y],Y=U[y],Q=R*z*4*y;for(let ie=0;ie<N.count;ie++){const j=ie*G;g===!0&&(r.fromBufferAttribute(N,ie),L[Q+j+0]=r.x,L[Q+j+1]=r.y,L[Q+j+2]=r.z,L[Q+j+3]=0),S===!0&&(r.fromBufferAttribute(ee,ie),L[Q+j+4]=r.x,L[Q+j+5]=r.y,L[Q+j+6]=r.z,L[Q+j+7]=0),T===!0&&(r.fromBufferAttribute(Y,ie),L[Q+j+8]=r.x,L[Q+j+9]=r.y,L[Q+j+10]=r.z,L[Q+j+11]=Y.itemSize===4?r.w:1)}}m={count:p,texture:F,size:new qe(R,z)},n.set(o,m),o.addEventListener("dispose",A)}if(a.isInstancedMesh===!0&&a.morphTexture!==null)u.getUniforms().setValue(i,"morphTexture",a.morphTexture,t);else{let g=0;for(let T=0;T<f.length;T++)g+=f[T];const S=o.morphTargetsRelative?1:1-g;u.getUniforms().setValue(i,"morphTargetBaseInfluence",S),u.getUniforms().setValue(i,"morphTargetInfluences",f)}u.getUniforms().setValue(i,"morphTargetsTexture",m.texture,t),u.getUniforms().setValue(i,"morphTargetsTextureSize",m.size)}return{update:s}}function Qc(i,e,t,n){let r=new WeakMap;function s(u){const f=n.render.frame,c=u.geometry,p=e.get(u,c);if(r.get(p)!==f&&(e.update(p),r.set(p,f)),u.isInstancedMesh&&(u.hasEventListener("dispose",o)===!1&&u.addEventListener("dispose",o),r.get(u)!==f&&(t.update(u.instanceMatrix,i.ARRAY_BUFFER),u.instanceColor!==null&&t.update(u.instanceColor,i.ARRAY_BUFFER),r.set(u,f))),u.isSkinnedMesh){const m=u.skeleton;r.get(m)!==f&&(m.update(),r.set(m,f))}return p}function a(){r=new WeakMap}function o(u){const f=u.target;f.removeEventListener("dispose",o),t.remove(f.instanceMatrix),f.instanceColor!==null&&t.remove(f.instanceColor)}return{update:s,dispose:a}}const Hs=new ht,hs=new Os(1,1),ks=new Cs,Ws=new Aa,Xs=new Ns,fs=[],ds=[],ps=new Float32Array(16),ms=new Float32Array(9),_s=new Float32Array(4);function Vn(i,e,t){const n=i[0];if(n<=0||n>0)return i;const r=e*t;let s=fs[r];if(s===void 0&&(s=new Float32Array(r),fs[r]=s),e!==0){n.toArray(s,0);for(let a=1,o=0;a!==e;++a)o+=t,i[a].toArray(s,o)}return s}function ot(i,e){if(i.length!==e.length)return!1;for(let t=0,n=i.length;t<n;t++)if(i[t]!==e[t])return!1;return!0}function lt(i,e){for(let t=0,n=e.length;t<n;t++)i[t]=e[t]}function Ui(i,e){let t=ds[e];t===void 0&&(t=new Int32Array(e),ds[e]=t);for(let n=0;n!==e;++n)t[n]=i.allocateTextureUnit();return t}function eu(i,e){const t=this.cache;t[0]!==e&&(i.uniform1f(this.addr,e),t[0]=e)}function tu(i,e){const t=this.cache;if(e.x!==void 0)(t[0]!==e.x||t[1]!==e.y)&&(i.uniform2f(this.addr,e.x,e.y),t[0]=e.x,t[1]=e.y);else{if(ot(t,e))return;i.uniform2fv(this.addr,e),lt(t,e)}}function nu(i,e){const t=this.cache;if(e.x!==void 0)(t[0]!==e.x||t[1]!==e.y||t[2]!==e.z)&&(i.uniform3f(this.addr,e.x,e.y,e.z),t[0]=e.x,t[1]=e.y,t[2]=e.z);else if(e.r!==void 0)(t[0]!==e.r||t[1]!==e.g||t[2]!==e.b)&&(i.uniform3f(this.addr,e.r,e.g,e.b),t[0]=e.r,t[1]=e.g,t[2]=e.b);else{if(ot(t,e))return;i.uniform3fv(this.addr,e),lt(t,e)}}function iu(i,e){const t=this.cache;if(e.x!==void 0)(t[0]!==e.x||t[1]!==e.y||t[2]!==e.z||t[3]!==e.w)&&(i.uniform4f(this.addr,e.x,e.y,e.z,e.w),t[0]=e.x,t[1]=e.y,t[2]=e.z,t[3]=e.w);else{if(ot(t,e))return;i.uniform4fv(this.addr,e),lt(t,e)}}function ru(i,e){const t=this.cache,n=e.elements;if(n===void 0){if(ot(t,e))return;i.uniformMatrix2fv(this.addr,!1,e),lt(t,e)}else{if(ot(t,n))return;_s.set(n),i.uniformMatrix2fv(this.addr,!1,_s),lt(t,n)}}function su(i,e){const t=this.cache,n=e.elements;if(n===void 0){if(ot(t,e))return;i.uniformMatrix3fv(this.addr,!1,e),lt(t,e)}else{if(ot(t,n))return;ms.set(n),i.uniformMatrix3fv(this.addr,!1,ms),lt(t,n)}}function au(i,e){const t=this.cache,n=e.elements;if(n===void 0){if(ot(t,e))return;i.uniformMatrix4fv(this.addr,!1,e),lt(t,e)}else{if(ot(t,n))return;ps.set(n),i.uniformMatrix4fv(this.addr,!1,ps),lt(t,n)}}function ou(i,e){const t=this.cache;t[0]!==e&&(i.uniform1i(this.addr,e),t[0]=e)}function lu(i,e){const t=this.cache;if(e.x!==void 0)(t[0]!==e.x||t[1]!==e.y)&&(i.uniform2i(this.addr,e.x,e.y),t[0]=e.x,t[1]=e.y);else{if(ot(t,e))return;i.uniform2iv(this.addr,e),lt(t,e)}}function cu(i,e){const t=this.cache;if(e.x!==void 0)(t[0]!==e.x||t[1]!==e.y||t[2]!==e.z)&&(i.uniform3i(this.addr,e.x,e.y,e.z),t[0]=e.x,t[1]=e.y,t[2]=e.z);else{if(ot(t,e))return;i.uniform3iv(this.addr,e),lt(t,e)}}function uu(i,e){const t=this.cache;if(e.x!==void 0)(t[0]!==e.x||t[1]!==e.y||t[2]!==e.z||t[3]!==e.w)&&(i.uniform4i(this.addr,e.x,e.y,e.z,e.w),t[0]=e.x,t[1]=e.y,t[2]=e.z,t[3]=e.w);else{if(ot(t,e))return;i.uniform4iv(this.addr,e),lt(t,e)}}function hu(i,e){const t=this.cache;t[0]!==e&&(i.uniform1ui(this.addr,e),t[0]=e)}function fu(i,e){const t=this.cache;if(e.x!==void 0)(t[0]!==e.x||t[1]!==e.y)&&(i.uniform2ui(this.addr,e.x,e.y),t[0]=e.x,t[1]=e.y);else{if(ot(t,e))return;i.uniform2uiv(this.addr,e),lt(t,e)}}function du(i,e){const t=this.cache;if(e.x!==void 0)(t[0]!==e.x||t[1]!==e.y||t[2]!==e.z)&&(i.uniform3ui(this.addr,e.x,e.y,e.z),t[0]=e.x,t[1]=e.y,t[2]=e.z);else{if(ot(t,e))return;i.uniform3uiv(this.addr,e),lt(t,e)}}function pu(i,e){const t=this.cache;if(e.x!==void 0)(t[0]!==e.x||t[1]!==e.y||t[2]!==e.z||t[3]!==e.w)&&(i.uniform4ui(this.addr,e.x,e.y,e.z,e.w),t[0]=e.x,t[1]=e.y,t[2]=e.z,t[3]=e.w);else{if(ot(t,e))return;i.uniform4uiv(this.addr,e),lt(t,e)}}function mu(i,e,t){const n=this.cache,r=t.allocateTextureUnit();n[0]!==r&&(i.uniform1i(this.addr,r),n[0]=r);let s;this.type===i.SAMPLER_2D_SHADOW?(hs.compareFunction=515,s=hs):s=Hs,t.setTexture2D(e||s,r)}function _u(i,e,t){const n=this.cache,r=t.allocateTextureUnit();n[0]!==r&&(i.uniform1i(this.addr,r),n[0]=r),t.setTexture3D(e||Ws,r)}function gu(i,e,t){const n=this.cache,r=t.allocateTextureUnit();n[0]!==r&&(i.uniform1i(this.addr,r),n[0]=r),t.setTextureCube(e||Xs,r)}function xu(i,e,t){const n=this.cache,r=t.allocateTextureUnit();n[0]!==r&&(i.uniform1i(this.addr,r),n[0]=r),t.setTexture2DArray(e||ks,r)}function vu(i){switch(i){case 5126:return eu;case 35664:return tu;case 35665:return nu;case 35666:return iu;case 35674:return ru;case 35675:return su;case 35676:return au;case 5124:case 35670:return ou;case 35667:case 35671:return lu;case 35668:case 35672:return cu;case 35669:case 35673:return uu;case 5125:return hu;case 36294:return fu;case 36295:return du;case 36296:return pu;case 35678:case 36198:case 36298:case 36306:case 35682:return mu;case 35679:case 36299:case 36307:return _u;case 35680:case 36300:case 36308:case 36293:return gu;case 36289:case 36303:case 36311:case 36292:return xu}}function Su(i,e){i.uniform1fv(this.addr,e)}function Mu(i,e){const t=Vn(e,this.size,2);i.uniform2fv(this.addr,t)}function Eu(i,e){const t=Vn(e,this.size,3);i.uniform3fv(this.addr,t)}function yu(i,e){const t=Vn(e,this.size,4);i.uniform4fv(this.addr,t)}function Tu(i,e){const t=Vn(e,this.size,4);i.uniformMatrix2fv(this.addr,!1,t)}function Au(i,e){const t=Vn(e,this.size,9);i.uniformMatrix3fv(this.addr,!1,t)}function bu(i,e){const t=Vn(e,this.size,16);i.uniformMatrix4fv(this.addr,!1,t)}function Ru(i,e){i.uniform1iv(this.addr,e)}function wu(i,e){i.uniform2iv(this.addr,e)}function Cu(i,e){i.uniform3iv(this.addr,e)}function Pu(i,e){i.uniform4iv(this.addr,e)}function Du(i,e){i.uniform1uiv(this.addr,e)}function Iu(i,e){i.uniform2uiv(this.addr,e)}function Uu(i,e){i.uniform3uiv(this.addr,e)}function Lu(i,e){i.uniform4uiv(this.addr,e)}function Fu(i,e,t){const n=this.cache,r=e.length,s=Ui(t,r);ot(n,s)||(i.uniform1iv(this.addr,s),lt(n,s));for(let a=0;a!==r;++a)t.setTexture2D(e[a]||Hs,s[a])}function Nu(i,e,t){const n=this.cache,r=e.length,s=Ui(t,r);ot(n,s)||(i.uniform1iv(this.addr,s),lt(n,s));for(let a=0;a!==r;++a)t.setTexture3D(e[a]||Ws,s[a])}function Bu(i,e,t){const n=this.cache,r=e.length,s=Ui(t,r);ot(n,s)||(i.uniform1iv(this.addr,s),lt(n,s));for(let a=0;a!==r;++a)t.setTextureCube(e[a]||Xs,s[a])}function Ou(i,e,t){const n=this.cache,r=e.length,s=Ui(t,r);ot(n,s)||(i.uniform1iv(this.addr,s),lt(n,s));for(let a=0;a!==r;++a)t.setTexture2DArray(e[a]||ks,s[a])}function Gu(i){switch(i){case 5126:return Su;case 35664:return Mu;case 35665:return Eu;case 35666:return yu;case 35674:return Tu;case 35675:return Au;case 35676:return bu;case 5124:case 35670:return Ru;case 35667:case 35671:return wu;case 35668:case 35672:return Cu;case 35669:case 35673:return Pu;case 5125:return Du;case 36294:return Iu;case 36295:return Uu;case 36296:return Lu;case 35678:case 36198:case 36298:case 36306:case 35682:return Fu;case 35679:case 36299:case 36307:return Nu;case 35680:case 36300:case 36308:case 36293:return Bu;case 36289:case 36303:case 36311:case 36292:return Ou}}class zu{constructor(e,t,n){this.id=e,this.addr=n,this.cache=[],this.type=t.type,this.setValue=vu(t.type)}}class Vu{constructor(e,t,n){this.id=e,this.addr=n,this.cache=[],this.type=t.type,this.size=t.size,this.setValue=Gu(t.type)}}class Hu{constructor(e){this.id=e,this.seq=[],this.map={}}setValue(e,t,n){const r=this.seq;for(let s=0,a=r.length;s!==a;++s){const o=r[s];o.setValue(e,t[o.id],n)}}}const cr=/(\w+)(\])?(\[|\.)?/g;function gs(i,e){i.seq.push(e),i.map[e.id]=e}function ku(i,e,t){const n=i.name,r=n.length;for(cr.lastIndex=0;;){const s=cr.exec(n),a=cr.lastIndex;let o=s[1];const u=s[2]==="]",f=s[3];if(u&&(o=o|0),f===void 0||f==="["&&a+2===r){gs(t,f===void 0?new zu(o,i,e):new Vu(o,i,e));break}else{let p=t.map[o];p===void 0&&(p=new Hu(o),gs(t,p)),t=p}}}class Pi{constructor(e,t){this.seq=[],this.map={};const n=e.getProgramParameter(t,e.ACTIVE_UNIFORMS);for(let r=0;r<n;++r){const s=e.getActiveUniform(t,r),a=e.getUniformLocation(t,s.name);ku(s,a,this)}}setValue(e,t,n,r){const s=this.map[t];s!==void 0&&s.setValue(e,n,r)}setOptional(e,t,n){const r=t[n];r!==void 0&&this.setValue(e,n,r)}static upload(e,t,n,r){for(let s=0,a=t.length;s!==a;++s){const o=t[s],u=n[o.id];u.needsUpdate!==!1&&o.setValue(e,u.value,r)}}static seqWithValue(e,t){const n=[];for(let r=0,s=e.length;r!==s;++r){const a=e[r];a.id in t&&n.push(a)}return n}}function xs(i,e,t){const n=i.createShader(e);return i.shaderSource(n,t),i.compileShader(n),n}const Wu=37297;let Xu=0;function qu(i,e){const t=i.split(`
`),n=[],r=Math.max(e-6,0),s=Math.min(e+6,t.length);for(let a=r;a<s;a++){const o=a+1;n.push(`${o===e?">":" "} ${o}: ${t[a]}`)}return n.join(`
`)}const vs=new Ue;function Yu(i){ke._getMatrix(vs,ke.workingColorSpace,i);const e=`mat3( ${vs.elements.map(t=>t.toFixed(4))} )`;switch(ke.getTransfer(i)){case Di:return[e,"LinearTransferOETF"];case je:return[e,"sRGBTransferOETF"];default:return console.warn("THREE.WebGLProgram: Unsupported color space: ",i),[e,"LinearTransferOETF"]}}function Ss(i,e,t){const n=i.getShaderParameter(e,i.COMPILE_STATUS),r=i.getShaderInfoLog(e).trim();if(n&&r==="")return"";const s=/ERROR: 0:(\d+)/.exec(r);if(s){const a=parseInt(s[1]);return t.toUpperCase()+`

`+r+`

`+qu(i.getShaderSource(e),a)}else return r}function $u(i,e){const t=Yu(e);return[`vec4 ${i}( vec4 value ) {`,`	return ${t[1]}( vec4( value.rgb * ${t[0]}, value.a ) );`,"}"].join(`
`)}function Ku(i,e){let t;switch(e){case 1:t="Linear";break;case 2:t="Reinhard";break;case 3:t="Cineon";break;case 4:t="ACESFilmic";break;case 6:t="AgX";break;case 7:t="Neutral";break;case 5:t="Custom";break;default:console.warn("THREE.WebGLProgram: Unsupported toneMapping:",e),t="Linear"}return"vec3 "+i+"( vec3 color ) { return "+t+"ToneMapping( color ); }"}const wi=new q;function Zu(){ke.getLuminanceCoefficients(wi);const i=wi.x.toFixed(4),e=wi.y.toFixed(4),t=wi.z.toFixed(4);return["float luminance( const in vec3 rgb ) {",`	const vec3 weights = vec3( ${i}, ${e}, ${t} );`,"	return dot( weights, rgb );","}"].join(`
`)}function ju(i){return[i.extensionClipCullDistance?"#extension GL_ANGLE_clip_cull_distance : require":"",i.extensionMultiDraw?"#extension GL_ANGLE_multi_draw : require":""].filter(Kn).join(`
`)}function Ju(i){const e=[];for(const t in i){const n=i[t];n!==!1&&e.push("#define "+t+" "+n)}return e.join(`
`)}function Qu(i,e){const t={},n=i.getProgramParameter(e,i.ACTIVE_ATTRIBUTES);for(let r=0;r<n;r++){const s=i.getActiveAttrib(e,r),a=s.name;let o=1;s.type===i.FLOAT_MAT2&&(o=2),s.type===i.FLOAT_MAT3&&(o=3),s.type===i.FLOAT_MAT4&&(o=4),t[a]={type:s.type,location:i.getAttribLocation(e,a),locationSize:o}}return t}function Kn(i){return i!==""}function Ms(i,e){const t=e.numSpotLightShadows+e.numSpotLightMaps-e.numSpotLightShadowsWithMaps;return i.replace(/NUM_DIR_LIGHTS/g,e.numDirLights).replace(/NUM_SPOT_LIGHTS/g,e.numSpotLights).replace(/NUM_SPOT_LIGHT_MAPS/g,e.numSpotLightMaps).replace(/NUM_SPOT_LIGHT_COORDS/g,t).replace(/NUM_RECT_AREA_LIGHTS/g,e.numRectAreaLights).replace(/NUM_POINT_LIGHTS/g,e.numPointLights).replace(/NUM_HEMI_LIGHTS/g,e.numHemiLights).replace(/NUM_DIR_LIGHT_SHADOWS/g,e.numDirLightShadows).replace(/NUM_SPOT_LIGHT_SHADOWS_WITH_MAPS/g,e.numSpotLightShadowsWithMaps).replace(/NUM_SPOT_LIGHT_SHADOWS/g,e.numSpotLightShadows).replace(/NUM_POINT_LIGHT_SHADOWS/g,e.numPointLightShadows)}function Es(i,e){return i.replace(/NUM_CLIPPING_PLANES/g,e.numClippingPlanes).replace(/UNION_CLIPPING_PLANES/g,e.numClippingPlanes-e.numClipIntersection)}const eh=/^[ \t]*#include +<([\w\d./]+)>/gm;function dr(i){return i.replace(eh,nh)}const th=new Map;function nh(i,e){let t=Ne[e];if(t===void 0){const n=th.get(e);if(n!==void 0)t=Ne[n],console.warn('THREE.WebGLRenderer: Shader chunk "%s" has been deprecated. Use "%s" instead.',e,n);else throw new Error("Can not resolve #include <"+e+">")}return dr(t)}const ih=/#pragma unroll_loop_start\s+for\s*\(\s*int\s+i\s*=\s*(\d+)\s*;\s*i\s*<\s*(\d+)\s*;\s*i\s*\+\+\s*\)\s*{([\s\S]+?)}\s+#pragma unroll_loop_end/g;function ys(i){return i.replace(ih,rh)}function rh(i,e,t,n){let r="";for(let s=parseInt(e);s<parseInt(t);s++)r+=n.replace(/\[\s*i\s*\]/g,"[ "+s+" ]").replace(/UNROLLED_LOOP_INDEX/g,s);return r}function Ts(i){let e=`precision ${i.precision} float;
	precision ${i.precision} int;
	precision ${i.precision} sampler2D;
	precision ${i.precision} samplerCube;
	precision ${i.precision} sampler3D;
	precision ${i.precision} sampler2DArray;
	precision ${i.precision} sampler2DShadow;
	precision ${i.precision} samplerCubeShadow;
	precision ${i.precision} sampler2DArrayShadow;
	precision ${i.precision} isampler2D;
	precision ${i.precision} isampler3D;
	precision ${i.precision} isamplerCube;
	precision ${i.precision} isampler2DArray;
	precision ${i.precision} usampler2D;
	precision ${i.precision} usampler3D;
	precision ${i.precision} usamplerCube;
	precision ${i.precision} usampler2DArray;
	`;return i.precision==="highp"?e+=`
#define HIGH_PRECISION`:i.precision==="mediump"?e+=`
#define MEDIUM_PRECISION`:i.precision==="lowp"&&(e+=`
#define LOW_PRECISION`),e}function sh(i){let e="SHADOWMAP_TYPE_BASIC";return i.shadowMapType===1?e="SHADOWMAP_TYPE_PCF":i.shadowMapType===2?e="SHADOWMAP_TYPE_PCF_SOFT":i.shadowMapType===3&&(e="SHADOWMAP_TYPE_VSM"),e}function ah(i){let e="ENVMAP_TYPE_CUBE";if(i.envMap)switch(i.envMapMode){case 301:case 302:e="ENVMAP_TYPE_CUBE";break;case 306:e="ENVMAP_TYPE_CUBE_UV";break}return e}function oh(i){let e="ENVMAP_MODE_REFLECTION";return i.envMap&&i.envMapMode===302&&(e="ENVMAP_MODE_REFRACTION"),e}function lh(i){let e="ENVMAP_BLENDING_NONE";if(i.envMap)switch(i.combine){case 0:e="ENVMAP_BLENDING_MULTIPLY";break;case 1:e="ENVMAP_BLENDING_MIX";break;case 2:e="ENVMAP_BLENDING_ADD";break}return e}function ch(i){const e=i.envMapCubeUVHeight;if(e===null)return null;const t=Math.log2(e)-2,n=1/e;return{texelWidth:1/(3*Math.max(Math.pow(2,t),112)),texelHeight:n,maxMip:t}}function uh(i,e,t,n){const r=i.getContext(),s=t.defines;let a=t.vertexShader,o=t.fragmentShader;const u=sh(t),f=ah(t),c=oh(t),p=lh(t),m=ch(t),g=ju(t),S=Ju(s),T=r.createProgram();let _,d,U=t.glslVersion?"#version "+t.glslVersion+`
`:"";t.isRawShaderMaterial?(_=["#define SHADER_TYPE "+t.shaderType,"#define SHADER_NAME "+t.shaderName,S].filter(Kn).join(`
`),_.length>0&&(_+=`
`),d=["#define SHADER_TYPE "+t.shaderType,"#define SHADER_NAME "+t.shaderName,S].filter(Kn).join(`
`),d.length>0&&(d+=`
`)):(_=[Ts(t),"#define SHADER_TYPE "+t.shaderType,"#define SHADER_NAME "+t.shaderName,S,t.extensionClipCullDistance?"#define USE_CLIP_DISTANCE":"",t.batching?"#define USE_BATCHING":"",t.batchingColor?"#define USE_BATCHING_COLOR":"",t.instancing?"#define USE_INSTANCING":"",t.instancingColor?"#define USE_INSTANCING_COLOR":"",t.instancingMorph?"#define USE_INSTANCING_MORPH":"",t.useFog&&t.fog?"#define USE_FOG":"",t.useFog&&t.fogExp2?"#define FOG_EXP2":"",t.map?"#define USE_MAP":"",t.envMap?"#define USE_ENVMAP":"",t.envMap?"#define "+c:"",t.lightMap?"#define USE_LIGHTMAP":"",t.aoMap?"#define USE_AOMAP":"",t.bumpMap?"#define USE_BUMPMAP":"",t.normalMap?"#define USE_NORMALMAP":"",t.normalMapObjectSpace?"#define USE_NORMALMAP_OBJECTSPACE":"",t.normalMapTangentSpace?"#define USE_NORMALMAP_TANGENTSPACE":"",t.displacementMap?"#define USE_DISPLACEMENTMAP":"",t.emissiveMap?"#define USE_EMISSIVEMAP":"",t.anisotropy?"#define USE_ANISOTROPY":"",t.anisotropyMap?"#define USE_ANISOTROPYMAP":"",t.clearcoatMap?"#define USE_CLEARCOATMAP":"",t.clearcoatRoughnessMap?"#define USE_CLEARCOAT_ROUGHNESSMAP":"",t.clearcoatNormalMap?"#define USE_CLEARCOAT_NORMALMAP":"",t.iridescenceMap?"#define USE_IRIDESCENCEMAP":"",t.iridescenceThicknessMap?"#define USE_IRIDESCENCE_THICKNESSMAP":"",t.specularMap?"#define USE_SPECULARMAP":"",t.specularColorMap?"#define USE_SPECULAR_COLORMAP":"",t.specularIntensityMap?"#define USE_SPECULAR_INTENSITYMAP":"",t.roughnessMap?"#define USE_ROUGHNESSMAP":"",t.metalnessMap?"#define USE_METALNESSMAP":"",t.alphaMap?"#define USE_ALPHAMAP":"",t.alphaHash?"#define USE_ALPHAHASH":"",t.transmission?"#define USE_TRANSMISSION":"",t.transmissionMap?"#define USE_TRANSMISSIONMAP":"",t.thicknessMap?"#define USE_THICKNESSMAP":"",t.sheenColorMap?"#define USE_SHEEN_COLORMAP":"",t.sheenRoughnessMap?"#define USE_SHEEN_ROUGHNESSMAP":"",t.mapUv?"#define MAP_UV "+t.mapUv:"",t.alphaMapUv?"#define ALPHAMAP_UV "+t.alphaMapUv:"",t.lightMapUv?"#define LIGHTMAP_UV "+t.lightMapUv:"",t.aoMapUv?"#define AOMAP_UV "+t.aoMapUv:"",t.emissiveMapUv?"#define EMISSIVEMAP_UV "+t.emissiveMapUv:"",t.bumpMapUv?"#define BUMPMAP_UV "+t.bumpMapUv:"",t.normalMapUv?"#define NORMALMAP_UV "+t.normalMapUv:"",t.displacementMapUv?"#define DISPLACEMENTMAP_UV "+t.displacementMapUv:"",t.metalnessMapUv?"#define METALNESSMAP_UV "+t.metalnessMapUv:"",t.roughnessMapUv?"#define ROUGHNESSMAP_UV "+t.roughnessMapUv:"",t.anisotropyMapUv?"#define ANISOTROPYMAP_UV "+t.anisotropyMapUv:"",t.clearcoatMapUv?"#define CLEARCOATMAP_UV "+t.clearcoatMapUv:"",t.clearcoatNormalMapUv?"#define CLEARCOAT_NORMALMAP_UV "+t.clearcoatNormalMapUv:"",t.clearcoatRoughnessMapUv?"#define CLEARCOAT_ROUGHNESSMAP_UV "+t.clearcoatRoughnessMapUv:"",t.iridescenceMapUv?"#define IRIDESCENCEMAP_UV "+t.iridescenceMapUv:"",t.iridescenceThicknessMapUv?"#define IRIDESCENCE_THICKNESSMAP_UV "+t.iridescenceThicknessMapUv:"",t.sheenColorMapUv?"#define SHEEN_COLORMAP_UV "+t.sheenColorMapUv:"",t.sheenRoughnessMapUv?"#define SHEEN_ROUGHNESSMAP_UV "+t.sheenRoughnessMapUv:"",t.specularMapUv?"#define SPECULARMAP_UV "+t.specularMapUv:"",t.specularColorMapUv?"#define SPECULAR_COLORMAP_UV "+t.specularColorMapUv:"",t.specularIntensityMapUv?"#define SPECULAR_INTENSITYMAP_UV "+t.specularIntensityMapUv:"",t.transmissionMapUv?"#define TRANSMISSIONMAP_UV "+t.transmissionMapUv:"",t.thicknessMapUv?"#define THICKNESSMAP_UV "+t.thicknessMapUv:"",t.vertexTangents&&t.flatShading===!1?"#define USE_TANGENT":"",t.vertexColors?"#define USE_COLOR":"",t.vertexAlphas?"#define USE_COLOR_ALPHA":"",t.vertexUv1s?"#define USE_UV1":"",t.vertexUv2s?"#define USE_UV2":"",t.vertexUv3s?"#define USE_UV3":"",t.pointsUvs?"#define USE_POINTS_UV":"",t.flatShading?"#define FLAT_SHADED":"",t.skinning?"#define USE_SKINNING":"",t.morphTargets?"#define USE_MORPHTARGETS":"",t.morphNormals&&t.flatShading===!1?"#define USE_MORPHNORMALS":"",t.morphColors?"#define USE_MORPHCOLORS":"",t.morphTargetsCount>0?"#define MORPHTARGETS_TEXTURE_STRIDE "+t.morphTextureStride:"",t.morphTargetsCount>0?"#define MORPHTARGETS_COUNT "+t.morphTargetsCount:"",t.doubleSided?"#define DOUBLE_SIDED":"",t.flipSided?"#define FLIP_SIDED":"",t.shadowMapEnabled?"#define USE_SHADOWMAP":"",t.shadowMapEnabled?"#define "+u:"",t.sizeAttenuation?"#define USE_SIZEATTENUATION":"",t.numLightProbes>0?"#define USE_LIGHT_PROBES":"",t.logarithmicDepthBuffer?"#define USE_LOGDEPTHBUF":"",t.reverseDepthBuffer?"#define USE_REVERSEDEPTHBUF":"","uniform mat4 modelMatrix;","uniform mat4 modelViewMatrix;","uniform mat4 projectionMatrix;","uniform mat4 viewMatrix;","uniform mat3 normalMatrix;","uniform vec3 cameraPosition;","uniform bool isOrthographic;","#ifdef USE_INSTANCING","	attribute mat4 instanceMatrix;","#endif","#ifdef USE_INSTANCING_COLOR","	attribute vec3 instanceColor;","#endif","#ifdef USE_INSTANCING_MORPH","	uniform sampler2D morphTexture;","#endif","attribute vec3 position;","attribute vec3 normal;","attribute vec2 uv;","#ifdef USE_UV1","	attribute vec2 uv1;","#endif","#ifdef USE_UV2","	attribute vec2 uv2;","#endif","#ifdef USE_UV3","	attribute vec2 uv3;","#endif","#ifdef USE_TANGENT","	attribute vec4 tangent;","#endif","#if defined( USE_COLOR_ALPHA )","	attribute vec4 color;","#elif defined( USE_COLOR )","	attribute vec3 color;","#endif","#ifdef USE_SKINNING","	attribute vec4 skinIndex;","	attribute vec4 skinWeight;","#endif",`
`].filter(Kn).join(`
`),d=[Ts(t),"#define SHADER_TYPE "+t.shaderType,"#define SHADER_NAME "+t.shaderName,S,t.useFog&&t.fog?"#define USE_FOG":"",t.useFog&&t.fogExp2?"#define FOG_EXP2":"",t.alphaToCoverage?"#define ALPHA_TO_COVERAGE":"",t.map?"#define USE_MAP":"",t.matcap?"#define USE_MATCAP":"",t.envMap?"#define USE_ENVMAP":"",t.envMap?"#define "+f:"",t.envMap?"#define "+c:"",t.envMap?"#define "+p:"",m?"#define CUBEUV_TEXEL_WIDTH "+m.texelWidth:"",m?"#define CUBEUV_TEXEL_HEIGHT "+m.texelHeight:"",m?"#define CUBEUV_MAX_MIP "+m.maxMip+".0":"",t.lightMap?"#define USE_LIGHTMAP":"",t.aoMap?"#define USE_AOMAP":"",t.bumpMap?"#define USE_BUMPMAP":"",t.normalMap?"#define USE_NORMALMAP":"",t.normalMapObjectSpace?"#define USE_NORMALMAP_OBJECTSPACE":"",t.normalMapTangentSpace?"#define USE_NORMALMAP_TANGENTSPACE":"",t.emissiveMap?"#define USE_EMISSIVEMAP":"",t.anisotropy?"#define USE_ANISOTROPY":"",t.anisotropyMap?"#define USE_ANISOTROPYMAP":"",t.clearcoat?"#define USE_CLEARCOAT":"",t.clearcoatMap?"#define USE_CLEARCOATMAP":"",t.clearcoatRoughnessMap?"#define USE_CLEARCOAT_ROUGHNESSMAP":"",t.clearcoatNormalMap?"#define USE_CLEARCOAT_NORMALMAP":"",t.dispersion?"#define USE_DISPERSION":"",t.iridescence?"#define USE_IRIDESCENCE":"",t.iridescenceMap?"#define USE_IRIDESCENCEMAP":"",t.iridescenceThicknessMap?"#define USE_IRIDESCENCE_THICKNESSMAP":"",t.specularMap?"#define USE_SPECULARMAP":"",t.specularColorMap?"#define USE_SPECULAR_COLORMAP":"",t.specularIntensityMap?"#define USE_SPECULAR_INTENSITYMAP":"",t.roughnessMap?"#define USE_ROUGHNESSMAP":"",t.metalnessMap?"#define USE_METALNESSMAP":"",t.alphaMap?"#define USE_ALPHAMAP":"",t.alphaTest?"#define USE_ALPHATEST":"",t.alphaHash?"#define USE_ALPHAHASH":"",t.sheen?"#define USE_SHEEN":"",t.sheenColorMap?"#define USE_SHEEN_COLORMAP":"",t.sheenRoughnessMap?"#define USE_SHEEN_ROUGHNESSMAP":"",t.transmission?"#define USE_TRANSMISSION":"",t.transmissionMap?"#define USE_TRANSMISSIONMAP":"",t.thicknessMap?"#define USE_THICKNESSMAP":"",t.vertexTangents&&t.flatShading===!1?"#define USE_TANGENT":"",t.vertexColors||t.instancingColor||t.batchingColor?"#define USE_COLOR":"",t.vertexAlphas?"#define USE_COLOR_ALPHA":"",t.vertexUv1s?"#define USE_UV1":"",t.vertexUv2s?"#define USE_UV2":"",t.vertexUv3s?"#define USE_UV3":"",t.pointsUvs?"#define USE_POINTS_UV":"",t.gradientMap?"#define USE_GRADIENTMAP":"",t.flatShading?"#define FLAT_SHADED":"",t.doubleSided?"#define DOUBLE_SIDED":"",t.flipSided?"#define FLIP_SIDED":"",t.shadowMapEnabled?"#define USE_SHADOWMAP":"",t.shadowMapEnabled?"#define "+u:"",t.premultipliedAlpha?"#define PREMULTIPLIED_ALPHA":"",t.numLightProbes>0?"#define USE_LIGHT_PROBES":"",t.decodeVideoTexture?"#define DECODE_VIDEO_TEXTURE":"",t.decodeVideoTextureEmissive?"#define DECODE_VIDEO_TEXTURE_EMISSIVE":"",t.logarithmicDepthBuffer?"#define USE_LOGDEPTHBUF":"",t.reverseDepthBuffer?"#define USE_REVERSEDEPTHBUF":"","uniform mat4 viewMatrix;","uniform vec3 cameraPosition;","uniform bool isOrthographic;",t.toneMapping!==0?"#define TONE_MAPPING":"",t.toneMapping!==0?Ne.tonemapping_pars_fragment:"",t.toneMapping!==0?Ku("toneMapping",t.toneMapping):"",t.dithering?"#define DITHERING":"",t.opaque?"#define OPAQUE":"",Ne.colorspace_pars_fragment,$u("linearToOutputTexel",t.outputColorSpace),Zu(),t.useDepthPacking?"#define DEPTH_PACKING "+t.depthPacking:"",`
`].filter(Kn).join(`
`)),a=dr(a),a=Ms(a,t),a=Es(a,t),o=dr(o),o=Ms(o,t),o=Es(o,t),a=ys(a),o=ys(o),t.isRawShaderMaterial!==!0&&(U=`#version 300 es
`,_=[g,"#define attribute in","#define varying out","#define texture2D texture"].join(`
`)+`
`+_,d=["#define varying in",t.glslVersion===wr?"":"layout(location = 0) out highp vec4 pc_fragColor;",t.glslVersion===wr?"":"#define gl_FragColor pc_fragColor","#define gl_FragDepthEXT gl_FragDepth","#define texture2D texture","#define textureCube texture","#define texture2DProj textureProj","#define texture2DLodEXT textureLod","#define texture2DProjLodEXT textureProjLod","#define textureCubeLodEXT textureLod","#define texture2DGradEXT textureGrad","#define texture2DProjGradEXT textureProjGrad","#define textureCubeGradEXT textureGrad"].join(`
`)+`
`+d);const C=U+_+a,R=U+d+o,z=xs(r,r.VERTEX_SHADER,C),L=xs(r,r.FRAGMENT_SHADER,R);r.attachShader(T,z),r.attachShader(T,L),t.index0AttributeName!==void 0?r.bindAttribLocation(T,0,t.index0AttributeName):t.morphTargets===!0&&r.bindAttribLocation(T,0,"position"),r.linkProgram(T);function F(N){if(i.debug.checkShaderErrors){const ee=r.getProgramInfoLog(T).trim(),Y=r.getShaderInfoLog(z).trim(),Q=r.getShaderInfoLog(L).trim();let ie=!0,j=!0;if(r.getProgramParameter(T,r.LINK_STATUS)===!1)if(ie=!1,typeof i.debug.onShaderError=="function")i.debug.onShaderError(r,T,z,L);else{const oe=Ss(r,z,"vertex"),K=Ss(r,L,"fragment");console.error("THREE.WebGLProgram: Shader Error "+r.getError()+" - VALIDATE_STATUS "+r.getProgramParameter(T,r.VALIDATE_STATUS)+`

Material Name: `+N.name+`
Material Type: `+N.type+`

Program Info Log: `+ee+`
`+oe+`
`+K)}else ee!==""?console.warn("THREE.WebGLProgram: Program Info Log:",ee):(Y===""||Q==="")&&(j=!1);j&&(N.diagnostics={runnable:ie,programLog:ee,vertexShader:{log:Y,prefix:_},fragmentShader:{log:Q,prefix:d}})}r.deleteShader(z),r.deleteShader(L),G=new Pi(r,T),A=Qu(r,T)}let G;this.getUniforms=function(){return G===void 0&&F(this),G};let A;this.getAttributes=function(){return A===void 0&&F(this),A};let y=t.rendererExtensionParallelShaderCompile===!1;return this.isReady=function(){return y===!1&&(y=r.getProgramParameter(T,Wu)),y},this.destroy=function(){n.releaseStatesOfProgram(this),r.deleteProgram(T),this.program=void 0},this.type=t.shaderType,this.name=t.shaderName,this.id=Xu++,this.cacheKey=e,this.usedTimes=1,this.program=T,this.vertexShader=z,this.fragmentShader=L,this}let hh=0;class fh{constructor(){this.shaderCache=new Map,this.materialCache=new Map}update(e){const t=e.vertexShader,n=e.fragmentShader,r=this._getShaderStage(t),s=this._getShaderStage(n),a=this._getShaderCacheForMaterial(e);return a.has(r)===!1&&(a.add(r),r.usedTimes++),a.has(s)===!1&&(a.add(s),s.usedTimes++),this}remove(e){const t=this.materialCache.get(e);for(const n of t)n.usedTimes--,n.usedTimes===0&&this.shaderCache.delete(n.code);return this.materialCache.delete(e),this}getVertexShaderID(e){return this._getShaderStage(e.vertexShader).id}getFragmentShaderID(e){return this._getShaderStage(e.fragmentShader).id}dispose(){this.shaderCache.clear(),this.materialCache.clear()}_getShaderCacheForMaterial(e){const t=this.materialCache;let n=t.get(e);return n===void 0&&(n=new Set,t.set(e,n)),n}_getShaderStage(e){const t=this.shaderCache;let n=t.get(e);return n===void 0&&(n=new dh(e),t.set(e,n)),n}}class dh{constructor(e){this.id=hh++,this.code=e,this.usedTimes=0}}function ph(i,e,t,n,r,s,a){const o=new gr,u=new fh,f=new Set,c=[],p=r.logarithmicDepthBuffer,m=r.vertexTextures;let g=r.precision;const S={MeshDepthMaterial:"depth",MeshDistanceMaterial:"distanceRGBA",MeshNormalMaterial:"normal",MeshBasicMaterial:"basic",MeshLambertMaterial:"lambert",MeshPhongMaterial:"phong",MeshToonMaterial:"toon",MeshStandardMaterial:"physical",MeshPhysicalMaterial:"physical",MeshMatcapMaterial:"matcap",LineBasicMaterial:"basic",LineDashedMaterial:"dashed",PointsMaterial:"points",ShadowMaterial:"shadow",SpriteMaterial:"sprite"};function T(A){return f.add(A),A===0?"uv":`uv${A}`}function _(A,y,N,ee,Y){const Q=ee.fog,ie=Y.geometry,j=A.isMeshStandardMaterial?ee.environment:null,oe=(A.isMeshStandardMaterial?t:e).get(A.envMap||j),K=oe&&oe.mapping===306?oe.image.height:null,fe=S[A.type];A.precision!==null&&(g=r.getMaxPrecision(A.precision),g!==A.precision&&console.warn("THREE.WebGLProgram.getParameters:",A.precision,"not supported, using",g,"instead."));const _e=ie.morphAttributes.position||ie.morphAttributes.normal||ie.morphAttributes.color,Ee=_e!==void 0?_e.length:0;let Be=0;ie.morphAttributes.position!==void 0&&(Be=1),ie.morphAttributes.normal!==void 0&&(Be=2),ie.morphAttributes.color!==void 0&&(Be=3);let Ye,$,re,ve;if(fe){const $e=Ot[fe];Ye=$e.vertexShader,$=$e.fragmentShader}else Ye=A.vertexShader,$=A.fragmentShader,u.update(A),re=u.getVertexShaderID(A),ve=u.getFragmentShaderID(A);const he=i.getRenderTarget(),Te=i.state.buffers.depth.getReversed(),ze=Y.isInstancedMesh===!0,we=Y.isBatchedMesh===!0,Ze=!!A.map,Je=!!A.matcap,Oe=!!oe,D=!!A.aoMap,mt=!!A.lightMap,Le=!!A.bumpMap,Fe=!!A.normalMap,ye=!!A.displacementMap,Qe=!!A.emissiveMap,Me=!!A.metalnessMap,b=!!A.roughnessMap,v=A.anisotropy>0,H=A.clearcoat>0,J=A.dispersion>0,te=A.iridescence>0,Z=A.sheen>0,Se=A.transmission>0,le=v&&!!A.anisotropyMap,be=H&&!!A.clearcoatMap,x=H&&!!A.clearcoatNormalMap,l=H&&!!A.clearcoatRoughnessMap,h=te&&!!A.iridescenceMap,E=te&&!!A.iridescenceThicknessMap,w=Z&&!!A.sheenColorMap,I=Z&&!!A.sheenRoughnessMap,k=!!A.specularMap,ce=!!A.specularColorMap,Ce=!!A.specularIntensityMap,P=Se&&!!A.transmissionMap,se=Se&&!!A.thicknessMap,V=!!A.gradientMap,ne=!!A.alphaMap,me=A.alphaTest>0,pe=!!A.alphaHash,Ie=!!A.extensions;let nt=0;A.toneMapped&&(he===null||he.isXRRenderTarget===!0)&&(nt=i.toneMapping);const ft={shaderID:fe,shaderType:A.type,shaderName:A.name,vertexShader:Ye,fragmentShader:$,defines:A.defines,customVertexShaderID:re,customFragmentShaderID:ve,isRawShaderMaterial:A.isRawShaderMaterial===!0,glslVersion:A.glslVersion,precision:g,batching:we,batchingColor:we&&Y._colorsTexture!==null,instancing:ze,instancingColor:ze&&Y.instanceColor!==null,instancingMorph:ze&&Y.morphTexture!==null,supportsVertexTextures:m,outputColorSpace:he===null?i.outputColorSpace:he.isXRRenderTarget===!0?he.texture.colorSpace:Nn,alphaToCoverage:!!A.alphaToCoverage,map:Ze,matcap:Je,envMap:Oe,envMapMode:Oe&&oe.mapping,envMapCubeUVHeight:K,aoMap:D,lightMap:mt,bumpMap:Le,normalMap:Fe,displacementMap:m&&ye,emissiveMap:Qe,normalMapObjectSpace:Fe&&A.normalMapType===1,normalMapTangentSpace:Fe&&A.normalMapType===0,metalnessMap:Me,roughnessMap:b,anisotropy:v,anisotropyMap:le,clearcoat:H,clearcoatMap:be,clearcoatNormalMap:x,clearcoatRoughnessMap:l,dispersion:J,iridescence:te,iridescenceMap:h,iridescenceThicknessMap:E,sheen:Z,sheenColorMap:w,sheenRoughnessMap:I,specularMap:k,specularColorMap:ce,specularIntensityMap:Ce,transmission:Se,transmissionMap:P,thicknessMap:se,gradientMap:V,opaque:A.transparent===!1&&A.blending===1&&A.alphaToCoverage===!1,alphaMap:ne,alphaTest:me,alphaHash:pe,combine:A.combine,mapUv:Ze&&T(A.map.channel),aoMapUv:D&&T(A.aoMap.channel),lightMapUv:mt&&T(A.lightMap.channel),bumpMapUv:Le&&T(A.bumpMap.channel),normalMapUv:Fe&&T(A.normalMap.channel),displacementMapUv:ye&&T(A.displacementMap.channel),emissiveMapUv:Qe&&T(A.emissiveMap.channel),metalnessMapUv:Me&&T(A.metalnessMap.channel),roughnessMapUv:b&&T(A.roughnessMap.channel),anisotropyMapUv:le&&T(A.anisotropyMap.channel),clearcoatMapUv:be&&T(A.clearcoatMap.channel),clearcoatNormalMapUv:x&&T(A.clearcoatNormalMap.channel),clearcoatRoughnessMapUv:l&&T(A.clearcoatRoughnessMap.channel),iridescenceMapUv:h&&T(A.iridescenceMap.channel),iridescenceThicknessMapUv:E&&T(A.iridescenceThicknessMap.channel),sheenColorMapUv:w&&T(A.sheenColorMap.channel),sheenRoughnessMapUv:I&&T(A.sheenRoughnessMap.channel),specularMapUv:k&&T(A.specularMap.channel),specularColorMapUv:ce&&T(A.specularColorMap.channel),specularIntensityMapUv:Ce&&T(A.specularIntensityMap.channel),transmissionMapUv:P&&T(A.transmissionMap.channel),thicknessMapUv:se&&T(A.thicknessMap.channel),alphaMapUv:ne&&T(A.alphaMap.channel),vertexTangents:!!ie.attributes.tangent&&(Fe||v),vertexColors:A.vertexColors,vertexAlphas:A.vertexColors===!0&&!!ie.attributes.color&&ie.attributes.color.itemSize===4,pointsUvs:Y.isPoints===!0&&!!ie.attributes.uv&&(Ze||ne),fog:!!Q,useFog:A.fog===!0,fogExp2:!!Q&&Q.isFogExp2,flatShading:A.flatShading===!0,sizeAttenuation:A.sizeAttenuation===!0,logarithmicDepthBuffer:p,reverseDepthBuffer:Te,skinning:Y.isSkinnedMesh===!0,morphTargets:ie.morphAttributes.position!==void 0,morphNormals:ie.morphAttributes.normal!==void 0,morphColors:ie.morphAttributes.color!==void 0,morphTargetsCount:Ee,morphTextureStride:Be,numDirLights:y.directional.length,numPointLights:y.point.length,numSpotLights:y.spot.length,numSpotLightMaps:y.spotLightMap.length,numRectAreaLights:y.rectArea.length,numHemiLights:y.hemi.length,numDirLightShadows:y.directionalShadowMap.length,numPointLightShadows:y.pointShadowMap.length,numSpotLightShadows:y.spotShadowMap.length,numSpotLightShadowsWithMaps:y.numSpotLightShadowsWithMaps,numLightProbes:y.numLightProbes,numClippingPlanes:a.numPlanes,numClipIntersection:a.numIntersection,dithering:A.dithering,shadowMapEnabled:i.shadowMap.enabled&&N.length>0,shadowMapType:i.shadowMap.type,toneMapping:nt,decodeVideoTexture:Ze&&A.map.isVideoTexture===!0&&ke.getTransfer(A.map.colorSpace)===je,decodeVideoTextureEmissive:Qe&&A.emissiveMap.isVideoTexture===!0&&ke.getTransfer(A.emissiveMap.colorSpace)===je,premultipliedAlpha:A.premultipliedAlpha,doubleSided:A.side===2,flipSided:A.side===1,useDepthPacking:A.depthPacking>=0,depthPacking:A.depthPacking||0,index0AttributeName:A.index0AttributeName,extensionClipCullDistance:Ie&&A.extensions.clipCullDistance===!0&&n.has("WEBGL_clip_cull_distance"),extensionMultiDraw:(Ie&&A.extensions.multiDraw===!0||we)&&n.has("WEBGL_multi_draw"),rendererExtensionParallelShaderCompile:n.has("KHR_parallel_shader_compile"),customProgramCacheKey:A.customProgramCacheKey()};return ft.vertexUv1s=f.has(1),ft.vertexUv2s=f.has(2),ft.vertexUv3s=f.has(3),f.clear(),ft}function d(A){const y=[];if(A.shaderID?y.push(A.shaderID):(y.push(A.customVertexShaderID),y.push(A.customFragmentShaderID)),A.defines!==void 0)for(const N in A.defines)y.push(N),y.push(A.defines[N]);return A.isRawShaderMaterial===!1&&(U(y,A),C(y,A),y.push(i.outputColorSpace)),y.push(A.customProgramCacheKey),y.join()}function U(A,y){A.push(y.precision),A.push(y.outputColorSpace),A.push(y.envMapMode),A.push(y.envMapCubeUVHeight),A.push(y.mapUv),A.push(y.alphaMapUv),A.push(y.lightMapUv),A.push(y.aoMapUv),A.push(y.bumpMapUv),A.push(y.normalMapUv),A.push(y.displacementMapUv),A.push(y.emissiveMapUv),A.push(y.metalnessMapUv),A.push(y.roughnessMapUv),A.push(y.anisotropyMapUv),A.push(y.clearcoatMapUv),A.push(y.clearcoatNormalMapUv),A.push(y.clearcoatRoughnessMapUv),A.push(y.iridescenceMapUv),A.push(y.iridescenceThicknessMapUv),A.push(y.sheenColorMapUv),A.push(y.sheenRoughnessMapUv),A.push(y.specularMapUv),A.push(y.specularColorMapUv),A.push(y.specularIntensityMapUv),A.push(y.transmissionMapUv),A.push(y.thicknessMapUv),A.push(y.combine),A.push(y.fogExp2),A.push(y.sizeAttenuation),A.push(y.morphTargetsCount),A.push(y.morphAttributeCount),A.push(y.numDirLights),A.push(y.numPointLights),A.push(y.numSpotLights),A.push(y.numSpotLightMaps),A.push(y.numHemiLights),A.push(y.numRectAreaLights),A.push(y.numDirLightShadows),A.push(y.numPointLightShadows),A.push(y.numSpotLightShadows),A.push(y.numSpotLightShadowsWithMaps),A.push(y.numLightProbes),A.push(y.shadowMapType),A.push(y.toneMapping),A.push(y.numClippingPlanes),A.push(y.numClipIntersection),A.push(y.depthPacking)}function C(A,y){o.disableAll(),y.supportsVertexTextures&&o.enable(0),y.instancing&&o.enable(1),y.instancingColor&&o.enable(2),y.instancingMorph&&o.enable(3),y.matcap&&o.enable(4),y.envMap&&o.enable(5),y.normalMapObjectSpace&&o.enable(6),y.normalMapTangentSpace&&o.enable(7),y.clearcoat&&o.enable(8),y.iridescence&&o.enable(9),y.alphaTest&&o.enable(10),y.vertexColors&&o.enable(11),y.vertexAlphas&&o.enable(12),y.vertexUv1s&&o.enable(13),y.vertexUv2s&&o.enable(14),y.vertexUv3s&&o.enable(15),y.vertexTangents&&o.enable(16),y.anisotropy&&o.enable(17),y.alphaHash&&o.enable(18),y.batching&&o.enable(19),y.dispersion&&o.enable(20),y.batchingColor&&o.enable(21),A.push(o.mask),o.disableAll(),y.fog&&o.enable(0),y.useFog&&o.enable(1),y.flatShading&&o.enable(2),y.logarithmicDepthBuffer&&o.enable(3),y.reverseDepthBuffer&&o.enable(4),y.skinning&&o.enable(5),y.morphTargets&&o.enable(6),y.morphNormals&&o.enable(7),y.morphColors&&o.enable(8),y.premultipliedAlpha&&o.enable(9),y.shadowMapEnabled&&o.enable(10),y.doubleSided&&o.enable(11),y.flipSided&&o.enable(12),y.useDepthPacking&&o.enable(13),y.dithering&&o.enable(14),y.transmission&&o.enable(15),y.sheen&&o.enable(16),y.opaque&&o.enable(17),y.pointsUvs&&o.enable(18),y.decodeVideoTexture&&o.enable(19),y.decodeVideoTextureEmissive&&o.enable(20),y.alphaToCoverage&&o.enable(21),A.push(o.mask)}function R(A){const y=S[A.type];let N;if(y){const ee=Ot[y];N=Oa.clone(ee.uniforms)}else N=A.uniforms;return N}function z(A,y){let N;for(let ee=0,Y=c.length;ee<Y;ee++){const Q=c[ee];if(Q.cacheKey===y){N=Q,++N.usedTimes;break}}return N===void 0&&(N=new uh(i,y,A,s),c.push(N)),N}function L(A){if(--A.usedTimes===0){const y=c.indexOf(A);c[y]=c[c.length-1],c.pop(),A.destroy()}}function F(A){u.remove(A)}function G(){u.dispose()}return{getParameters:_,getProgramCacheKey:d,getUniforms:R,acquireProgram:z,releaseProgram:L,releaseShaderCache:F,programs:c,dispose:G}}function mh(){let i=new WeakMap;function e(a){return i.has(a)}function t(a){let o=i.get(a);return o===void 0&&(o={},i.set(a,o)),o}function n(a){i.delete(a)}function r(a,o,u){i.get(a)[o]=u}function s(){i=new WeakMap}return{has:e,get:t,remove:n,update:r,dispose:s}}function _h(i,e){return i.groupOrder!==e.groupOrder?i.groupOrder-e.groupOrder:i.renderOrder!==e.renderOrder?i.renderOrder-e.renderOrder:i.material.id!==e.material.id?i.material.id-e.material.id:i.z!==e.z?i.z-e.z:i.id-e.id}function As(i,e){return i.groupOrder!==e.groupOrder?i.groupOrder-e.groupOrder:i.renderOrder!==e.renderOrder?i.renderOrder-e.renderOrder:i.z!==e.z?e.z-i.z:i.id-e.id}function bs(){const i=[];let e=0;const t=[],n=[],r=[];function s(){e=0,t.length=0,n.length=0,r.length=0}function a(p,m,g,S,T,_){let d=i[e];return d===void 0?(d={id:p.id,object:p,geometry:m,material:g,groupOrder:S,renderOrder:p.renderOrder,z:T,group:_},i[e]=d):(d.id=p.id,d.object=p,d.geometry=m,d.material=g,d.groupOrder=S,d.renderOrder=p.renderOrder,d.z=T,d.group=_),e++,d}function o(p,m,g,S,T,_){const d=a(p,m,g,S,T,_);g.transmission>0?n.push(d):g.transparent===!0?r.push(d):t.push(d)}function u(p,m,g,S,T,_){const d=a(p,m,g,S,T,_);g.transmission>0?n.unshift(d):g.transparent===!0?r.unshift(d):t.unshift(d)}function f(p,m){t.length>1&&t.sort(p||_h),n.length>1&&n.sort(m||As),r.length>1&&r.sort(m||As)}function c(){for(let p=e,m=i.length;p<m;p++){const g=i[p];if(g.id===null)break;g.id=null,g.object=null,g.geometry=null,g.material=null,g.group=null}}return{opaque:t,transmissive:n,transparent:r,init:s,push:o,unshift:u,finish:c,sort:f}}function gh(){let i=new WeakMap;function e(n,r){const s=i.get(n);let a;return s===void 0?(a=new bs,i.set(n,[a])):r>=s.length?(a=new bs,s.push(a)):a=s[r],a}function t(){i=new WeakMap}return{get:e,dispose:t}}function xh(){const i={};return{get:function(e){if(i[e.id]!==void 0)return i[e.id];let t;switch(e.type){case"DirectionalLight":t={direction:new q,color:new Ke};break;case"SpotLight":t={position:new q,direction:new q,color:new Ke,distance:0,coneCos:0,penumbraCos:0,decay:0};break;case"PointLight":t={position:new q,color:new Ke,distance:0,decay:0};break;case"HemisphereLight":t={direction:new q,skyColor:new Ke,groundColor:new Ke};break;case"RectAreaLight":t={color:new Ke,position:new q,halfWidth:new q,halfHeight:new q};break}return i[e.id]=t,t}}}function vh(){const i={};return{get:function(e){if(i[e.id]!==void 0)return i[e.id];let t;switch(e.type){case"DirectionalLight":t={shadowIntensity:1,shadowBias:0,shadowNormalBias:0,shadowRadius:1,shadowMapSize:new qe};break;case"SpotLight":t={shadowIntensity:1,shadowBias:0,shadowNormalBias:0,shadowRadius:1,shadowMapSize:new qe};break;case"PointLight":t={shadowIntensity:1,shadowBias:0,shadowNormalBias:0,shadowRadius:1,shadowMapSize:new qe,shadowCameraNear:1,shadowCameraFar:1e3};break}return i[e.id]=t,t}}}let Sh=0;function Mh(i,e){return(e.castShadow?2:0)-(i.castShadow?2:0)+(e.map?1:0)-(i.map?1:0)}function Eh(i){const e=new xh,t=vh(),n={version:0,hash:{directionalLength:-1,pointLength:-1,spotLength:-1,rectAreaLength:-1,hemiLength:-1,numDirectionalShadows:-1,numPointShadows:-1,numSpotShadows:-1,numSpotMaps:-1,numLightProbes:-1},ambient:[0,0,0],probe:[],directional:[],directionalShadow:[],directionalShadowMap:[],directionalShadowMatrix:[],spot:[],spotLightMap:[],spotShadow:[],spotShadowMap:[],spotLightMatrix:[],rectArea:[],rectAreaLTC1:null,rectAreaLTC2:null,point:[],pointShadow:[],pointShadowMap:[],pointShadowMatrix:[],hemi:[],numSpotLightShadowsWithMaps:0,numLightProbes:0};for(let f=0;f<9;f++)n.probe.push(new q);const r=new q,s=new et,a=new et;function o(f){let c=0,p=0,m=0;for(let A=0;A<9;A++)n.probe[A].set(0,0,0);let g=0,S=0,T=0,_=0,d=0,U=0,C=0,R=0,z=0,L=0,F=0;f.sort(Mh);for(let A=0,y=f.length;A<y;A++){const N=f[A],ee=N.color,Y=N.intensity,Q=N.distance,ie=N.shadow&&N.shadow.map?N.shadow.map.texture:null;if(N.isAmbientLight)c+=ee.r*Y,p+=ee.g*Y,m+=ee.b*Y;else if(N.isLightProbe){for(let j=0;j<9;j++)n.probe[j].addScaledVector(N.sh.coefficients[j],Y);F++}else if(N.isDirectionalLight){const j=e.get(N);if(j.color.copy(N.color).multiplyScalar(N.intensity),N.castShadow){const oe=N.shadow,K=t.get(N);K.shadowIntensity=oe.intensity,K.shadowBias=oe.bias,K.shadowNormalBias=oe.normalBias,K.shadowRadius=oe.radius,K.shadowMapSize=oe.mapSize,n.directionalShadow[g]=K,n.directionalShadowMap[g]=ie,n.directionalShadowMatrix[g]=N.shadow.matrix,U++}n.directional[g]=j,g++}else if(N.isSpotLight){const j=e.get(N);j.position.setFromMatrixPosition(N.matrixWorld),j.color.copy(ee).multiplyScalar(Y),j.distance=Q,j.coneCos=Math.cos(N.angle),j.penumbraCos=Math.cos(N.angle*(1-N.penumbra)),j.decay=N.decay,n.spot[T]=j;const oe=N.shadow;if(N.map&&(n.spotLightMap[z]=N.map,z++,oe.updateMatrices(N),N.castShadow&&L++),n.spotLightMatrix[T]=oe.matrix,N.castShadow){const K=t.get(N);K.shadowIntensity=oe.intensity,K.shadowBias=oe.bias,K.shadowNormalBias=oe.normalBias,K.shadowRadius=oe.radius,K.shadowMapSize=oe.mapSize,n.spotShadow[T]=K,n.spotShadowMap[T]=ie,R++}T++}else if(N.isRectAreaLight){const j=e.get(N);j.color.copy(ee).multiplyScalar(Y),j.halfWidth.set(N.width*.5,0,0),j.halfHeight.set(0,N.height*.5,0),n.rectArea[_]=j,_++}else if(N.isPointLight){const j=e.get(N);if(j.color.copy(N.color).multiplyScalar(N.intensity),j.distance=N.distance,j.decay=N.decay,N.castShadow){const oe=N.shadow,K=t.get(N);K.shadowIntensity=oe.intensity,K.shadowBias=oe.bias,K.shadowNormalBias=oe.normalBias,K.shadowRadius=oe.radius,K.shadowMapSize=oe.mapSize,K.shadowCameraNear=oe.camera.near,K.shadowCameraFar=oe.camera.far,n.pointShadow[S]=K,n.pointShadowMap[S]=ie,n.pointShadowMatrix[S]=N.shadow.matrix,C++}n.point[S]=j,S++}else if(N.isHemisphereLight){const j=e.get(N);j.skyColor.copy(N.color).multiplyScalar(Y),j.groundColor.copy(N.groundColor).multiplyScalar(Y),n.hemi[d]=j,d++}}_>0&&(i.has("OES_texture_float_linear")===!0?(n.rectAreaLTC1=ue.LTC_FLOAT_1,n.rectAreaLTC2=ue.LTC_FLOAT_2):(n.rectAreaLTC1=ue.LTC_HALF_1,n.rectAreaLTC2=ue.LTC_HALF_2)),n.ambient[0]=c,n.ambient[1]=p,n.ambient[2]=m;const G=n.hash;(G.directionalLength!==g||G.pointLength!==S||G.spotLength!==T||G.rectAreaLength!==_||G.hemiLength!==d||G.numDirectionalShadows!==U||G.numPointShadows!==C||G.numSpotShadows!==R||G.numSpotMaps!==z||G.numLightProbes!==F)&&(n.directional.length=g,n.spot.length=T,n.rectArea.length=_,n.point.length=S,n.hemi.length=d,n.directionalShadow.length=U,n.directionalShadowMap.length=U,n.pointShadow.length=C,n.pointShadowMap.length=C,n.spotShadow.length=R,n.spotShadowMap.length=R,n.directionalShadowMatrix.length=U,n.pointShadowMatrix.length=C,n.spotLightMatrix.length=R+z-L,n.spotLightMap.length=z,n.numSpotLightShadowsWithMaps=L,n.numLightProbes=F,G.directionalLength=g,G.pointLength=S,G.spotLength=T,G.rectAreaLength=_,G.hemiLength=d,G.numDirectionalShadows=U,G.numPointShadows=C,G.numSpotShadows=R,G.numSpotMaps=z,G.numLightProbes=F,n.version=Sh++)}function u(f,c){let p=0,m=0,g=0,S=0,T=0;const _=c.matrixWorldInverse;for(let d=0,U=f.length;d<U;d++){const C=f[d];if(C.isDirectionalLight){const R=n.directional[p];R.direction.setFromMatrixPosition(C.matrixWorld),r.setFromMatrixPosition(C.target.matrixWorld),R.direction.sub(r),R.direction.transformDirection(_),p++}else if(C.isSpotLight){const R=n.spot[g];R.position.setFromMatrixPosition(C.matrixWorld),R.position.applyMatrix4(_),R.direction.setFromMatrixPosition(C.matrixWorld),r.setFromMatrixPosition(C.target.matrixWorld),R.direction.sub(r),R.direction.transformDirection(_),g++}else if(C.isRectAreaLight){const R=n.rectArea[S];R.position.setFromMatrixPosition(C.matrixWorld),R.position.applyMatrix4(_),a.identity(),s.copy(C.matrixWorld),s.premultiply(_),a.extractRotation(s),R.halfWidth.set(C.width*.5,0,0),R.halfHeight.set(0,C.height*.5,0),R.halfWidth.applyMatrix4(a),R.halfHeight.applyMatrix4(a),S++}else if(C.isPointLight){const R=n.point[m];R.position.setFromMatrixPosition(C.matrixWorld),R.position.applyMatrix4(_),m++}else if(C.isHemisphereLight){const R=n.hemi[T];R.direction.setFromMatrixPosition(C.matrixWorld),R.direction.transformDirection(_),T++}}}return{setup:o,setupView:u,state:n}}function Rs(i){const e=new Eh(i),t=[],n=[];function r(c){f.camera=c,t.length=0,n.length=0}function s(c){t.push(c)}function a(c){n.push(c)}function o(){e.setup(t)}function u(c){e.setupView(t,c)}const f={lightsArray:t,shadowsArray:n,camera:null,lights:e,transmissionRenderTarget:{}};return{init:r,state:f,setupLights:o,setupLightsView:u,pushLight:s,pushShadow:a}}function yh(i){let e=new WeakMap;function t(r,s=0){const a=e.get(r);let o;return a===void 0?(o=new Rs(i),e.set(r,[o])):s>=a.length?(o=new Rs(i),a.push(o)):o=a[s],o}function n(){e=new WeakMap}return{get:t,dispose:n}}const Th=`void main() {
	gl_Position = vec4( position, 1.0 );
}`,Ah=`uniform sampler2D shadow_pass;
uniform vec2 resolution;
uniform float radius;
#include <packing>
void main() {
	const float samples = float( VSM_SAMPLES );
	float mean = 0.0;
	float squared_mean = 0.0;
	float uvStride = samples <= 1.0 ? 0.0 : 2.0 / ( samples - 1.0 );
	float uvStart = samples <= 1.0 ? 0.0 : - 1.0;
	for ( float i = 0.0; i < samples; i ++ ) {
		float uvOffset = uvStart + i * uvStride;
		#ifdef HORIZONTAL_PASS
			vec2 distribution = unpackRGBATo2Half( texture2D( shadow_pass, ( gl_FragCoord.xy + vec2( uvOffset, 0.0 ) * radius ) / resolution ) );
			mean += distribution.x;
			squared_mean += distribution.y * distribution.y + distribution.x * distribution.x;
		#else
			float depth = unpackRGBAToDepth( texture2D( shadow_pass, ( gl_FragCoord.xy + vec2( 0.0, uvOffset ) * radius ) / resolution ) );
			mean += depth;
			squared_mean += depth * depth;
		#endif
	}
	mean = mean / samples;
	squared_mean = squared_mean / samples;
	float std_dev = sqrt( squared_mean - mean * mean );
	gl_FragColor = pack2HalfToRGBA( vec2( mean, std_dev ) );
}`;function bh(i,e,t){let n=new Bs;const r=new qe,s=new qe,a=new rt,o=new Ka({depthPacking:3201}),u=new Za,f={},c=t.maxTextureSize,p={0:1,1:0,2:2},m=new nn({defines:{VSM_SAMPLES:8},uniforms:{shadow_pass:{value:null},resolution:{value:new qe},radius:{value:4}},vertexShader:Th,fragmentShader:Ah}),g=m.clone();g.defines.HORIZONTAL_PASS=1;const S=new Kt;S.setAttribute("position",new Bt(new Float32Array([-1,-1,.5,3,-1,.5,-1,3,.5]),3));const T=new Nt(S,m),_=this;this.enabled=!1,this.autoUpdate=!0,this.needsUpdate=!1,this.type=1;let d=this.type;this.render=function(L,F,G){if(_.enabled===!1||_.autoUpdate===!1&&_.needsUpdate===!1||L.length===0)return;const A=i.getRenderTarget(),y=i.getActiveCubeFace(),N=i.getActiveMipmapLevel(),ee=i.state;ee.setBlending(0),ee.buffers.color.setClear(1,1,1,1),ee.buffers.depth.setTest(!0),ee.setScissorTest(!1);const Y=d!==3&&this.type===3,Q=d===3&&this.type!==3;for(let ie=0,j=L.length;ie<j;ie++){const oe=L[ie],K=oe.shadow;if(K===void 0){console.warn("THREE.WebGLShadowMap:",oe,"has no shadow.");continue}if(K.autoUpdate===!1&&K.needsUpdate===!1)continue;r.copy(K.mapSize);const fe=K.getFrameExtents();if(r.multiply(fe),s.copy(K.mapSize),(r.x>c||r.y>c)&&(r.x>c&&(s.x=Math.floor(c/fe.x),r.x=s.x*fe.x,K.mapSize.x=s.x),r.y>c&&(s.y=Math.floor(c/fe.y),r.y=s.y*fe.y,K.mapSize.y=s.y)),K.map===null||Y===!0||Q===!0){const Ee=this.type!==3?{minFilter:1003,magFilter:1003}:{};K.map!==null&&K.map.dispose(),K.map=new mn(r.x,r.y,Ee),K.map.texture.name=oe.name+".shadowMap",K.camera.updateProjectionMatrix()}i.setRenderTarget(K.map),i.clear();const _e=K.getViewportCount();for(let Ee=0;Ee<_e;Ee++){const Be=K.getViewport(Ee);a.set(s.x*Be.x,s.y*Be.y,s.x*Be.z,s.y*Be.w),ee.viewport(a),K.updateMatrices(oe,Ee),n=K.getFrustum(),R(F,G,K.camera,oe,this.type)}K.isPointLightShadow!==!0&&this.type===3&&U(K,G),K.needsUpdate=!1}d=this.type,_.needsUpdate=!1,i.setRenderTarget(A,y,N)};function U(L,F){const G=e.update(T);m.defines.VSM_SAMPLES!==L.blurSamples&&(m.defines.VSM_SAMPLES=L.blurSamples,g.defines.VSM_SAMPLES=L.blurSamples,m.needsUpdate=!0,g.needsUpdate=!0),L.mapPass===null&&(L.mapPass=new mn(r.x,r.y)),m.uniforms.shadow_pass.value=L.map.texture,m.uniforms.resolution.value=L.mapSize,m.uniforms.radius.value=L.radius,i.setRenderTarget(L.mapPass),i.clear(),i.renderBufferDirect(F,null,G,m,T,null),g.uniforms.shadow_pass.value=L.mapPass.texture,g.uniforms.resolution.value=L.mapSize,g.uniforms.radius.value=L.radius,i.setRenderTarget(L.map),i.clear(),i.renderBufferDirect(F,null,G,g,T,null)}function C(L,F,G,A){let y=null;const N=G.isPointLight===!0?L.customDistanceMaterial:L.customDepthMaterial;if(N!==void 0)y=N;else if(y=G.isPointLight===!0?u:o,i.localClippingEnabled&&F.clipShadows===!0&&Array.isArray(F.clippingPlanes)&&F.clippingPlanes.length!==0||F.displacementMap&&F.displacementScale!==0||F.alphaMap&&F.alphaTest>0||F.map&&F.alphaTest>0||F.alphaToCoverage===!0){const ee=y.uuid,Y=F.uuid;let Q=f[ee];Q===void 0&&(Q={},f[ee]=Q);let ie=Q[Y];ie===void 0&&(ie=y.clone(),Q[Y]=ie,F.addEventListener("dispose",z)),y=ie}if(y.visible=F.visible,y.wireframe=F.wireframe,A===3?y.side=F.shadowSide!==null?F.shadowSide:F.side:y.side=F.shadowSide!==null?F.shadowSide:p[F.side],y.alphaMap=F.alphaMap,y.alphaTest=F.alphaToCoverage===!0?.5:F.alphaTest,y.map=F.map,y.clipShadows=F.clipShadows,y.clippingPlanes=F.clippingPlanes,y.clipIntersection=F.clipIntersection,y.displacementMap=F.displacementMap,y.displacementScale=F.displacementScale,y.displacementBias=F.displacementBias,y.wireframeLinewidth=F.wireframeLinewidth,y.linewidth=F.linewidth,G.isPointLight===!0&&y.isMeshDistanceMaterial===!0){const ee=i.properties.get(y);ee.light=G}return y}function R(L,F,G,A,y){if(L.visible===!1)return;if(L.layers.test(F.layers)&&(L.isMesh||L.isLine||L.isPoints)&&(L.castShadow||L.receiveShadow&&y===3)&&(!L.frustumCulled||n.intersectsObject(L))){L.modelViewMatrix.multiplyMatrices(G.matrixWorldInverse,L.matrixWorld);const Y=e.update(L),Q=L.material;if(Array.isArray(Q)){const ie=Y.groups;for(let j=0,oe=ie.length;j<oe;j++){const K=ie[j],fe=Q[K.materialIndex];if(fe&&fe.visible){const _e=C(L,fe,A,y);L.onBeforeShadow(i,L,F,G,Y,_e,K),i.renderBufferDirect(G,null,Y,_e,L,K),L.onAfterShadow(i,L,F,G,Y,_e,K)}}}else if(Q.visible){const ie=C(L,Q,A,y);L.onBeforeShadow(i,L,F,G,Y,ie,null),i.renderBufferDirect(G,null,Y,ie,L,null),L.onAfterShadow(i,L,F,G,Y,ie,null)}}const ee=L.children;for(let Y=0,Q=ee.length;Y<Q;Y++)R(ee[Y],F,G,A,y)}function z(L){L.target.removeEventListener("dispose",z);for(const G in f){const A=f[G],y=L.target.uuid;y in A&&(A[y].dispose(),delete A[y])}}}const Rh={0:1,2:6,4:7,3:5,1:0,6:2,7:4,5:3};function wh(i,e){function t(){let P=!1;const se=new rt;let V=null;const ne=new rt(0,0,0,0);return{setMask:function(me){V!==me&&!P&&(i.colorMask(me,me,me,me),V=me)},setLocked:function(me){P=me},setClear:function(me,pe,Ie,nt,ft){ft===!0&&(me*=nt,pe*=nt,Ie*=nt),se.set(me,pe,Ie,nt),ne.equals(se)===!1&&(i.clearColor(me,pe,Ie,nt),ne.copy(se))},reset:function(){P=!1,V=null,ne.set(-1,0,0,0)}}}function n(){let P=!1,se=!1,V=null,ne=null,me=null;return{setReversed:function(pe){if(se!==pe){const Ie=e.get("EXT_clip_control");pe?Ie.clipControlEXT(Ie.LOWER_LEFT_EXT,Ie.ZERO_TO_ONE_EXT):Ie.clipControlEXT(Ie.LOWER_LEFT_EXT,Ie.NEGATIVE_ONE_TO_ONE_EXT),se=pe;const nt=me;me=null,this.setClear(nt)}},getReversed:function(){return se},setTest:function(pe){pe?he(i.DEPTH_TEST):Te(i.DEPTH_TEST)},setMask:function(pe){V!==pe&&!P&&(i.depthMask(pe),V=pe)},setFunc:function(pe){if(se&&(pe=Rh[pe]),ne!==pe){switch(pe){case 0:i.depthFunc(i.NEVER);break;case 1:i.depthFunc(i.ALWAYS);break;case 2:i.depthFunc(i.LESS);break;case 3:i.depthFunc(i.LEQUAL);break;case 4:i.depthFunc(i.EQUAL);break;case 5:i.depthFunc(i.GEQUAL);break;case 6:i.depthFunc(i.GREATER);break;case 7:i.depthFunc(i.NOTEQUAL);break;default:i.depthFunc(i.LEQUAL)}ne=pe}},setLocked:function(pe){P=pe},setClear:function(pe){me!==pe&&(se&&(pe=1-pe),i.clearDepth(pe),me=pe)},reset:function(){P=!1,V=null,ne=null,me=null,se=!1}}}function r(){let P=!1,se=null,V=null,ne=null,me=null,pe=null,Ie=null,nt=null,ft=null;return{setTest:function($e){P||($e?he(i.STENCIL_TEST):Te(i.STENCIL_TEST))},setMask:function($e){se!==$e&&!P&&(i.stencilMask($e),se=$e)},setFunc:function($e,Ct,zt){(V!==$e||ne!==Ct||me!==zt)&&(i.stencilFunc($e,Ct,zt),V=$e,ne=Ct,me=zt)},setOp:function($e,Ct,zt){(pe!==$e||Ie!==Ct||nt!==zt)&&(i.stencilOp($e,Ct,zt),pe=$e,Ie=Ct,nt=zt)},setLocked:function($e){P=$e},setClear:function($e){ft!==$e&&(i.clearStencil($e),ft=$e)},reset:function(){P=!1,se=null,V=null,ne=null,me=null,pe=null,Ie=null,nt=null,ft=null}}}const s=new t,a=new n,o=new r,u=new WeakMap,f=new WeakMap;let c={},p={},m=new WeakMap,g=[],S=null,T=!1,_=null,d=null,U=null,C=null,R=null,z=null,L=null,F=new Ke(0,0,0),G=0,A=!1,y=null,N=null,ee=null,Y=null,Q=null;const ie=i.getParameter(i.MAX_COMBINED_TEXTURE_IMAGE_UNITS);let j=!1,oe=0;const K=i.getParameter(i.VERSION);K.indexOf("WebGL")!==-1?(oe=parseFloat(/^WebGL (\d)/.exec(K)[1]),j=oe>=1):K.indexOf("OpenGL ES")!==-1&&(oe=parseFloat(/^OpenGL ES (\d)/.exec(K)[1]),j=oe>=2);let fe=null,_e={};const Ee=i.getParameter(i.SCISSOR_BOX),Be=i.getParameter(i.VIEWPORT),Ye=new rt().fromArray(Ee),$=new rt().fromArray(Be);function re(P,se,V,ne){const me=new Uint8Array(4),pe=i.createTexture();i.bindTexture(P,pe),i.texParameteri(P,i.TEXTURE_MIN_FILTER,i.NEAREST),i.texParameteri(P,i.TEXTURE_MAG_FILTER,i.NEAREST);for(let Ie=0;Ie<V;Ie++)P===i.TEXTURE_3D||P===i.TEXTURE_2D_ARRAY?i.texImage3D(se,0,i.RGBA,1,1,ne,0,i.RGBA,i.UNSIGNED_BYTE,me):i.texImage2D(se+Ie,0,i.RGBA,1,1,0,i.RGBA,i.UNSIGNED_BYTE,me);return pe}const ve={};ve[i.TEXTURE_2D]=re(i.TEXTURE_2D,i.TEXTURE_2D,1),ve[i.TEXTURE_CUBE_MAP]=re(i.TEXTURE_CUBE_MAP,i.TEXTURE_CUBE_MAP_POSITIVE_X,6),ve[i.TEXTURE_2D_ARRAY]=re(i.TEXTURE_2D_ARRAY,i.TEXTURE_2D_ARRAY,1,1),ve[i.TEXTURE_3D]=re(i.TEXTURE_3D,i.TEXTURE_3D,1,1),s.setClear(0,0,0,1),a.setClear(1),o.setClear(0),he(i.DEPTH_TEST),a.setFunc(3),Le(!1),Fe(1),he(i.CULL_FACE),D(0);function he(P){c[P]!==!0&&(i.enable(P),c[P]=!0)}function Te(P){c[P]!==!1&&(i.disable(P),c[P]=!1)}function ze(P,se){return p[P]!==se?(i.bindFramebuffer(P,se),p[P]=se,P===i.DRAW_FRAMEBUFFER&&(p[i.FRAMEBUFFER]=se),P===i.FRAMEBUFFER&&(p[i.DRAW_FRAMEBUFFER]=se),!0):!1}function we(P,se){let V=g,ne=!1;if(P){V=m.get(se),V===void 0&&(V=[],m.set(se,V));const me=P.textures;if(V.length!==me.length||V[0]!==i.COLOR_ATTACHMENT0){for(let pe=0,Ie=me.length;pe<Ie;pe++)V[pe]=i.COLOR_ATTACHMENT0+pe;V.length=me.length,ne=!0}}else V[0]!==i.BACK&&(V[0]=i.BACK,ne=!0);ne&&i.drawBuffers(V)}function Ze(P){return S!==P?(i.useProgram(P),S=P,!0):!1}const Je={100:i.FUNC_ADD,101:i.FUNC_SUBTRACT,102:i.FUNC_REVERSE_SUBTRACT};Je[103]=i.MIN,Je[104]=i.MAX;const Oe={200:i.ZERO,201:i.ONE,202:i.SRC_COLOR,204:i.SRC_ALPHA,210:i.SRC_ALPHA_SATURATE,208:i.DST_COLOR,206:i.DST_ALPHA,203:i.ONE_MINUS_SRC_COLOR,205:i.ONE_MINUS_SRC_ALPHA,209:i.ONE_MINUS_DST_COLOR,207:i.ONE_MINUS_DST_ALPHA,211:i.CONSTANT_COLOR,212:i.ONE_MINUS_CONSTANT_COLOR,213:i.CONSTANT_ALPHA,214:i.ONE_MINUS_CONSTANT_ALPHA};function D(P,se,V,ne,me,pe,Ie,nt,ft,$e){if(P===0){T===!0&&(Te(i.BLEND),T=!1);return}if(T===!1&&(he(i.BLEND),T=!0),P!==5){if(P!==_||$e!==A){if((d!==100||R!==100)&&(i.blendEquation(i.FUNC_ADD),d=100,R=100),$e)switch(P){case 1:i.blendFuncSeparate(i.ONE,i.ONE_MINUS_SRC_ALPHA,i.ONE,i.ONE_MINUS_SRC_ALPHA);break;case 2:i.blendFunc(i.ONE,i.ONE);break;case 3:i.blendFuncSeparate(i.ZERO,i.ONE_MINUS_SRC_COLOR,i.ZERO,i.ONE);break;case 4:i.blendFuncSeparate(i.ZERO,i.SRC_COLOR,i.ZERO,i.SRC_ALPHA);break;default:console.error("THREE.WebGLState: Invalid blending: ",P);break}else switch(P){case 1:i.blendFuncSeparate(i.SRC_ALPHA,i.ONE_MINUS_SRC_ALPHA,i.ONE,i.ONE_MINUS_SRC_ALPHA);break;case 2:i.blendFunc(i.SRC_ALPHA,i.ONE);break;case 3:i.blendFuncSeparate(i.ZERO,i.ONE_MINUS_SRC_COLOR,i.ZERO,i.ONE);break;case 4:i.blendFunc(i.ZERO,i.SRC_COLOR);break;default:console.error("THREE.WebGLState: Invalid blending: ",P);break}U=null,C=null,z=null,L=null,F.set(0,0,0),G=0,_=P,A=$e}return}me=me||se,pe=pe||V,Ie=Ie||ne,(se!==d||me!==R)&&(i.blendEquationSeparate(Je[se],Je[me]),d=se,R=me),(V!==U||ne!==C||pe!==z||Ie!==L)&&(i.blendFuncSeparate(Oe[V],Oe[ne],Oe[pe],Oe[Ie]),U=V,C=ne,z=pe,L=Ie),(nt.equals(F)===!1||ft!==G)&&(i.blendColor(nt.r,nt.g,nt.b,ft),F.copy(nt),G=ft),_=P,A=!1}function mt(P,se){P.side===2?Te(i.CULL_FACE):he(i.CULL_FACE);let V=P.side===1;se&&(V=!V),Le(V),P.blending===1&&P.transparent===!1?D(0):D(P.blending,P.blendEquation,P.blendSrc,P.blendDst,P.blendEquationAlpha,P.blendSrcAlpha,P.blendDstAlpha,P.blendColor,P.blendAlpha,P.premultipliedAlpha),a.setFunc(P.depthFunc),a.setTest(P.depthTest),a.setMask(P.depthWrite),s.setMask(P.colorWrite);const ne=P.stencilWrite;o.setTest(ne),ne&&(o.setMask(P.stencilWriteMask),o.setFunc(P.stencilFunc,P.stencilRef,P.stencilFuncMask),o.setOp(P.stencilFail,P.stencilZFail,P.stencilZPass)),Qe(P.polygonOffset,P.polygonOffsetFactor,P.polygonOffsetUnits),P.alphaToCoverage===!0?he(i.SAMPLE_ALPHA_TO_COVERAGE):Te(i.SAMPLE_ALPHA_TO_COVERAGE)}function Le(P){y!==P&&(P?i.frontFace(i.CW):i.frontFace(i.CCW),y=P)}function Fe(P){P!==0?(he(i.CULL_FACE),P!==N&&(P===1?i.cullFace(i.BACK):P===2?i.cullFace(i.FRONT):i.cullFace(i.FRONT_AND_BACK))):Te(i.CULL_FACE),N=P}function ye(P){P!==ee&&(j&&i.lineWidth(P),ee=P)}function Qe(P,se,V){P?(he(i.POLYGON_OFFSET_FILL),(Y!==se||Q!==V)&&(i.polygonOffset(se,V),Y=se,Q=V)):Te(i.POLYGON_OFFSET_FILL)}function Me(P){P?he(i.SCISSOR_TEST):Te(i.SCISSOR_TEST)}function b(P){P===void 0&&(P=i.TEXTURE0+ie-1),fe!==P&&(i.activeTexture(P),fe=P)}function v(P,se,V){V===void 0&&(fe===null?V=i.TEXTURE0+ie-1:V=fe);let ne=_e[V];ne===void 0&&(ne={type:void 0,texture:void 0},_e[V]=ne),(ne.type!==P||ne.texture!==se)&&(fe!==V&&(i.activeTexture(V),fe=V),i.bindTexture(P,se||ve[P]),ne.type=P,ne.texture=se)}function H(){const P=_e[fe];P!==void 0&&P.type!==void 0&&(i.bindTexture(P.type,null),P.type=void 0,P.texture=void 0)}function J(){try{i.compressedTexImage2D(...arguments)}catch(P){console.error("THREE.WebGLState:",P)}}function te(){try{i.compressedTexImage3D(...arguments)}catch(P){console.error("THREE.WebGLState:",P)}}function Z(){try{i.texSubImage2D(...arguments)}catch(P){console.error("THREE.WebGLState:",P)}}function Se(){try{i.texSubImage3D(...arguments)}catch(P){console.error("THREE.WebGLState:",P)}}function le(){try{i.compressedTexSubImage2D(...arguments)}catch(P){console.error("THREE.WebGLState:",P)}}function be(){try{i.compressedTexSubImage3D(...arguments)}catch(P){console.error("THREE.WebGLState:",P)}}function x(){try{i.texStorage2D(...arguments)}catch(P){console.error("THREE.WebGLState:",P)}}function l(){try{i.texStorage3D(...arguments)}catch(P){console.error("THREE.WebGLState:",P)}}function h(){try{i.texImage2D(...arguments)}catch(P){console.error("THREE.WebGLState:",P)}}function E(){try{i.texImage3D(...arguments)}catch(P){console.error("THREE.WebGLState:",P)}}function w(P){Ye.equals(P)===!1&&(i.scissor(P.x,P.y,P.z,P.w),Ye.copy(P))}function I(P){$.equals(P)===!1&&(i.viewport(P.x,P.y,P.z,P.w),$.copy(P))}function k(P,se){let V=f.get(se);V===void 0&&(V=new WeakMap,f.set(se,V));let ne=V.get(P);ne===void 0&&(ne=i.getUniformBlockIndex(se,P.name),V.set(P,ne))}function ce(P,se){const ne=f.get(se).get(P);u.get(se)!==ne&&(i.uniformBlockBinding(se,ne,P.__bindingPointIndex),u.set(se,ne))}function Ce(){i.disable(i.BLEND),i.disable(i.CULL_FACE),i.disable(i.DEPTH_TEST),i.disable(i.POLYGON_OFFSET_FILL),i.disable(i.SCISSOR_TEST),i.disable(i.STENCIL_TEST),i.disable(i.SAMPLE_ALPHA_TO_COVERAGE),i.blendEquation(i.FUNC_ADD),i.blendFunc(i.ONE,i.ZERO),i.blendFuncSeparate(i.ONE,i.ZERO,i.ONE,i.ZERO),i.blendColor(0,0,0,0),i.colorMask(!0,!0,!0,!0),i.clearColor(0,0,0,0),i.depthMask(!0),i.depthFunc(i.LESS),a.setReversed(!1),i.clearDepth(1),i.stencilMask(4294967295),i.stencilFunc(i.ALWAYS,0,4294967295),i.stencilOp(i.KEEP,i.KEEP,i.KEEP),i.clearStencil(0),i.cullFace(i.BACK),i.frontFace(i.CCW),i.polygonOffset(0,0),i.activeTexture(i.TEXTURE0),i.bindFramebuffer(i.FRAMEBUFFER,null),i.bindFramebuffer(i.DRAW_FRAMEBUFFER,null),i.bindFramebuffer(i.READ_FRAMEBUFFER,null),i.useProgram(null),i.lineWidth(1),i.scissor(0,0,i.canvas.width,i.canvas.height),i.viewport(0,0,i.canvas.width,i.canvas.height),c={},fe=null,_e={},p={},m=new WeakMap,g=[],S=null,T=!1,_=null,d=null,U=null,C=null,R=null,z=null,L=null,F=new Ke(0,0,0),G=0,A=!1,y=null,N=null,ee=null,Y=null,Q=null,Ye.set(0,0,i.canvas.width,i.canvas.height),$.set(0,0,i.canvas.width,i.canvas.height),s.reset(),a.reset(),o.reset()}return{buffers:{color:s,depth:a,stencil:o},enable:he,disable:Te,bindFramebuffer:ze,drawBuffers:we,useProgram:Ze,setBlending:D,setMaterial:mt,setFlipSided:Le,setCullFace:Fe,setLineWidth:ye,setPolygonOffset:Qe,setScissorTest:Me,activeTexture:b,bindTexture:v,unbindTexture:H,compressedTexImage2D:J,compressedTexImage3D:te,texImage2D:h,texImage3D:E,updateUBOMapping:k,uniformBlockBinding:ce,texStorage2D:x,texStorage3D:l,texSubImage2D:Z,texSubImage3D:Se,compressedTexSubImage2D:le,compressedTexSubImage3D:be,scissor:w,viewport:I,reset:Ce}}function Ch(i,e,t,n,r,s,a){const o=e.has("WEBGL_multisampled_render_to_texture")?e.get("WEBGL_multisampled_render_to_texture"):null,u=typeof navigator>"u"?!1:/OculusBrowser/g.test(navigator.userAgent),f=new qe,c=new WeakMap;let p;const m=new WeakMap;let g=!1;try{g=typeof OffscreenCanvas<"u"&&new OffscreenCanvas(1,1).getContext("2d")!==null}catch{}function S(b,v){return g?new OffscreenCanvas(b,v):Qn("canvas")}function T(b,v,H){let J=1;const te=Me(b);if((te.width>H||te.height>H)&&(J=H/Math.max(te.width,te.height)),J<1)if(typeof HTMLImageElement<"u"&&b instanceof HTMLImageElement||typeof HTMLCanvasElement<"u"&&b instanceof HTMLCanvasElement||typeof ImageBitmap<"u"&&b instanceof ImageBitmap||typeof VideoFrame<"u"&&b instanceof VideoFrame){const Z=Math.floor(J*te.width),Se=Math.floor(J*te.height);p===void 0&&(p=S(Z,Se));const le=v?S(Z,Se):p;return le.width=Z,le.height=Se,le.getContext("2d").drawImage(b,0,0,Z,Se),console.warn("THREE.WebGLRenderer: Texture has been resized from ("+te.width+"x"+te.height+") to ("+Z+"x"+Se+")."),le}else return"data"in b&&console.warn("THREE.WebGLRenderer: Image in DataTexture is too big ("+te.width+"x"+te.height+")."),b;return b}function _(b){return b.generateMipmaps}function d(b){i.generateMipmap(b)}function U(b){return b.isWebGLCubeRenderTarget?i.TEXTURE_CUBE_MAP:b.isWebGL3DRenderTarget?i.TEXTURE_3D:b.isWebGLArrayRenderTarget||b.isCompressedArrayTexture?i.TEXTURE_2D_ARRAY:i.TEXTURE_2D}function C(b,v,H,J,te=!1){if(b!==null){if(i[b]!==void 0)return i[b];console.warn("THREE.WebGLRenderer: Attempt to use non-existing WebGL internal format '"+b+"'")}let Z=v;if(v===i.RED&&(H===i.FLOAT&&(Z=i.R32F),H===i.HALF_FLOAT&&(Z=i.R16F),H===i.UNSIGNED_BYTE&&(Z=i.R8)),v===i.RED_INTEGER&&(H===i.UNSIGNED_BYTE&&(Z=i.R8UI),H===i.UNSIGNED_SHORT&&(Z=i.R16UI),H===i.UNSIGNED_INT&&(Z=i.R32UI),H===i.BYTE&&(Z=i.R8I),H===i.SHORT&&(Z=i.R16I),H===i.INT&&(Z=i.R32I)),v===i.RG&&(H===i.FLOAT&&(Z=i.RG32F),H===i.HALF_FLOAT&&(Z=i.RG16F),H===i.UNSIGNED_BYTE&&(Z=i.RG8)),v===i.RG_INTEGER&&(H===i.UNSIGNED_BYTE&&(Z=i.RG8UI),H===i.UNSIGNED_SHORT&&(Z=i.RG16UI),H===i.UNSIGNED_INT&&(Z=i.RG32UI),H===i.BYTE&&(Z=i.RG8I),H===i.SHORT&&(Z=i.RG16I),H===i.INT&&(Z=i.RG32I)),v===i.RGB_INTEGER&&(H===i.UNSIGNED_BYTE&&(Z=i.RGB8UI),H===i.UNSIGNED_SHORT&&(Z=i.RGB16UI),H===i.UNSIGNED_INT&&(Z=i.RGB32UI),H===i.BYTE&&(Z=i.RGB8I),H===i.SHORT&&(Z=i.RGB16I),H===i.INT&&(Z=i.RGB32I)),v===i.RGBA_INTEGER&&(H===i.UNSIGNED_BYTE&&(Z=i.RGBA8UI),H===i.UNSIGNED_SHORT&&(Z=i.RGBA16UI),H===i.UNSIGNED_INT&&(Z=i.RGBA32UI),H===i.BYTE&&(Z=i.RGBA8I),H===i.SHORT&&(Z=i.RGBA16I),H===i.INT&&(Z=i.RGBA32I)),v===i.RGB&&H===i.UNSIGNED_INT_5_9_9_9_REV&&(Z=i.RGB9_E5),v===i.RGBA){const Se=te?Di:ke.getTransfer(J);H===i.FLOAT&&(Z=i.RGBA32F),H===i.HALF_FLOAT&&(Z=i.RGBA16F),H===i.UNSIGNED_BYTE&&(Z=Se===je?i.SRGB8_ALPHA8:i.RGBA8),H===i.UNSIGNED_SHORT_4_4_4_4&&(Z=i.RGBA4),H===i.UNSIGNED_SHORT_5_5_5_1&&(Z=i.RGB5_A1)}return(Z===i.R16F||Z===i.R32F||Z===i.RG16F||Z===i.RG32F||Z===i.RGBA16F||Z===i.RGBA32F)&&e.get("EXT_color_buffer_float"),Z}function R(b,v){let H;return b?v===null||v===1014||v===1020?H=i.DEPTH24_STENCIL8:v===1015?H=i.DEPTH32F_STENCIL8:v===1012&&(H=i.DEPTH24_STENCIL8,console.warn("DepthTexture: 16 bit depth attachment is not supported with stencil. Using 24-bit attachment.")):v===null||v===1014||v===1020?H=i.DEPTH_COMPONENT24:v===1015?H=i.DEPTH_COMPONENT32F:v===1012&&(H=i.DEPTH_COMPONENT16),H}function z(b,v){return _(b)===!0||b.isFramebufferTexture&&b.minFilter!==1003&&b.minFilter!==1006?Math.log2(Math.max(v.width,v.height))+1:b.mipmaps!==void 0&&b.mipmaps.length>0?b.mipmaps.length:b.isCompressedTexture&&Array.isArray(b.image)?v.mipmaps.length:1}function L(b){const v=b.target;v.removeEventListener("dispose",L),G(v),v.isVideoTexture&&c.delete(v)}function F(b){const v=b.target;v.removeEventListener("dispose",F),y(v)}function G(b){const v=n.get(b);if(v.__webglInit===void 0)return;const H=b.source,J=m.get(H);if(J){const te=J[v.__cacheKey];te.usedTimes--,te.usedTimes===0&&A(b),Object.keys(J).length===0&&m.delete(H)}n.remove(b)}function A(b){const v=n.get(b);i.deleteTexture(v.__webglTexture);const H=b.source,J=m.get(H);delete J[v.__cacheKey],a.memory.textures--}function y(b){const v=n.get(b);if(b.depthTexture&&(b.depthTexture.dispose(),n.remove(b.depthTexture)),b.isWebGLCubeRenderTarget)for(let J=0;J<6;J++){if(Array.isArray(v.__webglFramebuffer[J]))for(let te=0;te<v.__webglFramebuffer[J].length;te++)i.deleteFramebuffer(v.__webglFramebuffer[J][te]);else i.deleteFramebuffer(v.__webglFramebuffer[J]);v.__webglDepthbuffer&&i.deleteRenderbuffer(v.__webglDepthbuffer[J])}else{if(Array.isArray(v.__webglFramebuffer))for(let J=0;J<v.__webglFramebuffer.length;J++)i.deleteFramebuffer(v.__webglFramebuffer[J]);else i.deleteFramebuffer(v.__webglFramebuffer);if(v.__webglDepthbuffer&&i.deleteRenderbuffer(v.__webglDepthbuffer),v.__webglMultisampledFramebuffer&&i.deleteFramebuffer(v.__webglMultisampledFramebuffer),v.__webglColorRenderbuffer)for(let J=0;J<v.__webglColorRenderbuffer.length;J++)v.__webglColorRenderbuffer[J]&&i.deleteRenderbuffer(v.__webglColorRenderbuffer[J]);v.__webglDepthRenderbuffer&&i.deleteRenderbuffer(v.__webglDepthRenderbuffer)}const H=b.textures;for(let J=0,te=H.length;J<te;J++){const Z=n.get(H[J]);Z.__webglTexture&&(i.deleteTexture(Z.__webglTexture),a.memory.textures--),n.remove(H[J])}n.remove(b)}let N=0;function ee(){N=0}function Y(){const b=N;return b>=r.maxTextures&&console.warn("THREE.WebGLTextures: Trying to use "+b+" texture units while this GPU supports only "+r.maxTextures),N+=1,b}function Q(b){const v=[];return v.push(b.wrapS),v.push(b.wrapT),v.push(b.wrapR||0),v.push(b.magFilter),v.push(b.minFilter),v.push(b.anisotropy),v.push(b.internalFormat),v.push(b.format),v.push(b.type),v.push(b.generateMipmaps),v.push(b.premultiplyAlpha),v.push(b.flipY),v.push(b.unpackAlignment),v.push(b.colorSpace),v.join()}function ie(b,v){const H=n.get(b);if(b.isVideoTexture&&ye(b),b.isRenderTargetTexture===!1&&b.version>0&&H.__version!==b.version){const J=b.image;if(J===null)console.warn("THREE.WebGLRenderer: Texture marked for update but no image data found.");else if(J.complete===!1)console.warn("THREE.WebGLRenderer: Texture marked for update but image is incomplete");else{$(H,b,v);return}}t.bindTexture(i.TEXTURE_2D,H.__webglTexture,i.TEXTURE0+v)}function j(b,v){const H=n.get(b);if(b.version>0&&H.__version!==b.version){$(H,b,v);return}t.bindTexture(i.TEXTURE_2D_ARRAY,H.__webglTexture,i.TEXTURE0+v)}function oe(b,v){const H=n.get(b);if(b.version>0&&H.__version!==b.version){$(H,b,v);return}t.bindTexture(i.TEXTURE_3D,H.__webglTexture,i.TEXTURE0+v)}function K(b,v){const H=n.get(b);if(b.version>0&&H.__version!==b.version){re(H,b,v);return}t.bindTexture(i.TEXTURE_CUBE_MAP,H.__webglTexture,i.TEXTURE0+v)}const fe={1e3:i.REPEAT,1001:i.CLAMP_TO_EDGE,1002:i.MIRRORED_REPEAT},_e={1003:i.NEAREST,1004:i.NEAREST_MIPMAP_NEAREST,1005:i.NEAREST_MIPMAP_LINEAR,1006:i.LINEAR,1007:i.LINEAR_MIPMAP_NEAREST,1008:i.LINEAR_MIPMAP_LINEAR},Ee={512:i.NEVER,519:i.ALWAYS,513:i.LESS,515:i.LEQUAL,514:i.EQUAL,518:i.GEQUAL,516:i.GREATER,517:i.NOTEQUAL};function Be(b,v){if(v.type===1015&&e.has("OES_texture_float_linear")===!1&&(v.magFilter===1006||v.magFilter===1007||v.magFilter===1005||v.magFilter===1008||v.minFilter===1006||v.minFilter===1007||v.minFilter===1005||v.minFilter===1008)&&console.warn("THREE.WebGLRenderer: Unable to use linear filtering with floating point textures. OES_texture_float_linear not supported on this device."),i.texParameteri(b,i.TEXTURE_WRAP_S,fe[v.wrapS]),i.texParameteri(b,i.TEXTURE_WRAP_T,fe[v.wrapT]),(b===i.TEXTURE_3D||b===i.TEXTURE_2D_ARRAY)&&i.texParameteri(b,i.TEXTURE_WRAP_R,fe[v.wrapR]),i.texParameteri(b,i.TEXTURE_MAG_FILTER,_e[v.magFilter]),i.texParameteri(b,i.TEXTURE_MIN_FILTER,_e[v.minFilter]),v.compareFunction&&(i.texParameteri(b,i.TEXTURE_COMPARE_MODE,i.COMPARE_REF_TO_TEXTURE),i.texParameteri(b,i.TEXTURE_COMPARE_FUNC,Ee[v.compareFunction])),e.has("EXT_texture_filter_anisotropic")===!0){if(v.magFilter===1003||v.minFilter!==1005&&v.minFilter!==1008||v.type===1015&&e.has("OES_texture_float_linear")===!1)return;if(v.anisotropy>1||n.get(v).__currentAnisotropy){const H=e.get("EXT_texture_filter_anisotropic");i.texParameterf(b,H.TEXTURE_MAX_ANISOTROPY_EXT,Math.min(v.anisotropy,r.getMaxAnisotropy())),n.get(v).__currentAnisotropy=v.anisotropy}}}function Ye(b,v){let H=!1;b.__webglInit===void 0&&(b.__webglInit=!0,v.addEventListener("dispose",L));const J=v.source;let te=m.get(J);te===void 0&&(te={},m.set(J,te));const Z=Q(v);if(Z!==b.__cacheKey){te[Z]===void 0&&(te[Z]={texture:i.createTexture(),usedTimes:0},a.memory.textures++,H=!0),te[Z].usedTimes++;const Se=te[b.__cacheKey];Se!==void 0&&(te[b.__cacheKey].usedTimes--,Se.usedTimes===0&&A(v)),b.__cacheKey=Z,b.__webglTexture=te[Z].texture}return H}function $(b,v,H){let J=i.TEXTURE_2D;(v.isDataArrayTexture||v.isCompressedArrayTexture)&&(J=i.TEXTURE_2D_ARRAY),v.isData3DTexture&&(J=i.TEXTURE_3D);const te=Ye(b,v),Z=v.source;t.bindTexture(J,b.__webglTexture,i.TEXTURE0+H);const Se=n.get(Z);if(Z.version!==Se.__version||te===!0){t.activeTexture(i.TEXTURE0+H);const le=ke.getPrimaries(ke.workingColorSpace),be=v.colorSpace===""?null:ke.getPrimaries(v.colorSpace),x=v.colorSpace===""||le===be?i.NONE:i.BROWSER_DEFAULT_WEBGL;i.pixelStorei(i.UNPACK_FLIP_Y_WEBGL,v.flipY),i.pixelStorei(i.UNPACK_PREMULTIPLY_ALPHA_WEBGL,v.premultiplyAlpha),i.pixelStorei(i.UNPACK_ALIGNMENT,v.unpackAlignment),i.pixelStorei(i.UNPACK_COLORSPACE_CONVERSION_WEBGL,x);let l=T(v.image,!1,r.maxTextureSize);l=Qe(v,l);const h=s.convert(v.format,v.colorSpace),E=s.convert(v.type);let w=C(v.internalFormat,h,E,v.colorSpace,v.isVideoTexture);Be(J,v);let I;const k=v.mipmaps,ce=v.isVideoTexture!==!0,Ce=Se.__version===void 0||te===!0,P=Z.dataReady,se=z(v,l);if(v.isDepthTexture)w=R(v.format===1027,v.type),Ce&&(ce?t.texStorage2D(i.TEXTURE_2D,1,w,l.width,l.height):t.texImage2D(i.TEXTURE_2D,0,w,l.width,l.height,0,h,E,null));else if(v.isDataTexture)if(k.length>0){ce&&Ce&&t.texStorage2D(i.TEXTURE_2D,se,w,k[0].width,k[0].height);for(let V=0,ne=k.length;V<ne;V++)I=k[V],ce?P&&t.texSubImage2D(i.TEXTURE_2D,V,0,0,I.width,I.height,h,E,I.data):t.texImage2D(i.TEXTURE_2D,V,w,I.width,I.height,0,h,E,I.data);v.generateMipmaps=!1}else ce?(Ce&&t.texStorage2D(i.TEXTURE_2D,se,w,l.width,l.height),P&&t.texSubImage2D(i.TEXTURE_2D,0,0,0,l.width,l.height,h,E,l.data)):t.texImage2D(i.TEXTURE_2D,0,w,l.width,l.height,0,h,E,l.data);else if(v.isCompressedTexture)if(v.isCompressedArrayTexture){ce&&Ce&&t.texStorage3D(i.TEXTURE_2D_ARRAY,se,w,k[0].width,k[0].height,l.depth);for(let V=0,ne=k.length;V<ne;V++)if(I=k[V],v.format!==1023)if(h!==null)if(ce){if(P)if(v.layerUpdates.size>0){const me=is(I.width,I.height,v.format,v.type);for(const pe of v.layerUpdates){const Ie=I.data.subarray(pe*me/I.data.BYTES_PER_ELEMENT,(pe+1)*me/I.data.BYTES_PER_ELEMENT);t.compressedTexSubImage3D(i.TEXTURE_2D_ARRAY,V,0,0,pe,I.width,I.height,1,h,Ie)}v.clearLayerUpdates()}else t.compressedTexSubImage3D(i.TEXTURE_2D_ARRAY,V,0,0,0,I.width,I.height,l.depth,h,I.data)}else t.compressedTexImage3D(i.TEXTURE_2D_ARRAY,V,w,I.width,I.height,l.depth,0,I.data,0,0);else console.warn("THREE.WebGLRenderer: Attempt to load unsupported compressed texture format in .uploadTexture()");else ce?P&&t.texSubImage3D(i.TEXTURE_2D_ARRAY,V,0,0,0,I.width,I.height,l.depth,h,E,I.data):t.texImage3D(i.TEXTURE_2D_ARRAY,V,w,I.width,I.height,l.depth,0,h,E,I.data)}else{ce&&Ce&&t.texStorage2D(i.TEXTURE_2D,se,w,k[0].width,k[0].height);for(let V=0,ne=k.length;V<ne;V++)I=k[V],v.format!==1023?h!==null?ce?P&&t.compressedTexSubImage2D(i.TEXTURE_2D,V,0,0,I.width,I.height,h,I.data):t.compressedTexImage2D(i.TEXTURE_2D,V,w,I.width,I.height,0,I.data):console.warn("THREE.WebGLRenderer: Attempt to load unsupported compressed texture format in .uploadTexture()"):ce?P&&t.texSubImage2D(i.TEXTURE_2D,V,0,0,I.width,I.height,h,E,I.data):t.texImage2D(i.TEXTURE_2D,V,w,I.width,I.height,0,h,E,I.data)}else if(v.isDataArrayTexture)if(ce){if(Ce&&t.texStorage3D(i.TEXTURE_2D_ARRAY,se,w,l.width,l.height,l.depth),P)if(v.layerUpdates.size>0){const V=is(l.width,l.height,v.format,v.type);for(const ne of v.layerUpdates){const me=l.data.subarray(ne*V/l.data.BYTES_PER_ELEMENT,(ne+1)*V/l.data.BYTES_PER_ELEMENT);t.texSubImage3D(i.TEXTURE_2D_ARRAY,0,0,0,ne,l.width,l.height,1,h,E,me)}v.clearLayerUpdates()}else t.texSubImage3D(i.TEXTURE_2D_ARRAY,0,0,0,0,l.width,l.height,l.depth,h,E,l.data)}else t.texImage3D(i.TEXTURE_2D_ARRAY,0,w,l.width,l.height,l.depth,0,h,E,l.data);else if(v.isData3DTexture)ce?(Ce&&t.texStorage3D(i.TEXTURE_3D,se,w,l.width,l.height,l.depth),P&&t.texSubImage3D(i.TEXTURE_3D,0,0,0,0,l.width,l.height,l.depth,h,E,l.data)):t.texImage3D(i.TEXTURE_3D,0,w,l.width,l.height,l.depth,0,h,E,l.data);else if(v.isFramebufferTexture){if(Ce)if(ce)t.texStorage2D(i.TEXTURE_2D,se,w,l.width,l.height);else{let V=l.width,ne=l.height;for(let me=0;me<se;me++)t.texImage2D(i.TEXTURE_2D,me,w,V,ne,0,h,E,null),V>>=1,ne>>=1}}else if(k.length>0){if(ce&&Ce){const V=Me(k[0]);t.texStorage2D(i.TEXTURE_2D,se,w,V.width,V.height)}for(let V=0,ne=k.length;V<ne;V++)I=k[V],ce?P&&t.texSubImage2D(i.TEXTURE_2D,V,0,0,h,E,I):t.texImage2D(i.TEXTURE_2D,V,w,h,E,I);v.generateMipmaps=!1}else if(ce){if(Ce){const V=Me(l);t.texStorage2D(i.TEXTURE_2D,se,w,V.width,V.height)}P&&t.texSubImage2D(i.TEXTURE_2D,0,0,0,h,E,l)}else t.texImage2D(i.TEXTURE_2D,0,w,h,E,l);_(v)&&d(J),Se.__version=Z.version,v.onUpdate&&v.onUpdate(v)}b.__version=v.version}function re(b,v,H){if(v.image.length!==6)return;const J=Ye(b,v),te=v.source;t.bindTexture(i.TEXTURE_CUBE_MAP,b.__webglTexture,i.TEXTURE0+H);const Z=n.get(te);if(te.version!==Z.__version||J===!0){t.activeTexture(i.TEXTURE0+H);const Se=ke.getPrimaries(ke.workingColorSpace),le=v.colorSpace===""?null:ke.getPrimaries(v.colorSpace),be=v.colorSpace===""||Se===le?i.NONE:i.BROWSER_DEFAULT_WEBGL;i.pixelStorei(i.UNPACK_FLIP_Y_WEBGL,v.flipY),i.pixelStorei(i.UNPACK_PREMULTIPLY_ALPHA_WEBGL,v.premultiplyAlpha),i.pixelStorei(i.UNPACK_ALIGNMENT,v.unpackAlignment),i.pixelStorei(i.UNPACK_COLORSPACE_CONVERSION_WEBGL,be);const x=v.isCompressedTexture||v.image[0].isCompressedTexture,l=v.image[0]&&v.image[0].isDataTexture,h=[];for(let ne=0;ne<6;ne++)!x&&!l?h[ne]=T(v.image[ne],!0,r.maxCubemapSize):h[ne]=l?v.image[ne].image:v.image[ne],h[ne]=Qe(v,h[ne]);const E=h[0],w=s.convert(v.format,v.colorSpace),I=s.convert(v.type),k=C(v.internalFormat,w,I,v.colorSpace),ce=v.isVideoTexture!==!0,Ce=Z.__version===void 0||J===!0,P=te.dataReady;let se=z(v,E);Be(i.TEXTURE_CUBE_MAP,v);let V;if(x){ce&&Ce&&t.texStorage2D(i.TEXTURE_CUBE_MAP,se,k,E.width,E.height);for(let ne=0;ne<6;ne++){V=h[ne].mipmaps;for(let me=0;me<V.length;me++){const pe=V[me];v.format!==1023?w!==null?ce?P&&t.compressedTexSubImage2D(i.TEXTURE_CUBE_MAP_POSITIVE_X+ne,me,0,0,pe.width,pe.height,w,pe.data):t.compressedTexImage2D(i.TEXTURE_CUBE_MAP_POSITIVE_X+ne,me,k,pe.width,pe.height,0,pe.data):console.warn("THREE.WebGLRenderer: Attempt to load unsupported compressed texture format in .setTextureCube()"):ce?P&&t.texSubImage2D(i.TEXTURE_CUBE_MAP_POSITIVE_X+ne,me,0,0,pe.width,pe.height,w,I,pe.data):t.texImage2D(i.TEXTURE_CUBE_MAP_POSITIVE_X+ne,me,k,pe.width,pe.height,0,w,I,pe.data)}}}else{if(V=v.mipmaps,ce&&Ce){V.length>0&&se++;const ne=Me(h[0]);t.texStorage2D(i.TEXTURE_CUBE_MAP,se,k,ne.width,ne.height)}for(let ne=0;ne<6;ne++)if(l){ce?P&&t.texSubImage2D(i.TEXTURE_CUBE_MAP_POSITIVE_X+ne,0,0,0,h[ne].width,h[ne].height,w,I,h[ne].data):t.texImage2D(i.TEXTURE_CUBE_MAP_POSITIVE_X+ne,0,k,h[ne].width,h[ne].height,0,w,I,h[ne].data);for(let me=0;me<V.length;me++){const Ie=V[me].image[ne].image;ce?P&&t.texSubImage2D(i.TEXTURE_CUBE_MAP_POSITIVE_X+ne,me+1,0,0,Ie.width,Ie.height,w,I,Ie.data):t.texImage2D(i.TEXTURE_CUBE_MAP_POSITIVE_X+ne,me+1,k,Ie.width,Ie.height,0,w,I,Ie.data)}}else{ce?P&&t.texSubImage2D(i.TEXTURE_CUBE_MAP_POSITIVE_X+ne,0,0,0,w,I,h[ne]):t.texImage2D(i.TEXTURE_CUBE_MAP_POSITIVE_X+ne,0,k,w,I,h[ne]);for(let me=0;me<V.length;me++){const pe=V[me];ce?P&&t.texSubImage2D(i.TEXTURE_CUBE_MAP_POSITIVE_X+ne,me+1,0,0,w,I,pe.image[ne]):t.texImage2D(i.TEXTURE_CUBE_MAP_POSITIVE_X+ne,me+1,k,w,I,pe.image[ne])}}}_(v)&&d(i.TEXTURE_CUBE_MAP),Z.__version=te.version,v.onUpdate&&v.onUpdate(v)}b.__version=v.version}function ve(b,v,H,J,te,Z){const Se=s.convert(H.format,H.colorSpace),le=s.convert(H.type),be=C(H.internalFormat,Se,le,H.colorSpace),x=n.get(v),l=n.get(H);if(l.__renderTarget=v,!x.__hasExternalTextures){const h=Math.max(1,v.width>>Z),E=Math.max(1,v.height>>Z);te===i.TEXTURE_3D||te===i.TEXTURE_2D_ARRAY?t.texImage3D(te,Z,be,h,E,v.depth,0,Se,le,null):t.texImage2D(te,Z,be,h,E,0,Se,le,null)}t.bindFramebuffer(i.FRAMEBUFFER,b),Fe(v)?o.framebufferTexture2DMultisampleEXT(i.FRAMEBUFFER,J,te,l.__webglTexture,0,Le(v)):(te===i.TEXTURE_2D||te>=i.TEXTURE_CUBE_MAP_POSITIVE_X&&te<=i.TEXTURE_CUBE_MAP_NEGATIVE_Z)&&i.framebufferTexture2D(i.FRAMEBUFFER,J,te,l.__webglTexture,Z),t.bindFramebuffer(i.FRAMEBUFFER,null)}function he(b,v,H){if(i.bindRenderbuffer(i.RENDERBUFFER,b),v.depthBuffer){const J=v.depthTexture,te=J&&J.isDepthTexture?J.type:null,Z=R(v.stencilBuffer,te),Se=v.stencilBuffer?i.DEPTH_STENCIL_ATTACHMENT:i.DEPTH_ATTACHMENT,le=Le(v);Fe(v)?o.renderbufferStorageMultisampleEXT(i.RENDERBUFFER,le,Z,v.width,v.height):H?i.renderbufferStorageMultisample(i.RENDERBUFFER,le,Z,v.width,v.height):i.renderbufferStorage(i.RENDERBUFFER,Z,v.width,v.height),i.framebufferRenderbuffer(i.FRAMEBUFFER,Se,i.RENDERBUFFER,b)}else{const J=v.textures;for(let te=0;te<J.length;te++){const Z=J[te],Se=s.convert(Z.format,Z.colorSpace),le=s.convert(Z.type),be=C(Z.internalFormat,Se,le,Z.colorSpace),x=Le(v);H&&Fe(v)===!1?i.renderbufferStorageMultisample(i.RENDERBUFFER,x,be,v.width,v.height):Fe(v)?o.renderbufferStorageMultisampleEXT(i.RENDERBUFFER,x,be,v.width,v.height):i.renderbufferStorage(i.RENDERBUFFER,be,v.width,v.height)}}i.bindRenderbuffer(i.RENDERBUFFER,null)}function Te(b,v){if(v&&v.isWebGLCubeRenderTarget)throw new Error("Depth Texture with cube render targets is not supported");if(t.bindFramebuffer(i.FRAMEBUFFER,b),!(v.depthTexture&&v.depthTexture.isDepthTexture))throw new Error("renderTarget.depthTexture must be an instance of THREE.DepthTexture");const J=n.get(v.depthTexture);J.__renderTarget=v,(!J.__webglTexture||v.depthTexture.image.width!==v.width||v.depthTexture.image.height!==v.height)&&(v.depthTexture.image.width=v.width,v.depthTexture.image.height=v.height,v.depthTexture.needsUpdate=!0),ie(v.depthTexture,0);const te=J.__webglTexture,Z=Le(v);if(v.depthTexture.format===1026)Fe(v)?o.framebufferTexture2DMultisampleEXT(i.FRAMEBUFFER,i.DEPTH_ATTACHMENT,i.TEXTURE_2D,te,0,Z):i.framebufferTexture2D(i.FRAMEBUFFER,i.DEPTH_ATTACHMENT,i.TEXTURE_2D,te,0);else if(v.depthTexture.format===1027)Fe(v)?o.framebufferTexture2DMultisampleEXT(i.FRAMEBUFFER,i.DEPTH_STENCIL_ATTACHMENT,i.TEXTURE_2D,te,0,Z):i.framebufferTexture2D(i.FRAMEBUFFER,i.DEPTH_STENCIL_ATTACHMENT,i.TEXTURE_2D,te,0);else throw new Error("Unknown depthTexture format")}function ze(b){const v=n.get(b),H=b.isWebGLCubeRenderTarget===!0;if(v.__boundDepthTexture!==b.depthTexture){const J=b.depthTexture;if(v.__depthDisposeCallback&&v.__depthDisposeCallback(),J){const te=()=>{delete v.__boundDepthTexture,delete v.__depthDisposeCallback,J.removeEventListener("dispose",te)};J.addEventListener("dispose",te),v.__depthDisposeCallback=te}v.__boundDepthTexture=J}if(b.depthTexture&&!v.__autoAllocateDepthBuffer){if(H)throw new Error("target.depthTexture not supported in Cube render targets");const J=b.texture.mipmaps;J&&J.length>0?Te(v.__webglFramebuffer[0],b):Te(v.__webglFramebuffer,b)}else if(H){v.__webglDepthbuffer=[];for(let J=0;J<6;J++)if(t.bindFramebuffer(i.FRAMEBUFFER,v.__webglFramebuffer[J]),v.__webglDepthbuffer[J]===void 0)v.__webglDepthbuffer[J]=i.createRenderbuffer(),he(v.__webglDepthbuffer[J],b,!1);else{const te=b.stencilBuffer?i.DEPTH_STENCIL_ATTACHMENT:i.DEPTH_ATTACHMENT,Z=v.__webglDepthbuffer[J];i.bindRenderbuffer(i.RENDERBUFFER,Z),i.framebufferRenderbuffer(i.FRAMEBUFFER,te,i.RENDERBUFFER,Z)}}else{const J=b.texture.mipmaps;if(J&&J.length>0?t.bindFramebuffer(i.FRAMEBUFFER,v.__webglFramebuffer[0]):t.bindFramebuffer(i.FRAMEBUFFER,v.__webglFramebuffer),v.__webglDepthbuffer===void 0)v.__webglDepthbuffer=i.createRenderbuffer(),he(v.__webglDepthbuffer,b,!1);else{const te=b.stencilBuffer?i.DEPTH_STENCIL_ATTACHMENT:i.DEPTH_ATTACHMENT,Z=v.__webglDepthbuffer;i.bindRenderbuffer(i.RENDERBUFFER,Z),i.framebufferRenderbuffer(i.FRAMEBUFFER,te,i.RENDERBUFFER,Z)}}t.bindFramebuffer(i.FRAMEBUFFER,null)}function we(b,v,H){const J=n.get(b);v!==void 0&&ve(J.__webglFramebuffer,b,b.texture,i.COLOR_ATTACHMENT0,i.TEXTURE_2D,0),H!==void 0&&ze(b)}function Ze(b){const v=b.texture,H=n.get(b),J=n.get(v);b.addEventListener("dispose",F);const te=b.textures,Z=b.isWebGLCubeRenderTarget===!0,Se=te.length>1;if(Se||(J.__webglTexture===void 0&&(J.__webglTexture=i.createTexture()),J.__version=v.version,a.memory.textures++),Z){H.__webglFramebuffer=[];for(let le=0;le<6;le++)if(v.mipmaps&&v.mipmaps.length>0){H.__webglFramebuffer[le]=[];for(let be=0;be<v.mipmaps.length;be++)H.__webglFramebuffer[le][be]=i.createFramebuffer()}else H.__webglFramebuffer[le]=i.createFramebuffer()}else{if(v.mipmaps&&v.mipmaps.length>0){H.__webglFramebuffer=[];for(let le=0;le<v.mipmaps.length;le++)H.__webglFramebuffer[le]=i.createFramebuffer()}else H.__webglFramebuffer=i.createFramebuffer();if(Se)for(let le=0,be=te.length;le<be;le++){const x=n.get(te[le]);x.__webglTexture===void 0&&(x.__webglTexture=i.createTexture(),a.memory.textures++)}if(b.samples>0&&Fe(b)===!1){H.__webglMultisampledFramebuffer=i.createFramebuffer(),H.__webglColorRenderbuffer=[],t.bindFramebuffer(i.FRAMEBUFFER,H.__webglMultisampledFramebuffer);for(let le=0;le<te.length;le++){const be=te[le];H.__webglColorRenderbuffer[le]=i.createRenderbuffer(),i.bindRenderbuffer(i.RENDERBUFFER,H.__webglColorRenderbuffer[le]);const x=s.convert(be.format,be.colorSpace),l=s.convert(be.type),h=C(be.internalFormat,x,l,be.colorSpace,b.isXRRenderTarget===!0),E=Le(b);i.renderbufferStorageMultisample(i.RENDERBUFFER,E,h,b.width,b.height),i.framebufferRenderbuffer(i.FRAMEBUFFER,i.COLOR_ATTACHMENT0+le,i.RENDERBUFFER,H.__webglColorRenderbuffer[le])}i.bindRenderbuffer(i.RENDERBUFFER,null),b.depthBuffer&&(H.__webglDepthRenderbuffer=i.createRenderbuffer(),he(H.__webglDepthRenderbuffer,b,!0)),t.bindFramebuffer(i.FRAMEBUFFER,null)}}if(Z){t.bindTexture(i.TEXTURE_CUBE_MAP,J.__webglTexture),Be(i.TEXTURE_CUBE_MAP,v);for(let le=0;le<6;le++)if(v.mipmaps&&v.mipmaps.length>0)for(let be=0;be<v.mipmaps.length;be++)ve(H.__webglFramebuffer[le][be],b,v,i.COLOR_ATTACHMENT0,i.TEXTURE_CUBE_MAP_POSITIVE_X+le,be);else ve(H.__webglFramebuffer[le],b,v,i.COLOR_ATTACHMENT0,i.TEXTURE_CUBE_MAP_POSITIVE_X+le,0);_(v)&&d(i.TEXTURE_CUBE_MAP),t.unbindTexture()}else if(Se){for(let le=0,be=te.length;le<be;le++){const x=te[le],l=n.get(x);t.bindTexture(i.TEXTURE_2D,l.__webglTexture),Be(i.TEXTURE_2D,x),ve(H.__webglFramebuffer,b,x,i.COLOR_ATTACHMENT0+le,i.TEXTURE_2D,0),_(x)&&d(i.TEXTURE_2D)}t.unbindTexture()}else{let le=i.TEXTURE_2D;if((b.isWebGL3DRenderTarget||b.isWebGLArrayRenderTarget)&&(le=b.isWebGL3DRenderTarget?i.TEXTURE_3D:i.TEXTURE_2D_ARRAY),t.bindTexture(le,J.__webglTexture),Be(le,v),v.mipmaps&&v.mipmaps.length>0)for(let be=0;be<v.mipmaps.length;be++)ve(H.__webglFramebuffer[be],b,v,i.COLOR_ATTACHMENT0,le,be);else ve(H.__webglFramebuffer,b,v,i.COLOR_ATTACHMENT0,le,0);_(v)&&d(le),t.unbindTexture()}b.depthBuffer&&ze(b)}function Je(b){const v=b.textures;for(let H=0,J=v.length;H<J;H++){const te=v[H];if(_(te)){const Z=U(b),Se=n.get(te).__webglTexture;t.bindTexture(Z,Se),d(Z),t.unbindTexture()}}}const Oe=[],D=[];function mt(b){if(b.samples>0){if(Fe(b)===!1){const v=b.textures,H=b.width,J=b.height;let te=i.COLOR_BUFFER_BIT;const Z=b.stencilBuffer?i.DEPTH_STENCIL_ATTACHMENT:i.DEPTH_ATTACHMENT,Se=n.get(b),le=v.length>1;if(le)for(let x=0;x<v.length;x++)t.bindFramebuffer(i.FRAMEBUFFER,Se.__webglMultisampledFramebuffer),i.framebufferRenderbuffer(i.FRAMEBUFFER,i.COLOR_ATTACHMENT0+x,i.RENDERBUFFER,null),t.bindFramebuffer(i.FRAMEBUFFER,Se.__webglFramebuffer),i.framebufferTexture2D(i.DRAW_FRAMEBUFFER,i.COLOR_ATTACHMENT0+x,i.TEXTURE_2D,null,0);t.bindFramebuffer(i.READ_FRAMEBUFFER,Se.__webglMultisampledFramebuffer);const be=b.texture.mipmaps;be&&be.length>0?t.bindFramebuffer(i.DRAW_FRAMEBUFFER,Se.__webglFramebuffer[0]):t.bindFramebuffer(i.DRAW_FRAMEBUFFER,Se.__webglFramebuffer);for(let x=0;x<v.length;x++){if(b.resolveDepthBuffer&&(b.depthBuffer&&(te|=i.DEPTH_BUFFER_BIT),b.stencilBuffer&&b.resolveStencilBuffer&&(te|=i.STENCIL_BUFFER_BIT)),le){i.framebufferRenderbuffer(i.READ_FRAMEBUFFER,i.COLOR_ATTACHMENT0,i.RENDERBUFFER,Se.__webglColorRenderbuffer[x]);const l=n.get(v[x]).__webglTexture;i.framebufferTexture2D(i.DRAW_FRAMEBUFFER,i.COLOR_ATTACHMENT0,i.TEXTURE_2D,l,0)}i.blitFramebuffer(0,0,H,J,0,0,H,J,te,i.NEAREST),u===!0&&(Oe.length=0,D.length=0,Oe.push(i.COLOR_ATTACHMENT0+x),b.depthBuffer&&b.resolveDepthBuffer===!1&&(Oe.push(Z),D.push(Z),i.invalidateFramebuffer(i.DRAW_FRAMEBUFFER,D)),i.invalidateFramebuffer(i.READ_FRAMEBUFFER,Oe))}if(t.bindFramebuffer(i.READ_FRAMEBUFFER,null),t.bindFramebuffer(i.DRAW_FRAMEBUFFER,null),le)for(let x=0;x<v.length;x++){t.bindFramebuffer(i.FRAMEBUFFER,Se.__webglMultisampledFramebuffer),i.framebufferRenderbuffer(i.FRAMEBUFFER,i.COLOR_ATTACHMENT0+x,i.RENDERBUFFER,Se.__webglColorRenderbuffer[x]);const l=n.get(v[x]).__webglTexture;t.bindFramebuffer(i.FRAMEBUFFER,Se.__webglFramebuffer),i.framebufferTexture2D(i.DRAW_FRAMEBUFFER,i.COLOR_ATTACHMENT0+x,i.TEXTURE_2D,l,0)}t.bindFramebuffer(i.DRAW_FRAMEBUFFER,Se.__webglMultisampledFramebuffer)}else if(b.depthBuffer&&b.resolveDepthBuffer===!1&&u){const v=b.stencilBuffer?i.DEPTH_STENCIL_ATTACHMENT:i.DEPTH_ATTACHMENT;i.invalidateFramebuffer(i.DRAW_FRAMEBUFFER,[v])}}}function Le(b){return Math.min(r.maxSamples,b.samples)}function Fe(b){const v=n.get(b);return b.samples>0&&e.has("WEBGL_multisampled_render_to_texture")===!0&&v.__useRenderToTexture!==!1}function ye(b){const v=a.render.frame;c.get(b)!==v&&(c.set(b,v),b.update())}function Qe(b,v){const H=b.colorSpace,J=b.format,te=b.type;return b.isCompressedTexture===!0||b.isVideoTexture===!0||H!==Nn&&H!==""&&(ke.getTransfer(H)===je?(J!==1023||te!==1009)&&console.warn("THREE.WebGLTextures: sRGB encoded textures have to use RGBAFormat and UnsignedByteType."):console.error("THREE.WebGLTextures: Unsupported texture color space:",H)),v}function Me(b){return typeof HTMLImageElement<"u"&&b instanceof HTMLImageElement?(f.width=b.naturalWidth||b.width,f.height=b.naturalHeight||b.height):typeof VideoFrame<"u"&&b instanceof VideoFrame?(f.width=b.displayWidth,f.height=b.displayHeight):(f.width=b.width,f.height=b.height),f}this.allocateTextureUnit=Y,this.resetTextureUnits=ee,this.setTexture2D=ie,this.setTexture2DArray=j,this.setTexture3D=oe,this.setTextureCube=K,this.rebindTextures=we,this.setupRenderTarget=Ze,this.updateRenderTargetMipmap=Je,this.updateMultisampleRenderTarget=mt,this.setupDepthRenderbuffer=ze,this.setupFrameBufferTexture=ve,this.useMultisampledRTT=Fe}function Ph(i,e){function t(n,r=""){let s;const a=ke.getTransfer(r);if(n===1009)return i.UNSIGNED_BYTE;if(n===1017)return i.UNSIGNED_SHORT_4_4_4_4;if(n===1018)return i.UNSIGNED_SHORT_5_5_5_1;if(n===35902)return i.UNSIGNED_INT_5_9_9_9_REV;if(n===1010)return i.BYTE;if(n===1011)return i.SHORT;if(n===1012)return i.UNSIGNED_SHORT;if(n===1013)return i.INT;if(n===1014)return i.UNSIGNED_INT;if(n===1015)return i.FLOAT;if(n===1016)return i.HALF_FLOAT;if(n===1021)return i.ALPHA;if(n===1022)return i.RGB;if(n===1023)return i.RGBA;if(n===1026)return i.DEPTH_COMPONENT;if(n===1027)return i.DEPTH_STENCIL;if(n===1028)return i.RED;if(n===1029)return i.RED_INTEGER;if(n===1030)return i.RG;if(n===1031)return i.RG_INTEGER;if(n===1033)return i.RGBA_INTEGER;if(n===33776||n===33777||n===33778||n===33779)if(a===je)if(s=e.get("WEBGL_compressed_texture_s3tc_srgb"),s!==null){if(n===33776)return s.COMPRESSED_SRGB_S3TC_DXT1_EXT;if(n===33777)return s.COMPRESSED_SRGB_ALPHA_S3TC_DXT1_EXT;if(n===33778)return s.COMPRESSED_SRGB_ALPHA_S3TC_DXT3_EXT;if(n===33779)return s.COMPRESSED_SRGB_ALPHA_S3TC_DXT5_EXT}else return null;else if(s=e.get("WEBGL_compressed_texture_s3tc"),s!==null){if(n===33776)return s.COMPRESSED_RGB_S3TC_DXT1_EXT;if(n===33777)return s.COMPRESSED_RGBA_S3TC_DXT1_EXT;if(n===33778)return s.COMPRESSED_RGBA_S3TC_DXT3_EXT;if(n===33779)return s.COMPRESSED_RGBA_S3TC_DXT5_EXT}else return null;if(n===35840||n===35841||n===35842||n===35843)if(s=e.get("WEBGL_compressed_texture_pvrtc"),s!==null){if(n===35840)return s.COMPRESSED_RGB_PVRTC_4BPPV1_IMG;if(n===35841)return s.COMPRESSED_RGB_PVRTC_2BPPV1_IMG;if(n===35842)return s.COMPRESSED_RGBA_PVRTC_4BPPV1_IMG;if(n===35843)return s.COMPRESSED_RGBA_PVRTC_2BPPV1_IMG}else return null;if(n===36196||n===37492||n===37496)if(s=e.get("WEBGL_compressed_texture_etc"),s!==null){if(n===36196||n===37492)return a===je?s.COMPRESSED_SRGB8_ETC2:s.COMPRESSED_RGB8_ETC2;if(n===37496)return a===je?s.COMPRESSED_SRGB8_ALPHA8_ETC2_EAC:s.COMPRESSED_RGBA8_ETC2_EAC}else return null;if(n===37808||n===37809||n===37810||n===37811||n===37812||n===37813||n===37814||n===37815||n===37816||n===37817||n===37818||n===37819||n===37820||n===37821)if(s=e.get("WEBGL_compressed_texture_astc"),s!==null){if(n===37808)return a===je?s.COMPRESSED_SRGB8_ALPHA8_ASTC_4x4_KHR:s.COMPRESSED_RGBA_ASTC_4x4_KHR;if(n===37809)return a===je?s.COMPRESSED_SRGB8_ALPHA8_ASTC_5x4_KHR:s.COMPRESSED_RGBA_ASTC_5x4_KHR;if(n===37810)return a===je?s.COMPRESSED_SRGB8_ALPHA8_ASTC_5x5_KHR:s.COMPRESSED_RGBA_ASTC_5x5_KHR;if(n===37811)return a===je?s.COMPRESSED_SRGB8_ALPHA8_ASTC_6x5_KHR:s.COMPRESSED_RGBA_ASTC_6x5_KHR;if(n===37812)return a===je?s.COMPRESSED_SRGB8_ALPHA8_ASTC_6x6_KHR:s.COMPRESSED_RGBA_ASTC_6x6_KHR;if(n===37813)return a===je?s.COMPRESSED_SRGB8_ALPHA8_ASTC_8x5_KHR:s.COMPRESSED_RGBA_ASTC_8x5_KHR;if(n===37814)return a===je?s.COMPRESSED_SRGB8_ALPHA8_ASTC_8x6_KHR:s.COMPRESSED_RGBA_ASTC_8x6_KHR;if(n===37815)return a===je?s.COMPRESSED_SRGB8_ALPHA8_ASTC_8x8_KHR:s.COMPRESSED_RGBA_ASTC_8x8_KHR;if(n===37816)return a===je?s.COMPRESSED_SRGB8_ALPHA8_ASTC_10x5_KHR:s.COMPRESSED_RGBA_ASTC_10x5_KHR;if(n===37817)return a===je?s.COMPRESSED_SRGB8_ALPHA8_ASTC_10x6_KHR:s.COMPRESSED_RGBA_ASTC_10x6_KHR;if(n===37818)return a===je?s.COMPRESSED_SRGB8_ALPHA8_ASTC_10x8_KHR:s.COMPRESSED_RGBA_ASTC_10x8_KHR;if(n===37819)return a===je?s.COMPRESSED_SRGB8_ALPHA8_ASTC_10x10_KHR:s.COMPRESSED_RGBA_ASTC_10x10_KHR;if(n===37820)return a===je?s.COMPRESSED_SRGB8_ALPHA8_ASTC_12x10_KHR:s.COMPRESSED_RGBA_ASTC_12x10_KHR;if(n===37821)return a===je?s.COMPRESSED_SRGB8_ALPHA8_ASTC_12x12_KHR:s.COMPRESSED_RGBA_ASTC_12x12_KHR}else return null;if(n===36492||n===36494||n===36495)if(s=e.get("EXT_texture_compression_bptc"),s!==null){if(n===36492)return a===je?s.COMPRESSED_SRGB_ALPHA_BPTC_UNORM_EXT:s.COMPRESSED_RGBA_BPTC_UNORM_EXT;if(n===36494)return s.COMPRESSED_RGB_BPTC_SIGNED_FLOAT_EXT;if(n===36495)return s.COMPRESSED_RGB_BPTC_UNSIGNED_FLOAT_EXT}else return null;if(n===36283||n===36284||n===36285||n===36286)if(s=e.get("EXT_texture_compression_rgtc"),s!==null){if(n===36492)return s.COMPRESSED_RED_RGTC1_EXT;if(n===36284)return s.COMPRESSED_SIGNED_RED_RGTC1_EXT;if(n===36285)return s.COMPRESSED_RED_GREEN_RGTC2_EXT;if(n===36286)return s.COMPRESSED_SIGNED_RED_GREEN_RGTC2_EXT}else return null;return n===1020?i.UNSIGNED_INT_24_8:i[n]!==void 0?i[n]:null}return{convert:t}}const Dh=`
void main() {

	gl_Position = vec4( position, 1.0 );

}`,Ih=`
uniform sampler2DArray depthColor;
uniform float depthWidth;
uniform float depthHeight;

void main() {

	vec2 coord = vec2( gl_FragCoord.x / depthWidth, gl_FragCoord.y / depthHeight );

	if ( coord.x >= 1.0 ) {

		gl_FragDepth = texture( depthColor, vec3( coord.x - 1.0, coord.y, 1 ) ).r;

	} else {

		gl_FragDepth = texture( depthColor, vec3( coord.x, coord.y, 0 ) ).r;

	}

}`;class Uh{constructor(){this.texture=null,this.mesh=null,this.depthNear=0,this.depthFar=0}init(e,t,n){if(this.texture===null){const r=new ht,s=e.properties.get(r);s.__webglTexture=t.texture,(t.depthNear!==n.depthNear||t.depthFar!==n.depthFar)&&(this.depthNear=t.depthNear,this.depthFar=t.depthFar),this.texture=r}}getMesh(e){if(this.texture!==null&&this.mesh===null){const t=e.cameras[0].viewport,n=new nn({vertexShader:Dh,fragmentShader:Ih,uniforms:{depthColor:{value:this.texture},depthWidth:{value:t.z},depthHeight:{value:t.w}}});this.mesh=new Nt(new Ii(20,20),n)}return this.mesh}reset(){this.texture=null,this.mesh=null}getDepthTexture(){return this.texture}}class Lh extends On{constructor(e,t){super();const n=this;let r=null,s=1,a=null,o="local-floor",u=1,f=null,c=null,p=null,m=null,g=null,S=null;const T=new Uh,_=t.getContextAttributes();let d=null,U=null;const C=[],R=[],z=new qe;let L=null;const F=new Lt;F.viewport=new rt;const G=new Lt;G.viewport=new rt;const A=[F,G],y=new eo;let N=null,ee=null;this.cameraAutoUpdate=!0,this.enabled=!1,this.isPresenting=!1,this.getController=function($){let re=C[$];return re===void 0&&(re=new nr,C[$]=re),re.getTargetRaySpace()},this.getControllerGrip=function($){let re=C[$];return re===void 0&&(re=new nr,C[$]=re),re.getGripSpace()},this.getHand=function($){let re=C[$];return re===void 0&&(re=new nr,C[$]=re),re.getHandSpace()};function Y($){const re=R.indexOf($.inputSource);if(re===-1)return;const ve=C[re];ve!==void 0&&(ve.update($.inputSource,$.frame,f||a),ve.dispatchEvent({type:$.type,data:$.inputSource}))}function Q(){r.removeEventListener("select",Y),r.removeEventListener("selectstart",Y),r.removeEventListener("selectend",Y),r.removeEventListener("squeeze",Y),r.removeEventListener("squeezestart",Y),r.removeEventListener("squeezeend",Y),r.removeEventListener("end",Q),r.removeEventListener("inputsourceschange",ie);for(let $=0;$<C.length;$++){const re=R[$];re!==null&&(R[$]=null,C[$].disconnect(re))}N=null,ee=null,T.reset(),e.setRenderTarget(d),g=null,m=null,p=null,r=null,U=null,Ye.stop(),n.isPresenting=!1,e.setPixelRatio(L),e.setSize(z.width,z.height,!1),n.dispatchEvent({type:"sessionend"})}this.setFramebufferScaleFactor=function($){s=$,n.isPresenting===!0&&console.warn("THREE.WebXRManager: Cannot change framebuffer scale while presenting.")},this.setReferenceSpaceType=function($){o=$,n.isPresenting===!0&&console.warn("THREE.WebXRManager: Cannot change reference space type while presenting.")},this.getReferenceSpace=function(){return f||a},this.setReferenceSpace=function($){f=$},this.getBaseLayer=function(){return m!==null?m:g},this.getBinding=function(){return p},this.getFrame=function(){return S},this.getSession=function(){return r},this.setSession=async function($){if(r=$,r!==null){if(d=e.getRenderTarget(),r.addEventListener("select",Y),r.addEventListener("selectstart",Y),r.addEventListener("selectend",Y),r.addEventListener("squeeze",Y),r.addEventListener("squeezestart",Y),r.addEventListener("squeezeend",Y),r.addEventListener("end",Q),r.addEventListener("inputsourceschange",ie),_.xrCompatible!==!0&&await t.makeXRCompatible(),L=e.getPixelRatio(),e.getSize(z),typeof XRWebGLBinding<"u"&&"createProjectionLayer"in XRWebGLBinding.prototype){let ve=null,he=null,Te=null;_.depth&&(Te=_.stencil?t.DEPTH24_STENCIL8:t.DEPTH_COMPONENT24,ve=_.stencil?1027:1026,he=_.stencil?1020:1014);const ze={colorFormat:t.RGBA8,depthFormat:Te,scaleFactor:s};p=new XRWebGLBinding(r,t),m=p.createProjectionLayer(ze),r.updateRenderState({layers:[m]}),e.setPixelRatio(1),e.setSize(m.textureWidth,m.textureHeight,!1),U=new mn(m.textureWidth,m.textureHeight,{format:1023,type:1009,depthTexture:new Os(m.textureWidth,m.textureHeight,he,void 0,void 0,void 0,void 0,void 0,void 0,ve),stencilBuffer:_.stencil,colorSpace:e.outputColorSpace,samples:_.antialias?4:0,resolveDepthBuffer:m.ignoreDepthValues===!1,resolveStencilBuffer:m.ignoreDepthValues===!1})}else{const ve={antialias:_.antialias,alpha:!0,depth:_.depth,stencil:_.stencil,framebufferScaleFactor:s};g=new XRWebGLLayer(r,t,ve),r.updateRenderState({baseLayer:g}),e.setPixelRatio(1),e.setSize(g.framebufferWidth,g.framebufferHeight,!1),U=new mn(g.framebufferWidth,g.framebufferHeight,{format:1023,type:1009,colorSpace:e.outputColorSpace,stencilBuffer:_.stencil,resolveDepthBuffer:g.ignoreDepthValues===!1,resolveStencilBuffer:g.ignoreDepthValues===!1})}U.isXRRenderTarget=!0,this.setFoveation(u),f=null,a=await r.requestReferenceSpace(o),Ye.setContext(r),Ye.start(),n.isPresenting=!0,n.dispatchEvent({type:"sessionstart"})}},this.getEnvironmentBlendMode=function(){if(r!==null)return r.environmentBlendMode},this.getDepthTexture=function(){return T.getDepthTexture()};function ie($){for(let re=0;re<$.removed.length;re++){const ve=$.removed[re],he=R.indexOf(ve);he>=0&&(R[he]=null,C[he].disconnect(ve))}for(let re=0;re<$.added.length;re++){const ve=$.added[re];let he=R.indexOf(ve);if(he===-1){for(let ze=0;ze<C.length;ze++)if(ze>=R.length){R.push(ve),he=ze;break}else if(R[ze]===null){R[ze]=ve,he=ze;break}if(he===-1)break}const Te=C[he];Te&&Te.connect(ve)}}const j=new q,oe=new q;function K($,re,ve){j.setFromMatrixPosition(re.matrixWorld),oe.setFromMatrixPosition(ve.matrixWorld);const he=j.distanceTo(oe),Te=re.projectionMatrix.elements,ze=ve.projectionMatrix.elements,we=Te[14]/(Te[10]-1),Ze=Te[14]/(Te[10]+1),Je=(Te[9]+1)/Te[5],Oe=(Te[9]-1)/Te[5],D=(Te[8]-1)/Te[0],mt=(ze[8]+1)/ze[0],Le=we*D,Fe=we*mt,ye=he/(-D+mt),Qe=ye*-D;if(re.matrixWorld.decompose($.position,$.quaternion,$.scale),$.translateX(Qe),$.translateZ(ye),$.matrixWorld.compose($.position,$.quaternion,$.scale),$.matrixWorldInverse.copy($.matrixWorld).invert(),Te[10]===-1)$.projectionMatrix.copy(re.projectionMatrix),$.projectionMatrixInverse.copy(re.projectionMatrixInverse);else{const Me=we+ye,b=Ze+ye,v=Le-Qe,H=Fe+(he-Qe),J=Je*Ze/b*Me,te=Oe*Ze/b*Me;$.projectionMatrix.makePerspective(v,H,J,te,Me,b),$.projectionMatrixInverse.copy($.projectionMatrix).invert()}}function fe($,re){re===null?$.matrixWorld.copy($.matrix):$.matrixWorld.multiplyMatrices(re.matrixWorld,$.matrix),$.matrixWorldInverse.copy($.matrixWorld).invert()}this.updateCamera=function($){if(r===null)return;let re=$.near,ve=$.far;T.texture!==null&&(T.depthNear>0&&(re=T.depthNear),T.depthFar>0&&(ve=T.depthFar)),y.near=G.near=F.near=re,y.far=G.far=F.far=ve,(N!==y.near||ee!==y.far)&&(r.updateRenderState({depthNear:y.near,depthFar:y.far}),N=y.near,ee=y.far),F.layers.mask=$.layers.mask|2,G.layers.mask=$.layers.mask|4,y.layers.mask=F.layers.mask|G.layers.mask;const he=$.parent,Te=y.cameras;fe(y,he);for(let ze=0;ze<Te.length;ze++)fe(Te[ze],he);Te.length===2?K(y,F,G):y.projectionMatrix.copy(F.projectionMatrix),_e($,y,he)};function _e($,re,ve){ve===null?$.matrix.copy(re.matrixWorld):($.matrix.copy(ve.matrixWorld),$.matrix.invert(),$.matrix.multiply(re.matrixWorld)),$.matrix.decompose($.position,$.quaternion,$.scale),$.updateMatrixWorld(!0),$.projectionMatrix.copy(re.projectionMatrix),$.projectionMatrixInverse.copy(re.projectionMatrixInverse),$.isPerspectiveCamera&&($.fov=Jn*2*Math.atan(1/$.projectionMatrix.elements[5]),$.zoom=1)}this.getCamera=function(){return y},this.getFoveation=function(){if(!(m===null&&g===null))return u},this.setFoveation=function($){u=$,m!==null&&(m.fixedFoveation=$),g!==null&&g.fixedFoveation!==void 0&&(g.fixedFoveation=$)},this.hasDepthSensing=function(){return T.texture!==null},this.getDepthSensingMesh=function(){return T.getMesh(y)};let Ee=null;function Be($,re){if(c=re.getViewerPose(f||a),S=re,c!==null){const ve=c.views;g!==null&&(e.setRenderTargetFramebuffer(U,g.framebuffer),e.setRenderTarget(U));let he=!1;ve.length!==y.cameras.length&&(y.cameras.length=0,he=!0);for(let we=0;we<ve.length;we++){const Ze=ve[we];let Je=null;if(g!==null)Je=g.getViewport(Ze);else{const D=p.getViewSubImage(m,Ze);Je=D.viewport,we===0&&(e.setRenderTargetTextures(U,D.colorTexture,D.depthStencilTexture),e.setRenderTarget(U))}let Oe=A[we];Oe===void 0&&(Oe=new Lt,Oe.layers.enable(we),Oe.viewport=new rt,A[we]=Oe),Oe.matrix.fromArray(Ze.transform.matrix),Oe.matrix.decompose(Oe.position,Oe.quaternion,Oe.scale),Oe.projectionMatrix.fromArray(Ze.projectionMatrix),Oe.projectionMatrixInverse.copy(Oe.projectionMatrix).invert(),Oe.viewport.set(Je.x,Je.y,Je.width,Je.height),we===0&&(y.matrix.copy(Oe.matrix),y.matrix.decompose(y.position,y.quaternion,y.scale)),he===!0&&y.cameras.push(Oe)}const Te=r.enabledFeatures;if(Te&&Te.includes("depth-sensing")&&r.depthUsage=="gpu-optimized"&&p){const we=p.getDepthInformation(ve[0]);we&&we.isValid&&we.texture&&T.init(e,we,r.renderState)}}for(let ve=0;ve<C.length;ve++){const he=R[ve],Te=C[ve];he!==null&&Te!==void 0&&Te.update(he,re,f||a)}Ee&&Ee($,re),re.detectedPlanes&&n.dispatchEvent({type:"planesdetected",data:re}),S=null}const Ye=new Vs;Ye.setAnimationLoop(Be),this.setAnimationLoop=function($){Ee=$},this.dispose=function(){}}}const hn=new $t,Fh=new et;function Nh(i,e){function t(_,d){_.matrixAutoUpdate===!0&&_.updateMatrix(),d.value.copy(_.matrix)}function n(_,d){d.color.getRGB(_.fogColor.value,Ls(i)),d.isFog?(_.fogNear.value=d.near,_.fogFar.value=d.far):d.isFogExp2&&(_.fogDensity.value=d.density)}function r(_,d,U,C,R){d.isMeshBasicMaterial||d.isMeshLambertMaterial?s(_,d):d.isMeshToonMaterial?(s(_,d),p(_,d)):d.isMeshPhongMaterial?(s(_,d),c(_,d)):d.isMeshStandardMaterial?(s(_,d),m(_,d),d.isMeshPhysicalMaterial&&g(_,d,R)):d.isMeshMatcapMaterial?(s(_,d),S(_,d)):d.isMeshDepthMaterial?s(_,d):d.isMeshDistanceMaterial?(s(_,d),T(_,d)):d.isMeshNormalMaterial?s(_,d):d.isLineBasicMaterial?(a(_,d),d.isLineDashedMaterial&&o(_,d)):d.isPointsMaterial?u(_,d,U,C):d.isSpriteMaterial?f(_,d):d.isShadowMaterial?(_.color.value.copy(d.color),_.opacity.value=d.opacity):d.isShaderMaterial&&(d.uniformsNeedUpdate=!1)}function s(_,d){_.opacity.value=d.opacity,d.color&&_.diffuse.value.copy(d.color),d.emissive&&_.emissive.value.copy(d.emissive).multiplyScalar(d.emissiveIntensity),d.map&&(_.map.value=d.map,t(d.map,_.mapTransform)),d.alphaMap&&(_.alphaMap.value=d.alphaMap,t(d.alphaMap,_.alphaMapTransform)),d.bumpMap&&(_.bumpMap.value=d.bumpMap,t(d.bumpMap,_.bumpMapTransform),_.bumpScale.value=d.bumpScale,d.side===1&&(_.bumpScale.value*=-1)),d.normalMap&&(_.normalMap.value=d.normalMap,t(d.normalMap,_.normalMapTransform),_.normalScale.value.copy(d.normalScale),d.side===1&&_.normalScale.value.negate()),d.displacementMap&&(_.displacementMap.value=d.displacementMap,t(d.displacementMap,_.displacementMapTransform),_.displacementScale.value=d.displacementScale,_.displacementBias.value=d.displacementBias),d.emissiveMap&&(_.emissiveMap.value=d.emissiveMap,t(d.emissiveMap,_.emissiveMapTransform)),d.specularMap&&(_.specularMap.value=d.specularMap,t(d.specularMap,_.specularMapTransform)),d.alphaTest>0&&(_.alphaTest.value=d.alphaTest);const U=e.get(d),C=U.envMap,R=U.envMapRotation;C&&(_.envMap.value=C,hn.copy(R),hn.x*=-1,hn.y*=-1,hn.z*=-1,C.isCubeTexture&&C.isRenderTargetTexture===!1&&(hn.y*=-1,hn.z*=-1),_.envMapRotation.value.setFromMatrix4(Fh.makeRotationFromEuler(hn)),_.flipEnvMap.value=C.isCubeTexture&&C.isRenderTargetTexture===!1?-1:1,_.reflectivity.value=d.reflectivity,_.ior.value=d.ior,_.refractionRatio.value=d.refractionRatio),d.lightMap&&(_.lightMap.value=d.lightMap,_.lightMapIntensity.value=d.lightMapIntensity,t(d.lightMap,_.lightMapTransform)),d.aoMap&&(_.aoMap.value=d.aoMap,_.aoMapIntensity.value=d.aoMapIntensity,t(d.aoMap,_.aoMapTransform))}function a(_,d){_.diffuse.value.copy(d.color),_.opacity.value=d.opacity,d.map&&(_.map.value=d.map,t(d.map,_.mapTransform))}function o(_,d){_.dashSize.value=d.dashSize,_.totalSize.value=d.dashSize+d.gapSize,_.scale.value=d.scale}function u(_,d,U,C){_.diffuse.value.copy(d.color),_.opacity.value=d.opacity,_.size.value=d.size*U,_.scale.value=C*.5,d.map&&(_.map.value=d.map,t(d.map,_.uvTransform)),d.alphaMap&&(_.alphaMap.value=d.alphaMap,t(d.alphaMap,_.alphaMapTransform)),d.alphaTest>0&&(_.alphaTest.value=d.alphaTest)}function f(_,d){_.diffuse.value.copy(d.color),_.opacity.value=d.opacity,_.rotation.value=d.rotation,d.map&&(_.map.value=d.map,t(d.map,_.mapTransform)),d.alphaMap&&(_.alphaMap.value=d.alphaMap,t(d.alphaMap,_.alphaMapTransform)),d.alphaTest>0&&(_.alphaTest.value=d.alphaTest)}function c(_,d){_.specular.value.copy(d.specular),_.shininess.value=Math.max(d.shininess,1e-4)}function p(_,d){d.gradientMap&&(_.gradientMap.value=d.gradientMap)}function m(_,d){_.metalness.value=d.metalness,d.metalnessMap&&(_.metalnessMap.value=d.metalnessMap,t(d.metalnessMap,_.metalnessMapTransform)),_.roughness.value=d.roughness,d.roughnessMap&&(_.roughnessMap.value=d.roughnessMap,t(d.roughnessMap,_.roughnessMapTransform)),d.envMap&&(_.envMapIntensity.value=d.envMapIntensity)}function g(_,d,U){_.ior.value=d.ior,d.sheen>0&&(_.sheenColor.value.copy(d.sheenColor).multiplyScalar(d.sheen),_.sheenRoughness.value=d.sheenRoughness,d.sheenColorMap&&(_.sheenColorMap.value=d.sheenColorMap,t(d.sheenColorMap,_.sheenColorMapTransform)),d.sheenRoughnessMap&&(_.sheenRoughnessMap.value=d.sheenRoughnessMap,t(d.sheenRoughnessMap,_.sheenRoughnessMapTransform))),d.clearcoat>0&&(_.clearcoat.value=d.clearcoat,_.clearcoatRoughness.value=d.clearcoatRoughness,d.clearcoatMap&&(_.clearcoatMap.value=d.clearcoatMap,t(d.clearcoatMap,_.clearcoatMapTransform)),d.clearcoatRoughnessMap&&(_.clearcoatRoughnessMap.value=d.clearcoatRoughnessMap,t(d.clearcoatRoughnessMap,_.clearcoatRoughnessMapTransform)),d.clearcoatNormalMap&&(_.clearcoatNormalMap.value=d.clearcoatNormalMap,t(d.clearcoatNormalMap,_.clearcoatNormalMapTransform),_.clearcoatNormalScale.value.copy(d.clearcoatNormalScale),d.side===1&&_.clearcoatNormalScale.value.negate())),d.dispersion>0&&(_.dispersion.value=d.dispersion),d.iridescence>0&&(_.iridescence.value=d.iridescence,_.iridescenceIOR.value=d.iridescenceIOR,_.iridescenceThicknessMinimum.value=d.iridescenceThicknessRange[0],_.iridescenceThicknessMaximum.value=d.iridescenceThicknessRange[1],d.iridescenceMap&&(_.iridescenceMap.value=d.iridescenceMap,t(d.iridescenceMap,_.iridescenceMapTransform)),d.iridescenceThicknessMap&&(_.iridescenceThicknessMap.value=d.iridescenceThicknessMap,t(d.iridescenceThicknessMap,_.iridescenceThicknessMapTransform))),d.transmission>0&&(_.transmission.value=d.transmission,_.transmissionSamplerMap.value=U.texture,_.transmissionSamplerSize.value.set(U.width,U.height),d.transmissionMap&&(_.transmissionMap.value=d.transmissionMap,t(d.transmissionMap,_.transmissionMapTransform)),_.thickness.value=d.thickness,d.thicknessMap&&(_.thicknessMap.value=d.thicknessMap,t(d.thicknessMap,_.thicknessMapTransform)),_.attenuationDistance.value=d.attenuationDistance,_.attenuationColor.value.copy(d.attenuationColor)),d.anisotropy>0&&(_.anisotropyVector.value.set(d.anisotropy*Math.cos(d.anisotropyRotation),d.anisotropy*Math.sin(d.anisotropyRotation)),d.anisotropyMap&&(_.anisotropyMap.value=d.anisotropyMap,t(d.anisotropyMap,_.anisotropyMapTransform))),_.specularIntensity.value=d.specularIntensity,_.specularColor.value.copy(d.specularColor),d.specularColorMap&&(_.specularColorMap.value=d.specularColorMap,t(d.specularColorMap,_.specularColorMapTransform)),d.specularIntensityMap&&(_.specularIntensityMap.value=d.specularIntensityMap,t(d.specularIntensityMap,_.specularIntensityMapTransform))}function S(_,d){d.matcap&&(_.matcap.value=d.matcap)}function T(_,d){const U=e.get(d).light;_.referencePosition.value.setFromMatrixPosition(U.matrixWorld),_.nearDistance.value=U.shadow.camera.near,_.farDistance.value=U.shadow.camera.far}return{refreshFogUniforms:n,refreshMaterialUniforms:r}}function Bh(i,e,t,n){let r={},s={},a=[];const o=i.getParameter(i.MAX_UNIFORM_BUFFER_BINDINGS);function u(U,C){const R=C.program;n.uniformBlockBinding(U,R)}function f(U,C){let R=r[U.id];R===void 0&&(S(U),R=c(U),r[U.id]=R,U.addEventListener("dispose",_));const z=C.program;n.updateUBOMapping(U,z);const L=e.render.frame;s[U.id]!==L&&(m(U),s[U.id]=L)}function c(U){const C=p();U.__bindingPointIndex=C;const R=i.createBuffer(),z=U.__size,L=U.usage;return i.bindBuffer(i.UNIFORM_BUFFER,R),i.bufferData(i.UNIFORM_BUFFER,z,L),i.bindBuffer(i.UNIFORM_BUFFER,null),i.bindBufferBase(i.UNIFORM_BUFFER,C,R),R}function p(){for(let U=0;U<o;U++)if(a.indexOf(U)===-1)return a.push(U),U;return console.error("THREE.WebGLRenderer: Maximum number of simultaneously usable uniforms groups reached."),0}function m(U){const C=r[U.id],R=U.uniforms,z=U.__cache;i.bindBuffer(i.UNIFORM_BUFFER,C);for(let L=0,F=R.length;L<F;L++){const G=Array.isArray(R[L])?R[L]:[R[L]];for(let A=0,y=G.length;A<y;A++){const N=G[A];if(g(N,L,A,z)===!0){const ee=N.__offset,Y=Array.isArray(N.value)?N.value:[N.value];let Q=0;for(let ie=0;ie<Y.length;ie++){const j=Y[ie],oe=T(j);typeof j=="number"||typeof j=="boolean"?(N.__data[0]=j,i.bufferSubData(i.UNIFORM_BUFFER,ee+Q,N.__data)):j.isMatrix3?(N.__data[0]=j.elements[0],N.__data[1]=j.elements[1],N.__data[2]=j.elements[2],N.__data[3]=0,N.__data[4]=j.elements[3],N.__data[5]=j.elements[4],N.__data[6]=j.elements[5],N.__data[7]=0,N.__data[8]=j.elements[6],N.__data[9]=j.elements[7],N.__data[10]=j.elements[8],N.__data[11]=0):(j.toArray(N.__data,Q),Q+=oe.storage/Float32Array.BYTES_PER_ELEMENT)}i.bufferSubData(i.UNIFORM_BUFFER,ee,N.__data)}}}i.bindBuffer(i.UNIFORM_BUFFER,null)}function g(U,C,R,z){const L=U.value,F=C+"_"+R;if(z[F]===void 0)return typeof L=="number"||typeof L=="boolean"?z[F]=L:z[F]=L.clone(),!0;{const G=z[F];if(typeof L=="number"||typeof L=="boolean"){if(G!==L)return z[F]=L,!0}else if(G.equals(L)===!1)return G.copy(L),!0}return!1}function S(U){const C=U.uniforms;let R=0;const z=16;for(let F=0,G=C.length;F<G;F++){const A=Array.isArray(C[F])?C[F]:[C[F]];for(let y=0,N=A.length;y<N;y++){const ee=A[y],Y=Array.isArray(ee.value)?ee.value:[ee.value];for(let Q=0,ie=Y.length;Q<ie;Q++){const j=Y[Q],oe=T(j),K=R%z,fe=K%oe.boundary,_e=K+fe;R+=fe,_e!==0&&z-_e<oe.storage&&(R+=z-_e),ee.__data=new Float32Array(oe.storage/Float32Array.BYTES_PER_ELEMENT),ee.__offset=R,R+=oe.storage}}}const L=R%z;return L>0&&(R+=z-L),U.__size=R,U.__cache={},this}function T(U){const C={boundary:0,storage:0};return typeof U=="number"||typeof U=="boolean"?(C.boundary=4,C.storage=4):U.isVector2?(C.boundary=8,C.storage=8):U.isVector3||U.isColor?(C.boundary=16,C.storage=12):U.isVector4?(C.boundary=16,C.storage=16):U.isMatrix3?(C.boundary=48,C.storage=48):U.isMatrix4?(C.boundary=64,C.storage=64):U.isTexture?console.warn("THREE.WebGLRenderer: Texture samplers can not be part of an uniforms group."):console.warn("THREE.WebGLRenderer: Unsupported uniform value type.",U),C}function _(U){const C=U.target;C.removeEventListener("dispose",_);const R=a.indexOf(C.__bindingPointIndex);a.splice(R,1),i.deleteBuffer(r[C.id]),delete r[C.id],delete s[C.id]}function d(){for(const U in r)i.deleteBuffer(r[U]);a=[],r={},s={}}return{bind:u,update:f,dispose:d}}class Df{constructor(e={}){const{canvas:t=_a(),context:n=null,depth:r=!0,stencil:s=!1,alpha:a=!1,antialias:o=!1,premultipliedAlpha:u=!0,preserveDrawingBuffer:f=!1,powerPreference:c="default",failIfMajorPerformanceCaveat:p=!1,reverseDepthBuffer:m=!1}=e;this.isWebGLRenderer=!0;let g;if(n!==null){if(typeof WebGLRenderingContext<"u"&&n instanceof WebGLRenderingContext)throw new Error("THREE.WebGLRenderer: WebGL 1 is not supported since r163.");g=n.getContextAttributes().alpha}else g=a;const S=new Uint32Array(4),T=new Int32Array(4);let _=null,d=null;const U=[],C=[];this.domElement=t,this.debug={checkShaderErrors:!0,onShaderError:null},this.autoClear=!0,this.autoClearColor=!0,this.autoClearDepth=!0,this.autoClearStencil=!0,this.sortObjects=!0,this.clippingPlanes=[],this.localClippingEnabled=!1,this.toneMapping=0,this.toneMappingExposure=1,this.transmissionResolutionScale=1;const R=this;let z=!1;this._outputColorSpace=wt;let L=0,F=0,G=null,A=-1,y=null;const N=new rt,ee=new rt;let Y=null;const Q=new Ke(0);let ie=0,j=t.width,oe=t.height,K=1,fe=null,_e=null;const Ee=new rt(0,0,j,oe),Be=new rt(0,0,j,oe);let Ye=!1;const $=new Bs;let re=!1,ve=!1;const he=new et,Te=new et,ze=new q,we=new rt,Ze={background:null,fog:null,environment:null,overrideMaterial:null,isScene:!0};let Je=!1;function Oe(){return G===null?K:1}let D=n;function mt(M,B){return t.getContext(M,B)}try{const M={alpha:!0,depth:r,stencil:s,antialias:o,premultipliedAlpha:u,preserveDrawingBuffer:f,powerPreference:c,failIfMajorPerformanceCaveat:p};if("setAttribute"in t&&t.setAttribute("data-engine","three.js r176"),t.addEventListener("webglcontextlost",ne,!1),t.addEventListener("webglcontextrestored",me,!1),t.addEventListener("webglcontextcreationerror",pe,!1),D===null){const B="webgl2";if(D=mt(B,M),D===null)throw mt(B)?new Error("Error creating WebGL context with your selected attributes."):new Error("Error creating WebGL context.")}}catch(M){throw console.error("THREE.WebGLRenderer: "+M.message),M}let Le,Fe,ye,Qe,Me,b,v,H,J,te,Z,Se,le,be,x,l,h,E,w,I,k,ce,Ce,P;function se(){Le=new $c(D),Le.init(),ce=new Ph(D,Le),Fe=new Vc(D,Le,e,ce),ye=new wh(D,Le),Fe.reverseDepthBuffer&&m&&ye.buffers.depth.setReversed(!0),Qe=new jc(D),Me=new mh,b=new Ch(D,Le,ye,Me,Fe,ce,Qe),v=new kc(R),H=new Yc(R),J=new no(D),Ce=new Gc(D,J),te=new Kc(D,J,Qe,Ce),Z=new Qc(D,te,J,Qe),w=new Jc(D,Fe,b),l=new Hc(Me),Se=new ph(R,v,H,Le,Fe,Ce,l),le=new Nh(R,Me),be=new gh,x=new yh(Le),E=new Oc(R,v,H,ye,Z,g,u),h=new bh(R,Z,Fe),P=new Bh(D,Qe,Fe,ye),I=new zc(D,Le,Qe),k=new Zc(D,Le,Qe),Qe.programs=Se.programs,R.capabilities=Fe,R.extensions=Le,R.properties=Me,R.renderLists=be,R.shadowMap=h,R.state=ye,R.info=Qe}se();const V=new Lh(R,D);this.xr=V,this.getContext=function(){return D},this.getContextAttributes=function(){return D.getContextAttributes()},this.forceContextLoss=function(){const M=Le.get("WEBGL_lose_context");M&&M.loseContext()},this.forceContextRestore=function(){const M=Le.get("WEBGL_lose_context");M&&M.restoreContext()},this.getPixelRatio=function(){return K},this.setPixelRatio=function(M){M!==void 0&&(K=M,this.setSize(j,oe,!1))},this.getSize=function(M){return M.set(j,oe)},this.setSize=function(M,B,W=!0){if(V.isPresenting){console.warn("THREE.WebGLRenderer: Can't change size while VR device is presenting.");return}j=M,oe=B,t.width=Math.floor(M*K),t.height=Math.floor(B*K),W===!0&&(t.style.width=M+"px",t.style.height=B+"px"),this.setViewport(0,0,M,B)},this.getDrawingBufferSize=function(M){return M.set(j*K,oe*K).floor()},this.setDrawingBufferSize=function(M,B,W){j=M,oe=B,K=W,t.width=Math.floor(M*W),t.height=Math.floor(B*W),this.setViewport(0,0,M,B)},this.getCurrentViewport=function(M){return M.copy(N)},this.getViewport=function(M){return M.copy(Ee)},this.setViewport=function(M,B,W,X){M.isVector4?Ee.set(M.x,M.y,M.z,M.w):Ee.set(M,B,W,X),ye.viewport(N.copy(Ee).multiplyScalar(K).round())},this.getScissor=function(M){return M.copy(Be)},this.setScissor=function(M,B,W,X){M.isVector4?Be.set(M.x,M.y,M.z,M.w):Be.set(M,B,W,X),ye.scissor(ee.copy(Be).multiplyScalar(K).round())},this.getScissorTest=function(){return Ye},this.setScissorTest=function(M){ye.setScissorTest(Ye=M)},this.setOpaqueSort=function(M){fe=M},this.setTransparentSort=function(M){_e=M},this.getClearColor=function(M){return M.copy(E.getClearColor())},this.setClearColor=function(){E.setClearColor(...arguments)},this.getClearAlpha=function(){return E.getClearAlpha()},this.setClearAlpha=function(){E.setClearAlpha(...arguments)},this.clear=function(M=!0,B=!0,W=!0){let X=0;if(M){let O=!1;if(G!==null){const ae=G.texture.format;O=ae===1033||ae===1031||ae===1029}if(O){const ae=G.texture.type,de=ae===1009||ae===1014||ae===1012||ae===1020||ae===1017||ae===1018,ge=E.getClearColor(),xe=E.getClearAlpha(),De=ge.r,Pe=ge.g,Ae=ge.b;de?(S[0]=De,S[1]=Pe,S[2]=Ae,S[3]=xe,D.clearBufferuiv(D.COLOR,0,S)):(T[0]=De,T[1]=Pe,T[2]=Ae,T[3]=xe,D.clearBufferiv(D.COLOR,0,T))}else X|=D.COLOR_BUFFER_BIT}B&&(X|=D.DEPTH_BUFFER_BIT),W&&(X|=D.STENCIL_BUFFER_BIT,this.state.buffers.stencil.setMask(4294967295)),D.clear(X)},this.clearColor=function(){this.clear(!0,!1,!1)},this.clearDepth=function(){this.clear(!1,!0,!1)},this.clearStencil=function(){this.clear(!1,!1,!0)},this.dispose=function(){t.removeEventListener("webglcontextlost",ne,!1),t.removeEventListener("webglcontextrestored",me,!1),t.removeEventListener("webglcontextcreationerror",pe,!1),E.dispose(),be.dispose(),x.dispose(),Me.dispose(),v.dispose(),H.dispose(),Z.dispose(),Ce.dispose(),P.dispose(),Se.dispose(),V.dispose(),V.removeEventListener("sessionstart",Mr),V.removeEventListener("sessionend",Er),rn.stop()};function ne(M){M.preventDefault(),console.log("THREE.WebGLRenderer: Context Lost."),z=!0}function me(){console.log("THREE.WebGLRenderer: Context Restored."),z=!1;const M=Qe.autoReset,B=h.enabled,W=h.autoUpdate,X=h.needsUpdate,O=h.type;se(),Qe.autoReset=M,h.enabled=B,h.autoUpdate=W,h.needsUpdate=X,h.type=O}function pe(M){console.error("THREE.WebGLRenderer: A WebGL context could not be created. Reason: ",M.statusMessage)}function Ie(M){const B=M.target;B.removeEventListener("dispose",Ie),nt(B)}function nt(M){ft(M),Me.remove(M)}function ft(M){const B=Me.get(M).programs;B!==void 0&&(B.forEach(function(W){Se.releaseProgram(W)}),M.isShaderMaterial&&Se.releaseShaderCache(M))}this.renderBufferDirect=function(M,B,W,X,O,ae){B===null&&(B=Ze);const de=O.isMesh&&O.matrixWorld.determinant()<0,ge=$s(M,B,W,X,O);ye.setMaterial(X,de);let xe=W.index,De=1;if(X.wireframe===!0){if(xe=te.getWireframeAttribute(W),xe===void 0)return;De=2}const Pe=W.drawRange,Ae=W.attributes.position;let Ve=Pe.start*De,We=(Pe.start+Pe.count)*De;ae!==null&&(Ve=Math.max(Ve,ae.start*De),We=Math.min(We,(ae.start+ae.count)*De)),xe!==null?(Ve=Math.max(Ve,0),We=Math.min(We,xe.count)):Ae!=null&&(Ve=Math.max(Ve,0),We=Math.min(We,Ae.count));const st=We-Ve;if(st<0||st===1/0)return;Ce.setup(O,X,ge,W,xe);let it,He=I;if(xe!==null&&(it=J.get(xe),He=k,He.setIndex(it)),O.isMesh)X.wireframe===!0?(ye.setLineWidth(X.wireframeLinewidth*Oe()),He.setMode(D.LINES)):He.setMode(D.TRIANGLES);else if(O.isLine){let Re=X.linewidth;Re===void 0&&(Re=1),ye.setLineWidth(Re*Oe()),O.isLineSegments?He.setMode(D.LINES):O.isLineLoop?He.setMode(D.LINE_LOOP):He.setMode(D.LINE_STRIP)}else O.isPoints?He.setMode(D.POINTS):O.isSprite&&He.setMode(D.TRIANGLES);if(O.isBatchedMesh)if(O._multiDrawInstances!==null)Ci("THREE.WebGLRenderer: renderMultiDrawInstances has been deprecated and will be removed in r184. Append to renderMultiDraw arguments and use indirection."),He.renderMultiDrawInstances(O._multiDrawStarts,O._multiDrawCounts,O._multiDrawCount,O._multiDrawInstances);else if(Le.get("WEBGL_multi_draw"))He.renderMultiDraw(O._multiDrawStarts,O._multiDrawCounts,O._multiDrawCount);else{const Re=O._multiDrawStarts,ut=O._multiDrawCounts,Xe=O._multiDrawCount,Pt=xe?J.get(xe).bytesPerElement:1,gn=Me.get(X).currentProgram.getUniforms();for(let Mt=0;Mt<Xe;Mt++)gn.setValue(D,"_gl_DrawID",Mt),He.render(Re[Mt]/Pt,ut[Mt])}else if(O.isInstancedMesh)He.renderInstances(Ve,st,O.count);else if(W.isInstancedBufferGeometry){const Re=W._maxInstanceCount!==void 0?W._maxInstanceCount:1/0,ut=Math.min(W.instanceCount,Re);He.renderInstances(Ve,st,ut)}else He.render(Ve,st)};function $e(M,B,W){M.transparent===!0&&M.side===2&&M.forceSinglePass===!1?(M.side=1,M.needsUpdate=!0,ri(M,B,W),M.side=0,M.needsUpdate=!0,ri(M,B,W),M.side=2):ri(M,B,W)}this.compile=function(M,B,W=null){W===null&&(W=M),d=x.get(W),d.init(B),C.push(d),W.traverseVisible(function(O){O.isLight&&O.layers.test(B.layers)&&(d.pushLight(O),O.castShadow&&d.pushShadow(O))}),M!==W&&M.traverseVisible(function(O){O.isLight&&O.layers.test(B.layers)&&(d.pushLight(O),O.castShadow&&d.pushShadow(O))}),d.setupLights();const X=new Set;return M.traverse(function(O){if(!(O.isMesh||O.isPoints||O.isLine||O.isSprite))return;const ae=O.material;if(ae)if(Array.isArray(ae))for(let de=0;de<ae.length;de++){const ge=ae[de];$e(ge,W,O),X.add(ge)}else $e(ae,W,O),X.add(ae)}),d=C.pop(),X},this.compileAsync=function(M,B,W=null){const X=this.compile(M,B,W);return new Promise(O=>{function ae(){if(X.forEach(function(de){Me.get(de).currentProgram.isReady()&&X.delete(de)}),X.size===0){O(M);return}setTimeout(ae,10)}Le.get("KHR_parallel_shader_compile")!==null?ae():setTimeout(ae,10)})};let Ct=null;function zt(M){Ct&&Ct(M)}function Mr(){rn.stop()}function Er(){rn.start()}const rn=new Vs;rn.setAnimationLoop(zt),typeof self<"u"&&rn.setContext(self),this.setAnimationLoop=function(M){Ct=M,V.setAnimationLoop(M),M===null?rn.stop():rn.start()},V.addEventListener("sessionstart",Mr),V.addEventListener("sessionend",Er),this.render=function(M,B){if(B!==void 0&&B.isCamera!==!0){console.error("THREE.WebGLRenderer.render: camera is not an instance of THREE.Camera.");return}if(z===!0)return;if(M.matrixWorldAutoUpdate===!0&&M.updateMatrixWorld(),B.parent===null&&B.matrixWorldAutoUpdate===!0&&B.updateMatrixWorld(),V.enabled===!0&&V.isPresenting===!0&&(V.cameraAutoUpdate===!0&&V.updateCamera(B),B=V.getCamera()),M.isScene===!0&&M.onBeforeRender(R,M,B,G),d=x.get(M,C.length),d.init(B),C.push(d),Te.multiplyMatrices(B.projectionMatrix,B.matrixWorldInverse),$.setFromProjectionMatrix(Te),ve=this.localClippingEnabled,re=l.init(this.clippingPlanes,ve),_=be.get(M,U.length),_.init(),U.push(_),V.enabled===!0&&V.isPresenting===!0){const ae=R.xr.getDepthSensingMesh();ae!==null&&Fi(ae,B,-1/0,R.sortObjects)}Fi(M,B,0,R.sortObjects),_.finish(),R.sortObjects===!0&&_.sort(fe,_e),Je=V.enabled===!1||V.isPresenting===!1||V.hasDepthSensing()===!1,Je&&E.addToRenderList(_,M),this.info.render.frame++,re===!0&&l.beginShadows();const W=d.state.shadowsArray;h.render(W,M,B),re===!0&&l.endShadows(),this.info.autoReset===!0&&this.info.reset();const X=_.opaque,O=_.transmissive;if(d.setupLights(),B.isArrayCamera){const ae=B.cameras;if(O.length>0)for(let de=0,ge=ae.length;de<ge;de++){const xe=ae[de];Tr(X,O,M,xe)}Je&&E.render(M);for(let de=0,ge=ae.length;de<ge;de++){const xe=ae[de];yr(_,M,xe,xe.viewport)}}else O.length>0&&Tr(X,O,M,B),Je&&E.render(M),yr(_,M,B);G!==null&&F===0&&(b.updateMultisampleRenderTarget(G),b.updateRenderTargetMipmap(G)),M.isScene===!0&&M.onAfterRender(R,M,B),Ce.resetDefaultState(),A=-1,y=null,C.pop(),C.length>0?(d=C[C.length-1],re===!0&&l.setGlobalState(R.clippingPlanes,d.state.camera)):d=null,U.pop(),U.length>0?_=U[U.length-1]:_=null};function Fi(M,B,W,X){if(M.visible===!1)return;if(M.layers.test(B.layers)){if(M.isGroup)W=M.renderOrder;else if(M.isLOD)M.autoUpdate===!0&&M.update(B);else if(M.isLight)d.pushLight(M),M.castShadow&&d.pushShadow(M);else if(M.isSprite){if(!M.frustumCulled||$.intersectsSprite(M)){X&&we.setFromMatrixPosition(M.matrixWorld).applyMatrix4(Te);const de=Z.update(M),ge=M.material;ge.visible&&_.push(M,de,ge,W,we.z,null)}}else if((M.isMesh||M.isLine||M.isPoints)&&(!M.frustumCulled||$.intersectsObject(M))){const de=Z.update(M),ge=M.material;if(X&&(M.boundingSphere!==void 0?(M.boundingSphere===null&&M.computeBoundingSphere(),we.copy(M.boundingSphere.center)):(de.boundingSphere===null&&de.computeBoundingSphere(),we.copy(de.boundingSphere.center)),we.applyMatrix4(M.matrixWorld).applyMatrix4(Te)),Array.isArray(ge)){const xe=de.groups;for(let De=0,Pe=xe.length;De<Pe;De++){const Ae=xe[De],Ve=ge[Ae.materialIndex];Ve&&Ve.visible&&_.push(M,de,Ve,W,we.z,Ae)}}else ge.visible&&_.push(M,de,ge,W,we.z,null)}}const ae=M.children;for(let de=0,ge=ae.length;de<ge;de++)Fi(ae[de],B,W,X)}function yr(M,B,W,X){const O=M.opaque,ae=M.transmissive,de=M.transparent;d.setupLightsView(W),re===!0&&l.setGlobalState(R.clippingPlanes,W),X&&ye.viewport(N.copy(X)),O.length>0&&ii(O,B,W),ae.length>0&&ii(ae,B,W),de.length>0&&ii(de,B,W),ye.buffers.depth.setTest(!0),ye.buffers.depth.setMask(!0),ye.buffers.color.setMask(!0),ye.setPolygonOffset(!1)}function Tr(M,B,W,X){if((W.isScene===!0?W.overrideMaterial:null)!==null)return;d.state.transmissionRenderTarget[X.id]===void 0&&(d.state.transmissionRenderTarget[X.id]=new mn(1,1,{generateMipmaps:!0,type:Le.has("EXT_color_buffer_half_float")||Le.has("EXT_color_buffer_float")?1016:1009,minFilter:1008,samples:4,stencilBuffer:s,resolveDepthBuffer:!1,resolveStencilBuffer:!1,colorSpace:ke.workingColorSpace}));const ae=d.state.transmissionRenderTarget[X.id],de=X.viewport||N;ae.setSize(de.z*R.transmissionResolutionScale,de.w*R.transmissionResolutionScale);const ge=R.getRenderTarget();R.setRenderTarget(ae),R.getClearColor(Q),ie=R.getClearAlpha(),ie<1&&R.setClearColor(16777215,.5),R.clear(),Je&&E.render(W);const xe=R.toneMapping;R.toneMapping=0;const De=X.viewport;if(X.viewport!==void 0&&(X.viewport=void 0),d.setupLightsView(X),re===!0&&l.setGlobalState(R.clippingPlanes,X),ii(M,W,X),b.updateMultisampleRenderTarget(ae),b.updateRenderTargetMipmap(ae),Le.has("WEBGL_multisampled_render_to_texture")===!1){let Pe=!1;for(let Ae=0,Ve=B.length;Ae<Ve;Ae++){const We=B[Ae],st=We.object,it=We.geometry,He=We.material,Re=We.group;if(He.side===2&&st.layers.test(X.layers)){const ut=He.side;He.side=1,He.needsUpdate=!0,Ar(st,W,X,it,He,Re),He.side=ut,He.needsUpdate=!0,Pe=!0}}Pe===!0&&(b.updateMultisampleRenderTarget(ae),b.updateRenderTargetMipmap(ae))}R.setRenderTarget(ge),R.setClearColor(Q,ie),De!==void 0&&(X.viewport=De),R.toneMapping=xe}function ii(M,B,W){const X=B.isScene===!0?B.overrideMaterial:null;for(let O=0,ae=M.length;O<ae;O++){const de=M[O],ge=de.object,xe=de.geometry,De=de.group;let Pe=de.material;Pe.allowOverride===!0&&X!==null&&(Pe=X),ge.layers.test(W.layers)&&Ar(ge,B,W,xe,Pe,De)}}function Ar(M,B,W,X,O,ae){M.onBeforeRender(R,B,W,X,O,ae),M.modelViewMatrix.multiplyMatrices(W.matrixWorldInverse,M.matrixWorld),M.normalMatrix.getNormalMatrix(M.modelViewMatrix),O.onBeforeRender(R,B,W,X,M,ae),O.transparent===!0&&O.side===2&&O.forceSinglePass===!1?(O.side=1,O.needsUpdate=!0,R.renderBufferDirect(W,B,X,O,M,ae),O.side=0,O.needsUpdate=!0,R.renderBufferDirect(W,B,X,O,M,ae),O.side=2):R.renderBufferDirect(W,B,X,O,M,ae),M.onAfterRender(R,B,W,X,O,ae)}function ri(M,B,W){B.isScene!==!0&&(B=Ze);const X=Me.get(M),O=d.state.lights,ae=d.state.shadowsArray,de=O.state.version,ge=Se.getParameters(M,O.state,ae,B,W),xe=Se.getProgramCacheKey(ge);let De=X.programs;X.environment=M.isMeshStandardMaterial?B.environment:null,X.fog=B.fog,X.envMap=(M.isMeshStandardMaterial?H:v).get(M.envMap||X.environment),X.envMapRotation=X.environment!==null&&M.envMap===null?B.environmentRotation:M.envMapRotation,De===void 0&&(M.addEventListener("dispose",Ie),De=new Map,X.programs=De);let Pe=De.get(xe);if(Pe!==void 0){if(X.currentProgram===Pe&&X.lightsStateVersion===de)return Rr(M,ge),Pe}else ge.uniforms=Se.getUniforms(M),M.onBeforeCompile(ge,R),Pe=Se.acquireProgram(ge,xe),De.set(xe,Pe),X.uniforms=ge.uniforms;const Ae=X.uniforms;return(!M.isShaderMaterial&&!M.isRawShaderMaterial||M.clipping===!0)&&(Ae.clippingPlanes=l.uniform),Rr(M,ge),X.needsLights=Zs(M),X.lightsStateVersion=de,X.needsLights&&(Ae.ambientLightColor.value=O.state.ambient,Ae.lightProbe.value=O.state.probe,Ae.directionalLights.value=O.state.directional,Ae.directionalLightShadows.value=O.state.directionalShadow,Ae.spotLights.value=O.state.spot,Ae.spotLightShadows.value=O.state.spotShadow,Ae.rectAreaLights.value=O.state.rectArea,Ae.ltc_1.value=O.state.rectAreaLTC1,Ae.ltc_2.value=O.state.rectAreaLTC2,Ae.pointLights.value=O.state.point,Ae.pointLightShadows.value=O.state.pointShadow,Ae.hemisphereLights.value=O.state.hemi,Ae.directionalShadowMap.value=O.state.directionalShadowMap,Ae.directionalShadowMatrix.value=O.state.directionalShadowMatrix,Ae.spotShadowMap.value=O.state.spotShadowMap,Ae.spotLightMatrix.value=O.state.spotLightMatrix,Ae.spotLightMap.value=O.state.spotLightMap,Ae.pointShadowMap.value=O.state.pointShadowMap,Ae.pointShadowMatrix.value=O.state.pointShadowMatrix),X.currentProgram=Pe,X.uniformsList=null,Pe}function br(M){if(M.uniformsList===null){const B=M.currentProgram.getUniforms();M.uniformsList=Pi.seqWithValue(B.seq,M.uniforms)}return M.uniformsList}function Rr(M,B){const W=Me.get(M);W.outputColorSpace=B.outputColorSpace,W.batching=B.batching,W.batchingColor=B.batchingColor,W.instancing=B.instancing,W.instancingColor=B.instancingColor,W.instancingMorph=B.instancingMorph,W.skinning=B.skinning,W.morphTargets=B.morphTargets,W.morphNormals=B.morphNormals,W.morphColors=B.morphColors,W.morphTargetsCount=B.morphTargetsCount,W.numClippingPlanes=B.numClippingPlanes,W.numIntersection=B.numClipIntersection,W.vertexAlphas=B.vertexAlphas,W.vertexTangents=B.vertexTangents,W.toneMapping=B.toneMapping}function $s(M,B,W,X,O){B.isScene!==!0&&(B=Ze),b.resetTextureUnits();const ae=B.fog,de=X.isMeshStandardMaterial?B.environment:null,ge=G===null?R.outputColorSpace:G.isXRRenderTarget===!0?G.texture.colorSpace:Nn,xe=(X.isMeshStandardMaterial?H:v).get(X.envMap||de),De=X.vertexColors===!0&&!!W.attributes.color&&W.attributes.color.itemSize===4,Pe=!!W.attributes.tangent&&(!!X.normalMap||X.anisotropy>0),Ae=!!W.morphAttributes.position,Ve=!!W.morphAttributes.normal,We=!!W.morphAttributes.color;let st=0;X.toneMapped&&(G===null||G.isXRRenderTarget===!0)&&(st=R.toneMapping);const it=W.morphAttributes.position||W.morphAttributes.normal||W.morphAttributes.color,He=it!==void 0?it.length:0,Re=Me.get(X),ut=d.state.lights;if(re===!0&&(ve===!0||M!==y)){const _t=M===y&&X.id===A;l.setState(X,M,_t)}let Xe=!1;X.version===Re.__version?(Re.needsLights&&Re.lightsStateVersion!==ut.state.version||Re.outputColorSpace!==ge||O.isBatchedMesh&&Re.batching===!1||!O.isBatchedMesh&&Re.batching===!0||O.isBatchedMesh&&Re.batchingColor===!0&&O.colorTexture===null||O.isBatchedMesh&&Re.batchingColor===!1&&O.colorTexture!==null||O.isInstancedMesh&&Re.instancing===!1||!O.isInstancedMesh&&Re.instancing===!0||O.isSkinnedMesh&&Re.skinning===!1||!O.isSkinnedMesh&&Re.skinning===!0||O.isInstancedMesh&&Re.instancingColor===!0&&O.instanceColor===null||O.isInstancedMesh&&Re.instancingColor===!1&&O.instanceColor!==null||O.isInstancedMesh&&Re.instancingMorph===!0&&O.morphTexture===null||O.isInstancedMesh&&Re.instancingMorph===!1&&O.morphTexture!==null||Re.envMap!==xe||X.fog===!0&&Re.fog!==ae||Re.numClippingPlanes!==void 0&&(Re.numClippingPlanes!==l.numPlanes||Re.numIntersection!==l.numIntersection)||Re.vertexAlphas!==De||Re.vertexTangents!==Pe||Re.morphTargets!==Ae||Re.morphNormals!==Ve||Re.morphColors!==We||Re.toneMapping!==st||Re.morphTargetsCount!==He)&&(Xe=!0):(Xe=!0,Re.__version=X.version);let Pt=Re.currentProgram;Xe===!0&&(Pt=ri(X,B,O));let gn=!1,Mt=!1,Hn=!1;const tt=Pt.getUniforms(),Tt=Re.uniforms;if(ye.useProgram(Pt.program)&&(gn=!0,Mt=!0,Hn=!0),X.id!==A&&(A=X.id,Mt=!0),gn||y!==M){ye.buffers.depth.getReversed()?(he.copy(M.projectionMatrix),xa(he),va(he),tt.setValue(D,"projectionMatrix",he)):tt.setValue(D,"projectionMatrix",M.projectionMatrix),tt.setValue(D,"viewMatrix",M.matrixWorldInverse);const vt=tt.map.cameraPosition;vt!==void 0&&vt.setValue(D,ze.setFromMatrixPosition(M.matrixWorld)),Fe.logarithmicDepthBuffer&&tt.setValue(D,"logDepthBufFC",2/(Math.log(M.far+1)/Math.LN2)),(X.isMeshPhongMaterial||X.isMeshToonMaterial||X.isMeshLambertMaterial||X.isMeshBasicMaterial||X.isMeshStandardMaterial||X.isShaderMaterial)&&tt.setValue(D,"isOrthographic",M.isOrthographicCamera===!0),y!==M&&(y=M,Mt=!0,Hn=!0)}if(O.isSkinnedMesh){tt.setOptional(D,O,"bindMatrix"),tt.setOptional(D,O,"bindMatrixInverse");const _t=O.skeleton;_t&&(_t.boneTexture===null&&_t.computeBoneTexture(),tt.setValue(D,"boneTexture",_t.boneTexture,b))}O.isBatchedMesh&&(tt.setOptional(D,O,"batchingTexture"),tt.setValue(D,"batchingTexture",O._matricesTexture,b),tt.setOptional(D,O,"batchingIdTexture"),tt.setValue(D,"batchingIdTexture",O._indirectTexture,b),tt.setOptional(D,O,"batchingColorTexture"),O._colorsTexture!==null&&tt.setValue(D,"batchingColorTexture",O._colorsTexture,b));const At=W.morphAttributes;if((At.position!==void 0||At.normal!==void 0||At.color!==void 0)&&w.update(O,W,Pt),(Mt||Re.receiveShadow!==O.receiveShadow)&&(Re.receiveShadow=O.receiveShadow,tt.setValue(D,"receiveShadow",O.receiveShadow)),X.isMeshGouraudMaterial&&X.envMap!==null&&(Tt.envMap.value=xe,Tt.flipEnvMap.value=xe.isCubeTexture&&xe.isRenderTargetTexture===!1?-1:1),X.isMeshStandardMaterial&&X.envMap===null&&B.environment!==null&&(Tt.envMapIntensity.value=B.environmentIntensity),Mt&&(tt.setValue(D,"toneMappingExposure",R.toneMappingExposure),Re.needsLights&&Ks(Tt,Hn),ae&&X.fog===!0&&le.refreshFogUniforms(Tt,ae),le.refreshMaterialUniforms(Tt,X,K,oe,d.state.transmissionRenderTarget[M.id]),Pi.upload(D,br(Re),Tt,b)),X.isShaderMaterial&&X.uniformsNeedUpdate===!0&&(Pi.upload(D,br(Re),Tt,b),X.uniformsNeedUpdate=!1),X.isSpriteMaterial&&tt.setValue(D,"center",O.center),tt.setValue(D,"modelViewMatrix",O.modelViewMatrix),tt.setValue(D,"normalMatrix",O.normalMatrix),tt.setValue(D,"modelMatrix",O.matrixWorld),X.isShaderMaterial||X.isRawShaderMaterial){const _t=X.uniformsGroups;for(let vt=0,Ni=_t.length;vt<Ni;vt++){const sn=_t[vt];P.update(sn,Pt),P.bind(sn,Pt)}}return Pt}function Ks(M,B){M.ambientLightColor.needsUpdate=B,M.lightProbe.needsUpdate=B,M.directionalLights.needsUpdate=B,M.directionalLightShadows.needsUpdate=B,M.pointLights.needsUpdate=B,M.pointLightShadows.needsUpdate=B,M.spotLights.needsUpdate=B,M.spotLightShadows.needsUpdate=B,M.rectAreaLights.needsUpdate=B,M.hemisphereLights.needsUpdate=B}function Zs(M){return M.isMeshLambertMaterial||M.isMeshToonMaterial||M.isMeshPhongMaterial||M.isMeshStandardMaterial||M.isShadowMaterial||M.isShaderMaterial&&M.lights===!0}this.getActiveCubeFace=function(){return L},this.getActiveMipmapLevel=function(){return F},this.getRenderTarget=function(){return G},this.setRenderTargetTextures=function(M,B,W){const X=Me.get(M);X.__autoAllocateDepthBuffer=M.resolveDepthBuffer===!1,X.__autoAllocateDepthBuffer===!1&&(X.__useRenderToTexture=!1),Me.get(M.texture).__webglTexture=B,Me.get(M.depthTexture).__webglTexture=X.__autoAllocateDepthBuffer?void 0:W,X.__hasExternalTextures=!0},this.setRenderTargetFramebuffer=function(M,B){const W=Me.get(M);W.__webglFramebuffer=B,W.__useDefaultFramebuffer=B===void 0};const js=D.createFramebuffer();this.setRenderTarget=function(M,B=0,W=0){G=M,L=B,F=W;let X=!0,O=null,ae=!1,de=!1;if(M){const xe=Me.get(M);if(xe.__useDefaultFramebuffer!==void 0)ye.bindFramebuffer(D.FRAMEBUFFER,null),X=!1;else if(xe.__webglFramebuffer===void 0)b.setupRenderTarget(M);else if(xe.__hasExternalTextures)b.rebindTextures(M,Me.get(M.texture).__webglTexture,Me.get(M.depthTexture).__webglTexture);else if(M.depthBuffer){const Ae=M.depthTexture;if(xe.__boundDepthTexture!==Ae){if(Ae!==null&&Me.has(Ae)&&(M.width!==Ae.image.width||M.height!==Ae.image.height))throw new Error("WebGLRenderTarget: Attached DepthTexture is initialized to the incorrect size.");b.setupDepthRenderbuffer(M)}}const De=M.texture;(De.isData3DTexture||De.isDataArrayTexture||De.isCompressedArrayTexture)&&(de=!0);const Pe=Me.get(M).__webglFramebuffer;M.isWebGLCubeRenderTarget?(Array.isArray(Pe[B])?O=Pe[B][W]:O=Pe[B],ae=!0):M.samples>0&&b.useMultisampledRTT(M)===!1?O=Me.get(M).__webglMultisampledFramebuffer:Array.isArray(Pe)?O=Pe[W]:O=Pe,N.copy(M.viewport),ee.copy(M.scissor),Y=M.scissorTest}else N.copy(Ee).multiplyScalar(K).floor(),ee.copy(Be).multiplyScalar(K).floor(),Y=Ye;if(W!==0&&(O=js),ye.bindFramebuffer(D.FRAMEBUFFER,O)&&X&&ye.drawBuffers(M,O),ye.viewport(N),ye.scissor(ee),ye.setScissorTest(Y),ae){const xe=Me.get(M.texture);D.framebufferTexture2D(D.FRAMEBUFFER,D.COLOR_ATTACHMENT0,D.TEXTURE_CUBE_MAP_POSITIVE_X+B,xe.__webglTexture,W)}else if(de){const xe=Me.get(M.texture),De=B;D.framebufferTextureLayer(D.FRAMEBUFFER,D.COLOR_ATTACHMENT0,xe.__webglTexture,W,De)}else if(M!==null&&W!==0){const xe=Me.get(M.texture);D.framebufferTexture2D(D.FRAMEBUFFER,D.COLOR_ATTACHMENT0,D.TEXTURE_2D,xe.__webglTexture,W)}A=-1},this.readRenderTargetPixels=function(M,B,W,X,O,ae,de){if(!(M&&M.isWebGLRenderTarget)){console.error("THREE.WebGLRenderer.readRenderTargetPixels: renderTarget is not THREE.WebGLRenderTarget.");return}let ge=Me.get(M).__webglFramebuffer;if(M.isWebGLCubeRenderTarget&&de!==void 0&&(ge=ge[de]),ge){ye.bindFramebuffer(D.FRAMEBUFFER,ge);try{const xe=M.texture,De=xe.format,Pe=xe.type;if(!Fe.textureFormatReadable(De)){console.error("THREE.WebGLRenderer.readRenderTargetPixels: renderTarget is not in RGBA or implementation defined format.");return}if(!Fe.textureTypeReadable(Pe)){console.error("THREE.WebGLRenderer.readRenderTargetPixels: renderTarget is not in UnsignedByteType or implementation defined type.");return}B>=0&&B<=M.width-X&&W>=0&&W<=M.height-O&&D.readPixels(B,W,X,O,ce.convert(De),ce.convert(Pe),ae)}finally{const xe=G!==null?Me.get(G).__webglFramebuffer:null;ye.bindFramebuffer(D.FRAMEBUFFER,xe)}}},this.readRenderTargetPixelsAsync=async function(M,B,W,X,O,ae,de){if(!(M&&M.isWebGLRenderTarget))throw new Error("THREE.WebGLRenderer.readRenderTargetPixels: renderTarget is not THREE.WebGLRenderTarget.");let ge=Me.get(M).__webglFramebuffer;if(M.isWebGLCubeRenderTarget&&de!==void 0&&(ge=ge[de]),ge)if(B>=0&&B<=M.width-X&&W>=0&&W<=M.height-O){ye.bindFramebuffer(D.FRAMEBUFFER,ge);const xe=M.texture,De=xe.format,Pe=xe.type;if(!Fe.textureFormatReadable(De))throw new Error("THREE.WebGLRenderer.readRenderTargetPixelsAsync: renderTarget is not in RGBA or implementation defined format.");if(!Fe.textureTypeReadable(Pe))throw new Error("THREE.WebGLRenderer.readRenderTargetPixelsAsync: renderTarget is not in UnsignedByteType or implementation defined type.");const Ae=D.createBuffer();D.bindBuffer(D.PIXEL_PACK_BUFFER,Ae),D.bufferData(D.PIXEL_PACK_BUFFER,ae.byteLength,D.STREAM_READ),D.readPixels(B,W,X,O,ce.convert(De),ce.convert(Pe),0);const Ve=G!==null?Me.get(G).__webglFramebuffer:null;ye.bindFramebuffer(D.FRAMEBUFFER,Ve);const We=D.fenceSync(D.SYNC_GPU_COMMANDS_COMPLETE,0);return D.flush(),await ga(D,We,4),D.bindBuffer(D.PIXEL_PACK_BUFFER,Ae),D.getBufferSubData(D.PIXEL_PACK_BUFFER,0,ae),D.deleteBuffer(Ae),D.deleteSync(We),ae}else throw new Error("THREE.WebGLRenderer.readRenderTargetPixelsAsync: requested read bounds are out of range.")},this.copyFramebufferToTexture=function(M,B=null,W=0){const X=Math.pow(2,-W),O=Math.floor(M.image.width*X),ae=Math.floor(M.image.height*X),de=B!==null?B.x:0,ge=B!==null?B.y:0;b.setTexture2D(M,0),D.copyTexSubImage2D(D.TEXTURE_2D,W,0,0,de,ge,O,ae),ye.unbindTexture()};const Js=D.createFramebuffer(),Qs=D.createFramebuffer();this.copyTextureToTexture=function(M,B,W=null,X=null,O=0,ae=null){ae===null&&(O!==0?(Ci("WebGLRenderer: copyTextureToTexture function signature has changed to support src and dst mipmap levels."),ae=O,O=0):ae=0);let de,ge,xe,De,Pe,Ae,Ve,We,st;const it=M.isCompressedTexture?M.mipmaps[ae]:M.image;if(W!==null)de=W.max.x-W.min.x,ge=W.max.y-W.min.y,xe=W.isBox3?W.max.z-W.min.z:1,De=W.min.x,Pe=W.min.y,Ae=W.isBox3?W.min.z:0;else{const At=Math.pow(2,-O);de=Math.floor(it.width*At),ge=Math.floor(it.height*At),M.isDataArrayTexture?xe=it.depth:M.isData3DTexture?xe=Math.floor(it.depth*At):xe=1,De=0,Pe=0,Ae=0}X!==null?(Ve=X.x,We=X.y,st=X.z):(Ve=0,We=0,st=0);const He=ce.convert(B.format),Re=ce.convert(B.type);let ut;B.isData3DTexture?(b.setTexture3D(B,0),ut=D.TEXTURE_3D):B.isDataArrayTexture||B.isCompressedArrayTexture?(b.setTexture2DArray(B,0),ut=D.TEXTURE_2D_ARRAY):(b.setTexture2D(B,0),ut=D.TEXTURE_2D),D.pixelStorei(D.UNPACK_FLIP_Y_WEBGL,B.flipY),D.pixelStorei(D.UNPACK_PREMULTIPLY_ALPHA_WEBGL,B.premultiplyAlpha),D.pixelStorei(D.UNPACK_ALIGNMENT,B.unpackAlignment);const Xe=D.getParameter(D.UNPACK_ROW_LENGTH),Pt=D.getParameter(D.UNPACK_IMAGE_HEIGHT),gn=D.getParameter(D.UNPACK_SKIP_PIXELS),Mt=D.getParameter(D.UNPACK_SKIP_ROWS),Hn=D.getParameter(D.UNPACK_SKIP_IMAGES);D.pixelStorei(D.UNPACK_ROW_LENGTH,it.width),D.pixelStorei(D.UNPACK_IMAGE_HEIGHT,it.height),D.pixelStorei(D.UNPACK_SKIP_PIXELS,De),D.pixelStorei(D.UNPACK_SKIP_ROWS,Pe),D.pixelStorei(D.UNPACK_SKIP_IMAGES,Ae);const tt=M.isDataArrayTexture||M.isData3DTexture,Tt=B.isDataArrayTexture||B.isData3DTexture;if(M.isDepthTexture){const At=Me.get(M),_t=Me.get(B),vt=Me.get(At.__renderTarget),Ni=Me.get(_t.__renderTarget);ye.bindFramebuffer(D.READ_FRAMEBUFFER,vt.__webglFramebuffer),ye.bindFramebuffer(D.DRAW_FRAMEBUFFER,Ni.__webglFramebuffer);for(let sn=0;sn<xe;sn++)tt&&(D.framebufferTextureLayer(D.READ_FRAMEBUFFER,D.COLOR_ATTACHMENT0,Me.get(M).__webglTexture,O,Ae+sn),D.framebufferTextureLayer(D.DRAW_FRAMEBUFFER,D.COLOR_ATTACHMENT0,Me.get(B).__webglTexture,ae,st+sn)),D.blitFramebuffer(De,Pe,de,ge,Ve,We,de,ge,D.DEPTH_BUFFER_BIT,D.NEAREST);ye.bindFramebuffer(D.READ_FRAMEBUFFER,null),ye.bindFramebuffer(D.DRAW_FRAMEBUFFER,null)}else if(O!==0||M.isRenderTargetTexture||Me.has(M)){const At=Me.get(M),_t=Me.get(B);ye.bindFramebuffer(D.READ_FRAMEBUFFER,Js),ye.bindFramebuffer(D.DRAW_FRAMEBUFFER,Qs);for(let vt=0;vt<xe;vt++)tt?D.framebufferTextureLayer(D.READ_FRAMEBUFFER,D.COLOR_ATTACHMENT0,At.__webglTexture,O,Ae+vt):D.framebufferTexture2D(D.READ_FRAMEBUFFER,D.COLOR_ATTACHMENT0,D.TEXTURE_2D,At.__webglTexture,O),Tt?D.framebufferTextureLayer(D.DRAW_FRAMEBUFFER,D.COLOR_ATTACHMENT0,_t.__webglTexture,ae,st+vt):D.framebufferTexture2D(D.DRAW_FRAMEBUFFER,D.COLOR_ATTACHMENT0,D.TEXTURE_2D,_t.__webglTexture,ae),O!==0?D.blitFramebuffer(De,Pe,de,ge,Ve,We,de,ge,D.COLOR_BUFFER_BIT,D.NEAREST):Tt?D.copyTexSubImage3D(ut,ae,Ve,We,st+vt,De,Pe,de,ge):D.copyTexSubImage2D(ut,ae,Ve,We,De,Pe,de,ge);ye.bindFramebuffer(D.READ_FRAMEBUFFER,null),ye.bindFramebuffer(D.DRAW_FRAMEBUFFER,null)}else Tt?M.isDataTexture||M.isData3DTexture?D.texSubImage3D(ut,ae,Ve,We,st,de,ge,xe,He,Re,it.data):B.isCompressedArrayTexture?D.compressedTexSubImage3D(ut,ae,Ve,We,st,de,ge,xe,He,it.data):D.texSubImage3D(ut,ae,Ve,We,st,de,ge,xe,He,Re,it):M.isDataTexture?D.texSubImage2D(D.TEXTURE_2D,ae,Ve,We,de,ge,He,Re,it.data):M.isCompressedTexture?D.compressedTexSubImage2D(D.TEXTURE_2D,ae,Ve,We,it.width,it.height,He,it.data):D.texSubImage2D(D.TEXTURE_2D,ae,Ve,We,de,ge,He,Re,it);D.pixelStorei(D.UNPACK_ROW_LENGTH,Xe),D.pixelStorei(D.UNPACK_IMAGE_HEIGHT,Pt),D.pixelStorei(D.UNPACK_SKIP_PIXELS,gn),D.pixelStorei(D.UNPACK_SKIP_ROWS,Mt),D.pixelStorei(D.UNPACK_SKIP_IMAGES,Hn),ae===0&&B.generateMipmaps&&D.generateMipmap(ut),ye.unbindTexture()},this.copyTextureToTexture3D=function(M,B,W=null,X=null,O=0){return Ci('WebGLRenderer: copyTextureToTexture3D function has been deprecated. Use "copyTextureToTexture" instead.'),this.copyTextureToTexture(M,B,W,X,O)},this.initRenderTarget=function(M){Me.get(M).__webglFramebuffer===void 0&&b.setupRenderTarget(M)},this.initTexture=function(M){M.isCubeTexture?b.setTextureCube(M,0):M.isData3DTexture?b.setTexture3D(M,0):M.isDataArrayTexture||M.isCompressedArrayTexture?b.setTexture2DArray(M,0):b.setTexture2D(M,0),ye.unbindTexture()},this.resetState=function(){L=0,F=0,G=null,ye.reset(),Ce.reset()},typeof __THREE_DEVTOOLS__<"u"&&__THREE_DEVTOOLS__.dispatchEvent(new CustomEvent("observe",{detail:this}))}get coordinateSystem(){return 2e3}get outputColorSpace(){return this._outputColorSpace}set outputColorSpace(e){this._outputColorSpace=e;const t=this.getContext();t.drawingBufferColorSpace=ke._getDrawingBufferColorSpace(e),t.unpackColorSpace=ke._getUnpackColorSpace()}}var qs={},Li={};Li.byteLength=zh;Li.toByteArray=Hh;Li.fromByteArray=Xh;var Gt=[],Rt=[],Oh=typeof Uint8Array<"u"?Uint8Array:Array,ur="ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";for(var In=0,Gh=ur.length;In<Gh;++In)Gt[In]=ur[In],Rt[ur.charCodeAt(In)]=In;Rt[45]=62;Rt[95]=63;function Ys(i){var e=i.length;if(e%4>0)throw new Error("Invalid string. Length must be a multiple of 4");var t=i.indexOf("=");t===-1&&(t=e);var n=t===e?0:4-t%4;return[t,n]}function zh(i){var e=Ys(i),t=e[0],n=e[1];return(t+n)*3/4-n}function Vh(i,e,t){return(e+t)*3/4-t}function Hh(i){var e,t=Ys(i),n=t[0],r=t[1],s=new Oh(Vh(i,n,r)),a=0,o=r>0?n-4:n,u;for(u=0;u<o;u+=4)e=Rt[i.charCodeAt(u)]<<18|Rt[i.charCodeAt(u+1)]<<12|Rt[i.charCodeAt(u+2)]<<6|Rt[i.charCodeAt(u+3)],s[a++]=e>>16&255,s[a++]=e>>8&255,s[a++]=e&255;return r===2&&(e=Rt[i.charCodeAt(u)]<<2|Rt[i.charCodeAt(u+1)]>>4,s[a++]=e&255),r===1&&(e=Rt[i.charCodeAt(u)]<<10|Rt[i.charCodeAt(u+1)]<<4|Rt[i.charCodeAt(u+2)]>>2,s[a++]=e>>8&255,s[a++]=e&255),s}function kh(i){return Gt[i>>18&63]+Gt[i>>12&63]+Gt[i>>6&63]+Gt[i&63]}function Wh(i,e,t){for(var n,r=[],s=e;s<t;s+=3)n=(i[s]<<16&16711680)+(i[s+1]<<8&65280)+(i[s+2]&255),r.push(kh(n));return r.join("")}function Xh(i){for(var e,t=i.length,n=t%3,r=[],s=16383,a=0,o=t-n;a<o;a+=s)r.push(Wh(i,a,a+s>o?o:a+s));return n===1?(e=i[t-1],r.push(Gt[e>>2]+Gt[e<<4&63]+"==")):n===2&&(e=(i[t-2]<<8)+i[t-1],r.push(Gt[e>>10]+Gt[e>>4&63]+Gt[e<<2&63]+"=")),r.join("")}var Sr={};Sr.read=function(i,e,t,n,r){var s,a,o=r*8-n-1,u=(1<<o)-1,f=u>>1,c=-7,p=t?r-1:0,m=t?-1:1,g=i[e+p];for(p+=m,s=g&(1<<-c)-1,g>>=-c,c+=o;c>0;s=s*256+i[e+p],p+=m,c-=8);for(a=s&(1<<-c)-1,s>>=-c,c+=n;c>0;a=a*256+i[e+p],p+=m,c-=8);if(s===0)s=1-f;else{if(s===u)return a?NaN:(g?-1:1)*(1/0);a=a+Math.pow(2,n),s=s-f}return(g?-1:1)*a*Math.pow(2,s-n)};Sr.write=function(i,e,t,n,r,s){var a,o,u,f=s*8-r-1,c=(1<<f)-1,p=c>>1,m=r===23?Math.pow(2,-24)-Math.pow(2,-77):0,g=n?0:s-1,S=n?1:-1,T=e<0||e===0&&1/e<0?1:0;for(e=Math.abs(e),isNaN(e)||e===1/0?(o=isNaN(e)?1:0,a=c):(a=Math.floor(Math.log(e)/Math.LN2),e*(u=Math.pow(2,-a))<1&&(a--,u*=2),a+p>=1?e+=m/u:e+=m*Math.pow(2,1-p),e*u>=2&&(a++,u/=2),a+p>=c?(o=0,a=c):a+p>=1?(o=(e*u-1)*Math.pow(2,r),a=a+p):(o=e*Math.pow(2,p-1)*Math.pow(2,r),a=0));r>=8;i[t+g]=o&255,g+=S,o/=256,r-=8);for(a=a<<r|o,f+=r;f>0;i[t+g]=a&255,g+=S,a/=256,f-=8);i[t+g-S]|=T*128};(function(i){const e=Li,t=Sr,n=typeof Symbol=="function"&&typeof Symbol.for=="function"?Symbol.for("nodejs.util.inspect.custom"):null;i.Buffer=c,i.SlowBuffer=z,i.INSPECT_MAX_BYTES=50;const r=2147483647;i.kMaxLength=r;const{Uint8Array:s,ArrayBuffer:a,SharedArrayBuffer:o}=globalThis;c.TYPED_ARRAY_SUPPORT=u(),!c.TYPED_ARRAY_SUPPORT&&typeof console<"u"&&typeof console.error=="function"&&console.error("This browser lacks typed array (Uint8Array) support which is required by `buffer` v5.x. Use `buffer` v4.x if you require old browser support.");function u(){try{const x=new s(1),l={foo:function(){return 42}};return Object.setPrototypeOf(l,s.prototype),Object.setPrototypeOf(x,l),x.foo()===42}catch{return!1}}Object.defineProperty(c.prototype,"parent",{enumerable:!0,get:function(){if(c.isBuffer(this))return this.buffer}}),Object.defineProperty(c.prototype,"offset",{enumerable:!0,get:function(){if(c.isBuffer(this))return this.byteOffset}});function f(x){if(x>r)throw new RangeError('The value "'+x+'" is invalid for option "size"');const l=new s(x);return Object.setPrototypeOf(l,c.prototype),l}function c(x,l,h){if(typeof x=="number"){if(typeof l=="string")throw new TypeError('The "string" argument must be of type string. Received type number');return S(x)}return p(x,l,h)}c.poolSize=8192;function p(x,l,h){if(typeof x=="string")return T(x,l);if(a.isView(x))return d(x);if(x==null)throw new TypeError("The first argument must be one of type string, Buffer, ArrayBuffer, Array, or Array-like Object. Received type "+typeof x);if(te(x,a)||x&&te(x.buffer,a)||typeof o<"u"&&(te(x,o)||x&&te(x.buffer,o)))return U(x,l,h);if(typeof x=="number")throw new TypeError('The "value" argument must not be of type number. Received type number');const E=x.valueOf&&x.valueOf();if(E!=null&&E!==x)return c.from(E,l,h);const w=C(x);if(w)return w;if(typeof Symbol<"u"&&Symbol.toPrimitive!=null&&typeof x[Symbol.toPrimitive]=="function")return c.from(x[Symbol.toPrimitive]("string"),l,h);throw new TypeError("The first argument must be one of type string, Buffer, ArrayBuffer, Array, or Array-like Object. Received type "+typeof x)}c.from=function(x,l,h){return p(x,l,h)},Object.setPrototypeOf(c.prototype,s.prototype),Object.setPrototypeOf(c,s);function m(x){if(typeof x!="number")throw new TypeError('"size" argument must be of type number');if(x<0)throw new RangeError('The value "'+x+'" is invalid for option "size"')}function g(x,l,h){return m(x),x<=0?f(x):l!==void 0?typeof h=="string"?f(x).fill(l,h):f(x).fill(l):f(x)}c.alloc=function(x,l,h){return g(x,l,h)};function S(x){return m(x),f(x<0?0:R(x)|0)}c.allocUnsafe=function(x){return S(x)},c.allocUnsafeSlow=function(x){return S(x)};function T(x,l){if((typeof l!="string"||l==="")&&(l="utf8"),!c.isEncoding(l))throw new TypeError("Unknown encoding: "+l);const h=L(x,l)|0;let E=f(h);const w=E.write(x,l);return w!==h&&(E=E.slice(0,w)),E}function _(x){const l=x.length<0?0:R(x.length)|0,h=f(l);for(let E=0;E<l;E+=1)h[E]=x[E]&255;return h}function d(x){if(te(x,s)){const l=new s(x);return U(l.buffer,l.byteOffset,l.byteLength)}return _(x)}function U(x,l,h){if(l<0||x.byteLength<l)throw new RangeError('"offset" is outside of buffer bounds');if(x.byteLength<l+(h||0))throw new RangeError('"length" is outside of buffer bounds');let E;return l===void 0&&h===void 0?E=new s(x):h===void 0?E=new s(x,l):E=new s(x,l,h),Object.setPrototypeOf(E,c.prototype),E}function C(x){if(c.isBuffer(x)){const l=R(x.length)|0,h=f(l);return h.length===0||x.copy(h,0,0,l),h}if(x.length!==void 0)return typeof x.length!="number"||Z(x.length)?f(0):_(x);if(x.type==="Buffer"&&Array.isArray(x.data))return _(x.data)}function R(x){if(x>=r)throw new RangeError("Attempt to allocate Buffer larger than maximum size: 0x"+r.toString(16)+" bytes");return x|0}function z(x){return+x!=x&&(x=0),c.alloc(+x)}c.isBuffer=function(l){return l!=null&&l._isBuffer===!0&&l!==c.prototype},c.compare=function(l,h){if(te(l,s)&&(l=c.from(l,l.offset,l.byteLength)),te(h,s)&&(h=c.from(h,h.offset,h.byteLength)),!c.isBuffer(l)||!c.isBuffer(h))throw new TypeError('The "buf1", "buf2" arguments must be one of type Buffer or Uint8Array');if(l===h)return 0;let E=l.length,w=h.length;for(let I=0,k=Math.min(E,w);I<k;++I)if(l[I]!==h[I]){E=l[I],w=h[I];break}return E<w?-1:w<E?1:0},c.isEncoding=function(l){switch(String(l).toLowerCase()){case"hex":case"utf8":case"utf-8":case"ascii":case"latin1":case"binary":case"base64":case"ucs2":case"ucs-2":case"utf16le":case"utf-16le":return!0;default:return!1}},c.concat=function(l,h){if(!Array.isArray(l))throw new TypeError('"list" argument must be an Array of Buffers');if(l.length===0)return c.alloc(0);let E;if(h===void 0)for(h=0,E=0;E<l.length;++E)h+=l[E].length;const w=c.allocUnsafe(h);let I=0;for(E=0;E<l.length;++E){let k=l[E];if(te(k,s))I+k.length>w.length?(c.isBuffer(k)||(k=c.from(k)),k.copy(w,I)):s.prototype.set.call(w,k,I);else if(c.isBuffer(k))k.copy(w,I);else throw new TypeError('"list" argument must be an Array of Buffers');I+=k.length}return w};function L(x,l){if(c.isBuffer(x))return x.length;if(a.isView(x)||te(x,a))return x.byteLength;if(typeof x!="string")throw new TypeError('The "string" argument must be one of type string, Buffer, or ArrayBuffer. Received type '+typeof x);const h=x.length,E=arguments.length>2&&arguments[2]===!0;if(!E&&h===0)return 0;let w=!1;for(;;)switch(l){case"ascii":case"latin1":case"binary":return h;case"utf8":case"utf-8":return Me(x).length;case"ucs2":case"ucs-2":case"utf16le":case"utf-16le":return h*2;case"hex":return h>>>1;case"base64":return H(x).length;default:if(w)return E?-1:Me(x).length;l=(""+l).toLowerCase(),w=!0}}c.byteLength=L;function F(x,l,h){let E=!1;if((l===void 0||l<0)&&(l=0),l>this.length||((h===void 0||h>this.length)&&(h=this.length),h<=0)||(h>>>=0,l>>>=0,h<=l))return"";for(x||(x="utf8");;)switch(x){case"hex":return Be(this,l,h);case"utf8":case"utf-8":return oe(this,l,h);case"ascii":return _e(this,l,h);case"latin1":case"binary":return Ee(this,l,h);case"base64":return j(this,l,h);case"ucs2":case"ucs-2":case"utf16le":case"utf-16le":return Ye(this,l,h);default:if(E)throw new TypeError("Unknown encoding: "+x);x=(x+"").toLowerCase(),E=!0}}c.prototype._isBuffer=!0;function G(x,l,h){const E=x[l];x[l]=x[h],x[h]=E}c.prototype.swap16=function(){const l=this.length;if(l%2!==0)throw new RangeError("Buffer size must be a multiple of 16-bits");for(let h=0;h<l;h+=2)G(this,h,h+1);return this},c.prototype.swap32=function(){const l=this.length;if(l%4!==0)throw new RangeError("Buffer size must be a multiple of 32-bits");for(let h=0;h<l;h+=4)G(this,h,h+3),G(this,h+1,h+2);return this},c.prototype.swap64=function(){const l=this.length;if(l%8!==0)throw new RangeError("Buffer size must be a multiple of 64-bits");for(let h=0;h<l;h+=8)G(this,h,h+7),G(this,h+1,h+6),G(this,h+2,h+5),G(this,h+3,h+4);return this},c.prototype.toString=function(){const l=this.length;return l===0?"":arguments.length===0?oe(this,0,l):F.apply(this,arguments)},c.prototype.toLocaleString=c.prototype.toString,c.prototype.equals=function(l){if(!c.isBuffer(l))throw new TypeError("Argument must be a Buffer");return this===l?!0:c.compare(this,l)===0},c.prototype.inspect=function(){let l="";const h=i.INSPECT_MAX_BYTES;return l=this.toString("hex",0,h).replace(/(.{2})/g,"$1 ").trim(),this.length>h&&(l+=" ... "),"<Buffer "+l+">"},n&&(c.prototype[n]=c.prototype.inspect),c.prototype.compare=function(l,h,E,w,I){if(te(l,s)&&(l=c.from(l,l.offset,l.byteLength)),!c.isBuffer(l))throw new TypeError('The "target" argument must be one of type Buffer or Uint8Array. Received type '+typeof l);if(h===void 0&&(h=0),E===void 0&&(E=l?l.length:0),w===void 0&&(w=0),I===void 0&&(I=this.length),h<0||E>l.length||w<0||I>this.length)throw new RangeError("out of range index");if(w>=I&&h>=E)return 0;if(w>=I)return-1;if(h>=E)return 1;if(h>>>=0,E>>>=0,w>>>=0,I>>>=0,this===l)return 0;let k=I-w,ce=E-h;const Ce=Math.min(k,ce),P=this.slice(w,I),se=l.slice(h,E);for(let V=0;V<Ce;++V)if(P[V]!==se[V]){k=P[V],ce=se[V];break}return k<ce?-1:ce<k?1:0};function A(x,l,h,E,w){if(x.length===0)return-1;if(typeof h=="string"?(E=h,h=0):h>2147483647?h=2147483647:h<-2147483648&&(h=-2147483648),h=+h,Z(h)&&(h=w?0:x.length-1),h<0&&(h=x.length+h),h>=x.length){if(w)return-1;h=x.length-1}else if(h<0)if(w)h=0;else return-1;if(typeof l=="string"&&(l=c.from(l,E)),c.isBuffer(l))return l.length===0?-1:y(x,l,h,E,w);if(typeof l=="number")return l=l&255,typeof s.prototype.indexOf=="function"?w?s.prototype.indexOf.call(x,l,h):s.prototype.lastIndexOf.call(x,l,h):y(x,[l],h,E,w);throw new TypeError("val must be string, number or Buffer")}function y(x,l,h,E,w){let I=1,k=x.length,ce=l.length;if(E!==void 0&&(E=String(E).toLowerCase(),E==="ucs2"||E==="ucs-2"||E==="utf16le"||E==="utf-16le")){if(x.length<2||l.length<2)return-1;I=2,k/=2,ce/=2,h/=2}function Ce(se,V){return I===1?se[V]:se.readUInt16BE(V*I)}let P;if(w){let se=-1;for(P=h;P<k;P++)if(Ce(x,P)===Ce(l,se===-1?0:P-se)){if(se===-1&&(se=P),P-se+1===ce)return se*I}else se!==-1&&(P-=P-se),se=-1}else for(h+ce>k&&(h=k-ce),P=h;P>=0;P--){let se=!0;for(let V=0;V<ce;V++)if(Ce(x,P+V)!==Ce(l,V)){se=!1;break}if(se)return P}return-1}c.prototype.includes=function(l,h,E){return this.indexOf(l,h,E)!==-1},c.prototype.indexOf=function(l,h,E){return A(this,l,h,E,!0)},c.prototype.lastIndexOf=function(l,h,E){return A(this,l,h,E,!1)};function N(x,l,h,E){h=Number(h)||0;const w=x.length-h;E?(E=Number(E),E>w&&(E=w)):E=w;const I=l.length;E>I/2&&(E=I/2);let k;for(k=0;k<E;++k){const ce=parseInt(l.substr(k*2,2),16);if(Z(ce))return k;x[h+k]=ce}return k}function ee(x,l,h,E){return J(Me(l,x.length-h),x,h,E)}function Y(x,l,h,E){return J(b(l),x,h,E)}function Q(x,l,h,E){return J(H(l),x,h,E)}function ie(x,l,h,E){return J(v(l,x.length-h),x,h,E)}c.prototype.write=function(l,h,E,w){if(h===void 0)w="utf8",E=this.length,h=0;else if(E===void 0&&typeof h=="string")w=h,E=this.length,h=0;else if(isFinite(h))h=h>>>0,isFinite(E)?(E=E>>>0,w===void 0&&(w="utf8")):(w=E,E=void 0);else throw new Error("Buffer.write(string, encoding, offset[, length]) is no longer supported");const I=this.length-h;if((E===void 0||E>I)&&(E=I),l.length>0&&(E<0||h<0)||h>this.length)throw new RangeError("Attempt to write outside buffer bounds");w||(w="utf8");let k=!1;for(;;)switch(w){case"hex":return N(this,l,h,E);case"utf8":case"utf-8":return ee(this,l,h,E);case"ascii":case"latin1":case"binary":return Y(this,l,h,E);case"base64":return Q(this,l,h,E);case"ucs2":case"ucs-2":case"utf16le":case"utf-16le":return ie(this,l,h,E);default:if(k)throw new TypeError("Unknown encoding: "+w);w=(""+w).toLowerCase(),k=!0}},c.prototype.toJSON=function(){return{type:"Buffer",data:Array.prototype.slice.call(this._arr||this,0)}};function j(x,l,h){return l===0&&h===x.length?e.fromByteArray(x):e.fromByteArray(x.slice(l,h))}function oe(x,l,h){h=Math.min(x.length,h);const E=[];let w=l;for(;w<h;){const I=x[w];let k=null,ce=I>239?4:I>223?3:I>191?2:1;if(w+ce<=h){let Ce,P,se,V;switch(ce){case 1:I<128&&(k=I);break;case 2:Ce=x[w+1],(Ce&192)===128&&(V=(I&31)<<6|Ce&63,V>127&&(k=V));break;case 3:Ce=x[w+1],P=x[w+2],(Ce&192)===128&&(P&192)===128&&(V=(I&15)<<12|(Ce&63)<<6|P&63,V>2047&&(V<55296||V>57343)&&(k=V));break;case 4:Ce=x[w+1],P=x[w+2],se=x[w+3],(Ce&192)===128&&(P&192)===128&&(se&192)===128&&(V=(I&15)<<18|(Ce&63)<<12|(P&63)<<6|se&63,V>65535&&V<1114112&&(k=V))}}k===null?(k=65533,ce=1):k>65535&&(k-=65536,E.push(k>>>10&1023|55296),k=56320|k&1023),E.push(k),w+=ce}return fe(E)}const K=4096;function fe(x){const l=x.length;if(l<=K)return String.fromCharCode.apply(String,x);let h="",E=0;for(;E<l;)h+=String.fromCharCode.apply(String,x.slice(E,E+=K));return h}function _e(x,l,h){let E="";h=Math.min(x.length,h);for(let w=l;w<h;++w)E+=String.fromCharCode(x[w]&127);return E}function Ee(x,l,h){let E="";h=Math.min(x.length,h);for(let w=l;w<h;++w)E+=String.fromCharCode(x[w]);return E}function Be(x,l,h){const E=x.length;(!l||l<0)&&(l=0),(!h||h<0||h>E)&&(h=E);let w="";for(let I=l;I<h;++I)w+=Se[x[I]];return w}function Ye(x,l,h){const E=x.slice(l,h);let w="";for(let I=0;I<E.length-1;I+=2)w+=String.fromCharCode(E[I]+E[I+1]*256);return w}c.prototype.slice=function(l,h){const E=this.length;l=~~l,h=h===void 0?E:~~h,l<0?(l+=E,l<0&&(l=0)):l>E&&(l=E),h<0?(h+=E,h<0&&(h=0)):h>E&&(h=E),h<l&&(h=l);const w=this.subarray(l,h);return Object.setPrototypeOf(w,c.prototype),w};function $(x,l,h){if(x%1!==0||x<0)throw new RangeError("offset is not uint");if(x+l>h)throw new RangeError("Trying to access beyond buffer length")}c.prototype.readUintLE=c.prototype.readUIntLE=function(l,h,E){l=l>>>0,h=h>>>0,E||$(l,h,this.length);let w=this[l],I=1,k=0;for(;++k<h&&(I*=256);)w+=this[l+k]*I;return w},c.prototype.readUintBE=c.prototype.readUIntBE=function(l,h,E){l=l>>>0,h=h>>>0,E||$(l,h,this.length);let w=this[l+--h],I=1;for(;h>0&&(I*=256);)w+=this[l+--h]*I;return w},c.prototype.readUint8=c.prototype.readUInt8=function(l,h){return l=l>>>0,h||$(l,1,this.length),this[l]},c.prototype.readUint16LE=c.prototype.readUInt16LE=function(l,h){return l=l>>>0,h||$(l,2,this.length),this[l]|this[l+1]<<8},c.prototype.readUint16BE=c.prototype.readUInt16BE=function(l,h){return l=l>>>0,h||$(l,2,this.length),this[l]<<8|this[l+1]},c.prototype.readUint32LE=c.prototype.readUInt32LE=function(l,h){return l=l>>>0,h||$(l,4,this.length),(this[l]|this[l+1]<<8|this[l+2]<<16)+this[l+3]*16777216},c.prototype.readUint32BE=c.prototype.readUInt32BE=function(l,h){return l=l>>>0,h||$(l,4,this.length),this[l]*16777216+(this[l+1]<<16|this[l+2]<<8|this[l+3])},c.prototype.readBigUInt64LE=le(function(l){l=l>>>0,Le(l,"offset");const h=this[l],E=this[l+7];(h===void 0||E===void 0)&&Fe(l,this.length-8);const w=h+this[++l]*2**8+this[++l]*2**16+this[++l]*2**24,I=this[++l]+this[++l]*2**8+this[++l]*2**16+E*2**24;return BigInt(w)+(BigInt(I)<<BigInt(32))}),c.prototype.readBigUInt64BE=le(function(l){l=l>>>0,Le(l,"offset");const h=this[l],E=this[l+7];(h===void 0||E===void 0)&&Fe(l,this.length-8);const w=h*2**24+this[++l]*2**16+this[++l]*2**8+this[++l],I=this[++l]*2**24+this[++l]*2**16+this[++l]*2**8+E;return(BigInt(w)<<BigInt(32))+BigInt(I)}),c.prototype.readIntLE=function(l,h,E){l=l>>>0,h=h>>>0,E||$(l,h,this.length);let w=this[l],I=1,k=0;for(;++k<h&&(I*=256);)w+=this[l+k]*I;return I*=128,w>=I&&(w-=Math.pow(2,8*h)),w},c.prototype.readIntBE=function(l,h,E){l=l>>>0,h=h>>>0,E||$(l,h,this.length);let w=h,I=1,k=this[l+--w];for(;w>0&&(I*=256);)k+=this[l+--w]*I;return I*=128,k>=I&&(k-=Math.pow(2,8*h)),k},c.prototype.readInt8=function(l,h){return l=l>>>0,h||$(l,1,this.length),this[l]&128?(255-this[l]+1)*-1:this[l]},c.prototype.readInt16LE=function(l,h){l=l>>>0,h||$(l,2,this.length);const E=this[l]|this[l+1]<<8;return E&32768?E|4294901760:E},c.prototype.readInt16BE=function(l,h){l=l>>>0,h||$(l,2,this.length);const E=this[l+1]|this[l]<<8;return E&32768?E|4294901760:E},c.prototype.readInt32LE=function(l,h){return l=l>>>0,h||$(l,4,this.length),this[l]|this[l+1]<<8|this[l+2]<<16|this[l+3]<<24},c.prototype.readInt32BE=function(l,h){return l=l>>>0,h||$(l,4,this.length),this[l]<<24|this[l+1]<<16|this[l+2]<<8|this[l+3]},c.prototype.readBigInt64LE=le(function(l){l=l>>>0,Le(l,"offset");const h=this[l],E=this[l+7];(h===void 0||E===void 0)&&Fe(l,this.length-8);const w=this[l+4]+this[l+5]*2**8+this[l+6]*2**16+(E<<24);return(BigInt(w)<<BigInt(32))+BigInt(h+this[++l]*2**8+this[++l]*2**16+this[++l]*2**24)}),c.prototype.readBigInt64BE=le(function(l){l=l>>>0,Le(l,"offset");const h=this[l],E=this[l+7];(h===void 0||E===void 0)&&Fe(l,this.length-8);const w=(h<<24)+this[++l]*2**16+this[++l]*2**8+this[++l];return(BigInt(w)<<BigInt(32))+BigInt(this[++l]*2**24+this[++l]*2**16+this[++l]*2**8+E)}),c.prototype.readFloatLE=function(l,h){return l=l>>>0,h||$(l,4,this.length),t.read(this,l,!0,23,4)},c.prototype.readFloatBE=function(l,h){return l=l>>>0,h||$(l,4,this.length),t.read(this,l,!1,23,4)},c.prototype.readDoubleLE=function(l,h){return l=l>>>0,h||$(l,8,this.length),t.read(this,l,!0,52,8)},c.prototype.readDoubleBE=function(l,h){return l=l>>>0,h||$(l,8,this.length),t.read(this,l,!1,52,8)};function re(x,l,h,E,w,I){if(!c.isBuffer(x))throw new TypeError('"buffer" argument must be a Buffer instance');if(l>w||l<I)throw new RangeError('"value" argument is out of bounds');if(h+E>x.length)throw new RangeError("Index out of range")}c.prototype.writeUintLE=c.prototype.writeUIntLE=function(l,h,E,w){if(l=+l,h=h>>>0,E=E>>>0,!w){const ce=Math.pow(2,8*E)-1;re(this,l,h,E,ce,0)}let I=1,k=0;for(this[h]=l&255;++k<E&&(I*=256);)this[h+k]=l/I&255;return h+E},c.prototype.writeUintBE=c.prototype.writeUIntBE=function(l,h,E,w){if(l=+l,h=h>>>0,E=E>>>0,!w){const ce=Math.pow(2,8*E)-1;re(this,l,h,E,ce,0)}let I=E-1,k=1;for(this[h+I]=l&255;--I>=0&&(k*=256);)this[h+I]=l/k&255;return h+E},c.prototype.writeUint8=c.prototype.writeUInt8=function(l,h,E){return l=+l,h=h>>>0,E||re(this,l,h,1,255,0),this[h]=l&255,h+1},c.prototype.writeUint16LE=c.prototype.writeUInt16LE=function(l,h,E){return l=+l,h=h>>>0,E||re(this,l,h,2,65535,0),this[h]=l&255,this[h+1]=l>>>8,h+2},c.prototype.writeUint16BE=c.prototype.writeUInt16BE=function(l,h,E){return l=+l,h=h>>>0,E||re(this,l,h,2,65535,0),this[h]=l>>>8,this[h+1]=l&255,h+2},c.prototype.writeUint32LE=c.prototype.writeUInt32LE=function(l,h,E){return l=+l,h=h>>>0,E||re(this,l,h,4,4294967295,0),this[h+3]=l>>>24,this[h+2]=l>>>16,this[h+1]=l>>>8,this[h]=l&255,h+4},c.prototype.writeUint32BE=c.prototype.writeUInt32BE=function(l,h,E){return l=+l,h=h>>>0,E||re(this,l,h,4,4294967295,0),this[h]=l>>>24,this[h+1]=l>>>16,this[h+2]=l>>>8,this[h+3]=l&255,h+4};function ve(x,l,h,E,w){mt(l,E,w,x,h,7);let I=Number(l&BigInt(4294967295));x[h++]=I,I=I>>8,x[h++]=I,I=I>>8,x[h++]=I,I=I>>8,x[h++]=I;let k=Number(l>>BigInt(32)&BigInt(4294967295));return x[h++]=k,k=k>>8,x[h++]=k,k=k>>8,x[h++]=k,k=k>>8,x[h++]=k,h}function he(x,l,h,E,w){mt(l,E,w,x,h,7);let I=Number(l&BigInt(4294967295));x[h+7]=I,I=I>>8,x[h+6]=I,I=I>>8,x[h+5]=I,I=I>>8,x[h+4]=I;let k=Number(l>>BigInt(32)&BigInt(4294967295));return x[h+3]=k,k=k>>8,x[h+2]=k,k=k>>8,x[h+1]=k,k=k>>8,x[h]=k,h+8}c.prototype.writeBigUInt64LE=le(function(l,h=0){return ve(this,l,h,BigInt(0),BigInt("0xffffffffffffffff"))}),c.prototype.writeBigUInt64BE=le(function(l,h=0){return he(this,l,h,BigInt(0),BigInt("0xffffffffffffffff"))}),c.prototype.writeIntLE=function(l,h,E,w){if(l=+l,h=h>>>0,!w){const Ce=Math.pow(2,8*E-1);re(this,l,h,E,Ce-1,-Ce)}let I=0,k=1,ce=0;for(this[h]=l&255;++I<E&&(k*=256);)l<0&&ce===0&&this[h+I-1]!==0&&(ce=1),this[h+I]=(l/k>>0)-ce&255;return h+E},c.prototype.writeIntBE=function(l,h,E,w){if(l=+l,h=h>>>0,!w){const Ce=Math.pow(2,8*E-1);re(this,l,h,E,Ce-1,-Ce)}let I=E-1,k=1,ce=0;for(this[h+I]=l&255;--I>=0&&(k*=256);)l<0&&ce===0&&this[h+I+1]!==0&&(ce=1),this[h+I]=(l/k>>0)-ce&255;return h+E},c.prototype.writeInt8=function(l,h,E){return l=+l,h=h>>>0,E||re(this,l,h,1,127,-128),l<0&&(l=255+l+1),this[h]=l&255,h+1},c.prototype.writeInt16LE=function(l,h,E){return l=+l,h=h>>>0,E||re(this,l,h,2,32767,-32768),this[h]=l&255,this[h+1]=l>>>8,h+2},c.prototype.writeInt16BE=function(l,h,E){return l=+l,h=h>>>0,E||re(this,l,h,2,32767,-32768),this[h]=l>>>8,this[h+1]=l&255,h+2},c.prototype.writeInt32LE=function(l,h,E){return l=+l,h=h>>>0,E||re(this,l,h,4,2147483647,-2147483648),this[h]=l&255,this[h+1]=l>>>8,this[h+2]=l>>>16,this[h+3]=l>>>24,h+4},c.prototype.writeInt32BE=function(l,h,E){return l=+l,h=h>>>0,E||re(this,l,h,4,2147483647,-2147483648),l<0&&(l=4294967295+l+1),this[h]=l>>>24,this[h+1]=l>>>16,this[h+2]=l>>>8,this[h+3]=l&255,h+4},c.prototype.writeBigInt64LE=le(function(l,h=0){return ve(this,l,h,-BigInt("0x8000000000000000"),BigInt("0x7fffffffffffffff"))}),c.prototype.writeBigInt64BE=le(function(l,h=0){return he(this,l,h,-BigInt("0x8000000000000000"),BigInt("0x7fffffffffffffff"))});function Te(x,l,h,E,w,I){if(h+E>x.length)throw new RangeError("Index out of range");if(h<0)throw new RangeError("Index out of range")}function ze(x,l,h,E,w){return l=+l,h=h>>>0,w||Te(x,l,h,4),t.write(x,l,h,E,23,4),h+4}c.prototype.writeFloatLE=function(l,h,E){return ze(this,l,h,!0,E)},c.prototype.writeFloatBE=function(l,h,E){return ze(this,l,h,!1,E)};function we(x,l,h,E,w){return l=+l,h=h>>>0,w||Te(x,l,h,8),t.write(x,l,h,E,52,8),h+8}c.prototype.writeDoubleLE=function(l,h,E){return we(this,l,h,!0,E)},c.prototype.writeDoubleBE=function(l,h,E){return we(this,l,h,!1,E)},c.prototype.copy=function(l,h,E,w){if(!c.isBuffer(l))throw new TypeError("argument should be a Buffer");if(E||(E=0),!w&&w!==0&&(w=this.length),h>=l.length&&(h=l.length),h||(h=0),w>0&&w<E&&(w=E),w===E||l.length===0||this.length===0)return 0;if(h<0)throw new RangeError("targetStart out of bounds");if(E<0||E>=this.length)throw new RangeError("Index out of range");if(w<0)throw new RangeError("sourceEnd out of bounds");w>this.length&&(w=this.length),l.length-h<w-E&&(w=l.length-h+E);const I=w-E;return this===l&&typeof s.prototype.copyWithin=="function"?this.copyWithin(h,E,w):s.prototype.set.call(l,this.subarray(E,w),h),I},c.prototype.fill=function(l,h,E,w){if(typeof l=="string"){if(typeof h=="string"?(w=h,h=0,E=this.length):typeof E=="string"&&(w=E,E=this.length),w!==void 0&&typeof w!="string")throw new TypeError("encoding must be a string");if(typeof w=="string"&&!c.isEncoding(w))throw new TypeError("Unknown encoding: "+w);if(l.length===1){const k=l.charCodeAt(0);(w==="utf8"&&k<128||w==="latin1")&&(l=k)}}else typeof l=="number"?l=l&255:typeof l=="boolean"&&(l=Number(l));if(h<0||this.length<h||this.length<E)throw new RangeError("Out of range index");if(E<=h)return this;h=h>>>0,E=E===void 0?this.length:E>>>0,l||(l=0);let I;if(typeof l=="number")for(I=h;I<E;++I)this[I]=l;else{const k=c.isBuffer(l)?l:c.from(l,w),ce=k.length;if(ce===0)throw new TypeError('The value "'+l+'" is invalid for argument "value"');for(I=0;I<E-h;++I)this[I+h]=k[I%ce]}return this};const Ze={};function Je(x,l,h){Ze[x]=class extends h{constructor(){super(),Object.defineProperty(this,"message",{value:l.apply(this,arguments),writable:!0,configurable:!0}),this.name=`${this.name} [${x}]`,this.stack,delete this.name}get code(){return x}set code(w){Object.defineProperty(this,"code",{configurable:!0,enumerable:!0,value:w,writable:!0})}toString(){return`${this.name} [${x}]: ${this.message}`}}}Je("ERR_BUFFER_OUT_OF_BOUNDS",function(x){return x?`${x} is outside of buffer bounds`:"Attempt to access memory outside buffer bounds"},RangeError),Je("ERR_INVALID_ARG_TYPE",function(x,l){return`The "${x}" argument must be of type number. Received type ${typeof l}`},TypeError),Je("ERR_OUT_OF_RANGE",function(x,l,h){let E=`The value of "${x}" is out of range.`,w=h;return Number.isInteger(h)&&Math.abs(h)>2**32?w=Oe(String(h)):typeof h=="bigint"&&(w=String(h),(h>BigInt(2)**BigInt(32)||h<-(BigInt(2)**BigInt(32)))&&(w=Oe(w)),w+="n"),E+=` It must be ${l}. Received ${w}`,E},RangeError);function Oe(x){let l="",h=x.length;const E=x[0]==="-"?1:0;for(;h>=E+4;h-=3)l=`_${x.slice(h-3,h)}${l}`;return`${x.slice(0,h)}${l}`}function D(x,l,h){Le(l,"offset"),(x[l]===void 0||x[l+h]===void 0)&&Fe(l,x.length-(h+1))}function mt(x,l,h,E,w,I){if(x>h||x<l){const k=typeof l=="bigint"?"n":"";let ce;throw l===0||l===BigInt(0)?ce=`>= 0${k} and < 2${k} ** ${(I+1)*8}${k}`:ce=`>= -(2${k} ** ${(I+1)*8-1}${k}) and < 2 ** ${(I+1)*8-1}${k}`,new Ze.ERR_OUT_OF_RANGE("value",ce,x)}D(E,w,I)}function Le(x,l){if(typeof x!="number")throw new Ze.ERR_INVALID_ARG_TYPE(l,"number",x)}function Fe(x,l,h){throw Math.floor(x)!==x?(Le(x,h),new Ze.ERR_OUT_OF_RANGE("offset","an integer",x)):l<0?new Ze.ERR_BUFFER_OUT_OF_BOUNDS:new Ze.ERR_OUT_OF_RANGE("offset",`>= 0 and <= ${l}`,x)}const ye=/[^+/0-9A-Za-z-_]/g;function Qe(x){if(x=x.split("=")[0],x=x.trim().replace(ye,""),x.length<2)return"";for(;x.length%4!==0;)x=x+"=";return x}function Me(x,l){l=l||1/0;let h;const E=x.length;let w=null;const I=[];for(let k=0;k<E;++k){if(h=x.charCodeAt(k),h>55295&&h<57344){if(!w){if(h>56319){(l-=3)>-1&&I.push(239,191,189);continue}else if(k+1===E){(l-=3)>-1&&I.push(239,191,189);continue}w=h;continue}if(h<56320){(l-=3)>-1&&I.push(239,191,189),w=h;continue}h=(w-55296<<10|h-56320)+65536}else w&&(l-=3)>-1&&I.push(239,191,189);if(w=null,h<128){if((l-=1)<0)break;I.push(h)}else if(h<2048){if((l-=2)<0)break;I.push(h>>6|192,h&63|128)}else if(h<65536){if((l-=3)<0)break;I.push(h>>12|224,h>>6&63|128,h&63|128)}else if(h<1114112){if((l-=4)<0)break;I.push(h>>18|240,h>>12&63|128,h>>6&63|128,h&63|128)}else throw new Error("Invalid code point")}return I}function b(x){const l=[];for(let h=0;h<x.length;++h)l.push(x.charCodeAt(h)&255);return l}function v(x,l){let h,E,w;const I=[];for(let k=0;k<x.length&&!((l-=2)<0);++k)h=x.charCodeAt(k),E=h>>8,w=h%256,I.push(w),I.push(E);return I}function H(x){return e.toByteArray(Qe(x))}function J(x,l,h,E){let w;for(w=0;w<E&&!(w+h>=l.length||w>=x.length);++w)l[w+h]=x[w];return w}function te(x,l){return x instanceof l||x!=null&&x.constructor!=null&&x.constructor.name!=null&&x.constructor.name===l.name}function Z(x){return x!==x}const Se=(function(){const x="0123456789abcdef",l=new Array(256);for(let h=0;h<16;++h){const E=h*16;for(let w=0;w<16;++w)l[E+w]=x[h]+x[w]}return l})();function le(x){return typeof BigInt>"u"?be:x}function be(){throw new Error("BigInt not supported")}})(qs);const Uf=qs.Buffer,Lf=globalThis||void 0||self;new Gs(-1,1,1,-1,0,1);class qh extends Kt{constructor(){super(),this.setAttribute("position",new Yt([-1,3,0,-1,-1,0,3,-1,0],3)),this.setAttribute("uv",new Yt([0,2,0,0,2,0],2))}}new qh;export{Lf as $,sf as A,$h as B,ke as C,Os as D,$t as E,hf as F,Kt as G,ff as H,Bt as I,of as J,af as K,Nn as L,Nt as M,rf as N,Gs as O,Lt as P,rt as Q,Cf as R,yf as S,ht as T,cf as U,jh as V,Df as W,Wa as X,_f as Y,gf as Z,Uf as _,Zh as a,Ef as a0,bf as a1,xf as a2,Pf as a3,St as a4,Mf as a5,Rf as a6,Yr as a7,Tf as a8,ni as a9,Af as aa,Ds as ab,Ii as ac,Mi as ad,Kh as b,wt as c,gr as d,Ke as e,pf as f,q as g,qe as h,wf as i,mn as j,lf as k,mf as l,df as m,uf as n,On as o,Sf as p,vf as q,Qh as r,ef as s,nn as t,Jh as u,ti as v,zs as w,tf as x,Yh as y,nf as z};
