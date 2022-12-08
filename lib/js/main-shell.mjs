/* jshint browser: true, esversion: 8, laxcomma: true, laxbreak: true */
import { VideoproofController } from './shell.mjs';

// Should not require to wait until load (all resources, images etc are loaded),
// so this would make it much quicker at startup.
function main() {
    // ensures the document is ready and can be queried
    let mainUIElement = document.querySelector('.typeroof-ui_main');
    videoproofCtrl.setInitialDependency('ready', true);
}
const videoproofCtrl = new VideoproofController(window);

if(document.readyState === 'loading')
    window.addEventListener('DOMContentLoaded', main);
else
    main();
