

function Template(data) {
    this.name = data.name != undefined ? data.name : null;
    this.path = data.path != undefined ? resolve_library_path(data.path) : null;;

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
        if (this._created_backdrops && this._created_backdrops[key_map]){
            return this._created_backdrops[key_map]
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

        var keys = Object.keys(this.backdrops)

        var spacingY = 700
        var startY = 0

        this._created_backdrops = {}

        for (var i = 0; i < keys.length; i++){

            var key = keys[i]

            var offsetY = startY + (i * spacingY)

            var bd = this.create_backdrop(
                key,
                this.backdrops[key],
                offsetY
            )

            if (bd){
                this._created_backdrops[key] = bd
            }
        }

        this._place_animatic()

        return this._created_backdrops
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


