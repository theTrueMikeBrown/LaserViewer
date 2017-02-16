function drawGcode() {
    var m = 3;
    var gcode = document.getElementById('gcode').value;
    var canvas = document.getElementById('canvas');
    var context = canvas.getContext('2d');

    function isNum(o) {
        return typeof o === 'number';
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
            array.push({ 'name': parts[0], 'params': params });
        });
        return array;
    }
    var gcodeObject = buildGcodeArray(gcode);

    var absolutePositioning = true;
    var metricUnits = true;
    var x = 0;
    var y = 0;
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
    interpreters["G1"] = function (params) {
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

            context.beginPath();
            context.moveTo(x*m, y*m);
            context.lineTo(newX*m, newY*m);
            context.stroke();

            x = newX;
            y = newY;
        }
    };
    interpreters["G2"] = function (params) { //TODO: make this actually draw a clockwise circular line.
        //angle = atan2(y - cy, x - cx)
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

            //context.arc(x,y,r,sAngle,eAngle,counterclockwise);
            context.beginPath();
            context.moveTo(x * m, y * m);
            context.lineTo(newX * m, newY * m);
            context.stroke();

            x = newX;
            y = newY;
        }
    };
    interpreters["G3"] = function (params) { //TODO: make this actually draw a counterclockwise circular line.
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

            //context.arc(x,y,r,sAngle,eAngle,counterclockwise);
            context.beginPath();
            context.moveTo(x * m, y * m);
            context.lineTo(newX * m, newY * m);
            context.stroke();

            x = newX;
            y = newY;
        }
    };
    
    gcodeObject.forEach(function (obj) {
        var fn = interpreters[obj.name];
        if (fn) {
            fn(obj.params);
        }
    });
}
