const {VueLoaderPlugin} = require("vue-loader");

module.exports = {
    mode: "development",
    entry: __dirname + "/src/index.js",
    output: {
        path: __dirname + "/dist",
    },
    devtool: "inline-source-map",
    devServer: {
        contentBase: __dirname + "/dist",
        inline: true,
        hot: true,
        port: 8080,
    },
    module: {
        rules: [
            {
                test: /\.js$/,
                exclude: /node_modules/,
                use: {
                    loader: "babel-loader",
                },
            },
            {
                test: /\.vue$/,
                loader: "vue-loader",
            },
        ],
    },
    plugins: [
        new VueLoaderPlugin(),
    ],
    resolve: {
        alias: {
            vue$: "vue/dist/vue.esm.js",
        },
        extensions: ["*", ".js", ".vue", ".json"],
    }
};