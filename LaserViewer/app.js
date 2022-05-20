function cleanName(name) {
    return name[0] + Number(name.substr(1));
}

function buildGcodeArray(gcode) {
    var array = [];
    var lines = gcode.split('\n');
    lines.forEach(function (line) {
        var parts = line.trim().split(';')[0].split(' ');
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

function flipVertical() {
    let gcode = document.getElementById('gcode').value;
    gcode = doScale(gcode, 1, -1);
    document.getElementById('gcode').value = gcode;
}

function flipHorizontal() {
    let gcode = document.getElementById('gcode').value;
    gcode = doScale(gcode, -1, 1);
    document.getElementById('gcode').value = gcode;
}

function cleanUp() {
    let gcode = document.getElementById('gcode').value;

    gcode = gcode.replace("G20 (Units are in Inches)", "M106 S0\nG21"); //convert to metric step 1
    gcode = doScale(gcode, 25.4, -25.4); // step 2
    gcode = gcode.replace("G61 (Go to exact corners)", ""); //removing useless gcode

    document.getElementById('gcode').value = gcode;

    findExtremes();
    let xMin = document.getElementById('xMin').value;
    let yMin = document.getElementById('yMin').value;

    gcode = doOffset(gcode, -xMin, -yMin);

    let before = "";
    while (gcode != before) {
        before = gcode;
        gcode = gcode.replace("M3 S1", "M106 S255");
        gcode = gcode.replace("M5", "M106 S0");
    }

    gcode = gcode.replace("M30", "M106 S0\nG1 F1000\nG1 X0 Y0\nM18\nM30");
    document.getElementById('gcode').value = gcode;
}

function findExtremes() {
    var gcode = document.getElementById('gcode').value;
    var xMin = Number.MAX_VALUE;
    var xMax = Number.MIN_VALUE;
    var yMin = Number.MAX_VALUE;
    var yMax = Number.MIN_VALUE;

    var lines = gcode.split('\n');

    lines.forEach(function (line) {
        var xMatch = /(X)(-?\d*[\.]?\d+)/.exec(line);
        if (xMatch) {
            var x = xMatch[2];
            xMin = Math.min(xMin, x);
            xMax = Math.max(xMax, x);
        }

        var yMatch = /(Y)(-?\d*[\.]?\d+)/.exec(line);
        if (yMatch) {
            var y = yMatch[2];
            yMin = Math.min(yMin, y);
            yMax = Math.max(yMax, y);
        }
    });
    document.getElementById('xMin').value = xMin;
    document.getElementById('xMax').value = xMax;
    document.getElementById('yMin').value = yMin;
    document.getElementById('yMax').value = yMax;
}

function doScale(gcode, xScale, yScale) {
    if (!yScale) {
        yScale = xScale;
    }
    var output = "";
    var lines = gcode.split('\n');

    lines.forEach(function (line) {
        line = line.replace(/(X)(-?\d*[\.]?\d+)/, function (match, p1, p2) { return p1 + (Number(p2) * xScale); });
        line = line.replace(/(Y)(-?\d*[\.]?\d+)/, function (match, p1, p2) { return p1 + (Number(p2) * yScale); });
        line = line.replace(/(I)(-?\d*[\.]?\d+)/, function (match, p1, p2) { return p1 + (Number(p2) * xScale); });
        line = line.replace(/(J)(-?\d*[\.]?\d+)/, function (match, p1, p2) { return p1 + (Number(p2) * yScale); });
        output += line + '\n';
    });

    return output;
};

function applyScale() {
    var gcode = document.getElementById('gcode').value;
    var scale = Number(document.getElementById('scale').value);

    var output = doScale(gcode, scale);

    document.getElementById('gcode').value = output;
}

function applyOffset() {
    var gcode = document.getElementById('gcode').value;
    var xOffset = Number(document.getElementById('xOffset').value);
    var yOffset = Number(document.getElementById('yOffset').value);

    let output = doOffset(gcode, xOffset, yOffset);
    document.getElementById('gcode').value = output;
}

function doOffset(gcode, xOffset, yOffset) {
    var lines = gcode.split('\n');
    let output = "";

    lines.forEach(function (line) {
        line = line.replace(/(X)(-?\d*[\.]?\d+)/, function (match, p1, p2) { return p1 + (Number(p2) + xOffset); });
        line = line.replace(/(Y)(-?\d*[\.]?\d+)/, function (match, p1, p2) { return p1 + (Number(p2) + yOffset); });
        output += line + '\n';
    });

    return output;
}

function drawGcode() {
    var absolutePositioning = true;
    var metricUnits = true;

    var template = document.getElementById('template').value;
    var gcode = document.getElementById('gcode').value;
    var gcode = template + "\n" + gcode;
    if (gcode.search("G20") !== -1) {
        metricUnits = false;
    }
    var m = metricUnits ? 1.5 : 38.1;
    var viewScale = Number(document.getElementById('viewScale').value);
    m *= viewScale;
    var xSize = Number(document.getElementById('xSize').value) * viewScale;
    var ySize = Number(document.getElementById('ySize').value) * viewScale;
    var x = xSize / 2 * m;
    var y = ySize / 2 * m;
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
        context.moveTo(xSize - x * m, y * m);
        context.lineTo(xSize - newX * m, newY * m);
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
        var sAngle = Math.atan2(y - cY, xSize - x - cX);
        var eAngle = Math.atan2(newY - cY, xSize - newX - cX);

        context.beginPath();
        context.moveTo(xSize - x * m, y * m);
        context.arc(xSize - cX * m, cY * m, r * m, sAngle, eAngle, counterclockwise);
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
    interpreters["G3"] = function (params) {
        drawArc(params, false);
    };

    gcodeObject.forEach(function (obj) {
        var fn = interpreters[obj.name];
        if (fn) {
            fn(obj.params);
        }
    });
}
