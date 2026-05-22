function RigManager() {


    /**
     * Find the group in the node list that look like a rig group 
     * @param {$.oNode[]} node_list
     * @returns {$.oGroup}
     */
    this.find_rig_group = function(node_list) {

        if (!node_list) {
            return ;
        }        
        if (node_list.length==0) {
            return ;
        }

        for (var i = 0; i < node_list.length; i++) {
            var curr = node_list[i]
            if(node.type(curr.path)=="MultiPortIn"){
                continue
            }            
            if(node.type(curr.path)=="MultiPortOut"){
                continue
            }
            if(this._is_rig_group(curr)){
                return curr
            }
        }

    };

    /**
     * Find the head node that will be connected to the wrapper group multiportIn
     * @param {$.oNode[]} node_list
     * @returns {$.oGroup}
     */
    this.find_head_node = function(node_list){
        var highest = null
        var minY = Number.MAX_VALUE

        for (var i = 0; i < node_list.length; i++) {
            var curr = node_list[i]
            if(node.type(curr.path)=="MultiPortIn"){
                continue
            }            
            if(node.type(curr.path)=="MultiPortOut"){
                continue
            }
            var y = node.coordY(curr.path)

            if (y < minY){
                minY = y
                highest = curr
            }
        }

        return highest   
    }

    /**
     * Find the foot node that will be connected to the wrapper group multiportOut
     * @param {$.oNode[]} node_list
     * @returns {$.oGroup}
     */
    this.find_foot_node = function(node_list){
        var lowest = null
        var maxY = -Number.MAX_VALUE

        for (var i = 0; i < node_list.length; i++) {
            var curr = node_list[i]
            if(node.type(curr.path)=="MultiPortIn"){
                continue
            }            
            if(node.type(curr.path)=="MultiPortOut"){
                continue
            }
            var y = node.coordY(curr.path)

            if (y > maxY){
                maxY = y
                lowest = curr
            }
        }

        return lowest
    }

    
    /**
     * @param {$.oGroup} group
     * @returns {bool}  
     */
    this._is_rig_group = function(group){
        if(node.type(group.path)!="GROUP"){
            return false
        }
        if(group.inPorts == 0){
            return false
        }        
        if(group.outPorts == 0){
            return false
        }
        return true
    }

    this.is_wrapped_rig = function(node_list){
        // tal
        var groups = []

        for (var i = 0; i < node_list.length; i++) {
            var curr = node_list[i]
            if(node.type(curr.path)=="MultiPortIn"){
                continue
            }            
            if(node.type(curr.path)=="MultiPortOut"){
                continue
            }
            // there is a non group node 
            if(node.type(curr.path)!="GROUP"){
                return false
            }
            groups.push(curr)
        }       
        // only one group
        if(groups.length>1){
            return false
        }
        return true
    }


}