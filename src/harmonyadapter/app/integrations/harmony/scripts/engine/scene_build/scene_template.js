

function Template(data) {

    this.name = data.name != undefined ? data.name : null;
    this.path = data.path != undefined ? resolve_library_path(data.path) : null;
    this._backdrop_table = {}

    //default data
    this.final_composite = "Top/Composite"

    //default data
    this.backdrops = data.backdrops || {
        ANIM:{"title":"ANIM",color:"#ee5a1f",x:-1000,y:-1000,w:2000,h:500},
        BG:{"title":"BG",color:"#da43a0",    x:1000,    y:-1000,w:1000,h:500}
    }
    
    //default data
    this.backdrop_map = data.backdrop_map || {
        "Character":"ANIM",
        "Prop":"ANIM",
        "FX":"ANIM",
        "BG":"BG",
        "Background":"BG",
        "Reference":"REF",
        "Animatic":"REF"
    }

    //default data
    this.composite_map = data.composite_map || {
        "Character":"Top/Composite",
        "Prop":"Top/Composite",
        "FX":"Top/Composite",
        "BG":"Top/Composite",
        "Background":"Top/Composite",
        "Reference":"Top/Composite"
    }
    this.get_composite = function(asset_type){

        if (!asset_type) {
            MessageLog.trace("[Template] get_composite: missing type, using fallback");
            return $.scene.getNodeByPath(this.final_composite);
        }

        var path = this.composite_map[asset_type];

        if (!path) {
            MessageLog.trace("[Template] get_composite: unknown type '" + asset_type + "' → fallback used");
            return $.scene.getNodeByPath(this.final_composite);
        }

        return $.scene.getNodeByPath(path);
    };
    /**
     * 
     * @param {*} asset_type 
     * @returns {$.oBackdrop}
     */
    this.get_backdrop = function(asset_type){

        if (!asset_type){
            return null
        }

        var key = asset_type

        var key_map = this.backdrop_map[asset_type]

        // 1. prefer created template backdrops (fast + reliable)
        if (this._backdrop_table && this._backdrop_table[key_map]){
            return this._backdrop_table[key_map]
        }

        return null
    }
    this.get_line_start = function(asset_type){

        var bd = this.get_backdrop(asset_type)

        if (!bd){
            MessageLog.trace("[Template] get_line_start: missing backdrop for " + asset_type)
            return {name:asset_type,x: 0, y: 0}
        }

        // backdrop bounds (center-based system)
        var left = bd.x// - bd.width * 0.5)
        var top  = bd.y //- (bd.height * 0.5)

        // padding (light offset so nodes don’t sit on border)
        var paddingX = 80
        var paddingY = 200

        return {
            name:bd.name || bd.title || "default" ,
            x: left + paddingX,
            y: top + paddingY
        }
    }
    this.create_backdrop = function(name, cfg, offsetY){

        var config = cfg || this.backdrops[name]

        if (!config){
            MessageLog.trace("[Template] create_backdrop: missing config " + name)
            return null
        }

        offsetY = offsetY || 0

        // use builder instead of raw oBackdrop
        var bd = new BackdropBuilder()
            .setPosition(
                config.x || 0,
                (config.y || 0) + offsetY,
                config.w || 1000,
                config.h || 500
            )
            .setTitle(config.title || name)
            .setColorFromHex(config.color || "#ee5a1f")

        // optional description (if you extend config later)
        if (config.description){
            bd.setDescription(config.description)
        }

        // build into Harmony scene
        return bd.build("Top")
    }

    this.deploy = function(){
        if(this.path!=null&&this.path!=""){
            return this._deploy_with_tpl(this.path)
        }else{
            return this._deploy_with_data()
        }
    }

    /**
     * Deploy template and replace REPLACE_WITH-* nodes
     * @param {string} tpl_path
     */
    this._deploy_with_tpl = function(tpl_path){

        MessageLog.trace("[scene_template] deploy with custom scene template TPL !  ")

        var node_manager = new NodeManager()

        MessageLog.trace("[Template] importing scene template tpl ["+tpl_path+"]")

        //---------------------------------------------
        // 1. Store scene nodes BEFORE import
        //---------------------------------------------

        var existing_nodes = {};

        var before_nodes = $.scene.nodes;

        for (var i = 0; i < before_nodes.length; i++) {

            var n = before_nodes[i];

            // store by PATH for quick lookup
            existing_nodes[n.path] = n;
        }

        //---------------------------------------------
        // 2. Import TPL
        //---------------------------------------------

        var top = $.scene.getNodeByPath("Top");

        var imported_nodes = top.importTemplate(tpl_path);

        if (imported_nodes.length == 0) {
            MessageLog.trace(
                "[scene_template] ERROR : nothing to import "
            );
            return;
        }

        MessageLog.trace(
            "[scene_template] import done: " + tpl_path
        );

        //---------------------------------------------
        // 3. Get imported group
        //---------------------------------------------

        var group = imported_nodes[0];
        var template_backdrops = []
        
        if (node.type(group.path) != "GROUP") {
            return
        }

        // catch the backdrops before ungrouging
        template_backdrops = new BackdropManager().get_backdrops(group)
        imported_nodes = node_manager.ungroup(group)
    
        //---------------------------------------------
        // 4. Find imported replacement nodes
        //---------------------------------------------


        MessageLog.trace("[Template] replacing placeholders ")
        var replacer = new NodeReplacer();
        
        replacer.replace_nodes(imported_nodes,existing_nodes);
        MessageLog.trace("[Template] tpl deployment done ")

        for(var b = 0 ; b < template_backdrops.length ; b++){
            this._register_backdrop(template_backdrops[b])
        }

        return this._backdrop_table

    };

    this._register_backdrop = function(backdrop){
        this._backdrop_table[backdrop.title] = backdrop
    }


    this._deploy_with_data = function(){

        MessageLog.trace("[scene_template] deploy with json data map ")
        
        var keys = Object.keys(this.backdrops)

        var spacingY = 700
        var startY = 0

        this._backdrop_table = {}

        for (var i = 0; i < keys.length; i++){

            var key = keys[i]

            var offsetY = startY + (i * spacingY)

            var bd = this.create_backdrop(
                key,
                this.backdrops[key],
                offsetY
            )

            if (bd){
                this._backdrop_table[key] = bd
            }
        }

        this._place_animatic()

        return this._backdrop_table
    }

    this._place_animatic = function(){
        const animatic_peg_node = "Top/Animatic-P" // TODO fetch from config ? 
        if(node.type(animatic_peg_node)=="PEG" || node.type(animatic_peg_node)=="READ"){
            var frame = 1

            // Position
            node.setTextAttr(animatic_peg_node, "POSITION.X", frame, 10.7292)
            node.setTextAttr(animatic_peg_node, "POSITION.Y", frame, 8.05555)
            node.setTextAttr(animatic_peg_node, "POSITION.Z", frame, 0)

            // Scale
            node.setTextAttr(animatic_peg_node, "SCALE.X", frame, 0.317489)
            node.setTextAttr(animatic_peg_node, "SCALE.Y", frame, 0.317489)
        
        }
    }
}




/**
 * Harmony / OpenHarmony helper:
 * - Import a template
 * - Detect nodes named:
 *      REPLACE_WITH-XXX
 * - Find existing scene node named:
 *      XXX
 * - Replace placeholder node with the real node
 *
 * Assumptions:
 * - Using OpenHarmony ($ namespace)
 * - Node names are unique enough for lookup
 * - We preserve:
 *      - position
 *      - incoming connections
 *      - outgoing connections
 */

/**
 * Replace imported placeholder nodes with
 * already-existing scene nodes
 */
function NodeReplacer(){

    this._prefix = "REPLACE_WITH-";

    /**
     * @param {Array<$.oNode>} node_list
     * @param {Object} existing_nodes
     */
    this.replace_nodes = function(place_holder_node_list,existing_nodes){

        var replace_table = [];

        //-----------------------------------------
        // Build replacement table first
        //-----------------------------------------

        if(place_holder_node_list.length==0){
            MessageLog.trace("[NodeReplacer] no place holder nodes to replace ")
            return 
        }        
        if(existing_nodes.length==0){
            MessageLog.trace("[NodeReplacer] no existing_nodes to replace with ")
            return 
        }

        for (var n = 0; n < place_holder_node_list.length; n++) {

            var imported_node = place_holder_node_list[n];
            var target_node = this._resolve_target_node(imported_node,existing_nodes);
            
            MessageLog.trace("[NodeReplacer] scanning ("+imported_node.path+")")
            if (!target_node) {
                continue;
            }
            MessageLog.trace("[NodeReplacer] found place holder for ("+target_node.path+")")
            replace_table.push([imported_node,target_node]);
        }

        //-----------------------------------------
        // Execute replacements
        //-----------------------------------------

        for (var r = 0; r < replace_table.length; r++) {
            this._replace_node(replace_table[r][0],replace_table[r][1]);
        }
    };


    /**
     * Detect:
     *      REPLACE_WITH-XXXX
     *
     * Resolve:
     *      XXXX
     *
     * @param {$.oNode} _node
     * @param {Object} existing_nodes
     * @return {$.oNode|null}
     */
    this._resolve_target_node = function(_node,existing_nodes){

        if (!_node || !_node.name) {
            return null;
        }

        var name = _node.name;

        //-----------------------------------------
        // Must start with prefix
        //-----------------------------------------

        if (name.indexOf(this._prefix) !== 0) {
            return null;
        }

        //-----------------------------------------
        // Extract target name
        //-----------------------------------------

        var target_name = name.substr(this._prefix.length);

        //-----------------------------------------
        // Find original scene node
        //-----------------------------------------

        path_guess = "Top/"+target_name

        if (existing_nodes[path_guess]) {

            MessageLog.trace(
                "[NodeReplacer] found target: " +
                target_name
            );

            return existing_nodes[path_guess];
        }

        MessageLog.trace(
            "[NodeReplacer] target missing: " +
            path_guess
        );

        return null;
    };


    /**
     * Replace placeholder connections
     *
     * OLD NODE:
     *      REPLACE_WITH-CHAR
     *
     * NEW NODE:
     *      CHAR
     *
     * @param {$.oNode} _old_node
     * @param {$.oNode} _new_node
     */
    this._replace_node = function(_old_node,_new_node){

        MessageLog.trace(
            "[NodeReplacer] replacing " +
            _old_node.name +
            " -> " +
            _new_node.name
        );

        //-----------------------------------------
        // INPUT LINKS
        //-----------------------------------------

        var in_links = _old_node.inLinks;

        for (var i = 0; i < in_links.length; i++) {

            var link = in_links[i];

            try {

                link.outNode.linkOutNode(
                    _new_node,
                    link.outPort,
                    link.inPort
                );

            } catch(err) {

                MessageLog.trace(
                    "input relink failed: " + err
                );
            }
        }

        //-----------------------------------------
        // OUTPUT LINKS
        //-----------------------------------------

        var out_links = _old_node.outLinks;

        for (var o = 0; o < out_links.length; o++) {

            var out_link = out_links[o];

            try {

                _new_node.linkOutNode(
                    out_link.inNode,
                    out_link.outPort,
                    out_link.inPort
                );

            } catch(err2) {

                MessageLog.trace(
                    "output relink failed: " + err2
                );
            }
        }

        //-----------------------------------------
        // Remove placeholder
        //-----------------------------------------

        try {

            _old_node.remove();

        } catch(remove_err) {

            MessageLog.trace(
                "remove failed: " + remove_err
            );
        }
    };
}


function BackdropManager(){
    /**
     * 
     * @param {$.oGrouo} group 
     * @returns {$.oBackdrop[]}  
     */
    this.get_backdrops = function(group){
        var BDps = Backdrop.backdrops(group.path)
        var backdrops = []
        for(b= 0 ; b < BDps.length ; b++){
            var currb = BDps[b]
            backdrops.push(new $.oBackdrop(group.path,currb))
        }
        return backdrops
    }
}


function BackdropBuilder(){

    function fromRGBAtoInt(r, g, b, a){

        r = r || 0
        g = g || 0
        b = b || 0
        a = (a === undefined) ? 255 : a

        return (
            (r & 255) << 24 |
            (g & 255) << 16 |
            (b & 255) << 8  |
            (a & 255)
        )
    }
    function hexToIntColor(hex){

        if (!hex) return 0

        hex = hex.replace("#", "")

        var r = parseInt(hex.substring(0, 2), 16)
        var g = parseInt(hex.substring(2, 4), 16)
        var b = parseInt(hex.substring(4, 6), 16)

        var a = 255

        return (
            (r & 255) << 24 |
            (g & 255) << 16 |
            (b & 255) << 8  |
            (a & 255)
        )
    }
    this._data = {
        position: {x:0, y:0, w:300, h:300},
        title: null,
        description: null,
        color: fromRGBAtoInt(100, 100, 100, 255)
    }

    // -------------------------
    // POSITION
    // -------------------------
    this.setPosition = function(x, y, w, h){
        this._data.position = {
            x: x,
            y: y,
            w: w || this._data.position.w,
            h: h || this._data.position.h
        }
        return this
    }

    // -------------------------
    // TITLE
    // -------------------------
    this.setTitle = function(text, color, size, font){
        this._data.title = {
            text: text || "",
            color: color || fromRGBAtoInt(255,255,255,255),
            size: size || 14,
            font: font || "Arial"
        }
        return this
    }

    // -------------------------
    // DESCRIPTION
    // -------------------------
    this.setDescription = function(text, color, size, font){
        this._data.description = {
            text: text || "",
            color: color || fromRGBAtoInt(200,200,200,255),
            size: size || 12,
            font: font || "Arial"
        }
        return this
    }

    // -------------------------
    // COLOR
    // -------------------------
    this.setColor = function(color){
        this._data.color = color
        return this
    }    
    // -------------------------
    // COLOR
    // -------------------------
    this.setColorFromHex = function(color){
        this._data.color = hexToIntColor(color)
        return this
    }

    // -------------------------
    // BUILD
    // -------------------------
    this.build = function(parentPath){

        if (!parentPath){
            parentPath = "Top"
        }

        var backdrop = Backdrop.addBackdrop(parentPath, this._data)
        return new $.oBackdrop(parentPath,backdrop)
    }
}


