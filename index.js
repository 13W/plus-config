/**
 * Created by Vladimir <zero@13w.me> on 14.09.17.
 */

/**
 * Created by Vladimir <zero@13w.me> on 09.05.17.
 */
'use strict';

const path = require('path'),
    fs = require('fs');

const processEnv = process.env.NODE_ENV || process.env.ENV;
const env = (processEnv || 'dev').slice(0, 3);

const config = module.exports = {
    env,
    environment: {'dev': 'development', 'pro': 'production'}[env] || processEnv
};

let startLoader = true;

const propOpts = {
    enumerable: false,
    writable: false,
    configurable: false
};

/**
 * @base-url: https://github.com/13W/jsdb/blob/master/lib/common.js
 */

const search = (path, object, options) => {
    let key = '',
        i = 0,
        pathLength = path.length;

    options = options || {};
    if (object && object.hasOwnProperty(path)) {
        return {
            key: path,
            value: object[path],
            object: object,
            complete: true,
            incompletePath: ''
        }
    }

    do {
        const chr = path[i];
        if (chr === '.' || !chr) {
            if (options.create && !object[key]) {
                if (i === pathLength && options.hasOwnProperty('default')) {
                    object[key] = options.default;
                } else {
                    object[key] = {};
                }
            }

            if (i === pathLength) {
                break;
            }

            if (object === undefined) {
                break;
            }

            if (key === '$') {
                break;
            }

            object = object[key];
            key = '';
        } else {
            key += chr;
        }

        i += 1;
    } while (i <= pathLength);

    return {
        complete: i === pathLength,
        incompletePath: key === '$' ? path.substr(i + 1) : '',
        object: object,
        key: key,
        value: key === '$' ? object : object && object[key]
    };
};

Object.defineProperties(config, {
    load: {
        ...propOpts,
        value: (configPath) => {
            startLoader = false;
            const configDir = path.resolve(process.cwd(), configPath);
            const files = fs.readdirSync(configDir)
                .map((filename) => {
                    const extension = path.extname(filename);
                    if (extension !== '.json') {
                        return false;
                    }

                    const parsed = path.basename(filename, extension).split('.');
                    if (parsed.length > 1 && parsed[1] !== env) {
                        return false;
                    }

                    return parsed;
                })
                .filter(Boolean);

            files.sort((prev, next) => {
                const pl = prev.length,
                    nl = next.length;

                return pl > nl ? 1 : pl === nl ? 0 : -1;
            });

            files.forEach((file) => {
                const filePath = path.resolve(configDir, [].concat(file, 'json').join('.'));

                const section = file[0],
                    content = require(filePath),
                    defaultConfig = content.default;

                if (section === 'config') {
                    Object.assign(config, content);
                    return;
                }

                config[section] = config[section] || {};
                if (!defaultConfig) {
                    Object.assign(config[section], content);
                    return;
                }

                config[section] = Object.keys(content).reduce((result, section) => {
                    if (section === 'default') {
                        result[config.environment] = result[config.environment] || {};
                        Object.assign(result[config.environment], defaultConfig);
                        return result;
                    }

                    result[section] = {
                        ...defaultConfig,
                        ...content[section]
                    };

                    return result;
                }, {});
            });

            return config;
        }
    },
    get: {
        ...propOpts,
        value: (key) => {
            return search(key, config).value;
        }
    }
});

if (startLoader) {
    config.load('config');
}

