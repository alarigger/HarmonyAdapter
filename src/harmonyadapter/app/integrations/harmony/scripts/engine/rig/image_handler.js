function ImageHandler() {

    var PNGTransparencyMode = 0; //Premultiplied wih Black
    var TGATransparencyMode = 0; //Premultiplied wih Black
    var SGITransparencyMode = 0; //Premultiplied wih Black
    var LayeredPSDTransparencyMode = 1; //Straight
    /**!
        given a file (ie. a png, tga,tvg, 3d,...), create a new read module, column and element of the
        right type and put the file within
        @param {string} group_path
        @param {string} image_path
        @returns {$.oNode} the name of the read created so that it can be connected to the graph.
    **/
    this.importImageInGroup = function (group_path, image_path) {

        // prefil the otpions for a stable code path 
        var options = {}
        options.filename = image_path
        options.transparency = 100
        options.alignmentRule = 7
        options.conversion = "noConversion"

        // call harmony code 
        var node_path = dropFileInNewElement(group_path, options)

        if(!node_path){
            MessageLog.trace("[ImageHandler] ERROR could not create image node ")
            return 

        }

        MessageLog.trace("[ImageHandler] created image node "+node_path)

        // parse the openHarmony class with the result
        return $.scene.getNodeByPath(node_path)

    }

    // PRIVATE FUNCTIONS : 


    function dropFileInNewElement(root, options) {
        MessageLog.trace("[ImageHandler] creating image node inside ("+root+")")
        MessageLog.trace("[ImageHandler] with options ("+JSON.stringify(options)+")")
        var filename = options.filename;
        var name = basename(filename);
        var elementInfo = getElementInfo(options);
        var elemId = element.add(name, "COLOR", scene.numberOfUnitsZ(), elementInfo.fileFormat, elementInfo.vectorFormat);

        MessageLog.trace("[ImageHandler] element infos : ("+JSON.stringify(elementInfo)+")")

        if (elemId == -1) {
            // hum, unknown file type most likely -- let's skip it.
            MessageLog.trace("[ImageHandler] ERROR could not create image element for ("+name+")")
            return null; // no read to add.
        }



        var uniqueColumnName = getUniqueColumnName(name);
        column.add(uniqueColumnName, "DRAWING");
        column.setElementIdOfDrawing(uniqueColumnName, elemId);
        MessageLog.trace("[ImageHandler] creating new column ("+uniqueColumnName+")")

        MessageLog.trace("[ImageHandler] creating new read ("+root+"/"+name+")")
        var read = node.add(root, name, "READ", 0, 0, 0);
        selection.addNodeToSelection(read);

        MessageLog.trace("[ImageHandler] initialising read properties ")
        node.setTextAttr(read, "CAN_ANIMATE", 1, preferences.getBool("ELEMENT_CAN_BE_ANIMATED_DEFAULT_VALUE", false) ? "Y" : "N");
        
        MessageLog.trace("[ImageHandler] resolving alignement rule ")
        var alignmentAttr = node.getAttr(read, frame.current(), "ALIGNMENT_RULE");
        alignmentAttr.setValue(options.alignmentRule);
        
        MessageLog.trace("[ImageHandler] resolving transparency options ")
        var transparencyModeAttr = node.getAttr(read, frame.current(), "applyMatteToColor");
        if (extension == "png")
            transparencyModeAttr.setValue(PNGTransparencyMode);
        if (extension == "tga")
            transparencyModeAttr.setValue(TGATransparencyMode);
        if (extension == "sgi")
            transparencyModeAttr.setValue(SGITransparencyMode);
        if (extension == "psd" || extension == "psb")
            transparencyModeAttr.setValue(FlatPSDTransparencyMode);
        
        MessageLog.trace("[ImageHandler] creating drawing substitution ")
        node.linkAttr(read, "DRAWING.ELEMENT", uniqueColumnName);
        
        var timing = "1"; // we're creating drawing name '1'
        
        Drawing.create(elemId, timing, true); // create a drawing drawing, 'true' indicate that the file exists.
        var drawingFilePath = Drawing.filename(elemId, timing);   // get the actual path, in tmp folder.
        MessageLog.trace("[ImageHandler] created drawing file  ("+drawingFilePath+")")
        
        MessageLog.trace("[ImageHandler] vectorising drawing  ("+drawingFilePath+")")
        vectorizeFile(filename, drawingFilePath, null, options);

        if (options.conversion == "convertBitmap") {
            var lineArtDrawingMode = node.getAttr(read, frame.current(), "lineArtDrawingMode");
            lineArtDrawingMode.setValue("BitmapDrawingMode");
            var colorArtDrawingMode = node.getAttr(read, frame.current(), "colorArtDrawingMode");
            colorArtDrawingMode.setValue("BitmapDrawingMode");
        }

         MessageLog.trace("[ImageHandler] extending exposure ")
         //set exposure of all frames.
         var nframes = frame.numberOf();
         for (var i = 1; i <= nframes; ++i) {
             column.setEntry(uniqueColumnName, 1, i, timing);
            }
            
        MessageLog.trace("[ImageHandler] image read creation DONE ! ")
        return read; // name of the new drawing layer.
    }



    /*!
    * Extract basename from a file path.
    * Handles:
    *  - forward slashes (/)
    *  - backslashes (\)
    *  - mixed separators
    *  - duplicate separators
    *  - filenames with or without extensions
    *  - trailing slashes
    *
    * Examples:
    *   "/Users/mbegin/MyFiles/image.png"       -> "image"
    *   "C:\\temp\\image.png"                   -> "image"
    *   "C:/temp//folder\\\\image.tar.gz"       -> "image.tar"
    *   "/path/to/folder/"                      -> "folder"
    *   "image.png"                             -> "image"
    */
    function basename(filename) {
        if (!filename)
            return "";

        // Normalize all slashes to forward slash
        filename = String(filename).replace(/\\/g, "/");

        // Collapse duplicate slashes
        filename = filename.replace(/\/+/g, "/");

        // Remove trailing slash (except root "/")
        if (filename.length > 1)
            filename = filename.replace(/\/$/, "");

        // Extract last path segment
        var parts = filename.split("/");
        var name = parts[parts.length - 1] || "";

        // Remove extension
        var pos = name.lastIndexOf(".");
        if (pos > 0) // keep hidden files like ".gitignore"
            name = name.substring(0, pos);

        return name;
    }

    /*!
    @return A unique name based on the column name prefix.
    */
    function getUniqueColumnName(column_prefix) {
        var suffix = 0;
        // finds if unique name for a column
        var column_name = column_prefix;
        while (suffix < 200) {
            if (!column.type(column_name))
                break;

            suffix = suffix + 1;
            column_name = column_prefix + "_" + suffix;
        }
        return column_name;
    }

    /*!
      Vectorize srcFilename and output the resulting file at dstFilename.
    */
    function vectorizeFile(srcFilename, dstFilename, layerName, options) {
        var vectorizeOptions = {};

        if (layerName != null)
            vectorizeOptions["layer"] = layerName;

        if (options.conversion == "convertBitmap") {
            var resolution = CELIO.getInformation(srcFilename);
            var bitmapLayerResolutionScaleFactor = 1.0;
            if (options.alignmentRule == 7 /*horizontal fit*/)
                bitmapLayerResolutionScaleFactor = resolution.width / scene.defaultResolutionX();
            else if (options.alignmentRule == 6 /*vertical fit*/)
                bitmapLayerResolutionScaleFactor = resolution.height / scene.defaultResolutionY();

            vectorizeOptions["asBitmap"] = true;
            vectorizeOptions["pixelPerModelUnit"] = scene.defaultPixelPerModelUnitForBitmapLayers() * bitmapLayerResolutionScaleFactor;
        }

        // Convert a specific layer of a PSD to a TVG
        if (options.conversion == "convertVector" || options.conversion == "convertBitmap") {
            if (options.vectorizationOptions && options.vectorizationOptions.length)
                DrawingTools.vectorize("-file", srcFilename, "-outfile", dstFilename, toCommandLineArg(vectorizeOptions), options.vectorizationOptions);
            else
                DrawingTools.vectorize("-file", srcFilename, "-outfile", dstFilename, toCommandLineArg(vectorizeOptions));
        }
        else {
            copyFile(srcFilename, dstFilename);
        }
    }

    function toCommandLineArg(options) {
        // -file and -outfile needs to be specified first, it's dumb.
        //var commandLineArg = "-file \"" + options["file"] + "\" -outfile \"" + vectorizeOptions["outfile"] + "\"";
        var commandLineArg = "";

        addObjectMethod();

        var entries = Object.entries(options);
        for (var i = 0; i < entries.length; ++i) {
            var entry = entries[i];
            var key = entry[0];
            var value = entry[1];

            if (i != 0)
                commandLineArg += " ";

            commandLineArg += "-" + key;

            if (typeof value == "boolean")
                continue;

            if (typeof value == "string" && (key == "file" || key == "outfile"))
                commandLineArg += " \"" + value + "\"";
            else
                commandLineArg += " " + value;
        }

        return commandLineArg;
    }

    /*!
      Copies srcFilename to dstFilename.
    */
    function copyFile(srcFilename, dstFilename) {
        var srcFile = new PermanentFile(srcFilename);
        var dstFile = new PermanentFile(dstFilename);
        srcFile.copy(dstFile);
    }

    function addObjectMethod() {
        // From https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Object/keys
        if (!Object.keys) {
            Object.keys = (function () {
                'use strict';
                var hasOwnProperty = Object.prototype.hasOwnProperty,
                    hasDontEnumBug = !({ toString: null }).propertyIsEnumerable('toString'),
                    dontEnums = [
                        'toString',
                        'toLocaleString',
                        'valueOf',
                        'hasOwnProperty',
                        'isPrototypeOf',
                        'propertyIsEnumerable',
                        'constructor'
                    ],
                    dontEnumsLength = dontEnums.length;

                return function (obj) {
                    if (typeof obj !== 'function' && (typeof obj !== 'object' || obj === null)) {
                        throw new TypeError('Object.keys called on non-object');
                    }

                    var result = [], prop, i;

                    for (prop in obj) {
                        if (hasOwnProperty.call(obj, prop)) {
                            result.push(prop);
                        }
                    }

                    if (hasDontEnumBug) {
                        for (i = 0; i < dontEnumsLength; i++) {
                            if (hasOwnProperty.call(obj, dontEnums[i])) {
                                result.push(dontEnums[i]);
                            }
                        }
                    }
                    return result;
                };
            }());
        }

        if (!Object.entries) {
            Object.entries = function (obj) {
                var ownProps = Object.keys(obj),
                    i = ownProps.length,
                    resArray = new Array(i); // preallocate the Array
                while (i--)
                    resArray[i] = [ownProps[i], obj[ownProps[i]]];

                return resArray;
            };
        }
    }

    function trace(msg) {
        MessageLog.trace(msg);
    }

    function getElementInfo(options) {
        var elementInfo = {};
        if (options.conversion == "convertVector") {
            elementInfo.fileFormat = "SCAN";
            elementInfo.vectorFormat = "TVG";
        }
        else if (options.conversion == "convertBitmap") {
            elementInfo.fileFormat = "SCAN";
            elementInfo.vectorFormat = "TVG";
        }
        else if (options.conversion == "noConversion") {
            var pos = options.filename.lastIndexOf(".");
            if (pos < 0)
                return null;

            extension = options.filename.substr(pos + 1).toLowerCase();
            if (extension == "jpeg")
                extension = "jpg";

            if (extension == "tvg") {
                elementInfo.fileFormat = "SCAN";
                elementInfo.vectorFormat = "TVG"
            }
            else {
                elementInfo.fileFormat = extension.toUpperCase();
                elementInfo.vectorFormat = "None";
            }
        }
        return elementInfo;
    }

}