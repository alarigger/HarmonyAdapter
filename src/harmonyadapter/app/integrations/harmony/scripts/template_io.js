MessageLog.trace("----------------------------------------------------------")
MessageLog.trace("           SCRIPT : TEMPLATE_IO.JS ")
MessageLog.trace("----------------------------------------------------------")

const script_folder = System.getenv("HARMONY_WRAPPER_SCRIPT_FOLDER");
const lib_folder = System.getenv("APP_LIB_FOLDER");

include(lib_folder + "/js/OpenHarmony-0.11.0/openHarmony.js");

function parse_args() {
    const raw = System.getenv("HARMONY_WRAPPER_ARGS");
    if (!raw || raw === "") {
        throw new Error("HARMONY_WRAPPER_ARGS is empty");
    }
    return JSON.parse(raw);
}

function _select_nodes(node_paths) {
    if (!node_paths || node_paths.length === 0) {
        throw new Error("node_paths is empty");
    }

    selection.clearSelection();
    var nodes = [];

    for (var i = 0; i < node_paths.length; i++) {
        var path = node_paths[i];
        var nodeObj = $.scene.getNodeByPath(path);
        if (!nodeObj) {
            throw new Error("Node not found: " + path);
        }
        selection.addNodeToSelection(path);
        nodes.push(nodeObj);
    }

    return nodes;
}

function export_tpl(args) {
    var node_paths = args.node_paths || [];
    var output_tpl_path = args.output_tpl_path;

    if (!output_tpl_path) {
        throw new Error("output_tpl_path is required");
    }

    var nodes = _select_nodes(node_paths);
    $.scene.exportTemplate(nodes, output_tpl_path, "usedOnly");
    MessageLog.trace("[template_io] export done: " + output_tpl_path);

    _auto_register_export(args, output_tpl_path);
}

function _auto_register_export(args, output_tpl_path) {
    if (System.getenv("SCENEBUILD_AUTO_REGISTER") !== "1") {
        return;
    }

    var asset_name = args.asset_name;
    if (!asset_name || asset_name === "") {
        MessageLog.trace("[template_io] auto-register skipped: missing asset_name");
        return;
    }

    var db_path = System.getenv("SCENEBUILD_REGISTER_DB_PATH");
    if (!db_path || db_path === "") {
        MessageLog.trace("[template_io] auto-register skipped: missing SCENEBUILD_REGISTER_DB_PATH");
        return;
    }

    var python_exe = System.getenv("SCENEBUILD_PYTHON_EXE");
    if (!python_exe || python_exe === "") {
        MessageLog.trace("[template_io] auto-register skipped: missing SCENEBUILD_PYTHON_EXE");
        return;
    }

    var backend = System.getenv("SCENEBUILD_REGISTER_BACKEND") || "json";
    var cli_module = System.getenv("SCENEBUILD_REGISTER_CLI_MODULE") || "miyu.claudy.scene_builder.cli";

    var cmdline = [
        "-m",
        cli_module,
        "register-asset-file",
        "--asset-name",
        asset_name,
        "--tpl-path",
        output_tpl_path,
        "--db-path",
        db_path,
        "--backend",
        backend,
    ];

    var p = new QProcess();
    p.start(python_exe, cmdline);
    p.waitForFinished(30000);

    var stdoutText = (new QTextStream(p.readAllStandardOutput())).readAll();
    var stderrText = (new QTextStream(p.readAllStandardError())).readAll();
    MessageLog.trace("[template_io] register stdout: " + stdoutText);
    if (stderrText && stderrText !== "") {
        MessageLog.trace("[template_io] register stderr: " + stderrText);
    }

    if (p.exitCode() !== 0) {
        throw new Error("Auto-register failed (exit code " + p.exitCode() + ")");
    }

    MessageLog.trace("[template_io] auto-register done for asset " + asset_name);
}

function import_tpl(args) {
    var tpl_path = args.tpl_path;
    if (!tpl_path) {
        throw new Error("tpl_path is required");
    }

    var top = $.scene.getNodeByPath("Top");
    if (!top) {
        throw new Error("Top group not found");
    }

    top.importTemplate(tpl_path);
    MessageLog.trace("[template_io] import done: " + tpl_path);
}

var args = parse_args();
var action = args.action;

if (action === "export_tpl") {
    export_tpl(args);
} else if (action === "import_tpl") {
    import_tpl(args);
} else {
    throw new Error("Unknown action: " + action);
}

scene.saveAll();
