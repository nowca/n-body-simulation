window.requestAnimFrame = (function() {
    return window.requestAnimationFrame       ||
           window.webkitRequestAnimationFrame ||
           window.mozRequestAnimationFrame    ||
           window.oRequestAnimationFrame      ||
           window.msRequestAnimationFrame     ||
           function(callback, element) {
                window.setTimeout(callback, 1000/60);
           };
})();

var WEBGL_W = {
    context: undefined,

    HTML: {
        mainElement: undefined,
	    canvasId: undefined,
        canvasElement: undefined
    },
	
	APP: {
		// member objects
		Shader: {
			script: {
				vertex: undefined,
				fragment: undefined
			},
			program: undefined,
            location: {}
		},
		Buffer: {},
        Matrix: {
            projectionType: {
                PERSPECTIVE:  0,
                ORTHOGRAPHIC: 1,
                activeType: 0
            },
            transform: {},
            projectionMatrix: undefined,
            viewMatrix: undefined,
            modelMatrix: undefined,

            initProjectionMatrix: undefined
        },

		// member functions
		getShader: undefined,
		createShaderProgram: undefined,
		setViewport: undefined,
		bindBufferData: undefined,
		clearCanvas: undefined
	},

    EVENTS: {
        onResizeCanvas: function(callbackFunction) {
            WEBGL_W.HTML.canvasElement.width  = window.innerWidth;
            WEBGL_W.HTML.canvasElement.height = window.innerHeight;
            WEBGL_W.context.viewport(0, 0, WEBGL_W.HTML.canvasElement.width, WEBGL_W.HTML.canvasElement.height);
            callbackFunction();
        }
    }
};

WEBGL_W.APP.Matrix.transform = {
    getProjectionMatrix: function(type, fov, aspect, near, far)
    {
        var perspectiveMatrix = [];

        var top = 0;
        if (WEBGL_W.APP.Matrix.projectionType.activeType == WEBGL_W.APP.Matrix.projectionType.PERSPECTIVE)
        {
            top = near * Math.tan((Math.PI / 180) * (fov / 2));
        }
        else
        {
            top = 0.0001;
        }
        
        var bottom = -top;
        var right  = top * aspect;
        var left   = -right;

        if (type == 0)
        {
            perspectiveMatrix = [
                (2 * near) / (right - left), 0, (right + left) / (right - left), 0,
                0, (2 * near) / (top - bottom), (top + bottom) / top - bottom, 0,
                0, 0, -((far + near) / (far - near)), -((2 * far * near) / (far - near)),
                0, 0, -1, 0
            ];
        }
        else if (type == 1)
        {
            perspectiveMatrix = [
                2 / (right - left), 0, 0, -((right + left) / (right - left)),
                0, 2 / (top - bottom), 0, -((top + bottom) / (top - bottom)),
                0, 0, -(2 / (far - near)), -((far + near) / (far - near)),
                0, 0, 0, 1
            ];
        }

        return perspectiveMatrix;
    },

    getIdentityMatrix: function()
    {
        return [1, 0, 0, 0,
                0, 1, 0, 0,
                0, 0, 1, 0,
                0, 0, 0, 1];
    },

    radToDeg: function(radians)
    {
        return radians * 180 / Math.PI;
    },

    degToRad: function(degrees)
    {
        return degrees * Math.PI / 180;
    },

    multiply: function(matrixA, matrixB)
    {
        var result = [];
        var LENGTH  = 4;
        var tempResult = 0;

        for (var row_mA = 0; row_mA < LENGTH; row_mA++) {
            for (var col_mB = 0; col_mB < LENGTH; col_mB++) {
                for (var pos = 0; pos < LENGTH; pos++) { 
                    tempResult += matrixA[pos + LENGTH * row_mA] * matrixB[LENGTH * pos + col_mB];
                }
                result.push(tempResult);
                tempResult = 0;
            }
        }

        return result;
    }, 

    translate: function(matrix, tX, tY, tZ)
    {
        var translationMatrix = [1, 0, 0, 0,
                                0, 1, 0, 0,
                                0, 0, 1, 0,
                                tX, tY, tZ, 1];

        return this.multiply(matrix, translationMatrix);
    },

    rotateX: function(matrix, angle)
    {
        var c = Math.cos(angle);
        var s = Math.sin(angle);

        var rotationMatrix = [
            1, 0, 0, 0,
            0, c, s, 0,
            0,-s, c, 0,
            0, 0, 0, 1
        ];

        return this.multiply(matrix, rotationMatrix);
    },

    rotateY: function(matrix, angle)
    {
        var c = Math.cos(angle);
        var s = Math.sin(angle);

        var rotationMatrix = [
            c, 0,-s, 0,
            0, 1, 0, 0,
            s, 0, c, 0,
            0, 0, 0, 1
        ];

        return this.multiply(matrix, rotationMatrix);
    },

    rotateZ: function(matrix, angle)
    {
        var c = Math.cos(angle);
        var s = Math.sin(angle);

        var rotationMatrix = [
            c, s, 0, 0,
           -s, c, 0, 0,
            0, 0, 1, 0,
            0, 0, 0, 1
        ];

        return this.multiply(matrix, rotationMatrix);
    },
    
    scale: function(matrix, sX, sY, sZ)
    {
        var rotationMatrix =  [
            sX, 0, 0, 0,
            0, sY, 0, 0,
            0, 0, sZ, 0,
            0, 0, 0, 1
        ];

        return this.multiply(matrix, rotationMatrix);
    }
};

WEBGL_W.APP.Matrix.initProjectionMatrix = function(type, fov, near, far)
{
    WEBGL_W.APP.Matrix.projectionType.activeType = (type == 0 || type == 1) ? type : 0;

    WEBGL_W.APP.Matrix.projectionMatrix = WEBGL_W.APP.Matrix.transform.getProjectionMatrix(
        WEBGL_W.APP.Matrix.projectionType.activeType,
        (fov > 0 && fov < 360) ? fov : 40,
        WEBGL_W.HTML.canvasElement.width / WEBGL_W.HTML.canvasElement.height,
        (near > 0 && near < far) ? near : 1,
        far > near ? far : 100
    );

    WEBGL_W.APP.Matrix.viewMatrix[14] = WEBGL_W.APP.Matrix.projectionType.activeType ==  WEBGL_W.APP.Matrix.projectionType.PERSPECTIVE ? -4.0 : -20000;
}

WEBGL_W.APP.setViewport = function(webglCanvasId)
{
    WEBGL_W.HTML.canvasId = webglCanvasId;

    // retrieve the HTML canvas element and setup the WebGL rendering context
    WEBGL_W.HTML.canvasElement = window.document.getElementById(WEBGL_W.HTML.canvasId);

    WEBGL_W.context = WEBGL_W.HTML.canvasElement.getContext("webgl");

    // check if WebGL rendering context is available
    if (!WEBGL_W.context) {
        alert('There is no WebGL context available.');

        return;
    }

    WEBGL_W.HTML.canvasElement.width  = window.innerWidth;
    WEBGL_W.HTML.canvasElement.height = window.innerHeight;

    // setup the WebGL viewport
    WEBGL_W.context.viewport(0, 0, WEBGL_W.HTML.canvasElement.width, WEBGL_W.HTML.canvasElement.height);
};

WEBGL_W.APP.getShader = function(htmlScriptShaderId, SHADER_TYPE)
{
    // get html shader script element
    var htmlShaderScriptElement = window.document.getElementById(htmlScriptShaderId);

    // create a shader object
    var webGLShader = WEBGL_W.context.createShader(SHADER_TYPE);

    // attach shader source code
    WEBGL_W.context.shaderSource(webGLShader, htmlShaderScriptElement.text);

    // compile the shader
    WEBGL_W.context.compileShader(webGLShader);

    // check whether or not the last shader compilation was successful
    if (!WEBGL_W.context.getShaderParameter(webGLShader, WEBGL_W.context.COMPILE_STATUS))
    {
        alert("Couldn't compile the shader from source: " + htmlScriptShaderId);
        WEBGL_W.context.deleteShader(webGLShader);
        return;
    }

    return webGLShader;
};

WEBGL_W.APP.createShaderProgram = function(vertexShader, fragmentShader)
{
    // create a shader program object to store the combined shader program
    var webGLShaderProgram = WEBGL_W.context.createProgram();

    // attach a vertex shader
    WEBGL_W.context.attachShader(webGLShaderProgram, vertexShader);

    // attach a fragment shader
    WEBGL_W.context.attachShader(webGLShaderProgram, fragmentShader);

    // link both programs
    WEBGL_W.context.linkProgram(webGLShaderProgram);

    // check whether or not the last link operation was successful
    if (!WEBGL_W.context.getProgramParameter(webGLShaderProgram, WEBGL_W.context.LINK_STATUS)) {
        alert("Unable to initialise shaders");
        WEBGL_W.context.deleteProgram(webGLShaderProgram);
        WEBGL_W.context.deleteProgram(vertexShader);
        WEBGL_W.context.deleteProgram(fragmentShader);

        return;
    }

    // use the combined shader program object
    WEBGL_W.context.useProgram(webGLShaderProgram);

    return webGLShaderProgram;
};

WEBGL_W.APP.bindBufferData = function(BUFFER_TYPE, bufferData, DRAW_MODE)
{
    // create an empty buffer object to store the data
     var webglBuffer = WEBGL_W.context.createBuffer();

     // bind appropriate array buffer to it
     WEBGL_W.context.bindBuffer(BUFFER_TYPE, webglBuffer);
  
     // pass the data to the buffer
     WEBGL_W.context.bufferData(BUFFER_TYPE, bufferData, DRAW_MODE);

     // unbind the buffer
     WEBGL_W.context.bindBuffer(BUFFER_TYPE, null);

     return webglBuffer;
};

WEBGL_W.APP.getLocationReference = function(BUFFER_TYPE, bufferObject, variableName)
{
    WEBGL_W.context.bindBuffer(BUFFER_TYPE, bufferObject);

    var gl_locationReference = WEBGL_W.context.getAttribLocation(WEBGL_W.APP.Shader.program, variableName);

    WEBGL_W.context.vertexAttribPointer(gl_locationReference, 3, WEBGL_W.context.FLOAT, false, 0, 0) ;
    WEBGL_W.context.enableVertexAttribArray(gl_locationReference);
    
    return gl_locationReference;
};

WEBGL_W.APP.clearCanvas = function(red, green, blue, alpha)
{
    // clear the canvas
    WEBGL_W.context.clearColor(red, green, blue, alpha);
    WEBGL_W.context.clearDepth(1.0);

    // enable the depth test
    WEBGL_W.context.enable(WEBGL_W.context.DEPTH_TEST);

    // clear the color buffer bit
    WEBGL_W.context.clear(WEBGL_W.context.COLOR_BUFFER_BIT | WEBGL_W.context.DEPTH_BUFFER_BIT);
};