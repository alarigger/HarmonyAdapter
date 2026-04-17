# 🎬 Harmony Scene Builder

A lightweight scene assembly system for **Toon Boom Harmony** using scripting + OpenHarmony.
It builds scenes from structured JSON data, handling assets, templates, and casting automatically.

---

## 🚀 Overview

This tool allows you to:

* Parse scene descriptions from JSON
* Validate assets before import
* Import rigs (TPL), PSDs, and other media
* Organize nodes into groups and backdrops
* Route assets to the correct composites

---

## 📦 JSON Structure

Example:

```json
{
  "context": {
    "project": "myProject",
    "task_name": "animation",
    "task_id": 99999,
    "episode": "EP001",
    "sequence": "SQ001",
    "shot": "SH001",
    "cut_duration": 130
    },

  "template": {
    "name": "template_shot",
    "path": "__LIBRARY__/templates/shot.tpl"
  },

  "casting": {
    "assets": [
      {
        "id": 1,
        "name": "ch_A",
        "type": "Character",
        "subType": "mainpack",
        "files": [
          {
            "type": "TPL",
            "role": "rig",
            "path": "__LIBRARY__/characters/ch_A/rig.tpl"
          }
        ]
      }
    ]
  }
}
```

---

## 🧠 Architecture

### Core Components

* **SceneBuilDataFactory**

  * Reads and parses JSON
  * Builds structured data objects

* **SceneBuilData**

  * Container for:

    * `Context`
    * `Template`
    * `Casting`

* **SceneBuilder**

  * Consumes structured data
  * Imports and assembles the scene

* **Asset / AssetFile**

  * Represent casting elements
  * Handle file resolution and metadata

---

## 🔧 Import Strategies

Assets are imported using a **strategy pattern**:

```javascript
this._type_strategies = {
    "TPL": function(path, group){},
    "PSD": function(path, group){},
    "PNG": function(path, group){}
}
```

Each file type defines its own import logic.

---

## 🔌 Path Resolution

Supports environment-based paths:

```javascript
"__LIBRARY__/characters/ch_A/rig.tpl"
```

Resolved using:

```
HARMONY_LIBRARY_PATH
```

---

## ✅ Validation

Before building, assets are validated:

* Missing files
* Empty paths
* Invalid asset structures

```javascript
validate_casting(casting)
validate_asset(asset)
```

---

## 🎯 Template Routing

The `Template` class controls:

* **Composite destinations**
* **Backdrop grouping**

Example:

```javascript
template.get_composite("Character") → "Top/Composite"
template.get_backdrop("BG") → "BG"
```

---

## 🧪 Debugging

Useful debug helpers:

* `sceneData.debug_print()`
* `assetFile.debug_print()`
* JSON dump:

  ```javascript
  MessageLog.trace(JSON.stringify(sceneData, null, 2));
  ```

---

## ⚠️ Requirements

* Toon Boom Harmony scripting environment
* OpenHarmony library (`$.oGroupNode`, etc.)
* Proper environment variable:

  ```
  HARMONY_LIBRARY_PATH
  ```

---

## 📈 Future Improvements

* Automatic node wiring (PEG / Composite chains)
* Backdrop auto-generation
* Template instance abstraction
* Asset fallback / search system
* UI panel for validation and build control

---

## 🧩 Philosophy

This tool separates:

* **Data (JSON)**
* **Parsing (Factory)**
* **Logic (Builder)**
* **Execution (Strategies)**

Making it scalable and pipeline-friendly.

---

## 👨‍💻 Usage

```javascript
var factory = new SceneBuilDataFactory();
var sceneData = factory.from_json(json_path);

if (!factory.validate_casting(sceneData.casting)) {
    MessageBox.warning("Validation failed");
    return;
}

var builder = new SceneBuilder();
builder.build(sceneData);
```

---

## 📌 Notes

* Always validate before import
* Keep JSON clean (no trailing commas)
* Normalize file types (`TPL`, `PSD`, etc.)
* Use consistent naming for assets

---

## 🏁 Result

With a single JSON file, you can:

👉 Build a full Harmony scene
👉 Import and organize all assets
👉 Maintain a clean, reproducible pipeline

---


## 🖥️ CLI Usage

This script is designed to run in batch mode a central bat launcher.

Example:

```bash
harmonyadapter.bat -r build_scene -sp "%scene_path%" -ji "%json_input_path%"
```

### Parameters

* `-r build_scene`
  Calls the `build_scene` entry point function.

* `-sp "%scene_path%"`
  Target Harmony scene path where the build will occur.

* `-ji "%json_input_path%"`
  Path to the JSON file describing the scene (context, template, casting).

### Example

```bash
harmonyadapter.bat ^
  -r build_scene ^
  -sp "P:/projects/EP001/SQ001/SH001/scene.xstage" ^
  -ji "P:/pipeline/build_data/shot_SH001.json"
```

This will:

1. Open or create the scene at `scene_path`
2. Parse the JSON input
3. Validate all assets
4. Import and assemble the scene automatically (overwrite the scene !)


## ⚙️ Installation & Configuration

Follow these steps to set up the Scene Builder locally.

---

### 1. Create your config file

Copy the template:

```bash
config/config_template.json → config/config.json
```

Edit `config.json` and configure your environment:

```json
{
  "connector_paths": {
    "harmony": "C:/Program Files/Toon Boom Harmony 22 Premium/win64/bin/HarmonyPremium.exe",
    "photoshop": "C:/Program Files/Adobe/Adobe Photoshop 2024/Photoshop.exe",
    "blender": "C:/Program Files/Blender Foundation/Blender 3.6/blender.exe",
    "psdreader": "P:/pipeline/tools/psd_reader.bat"
  },
  "project_folders": {
    "_LIBRARY_": "P:/projects/my_show/library"
  }
}
```

---

### 2. Setup Python environment

Run the installation script:

```bash
install.bat
```

This will:

* create a Python virtual environment (venv)
* install required dependencies

Make sure Python is available on your system before running this step.

---

### 3. Install OpenHarmony

Download OpenHarmony and place it inside:

```bash
lib/js/
```

⚠️ The expected folder name is:

```bash
js/OpenHarmony-0.11.0
```

Final structure:

```bash
lib/
 └── js/
     └── OpenHarmony-0.11.0/
         ├── openHarmony.js


```

Make sure:

* the folder name matches **exactly** (`OpenHarmony-0.11.0`)
* the `.js` files are directly inside this folder (not nested one level deeper)

👉 Refer to the included README inside `OpenHarmony-0.11.0/` for additional setup details.

---

### ⚠️ Common Issues

* ❌ Wrong folder name (e.g. `openHarmony-master`)
* ❌ Extra nesting (`OpenHarmony-0.11.0/OpenHarmony-0.11.0/...`)
* ❌ Missing `.js` files in root folder
* ❌ Library not loaded in Harmony script path

If OpenHarmony is not installed correctly, functions like:

```javascript
new $.oGroupNode(...)
```

will fail.


### 4. Library Path Mapping

Your JSON files can use the `__LIBRARY__` token:

```json
"__LIBRARY__/characters/ch_A/rig.tpl"
```

This will resolve to:

```bash
P:/projects/my_show/library/characters/ch_A/rig.tpl
```

Make sure the path exists and is accessible.

---

### 5. (Optional) Environment Variable

You can also define:

```bash
set HARMONY_LIBRARY_PATH=P:/projects/my_show/library
```

This should match your `_LIBRARY_` config.

---

## 🧪 Final Checklist

Before running:

* ✅ `config.json` is set correctly
* ✅ `install.bat` has been executed
* ✅ virtual environment is created
* ✅ OpenHarmony is installed in `lib/js/`
* ✅ library path exists
* ✅ Harmony runs via CLI

---

## 🚀 Ready to Build

You can now run the Scene Builder via CLI:

```bash
harmonyadapter.bat -r build_scene -sp "%scene_path%" -ji "%json_input_path%"
```

---
