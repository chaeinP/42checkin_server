const path = require('path');
const webpack = require('webpack');

const TsconfigPathsPlugin = require('tsconfig-paths-webpack-plugin');
const nodeExternals = require('webpack-node-externals');
const dotenv = require('dotenv');
const { NODE_ENV } = process.env;

console.log('process.env.NODE_ENV:', process.env.NODE_ENV);

dotenv.config({
    path: `.env.${process.env.NODE_ENV}`
});
const output_path = `dist.${process.env.NODE_ENV}`;

module.exports = {
	entry: './src/app.ts',
	target: 'node',
	externals: [nodeExternals()],
	optimization: {
		minimize: false,
	},
	output: {
		filename: 'app.js',
		path: path.resolve(__dirname, output_path)
	},
	devtool: 'cheap-module-eval-source-map',
	resolve: {
		// Add `.ts` and `.tsx` as a resolvable extension.
		extensions: ['.ts', '.tsx', '.js'],
		alias: {
			"@services": path.resolve(__dirname, "./src/services/"),
			"@controllers": path.resolve(__dirname, "./src/controllers/"),
			"@routes": path.resolve(__dirname, "./src/routes/"),
			"@modules": path.resolve(__dirname, "./src/modules/"),
            "@models": path.resolve(__dirname, "./src/models/"),
		},
		plugins: [
			new TsconfigPathsPlugin(),
		]
	},
	module: {
        rules: [
            // all files with a `.ts` or `.tsx` extension will be handled by `ts-loader`
            {
                test: /\.tsx?$/, loader: 'ts-loader'
            },
            {
                test: /\.jsx?$/,
                loaders: ['babel?retainLines=true'],
                include: path.join(__dirname, 'src')
            }
        ]
	},
	plugins: [
		new webpack.DefinePlugin({
            APP_NAME: JSON.stringify("42Checkin"),
		}),
        // https://www.daleseo.com/webpack-plugins-define-environment/
        new webpack.EnvironmentPlugin([
            // CORE
            'PORT',
            'NODE_ENV',
            'DATABASE_HOST',
            'DATABASE_PORT',
            'DATABASE_USERNAME',
            'DATABASE_PASSWORD',
            'DATABASE_NAME',
            'JWT_SECRET',
            'PASSPORT_STRATEGY',
            // SLACK
            'CLIENT_ID',
            'CLIENT_SECRET',
            'CLIENT_CALLBACK',
            // CORS
            'URL_CLIENT',
            'URL_CLIENT_OLD',
            'URL_ADMIN',
            'COOKIE_AUTH',
            'COOKIE_DOMAIN',
            // SLACK
            'SLACK_ALARM',
            'SLACK_TEST',
            'SLACK_CS',
            // MISC
            'IP_FILTER',
            'FT_GUEST_IP',
            'DEVELOPER01_IP',
            'DEVELOPER02_IP',
            'DISCORD_GAEPO_ID',
            'DISCORD_GAEPO_PW',
            'DISCORD_SEOCHO_ID',
            'DISCORD_SEOCHO_PW',
            'MAIL'
        ])
	]
};
