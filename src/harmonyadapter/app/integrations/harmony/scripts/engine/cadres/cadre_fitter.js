/**
 * CadreFitter — cadre-to-camera positioning for BG nodes.
 *
 * Requires CameraManager (engine/camera.js) to be loaded first.
 *
 * Usage:
 *   var fitter = new CadreFitter();
 *   var coords = fitter.place_peg_according_to_cadre(peg_onode, {
 *       frame:      { x: 0, y: 0, width: 1926, height: 1086 },
 *       background: { width: 1926, height: 1086 }
 *   });
 */
CadreFitter = function() {

    /**
     * Calculate cadre-matched coords and apply them to an existing Peg oNode.
     *
     * @param {$.oNode} peg_node  - The PEG oNode to position (returned by putNodeInGroupWithPeg)
     * @param {{frame:{x,y,width,height}, background:{width,height}}} cadre_obj
     * @returns {{x,y,z,sx,sy}}  coords that were applied
     */
    this.place_peg_according_to_cadre = function(peg_node, cadre_obj) {

        var camera_arg = new CameraManager().get_camera_coords();

        var cadre_arg = {
            x: cadre_obj.frame.x,
            y: cadre_obj.frame.y,
            w: cadre_obj.frame.width,
            h: cadre_obj.frame.height
        };

        var bg_arg = {
            w:  cadre_obj.background.width,
            h:  cadre_obj.background.height,
            cx: cadre_obj.background.width  / 2,
            cy: cadre_obj.background.height / 2
        };

        var coords = this._calculate_bg_coords(camera_arg, bg_arg, cadre_arg);
        MessageLog.trace("[CadreFitter] Coords calculés : " + JSON.stringify(coords));
        this._applyCoordsToPeg(peg_node, coords);

        return coords;
    };

    // -------------------------------------------------------------------------
    // Private helpers
    // -------------------------------------------------------------------------

    this._calculate_bg_coords = function(_camera, _bg, _cadre) {

        // some nice constants to compensate the hell of toonboom coordinates
        // (everything in 4:3 by default)
        var toonboom_half_HD_width  = 15.8704; // camera at z=0 → full width = 31.74
        var toonboom_half_HD_height = 12.1611;

        function safeScale(value) {
            value = Number(value);
            if (!isFinite(value) || value <= 0) return 1;
            return value;
        }

        function safePosition(value) {
            value = Number(value);
            if (!isFinite(value)) return 0;
            return value;
        }

        var final_ratio = 1;

        MessageLog.trace("--------------------------------------CAMERA--------------------------------------");
        MessageLog.trace("[CadreFitter]  - CAMERA_X = " + _camera.x);
        MessageLog.trace("[CadreFitter]  - CAMERA_Y = " + _camera.y);
        MessageLog.trace("[CadreFitter]  - CAMERA_Z = " + _camera.z);
        MessageLog.trace("[CadreFitter]  - CAMERA_W = " + _camera.w);
        MessageLog.trace("[CadreFitter]  - CAMERA_H = " + _camera.h);
        MessageLog.trace("--------------------------------------CADRE---------------------------------------");
        MessageLog.trace("[CadreFitter]  - CADRE_X = " + _cadre.x);
        MessageLog.trace("[CadreFitter]  - CADRE_Y = " + _cadre.y);
        MessageLog.trace("[CadreFitter]  - CADRE_W = " + _cadre.w);
        MessageLog.trace("[CadreFitter]  - CADRE_H = " + _cadre.h);

        // Additional scale ratio based on camera Z (zoom)
        if (!isNaN(_camera.z) && _camera.z !== 0) {

            var calculated_size = new CameraManager().get_camera_render_size(_camera.z);

            MessageLog.trace("[CadreFitter] Calculating scale based on CAMERA Z");
            MessageLog.trace("[CadreFitter] pixel_width : " + calculated_size.pixel_width);
            MessageLog.trace("[CadreFitter] z_ratio = " + calculated_size.pixel_width + " / " + _cadre.w);

            var z_ratio = parseFloat(calculated_size.pixel_width / _cadre.w);
            MessageLog.trace("[CadreFitter] Z RATIO : " + z_ratio);

            // Camera is "bigger" → update centre coords
            _camera.cx = calculated_size.pixel_width  / 2;
            _camera.cy = calculated_size.pixel_height / 2;
            _camera.w  = calculated_size.pixel_width;
            // _camera.h stays the same

            final_ratio = z_ratio;

        } else {

            var simple_ratio = parseFloat(_camera.w / _cadre.w);
            final_ratio = simple_ratio;
            MessageLog.trace("[CadreFitter] Calculating scale based on WIDTH");
            MessageLog.trace("[CadreFitter] WIDTH RATIO : " + simple_ratio);
        }

        // Convert top-left coordinates to centre coordinates:
        // distance between bg centre and the cadre top-left corner
        var cadre_distance_to_bg_center = {
            x: (_bg.cx - _cadre.x) * final_ratio,
            y: (_bg.cy - _cadre.y) * final_ratio
        };

        var cadre_distance_to_cam_center = {
            x: cadre_distance_to_bg_center.x - _camera.cx,
            y: cadre_distance_to_bg_center.y - _camera.cy
        };

        // Compensate image auto-scale (Harmony stretches import to fill camera height)
        var reverse_import_scale = _bg.h / _camera.h;

        // FINAL SCALE
        var final_sx = safeScale((final_ratio !== 0 ? final_ratio : 1) * reverse_import_scale);
        var final_sy = safeScale((final_ratio !== 0 ? final_ratio : 1) * reverse_import_scale);

        MessageLog.trace("[CadreFitter] FINAL SX : " + final_sx);
        MessageLog.trace("[CadreFitter] FINAL SY : " + final_sy);

        // FINAL POSITIONS — convert pixel offset to Toon Boom scene units
        var RATIO_PIXEL_X = parseFloat(toonboom_half_HD_width  / (1920 / 2));
        var RATIO_PIXEL_Y = parseFloat(toonboom_half_HD_height / (1080 / 2));

        MessageLog.trace("[CadreFitter]  - RATIO_PIXEL_X = " + RATIO_PIXEL_X);
        MessageLog.trace("[CadreFitter]  - RATIO_PIXEL_Y = " + RATIO_PIXEL_Y);

        var final_x = parseFloat((cadre_distance_to_cam_center.x * RATIO_PIXEL_X) + _camera.x);
        var final_y = parseFloat((-cadre_distance_to_cam_center.y * RATIO_PIXEL_Y) + _camera.y);
        var final_z = parseFloat(0);

        MessageLog.trace("[CadreFitter]  - final_x = " + final_x);
        MessageLog.trace("[CadreFitter]  - final_y = " + final_y);

        return {
            x:  final_x,
            y:  final_y,
            z:  final_z,
            sx: final_sx,
            sy: final_sy
        };
    };

    this._applyCoordsToPeg = function(_peg, _coords) {

        node.setTextAttr(_peg.path, "SCALE.SEPARATE",    frame.current(), "On");
        node.setTextAttr(_peg.path, "POSITION.SEPARATE", frame.current(), "On");

        _peg.attributes.position.x.setValue(_coords.x);
        _peg.attributes.position.y.setValue(_coords.y);
        _peg.attributes.position.z.setValue(_coords.z);
        _peg.attributes.scale.x.setValue(_coords.sx);
        _peg.attributes.scale.y.setValue(_coords.sy);

        MessageLog.trace("[CadreFitter] Applied: SX=" + _coords.sx +
                         " SY=" + _coords.sy +
                         " X="  + _coords.x  +
                         " Y="  + _coords.y  +
                         " Z="  + _coords.z);
    };

};


// =============================================================================
// Global helpers (used by asset_import_strategies.js and bg_cadre.js legacy)
// =============================================================================

/**
 * Move a node into a new group and add a Peg above that group.
 *
 * Creates (or reuses) a group named <groupName> at Top level, moves
 * <nodeToMovePath> inside it, and adds a PEG linked above the group.
 *
 * @param  {String} groupName        Name of the target group  (e.g. "BG_preview_grp")
 * @param  {String} nodeToMovePath   Full node path            (e.g. "Top/BG_preview")
 * @returns {$.oNode}  the Peg oNode, or null on error
 */
function putNodeInGroupWithPeg(groupName, nodeToMovePath) {

    var doc       = $.scn;
    var sceneRoot = doc.root;

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
        var group = findOrCreateGroup(groupName);

        var nodeToMove = $.scene.getNodeByPath(nodeToMovePath);
        if (!nodeToMove) {
            throw "Node not found: " + nodeToMovePath;
        }

        nodeToMove.moveToGroup("Top/" + groupName);

        var inserted_path = "Top/" + groupName + "/" + nodeToMove.name;
        var inserted_node = $.scene.getNodeByPath(inserted_path);
        group.multiportIn.linkOutNode(inserted_node);
        inserted_node.linkOutNode(group.multiportOut);

        // Create Peg above the group (at Top level)
        var pegName = groupName + "-P";
        var peg = sceneRoot.addNode("PEG", pegName);
        peg.linkOutNode(group);
        peg.x = nodeToMove.x;
        peg.y = nodeToMove.y + 100;

        // Link group output to the scene Composite.
        // _link_asset_group() in scene_build.js will skip if already connected.
        var sceneComp = doc.$node("Top/Composite");
        if (sceneComp) {
            group.linkOutNode(sceneComp);
            MessageLog.trace("[putNodeInGroupWithPeg] linked " + group.path + " → Top/Composite");
        }

        return peg;

    } catch (err) {
        $.alert("putNodeInGroupWithPeg Error: " + err);
        return null;
    }
}


/**
 * Find the cadre entry matching the current shot in the bg args.
 *
 * @param  {{ bg: {cadres:[{shot,name,...}]}, shot: {name:String} }} args
 * @returns {Object|null}  the cadre object, or null if not found
 */
function _findCadreForShot(args) {

    if (!args || !args.bg || !args.bg.cadres || !args.shot) {
        throw "Invalid args structure for _findCadreForShot.";
    }

    var shotName         = args.shot.name;
    var expectedCadreName = "cadre_" + shotName;
    var shotDigits       = String(shotName || "").replace(/\D/g, "");

    for (var i = 0; i < args.bg.cadres.length; i++) {
        var cadre = args.bg.cadres[i];

        if (cadre.shot) {
            var cadreShotDigits = String(cadre.shot).replace(/\D/g, "");
            if (String(cadre.shot) === String(shotName) ||
                (shotDigits && cadreShotDigits === shotDigits)) {
                return cadre;
            }
        }

        if (cadre.name === expectedCadreName) {
            return cadre;
        }
    }

    return null;
}
