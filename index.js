// Ensure recurly.css is included in the build
import recurlyCSS from './lib/recurly.css';

// Primary export is a single instance of Recurly
import {Recurly} from './lib/recurly';

let recurly = new Recurly;

export default recurly;
