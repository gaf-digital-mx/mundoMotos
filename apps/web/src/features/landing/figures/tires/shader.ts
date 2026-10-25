// @ts-nocheck -- Integration note, not the figure's own code: this drawing was built outside
// this app against the kit and is copied in as its author wrote it. It predates this project's
// `noUncheckedIndexedAccess` and `exactOptionalPropertyTypes`, and patching the index reads
// would turn every refresh into a merge. Its exported types still reach callers.
// The tyre paste on the bead and the bubbles it makes where air leaks past an unseated
// bead. World space, same camera as the SVG: the band lies on the tyre's upper shoulder
// just outside the rim flange.
import { FLANGE_R, RIM_TOP } from "./view";

const f = (value: number) => value.toFixed(2);

export const FOAM_FRAGMENT = `
uniform float uLube;
uniform float uLeak;
uniform float uFoam;
uniform float uSeat;
uniform float uLight;
uniform float uPop;
const float R0=${f(FLANGE_R)};
const float Z0=${f(RIM_TOP + 0.2)};
const float TAU=6.2831853;

// height of the tyre's shoulder just outside the flange
float shoulder(float r){return Z0+3.4*smoothstep(R0,R0+10.,r);}

vec4 over(vec4 top,vec4 under){return top+under*(1.-top.a);}
vec4 inkFor(vec3 seen,float cover){vec3 absorbed=1.-seen;float a=max(max(absorbed.r,max(absorbed.g,absorbed.b)),cover);return vec4(vec3(a)-absorbed,a);}

// one ring of bubbles: cells around the bead, each with its own life
void bubbles(vec2 q,float r,float th,float n,float seed,float px,inout float film,inout float body,inout float spec,inout float hue){
  float cell=th/TAU*n;
  float i0=floor(cell);
  for(int k=-1;k<=1;k++){
    float i=mod(i0+float(k),n);
    float h1=hash12(vec2(i,seed));
    float h2=hash12(vec2(seed,i+7.3));
    float h3=hash12(vec2(i*1.7+seed,3.1));
    float on=smoothstep(h3-.12,h3+.12,uLeak*1.15);
    if(on<.002)continue;
    float period=.9+.9*h1;
    float age=fract(uTime/period+h2);
    float grow=smoothstep(0.,.75,age);
    float fade=1.-smoothstep(.82,1.,age);
    float rad=(.9+1.7*h2)*grow;
    float a=(i+.5+(h1-.5)*.5)/n*TAU;
    float rc=R0+.6+rad+1.2*h3;
    vec2 c=-vec2(cos(a),sin(a))*rc;
    float d=length(q-c);
    float w=max(.24,.9*px);
    float rim=exp(-pow((d-rad)/w,2.))*on*fade;
    float inside=(1.-smoothstep(rad-w,rad,d))*on*fade;
    film+=rim;
    body=max(body,inside);
    vec2 g=c+vec2(-.4,-.4)*rad;
    spec+=exp(-pow(length(q-g)/(.22*rad+.5*w),2.))*on*fade*grow;
    hue+=rim*(age*1.7+h1*3.+atan(q.y-c.y,q.x-c.x)*.3);
  }
}

void main(){
  vec2 vb=viewOf(gl_FragCoord.xy);
  float px=pixelOf()/uCam.z;
  vec3 p=onFloor(vb,Z0);
  p=onFloor(vb,shoulder(length(p.xy)));
  p=onFloor(vb,shoulder(length(p.xy)));
  float r=length(p.xy);
  float th=atan(p.y,p.x)+3.14159265;
  if(r<R0-2.||r>R0+14.){gl_FragColor=vec4(0.);return;}

  // the paste: a wet band from the flange edge, brushed along the bead
  float band=smoothstep(R0+.05,R0+.05+.8*px,r)*(1.-smoothstep(R0+3.5,R0+6.5,r));
  float brush=noise2(vec2(th*36.,r*.9))*.7+noise2(vec2(th*90.,r*1.7))*.3;
  float wet=band*uLube;
  float gloss=smoothstep(.62,.86,brush)*wet;

  float film=0.;float body=0.;float spec=0.;float hue=0.;
  if(uLeak>.001){
    bubbles(p.xy,r,th,64.,1.3,px,film,body,spec,hue);
    bubbles(p.xy,r,th,41.,7.9,px,film,body,spec,hue);
  }
  float edge=smoothstep(R0+.05,R0+.05+.8*px,r);
  film*=edge;body*=edge;spec*=edge;
  hue=hue/max(film,1e-3);
  vec3 iris=.5+.5*cos(TAU*(hue*.35+vec3(0.,.33,.67)));

  // lather left in the paste once the bead has leaked: fine closed cells
  float lather=uFoam*band*smoothstep(.5,.8,noise2(vec2(th*170.,r*2.6)));
  // the moment the bead pops home it squeezes the paste out along the flange
  float squeeze=uPop*band*exp(-pow((r-(R0+1.))/2.2,2.));

  vec4 ink;
  if(uLight>.5){
    // gloss shows as less ink: paper can't be brighter than white
    vec4 wetInk=inkFor(vec3(.86,.89,.92),0.)*wet*.9*(1.-.55*gloss);
    vec4 latherInk=inkFor(vec3(.80,.84,.88),0.)*lather*.8;
    vec3 rimSeen=mix(vec3(.56,.62,.70),.42+.5*iris,.45);
    vec4 rimInk=inkFor(rimSeen,0.)*min(film,1.);
    vec4 bodyInk=inkFor(vec3(.93,.95,.98),.12)*body*.55;
    vec4 popInk=inkFor(vec3(.82,.86,.9),0.)*squeeze*.5;
    ink=over(rimInk,over(bodyInk,over(popInk,over(latherInk,wetInk))));
    // the glint on each bubble: a pale spot, near white
    vec4 glint=inkFor(vec3(.97,.98,1.),.5)*min(spec,1.)*.8;
    ink=over(glint,ink);
  }else{
    vec3 col=vec3(.05,.06,.075)*wet+vec3(.16,.18,.2)*gloss+vec3(.07,.075,.08)*lather;
    col+=(.28+.55*iris)*min(film,1.)*.75+vec3(.05,.06,.07)*body+vec3(.9)*min(spec,1.)*.6+vec3(.08,.09,.1)*squeeze;
    col=tonemap(col,1.2);
    ink=vec4(col,max(col.r,max(col.g,col.b)));
  }
  ink*=uSeat;
  ink.rgb=min(ink.rgb,vec3(ink.a));
  float n=(hash12(gl_FragCoord.xy+fract(uTime*.61)*91.)+hash12(gl_FragCoord.yx*1.37+fract(uTime*.37)*57.)-1.)/255.;
  ink=max(ink+n*smoothstep(0.,1.5/255.,ink.a),0.);
  gl_FragColor=ink;
}`;
