"use client";
import React, { useRef, useEffect } from "react";
import * as THREE from "three";
import RichieBase  from "@/assets/images/DigitalBusinessCardV3/Richie.png";
import RichieHover from "@/assets/images/DigitalBusinessCardV3/Driver.png";

// ── Shaders ───────────────────────────────────────────────────────────────────

const VERT = /* glsl */`
varying vec2 vUv;
void main(){ vUv=uv; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.); }`;

// Simple advection: back-trace along vel (vel in UV/frame units)
const ADVECT = /* glsl */`
precision highp float;
uniform sampler2D u_vel;
uniform sampler2D u_src;
uniform float     u_diss;
varying vec2 vUv;
void main(){
  vec2 vel = texture2D(u_vel, vUv).xy;
  gl_FragColor = u_diss * texture2D(u_src, vUv - vel);
}`;

// Curl (z-component of ∇×v) — makes fluid spin organically
const CURL_FRAG = /* glsl */`
precision highp float;
uniform sampler2D u_vel;
uniform vec2 u_res;
varying vec2 vUv;
void main(){
  vec2 px = 1.0 / u_res;
  float L = texture2D(u_vel, vUv - vec2(px.x, 0.0)).y;
  float R = texture2D(u_vel, vUv + vec2(px.x, 0.0)).y;
  float T = texture2D(u_vel, vUv + vec2(0.0, px.y)).x;
  float B = texture2D(u_vel, vUv - vec2(0.0, px.y)).x;
  float curl = (R - L - T + B) * 0.5;
  gl_FragColor = vec4(curl, 0.0, 0.0, 1.0);
}`;

// Vorticity confinement — amplifies swirls
const VORT_FRAG = /* glsl */`
precision highp float;
uniform sampler2D u_vel;
uniform sampler2D u_curl;
uniform vec2  u_res;
uniform float u_dt;
uniform float u_strength;
varying vec2 vUv;
void main(){
  vec2 px = 1.0 / u_res;
  float L = texture2D(u_curl, vUv - vec2(px.x, 0.0)).x;
  float R = texture2D(u_curl, vUv + vec2(px.x, 0.0)).x;
  float T = texture2D(u_curl, vUv + vec2(0.0, px.y)).x;
  float B = texture2D(u_curl, vUv - vec2(0.0, px.y)).x;
  float C = texture2D(u_curl, vUv).x;
  vec2  eta = normalize(vec2(abs(T) - abs(B), abs(R) - abs(L)) + 1e-5);
  vec2  force = u_dt * u_strength * C * vec2(eta.y, -eta.x);
  gl_FragColor = vec4(texture2D(u_vel, vUv).xy + force, 0.0, 1.0);
}`;

// Gaussian splat at a UV point (aspect-corrected)
const SPLAT = /* glsl */`
precision highp float;
uniform sampler2D u_src;
uniform vec2  u_pt;
uniform vec3  u_col;
uniform float u_r;
uniform vec2  u_res;
varying vec2 vUv;
void main(){
  vec2 d = vUv - u_pt;
  d.x *= u_res.x / u_res.y;
  float s = exp(-dot(d,d) / u_r);
  gl_FragColor = texture2D(u_src, vUv) + vec4(u_col * s, 0.0);
}`;

// Simplex noise
const SNOISE = /* glsl */`
vec3 _mod289(vec3 x){return x-floor(x*(1./289.))*289.;}
vec2 _mod289(vec2 x){return x-floor(x*(1./289.))*289.;}
vec3 _perm(vec3 x){return _mod289(((x*34.)+1.)*x);}
float snoise(vec2 v){
  const vec4 C=vec4(.211324865,.366025404,-.577350269,.024390244);
  vec2 i=floor(v+dot(v,C.yy));
  vec2 x0=v-i+dot(i,C.xx);
  vec2 i1=x0.x>x0.y?vec2(1,0):vec2(0,1);
  vec4 x12=x0.xyxy+C.xxzz; x12.xy-=i1;
  i=_mod289(i);
  vec3 p=_perm(_perm(i.y+vec3(0,i1.y,1))+i.x+vec3(0,i1.x,1));
  vec3 m=max(.5-vec3(dot(x0,x0),dot(x12.xy,x12.xy),dot(x12.zw,x12.zw)),0.);
  m=m*m; m=m*m;
  vec3 x2=2.*fract(p*C.www)-1.;
  vec3 h=abs(x2)-.5;
  vec3 a0=x2-floor(x2+.5);
  m*=1.79284291-.85373472*(a0*a0+h*h);
  vec3 g; g.x=a0.x*x0.x+h.x*x0.y; g.yz=a0.yz*x12.xz+h.yz*x12.yw;
  return 130.*dot(m,g);
}`;

// Display: cursor circle reveals front at 100%; fluid ink at border/trail
const DISPLAY = /* glsl */`
precision highp float;
${SNOISE}
uniform sampler2D u_back;
uniform sampler2D u_front;
uniform sampler2D u_density;
uniform vec2  u_mouse;
uniform vec2  u_canvas;
uniform float u_time;
uniform float u_radius;
uniform float u_noiseFreq;
uniform float u_noiseStrength;
uniform float u_timeSpeed;
uniform float u_blend;
uniform float u_backAspect;
uniform float u_frontAspect;
varying vec2 vUv;

vec2 coverUv(vec2 uv, float img, float cont){
  if(cont > img){
    return vec2(uv.x, (uv.y-.5)/(cont/img)+.5);
  } else {
    return vec2((uv.x-.5)/(img/cont)+.5, uv.y);
  }
}

void main(){
  float cont = u_canvas.x / u_canvas.y;

  // ── 1. CURSOR WINDOW — círculo limpio de tamaño fijo ────────────────────
  float circReveal = 0.0;
  if(u_mouse.x >= 0.0){
    vec2 d = vUv - u_mouse;
    d.x   *= cont;
    float dist = length(d);
    float r = u_radius / u_canvas.x;
    // Círculo suave pero sin deformar el radio — el efecto orgánico viene del fluid
    circReveal = 1.0 - smoothstep(r * 0.75, r * 1.05, dist);
  }

  // ── 2. FLUID DENSITY — tinta del fluid que fluye con swirl ───────────────
  float dens = clamp(texture2D(u_density, vUv).r * 2.2, 0.0, 1.0);

  // Noise sólo donde hay tinta (borde orgánico del rastro)
  float n2 = snoise(vUv * u_noiseFreq * 0.7 + u_time * u_timeSpeed * 0.08) * 0.5 + 0.5;
  dens = clamp(dens + n2 * u_noiseStrength * 0.06 * dens, 0.0, 1.0);

  // ── 3. COMBINAR ──────────────────────────────────────────────────────────
  // Círculo: 100% reveal directo
  // Tinta: reveal adicional fuera del círculo, modulado por u_blend
  float ink    = dens * (1.0 - circReveal * 0.6) * u_blend;
  float reveal = clamp(circReveal + ink, 0.0, 1.0);

  // ── 4. IMAGES ────────────────────────────────────────────────────────────
  vec2 bUv = clamp(coverUv(vUv, u_backAspect,  cont), 0.001, 0.999);
  vec2 fUv = clamp(coverUv(vUv, u_frontAspect, cont), 0.001, 0.999);
  gl_FragColor = mix(texture2D(u_back, bUv), texture2D(u_front, fUv), reveal);
}`;

// ── Helpers ───────────────────────────────────────────────────────────────────

function doubleFBO(w: number, h: number) {
    const o: THREE.RenderTargetOptions = {
        minFilter: THREE.LinearFilter,
        magFilter: THREE.LinearFilter,
        format: THREE.RGBAFormat,
        type: THREE.HalfFloatType,
    };
    let a = new THREE.WebGLRenderTarget(w, h, o);
    let b = new THREE.WebGLRenderTarget(w, h, o);
    return {
        get read()  { return a; },
        get write() { return b; },
        swap()      { [a, b] = [b, a]; },
        dispose()   { a.dispose(); b.dispose(); },
    };
}

function mat(frag: string, u: Record<string, THREE.IUniform>) {
    return new THREE.ShaderMaterial({ vertexShader: VERT, fragmentShader: frag, uniforms: u, depthTest: false });
}

// ── Component ─────────────────────────────────────────────────────────────────

interface Props { width?: number; height?: number; }

export default function FluidCanvas({ width = 750, height = 680 }: Props) {
    const mountRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const el = mountRef.current;
        if (!el) return;

        const SIM = 128;
        const simRes    = new THREE.Vector2(SIM, SIM);
        const canvasRes = new THREE.Vector2(width, height);

        const renderer = new THREE.WebGLRenderer({ antialias: false });
        renderer.setSize(width, height);
        renderer.setPixelRatio(1);
        el.appendChild(renderer.domElement);

        const scene = new THREE.Scene();
        const cam   = new THREE.OrthographicCamera(-.5, .5, .5, -.5, .1, 10);
        cam.position.z = 1;
        const quad  = new THREE.Mesh(new THREE.PlaneGeometry(1, 1));
        scene.add(quad);

        // FBOs
        const vel    = doubleFBO(SIM, SIM);
        const curlFB = doubleFBO(SIM, SIM);
        const dens   = doubleFBO(SIM, SIM);

        // Materials
        const mAdvectVel = mat(ADVECT, {
            u_vel:  { value: vel.read.texture },
            u_src:  { value: vel.read.texture },
            u_diss: { value: 0.985 },
        });
        const mCurl = mat(CURL_FRAG, {
            u_vel: { value: vel.read.texture },
            u_res: { value: simRes },
        });
        const mVort = mat(VORT_FRAG, {
            u_vel:      { value: vel.read.texture },
            u_curl:     { value: curlFB.read.texture },
            u_res:      { value: simRes },
            u_dt:       { value: 0.016 },
            u_strength: { value: 28 },
        });
        const mAdvectDen = mat(ADVECT, {
            u_vel:  { value: vel.read.texture },
            u_src:  { value: dens.read.texture },
            u_diss: { value: 1 - 1 / (60 * 3.2) },
        });
        const mSplat = mat(SPLAT, {
            u_src: { value: null },
            u_pt:  { value: new THREE.Vector2() },
            u_col: { value: new THREE.Vector3() },
            u_r:   { value: 0.10 * 0.10 },
            u_res: { value: canvasRes },
        });

        const loader   = new THREE.TextureLoader();
        const backTex  = loader.load(RichieBase.src);
        const frontTex = loader.load(RichieHover.src);
        for (const t of [backTex, frontTex]) {
            t.wrapS = t.wrapT = THREE.ClampToEdgeWrapping;
            t.minFilter = t.magFilter = THREE.LinearFilter;
        }

        const mDisplay = mat(DISPLAY, {
            u_back:          { value: backTex },
            u_front:         { value: frontTex },
            u_density:       { value: dens.read.texture },
            u_mouse:         { value: new THREE.Vector2(-1, -1) },
            u_canvas:        { value: canvasRes },
            u_time:          { value: 0 },
            u_radius:        { value: 36 },
            u_noiseFreq:     { value: 10.4 },
            u_noiseStrength: { value: 2.1 },
            u_timeSpeed:     { value: 0.5 },
            u_blend:         { value: 0.85 },
            u_backAspect:    { value: RichieBase.width  / RichieBase.height  },
            u_frontAspect:   { value: RichieHover.width / RichieHover.height },
        });

        function pass(m: THREE.ShaderMaterial, target: THREE.WebGLRenderTarget | null) {
            quad.material = m;
            renderer.setRenderTarget(target);
            renderer.render(scene, cam);
        }

        function splat(x: number, y: number, dx: number, dy: number) {
            mSplat.uniforms.u_pt.value.set(x, y);

            mSplat.uniforms.u_src.value = vel.read.texture;
            mSplat.uniforms.u_col.value.set(dx * 15, dy * 15, 0);
            pass(mSplat, vel.write);
            vel.swap();

            mSplat.uniforms.u_src.value = dens.read.texture;
            mSplat.uniforms.u_col.value.set(3.5, 3.5, 3.5);
            pass(mSplat, dens.write);
            dens.swap();
        }

        const mouse = { x: -1, y: -1, px: -1, py: -1, inside: false };

        const onMove = (e: MouseEvent) => {
            const rect = renderer.domElement.getBoundingClientRect();
            mouse.px = mouse.x; mouse.py = mouse.y;
            mouse.x  = (e.clientX - rect.left)  / rect.width;
            mouse.y  = 1 - (e.clientY - rect.top) / rect.height;
            if (mouse.inside && mouse.px >= 0) {
                splat(mouse.x, mouse.y, mouse.x - mouse.px, mouse.y - mouse.py);
            }
            mDisplay.uniforms.u_mouse.value.set(mouse.x, mouse.y);
        };
        const onEnter = () => { mouse.inside = true; };
        const onLeave = () => {
            mouse.inside = false;
            mouse.px = mouse.py = -1;
            mDisplay.uniforms.u_mouse.value.set(-1, -1);
        };
        renderer.domElement.addEventListener("mousemove",  onMove);
        renderer.domElement.addEventListener("mouseenter", onEnter);
        renderer.domElement.addEventListener("mouseleave", onLeave);

        let t = 0;
        let animId: number;
        function frame() {
            t += 0.016;
            mDisplay.uniforms.u_time.value = t;

            // 1. advect velocity
            mAdvectVel.uniforms.u_vel.value = vel.read.texture;
            mAdvectVel.uniforms.u_src.value = vel.read.texture;
            pass(mAdvectVel, vel.write);
            vel.swap();

            // 2. curl
            mCurl.uniforms.u_vel.value = vel.read.texture;
            pass(mCurl, curlFB.write);
            curlFB.swap();

            // 3. vorticity confinement — swirls orgánicos en el fluid
            mVort.uniforms.u_vel.value  = vel.read.texture;
            mVort.uniforms.u_curl.value = curlFB.read.texture;
            pass(mVort, vel.write);
            vel.swap();

            // 4. advect density
            mAdvectDen.uniforms.u_vel.value = vel.read.texture;
            mAdvectDen.uniforms.u_src.value = dens.read.texture;
            pass(mAdvectDen, dens.write);
            dens.swap();

            // 5. display
            mDisplay.uniforms.u_density.value = dens.read.texture;
            pass(mDisplay, null);

            animId = requestAnimationFrame(frame);
        }
        animId = requestAnimationFrame(frame);

        return () => {
            cancelAnimationFrame(animId);
            renderer.domElement.removeEventListener("mousemove",  onMove);
            renderer.domElement.removeEventListener("mouseenter", onEnter);
            renderer.domElement.removeEventListener("mouseleave", onLeave);
            vel.dispose(); curlFB.dispose(); dens.dispose();
            backTex.dispose(); frontTex.dispose();
            renderer.dispose();
            if (el.contains(renderer.domElement)) el.removeChild(renderer.domElement);
        };
    }, [width, height]);

    return <div ref={mountRef} style={{ width, height, cursor: "crosshair", display: "block" }} />;
}
