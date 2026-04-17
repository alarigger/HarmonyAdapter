	CameraManager = function(){

        this.get_camera_coords = function(){

            var doc = $.scn;      

            // camera_peg 
            
            // if the camera has no key the coords are probably at 0 but it's not 100% sure.. need to check this. 

            const default_camera = "Top/Camera-P"
            
            //SEPARATE COORDS
            var SEP_x = this._toonboom_coords_to_float(node.getTextAttr(default_camera, frame.current(), "POSITION.X"))
            var SEP_y = this._toonboom_coords_to_float(node.getTextAttr(default_camera, frame.current(), "POSITION.Y"))
            var SEP_z = this._toonboom_coords_to_float(node.getTextAttr(default_camera, frame.current(), "POSITION.Z"))
            
            //3D COORDS
            var ThreeD_x = this._toonboom_coords_to_float(node.getTextAttr(default_camera, frame.current(), "POSITION.3DPATH.X"))
            var ThreeD_y = this._toonboom_coords_to_float(node.getTextAttr(default_camera, frame.current(), "POSITION.3DPATH.Y"))
            var ThreeD_z = this._toonboom_coords_to_float(node.getTextAttr(default_camera, frame.current(), "POSITION.3DPATH.Z"))
            
            var column3D = this._get_linked_3D_columns(default_camera)
            if(column3D){
                var next_3d_key = this._get_next_3Dkey(column3D);
                if(next_3d_key != false){
                    ThreeD_x = this._toonboom_coords_to_float(next_3d_key[0]);
                    ThreeD_y = this._toonboom_coords_to_float(next_3d_key[1]);
                    ThreeD_z = this._toonboom_coords_to_float(next_3d_key[2]);	
                }
            }

            var cam_peg_x = this._is_zero(ThreeD_x) == false ? ThreeD_x : SEP_x
            var cam_peg_y = this._is_zero(ThreeD_y) == false ? ThreeD_y : SEP_y
            var cam_peg_z = this._is_zero(ThreeD_z) == false ? ThreeD_z : SEP_z

            var cam_w = 1920
            var cam_h = 1080

            const camera = {
                x:parseFloat(cam_peg_x),
                y:parseFloat(cam_peg_y),
                z:parseFloat(cam_peg_z),
                cx:parseFloat(cam_w/2),
                cy:parseFloat(cam_h/2),
                w:parseFloat(cam_w),
                h:parseFloat(cam_h)
            }

            return camera

        }

        this._toonboom_coords_to_float = function(tbv){

            if (!tbv || typeof tbv !== "string") {
                return 0;
            }

            var parts = tbv.split(" ");
            if (parts.length === 0) {
                return 0;
            }

            var value = parseFloat(parts[0]);
            if (isNaN(value)) {
                return 0;
            }

            var letter = parts[1];
            if(letter === "W" || letter === "B" || letter === "S"){
                value = -value;
            }

            return value;
        }

        this._get_linked_3D_columns = function(_node) {

            var attribute_name = "POSITION.3DPATH";
            var linked_column = node.linkedColumn(_node, attribute_name);

            if (linked_column && linked_column !== "") {
                return linked_column;
            }

            return null;
        };

        this._is_zero = function(_number){
            if(_number>0){
                return false
            }
            if(_number<0){
                return false
            }
            return true
        }

        this._get_next_3Dkey = function(_column){
            sub_column = 4;
            key = Array();
            s = 1;
            for (var f = 0 ; f<=frame.numberOf();f++){
                if(column.isKeyFrame(_column,s,f)){
                    for (s = s ; s<sub_column;s++){
                        key.push(column.getEntry(_column,s,f))
                    }
                    return key;
                }
            }
            return false;
        }

        this.get_camera_render_size = function(_camera_z){

            //some nice constants to compensate the hell of toonboom coordonates (evrything in 4:3 by default)
            const toonboom_half_HD_width = 15.8704 // when the camera is at 0 the width is at 30
            const toonboom_half_HD_height = 12.1611 // when the camera is at 0 the width is at 30
            const toonboom_x_ratio = parseFloat(1920/(toonboom_half_HD_width*2))
            const toonboom_y_ratio = parseFloat(1080/(toonboom_half_HD_height*2))
            const toonboom_fov = parseFloat(53*2) // for a FOV of 41

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

    }


