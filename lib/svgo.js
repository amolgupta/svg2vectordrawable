
// https://github.com/svg/svgo
const SVGO = require('svgo');

module.exports = function(svgstr) {
    const svgo = new SVGO({
        plugins: [
            { cleanupListOfValues: { floatPrecision: 2, leadingZero: false } },
            { cleanupNumericValues: { floatPrecision: 2, leadingZero: false } },
            { convertPathData: { floatPrecision: 2, leadingZero: false } },
            { convertColors: { shorthex: false, shortname: false } },
            { convertShapeToPath: { convertArcs: true } },
            { mergePaths: false },
            { removeRasterImages: true },
            { removeScriptElement: true },
            { removeXMLNS: true },
            { removeViewBox: false },
            { collapseGroups: false },
            { moveGroupAttrsToElems: false },
            { moveElemsAttrsToGroup: false }
        ]
    });

    return new Promise((resolve, reject) => {
        svgo
            .optimize(svgstr, { input: 'string' })
            .then(result => resolve(result.data))
            .catch(err => reject(err));
    });
};
