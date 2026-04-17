//Partie du module en Java Script à l'usage dans Harmony pour l'importation de BG, mise en place par rapport au mouvement de camera

function test_apply_bg_cadre(){

    
    const args = {
        "bg_png_path": "C:/Users/Canard/AppData/Local/Temp/a4ae3282-d8c9-4244-8bef-b5b5c703be88.png",
        "bg": {
            "name":"multishot_123",
            "path": "D:/1_TRAVAIL/WIP/MIYU/dev/repos/HarmonyAdapter/tests/input/psd/multishot_123.psd",
            "cadres": [
                {
                    "name": "cadre_SH001",
                    "path": null,
                    "frame": {
                        "x": 252,
                        "y": 1474,
                        "width": 1071,
                        "height": 602
                    },
                    "background": {
                        "x": 0,
                        "y": 0,
                        "width": 3450,
                        "height": 2293
                    },
                    "dcx": -1473,
                    "dcy": 328
                },
                {
                    "name": "cadre_SH002",
                    "path": null,
                    "frame": {
                        "x": 970,
                        "y": 805,
                        "width": 1065,
                        "height": 600
                    },
                    "background": {
                        "x": 0,
                        "y": 0,
                        "width": 3450,
                        "height": 2293
                    },
                    "dcx": -755,
                    "dcy": -341
                },
                {
                    "name": "cadre_SH003",
                    "path": null,
                    "frame": {
                        "x": 2091,
                        "y": 242,
                        "width": 1068,
                        "height": 601
                    },
                    "background": {
                        "x": 0,
                        "y": 0,
                        "width": 3450,
                        "height": 2293
                    },
                    "dcx": 366,
                    "dcy": -904
                }
            ],
            "height": null,
            "width": null
        },
        "shot": {
            "name": "SH001",
            "path": "D:/1_TRAVAIL/WIP/MIYU/dev/repos/HarmonyAdapter/tests/output/xstage/19787/SH001_camera_rest/SH001_camera_rest.xstage",
            "camera": null
        }
    }
    
    MessageLog.trace(JSON.stringify(args))
    
    $.log("hello with openHarmony");

    const bg = args.bg
    const shot = args.shot
    
    /// IMPORT PNG 
    // PUT INSIDE GROUP WITH PEG 
    var bg_peg = importBG(args.bg_png_path,bg)

    
    // CALCULATE BG PEG TRANSFORM 
    const camera_coords = getCameraCoords()
    MessageLog.trace(JSON.stringify(camera_coords))
    
    const shot_cadre = findCadreForShot(args)
    MessageLog.trace(JSON.stringify(shot_cadre))

    var input_camera = buildCameraArg();
    var input_cadre  = buildCadreArg(shot_cadre);
    var input_bg     = buildBgArg(shot_cadre);

    const final_coords = calculate_bg_coords(input_camera, input_bg, input_cadre);
    MessageLog.trace(JSON.stringify(final_coords))

    applyCoordsToPeg(bg_peg,final_coords)
    
    
    // APPLY TRANSFORM 



}

function buildCameraArg() {

    var camNode ="Top/Camera-P"

    var camX = node.getAttr(camNode, frame.current(), "POSITION.X").doubleValue();
    var camY = node.getAttr(camNode, frame.current(), "POSITION.Y").doubleValue();
    var camZ = node.getAttr(camNode, frame.current(), "POSITION.Z").doubleValue();

    return {
        x: camX,
        y: camY,
        z: camZ,
        w: 1920,
        h: 1080,
        cx: 1920 / 2,
        cy: 1080 / 2
    };
}

function buildCadreArg(cadre) {

    return {
        x: cadre.frame.x,
        y: cadre.frame.y,
        w: cadre.frame.width,
        h: cadre.frame.height
    };
}

function buildBgArg(cadre) {

    var bgWidth  = cadre.background.width;
    var bgHeight = cadre.background.height;

    return {
        w: bgWidth,
        h: bgHeight,
        cx: bgWidth / 2,
        cy: bgHeight / 2
    };
}


function calculate_bg_coords(_camera,_bg,_cadre){
   
	//some nice constants to compensate the hell of toonboom coordonates (evrything in 4:3 by default)
	const toonboom_half_HD_width = 15.8704 // when the camera is at 0 the width is at 30
	const toonboom_half_HD_height = 12.1611 // when the camera is at 0 the width is at 30
	const toonboom_x_ratio = parseFloat(1920/(toonboom_half_HD_width*2))
	const toonboom_y_ratio = parseFloat(1080/(toonboom_half_HD_height*2))
	const toonboom_fov = parseFloat(53*2) // for a FOV of 41

	function camera_z_to_width(_camera_z){

		var half_radian_angle = parseFloat((toonboom_fov/2)*Math.PI/180)
		var tangent = parseFloat(Math.tan(half_radian_angle))
		var width = parseFloat(((tangent * _camera_z)+toonboom_half_HD_width) * 2)
		var HD = 1080/1920
		var height = parseFloat(width*HD)
		MessageLog.trace("half width = " + toonboom_half_HD_width);
		MessageLog.trace("camera fov = " + toonboom_fov);
		var obj = {
			width:width,
			height:height,
			pixel_width:parseFloat(width*toonboom_x_ratio),
			pixel_height:parseFloat(height*toonboom_x_ratio),
			scale_x:parseFloat(width/(toonboom_half_HD_width*2)),
			scale_y:parseFloat(height/(toonboom_half_HD_height*2))
		}
		MessageLog.trace("[HarmonyAdapter] Camera Z ( "+_camera_z+" ) means an actual width of ( "+obj.pixel_width+" )","info");
		return obj

	}

    function safeScale(value) {
        // Convert to number
        value = Number(value);
    
        // If it's NaN, zero, or negative → return 1
        if (!isFinite(value) || value <= 0) return 1;
    
        return value;
    }
    function safePosition(value) {
        // Convert to number
        value = Number(value);
    
        // If it's NaN, zero, or negative → return 1
        if (!isFinite(value)) return 1;
    
        return value;
    }

    var final_ratio = 1


    MessageLog.trace("[HarmonyAdapter]  - CADRE_X = "+_cadre.x,"process");			
    MessageLog.trace("[HarmonyAdapter]  - CADRE_Y = "+_cadre.y,"process");			
    MessageLog.trace("[HarmonyAdapter]  - CADRE_W = "+_cadre.w,"process");			
    MessageLog.trace("[HarmonyAdapter]  - CADRE_H = "+_cadre.h,"process");			
    
    //addtionnal scale ratio based on the camera Z 
    if(_camera.z!=0){
        var calculated_width = camera_z_to_width(_camera.z)

        
        MessageLog.trace("[HarmonyAdapter] calculting scale based on ( CAMERA Z ) ")
        MessageLog.trace("[HarmonyAdapter] width : ( "+calculated_width.width+" ) ")
        MessageLog.trace("[HarmonyAdapter] pixel_width : ( "+calculated_width.pixel_width+" ) ")
        MessageLog.trace("[HarmonyAdapter] z ratio : "+calculated_width.pixel_width+" / "+_cadre.w)

        //z_ratio = parseFloat(calculated_width.pixel_width/_cadre.w)
        z_ratio = calculated_width.pixel_width / _bg.w

        MessageLog.trace("[HarmonyAdapter] Z RATIO : ( "+z_ratio+" ) ")

        //the camera is now "bigger" so we update it's center coords
        _camera.cx = calculated_width.pixel_width/2
        _camera.cy= calculated_width.pixel_height/2
        _camera.w = calculated_width.pixel_width
        _camera.h = calculated_width.pixel_height
        
        final_ratio =z_ratio
    }else{
        
        MessageLog.trace("[HarmonyAdapter]  calculting scale based on ( WIDTH ) " )
        var simple_ratio = parseFloat(_camera.w / _cadre.w);	
        final_ratio = simple_ratio
        MessageLog.trace("[HarmonyAdapter] WIDTH RATIO : ( "+simple_ratio+" ) ")

    }

    //converting top coordonate to center coordonates 
    //distance between bg center and the cadre
    var cadre_distance_to_bg_center= {
        x:(_bg.cx - _cadre.x) * final_ratio,
        y:(_bg.cy - _cadre.y) * final_ratio 
    }

    var cadre_distance_to_cam_center ={
        x:(cadre_distance_to_bg_center.x - (_camera.cx)),
        y:(cadre_distance_to_bg_center.y - (_camera.cy))
    }

    
    //FINAL SCALE 
    const final_sx = final_ratio != 0 ? final_ratio : 1  
    const final_sy = final_ratio  != 0 ? final_ratio : 1 

    MessageLog.trace("[HarmonyAdapter] FINAL SX  : ( "+final_sx+" ) ")
    MessageLog.trace("[HarmonyAdapter] FINAL SY  : ( "+final_sy+" ) ")   
    
    // FINAL POSITIONS
    var RATIO_PIXEL_X = parseFloat(toonboom_half_HD_width/(1920/2))
    var RATIO_PIXEL_Y = parseFloat(toonboom_half_HD_height/(1080/2))


    MessageLog.trace("[HarmonyAdapter]  - RATIO_PIXEL_X = "+RATIO_PIXEL_X,"process");
    MessageLog.trace("[HarmonyAdapter]  - RATIO_PIXEL_Y = "+RATIO_PIXEL_Y,"process");			
    MessageLog.trace("[HarmonyAdapter]  - CAM_X = "+_camera.x,"process");			
    MessageLog.trace("[HarmonyAdapter]  - CAM_Y = "+_camera.y,"process");			
    MessageLog.trace("[HarmonyAdapter]  - CAM_Z = "+_camera.z,"process");			

    const final_x =  parseFloat((cadre_distance_to_cam_center.x * RATIO_PIXEL_X)  + _camera.x);
    const final_y =  parseFloat((-cadre_distance_to_cam_center.y * RATIO_PIXEL_Y) + _camera.y);
    const final_z =  parseFloat(0);
    
    /*
    var coords = {
        x:safePosition(final_x),
        y:safePosition(final_y), 
        z:safePosition(final_z),
        sx:safeScale(final_sx),
        sy:safeScale(final_sy)
    }
    */
    
    
    var coords = {
        x:final_x,
        y:final_y, 
        z:final_z,
        sx:safeScale(final_sx),
        sy:safeScale(final_sy)
    }
    

    return coords

}

function applyCoordsToPeg(_peg, _coords) {

    node.setTextAttr(_peg.path,"SCALE.SEPARATE", frame.current(),"On");
    node.setTextAttr(_peg.path,"POSITION.SEPARATE", frame.current(),"On");

    //INJECT X
    _peg.attributes.position.x.setValue(_coords.x);
    
    //INJECT Y
    _peg.attributes.position.y.setValue(_coords.y);
    
    //INJECT Z
    _peg.attributes.position.z.setValue(_coords.z);
    
    //INJECT SX
    _peg.attributes.scale.x.setValue(_coords.sx);
    
    //INJECT SY
    _peg.attributes.scale.y.setValue(_coords.sy);
    
    MessageLog.trace("[HarmonyAdapter]  - changing bg scale SX = "+_coords.sx,"process");
    MessageLog.trace("[HarmonyAdapter]  - changing bg scale SY = "+_coords.sy,"process");
    MessageLog.trace("[HarmonyAdapter]  - changing bg position X = "+_coords.x,"process");
    MessageLog.trace("[HarmonyAdapter]  - changing bg position Y = "+_coords.y,"process");
    MessageLog.trace("[HarmonyAdapter]  - changing Z = "+_coords.z,"process");
}


function findCadreForShot(args) {

    if (!args || !args.bg || !args.bg.cadres || !args.shot) {
        throw "Invalid args structure.";
    }

    var shotName = args.shot.name;
    var expectedCadreName = "cadre_" + shotName;

    for (var i = 0; i < args.bg.cadres.length; i++) {
        var cadre = args.bg.cadres[i];

        if (cadre.name === expectedCadreName) {
            return cadre;
        }
    }

    return null; // not found
}


function getCameraCoords() {
    try {
        // Get current scene camera
        var camera = $.scn.$node("Top/Camera-P")     
        if (!camera) {
            throw "No camera found in scene.";
        }

        return {
            x: camera.position.x,
            y: camera.position.y,
            z: camera.position.z
        };

    } catch (err) {
        $.alert("Error getting camera coords: " + err);
        return null;
    }
}

function importBG(path,bg){
        /// IMPORT PNG 
    var doc = $.scn;
    var sceneRoot = doc.root
    var image_node = sceneRoot.importImage(path);
    var sceneComp = doc.$node("Top/Composite")                  // get the scene main composite
    image_node.linkOutNode(sceneComp);
    var peg = putNodeInGroupWithPeg(bg.name,image_node)
    return peg
}

/**
 * Moves a node into a group (creates the group if missing)
 * and adds a Peg inside that group named "<groupName>-P"
 *
 * @param {String} groupName        Name of the target group
 * @param {String} nodeToMovePath   Full path of the node to move (ex: "Top/MyNode")
 */
function putNodeInGroupWithPeg(groupName, nodeToMovePath) {

    /// IMPORT PNG 
    var doc = $.scn;
    var sceneRoot = doc.root


    function findOrCreateGroup(name) {
        try {
            var existing = $.scene.getNodeByPath("Top/" + name);
            if (existing && existing.isGroup) {
                return existing;
            }
        } catch (e) {}

        var top = $.scene.getNodeByPath("Top");
        return top.addGroup(name);
    }

    try {
        // Get or create group
        var group = findOrCreateGroup(groupName);

        // Get node to move
        var nodeToMove = $.scene.getNodeByPath(nodeToMovePath);
        if (!nodeToMove) {
            throw "Node not found: " + nodeToMovePath;
        }

        // Move node into group
        nodeToMove.moveToGroup("Top/" + groupName);
        const inserted_node_path = "Top/" + groupName+"/"+nodeToMove.name
        var inserted_node = $.scene.getNodeByPath(inserted_node_path)
        group.multiportIn.linkOutNode(inserted_node)
        inserted_node.linkOutNode(group.multiportOut)


        // Add Peg to  the group
        var pegName = groupName + "-P";
        var peg = sceneRoot.addNode("PEG", pegName);

        peg.linkOutNode(group);
        peg.linkOutNode(group);

        // Optional: place peg near moved node
        peg.x = nodeToMove.x;
        peg.y = nodeToMove.y + 100;

        var sceneComp = doc.$node("Top/Composite")                  // get the scene main composite
        group.linkOutNode(sceneComp);

        return peg; // return peg if needed

    } catch (err) {
        $.alert("Error: " + err);
        return null;
    }
}

