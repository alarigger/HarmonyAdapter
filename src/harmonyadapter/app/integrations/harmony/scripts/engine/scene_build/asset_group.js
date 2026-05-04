



function AssetGroupFactory(){
    /**
     * 
     * @param {$.oGroup} group 
     * @param {Asset} asset 
     * @param {AssetFile} asset_file 
     * @returns {AssetGroup}
     */
    this.create = function(group,asset,asset_file){
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
    this.register_node(group,"group")

    //context data
    this.asset = asset || null
    this.asset_file = asset_file || null

    //context methods : 
    this.get_file_type = function(){
        return this.asset_file.type
    }        
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
    this.register_node = function(n, role){
        var role = role || "main"
        this.node_table[role] = n
        this.node_list.push(n)
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
            var n = this.node_table[role]
            var y = node.coordY(n)

            if (y < minY){
                minY = y
                highest = n
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
            var n = this.node_table[role]
            var y = node.coordY(n)

            if (y > maxY){
                maxY = y
                lowest = n
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

    }   
    this.add_display = function(_name){

    } 
    this.add_composite = function(_name){

    }
}
