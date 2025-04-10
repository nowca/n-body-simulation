<h2>Implementing the N-Body-Particle-System with the WebGL-Wrapper</h2>

<h3>NBODY_APP-Object</h3>

You can find the main code of the N-Body-Application in the `NBODY_APP`-Object.

The `NBODY_APP`-Object uses 5 main nodes:

```javascript 
001 | var NBODY_APP = {
002 |     animate: undefined,
003 |     isRunning: true,
004 |    
005 |     CONFIG: {
...
030 |     DATA: {
...
067 |     WEBGL: {
...
076 |     EVENTS: {
...
099 |     GUI: {
...
};
```
`NBODY_APP.CONFIG`: the main configuration-variables of the N-Body Application

`NBODY_APP.DATA`: the node for rendering- and particle-calculation-data

`NBODY_APP.WEBGL`: initialization-, animation-calculation and animation-rendering-functions calling the WebGL-functions in `WEBGL_W`

`NBODY_APP.EVENTS`: events handler-functions and event-configuration

`NBODY_APP.GUI`: node for external GUI-libraries `dat.GUI` and `Stats`

<br>

<h3>NBODY_APP.CONFIG</h3>

The initial values of the application-configuration, which can be controlled through the GUI at runtime

<br>

<h3>NBODY_APP.DATA</h3>

The `NBODY_APP.DATA` sub-object contains the rendering data for the cube edges and the particle-cluster-object

<h4>NBODY_APP.DATA.ParticleCluster</h4>

This is the Particle-Cluster-Object, with all the particle-data like the position of each particle for Newton-based calculation.

```javascript 
111 | NBODY_APP.DATA.ParticleCluster = new function()
112 | {
113 |    this.BODY_MASSES    = [];
114 |    this.BODY_POSITIONS = [];
115 |    this.N = 0;
116 |
117 |    this.rx = [];
118 |    this.ry = [];
119 |    this.rz = [];
120 |    this.vx = [];
121 |    this.vy = [];
122 |    this.vz = [];
123 |    this.ax = [];   
124 |    this.ay = [];
125 |    this.az = [];
126 |    this.m  = [];
127 |    this.f  = [];
... |
129 |    this.G = NBODY_APP.CONFIG.gravityConstant * Math.pow(10.0,-11.0);
130 |    this.dt = NBODY_APP.CONFIG.deltaTime;
...
```

The Object holds all the particle values in arrays:

- `N`: number of particles
- `r*`: position
- `v*`: velocity
- `a*`: acceleration
- `m`: mass
- `f`: force
- `G`: gravity 
- `dt`: delta-time or step-time.

(the gravity-constant is calculated to *6.673e-11* or *6.673 x (10^⁻11) = 0.00000000006673*)

<br>

```javascript 
232 | this.computeNBody = function()
233 | {
234 |     // for each particle
235 |     for (var i = 0; i < this.N; i++) 
...
237 |         if (i != j) // step over the same particle
...
244 |             // for each other particle
245 |             for (var j = 0; j < this.N; j++)
...
275 | };
```

The values are used in the `computeNBody`-function, where the *acceleration*, *velocity* and *position* is computed *for each particle in relation to all other particles* in the cluster. You can read an explanation for the **N-Body-algorithm** later in the README-file.

<br>

```javascript 
151 | this.generateRandomData = function(body_count)
```
- generates a sphere with *n random particles*.

<br>

```javascript 
195 | this.setParticleData = function(BODY_MASSES, BODY_POSITIONS)
```
- copies the positions and masses of an array into the `ParticleCluster`-Object

<br>

```javascript 
212 | this.updateVertexData = function()
```
- updates the particle positions and colors of the `ParticleCluster`-Object into the rendering data `NBODY_APP.DATA.renderData.particles`

<br>

<h3>NBODY_APP.WEBGL</h3>

<h4>The WebGL-related functions of the N-Body Application</h4>

The `NBODY_APP.WEBGL` sub-object contains all the *WebGL initialization functions* of the `WEBGL_W` wrapper-object  to get the WebGL-Application running.

- `NBODY_APP.WEBGL.initViewport` : Viewport initialization on the canvas
- `NBODY_APP.WEBGL.initShader` : loading the *Shader code* and creating the *Shader program* and *location references* of the shader variables
- `NBODY_APP.WEBGL.initBufferData` : binding of the *WebGL buffer data* for vertices, indices and colors
- `NBODY_APP.WEBGL.initMatrixData` : initialization of the *Model-View-Projection-Matrix (MVP)* 
- `NBODY_APP.WEBGL.setGLContextConfig` : some WebGL-configurations
- `NBODY_APP.WEBGL.calculateAnimFrame` and `NBODY_APP.WEBGL.renderAnimFrame` : calculation and rendering in the `window.requestAnimFrame(NBODY_APP.animFrame)`

For more information see the documentation of the [WebGL API](https://www.khronos.org/webgl/)

<br>

<h3>NBODY_APP.EVENTS</h3>


<h4>Event Handler functions for the GUI</h4>

All the functions in the `NBODY_APP.EVENTS` sub-object are event related callback functions for
pressing or scrolling mouse buttons, moving the mouse or touch screen input, which are all called in the `NBODY_APP.EVENTS.initEventHandlers` function

<br>

<h3>NBODY_APP.GUI</h3>

<h4>GUI front-end control related wrapper function</h4>

The `NBODY_APP.GUI.initGUI` calls all the necessary program parameters of the `dat.GUI`-library and the `Stats`-library. For more information see <https://github.com/dataarts/dat.gui>

<br>