/**
 * Created by Vladimir <zero@13w.me> on 28.06.18.
 */

const config = require('./').load('config', {
    'server.port': Number,
    web: Boolean,
    cli: Boolean
});

console.log(config);
