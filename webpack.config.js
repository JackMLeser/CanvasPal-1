const path = require('path');
const CopyPlugin = require('copy-webpack-plugin');

module.exports = {
    entry: {
        'background/index': './src/background/index.ts',
        'popup/popup': './src/popup/popup.ts',
        'contentScript/index': './src/contentScript/index.ts',
        'settings/settings': './src/settings/settings.ts'
    },
    output: {
        path: path.resolve(__dirname, 'dist'),
        filename: '[name].js',
        clean: true // Clean the dist folder before each build
    },
    module: {
        rules: [
            {
                test: /\.ts$/,
                use: [
                    {
                        loader: 'ts-loader',
                        options: {
                            configFile: 'tsconfig.json',
                            transpileOnly: false,
                            compilerOptions: {
                                module: 'esnext',
                                esModuleInterop: true,
                                allowSyntheticDefaultImports: true
                            }
                        }
                    }
                ],
                exclude: /node_modules/
            },
            {
                test: /\.css$/,
                type: 'asset/resource',
                generator: {
                    filename: '[path][name][ext]'
                }
            }
        ]
    },
    resolve: {
        extensions: ['.ts', '.js'],
        modules: ['node_modules', path.resolve(__dirname, 'src')]
    },
    plugins: [
        new CopyPlugin({
            patterns: [
                {
                    from: 'src/popup/popup.html',
                    to: 'popup/popup.html'
                },
                { from: 'src/popup/popup.css', to: 'popup/popup.css' },
                {
                    from: 'src/settings/settings.html',
                    to: 'settings/settings.html',
                    transform(content) {
                        return content.toString()
                            .replace(
                                '<script type="module" src="/dist/settings/settings.js">',
                                '<script type="module" src="settings.js">'
                            );
                    }
                },
                { from: 'src/settings/settings.css', to: 'settings/settings.css' },
                {
                    from: 'src/manifest.json',
                    to: 'manifest.json'
                },
                // Copy all icons
                {
                    from: 'icons',
                    to: 'icons'
                }
            ]
        })
    ],
    optimization: {
        splitChunks: {
            chunks: 'async', // Change to async to avoid splitting content scripts
            cacheGroups: {
                vendor: {
                    test: /[\\/]node_modules[\\/]/,
                    name: 'vendors/vendor',
                    chunks: 'all'
                }
            }
        }
    },
    mode: 'production',
    devtool: 'source-map',
    target: 'web'  // Ensure proper web environment targeting
}