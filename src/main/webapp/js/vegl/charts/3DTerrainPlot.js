/**
 * Panel extension for graphing points with a 1D attribute in 3D space
 *
 * 3D display is dependent on Three JS. Point scaling requires D3
 */

Ext.define('vegl.charts.3DTerrainPlot', {
    extend: 'Ext.panel.Panel',

    alias: 'widget.3dterrainplot',

    data : null,
    d3 : null, //D3 elements (graphs, lines etc).
    threeJs : null, //Three JS elements
    innerId: null, //Internal ID for rendering three js

    /**
     * Adds the following config
     * {
     *   data - Object[] - Optional - Data to intially plot in this widget. No data will be plotted if this is missing.
     *   pointSize - Number - Optional - Size of the data points in pixels (Unscaled each axis is 50 pixels wide) - Default - 10
     *   allowSelection - Booelan - Optional - True if points can be selected by clicking with the mouse. Default - false
     *
     *   xAttr - String - Optional - The name of the attribute to plot on the x axis (default - 'x')
     *   xLabel - String - Optional - The name of the x axis to show on the plot (default - 'X')
     *   xDomain - Number[] - Optional - The fixed range of values [min, max] to plot on the x axis. Defaults to data extents
     *
     *   yAttr - String - Optional - The name of the attribute to plot on the y axis (default - 'y')
     *   yLabel - String - Optional - The name of the y axis to show on the plot (default - 'Y')
     *   yDomain - Number[] - Optional - The fixed range of values [min, max] to plot on the y axis. Defaults to data extents
     *
     *   zAttr - String - Optional - The name of the attribute to plot on the z axis (default - 'z')
     *   zLabel - String - Optional - The name of the z axis to show on the plot (default - 'Z')
     *   zDomain - Number[] - Optional - The fixed range of values [min, max] to plot on the z axis. Defaults to data extents
     *
     *   valueAttr - String - Optional - The name of the attribute that controls the color value (default - 'value')
     *   valueLabel - String - Optional - The label of the attribute that controls the color value (default - 'Value')
     *   valueDomain - Number[] - Optional - The fixed range of values [min, max] to control color scale. Defaults to data extents
     *   valueScale - String - Optional - (not compatible with valueRenderer) How will the color scale be defined for the default rainbow plot - choose from ['linear', 'log'] (default - 'linear')
     *   valueRenderer - function(value) - Optional - (not compatible with valueScale) Given a value, return a 16 bit integer representing an RGB value in the form 0xffffff
     * }
     *
     * Adds the following events
     * {
     *  select : function(this, dataItem) - Fired when a scatter point is clicked
     *  deselect : function(this) - Fired when a scatter point deselected
     * }
     *
     */
    constructor : function (config) {
        this.d3 = null;
        this.threeJs = null;
        this.innerId = Ext.id();
        this.data = config.data || null;
        this.pointSize = config.pointSize || 10;
        this.allowSelection = config.allowSelection ? true : false;

        this.xAttr = config.xAttr || 'x';
        this.xLabel = config.xLabel || 'X';
        this.xDomain = config.xDomain || null;
        this.yAttr = config.yAttr || 'y';
        this.yLabel = config.yLabel || 'Y';
        this.yDomain = config.yDomain || null;
        this.zAttr = config.zAttr || 'z';
        this.zLabel = config.zLabel || 'Z';
        this.zDomain = config.zDomain || null;
        this.valueAttr = config.valueAttr || 'value';
        this.valueLabel = config.valueLabel || 'Value';
        this.valueDomain = config.valueDomain || null;
        this.valueScale = config.valueScale || 'linear';
        this.valueRenderer = config.valueRenderer || null;

        Ext.apply(config, {
            html : Ext.util.Format.format('<div id="{0}" style="width:100%;height:100%;"></div>', this.innerId)
        });

        this.callParent(arguments);

        this.addEvents(['select', 'deselect']);

        this.on('render', this._afterRender, this);
        this.on('resize', this._onResize, this);
    },

    /**
     * Initialise ThreeJS elements.
     */
    _afterRender : function () {
        this.threeJs = {
            camera : null,
            controls : null,
            scene : null,
            renderer : null,
            width : null,
            height : null
        };

        this.threeJs.scene = new THREE.Scene();

        var el = this.getEl();
        this.threeJs.width = el.getWidth();
        this.threeJs.height = el.getHeight();

        if (this.allowSelection) {
            //el.on('mousedown', this._handleMouseDown, this);
            //el.on('mouseup', this._handleMouseUp, this);

            this.threeJs.raycaster = new THREE.Raycaster();
            this.threeJs.raycaster.params.PointCloud.threshold = this.pointSize / 3;
        }

        this.threeJs.camera = new THREE.PerspectiveCamera(60, this.threeJs.width / this.threeJs.height, 1, 10000);
        this.threeJs.camera.position.x = 0;
        this.threeJs.camera.position.z = 120;
        this.threeJs.camera.position.y = 70;
        this.threeJs.scene.add(this.threeJs.camera);

        this.threeJs.controls = new THREE.OrbitControls(this.threeJs.camera);
        this.threeJs.controls.damping = 0.2;
        this.threeJs.controls.target = new THREE.Vector3(0, 0, 0);
        this.threeJs.controls.addEventListener('change', Ext.bind(this._renderThreeJs, this));

        // renderer
        this.threeJs.renderer = new THREE.WebGLRenderer({antialias : true});
        this.threeJs.renderer.setClearColor(0xffffff, 1);
        this.threeJs.renderer.setSize(this.threeJs.width, this.threeJs.height);
        this.threeJs.renderer.shadowMapType = THREE.PCFSoftShadowMap;


        var container = document.getElementById(this.innerId);
        container.appendChild(this.threeJs.renderer.domElement);

        // Need a perpetual animation loop for updating the user controls
        var me = this;
        var animate = function () {
            requestAnimationFrame(animate);
            me.threeJs.controls.update();
        };
        animate();

        if (this.data) {
            this.plot(this.data);
        }

        this._renderThreeJs();
    },

    /**
     * Renders the current state of the three JS camera/scene
     */
    _renderThreeJs : function () {
        this.threeJs.renderer.render(this.threeJs.scene, this.threeJs.camera);
    },

    /**
     * Update camera aspect ratio and renderer size
     */
    _onResize : function (me, width, height) {
        if (!this.threeJs) {
            return;
        }

        var el = this.getEl();
        this.threeJs.width = el.getWidth();
        this.threeJs.height = el.getHeight();
        this.threeJs.camera.aspect = this.threeJs.width / this.threeJs.height;
        this.threeJs.camera.updateProjectionMatrix();

        this.threeJs.renderer.setSize(this.threeJs.width, this.threeJs.height);

        this._renderThreeJs();
    },

    /**
     * Utility for turning a click event on dom element target
     * into an X/Y offset relative to that element
     *
     * From:
     * http://stackoverflow.com/questions/55677/how-do-i-get-the-coordinates-of-a-mouse-click-on-a-canvas-element
     */
    _relMouseCoords : function (event, target) {
        var totalOffsetX = 0;
        var totalOffsetY = 0;
        var canvasX = 0;
        var canvasY = 0;
        var currentElement = target;

        do {
            totalOffsetX += currentElement.offsetLeft - currentElement.scrollLeft;
            totalOffsetY += currentElement.offsetTop - currentElement.scrollTop;
        } while (currentElement = currentElement.offsetParent);

        canvasX = event.pageX - totalOffsetX;
        canvasY = event.pageY - totalOffsetY;

        return {
            x : canvasX,
            y : canvasY
        };
    },

    _handleMouseDown : function (e, t) {
    	e.browserEvent.preventDefault();
        this._md = this._relMouseCoords(e.browserEvent, t);
    },

    _handleMouseUp : function (e, t) {
    	e.browserEvent.preventDefault();
        var xy = this._relMouseCoords(e.browserEvent, t);
        var rawX = xy.x;
        var rawY = xy.y;

        // If the mouse has moved too far, dont count this as a click
        if (Math.abs(this._md.x - rawX) + Math.abs(this._md.y - rawY) > 10) {
            return;
        }

        // The X/Y needs to be scale independent
        var x = (rawX / this.threeJs.width) * 2 - 1;
        var y = -(rawY / this.threeJs.height) * 2 + 1;

        // Otherwise cast a ray and see what we intersect
        var mouse3D = new THREE.Vector3(x, y, 0.5).unproject(this.threeJs.camera);
        var direction = mouse3D.clone()
            .sub(this.threeJs.camera.position)
            .normalize();

        this.threeJs.raycaster.ray.set(this.threeJs.camera.position, direction);
        var intersections = this.threeJs.raycaster.intersectObject(this.threeJs.pointCloud);

        if (intersections.length > 0) {
            this._handlePointSelect(intersections[0].index, intersections[0].point);
        } else {
            this._clearPointSelect();
        }
        //e.stopPropagation();
    },

    _handlePointSelect : function (index, point) {
        var dataItem = this.data[index];
        var color = this.threeJs.pointCloud.geometry.colors[index];

        if (!this.threeJs.selectionMesh) {
            var selectionBox = new THREE.SphereGeometry(this.pointSize * 0.8, 8, 8);
            var selectionMaterial = new THREE.MeshBasicMaterial({ color: color, opacity: 1.0, transparent: false });
            this.threeJs.selectionMesh = new THREE.Mesh(selectionBox, selectionMaterial);
        } else {
            this.threeJs.selectionMesh.material.color = color;
        }

        this.threeJs.selectionMesh.position.set(
                this.d3.weScale(dataItem[this.xAttr]),
                this.d3.heightScale(dataItem[this.yAttr]),
                this.d3.nsScale(dataItem[this.zAttr])
        );
        this.threeJs.scene.add(this.threeJs.selectionMesh);
        this._renderThreeJs();
        this.fireEvent('select', this, dataItem);
    },

    _clearPointSelect : function () {
        if (this.threeJs.selectionMesh) {
            this.threeJs.scene.remove(this.threeJs.selectionMesh);
            this.threeJs.selectionMesh = null;
            this._renderThreeJs();
        }

        this.fireEvent('deselect', this);
    },

    _faceIsClockwise : function (faceid) {
    	// schoelace surveyor
    	// face 0 = data.faces[faceid][0],data.faces[faceid][1],data.faces[faceid][2]
    	// point 0 number = data.faces[faceid][0]
    	// point 0 = data.points[data.faces[faceid][0]].x
    	
    	return ((this.data.points[this.data.faces[faceid][0]].x*this.data.points[this.data.faces[faceid][1]].y)
    			+(this.data.points[this.data.faces[faceid][1]].x*this.data.points[this.data.faces[faceid][2]].y)
    			+(this.data.points[this.data.faces[faceid][2]].x*this.data.points[this.data.faces[faceid][0]].y)
    			-(this.data.points[this.data.faces[faceid][0]].y*this.data.points[this.data.faces[faceid][1]].x)
    			-(this.data.points[this.data.faces[faceid][1]].y*this.data.points[this.data.faces[faceid][2]].x)
    			-(this.data.points[this.data.faces[faceid][2]].y*this.data.points[this.data.faces[faceid][0]].x)) < 0
    },
    
    /**
     * Clear the entire contents of the scatter plot
     */
    clearPlot : function () {
        if (!this.threeJs) {
            return;
        }

        for (var i = this.threeJs.scene.children.length - 1; i >= 0; i--) {
            this.threeJs.scene.remove(this.threeJs.scene.children[i]);
        }
        this.d3 = {};
        this.data = null;
    },

    
    

    /**
     * Update the scatter plot with the specified data
     *
     * Adapted from http://bl.ocks.org/phil-pedruco/9852362
     *
     * @param data Object[] of objects containing x,y,z attributes and a "plot" attribute
     */
    plot : function(data) {
        var me = this;

        function v(x, y, z) {
            return new THREE.Vector3(x, y, z);
        }
        
        function _viewStage(n) {
        	if (n>=0 && n<numberOfStages) {
	        	scene.remove(waterlevels[current_stage]);
	            scene.add(waterlevels[n]);
	            current_stage = n;
	            Ext.getCmp('stageLabel').setText("Stage " + (n+1) + " of " + numberOfStages);
	            me._renderThreeJs();
        	}
        }

        function createTextCanvas(text, color, font, size) {
            size = size || 16;
            var canvas = document.createElement('canvas');
            var ctx = canvas.getContext('2d');
            var fontStr = (size + 'px ') + (font || 'Arial');
            ctx.font = fontStr;
            var w = ctx.measureText(text).width;
            var h = Math.ceil(size);
            canvas.width = w;
            canvas.height = h;
            ctx.font = fontStr;
            ctx.fillStyle = color || 'black';
            ctx.fillText(text, 0, Math.ceil(size * 0.8));
            return canvas;
        }

        
		function generateHeight( width, height ) {
			var size = width * height, data = new Uint8Array( size ),
			perlin = new ImprovedNoise(), quality = 1, z = Math.random() * 100;

			for ( var j = 0; j < 4; j ++ ) {
				for ( var i = 0; i < size; i ++ ) {
					var x = i % width, y = ~~ ( i / width );
					data[ i ] += Math.abs( perlin.noise( x / quality, y / quality, z ) * quality * 1.75 );
				}
				quality *= 5;
			}
			return data;
		}

        

        
        function createText2D(text, color, font, size, segW,
                segH) {
            var canvas = createTextCanvas(text, color, font, size);
            var plane = new THREE.PlaneGeometry(canvas.width, canvas.height, segW, segH);
            var tex = new THREE.Texture(canvas);
            tex.needsUpdate = true;
            var planeMat = new THREE.MeshBasicMaterial({
                map : tex,
                color : 0xffffff,
                transparent : true
            });

            // This is how we view the reversed text from behind
            // see:
            // http://stackoverflow.com/questions/20406729/three-js-double-sided-plane-one-side-reversed
            var backPlane = plane.clone();
            plane.merge(backPlane, new THREE.Matrix4().makeRotationY(Math.PI), 1);

            var mesh = new THREE.Mesh(plane, planeMat);
            mesh.scale.set(0.5, 0.5, 0.5);
            mesh.material.side = THREE.FrontSide;
            return mesh;
        }

        ///////////////////////////////////////////////////////////////////////////////////////////
        //
        // start here
        //
        ///////////////////////////////////////////////////////////////////////////////////////////

        this.clearPlot();
        this.data = data;

		// find outer boundaries of data
        this.d3.xExtent = this.xDomain || d3.extent(data.points, function(d) {return d[me.xAttr];});
        this.d3.yExtent = this.yDomain || d3.extent(data.points, function(d) {return d["e"];});
        this.d3.zExtent = this.zDomain || d3.extent(data.points, function(d) {return d[me.yAttr];});
        this.d3.valueExtent = this.valueDomain || d3.extent(data.points, function(d) {return d["w"][0];});
		
		this.d3.heightExtent=[Math.min(this.d3.yExtent[0],this.d3.valueExtent[0]),
								Math.max(this.d3.yExtent[1],this.d3.valueExtent[1]),]

		// calculate corners for cube
        var format = d3.format("+.3f");
        var vpts = {
            xMax : this.d3.xExtent[1],
            xCen : (this.d3.xExtent[1] + this.d3.xExtent[0]) / 2,
            xMin : this.d3.xExtent[0],
            yMax : this.d3.heightExtent[1],
            yCen : (this.d3.heightExtent[1] + this.d3.heightExtent[0]) / 2,
            yMin : this.d3.heightExtent[0],
            zMax : this.d3.zExtent[1],
            zCen : (this.d3.zExtent[1] + this.d3.zExtent[0]) / 2,
            zMin : this.d3.zExtent[0]
        };


		// calculate scaling	
        var weScale, nsScale, heightScale;

		var we=(this.d3.xExtent[1] - this.d3.xExtent[0]);
		var ns=(this.d3.zExtent[1] - this.d3.zExtent[0]);

		// Northern hemisphere might need correction
		var nsflip = 1
//		
//		if (this._faceIsClockwise(0)) {
//			nsflip = 1
//			console.log("Clockwise!")
//
//		} else {
//			console.log("notClockwise")
//		}
		
		if (Math.min(ns,we)/Math.max(ns,we)<0.05) {
	        nsScale = this.d3.nsScale = d3.scale.linear()
	        	.domain(this.d3.zExtent)
	        	.range([ 50, -50 ]);
	        weScale = this.d3.weScale = d3.scale.linear()
	        	.domain(this.d3.xExtent)
	        	.range([ -50, 50 ]);				
		} else {
	        if (ns > we) {
	        	nsScale = this.d3.nsScale = d3.scale.linear()
	            	.domain(this.d3.zExtent)
	            	.range([ nsflip*50, nsflip*-50 ]);
	            var wex=((100/ns)*we)/2;
	
	            weScale = this.d3.weScale = d3.scale.linear()
	            	.domain(this.d3.xExtent)
	            	.range([ -1*wex, wex ]);	
	        } else {
	        	weScale = this.d3.weScale = d3.scale.linear()
	            	.domain(this.d3.xExtent)
	            	.range([ -50, 50 ]);
	            var nsx=((100/we)*ns)/2;
	            nsScale = this.d3.nsScale = d3.scale.linear()
	            	.domain(this.d3.xExtent)
	            	.range([ nsx, -1*nsx ]);	
	        }
		}
        heightScale = this.d3.heightScale = d3.scale.linear()
            .domain(this.d3.heightExtent)
            .range([ -10, 10 ]);
        
        if (this.valueScale === 'linear') {
            valueScale = this.d3.valueScale = d3.scale.linear();
        } else if (this.valueScale === 'log') {
            valueScale = this.d3.valueScale = d3.scale.log();
        } else {
            throw 'Invalid valueScale: ' + this.valueScale;
        }
        valueScale.domain(this.d3.valueExtent).range([ 0, 1]);


        // Build and draw the axes cube
        var lineGeo = new THREE.Geometry();
        lineGeo.vertices.push(
            v(weScale(vpts.xMin), heightScale(vpts.yMin), nsScale(vpts.zMin)), v(weScale(vpts.xMax), heightScale(vpts.yMin), nsScale(vpts.zMin)),
            v(weScale(vpts.xMax), heightScale(vpts.yMax), nsScale(vpts.zMin)), v(weScale(vpts.xMin), heightScale(vpts.yMax), nsScale(vpts.zMin)),
            v(weScale(vpts.xMin), heightScale(vpts.yMin), nsScale(vpts.zMin)),

            v(weScale(vpts.xMin), heightScale(vpts.yMin), nsScale(vpts.zCen)), v(weScale(vpts.xMax), heightScale(vpts.yMin), nsScale(vpts.zCen)),
            v(weScale(vpts.xMax), heightScale(vpts.yMax), nsScale(vpts.zCen)), v(weScale(vpts.xMin), heightScale(vpts.yMax), nsScale(vpts.zCen)),
            v(weScale(vpts.xMin), heightScale(vpts.yMin), nsScale(vpts.zCen)),

            v(weScale(vpts.xMin), heightScale(vpts.yMin), nsScale(vpts.zMax)), v(weScale(vpts.xMax), heightScale(vpts.yMin), nsScale(vpts.zMax)),
            v(weScale(vpts.xMax), heightScale(vpts.yMax), nsScale(vpts.zMax)), v(weScale(vpts.xMin), heightScale(vpts.yMax), nsScale(vpts.zMax)),
            v(weScale(vpts.xMin), heightScale(vpts.yMin), nsScale(vpts.zMax)),

            v(weScale(vpts.xMin), heightScale(vpts.yMin), nsScale(vpts.zMin)), v(weScale(vpts.xMin), heightScale(vpts.yMax), nsScale(vpts.zMin)),
            v(weScale(vpts.xMin), heightScale(vpts.yMax), nsScale(vpts.zMax)), v(weScale(vpts.xMin), heightScale(vpts.yMin), nsScale(vpts.zMax)),
            v(weScale(vpts.xMin), heightScale(vpts.yMin), nsScale(vpts.zMax)), v(weScale(vpts.xCen), heightScale(vpts.yMin), nsScale(vpts.zMax)),

            v(weScale(vpts.xCen), heightScale(vpts.yMin), nsScale(vpts.zMin)), v(weScale(vpts.xCen), heightScale(vpts.yMax), nsScale(vpts.zMin)),
            v(weScale(vpts.xCen), heightScale(vpts.yMax), nsScale(vpts.zMax)), v(weScale(vpts.xCen), heightScale(vpts.yMin), nsScale(vpts.zMax)),
            v(weScale(vpts.xCen), heightScale(vpts.yMin), nsScale(vpts.zMax)), v(weScale(vpts.xMax), heightScale(vpts.yMin), nsScale(vpts.zMax)),

            v(weScale(vpts.xMax), heightScale(vpts.yMin), nsScale(vpts.zMin)), v(weScale(vpts.xMax), heightScale(vpts.yMax), nsScale(vpts.zMin)),
            v(weScale(vpts.xMax), heightScale(vpts.yMax), nsScale(vpts.zMax)), v(weScale(vpts.xMax), heightScale(vpts.yMin), nsScale(vpts.zMax)),
            v(weScale(vpts.xMax), heightScale(vpts.yMin), nsScale(vpts.zMax)),

            v(weScale(vpts.xMax), heightScale(vpts.yCen), nsScale(vpts.zMax)), v(weScale(vpts.xMax), heightScale(vpts.yCen), nsScale(vpts.zMin)),
            v(weScale(vpts.xMin), heightScale(vpts.yCen), nsScale(vpts.zMin)), v(weScale(vpts.xMin), heightScale(vpts.yCen), nsScale(vpts.zMax)),
            v(weScale(vpts.xMax), heightScale(vpts.yCen), nsScale(vpts.zMax)),

            v(weScale(vpts.xCen), heightScale(vpts.yCen), nsScale(vpts.zMax)), v(weScale(vpts.xCen), heightScale(vpts.yCen), nsScale(vpts.zMin)),
            v(weScale(vpts.xCen), heightScale(vpts.yMin), nsScale(vpts.zMin)), v(weScale(vpts.xCen), heightScale(vpts.yMin), nsScale(vpts.zCen)),
            v(weScale(vpts.xCen), heightScale(vpts.yMax), nsScale(vpts.zCen)), v(weScale(vpts.xMax), heightScale(vpts.yMax), nsScale(vpts.zCen)),
            v(weScale(vpts.xMax), heightScale(vpts.yCen), nsScale(vpts.zCen)), v(weScale(vpts.xMin), heightScale(vpts.yCen), nsScale(vpts.zCen))
        );
        var lineMat = new THREE.LineBasicMaterial({
            color : 0xc0c0c0,
            lineWidth : 1
        });
        var line = new THREE.Line(lineGeo, lineMat);
        line.type = THREE.Lines;
        this.threeJs.scene.add(line);


		// Write the labels
        //var titleX = createText2D('-' + this.xLabel);
        var titleX = createText2D('West');
        titleX.position.x = weScale(vpts.xMin) - 12;
//        titleX.position.y = 5;
        this.threeJs.scene.add(titleX);

//        var valueX = createText2D(format(this.d3.xExtent[0]));
//        valueX.position.x = weScale(vpts.xMin) - 12;
//        valueX.position.y = -5;
//        this.threeJs.scene.add(valueX);

        //var titleX = createText2D(this.xLabel);
        var titleX = createText2D('East');
        titleX.position.x = weScale(vpts.xMax) + 12;
//        titleX.position.y = 5;
        this.threeJs.scene.add(titleX);

//        var valueX = createText2D(format(this.d3.xExtent[1]));
//        valueX.position.x = weScale(vpts.xMax) + 12;
//        valueX.position.y = -5;
//        this.threeJs.scene.add(valueX);

        //var titleY = createText2D('-' + this.yLabel);
        var titleY = createText2D('Elevation');
        titleY.position.y = heightScale(vpts.yMin) - 5;
        this.threeJs.scene.add(titleY);

        var valueY = createText2D(format(this.d3.yExtent[0]));
        valueY.position.y = heightScale(vpts.yMin) - 15;
        this.threeJs.scene.add(valueY);

        //var titleY = createText2D(this.yLabel);
        var titleY = createText2D("Elevation");
        titleY.position.y = heightScale(vpts.yMax) + 15;
        this.threeJs.scene.add(titleY);

        var valueY = createText2D(format(this.d3.yExtent[1]));
        valueY.position.y = heightScale(vpts.yMax) + 5;
        this.threeJs.scene.add(valueY);

        //var titleZ = createText2D('-' + this.zLabel + ' ' + format(this.d3.zExtent[0]));
        var titleZ = createText2D('South');//+ ' ' + format(this.d3.zExtent[0]));
        titleZ.position.z = nsScale(vpts.zMin) + 2;
        this.threeJs.scene.add(titleZ);

        //var titleZ = createText2D(this.zLabel + ' ' + format(this.d3.zExtent[1]));
        var titleZ = createText2D('North');//+ ' ' + format(this.d3.zExtent[1]));
        titleZ.position.z = nsScale(vpts.zMax) - 2;
        this.threeJs.scene.add(titleZ);


        
        ///////////////////////////////////// start
        
        //Process the data
		var worldWidth = this.d3.xExtent[1]-this.d3.xExtent[0]; //256
		var worldDepth = this.d3.yExtent[1]-this.d3.yExtent[0]; //256
		var worldHalfWidth = worldWidth / 2;
		var worldHalfDepth = worldDepth / 2;
		
		var container = document.getElementById( 'container' );

		var camera = this.threeJs.camera;

		var scene = this.threeJs.scene;
		
		var controls = new THREE.OrbitControls(camera);
		controls.center.set( 0.0, 0.0, 50.0 );
		controls.userPanSpeed = 100;


		Ext.get('buttonStage0').on('click', function(){
			_viewStage(0);
		});
		Ext.get('buttonStage-1').on('click', function(){
			_viewStage(current_stage-1);
		});
		Ext.get('buttonStage+1').on('click', function(){
			_viewStage(current_stage+1);
		});
		Ext.get('buttonStageN').on('click', function(){
			_viewStage(numberOfStages-1);
		});


		//Build the land
		// A square using vertex coordinates and face indexes
		var geometryLand = new THREE.Geometry();
		for ( var i = 0; i < data.points.length; i++) {
			geometryLand.vertices.push(new THREE.Vector3(weScale(data.points[i].x),heightScale(data.points[i].e),nsScale(data.points[i].y)));
		}
		for ( var i = 0; i < data.faces.length; i++) {
			geometryLand.faces.push(new THREE.Face3(data.faces[i][0],data.faces[i][1],data.faces[i][2]));
		}
		geometryLand.computeFaceNormals();
		geometryLand.computeVertexNormals();
		//var material = new THREE.MeshBasicMaterial({color: 0xffff00}); 
		//var material = new THREE.MeshLambertMaterial({color: 0xd2a95f}); 
		var materialLand = new THREE.MeshPhongMaterial({color: 0xd2a95f, shininess: 0});
		var objectLand = new THREE.Mesh(geometryLand, materialLand); 

		scene.add(objectLand);


		numberOfStages = data.points[0].w.length;
		
		// Build the water
		var waterlevels = [];

		for ( var stage = 0; stage < numberOfStages; stage++) {
			var geometryWater = new THREE.Geometry();
			for ( var i = 0; i < data.points.length; i++) {
				geometryWater.vertices.push(new THREE.Vector3(weScale(data.points[i].x),heightScale(data.points[i].w[stage]),nsScale(data.points[i].y)));
			}
			for ( var i = 0; i < data.faces.length; i++) {
				geometryWater.faces.push(new THREE.Face3(data.faces[i][0],data.faces[i][1],data.faces[i][2]));
			}
			geometryWater.computeFaceNormals();
			geometryWater.computeVertexNormals();
			//var material = new THREE.MeshBasicMaterial({color: 0xffff00}); 
			//var material = new THREE.MeshLambertMaterial({color: 0xd2a95f}); 
			var materialWater = new THREE.MeshPhongMaterial({color: 0x5555ff, shininess: 30, transparent: true, opacity: 0.8});
			var objectWater = new THREE.Mesh(geometryWater, materialWater); 
			waterlevels.push(objectWater);
		}

		current_stage = 0;
       
		
		var light  = new THREE.DirectionalLight( 0xffffff );
		light.castShadow = true;
		light.position.set(0, 200, -200);  // set it light source to top-behind the cubes
		light.target = objectLand;           // target the light to the large cube
		light.shadowCameraNear = 5;
		light.shadowCameraFar = 25;
		light.shadowCameraVisible = true;
		light.shadowDarkness = 0.3;
		
		scene.add( light );
		var light = new THREE.AmbientLight( 0x404040 );
		scene.add( light );
				

        _viewStage(current_stage);

    }
});