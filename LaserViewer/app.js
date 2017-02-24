function cleanName(name) {
    return name[0] + Number(name.substr(1));
}

function buildGcodeArray(gcode) {
    var array = [];
    var lines = gcode.split('\n');
    lines.forEach(function (line) {
        var parts = line.split(';')[0].split(' ');
        var params = {};
        parts.forEach(function (part) {
            function parameterize(part) {
                return { 'name': part[0], 'value': Number(part.substr(1)) };
            }
            var param = parameterize(part);
            params[param.name] = param.value;
        });
        array.push({ 'name': cleanName(parts[0]), 'params': params });
    });
    return array;
}

function applyOffset() {
    var gcode = document.getElementById('gcode').value;
    var xOffset = Number(document.getElementById('xOffset').value);
    var yOffset = Number(document.getElementById('yOffset').value);

    var output = "";
    var lines = gcode.split('\n');

    lines.forEach(function (line) {
        line = line.replace(/(X)(-?\d*[\.]?\d+)/, function (match, p1, p2) { return p1 + (Number(p2) + xOffset); });
        line = line.replace(/(Y)(-?\d*[\.]?\d+)/, function (match, p1, p2) { return p1 + (Number(p2) + yOffset); });
        output += line + '\n';
    });

    document.getElementById('gcode').value = output;
}

function drawGcode() {
    var m = 1.5;
    var absolutePositioning = true;
    var metricUnits = true;
    var xSize = Number(document.getElementById('xSize').value);
    var ySize = Number(document.getElementById('ySize').value);
    var x = xSize / 2 * m;
    var y = ySize / 2 * m;
    var gcode = document.getElementById('gcode').value;
    var canvas = document.getElementById('canvas');
    var context = canvas.getContext('2d');
    context.clearRect(0, 0, canvas.width, canvas.height);

    context.strokeStyle = '#000';
    context.strokeRect(0, 0, xSize * m, ySize * m);

    function isNum(o) {
        return typeof o === 'number';
    }

    function drawLine(newX, newY) {
        context.beginPath();
        context.moveTo(x * m, y * m);
        context.lineTo(newX * m, newY * m);
        context.stroke();

        x = newX;
        y = newY;
    };

    var drawArc = function (params, counterclockwise) {
        //G2 X2Y0 I0J-2.0
        //angle = atan2(y - cy, x - cx)
        var newX = absolutePositioning ? 0 : x;
        var newY = absolutePositioning ? 0 : y;

        newX += params["X"];
        newY += params["Y"];

        var i = params["I"];
        var j = params["J"];

        var cX = x + i;
        var cY = y + j;
        var r = Math.sqrt(i * i + j * j);
        var sAngle = Math.atan2(y-cY, x-cX);
        var eAngle = Math.atan2(newY-cY, newX-cX);

        context.beginPath();
        context.moveTo(x * m, y * m);
        context.arc(cX * m, cY * m, r * m, sAngle, eAngle, counterclockwise);
        context.stroke();
        
        x = newX;
        y = newY;
    };

    var gcodeObject = buildGcodeArray(gcode);

    var interpreters = {};
    interpreters["M106"] = function (params) {
        if (isNum(params["S"]) && params["S"] <= 255 && params["S"] >= 0) {
            function hexify(val) {
                return ('00' + val.toString(16)).substr(-2);
            }
            var r = hexify(params["S"]);
            var b = hexify(255 - params["S"]);
            context.strokeStyle = '#' + r + '00' + b;
        }
    };
    interpreters["G90"] = function () { absolutePositioning = true; };
    interpreters["G91"] = function () { absolutePositioning = false; };
    interpreters["G20"] = function () { metricUnits = true; };
    interpreters["G21"] = function () { metricUnits = false; };

    var move = function (params) {
        var xIsNum = isNum(params["X"]);
        var yIsNum = isNum(params["Y"]);
        if (xIsNum || yIsNum) {
            var newX = absolutePositioning ? 0 : x;
            var newY = absolutePositioning ? 0 : y;

            if (xIsNum) {
                newX += params["X"];
            }
            if (yIsNum) {
                newY += params["Y"];
            }

            drawLine(newX, newY);
        }
    };
    interpreters["G28"] = function (params) {
        move(params);
        drawLine(0, 0);
    };
    interpreters["G1"] = move;
    interpreters["G0"] = move;
    interpreters["G2"] = function (params) {
        drawArc(params, true);
    };
    interpreters["G3"] = function(params) {
        drawArc(params, false);
    };

    gcodeObject.forEach(function (obj) {
        var fn = interpreters[obj.name];
        if (fn) {
            fn(obj.params);
        }
    });
}
