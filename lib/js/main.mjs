/* jshint browser: true, esversion: 8, laxcomma: true, laxbreak: true */

import { VideoproofController } from './videoproof-controller.mjs'

// Should not require to wait until load (all resources, images etc are loaded),
// so this would make it much quicker at startup.
function main() {
    // This is the new world, after some bottom up rewriting/refactoring
    // this is the top down adoption.
    let controllerElement = document.querySelector('#controls')
    videoproofCtrl.setUIDependency('mainUIElement', controllerElement);
}
const videoproofCtrl = new VideoproofController(window);

if(document.readyState === 'loading')
    window.addEventListener('DOMContentLoaded', main);
else
    main();
