/* jshint browser: true, esversion: 9, laxcomma: true, laxbreak: true, unused:true, undef:true */

export function init(proofElement, domTool, fontSize, fontSizeTo
                , manualAxisLocations, alignment, variationSettingsFlags) {


    const containerElement = domTool.createElement('pre');
    proofElement.append(containerElement);

    function update(stuff) {
        const words = [];
        for(const [k, v] of Object.entries(stuff)) {
            if(k === 'manualAxisLocations'){
                words.push(`${k}:\n`);
                for(let [axis, value] of v) {
                    console.log('JSON.stringify', k, axis, value);
                    const vv = JSON.stringify(value, null, 2)
                                   .replaceAll(/^/gm, '....');
                    words.push(`    ${axis}: ${vv}\n`);
                }
            }
            else if (v instanceof Set)
                words.push(`${k}: {${[...v].join(', ')}}\n`);
            else
                words.push(`${k}: ${v}\n`);
        }
        containerElement.textContent = words.join(' ');
    }
    update({fontSize, alignment, variationSettingsFlags, manualAxisLocations});

    console.log(`VARTOOLS_GRID init!`, {
                          fontSize, fontSizeTo, manualAxisLocations});


    return {
        // Update will run if the proof is no re-initalized anyways.
        update: (changedDependencyNamesSet, fontSize
                    , manualAxisLocations, alignment, variationSettingsFlags)=>{

                update({changedDependencyNamesSet, fontSize
                , alignment, variationSettingsFlags, manualAxisLocations});
        }
    };
}

