// client/craco.config.js
module.exports = {
    webpack: {
        configure: (webpackConfig) => {
            // Ignore face-api.js source map warnings
            webpackConfig.ignoreWarnings = [
                /Failed to parse source map/,
            ];
            webpackConfig.resolve = webpackConfig.resolve || {};
            webpackConfig.resolve.fallback = {
                ...(webpackConfig.resolve.fallback || {}),
                fs: false,
            };
            return webpackConfig;
        },
    },
};