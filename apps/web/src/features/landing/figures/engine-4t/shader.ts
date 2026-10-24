// The gas inside the cutaway. Everything inside the engine lies on the section plane y = 0, the
// same plane the SVG cut faces are drawn on, so it registers with the drawn bore, chamber and
// ports. Outside, the exhaust puffs and the air drawn into the filter are small volumes in
// world space, measured from each pixel's ray (screen distance / uK is the true distance).
// Every term is a continuous function of crank angle or rides an envelope, so nothing pops.

export const GAS_FRAGMENT = `
uniform float uCrown;
uniform float uFresh;
uniform float uSqueeze;
uniform float uFlame;
uniform float uFront;
uniform float uBurnt;
uniform float uIn;
uniform float uEx;
uniform float uSpark;
uniform float uRun;
uniform float uLight;
uniform float uPhase;
uniform vec4 uSmoke[10];
uniform vec4 uAir[8];
uniform float uBore;
uniform float uDeck;
uniform float uDome;
uniform vec4 uInA;
uniform vec4 uExA;
uniform float uInR;
uniform float uExR;
uniform vec3 uPlug;

float sdCapsule(vec2 p,vec2 a,vec2 b,float r){vec2 pa=p-a,ba=b-a;float h=clamp(dot(pa,ba)/dot(ba,ba),0.,1.);return length(pa-ba*h)-r;}
vec4 over(vec4 top,vec4 under){return top+under*(1.-top.a);}
vec4 ink(vec3 seen,float a){return vec4(seen*a,a);}

void main(){
  vec2 vb=viewOf(gl_FragCoord.xy);
  float px=pixelOf()/uCam.w;
  vec3 w=onWallY(vb,0.);
  vec2 q=w.xz;
  float soft=.8*px;

  // where gas can be: the bore above the crown, the chamber dome, and the two ports
  float dome=uDeck+uDome*sqrt(max(0.,1.-(q.x/uBore)*(q.x/uBore)));
  float inBore=(1.-smoothstep(uBore-soft,uBore+soft,abs(q.x)))*smoothstep(uCrown-soft,uCrown+soft,q.y)*(1.-smoothstep(dome-soft,dome+soft,q.y));
  float dIn=sdCapsule(q,uInA.xy,uInA.zw,uInR);
  float dEx=sdCapsule(q,uExA.xy,uExA.zw,uExR);
  float inPort=(1.-smoothstep(-soft,soft,dIn))*(1.-smoothstep(45.5-soft,45.5+soft,-q.x));
  float exPort=(1.-smoothstep(-soft,soft,dEx))*(1.-smoothstep(45.5-soft,45.5+soft,q.x));
  float cyl=max(inBore,0.);

  float t=uTime;
  // fresh mixture: blue, swirling, denser and deeper as it is squeezed
  float swirl=fbm2(vec2(q.x*.06+t*.35,q.y*.06-t*.5)+uPhase);
  float charge=uFresh*(.55+.45*swirl)*(1.-uFlame*.95);
  vec3 blueL=mix(vec3(.45,.68,1.),vec3(.12,.38,.92),clamp(uSqueeze,0.,1.));
  vec4 col=ink(blueL,cyl*charge*(.72+.22*uSqueeze));

  // burnt gas: warm while hot, grey as it is pushed out
  float smokeN=fbm2(vec2(q.x*.05-t*.2,q.y*.05+t*.3)+7.1);
  vec3 burntC=mix(vec3(.56,.54,.52),vec3(.86,.48,.2),uFlame*.6);
  col=over(ink(burntC,cyl*uBurnt*(.48+.3*smokeN)),col);

  // the flame: a front that grows from the plug tip, turbulent, a pale core and an orange body
  vec2 tip=uPlug.xz;
  float r=length(q-tip);
  float reach=uFront*uBore*1.45;
  float n=fbm2(q*.09+vec2(0.,-t*2.4))*14.;
  float body=(1.-smoothstep(reach-6.,reach+4.,r-n*uFront))*uFlame*cyl;
  float heat=exp(-r/(10.+24.*uFront));
  vec3 fire=mix(vec3(.85,.22,.04),vec3(1.,.62,.12),smoothstep(.15,.6,heat+.2*swirl));
  fire=mix(fire,vec3(1.,.95,.78),smoothstep(.55,.95,heat)*uFlame);
  col=over(ink(fire,min(.96,body*(.75+.25*heat))),col);

  // the spark: a tiny white-blue point with a short glow
  float sd=length(q-tip-vec2(0.,-1.5));
  float spark=uSpark*(exp(-sd*sd/2.)+.35*exp(-sd/5.));
  col=over(ink(mix(vec3(.55,.75,1.),vec3(1.),exp(-sd*sd/2.)),min(.95,spark)),col);

  // flow in the ports: streaks that run toward the cylinder (intake) and away from it (exhaust)
  vec2 inDir=normalize(uInA.xy-uInA.zw);
  float inS=dot(q-uInA.zw,inDir);
  float inStreak=.55+.45*sin(inS*.35-t*9.+noise2(q*.2)*3.);
  col=over(ink(vec3(.35,.62,1.),inPort*uIn*(.45+.35*inStreak)*uFresh),col);
  vec2 exDir=normalize(uExA.zw-uExA.xy);
  float exS=dot(q-uExA.xy,exDir);
  float exStreak=.55+.45*sin(exS*.3-t*8.+noise2(q*.2+3.)*3.);
  vec3 exC=mix(vec3(.55,.53,.52),vec3(.9,.45,.15),smoothstep(.3,1.,uBurnt)*.5);
  col=over(ink(exC,exPort*uEx*(.55+.35*exStreak)),col);

  // outside: exhaust puffs leaving the pipe, and air drawn into the filter
  vec4 outside=vec4(0.);
  for(int i=0;i<10;i++){
    vec4 s=uSmoke[i];
    if(s.w<=0.)continue;
    float age=s.w;
    float rad=3.+age*15.;
    float d=length(vb-project(s.xyz))/uK;
    float dens=exp(-d*d/(rad*rad))*smoothstep(0.,.12,age)*(1.-smoothstep(.45,1.15,age));
    float g=fbm2(vb*.05+float(i)*3.1+t*.3);
    outside=over(ink(mix(vec3(.6,.6,.62),vec3(.8,.8,.82),g),dens*.55*(.6+.4*g)),outside);
  }
  for(int i=0;i<8;i++){
    vec4 s=uAir[i];
    if(s.w<=0.)continue;
    float d=length(vb-project(s.xyz))/uK;
    float rad=4.+6.*(1.-s.w);
    float dens=exp(-d*d/(rad*rad))*smoothstep(0.,.3,s.w)*(1.-smoothstep(.75,1.,s.w));
    outside=over(ink(vec3(.55,.75,1.),dens*.35),outside);
  }
  col=over(col,outside);

  col*=uRun;
  float a=col.a;
  float dn=(hash12(gl_FragCoord.xy+fract(t*.61)*91.)-.5)/255.;
  col=clamp(col+dn*smoothstep(0.,1.5/255.,a),0.,1.);
  col.rgb=min(col.rgb,vec3(col.a));
  gl_FragColor=col;
}
`;
