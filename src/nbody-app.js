var NBODY_APP = {
    animate: undefined,
    isRunning: true,
    
    CONFIG: {
        body: {
            count: 1000,
            randomMasses: false,
            globalMassValue: 1.0
        },
        particles: {
            color: [ 255*0.2, 255*0.3, 255*0.4 ],
            colorChange: true,
            pointSize: 2.0,
            sphereStartRadius: 0.50,
            filledStartPoints: false,
        },
        gravityConstant: 6.673,
        deltaTime: 30.0,
        edges: {
            draw: true
        },
        rotation: {
            autoRotate: true,
            speed: 1.0
        },
        projection: {
            type: WEBGL_W.APP.Matrix.projectionType.PERSPECTIVE,
            fov: 30,
            near: 1,
            far: 100
        }
    },

    DATA: {
        ParticleCluster: {},
        scale: 0,
        renderData: {
            edges: {
                vertices: [
                    -1.0, 1.0, 1.0,
                    -1.0,-1.0, 1.0,
                     1.0,-1.0, 1.0,
                     1.0, 1.0, 1.0,

                    -1.0, 1.0,-1.0,
                     1.0, 1.0,-1.0,
                     1.0,-1.0,-1.0,
                    -1.0,-1.0,-1.0
                ],
                colors: [
                    0.25, 0.25, 0.25,
                    0.25, 0.25, 0.25,
                    0.25, 0.25, 0.25,
                    0.25, 0.25, 0.25,
                    0.25, 0.25, 0.25,
                    0.25, 0.25, 0.25,
                    0.25, 0.25, 0.25,
                    0.25, 0.25, 0.25,
                ],
                indices: [
                    0, 1, 1, 2, 2, 3, 3, 0, 0, 4, 4, 5, 5, 6, 6, 7, 7, 4, 3, 5, 2, 6, 1, 7
                ]
            },
            particles: {
                vertices: [],
                colors:   []
            }
        }
    },

    WEBGL: {
        initShader: undefined,
        initBufferData: undefined,
        initMatrixData: undefined,
        setGLContextConfig: undefined,
        calculateAnimFrame: undefined,
        renderAnimFrame: undefined
    },

    EVENTS: {
        Mouse: {
            DECELERATION_FACTOR: 0.85,
            drag: false,
            position: {
                old_x: 0,
                old_y: 0,
                dx: 0.1,
                dy: 0.05,
                theta: 0,
                phi: 0,
                delta: 0
            },
        },
        onMouseDown: undefined,
        onMouseUp: undefined,
        onMouseMove: undefined,
        onMouseScroll: undefined,
        onResize: undefined,

        initEventHandlers: undefined
    },

    GUI: {
        dat: undefined,
        stats: undefined,
        init: undefined
    }
};

NBODY_APP.DATA.ParticleCluster = new function()
{
    this.BODY_MASSES    = [];
    this.BODY_POSITIONS = [];
    this.N = 0;

    this.rx = [];
    this.ry = [];
    this.rz = [];
    this.vx = [];
    this.vy = [];
    this.vz = [];
    this.ax = [];
    this.ay = [];
    this.az = [];
    this.m  = [];
    this.f  = [];

    //this.G   = 6.673e-11; // gravity constant: 6.673 * Math.pow(10.0,-11.0)
    this.G = NBODY_APP.CONFIG.gravityConstant * Math.pow(10.0,-11.0);
    this.dt = NBODY_APP.CONFIG.deltaTime;
    // epsilon: softening factor = avoids division through zero on collision
    var eps = 0.1;

    this.pushBody = function(x, y, z)
    {
        var body = [x, y, z, 0.0, 0.0, 0.0];

        NBODY_APP.DATA.ParticleCluster.BODY_POSITIONS.push(body);

        if (NBODY_APP.CONFIG.body.randomMasses)
        {
            NBODY_APP.DATA.ParticleCluster.BODY_MASSES.push(Math.random() * (10.0 - 0.1) + 0.1);
        }
        else
        {
            NBODY_APP.DATA.ParticleCluster.BODY_MASSES.push(NBODY_APP.CONFIG.body.globalMassValue);
        }
    }

    this.generateRandomData = function(body_count)
    {
        this.N = body_count;
        this.BODY_MASSES    = [];
        this.BODY_POSITIONS = [];

        // center coordinates of sphere
        var x0 = 0.0;
        var y0 = 0.0;
        var z0 = 0.0;

        if (NBODY_APP.CONFIG.particles.filledStartPoints)
        {
            for (var i = 0; i < this.N; i++)
            {
                var radius = 2.0;
                var half_radius = radius/2;

                var random_x    = x0 + (radius * Math.random()) - half_radius;
                var random_y    = y0 + (radius * Math.random()) - half_radius;
                var random_z    = z0 + (radius * Math.random()) - half_radius;

                this.pushBody(random_x, random_y, random_z);
            }
        }
        else
        {
            for (var i = 0; i < this.N; i++)
            {
                var u      = Math.random();
                var v      = Math.random();
                var radius = NBODY_APP.CONFIG.particles.sphereStartRadius;
                var theta  = 2 * Math.PI * u;
                var phi    = Math.acos(2 * v - 1);

                var random_x    = x0 + (radius * Math.sin(phi) * Math.cos(theta));
                var random_y    = y0 + (radius * Math.sin(phi) * Math.sin(theta));
                var random_z    = z0 + (radius * Math.cos(phi));

                this.pushBody(random_x, random_y, random_z);
            }
        }
    };

    this.setParticleData = function(BODY_MASSES, BODY_POSITIONS)
    {
        for (var i = 0; i < this.N; i++) {
            this.rx[i] = BODY_POSITIONS[i][0];
            this.ry[i] = BODY_POSITIONS[i][1];
            this.rz[i] = BODY_POSITIONS[i][2];
            this.vx[i] = BODY_POSITIONS[i][3];
            this.vy[i] = BODY_POSITIONS[i][4];
            this.vz[i] = BODY_POSITIONS[i][5];
            this.ax[i] = 0.0;
            this.ay[i] = 0.0;
            this.az[i] = 0.0;
            this.m[i] = BODY_MASSES[i];
            this.f[i] = 0.0;
        }
    };

    this.updateVertexData = function()
    {
        var _vertices = [];
        var _colors = [];

        for (var i = 0; i < this.N; i++)
        {
            var colorChange = NBODY_APP.CONFIG.particles.colorChange? this.f[i] * 100000 : 0;

            _vertices[i * 3]     = this.rx[i];
            _vertices[i * 3 + 1] = this.ry[i];
            _vertices[i * 3 + 2] = this.rz[i];
            _colors[i * 3]       = NBODY_APP.CONFIG.particles.color[0] / 255;
            _colors[i * 3 + 1]   = NBODY_APP.CONFIG.particles.color[1] / 255 + colorChange;
            _colors[i * 3 + 2]   = NBODY_APP.CONFIG.particles.color[2] / 255;
        }

        NBODY_APP.DATA.renderData.particles.vertices = _vertices;
        NBODY_APP.DATA.renderData.particles.colors   = _colors;
    };

    this.computeNBody = function()
    {
        // for each particle
        for (var i = 0; i < this.N; i++)
        {
            if (i != j) // ignore accelerating particle
            { 
                this.ax[i] = 0.0; // warum auf 0 setzen ?
                this.ay[i] = 0.0;
                this.az[i] = 0.0;
                this.f[i] = 0.0;

                // for each other particle
                for (var j = 0; j < this.N; j++)
                {
                    var dx = this.rx[j] - this.rx[i];
                    var dy = this.ry[j] - this.ry[i];
                    var dz = this.rz[j] - this.rz[i];

                    var R_ij  = Math.sqrt(dx * dx + dy * dy + dz * dz + eps);
                    var R_ij3 = (R_ij * R_ij * R_ij);

                    var f = this.G * this.m[j] / R_ij3;

                    this.f[i] += f;

                    // set acceleration
                    this.ax[i] += f * dx;
                    this.ay[i] += f * dy;
                    this.az[i] += f * dz;
                }

                // set velocity
                this.vx[i] += this.ax[i] * this.dt;
                this.vy[i] += this.ay[i] * this.dt;
                this.vz[i] += this.az[i] * this.dt;

                // set position
                this.rx[i] += this.vx[i] * this.dt;
                this.ry[i] += this.vy[i] * this.dt;
                this.rz[i] += this.vz[i] * this.dt;
            }
        }
    };
}

NBODY_APP.DATA.initParticleCluster = function()
{
    NBODY_APP.DATA.ParticleCluster.generateRandomData(NBODY_APP.CONFIG.body.count);
    NBODY_APP.DATA.ParticleCluster.setParticleData(
        NBODY_APP.DATA.ParticleCluster.BODY_MASSES,
        NBODY_APP.DATA.ParticleCluster.BODY_POSITIONS
    );
}

NBODY_APP.WEBGL.initViewport = function()
{
    WEBGL_W.HTML.mainElement = document.getElementById("main").innerHTML;
    WEBGL_W.APP.setViewport('webgl-canvas');
}

NBODY_APP.WEBGL.initShader = function()
{
    WEBGL_W.APP.Shader.script.vertex   = WEBGL_W.APP.getShader("gl-shader-vertex", WEBGL_W.context.VERTEX_SHADER);
    WEBGL_W.APP.Shader.script.fragment = WEBGL_W.APP.getShader("gl-shader-fragment", WEBGL_W.context.FRAGMENT_SHADER);

    WEBGL_W.APP.Shader.program = WEBGL_W.APP.createShaderProgram(WEBGL_W.APP.Shader.script.vertex, WEBGL_W.APP.Shader.script.fragment);

    WEBGL_W.APP.Shader.location.u_pointSize        = WEBGL_W.context.getUniformLocation(WEBGL_W.APP.Shader.program, "u_pointSize");
    WEBGL_W.APP.Shader.location.u_projectionMatrix = WEBGL_W.context.getUniformLocation(WEBGL_W.APP.Shader.program, "u_projectionMatrix");
    WEBGL_W.APP.Shader.location.u_viewMatrix       = WEBGL_W.context.getUniformLocation(WEBGL_W.APP.Shader.program, "u_viewMatrix");
    WEBGL_W.APP.Shader.location.u_modelMatrix      = WEBGL_W.context.getUniformLocation(WEBGL_W.APP.Shader.program, "u_modelMatrix");

    WEBGL_W.context.uniform1f(WEBGL_W.APP.Shader.location.u_pointSize, 5.0);
}

NBODY_APP.WEBGL.initBufferData = function()
{
    WEBGL_W.APP.Buffer = {
        edges:     {},
        particles: {}
    }

    WEBGL_W.APP.Buffer.edges.vertices = WEBGL_W.APP.bindBufferData(
        WEBGL_W.context.ARRAY_BUFFER,
        new Float32Array(NBODY_APP.DATA.renderData.edges.vertices),
        WEBGL_W.context.STATIC_DRAW
    );

    WEBGL_W.APP.Buffer.edges.indices = WEBGL_W.APP.bindBufferData(
        WEBGL_W.context.ELEMENT_ARRAY_BUFFER,
        new Uint16Array(NBODY_APP.DATA.renderData.edges.indices),
        WEBGL_W.context.STATIC_DRAW
    );

    WEBGL_W.APP.Buffer.edges.colors  = WEBGL_W.APP.bindBufferData(
        WEBGL_W.context.ARRAY_BUFFER,
        new Float32Array(NBODY_APP.DATA.renderData.edges.colors),
        WEBGL_W.context.STATIC_DRAW
    );

    WEBGL_W.APP.Buffer.particles.vertices =  WEBGL_W.APP.bindBufferData(
        WEBGL_W.context.ARRAY_BUFFER,
        new Float32Array(NBODY_APP.DATA.renderData.particles.vertices),
        WEBGL_W.context.DYNAMIC_DRAW
    );

    WEBGL_W.APP.Buffer.particles.colors =  WEBGL_W.APP.bindBufferData(
        WEBGL_W.context.ARRAY_BUFFER,
        new Float32Array(NBODY_APP.DATA.renderData.particles.colors),
        WEBGL_W.context.DYNAMIC_DRAW
    );
}

NBODY_APP.WEBGL.initMatrixData = function()
{
    WEBGL_W.APP.Matrix.viewMatrix  = WEBGL_W.APP.Matrix.transform.getIdentityMatrix();
    WEBGL_W.APP.Matrix.modelMatrix = WEBGL_W.APP.Matrix.transform.getIdentityMatrix();

    WEBGL_W.APP.Matrix.initProjectionMatrix(
        NBODY_APP.CONFIG.projection.type,
        NBODY_APP.CONFIG.projection.fov,
        NBODY_APP.CONFIG.projection.near,
        NBODY_APP.CONFIG.projection.far
    );
}

NBODY_APP.WEBGL.setGLContextConfig = function()
{
    WEBGL_W.context.enable(WEBGL_W.context.BLEND);
    WEBGL_W.context.disable(WEBGL_W.context.DEPTH_TEST);
    WEBGL_W.context.blendFunc(WEBGL_W.context.SRC_ALPHA, WEBGL_W.context.ONE);
}

NBODY_APP.WEBGL.calculateAnimFrame = function()
{
    WEBGL_W.APP.Buffer.particles.vertices = WEBGL_W.APP.bindBufferData(
        WEBGL_W.context.ARRAY_BUFFER,
        new Float32Array(NBODY_APP.DATA.renderData.particles.vertices),
        WEBGL_W.context.DYNAMIC_DRAW
    );
    WEBGL_W.APP.Buffer.particles.colors = WEBGL_W.APP.bindBufferData(
        WEBGL_W.context.ARRAY_BUFFER,
        new Float32Array(NBODY_APP.DATA.renderData.particles.colors),
        WEBGL_W.context.STATIC_DRAW
    );

    NBODY_APP.DATA.scale *= NBODY_APP.EVENTS.Mouse.DECELERATION_FACTOR;

    if (!NBODY_APP.EVENTS.Mouse.drag)
    {
        NBODY_APP.EVENTS.Mouse.position.dx    *= NBODY_APP.EVENTS.Mouse.DECELERATION_FACTOR;
        NBODY_APP.EVENTS.Mouse.position.dy    *= NBODY_APP.EVENTS.Mouse.DECELERATION_FACTOR;
        NBODY_APP.EVENTS.Mouse.position.theta += NBODY_APP.EVENTS.Mouse.position.dx;
        NBODY_APP.EVENTS.Mouse.position.phi   += NBODY_APP.EVENTS.Mouse.position.dy;

        if (NBODY_APP.CONFIG.rotation.autoRotate)
        {
            NBODY_APP.EVENTS.Mouse.position.dx += (NBODY_APP.CONFIG.rotation.speed / 10000);
        }
    }

    // set model matrix
    WEBGL_W.APP.Matrix.modelMatrix = WEBGL_W.APP.Matrix.transform.getIdentityMatrix();
    WEBGL_W.APP.Matrix.modelMatrix = WEBGL_W.APP.Matrix.transform.rotateY(WEBGL_W.APP.Matrix.modelMatrix, NBODY_APP.EVENTS.Mouse.position.theta);
    WEBGL_W.APP.Matrix.modelMatrix = WEBGL_W.APP.Matrix.transform.rotateX(WEBGL_W.APP.Matrix.modelMatrix, NBODY_APP.EVENTS.Mouse.position.phi);

    // set view matrix
    if (WEBGL_W.APP.Matrix.projectionType.activeType ==  WEBGL_W.APP.Matrix.projectionType.PERSPECTIVE)
    {
        WEBGL_W.APP.Matrix.viewMatrix = WEBGL_W.APP.Matrix.transform.translate(WEBGL_W.APP.Matrix.viewMatrix, 0.0, 0.0, NBODY_APP.DATA.scale);
    }
    else if (WEBGL_W.APP.Matrix.projectionType.activeType ==  WEBGL_W.APP.Matrix.projectionType.ORTHOGRAPHIC)
    {
        WEBGL_W.APP.Matrix.viewMatrix = WEBGL_W.APP.Matrix.transform.translate(WEBGL_W.APP.Matrix.viewMatrix, 0.0, 0.0, NBODY_APP.DATA.scale*10000);
    }

    // set mvp matrix location values
    WEBGL_W.context.uniformMatrix4fv(WEBGL_W.APP.Shader.location.u_projectionMatrix, false, WEBGL_W.APP.Matrix.projectionMatrix);
    WEBGL_W.context.uniformMatrix4fv(WEBGL_W.APP.Shader.location.u_viewMatrix, false, WEBGL_W.APP.Matrix.viewMatrix);
    WEBGL_W.context.uniformMatrix4fv(WEBGL_W.APP.Shader.location.u_modelMatrix, false, WEBGL_W.APP.Matrix.modelMatrix);

    WEBGL_W.context.uniform1f(WEBGL_W.APP.Shader.location.u_pointSize, NBODY_APP.CONFIG.particles.pointSize);
}

NBODY_APP.WEBGL.renderAnimFrame = function()
{
    WEBGL_W.APP.clearCanvas(0.0, 0.0, 0.0, 1.0);

    if (NBODY_APP.CONFIG.edges.draw)
    {
        // draw edges
        WEBGL_W.APP.Shader.location.a_position = WEBGL_W.APP.getLocationReference(WEBGL_W.context.ARRAY_BUFFER, WEBGL_W.APP.Buffer.edges.vertices, "a_position");
        WEBGL_W.APP.Shader.location.a_color    = WEBGL_W.APP.getLocationReference(WEBGL_W.context.ARRAY_BUFFER, WEBGL_W.APP.Buffer.edges.colors, "a_color");
        WEBGL_W.context.bindBuffer(WEBGL_W.context.ELEMENT_ARRAY_BUFFER, WEBGL_W.APP.Buffer.edges.indices);
        WEBGL_W.context.lineWidth(1);
        WEBGL_W.context.drawElements(WEBGL_W.context.LINES, NBODY_APP.DATA.renderData.edges.indices.length, WEBGL_W.context.UNSIGNED_SHORT, 0);
    }

    // draw particles
    WEBGL_W.APP.Shader.location.a_position = WEBGL_W.APP.getLocationReference(WEBGL_W.context.ARRAY_BUFFER, WEBGL_W.APP.Buffer.particles.vertices, "a_position");
    WEBGL_W.APP.Shader.location.a_color    = WEBGL_W.APP.getLocationReference(WEBGL_W.context.ARRAY_BUFFER, WEBGL_W.APP.Buffer.particles.colors, "a_color");
    WEBGL_W.context.drawArrays(WEBGL_W.context.POINTS, 0, NBODY_APP.DATA.renderData.particles.vertices.length / 3);
}

NBODY_APP.EVENTS.onMouseDown = function(event)
{
    NBODY_APP.EVENTS.Mouse.drag = true;
    NBODY_APP.EVENTS.Mouse.position.old_x = event.pageX;
    NBODY_APP.EVENTS.Mouse.position.old_y = event.pageY;
    event.preventDefault();

    return false;
}

NBODY_APP.EVENTS.onMouseUp = function(event)
{
    NBODY_APP.EVENTS.Mouse.drag = false;
}

NBODY_APP.EVENTS.onMouseMove = function(event)
{
    if (!NBODY_APP.EVENTS.Mouse.drag)
    {
        return false;
    }
    NBODY_APP.EVENTS.Mouse.position.dx = (event.pageX - NBODY_APP.EVENTS.Mouse.position.old_x) * 2 * Math.PI / WEBGL_W.HTML.canvasElement.width;
    NBODY_APP.EVENTS.Mouse.position.dy = (event.pageY - NBODY_APP.EVENTS.Mouse.position.old_y) * 2 * Math.PI / WEBGL_W.HTML.canvasElement.height;
    NBODY_APP.EVENTS.Mouse.position.theta += NBODY_APP.EVENTS.Mouse.position.dx;
    NBODY_APP.EVENTS.Mouse.position.phi   += NBODY_APP.EVENTS.Mouse.position.dy;
    NBODY_APP.EVENTS.Mouse.position.old_x = event.pageX;
    NBODY_APP.EVENTS.Mouse.position.old_y = event.pageY;
    event.preventDefault();
}

NBODY_APP.EVENTS.onMouseScroll = function(event)
{
    if (!event)
    {
        event = window.event;
    }

    if (event.wheelDelta)
    {
        NBODY_APP.EVENTS.Mouse.position.delta = event.wheelDelta / 60.0; // IE and Opera
    }
    else if (event.detail)
    {
        NBODY_APP.EVENTS.Mouse.position.delta = -event.detail / 2.0; // W3C
    }

    NBODY_APP.DATA.scale = NBODY_APP.EVENTS.Mouse.position.delta / 50.0;
}

NBODY_APP.EVENTS.initEventHandlers = function()
{
    // mouse ui
    WEBGL_W.HTML.canvasElement.addEventListener("mousedown", NBODY_APP.EVENTS.onMouseDown, false);
    WEBGL_W.HTML.canvasElement.addEventListener("mouseup", NBODY_APP.EVENTS.onMouseUp, false);
    WEBGL_W.HTML.canvasElement.addEventListener("mouseout", NBODY_APP.EVENTS.onMouseUp, false);
    WEBGL_W.HTML.canvasElement.addEventListener("mousemove", NBODY_APP.EVENTS.onMouseMove, false);
    WEBGL_W.HTML.canvasElement.addEventListener("mousescroll", NBODY_APP.EVENTS.onMouseScroll, false);
    WEBGL_W.HTML.canvasElement.addEventListener("mousewheel", NBODY_APP.EVENTS.onMouseScroll, false);
    WEBGL_W.HTML.canvasElement.addEventListener("DOMMouseScroll", NBODY_APP.EVENTS.onMouseScroll, false);
    // touch ui
    WEBGL_W.HTML.canvasElement.addEventListener("ontouchstart", NBODY_APP.EVENTS.onMouseDown, false);
    WEBGL_W.HTML.canvasElement.addEventListener("ontouchend", NBODY_APP.EVENTS.onMouseUp, false);
    WEBGL_W.HTML.canvasElement.addEventListener("ontouchmove", NBODY_APP.EVENTS.onMouseMove, false);

    // window gui
    window.addEventListener('resize', function()
    {
        // use callback function to reinitialize mvp matrix on resize to preserve projection dimensions (prevent distorition or stretched projection)
        WEBGL_W.EVENTS.onResizeCanvas(function()
        {
            NBODY_APP.WEBGL.initMatrixData();
        });
    });
};

NBODY_APP.GUI.initGUI = function()
{
    NBODY_APP.GUI.dat = new dat.GUI();


    NBODY_APP.GUI.dat.parameters = {
        'BODY COUNT':           NBODY_APP.CONFIG.body.count,
        'GRAVITY':              NBODY_APP.CONFIG.gravityConstant,
        'TIMESTEP':             NBODY_APP.DATA.ParticleCluster.dt,
        'GLOBAL BODY MASSES':   NBODY_APP.CONFIG.body.globalMassValue,
        'RANDOM BODY MASSES':   NBODY_APP.CONFIG.body.randomMasses,
        'SPHERE START RADIUS':  NBODY_APP.CONFIG.particles.sphereStartRadius,
        'FILLED START POINTS':  NBODY_APP.CONFIG.particles.filledStartPoints,
        'ORTHOGRAPHIC':         false,
        'FOV':                  NBODY_APP.CONFIG.projection.fov,
        'NEAR':                 NBODY_APP.CONFIG.projection.near,
        'FAR':                  NBODY_APP.CONFIG.projection.far,
        'AUTO ROTATION':        NBODY_APP.CONFIG.rotation.autoRotate,
        'ROTATION SPEED':       NBODY_APP.CONFIG.rotation.speed,
        'COLOR CHANGE':         NBODY_APP.CONFIG.particles.colorChange,
        'COLOR':                NBODY_APP.CONFIG.particles.color,
        'POINT SIZE':           NBODY_APP.CONFIG.particles.pointSize,
        'CUBE EDGES':           NBODY_APP.CONFIG.edges.draw,
        'PAUSE':                function () {
            NBODY_APP.isRunning = !NBODY_APP.isRunning;
        },
        'RESTART':              function () {
            NBODY_APP.DATA.ParticleCluster.setParticleData(
                NBODY_APP.DATA.ParticleCluster.BODY_MASSES,
                NBODY_APP.DATA.ParticleCluster.BODY_POSITIONS
            );
        },
        'RESET':                function () {
            NBODY_APP.reset();
        }
    };

    NBODY_APP.GUI.dat.folders    = [];
    NBODY_APP.GUI.dat.folders['VALUES'] = NBODY_APP.GUI.dat.addFolder('VALUES');
    NBODY_APP.GUI.dat.folders['PROJECTION'] = NBODY_APP.GUI.dat.addFolder('PROJECTION');
    NBODY_APP.GUI.dat.folders['RENDERING'] = NBODY_APP.GUI.dat.addFolder('RENDERING');
    NBODY_APP.GUI.dat.folders['CONTROL'] = NBODY_APP.GUI.dat.addFolder('CONTROL');

    NBODY_APP.GUI.dat.folders['VALUES'].open();
    NBODY_APP.GUI.dat.folders['PROJECTION'].open();
    NBODY_APP.GUI.dat.folders['RENDERING'].open();
    NBODY_APP.GUI.dat.folders['CONTROL'].open();

    NBODY_APP.GUI.dat.folders['VALUES'].add(NBODY_APP.GUI.dat.parameters, 'BODY COUNT', 10, 10000).step(1).onChange(function(count)
    {
        NBODY_APP.CONFIG.body.count = count;
        NBODY_APP.reset();
    });
    NBODY_APP.GUI.dat.folders['VALUES'].add(NBODY_APP.GUI.dat.parameters, 'GRAVITY', 0.000, 10.000).step(0.001).onChange(function(gravity)
    {
        NBODY_APP.CONFIG.gravityConstant = gravity;
        NBODY_APP.DATA.ParticleCluster.G = gravity * Math.pow(10.0,-11.0);
    });
    NBODY_APP.GUI.dat.folders['VALUES'].add(NBODY_APP.GUI.dat.parameters, 'TIMESTEP', -100, 100).step(1).onChange(function(speed)
    {
        NBODY_APP.CONFIG.deltaTime = speed;
        NBODY_APP.DATA.ParticleCluster.dt = NBODY_APP.CONFIG.deltaTime;
    });
    NBODY_APP.GUI.dat.folders['VALUES'].add(NBODY_APP.GUI.dat.parameters, 'GLOBAL BODY MASSES', 0, 10).step(0.1).onChange(function(mass)
    {
        NBODY_APP.CONFIG.body.globalMassValue = mass;
        NBODY_APP.reset();
    });
    NBODY_APP.GUI.dat.folders['VALUES'].add(NBODY_APP.GUI.dat.parameters, 'RANDOM BODY MASSES').onChange(function(random)
    {
        NBODY_APP.CONFIG.body.randomMasses = !NBODY_APP.CONFIG.body.randomMasses;
        NBODY_APP.reset();
    });
    NBODY_APP.GUI.dat.folders['VALUES'].add(NBODY_APP.GUI.dat.parameters, 'SPHERE START RADIUS', 0.01, 2).step(0.01).onChange(function(radius)
    {
        NBODY_APP.CONFIG.particles.sphereStartRadius = radius;
        NBODY_APP.reset();
    });
    NBODY_APP.GUI.dat.folders['VALUES'].add(NBODY_APP.GUI.dat.parameters, 'FILLED START POINTS').onChange(function(filled)
    {
        NBODY_APP.CONFIG.particles.filledStartPoints = !NBODY_APP.CONFIG.particles.filledStartPoints;
        NBODY_APP.reset();
    });
    NBODY_APP.GUI.dat.folders['PROJECTION'].add(NBODY_APP.GUI.dat.parameters, 'ORTHOGRAPHIC').onChange(function(type)
    {
        if (type == false)
        {
            NBODY_APP.CONFIG.projection.type = WEBGL_W.APP.Matrix.projectionType.PERSPECTIVE;
        }
        if (type == true)
        {
            NBODY_APP.CONFIG.projection.type = WEBGL_W.APP.Matrix.projectionType.ORTHOGRAPHIC;
        }

        WEBGL_W.APP.Matrix.initProjectionMatrix(
            NBODY_APP.CONFIG.projection.type,
            NBODY_APP.CONFIG.projection.fov,
            NBODY_APP.CONFIG.projection.near,
            NBODY_APP.CONFIG.projection.far
        );
    });
    NBODY_APP.GUI.dat.folders['PROJECTION'].add(NBODY_APP.GUI.dat.parameters, 'FOV', 0, 360).step(0.1).onChange(function(fov)
    {
        NBODY_APP.CONFIG.projection.fov = fov;
        WEBGL_W.APP.Matrix.initProjectionMatrix(
            NBODY_APP.CONFIG.projection.type,
            NBODY_APP.CONFIG.projection.fov,
            NBODY_APP.CONFIG.projection.near,
            NBODY_APP.CONFIG.projection.far
        );
    });
    NBODY_APP.GUI.dat.folders['PROJECTION'].add(NBODY_APP.GUI.dat.parameters, 'NEAR', 0, 50).step(0.1).onChange(function(near)
    {
        NBODY_APP.CONFIG.projection.near = near;
        WEBGL_W.APP.Matrix.initProjectionMatrix(
            NBODY_APP.CONFIG.projection.type,
            NBODY_APP.CONFIG.projection.fov,
            NBODY_APP.CONFIG.projection.near,
            NBODY_APP.CONFIG.projection.far
        );
    });
    NBODY_APP.GUI.dat.folders['PROJECTION'].add(NBODY_APP.GUI.dat.parameters, 'FAR', 50, 100).step(0.1).onChange(function(far)
    {
        NBODY_APP.CONFIG.projection.near = far;
        WEBGL_W.APP.Matrix.initProjectionMatrix(
            NBODY_APP.CONFIG.projection.type,
            NBODY_APP.CONFIG.projection.fov,
            NBODY_APP.CONFIG.projection.near,
            NBODY_APP.CONFIG.projection.far
        );
    });
    NBODY_APP.GUI.dat.folders['RENDERING'].add(NBODY_APP.GUI.dat.parameters, 'AUTO ROTATION').onChange(function(rotate)
    {
        NBODY_APP.CONFIG.rotation.autoRotate = !NBODY_APP.CONFIG.rotation.autoRotate;
    });
    NBODY_APP.GUI.dat.folders['RENDERING'].add(NBODY_APP.GUI.dat.parameters, 'ROTATION SPEED', -100, 100).onChange(function(speed)
    {
        NBODY_APP.CONFIG.rotation.speed = speed;
    });
    NBODY_APP.GUI.dat.folders['RENDERING'].add(NBODY_APP.GUI.dat.parameters, 'CUBE EDGES').onChange(function(draw)
    {
        NBODY_APP.CONFIG.edges.draw = draw;
    });
    NBODY_APP.GUI.dat.folders['RENDERING'].add(NBODY_APP.GUI.dat.parameters, 'COLOR CHANGE').onChange(function(change)
    {
        NBODY_APP.CONFIG.particles.colorChange = !NBODY_APP.CONFIG.particles.colorChange;
    });
    NBODY_APP.GUI.dat.folders['RENDERING'].addColor(NBODY_APP.GUI.dat.parameters, 'COLOR').onChange(function(color)
    {
        NBODY_APP.CONFIG.particles.color = [color[0], color[1], color[2]];
    });
    NBODY_APP.GUI.dat.folders['RENDERING'].add(NBODY_APP.GUI.dat.parameters, 'POINT SIZE', 0, 100).step(1).onChange(function(size)
    {
        NBODY_APP.CONFIG.particles.pointSize = size;
    });
    NBODY_APP.GUI.dat.folders['CONTROL'].add(NBODY_APP.GUI.dat.parameters, 'PAUSE').onChange(function(e)
    {
        NBODY_APP.GUI.dat.folders['CONTROL'].domElement.querySelectorAll('span').forEach(function(item)
        {
            if (item.innerText == 'PAUSE')
            {
                var parentItem = item.parentNode.parentNode;

                if (parentItem.classList.contains("active"))
                {
                    parentItem.classList.remove("active");
                }
                else
                {
                    parentItem.classList.add("active");
                }
            }
        });
    });;
    NBODY_APP.GUI.dat.folders['CONTROL'].add(NBODY_APP.GUI.dat.parameters, 'RESTART');
    NBODY_APP.GUI.dat.folders['CONTROL'].add(NBODY_APP.GUI.dat.parameters, 'RESET');



    NBODY_APP.GUI.stats = new Stats();
    NBODY_APP.GUI.stats.showPanel(0); // 0: fps, 1: ms, 2: mb, 3+: custom
    document.body.appendChild(NBODY_APP.GUI.stats.dom);
}

NBODY_APP.initialize = function()
{
    NBODY_APP.WEBGL.initViewport();
    NBODY_APP.WEBGL.initShader();
    NBODY_APP.WEBGL.initBufferData();
    NBODY_APP.WEBGL.initMatrixData();
    NBODY_APP.WEBGL.setGLContextConfig();
    NBODY_APP.EVENTS.initEventHandlers();
    NBODY_APP.DATA.initParticleCluster();
    NBODY_APP.GUI.initGUI();
}

NBODY_APP.animFrame = function(time)
{
    NBODY_APP.GUI.stats.begin();

    if (NBODY_APP.isRunning)
    {
        NBODY_APP.DATA.ParticleCluster.computeNBody();
        NBODY_APP.DATA.ParticleCluster.updateVertexData();
    }

    NBODY_APP.WEBGL.calculateAnimFrame();
    NBODY_APP.WEBGL.renderAnimFrame();

    NBODY_APP.GUI.stats.end();

    window.requestAnimFrame(NBODY_APP.animFrame);
}

NBODY_APP.reset = function()
{
    NBODY_APP.DATA.ParticleCluster.generateRandomData(NBODY_APP.CONFIG.body.count);
    NBODY_APP.DATA.ParticleCluster.setParticleData(
        NBODY_APP.DATA.ParticleCluster.BODY_MASSES,
        NBODY_APP.DATA.ParticleCluster.BODY_POSITIONS
    );
}

NBODY_APP.run = function()
{
    NBODY_APP.animFrame(0);
}