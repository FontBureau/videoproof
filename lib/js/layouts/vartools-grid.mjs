/* jshint browser: true, esversion: 9, laxcomma: true, laxbreak: true, unused:true, undef:true */

export function init(proofElement, domTool, fontSize, fontSizeTo
                , manualAxisLocations, alignment, variationSettingsFlags
                , gridDimensionControls) {


    const containerElement = domTool.createElement('pre');
    proofElement.append(containerElement);

    function update(stuff) {
        const words = [];
        for(const [k, v] of Object.entries(stuff)) {
            if(['manualAxisLocations'].includes(k)){
                words.push(`${k}:\n`);
                for(let [axis, value] of v) {
                    const vv = JSON.stringify(value, null, 2)
                                   .replaceAll(/^/gm, '....');
                    words.push(`    ${axis}: ${vv}\n`);
                }
            }
            else if (v instanceof Set)
                words.push(`${k}: {${[...v].join(', ')}}\n`);
            else if(typeof v === 'object') {
                const vv = JSON.stringify(v, null, 2)
                    .replaceAll(/^/gm, '....');
                words.push(`${k}: ${vv}\n`);
            }
            else
                words.push(`${k}: ${v}\n`);
        }
        containerElement.textContent = words.join(' ');
    }
    update({gridDimensionControls, fontSize, alignment, variationSettingsFlags, manualAxisLocations});

    console.log(`VARTOOLS_GRID init!`, {
                          fontSize, fontSizeTo, manualAxisLocations});


    return {
        // Update will run if the proof is no re-initalized anyways.
        update: (changedDependencyNamesSet, fontSize
                , manualAxisLocations, alignment, variationSettingsFlags
                , gridDimensionControls)=>{

            update({gridDimensionControls, changedDependencyNamesSet, fontSize
                , alignment, variationSettingsFlags, manualAxisLocations});
        }
    };
}

