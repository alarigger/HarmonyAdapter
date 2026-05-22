function NodeManager() {

    this._attrName = "ha_node_id";

    // internal registry
    this._map = {};


    /**
     * Generate simple unique ID
     */
    this._uuid = function () {
        return (
            "nid_" +
            Math.random().toString(36).substr(2, 9) +
            "_" +
            Date.now()
        );
    };

    this.add_attribute = function(_node,_name,_value){

        if (!_node) return;

        var attr = node.getAttr(_node.path, 1,_name);

        // attribute does not exist → create it
        if (!attr || attr.keyword() == "") {

            node.createDynamicAttr(
                _node.path,
                "STRING",
                _name,
                _name,
                false
            );

            attr = node.getAttr(_node.path, 1, this._attrName);
        }

        // assign value if empty
        var current = node.getTextAttr(_node.path, 1, _name);
        if (!current || current === "") {

            node.setTextAttr(
                _node.path,
                _name,
                1,
                _value
            );

            current = _value;
        }

        MessageLog.trace("[NodeManager] added attribute ("+_name+") with value ("+_value+") to node ("+_node.path+")")

        return current
    }


    /**
     * Ensure node has persistent attribute "node_id"
     * @param {$.oNode} node
     */
    this.mark_node = function (_node) {

        if (!_node) return;

        var attr = node.getAttr(_node.path, 1, this._attrName);
        const id = this._uuid()

        this.add_attribute(_node,this._attrName,id)

        // register immediately
        this.register_node(_node);

        return id;
    };

    /**
     * Store node in lookup table
     * @param {$.oNode} _node
     */
    this.register_node = function (_node) {

        if (!_node) return;

        var id = node.getTextAttr(_node.path, 1, this._attrName);

        if (!id) return;

        this._map[id] = _node;
    };


    /**
     * Find node even after explodeGroup / renaming / move
     * @param {String} id
     * @return {$.oNode|null}
     */
    this.find_node_by_id = function (id) {

        if (!id) return null;

        //-----------------------------------------
        // 2. fallback scan (after explode)
        //-----------------------------------------

        var nodes = $.scene.nodes;

        for (var i = 0; i < nodes.length; i++) {

            var _node = nodes[i];

            try {

                var value = node.getTextAttr(_node.path, 1, this._attrName);

                if (value == id) {

                    this._map[id] = _node;
                    return _node;
                }

            } catch (err) {
                continue;
            }
        }

        return null;
    };


    /**
     * Ungroup (explode) a Harmony group safely and return its nodes
     *
     * Strategy:
     * 1. Mark nodes with persistent node_id
     * 2. Explode group
     * 3. Re-find nodes by node_id (because paths/names change)
     *
     * @param {$.oGroup} group
     * @returns {$.oNode[]}
     */
    this.ungroup = function(group) {

        if (!group) {
            return [];
        }

        //---------------------------------------------
        // 1. Collect nodes BEFORE explode
        //---------------------------------------------

        var before_nodes = group.subNodes(true);

        var id_list = [];

        for (var i = 0; i < before_nodes.length; i++) {

            var n = before_nodes[i];

            // skip invalid nodes
            if (!n) continue;

            // ensure node is marked
            var id = this.mark_node(n);

            if (id) {
                this.register_node(n);
                id_list.push(id);
            }
        }

        //---------------------------------------------
        // 2. Explode group (native Harmony function)
        //---------------------------------------------

        try {

            node.explodeGroup(group.path);

        } catch (err) {

            MessageLog.trace(
                "[NodeManager] explodeGroup failed: " + err
            );

            return before_nodes;
        }

        //---------------------------------------------
        // 3. Resolve nodes AFTER explosion
        //---------------------------------------------

        var result_nodes = [];

        for (var j = 0; j < id_list.length; j++) {

            var found = this.find_node_by_id(id_list[j]);

            if (found) {
                result_nodes.push(found);
            }
        }

        MessageLog.trace("[NodeManager] ungrouped nodes : ")
        MessageLog.trace("[NodeManager]"+result_nodes)

        //---------------------------------------------
        // 4. Return fresh node references
        //---------------------------------------------

        return result_nodes;
    };

    /**
     * 
     * @param {$.oNode} src_node 
     * @param {$.oNode} dst_node 
     */
    this.link_out_all_ports = function(src_node,dst_node){
        for(var o = src_node.outPorts ; o  >= 0 ; o--){
            src_node.linkOutNode(dst_node,o,0,true)
        }
    }    

    /**
     * 
     * @param {$.oNode} src_node 
     * @param {$.oNode} dst_node 
     */
    this.link_in_all_ports = function(src_node,dst_node){
        for(var o = src_node.inPorts ; o  >= 0 ; o--){
            src_node.linkInNode(dst_node,o,0,true)
        }
    }


}