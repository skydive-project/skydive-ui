function prettyBytes(value) {
    var g = Math.floor(value / 1000000000);
    var m = Math.floor((value - g * 1000000000) / 1000000);
    var k = Math.floor((value - g * 1000000000 - m * 1000000) / 1000);
    var b = value - g * 1000000000 - m * 1000000 - k * 1000;

    if (g) return g + "Gb (" + value.toLocaleString() + " bytes)";
    if (m) return m + "Mb (" + value.toLocaleString() + " bytes)";
    if (k) return k + "Kb (" + value.toLocaleString() + " bytes)";

    return b.toLocaleString() + " bytes";
}