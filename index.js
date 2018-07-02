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

const defineHiddenProperty = (object, properties) => {
    for (const [property, value] of Object.entries(properties)) {
        Object.defineProperty(object, property, {
            enumerable: false,
            configurable: false,
            writable: true,
            value
        });
    }
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

defineHiddenProperty(config, {
    parseArgs(schema = {}) {
        const argv = process.argv.slice(2);
        argv.push(null);

        let key = null,
            value = null;

        while (argv.length > 0) {
            if (key && value) {
                if (schema[key]) {
                    value = schema[key](value);
                }

                config.set(key, value);
                key = null;
                value = null;
            }

            const arg = argv.shift();
            if (arg === null) {
                if (key && !value) {
                    value = true;
                    argv.push(null);
                    continue;
                }
                break;
            }

            if (key === null) {
                if (arg.substr(0, 2) === '--') {
                    [key, value] = arg.substr(2).split('=');
                    continue;
                }

                if (arg.substr(0, 1) === '-') {
                    continue;
                }
            }

            if (value === null) {
                if (arg.substr(0, 2) === '--') {
                    value = true;
                    argv.unshift(arg);
                    continue;
                }

                value = arg;
            }
        }
    },
    load(configPath) {
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

        config.parseArgs();

        return config;
    },
    get(key) {
        return search(key, config).value;
    },
    set(key, value) {
        const res = search(key, config);
        if (res.key === '$' || !res.object) {
            return config;
        }

        res.object[res.key] = value;

        return config;
    },
    assign(key, value) {
        const res = search(key, config);
        if (res.key === '$' || !res.object) {
            return config;
        }

        if (!res.object[res.key]) {
            res.object[res.key] = value;
        } else {
            Object.assign(res.object[res.key], value);
        }

        return config;
    }
});

config.load('config');
