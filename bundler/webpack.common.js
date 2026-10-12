const CopyWebpackPlugin = require('copy-webpack-plugin')
const HtmlWebpackPlugin = require('html-webpack-plugin')
const MiniCSSExtractPlugin = require('mini-css-extract-plugin')
const path = require('path')
const webpack = require('webpack')

const getBuildVersion = () =>
{
    const buildDate = new Date()

    return [
        buildDate.getFullYear(),
        String(buildDate.getMonth() + 1).padStart(2, '0'),
        String(buildDate.getDate()).padStart(2, '0')
    ].join('') + '_' + [
        String(buildDate.getHours()).padStart(2, '0'),
        String(buildDate.getMinutes()).padStart(2, '0')
    ].join('')
}

// assetDir: folder (relative to the output) for everything except index.html, e.g. 'portfolio/'.
module.exports = (assetDir = '') => ({
    entry: path.resolve(__dirname, '../src/script.js'),
    output:
    {
        hashFunction: 'xxhash64',
        filename: `${assetDir}bundle.[contenthash].js`,
        path: path.resolve(__dirname, '../dist')
    },
    devtool: 'source-map',
    plugins:
    [
        new CopyWebpackPlugin({
            patterns: [
                { from: path.resolve(__dirname, '../static'), to: assetDir || '.' }
            ]
        }),
        new HtmlWebpackPlugin({
            template: path.resolve(__dirname, '../src/index.html'),
            minify: true
        }),
        new MiniCSSExtractPlugin({ filename: `${assetDir}[name].css` }),
        new webpack.DefinePlugin({
            // Base URL of the copied static files, as seen from index.html.
            __ASSET_PREFIX__: JSON.stringify(`./${assetDir}`),
            __APP_BUILD_VER__: webpack.DefinePlugin.runtimeValue(
                () => JSON.stringify(getBuildVersion()),
                true
            )
        })
    ],
    module:
    {
        rules:
        [
            // HTML
            {
                test: /\.(html)$/,
                use:
                [
                    'html-loader'
                ]
            },

            // JS
            {
                test: /\.js$/,
                exclude: /node_modules/,
                use:
                [
                    'babel-loader'
                ]
            },

            // CSS
            {
                test: /\.css$/,
                use:
                [
                    MiniCSSExtractPlugin.loader,
                    'css-loader'
                ]
            },

            // Images
            {
                test: /\.(jpg|png|gif|svg)$/,
                type: 'asset/resource',
                generator:
                {
                    filename: `${assetDir}assets/images/[hash][ext]`
                }
            },

            // Fonts
            {
                test: /\.(ttf|eot|woff|woff2)$/,
                type: 'asset/resource',
                generator:
                {
                    filename: `${assetDir}assets/fonts/[hash][ext]`
                }
            },

            // Shaders
            {
                test: /\.(glsl|vs|fs|vert|frag)$/,
                type: 'asset/source',
                generator:
                {
                    filename: `${assetDir}assets/images/[hash][ext]`
                }
            }
        ]
    }
})
