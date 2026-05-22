



function AssetGroupFactory(){
    /**
     * join all model class into one to handle data and concrete building 
     * @param {$.oGroup} group 
     * @param {Asset} asset 
     * @param {AssetFile} asset_file 
     * @returns {AssetGroup}
     */
    this.create = function(group,asset,asset_file){
        // TODO : validate data 
        var node_manager = new NodeManager()
        node_manager.add_attribute(group,"asset_file_path",asset_file.path)
        node_manager.add_attribute(group,"asset_name",asset.name)
        node_manager.mark_node(group)
        return new AssetGroup(group,asset,asset_file) 
    }

}



/**
 * 
 * @param {$.oGroup} group 
 * @param {Asset} asset 
 * @param {AssetFile} asset_file 
 */
function AssetGroup(group,asset,asset_file){
    
    // concrete node represenation of the asset 
    this.group = group|| null
    this.node_table = {}
    this.node_list = []
    this.backdrop = null

    //context data
    this.asset = asset || null
    this.asset_file = asset_file || null

    //context methods : 
    this.get_file_type = function(){
        return this.asset_file.type
    }


    //pipeline methods
    this.get_import_strategy = function(){
        return this.asset_file.import_strategy
    }    
    this.get_deployment_strategy = function(){
        return this.asset_file.deployment_strategy
    }

    /**
     * Returns the shot cadre in CadreFitter format, or null if not available.
     * Reads from asset_file.computed (injected by Python SceneBuildRunner).
     * Format: { frame: {x,y,width,height}, background: {width,height} }
     * @returns {Object|null}
     */
    this.get_shot_cadre = function() {
        return this.asset_file.get_shot_cadre()
    };    
    this.get_proxy_image_path = function() {
        return this.asset_file.get_proxy_image_path()
    };


    this.get_path = function(){
        return this.asset_file.path
    }    
    this.get_asset_type = function(){
        return this.asset.type
        
    }
    this.get_asset_name = function(){
        return this.asset.name
        
    }

    // arbitrary hierarchy based on common harmony pipeline practices
    this._node_hierarchy = ["peg","group","composite","effect"]

    /**
     * 
     * @param {$.oNode} n 
     * @param {string} role 
     */
    this.register_node = function(_node, role){
        var role = role || "main"
        this.node_table[role] = _node
        if(this.node_list.indexOf(_node)==-1){
            this.node_list.push(_node)
        }
    }
    if(this.group){
        this.register_node(group,"group")
    }

    /**
     * 
     * @param {string} role 
     * @returns {$.oNode} 
     */
    this.get_node = function(role){
        return this.node_table[role]
    }    
    /**
     * 
     * @returns {$.oNode[]} 
     */ 
    this.get_outside_nodes = function(){
        return this.node_list
    }       
    /**
     * 
     * @returns {$.oNode[]} 
     */ 
    this.get_inside_nodes = function(){
        return this.group.children
    }    

    /**
     * 
     * @param {string} role 
     * @returns {$.oGroup} 
     */
    this.get_group = function(){
        return this.group
    }

    /**
     * Highest node (smallest Y in Harmony)
     * @returns {$.oNode} 
     */
    this.get_highest_node = function(){
        var highest = null
        var minY = Number.MAX_VALUE

        for (var role in this.node_table){
            var _node = this.node_table[role]
            var y = node.coordY(_node)

            if (y < minY){
                minY = y
                highest = _node
            }
        }

        return highest
    }

 
    /**
     * Lowest node (largest Y)
     * @returns {$.oNode} 
     */
    this.get_lowest_node = function(){
        var lowest = null
        var maxY = -Number.MAX_VALUE

        for (var role in this.node_table){
            var _node = this.node_table[role]
            var y = node.coordY(_node)

            if (y > maxY){
                maxY = y
                lowest = _node
            }
        }

        return lowest
    }


    /**
     * "Head" node = priority-based
     * @returns {$.oNode} 
     */
    this.get_head_node = function(){
        for (var i = 0; i < this._node_hierarchy.length; i++){
            var role = this._node_hierarchy[i]
            var n = this.get_node(role)

            if (n) return n
        }

        return this.get_highest_node()
    }

    /**
     * "Foot" node = priority-based
     * @returns {$.oNode} 
     */
    this.get_foot_node = function(){
        // iterate hierarchy from lowest priority → highest
        for (var i = this._node_hierarchy.length - 1; i >= 0; i--){
            var role = this._node_hierarchy[i]
            var n = this.get_node(role)
            if (n) return n
        }

        // fallback: visually lowest node
        return this.get_lowest_node()
    }

        /**
     * "Head" node = priority-based
     * @returns {$.oNode} 
     */
    this.connect_out = function(dst_node){
        var foot = this.get_foot_node()

        if (!foot || !dst_node){
            MessageLog.trace("connect_out: invalid nodes")
            return false
        }

        node.link(foot, 0, dst_node, 0)
        return this
    }    
    this.connect_in = function(src_node){
        var head = this.get_head_node()

        if (!head || !src_node){
            MessageLog.trace("connect_in: invalid nodes")
            return false
        }

        node.link(src_node, 0, head, 0)
        return this
    }

    this.add_peg = function(_name){
        // If a peg role is already registered (e.g. imported TPL already has one), skip creation
        if (this.node_table["peg"]) {
            MessageLog.trace("[AssetGroup] add_peg: using existing peg " + this.node_table["peg"].path);
            return this;
        }
        var peg = this.group.parent.addNode("PEG", this.group.name+'-P');
        peg.linkOutNode(this.group);
        peg.centerAbove(this.group);
        this.register_node(peg,"head")
        this.register_node(peg,"peg")
        return this
    }   
    this.add_display = function(_name){
        // Use the foot node as source
        var foot = this.get_foot_node() || this.group;
        var display = this.group.parent.addNode("DISPLAY", this.group.name+'-D');
        // Scan output ports to find the image output port (PEG transform ports will be rejected by Harmony)
        var numOut = foot.outPorts;
        var ok = false;
        for (var p = 0; p < numOut && !ok; p++) {
            ok = node.link(foot.path, p, display.path, 0, false, false);
            if (ok) MessageLog.trace("[AssetGroup] add_display: linked outPort " + p + " to display");
        }
        if (!ok) {
            MessageLog.trace("[AssetGroup] add_display: link failed from " + foot.path + " (outPorts=" + numOut + ")");
        }
        display.centerBelow(foot);
        this.register_node(display,"display")
        return this

    } 
    this.add_composite = function(_name){
        var comp = this.group.parent.addNode("COMPOSITE", this.group.name+'-C');
        this.group.linkOutNode(comp);
        comp.centerBelow(this.group);
        this.register_node(comp,"foot")
        this.register_node(comp,"composite")
        return this
    }

    /**
     * 
     * @param {$.oColorValue} color 
     * @returns {AssetGroup}
     */
    this.add_backdrop = function(color){
        var color = color || new $.oColorValue("#336600ff")
        MessageLog.trace(this.get_outside_nodes())
        var backdrop =this.group.parent.addBackdropToNodes(this.get_outside_nodes(), this.get_asset_name(), "",color)
        this.backdrop = backdrop
        return this
    }

    
    this.move_to = function(x, y){

        var anchor = null
        var anchorX = 0
        var anchorY = 0
        var useBackdrop = false

        // 1. Prefer backdrop as reference
        if (this.backdrop){
            anchor = this.backdrop
            anchorX = this.backdrop.x
            anchorY = this.backdrop.y
            useBackdrop = true
        }
        // 2. fallback: group
        else if (this.group){
            anchor = this.group
            anchorX = node.coordX(this.group.path)
            anchorY = node.coordY(this.group.path)
        }
        else {
            MessageLog.trace("move_to: no valid anchor (backdrop or group)")
            return this
        }

        // delta move
        var dx = x - anchorX
        var dy = y - anchorY

        // move all outside nodes
        var nodes = this.get_outside_nodes()

        for (var i = 0; i < nodes.length; i++){
            var _node = nodes[i]

            var nx = node.coordX(_node.path)
            var ny = node.coordY(_node.path)

            node.setCoord(_node.path, nx + dx, ny + dy)
        }

        // move anchor LAST
        if (useBackdrop){
            this.backdrop.x = x
            this.backdrop.y = y
        }
        else{
            node.setCoord(this.group.path, x, y)
        }

        MessageLog.trace("Move to "+x+" "+y)

        return this
    }
}





function AssetGroupLine(){
    this.start_x= 0
    this.start_y= 0
}


function AssetGroupPlacer(){
    this._line_table = {}
    this._spacing_x = 200
    this._spacing_y = 150

    this._get_next_x = function(line_name){
        var line = this._line_table[line_name]

        var x = line.x
        line.x += this._spacing_x
        
        return x
    }

    this.start_line = function(line_name, x, y){
        this._line_table[line_name] = {
            x: x || 0,
            y: y || 0
        }
    }

    this._ensure_line = function(line_name,x,y){
        if (!this._line_table[line_name]){
            // auto-stack lines vertically
            this.start_line(line_name,x,y)
            
        }
    }

    /**
     * 
     * @param {AssetGroup} asset_group 
     * @param {Template} template 
     * @returns 
     */
    this.place_in_line = function(asset_group, template){

        var data = template.get_line_start(asset_group.get_asset_type())

        MessageLog.trace(data)
        MessageLog.trace("line: " + data.name + " x:" + data.x + " y:" + data.y)

        // ensure line exists
        this._ensure_line(data.name, data.x, data.y)

        var line = this._line_table[data.name]

        var x = this._get_next_x(data.name) // FIX
        var y = line.y

        asset_group.move_to(x, y)

        return asset_group
    }
}